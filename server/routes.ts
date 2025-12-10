import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChannelSchema, insertExternalEpgSourceSchema, type ExternalEpgData, type External13GoData, type ExternalEpgDataUnion, type ExternalEpgSource, type Channel } from "@shared/schema";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

function formatDateXMLTV(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  const tzOffset = -date.getTimezoneOffset();
  const tzHours = Math.floor(Math.abs(tzOffset) / 60);
  const tzMinutes = Math.abs(tzOffset) % 60;
  const tzSign = tzOffset >= 0 ? "+" : "-";
  const tzString = `${tzSign}${pad(tzHours)}${pad(tzMinutes)}`;
  
  return `${year}${month}${day}${hours}${minutes}${seconds} ${tzString}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseDateDMY(dateStr: string): Date | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

function parseTimeHM(timeStr: string): { hours: number; minutes: number } | null {
  const parts = timeStr.split(":");
  if (parts.length < 2) return null;
  return {
    hours: parseInt(parts[0], 10),
    minutes: parseInt(parts[1], 10),
  };
}

async function fetchExternalEpgData(url: string): Promise<ExternalEpgDataUnion | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data as ExternalEpgDataUnion;
  } catch (error) {
    console.error("Error fetching external EPG:", error);
    return null;
  }
}

function isExternal13GoData(data: ExternalEpgDataUnion): data is External13GoData {
  return data && Array.isArray((data as External13GoData).events);
}

function isExternalTvDalDiaData(data: ExternalEpgDataUnion): data is ExternalEpgData {
  return data && Array.isArray((data as ExternalEpgData).dias);
}

interface ProgramEntry {
  channelId: string;
  start: Date;
  stop: Date;
  title: string;
  description?: string;
  category?: string;
}

interface ChannelEntry {
  channelId: string;
  name: string;
  logoUrl?: string | null;
}

async function generateEpgXmlWithExternal(
  channels: Channel[],
  externalSources: ExternalEpgSource[]
): Promise<string> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const allChannels: ChannelEntry[] = [];
  const allPrograms: ProgramEntry[] = [];

  for (const channel of channels) {
    allChannels.push({
      channelId: channel.channelId,
      name: channel.name,
      logoUrl: channel.logoUrl,
    });

    for (let hour = 0; hour < 24; hour++) {
      const startTime = new Date(startOfDay);
      startTime.setHours(hour);
      const endTime = new Date(startOfDay);
      endTime.setHours(hour + 1);

      allPrograms.push({
        channelId: channel.channelId,
        start: startTime,
        stop: endTime,
        title: channel.programTitle,
        description: channel.programDescription || undefined,
      });
    }
  }

  for (const source of externalSources) {
    if (!source.isActive) continue;

    const epgData = await fetchExternalEpgData(source.url);
    if (!epgData) continue;

    if (isExternal13GoData(epgData)) {
      allChannels.push({
        channelId: source.channelId,
        name: source.name || epgData.channel,
        logoUrl: source.logoUrl,
      });

      for (const event of epgData.events) {
        const startTime = new Date(event.beginTime);
        const endTime = new Date(event.endTime);
        
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) continue;

        let title = event.title;
        if (event.episodeTitle && event.episodeTitle !== event.title) {
          title = event.episodeTitle;
        }

        allPrograms.push({
          channelId: source.channelId,
          start: startTime,
          stop: endTime,
          title,
          description: event.synopsis,
          category: event.genre?.[0],
        });
      }
    } else if (isExternalTvDalDiaData(epgData)) {
      allChannels.push({
        channelId: source.channelId,
        name: source.name || epgData.channelName,
        logoUrl: source.logoUrl,
      });

      for (const dia of epgData.dias) {
        const diaDate = parseDateDMY(dia.fecha);
        if (!diaDate) continue;

        for (let i = 0; i < dia.programas.length; i++) {
          const prog = dia.programas[i];
          const time = parseTimeHM(prog.hora);
          if (!time) continue;

          const startTime = new Date(diaDate);
          startTime.setHours(time.hours, time.minutes, 0, 0);

          let endTime: Date;
          if (i + 1 < dia.programas.length) {
            const nextTime = parseTimeHM(dia.programas[i + 1].hora);
            if (nextTime) {
              endTime = new Date(diaDate);
              if (nextTime.hours < time.hours) {
                endTime.setDate(endTime.getDate() + 1);
              }
              endTime.setHours(nextTime.hours, nextTime.minutes, 0, 0);
            } else {
              endTime = new Date(startTime);
              endTime.setHours(endTime.getHours() + 1);
            }
          } else {
            endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 1);
          }

          let title = prog.titulo;
          if (prog.capitulo) {
            title += ` - ${prog.capitulo}`;
          }

          allPrograms.push({
            channelId: source.channelId,
            start: startTime,
            stop: endTime,
            title,
            description: prog.descripcion,
            category: prog.genero,
          });
        }
      }
    }
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE tv SYSTEM "xmltv.dtd">\n';
  xml += '<tv generator-info-name="EPG Manager" generator-info-url="https://epg-manager.replit.app">\n';

  const uniqueChannels = new Map<string, ChannelEntry>();
  for (const ch of allChannels) {
    if (!uniqueChannels.has(ch.channelId)) {
      uniqueChannels.set(ch.channelId, ch);
    }
  }

  for (const channel of uniqueChannels.values()) {
    xml += `  <channel id="${escapeXml(channel.channelId)}">\n`;
    xml += `    <display-name>${escapeXml(channel.name)}</display-name>\n`;
    if (channel.logoUrl) {
      xml += `    <icon src="${escapeXml(channel.logoUrl)}" />\n`;
    }
    xml += "  </channel>\n";
  }

  allPrograms.sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const prog of allPrograms) {
    xml += `  <programme start="${formatDateXMLTV(prog.start)}" stop="${formatDateXMLTV(prog.stop)}" channel="${escapeXml(prog.channelId)}">\n`;
    xml += `    <title lang="es">${escapeXml(prog.title)}</title>\n`;
    if (prog.description) {
      xml += `    <desc lang="es">${escapeXml(prog.description)}</desc>\n`;
    }
    if (prog.category) {
      xml += `    <category lang="es">${escapeXml(prog.category)}</category>\n`;
    }
    xml += "  </programme>\n";
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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const channel = await storage.getChannel(id);
    if (!channel) {
      return res.status(404).json({ error: "Canal no encontrado" });
    }
    res.json(channel);
  });

  app.post("/api/channels", async (req: Request, res: Response) => {
    try {
      const parsed = insertChannelSchema.parse(req.body);
      const channel = await storage.createChannel(parsed);
      
      // Regenerate EPG automatically with all active channels and external sources
      try {
        const allChannels = await storage.getChannels();
        const activeChannels = allChannels.filter(c => c.isActive);
        const allSources = await storage.getExternalSources();
        const activeSources = allSources.filter(s => s.isActive);
        
        if (activeChannels.length > 0 || activeSources.length > 0) {
          const xml = await generateEpgXmlWithExternal(activeChannels, activeSources);
          
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
        }
      } catch (epgError) {
        console.error("Error auto-generating EPG:", epgError);
      }
      
      res.status(201).json(channel);
    } catch (error) {
      console.error("Error creating channel:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Error al crear el canal" });
    }
  });

  app.patch("/api/channels/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }
      const partialSchema = insertChannelSchema.partial();
      const parsed = partialSchema.parse(req.body);
      const channel = await storage.updateChannel(id, parsed);
      if (!channel) {
        return res.status(404).json({ error: "Canal no encontrado" });
      }
      
      // Regenerate EPG automatically
      try {
        const allChannels = await storage.getChannels();
        const activeChannels = allChannels.filter(c => c.isActive);
        const allSources = await storage.getExternalSources();
        const activeSources = allSources.filter(s => s.isActive);
        
        if (activeChannels.length > 0 || activeSources.length > 0) {
          const xml = await generateEpgXmlWithExternal(activeChannels, activeSources);
          
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
        }
      } catch (epgError) {
        console.error("Error auto-generating EPG:", epgError);
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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const deleted = await storage.deleteChannel(id);
    if (!deleted) {
      return res.status(404).json({ error: "Canal no encontrado" });
    }
    
    // Regenerate EPG automatically
    try {
      const allChannels = await storage.getChannels();
      const activeChannels = allChannels.filter(c => c.isActive);
      const allSources = await storage.getExternalSources();
      const activeSources = allSources.filter(s => s.isActive);
      
      if (activeChannels.length > 0 || activeSources.length > 0) {
        const xml = await generateEpgXmlWithExternal(activeChannels, activeSources);
        
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
      }
    } catch (epgError) {
      console.error("Error auto-generating EPG:", epgError);
    }
    
    res.status(204).send();
  });

  app.get("/api/external-sources", async (_req: Request, res: Response) => {
    const sources = await storage.getExternalSources();
    res.json(sources);
  });

  app.get("/api/external-sources/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const source = await storage.getExternalSource(id);
    if (!source) {
      return res.status(404).json({ error: "Fuente externa no encontrada" });
    }
    res.json(source);
  });

  app.post("/api/external-sources", async (req: Request, res: Response) => {
    try {
      const parsed = insertExternalEpgSourceSchema.parse(req.body);
      const source = await storage.createExternalSource(parsed);
      
      // Regenerate EPG automatically
      try {
        const allChannels = await storage.getChannels();
        const activeChannels = allChannels.filter(c => c.isActive);
        const allSources = await storage.getExternalSources();
        const activeSources = allSources.filter(s => s.isActive);
        
        if (activeChannels.length > 0 || activeSources.length > 0) {
          const xml = await generateEpgXmlWithExternal(activeChannels, activeSources);
          
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
        }
      } catch (epgError) {
        console.error("Error auto-generating EPG:", epgError);
      }
      
      res.status(201).json(source);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Error al crear la fuente externa" });
    }
  });

  app.patch("/api/external-sources/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }
      const partialSchema = insertExternalEpgSourceSchema.partial();
      const parsed = partialSchema.parse(req.body);
      const source = await storage.updateExternalSource(id, parsed);
      if (!source) {
        return res.status(404).json({ error: "Fuente externa no encontrada" });
      }
      
      // Regenerate EPG automatically
      try {
        const allChannels = await storage.getChannels();
        const activeChannels = allChannels.filter(c => c.isActive);
        const allSources = await storage.getExternalSources();
        const activeSources = allSources.filter(s => s.isActive);
        
        if (activeChannels.length > 0 || activeSources.length > 0) {
          const xml = await generateEpgXmlWithExternal(activeChannels, activeSources);
          
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
        }
      } catch (epgError) {
        console.error("Error auto-generating EPG:", epgError);
      }
      
      res.json(source);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Error al actualizar la fuente externa" });
    }
  });

  app.delete("/api/external-sources/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const deleted = await storage.deleteExternalSource(id);
    if (!deleted) {
      return res.status(404).json({ error: "Fuente externa no encontrada" });
    }
    
    // Regenerate EPG automatically
    try {
      const allChannels = await storage.getChannels();
      const activeChannels = allChannels.filter(c => c.isActive);
      const allSources = await storage.getExternalSources();
      const activeSources = allSources.filter(s => s.isActive);
      
      if (activeChannels.length > 0 || activeSources.length > 0) {
        const xml = await generateEpgXmlWithExternal(activeChannels, activeSources);
        
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
      }
    } catch (epgError) {
      console.error("Error auto-generating EPG:", epgError);
    }
    
    res.status(204).send();
  });

  app.post("/api/external-sources/:id/test", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }
      const source = await storage.getExternalSource(id);
      if (!source) {
        return res.status(404).json({ error: "Fuente externa no encontrada" });
      }

      const epgData = await fetchExternalEpgData(source.url);
      if (!epgData) {
        return res.status(400).json({ error: "No se pudo obtener datos de la URL" });
      }

      if (isExternal13GoData(epgData)) {
        res.json({
          success: true,
          format: "13Go",
          channelName: epgData.channel,
          eventsCount: epgData.events.length,
        });
      } else if (isExternalTvDalDiaData(epgData)) {
        res.json({
          success: true,
          format: "TVDalDía",
          channelName: epgData.channelName,
          daysCount: epgData.dias.length,
          programsCount: epgData.dias.reduce((acc, d) => acc + d.programas.length, 0),
        });
      } else {
        res.status(400).json({ error: "Formato de datos no reconocido" });
      }
    } catch (error) {
      res.status(500).json({ error: "Error al probar la fuente externa" });
    }
  });

  app.get("/api/epg/config", async (_req: Request, res: Response) => {
    const config = await storage.getEpgConfig();
    res.json(config);
  });

  app.post("/api/epg/generate", async (req: Request, res: Response) => {
    try {
      const { channelIds, externalSourceIds } = req.body;

      const hasChannels = Array.isArray(channelIds) && channelIds.length > 0;
      const hasExternal = Array.isArray(externalSourceIds) && externalSourceIds.length > 0;

      if (!hasChannels && !hasExternal) {
        return res.status(400).json({ error: "Debe seleccionar al menos un canal o fuente externa" });
      }

      let selectedChannels: Channel[] = [];

      if (hasChannels) {
        const allChannels = await storage.getChannels();
        selectedChannels = allChannels.filter(
          (c) => channelIds.includes(c.id) && c.isActive
        );
      }

      let selectedExternalSources: ExternalEpgSource[] = [];
      if (hasExternal) {
        const allSources = await storage.getExternalSources();
        selectedExternalSources = allSources.filter(
          (s) => externalSourceIds.includes(s.id) && s.isActive
        );
      }

      if (selectedChannels.length === 0 && selectedExternalSources.length === 0) {
        return res.status(400).json({ error: "No se encontraron canales o fuentes activas" });
      }

      const xml = await generateEpgXmlWithExternal(selectedChannels, selectedExternalSources);

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
        externalSourcesCount: selectedExternalSources.length,
        preview,
      });
    } catch (error) {
      console.error("Error generating EPG:", error);
      res.status(500).json({ error: "Error al generar el EPG" });
    }
  });

  // EPG regenerates on every visit to ensure fresh data
  app.get("/epg.xml", async (req: Request, res: Response) => {
    try {
      const publicDir = path.join(process.cwd(), "client", "public");
      const xmlFilePath = path.join(publicDir, "epg.xml");
      
      // Always regenerate EPG with all active channels and sources
      const allChannels = await storage.getChannels();
      const activeChannels = allChannels.filter(c => c.isActive);
      const allSources = await storage.getExternalSources();
      const activeSources = allSources.filter(s => s.isActive);
      
      if (activeChannels.length > 0 || activeSources.length > 0) {
        const xml = await generateEpgXmlWithExternal(activeChannels, activeSources);
        
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        
        fs.writeFileSync(xmlFilePath, xml, "utf-8");
        
        const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
        const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
        const xmlUrl = `${protocol}://${host}/epg.xml`;
        
        await storage.updateEpgConfig({
          lastGenerated: new Date().toISOString(),
          xmlUrl,
        });
        
        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Cache-Control", "no-cache");
        return res.send(xml);
      }
      
      // No channels or sources, return empty EPG
      const emptyXml = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE tv SYSTEM "xmltv.dtd">\n<tv generator-info-name="EPG Manager"></tv>\n';
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "no-cache");
      return res.send(emptyXml);
    } catch (error) {
      console.error("Error serving EPG:", error);
      res.status(500).send("Error generating EPG");
    }
  });

  return httpServer;
}
