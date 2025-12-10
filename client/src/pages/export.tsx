import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileCode,
  Download,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Tv,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Channel, EpgConfig, ExternalEpgSource } from "@shared/schema";

export default function ExportPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: channels, isLoading: channelsLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
  });

  const { data: externalSources, isLoading: externalSourcesLoading } = useQuery<ExternalEpgSource[]>({
    queryKey: ["/api/external-sources"],
  });

  const { data: epgConfig, isLoading: configLoading, refetch: refetchConfig } = useQuery<EpgConfig>({
    queryKey: ["/api/epg/config"],
  });

  const activeChannels = channels?.filter((c) => c.isActive) || [];
  const activeExternalSources = externalSources?.filter((s) => s.isActive) || [];
  const totalSources = activeChannels.length + activeExternalSources.length;

  const epgUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/epg.xml`
    : "/epg.xml";

  useEffect(() => {
    refetchConfig();
  }, [refetchConfig]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(epgUrl);
    setCopied(true);
    toast({
      title: "URL copiada",
      description: "La URL del EPG se ha copiado al portapapeles.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const openEpgInNewTab = () => {
    window.open(epgUrl, "_blank");
  };

  const lastGenerated = epgConfig?.lastGenerated
    ? new Date(epgConfig.lastGenerated).toLocaleString("es-ES", {
        dateStyle: "full",
        timeStyle: "medium",
      })
    : null;

  const isLoading = channelsLoading || externalSourcesLoading || configLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          EPG Automático
        </h1>
        <p className="text-muted-foreground mt-1">
          Tu EPG se genera automáticamente con todos los canales y fuentes activas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            URL del EPG
          </CardTitle>
          <CardDescription>
            Usa esta URL en tu aplicación IPTV - se actualiza automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg border bg-muted/50 px-4 py-3 font-mono text-sm text-foreground overflow-x-auto">
                  <code data-testid="text-epg-url">{epgUrl}</code>
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={openEpgInNewTab}
                  data-testid="button-open-epg"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              {lastGenerated && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Última generación: {lastGenerated}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tv className="h-5 w-5" />
              Canales Incluidos
            </CardTitle>
            <CardDescription>
              Todos los canales activos se incluyen automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {channelsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : activeChannels.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {activeChannels.length} canales activos
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeChannels.slice(0, 8).map((channel) => (
                    <Badge key={channel.id} variant="outline" data-testid={`badge-channel-${channel.id}`}>
                      {channel.name}
                    </Badge>
                  ))}
                  {activeChannels.length > 8 && (
                    <Badge variant="outline">+{activeChannels.length - 8} más</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  No hay canales activos
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/channels" data-testid="link-go-to-channels">
                    Agregar Canales
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Fuentes Externas Incluidas
            </CardTitle>
            <CardDescription>
              Todas las fuentes activas se incluyen automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {externalSourcesLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : activeExternalSources.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {activeExternalSources.length} fuentes activas
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeExternalSources.slice(0, 8).map((source) => (
                    <Badge key={source.id} variant="outline" data-testid={`badge-source-${source.id}`}>
                      {source.name}
                    </Badge>
                  ))}
                  {activeExternalSources.length > 8 && (
                    <Badge variant="outline">+{activeExternalSources.length - 8} más</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  No hay fuentes externas activas
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="/external-sources" data-testid="link-go-to-external-sources">
                    Agregar Fuentes
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del EPG</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-500/10 p-2">
                <RefreshCw className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Siempre Actualizado</h4>
                <p className="text-sm text-muted-foreground">
                  Se regenera automáticamente en cada visita a la URL
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-500/10 p-2">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">24 horas</h4>
                <p className="text-sm text-muted-foreground">
                  La programación cubre el día completo
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-purple-500/10 p-2">
                <FileCode className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Formato XMLTV</h4>
                <p className="text-sm text-muted-foreground">
                  Compatible con la mayoría de reproductores IPTV
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {totalSources > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          <p>
            El EPG incluye {totalSources} fuente{totalSources !== 1 ? "s" : ""} activa{totalSources !== 1 ? "s" : ""} y se regenera automáticamente cada vez que se visita la URL.
          </p>
        </div>
      )}
    </div>
  );
}
