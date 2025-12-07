import { z } from "zod";

export const channelSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nombre es requerido"),
  channelId: z.string().min(1, "El ID del canal es requerido"),
  logoUrl: z.string().url("URL de logo inválida").optional().or(z.literal("")),
  category: z.string().min(1, "La categoría es requerida"),
  isActive: z.boolean().default(true),
  program: z.object({
    title: z.string().min(1, "El título del programa es requerido"),
    description: z.string().optional(),
  }),
});

export const insertChannelSchema = channelSchema.omit({ id: true });

export type Channel = z.infer<typeof channelSchema>;
export type InsertChannel = z.infer<typeof insertChannelSchema>;

export const epgConfigSchema = z.object({
  lastGenerated: z.string().nullable(),
  xmlUrl: z.string().nullable(),
});

export type EpgConfig = z.infer<typeof epgConfigSchema>;

export const externalEpgSourceSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nombre es requerido"),
  url: z.string().url("URL inválida"),
  channelId: z.string().min(1, "El ID del canal es requerido"),
  logoUrl: z.string().url("URL de logo inválida").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const insertExternalEpgSourceSchema = externalEpgSourceSchema.omit({ id: true });

export type ExternalEpgSource = z.infer<typeof externalEpgSourceSchema>;
export type InsertExternalEpgSource = z.infer<typeof insertExternalEpgSourceSchema>;

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
