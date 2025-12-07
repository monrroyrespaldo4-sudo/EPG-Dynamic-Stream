import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tv, Radio, Clock, Link2, Copy, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { Channel, EpgConfig } from "@shared/schema";

export default function Dashboard() {
  const [copied, setCopied] = useState(false);

  const { data: channels, isLoading: channelsLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
  });

  const { data: epgConfig, isLoading: configLoading } = useQuery<EpgConfig>({
    queryKey: ["/api/epg/config"],
  });

  const totalChannels = channels?.length || 0;
  const activeChannels = channels?.filter((c) => c.isActive).length || 0;
  const xmlUrl = epgConfig?.xmlUrl || null;
  const lastGenerated = epgConfig?.lastGenerated
    ? new Date(epgConfig.lastGenerated).toLocaleString("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Nunca";

  const copyToClipboard = async () => {
    if (xmlUrl) {
      await navigator.clipboard.writeText(xmlUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const stats = [
    {
      title: "Total Canales",
      value: totalChannels,
      icon: Tv,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Canales Activos",
      value: activeChannels,
      icon: Radio,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Última Generación",
      value: lastGenerated,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      isText: true,
    },
    {
      title: "URL EPG",
      value: xmlUrl ? "Disponible" : "No generado",
      icon: Link2,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      isText: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumen del estado de tu EPG y canales configurados
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {channelsLoading || configLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div
                  className={`${stat.isText ? "text-lg" : "text-3xl"} font-bold text-foreground`}
                  data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            URL del Archivo EPG
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {configLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : xmlUrl ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border bg-muted/50 px-4 py-3 font-mono text-sm text-foreground overflow-x-auto">
                <code data-testid="text-xml-url">{xmlUrl}</code>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                data-testid="button-copy-url"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <RefreshCw className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                No se ha generado ningún archivo EPG todavía
              </p>
              <Button asChild data-testid="button-go-to-export">
                <a href="/export">Ir a Exportar EPG</a>
              </Button>
            </div>
          )}
          {xmlUrl && (
            <p className="text-sm text-muted-foreground">
              Usa esta URL en tu aplicación IPTV para cargar la guía de programación.
              El archivo se actualiza cada vez que generas un nuevo EPG.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inicio Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/channels"
              className="group flex flex-col items-center justify-center rounded-lg border border-border p-6 text-center hover-elevate active-elevate-2"
              data-testid="link-quick-channels"
            >
              <div className="rounded-full bg-primary/10 p-3 mb-3 group-hover:bg-primary/20 transition-colors">
                <Tv className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Gestionar Canales</h3>
              <p className="text-sm text-muted-foreground">
                Añade y configura tus canales
              </p>
            </a>
            <a
              href="/export"
              className="group flex flex-col items-center justify-center rounded-lg border border-border p-6 text-center hover-elevate active-elevate-2"
              data-testid="link-quick-export"
            >
              <div className="rounded-full bg-green-500/10 p-3 mb-3 group-hover:bg-green-500/20 transition-colors">
                <RefreshCw className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Generar EPG</h3>
              <p className="text-sm text-muted-foreground">
                Crea el archivo XML
              </p>
            </a>
            <div className="flex flex-col items-center justify-center rounded-lg border border-border p-6 text-center">
              <div className="rounded-full bg-purple-500/10 p-3 mb-3">
                <Clock className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Programación 24h</h3>
              <p className="text-sm text-muted-foreground">
                Bucle de 1 hora automático
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
