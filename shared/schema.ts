import { z } from "zod";
import { pgTable, text, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channelId: text("channel_id").notNull(),
  logoUrl: text("logo_url"),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  programTitle: text("program_title").notNull(),
  programDescription: text("program_description"),
});

export const externalSources = pgTable("external_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  channelId: text("channel_id").notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const epgConfigs = pgTable("epg_configs", {
  id: serial("id").primaryKey(),
  lastGenerated: text("last_generated"),
  xmlUrl: text("xml_url"),
});

export const insertChannelSchema = createInsertSchema(channels).omit({ id: true });
export const insertExternalSourceSchema = createInsertSchema(externalSources).omit({ id: true });
export const insertExternalEpgSourceSchema = insertExternalSourceSchema;

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type ExternalEpgSource = typeof externalSources.$inferSelect;
export type InsertExternalEpgSource = z.infer<typeof insertExternalSourceSchema>;

export const channelSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "El nombre es requerido"),
  channelId: z.string().min(1, "El ID del canal es requerido"),
  logoUrl: z.string().url("URL de logo inválida").optional().nullable(),
  category: z.string().min(1, "La categoría es requerida"),
  isActive: z.boolean().default(true),
  programTitle: z.string().min(1, "El título del programa es requerido"),
  programDescription: z.string().optional().nullable(),
});

export const epgConfigSchema = z.object({
  lastGenerated: z.string().nullable(),
  xmlUrl: z.string().nullable(),
});

export type EpgConfig = z.infer<typeof epgConfigSchema>;

export const externalEpgSourceSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "El nombre es requerido"),
  url: z.string().url("URL inválida"),
  channelId: z.string().min(1, "El ID del canal es requerido"),
  logoUrl: z.string().url("URL de logo inválida").optional().nullable(),
  isActive: z.boolean().default(true),
});

export interface ExternalEpgProgram {
  hora: string;
  titulo: string;
  capitulo?: string;
  descripcion?: string;
  imagenUrl?: string;
  infoUrl?: string;
  genero?: string;
  enVivo?: boolean;
}

export interface ExternalEpgDay {
  fecha: string;
  diaSemana: string;
  programas: ExternalEpgProgram[];
}

export interface ExternalEpgData {
  channelName: string;
  channelCode: number;
  dias: ExternalEpgDay[];
}

export interface External13GoEvent {
  id?: string;
  programId?: string;
  beginTime: string;
  endTime: string;
  title: string;
  synopsis?: string;
  genre?: string[];
  episodeTitle?: string;
  pictures?: { photo?: string; poster?: string; cover?: string; background?: string };
  rating?: string;
}

export interface External13GoData {
  channel: string;
  channelCode: string;
  updated?: string;
  events: External13GoEvent[];
}

export type ExternalEpgDataUnion = ExternalEpgData | External13GoData;

export const categories = [
  "Deportes",
  "Noticias",
  "Entretenimiento",
  "Películas",
  "Series",
  "Documentales",
  "Infantil",
  "Música",
  "Cultura",
  "Otros",
] as const;

export type Category = (typeof categories)[number];

export interface User {
  id: string;
  username: string;
  password: string;
}

export interface InsertUser {
  username: string;
  password: string;
}
