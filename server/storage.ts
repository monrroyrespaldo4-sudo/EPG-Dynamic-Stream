import type { Channel, InsertChannel, EpgConfig } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getChannels(): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: string, channel: Partial<InsertChannel>): Promise<Channel | undefined>;
  deleteChannel(id: string): Promise<boolean>;
  getEpgConfig(): Promise<EpgConfig>;
  updateEpgConfig(config: Partial<EpgConfig>): Promise<EpgConfig>;
}

export class MemStorage implements IStorage {
  private channels: Map<string, Channel>;
  private epgConfig: EpgConfig;

  constructor() {
    this.channels = new Map();
    this.epgConfig = {
      lastGenerated: null,
      xmlUrl: null,
    };
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
}

export const storage = new MemStorage();
