import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChannelSchema } from "@shared/schema";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

function formatDateXMLTV(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}${hours}${minutes}${seconds} +0000`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateEpgXml(
  channels: Array<{
    id: string;
    channelId: string;
    name: string;
    logoUrl?: string;
    program: { title: string; description?: string };
  }>
): string {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE tv SYSTEM "xmltv.dtd">\n';
  xml += '<tv generator-info-name="EPG Manager" generator-info-url="https://epg-manager.replit.app">\n';

  for (const channel of channels) {
    xml += `  <channel id="${escapeXml(channel.channelId)}">\n`;
    xml += `    <display-name>${escapeXml(channel.name)}</display-name>\n`;
    if (channel.logoUrl) {
      xml += `    <icon src="${escapeXml(channel.logoUrl)}" />\n`;
    }
    xml += "  </channel>\n";
  }

  for (const channel of channels) {
    for (let hour = 0; hour < 24; hour++) {
      const startTime = new Date(startOfDay);
      startTime.setUTCHours(hour);

      const endTime = new Date(startOfDay);
      endTime.setUTCHours(hour + 1);

      xml += `  <programme start="${formatDateXMLTV(startTime)}" stop="${formatDateXMLTV(endTime)}" channel="${escapeXml(channel.channelId)}">\n`;
      xml += `    <title lang="es">${escapeXml(channel.program.title)}</title>\n`;
      if (channel.program.description) {
        xml += `    <desc lang="es">${escapeXml(channel.program.description)}</desc>\n`;
      }
      xml += "  </programme>\n";
    }
  }

  xml += "</tv>\n";
  return xml;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/channels", async (_req: Request, res: Response) => {
    const channels = await storage.getChannels();
    res.json(channels);
  });

  app.get("/api/channels/:id", async (req: Request, res: Response) => {
    const channel = await storage.getChannel(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: "Canal no encontrado" });
    }
    res.json(channel);
  });

  app.post("/api/channels", async (req: Request, res: Response) => {
    try {
      const parsed = insertChannelSchema.parse(req.body);
      const channel = await storage.createChannel(parsed);
      res.status(201).json(channel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Error al crear el canal" });
    }
  });

  app.patch("/api/channels/:id", async (req: Request, res: Response) => {
    try {
      const partialSchema = insertChannelSchema.partial();
      const parsed = partialSchema.parse(req.body);
      const channel = await storage.updateChannel(req.params.id, parsed);
      if (!channel) {
        return res.status(404).json({ error: "Canal no encontrado" });
      }
      res.json(channel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Error al actualizar el canal" });
    }
  });

  app.delete("/api/channels/:id", async (req: Request, res: Response) => {
    const deleted = await storage.deleteChannel(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Canal no encontrado" });
    }
    res.status(204).send();
  });

  app.get("/api/epg/config", async (_req: Request, res: Response) => {
    const config = await storage.getEpgConfig();
    res.json(config);
  });

  app.post("/api/epg/generate", async (req: Request, res: Response) => {
    try {
      const { channelIds } = req.body;

      if (!Array.isArray(channelIds) || channelIds.length === 0) {
        return res.status(400).json({ error: "Debe seleccionar al menos un canal" });
      }

      const allChannels = await storage.getChannels();
      const selectedChannels = allChannels.filter(
        (c) => channelIds.includes(c.id) && c.isActive
      );

      if (selectedChannels.length === 0) {
        return res.status(400).json({ error: "No se encontraron canales activos" });
      }

      const xml = generateEpgXml(selectedChannels);

      const publicDir = path.join(process.cwd(), "client", "public");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const xmlFilePath = path.join(publicDir, "epg.xml");
      fs.writeFileSync(xmlFilePath, xml, "utf-8");

      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
      const xmlUrl = `${protocol}://${host}/epg.xml`;

      await storage.updateEpgConfig({
        lastGenerated: new Date().toISOString(),
        xmlUrl,
      });

      const previewLines = xml.split("\n").slice(0, 30).join("\n");
      const preview = previewLines + (xml.split("\n").length > 30 ? "\n..." : "");

      res.json({
        success: true,
        xmlUrl,
        channelsCount: selectedChannels.length,
        preview,
      });
    } catch (error) {
      console.error("Error generating EPG:", error);
      res.status(500).json({ error: "Error al generar el EPG" });
    }
  });

  app.get("/epg.xml", (_req: Request, res: Response) => {
    const xmlFilePath = path.join(process.cwd(), "client", "public", "epg.xml");

    if (!fs.existsSync(xmlFilePath)) {
      return res.status(404).send("EPG file not found. Generate it first.");
    }

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(xmlFilePath);
  });

  return httpServer;
}
