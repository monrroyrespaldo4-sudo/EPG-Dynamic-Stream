import type { Channel, InsertChannel, EpgConfig, ExternalEpgSource, InsertExternalEpgSource } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getChannels(): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: string, channel: Partial<InsertChannel>): Promise<Channel | undefined>;
  deleteChannel(id: string): Promise<boolean>;
  getEpgConfig(): Promise<EpgConfig>;
  updateEpgConfig(config: Partial<EpgConfig>): Promise<EpgConfig>;
  getExternalSources(): Promise<ExternalEpgSource[]>;
  getExternalSource(id: string): Promise<ExternalEpgSource | undefined>;
  createExternalSource(source: InsertExternalEpgSource): Promise<ExternalEpgSource>;
  updateExternalSource(id: string, source: Partial<InsertExternalEpgSource>): Promise<ExternalEpgSource | undefined>;
  deleteExternalSource(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private channels: Map<string, Channel>;
  private epgConfig: EpgConfig;
  private externalSources: Map<string, ExternalEpgSource>;

  constructor() {
    this.channels = new Map();
    this.epgConfig = {
      lastGenerated: null,
      xmlUrl: null,
    };
    this.externalSources = new Map();
  }

  async getChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }

  async getChannel(id: string): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const id = randomUUID();
    const channel: Channel = { ...insertChannel, id };
    this.channels.set(id, channel);
    return channel;
  }

  async updateChannel(id: string, updates: Partial<InsertChannel>): Promise<Channel | undefined> {
    const existing = this.channels.get(id);
    if (!existing) return undefined;

    const updated: Channel = { ...existing, ...updates };
    if (updates.program) {
      updated.program = { ...existing.program, ...updates.program };
    }
    this.channels.set(id, updated);
    return updated;
  }

  async deleteChannel(id: string): Promise<boolean> {
    return this.channels.delete(id);
  }

  async getEpgConfig(): Promise<EpgConfig> {
    return this.epgConfig;
  }

  async updateEpgConfig(config: Partial<EpgConfig>): Promise<EpgConfig> {
    this.epgConfig = { ...this.epgConfig, ...config };
    return this.epgConfig;
  }

  async getExternalSources(): Promise<ExternalEpgSource[]> {
    return Array.from(this.externalSources.values());
  }

  async getExternalSource(id: string): Promise<ExternalEpgSource | undefined> {
    return this.externalSources.get(id);
  }

  async createExternalSource(insertSource: InsertExternalEpgSource): Promise<ExternalEpgSource> {
    const id = randomUUID();
    const source: ExternalEpgSource = { ...insertSource, id };
    this.externalSources.set(id, source);
    return source;
  }

  async updateExternalSource(id: string, updates: Partial<InsertExternalEpgSource>): Promise<ExternalEpgSource | undefined> {
    const existing = this.externalSources.get(id);
    if (!existing) return undefined;

    const updated: ExternalEpgSource = { ...existing, ...updates };
    this.externalSources.set(id, updated);
    return updated;
  }

  async deleteExternalSource(id: string): Promise<boolean> {
    return this.externalSources.delete(id);
  }
}

export const storage = new MemStorage();
