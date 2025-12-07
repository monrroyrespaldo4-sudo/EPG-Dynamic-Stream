import type { Channel, InsertChannel, EpgConfig, ExternalEpgSource, InsertExternalEpgSource } from "@shared/schema";
import { channels, externalSources, epgConfigs } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getChannels(): Promise<Channel[]>;
  getChannel(id: number): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: number, channel: Partial<InsertChannel>): Promise<Channel | undefined>;
  deleteChannel(id: number): Promise<boolean>;
  getEpgConfig(): Promise<EpgConfig>;
  updateEpgConfig(config: Partial<EpgConfig>): Promise<EpgConfig>;
  getExternalSources(): Promise<ExternalEpgSource[]>;
  getExternalSource(id: number): Promise<ExternalEpgSource | undefined>;
  createExternalSource(source: InsertExternalEpgSource): Promise<ExternalEpgSource>;
  updateExternalSource(id: number, source: Partial<InsertExternalEpgSource>): Promise<ExternalEpgSource | undefined>;
  deleteExternalSource(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getChannels(): Promise<Channel[]> {
    return await db.select().from(channels);
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel || undefined;
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const [channel] = await db.insert(channels).values(insertChannel).returning();
    return channel;
  }

  async updateChannel(id: number, updates: Partial<InsertChannel>): Promise<Channel | undefined> {
    const [channel] = await db.update(channels).set(updates).where(eq(channels.id, id)).returning();
    return channel || undefined;
  }

  async deleteChannel(id: number): Promise<boolean> {
    const result = await db.delete(channels).where(eq(channels.id, id)).returning();
    return result.length > 0;
  }

  async getEpgConfig(): Promise<EpgConfig> {
    const [config] = await db.select().from(epgConfigs);
    if (!config) {
      const [newConfig] = await db.insert(epgConfigs).values({
        lastGenerated: null,
        xmlUrl: null,
      }).returning();
      return { lastGenerated: newConfig.lastGenerated, xmlUrl: newConfig.xmlUrl };
    }
    return { lastGenerated: config.lastGenerated, xmlUrl: config.xmlUrl };
  }

  async updateEpgConfig(updates: Partial<EpgConfig>): Promise<EpgConfig> {
    const [existing] = await db.select().from(epgConfigs);
    if (!existing) {
      const [newConfig] = await db.insert(epgConfigs).values({
        lastGenerated: updates.lastGenerated ?? null,
        xmlUrl: updates.xmlUrl ?? null,
      }).returning();
      return { lastGenerated: newConfig.lastGenerated, xmlUrl: newConfig.xmlUrl };
    }
    const [updated] = await db.update(epgConfigs).set(updates).where(eq(epgConfigs.id, existing.id)).returning();
    return { lastGenerated: updated.lastGenerated, xmlUrl: updated.xmlUrl };
  }

  async getExternalSources(): Promise<ExternalEpgSource[]> {
    return await db.select().from(externalSources);
  }

  async getExternalSource(id: number): Promise<ExternalEpgSource | undefined> {
    const [source] = await db.select().from(externalSources).where(eq(externalSources.id, id));
    return source || undefined;
  }

  async createExternalSource(insertSource: InsertExternalEpgSource): Promise<ExternalEpgSource> {
    const [source] = await db.insert(externalSources).values(insertSource).returning();
    return source;
  }

  async updateExternalSource(id: number, updates: Partial<InsertExternalEpgSource>): Promise<ExternalEpgSource | undefined> {
    const [source] = await db.update(externalSources).set(updates).where(eq(externalSources.id, id)).returning();
    return source || undefined;
  }

  async deleteExternalSource(id: number): Promise<boolean> {
    const result = await db.delete(externalSources).where(eq(externalSources.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
