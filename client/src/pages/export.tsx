import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileCode,
  Download,
  Copy,
  Check,
  RefreshCw,
  Tv,
  Clock,
  AlertCircle,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Channel, EpgConfig, ExternalEpgSource } from "@shared/schema";

export default function ExportPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [selectedExternalSources, setSelectedExternalSources] = useState<number[]>([]);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);

  const { data: channels, isLoading: channelsLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
  });

  const { data: externalSources, isLoading: externalSourcesLoading } = useQuery<ExternalEpgSource[]>({
    queryKey: ["/api/external-sources"],
  });

  const { data: epgConfig, isLoading: configLoading } = useQuery<EpgConfig>({
    queryKey: ["/api/epg/config"],
  });

  const generateMutation = useMutation({
    mutationFn: async (params: { channelIds: number[]; externalSourceIds: number[] }) => {
      const response = await apiRequest("POST", "/api/epg/generate", params);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/epg/config"] });
      setXmlPreview(data.preview || null);
      toast({
        title: "EPG Generado",
        description: "El archivo XML se ha creado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo generar el EPG.",
        variant: "destructive",
      });
    },
  });

  const activeChannels = channels?.filter((c) => c.isActive) || [];

  const handleSelectAll = () => {
    if (selectedChannels.length === activeChannels.length) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(activeChannels.map((c) => c.id));
    }
  };

  const handleToggleChannel = (channelId: number) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleToggleExternalSource = (sourceId: number) => {
    setSelectedExternalSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const activeExternalSources = externalSources?.filter((s) => s.isActive) || [];

  const handleSelectAllExternalSources = () => {
    if (selectedExternalSources.length === activeExternalSources.length) {
      setSelectedExternalSources([]);
    } else {
      setSelectedExternalSources(activeExternalSources.map((s) => s.id));
    }
  };

  const handleGenerate = () => {
    if (selectedChannels.length === 0 && selectedExternalSources.length === 0) {
      toast({
        title: "Selecciona fuentes",
        description: "Debes seleccionar al menos un canal o una fuente externa para generar el EPG.",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate({ channelIds: selectedChannels, externalSourceIds: selectedExternalSources });
  };

  const copyToClipboard = async () => {
    if (epgConfig?.xmlUrl) {
      await navigator.clipboard.writeText(epgConfig.xmlUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lastGenerated = epgConfig?.lastGenerated
    ? new Date(epgConfig.lastGenerated).toLocaleString("es-ES", {
        dateStyle: "full",
        timeStyle: "medium",
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          Exportar EPG
        </h1>
        <p className="text-muted-foreground mt-1">
          Genera el archivo XML con la programación de tus canales
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tv className="h-5 w-5" />
              Seleccionar Canales
            </CardTitle>
            <CardDescription>
              Elige los canales que incluirás en el EPG
            </CardDescription>
          </CardHeader>
          <CardContent>
            {channelsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activeChannels.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">
                    {selectedChannels.length} de {activeChannels.length} seleccionados
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    data-testid="button-select-all"
                  >
                    {selectedChannels.length === activeChannels.length
                      ? "Deseleccionar todos"
                      : "Seleccionar todos"}
                  </Button>
                </div>
                <ScrollArea className="h-[300px] rounded-lg border p-4">
                  <div className="space-y-3">
                    {activeChannels.map((channel) => (
                      <div
                        key={channel.id}
                        className="flex items-center gap-3 rounded-lg p-3 hover-elevate"
                      >
                        <Checkbox
                          id={`channel-${channel.id}`}
                          checked={selectedChannels.includes(channel.id)}
                          onCheckedChange={() => handleToggleChannel(channel.id)}
                          data-testid={`checkbox-channel-${channel.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`channel-${channel.id}`}
                            className="font-medium cursor-pointer block truncate"
                          >
                            {channel.name}
                          </Label>
                          <p className="text-xs text-muted-foreground truncate">
                            {channel.programTitle}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  No hay canales activos disponibles
                </p>
                <Button variant="outline" asChild>
                  <a href="/channels" data-testid="link-go-to-channels">
                    Ir a Canales
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
              Fuentes Externas
            </CardTitle>
            <CardDescription>
              Incluye programación de fuentes JSON externas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {externalSourcesLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activeExternalSources.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">
                    {selectedExternalSources.length} de {activeExternalSources.length} seleccionadas
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllExternalSources}
                    data-testid="button-select-all-external"
                  >
                    {selectedExternalSources.length === activeExternalSources.length
                      ? "Deseleccionar todas"
                      : "Seleccionar todas"}
                  </Button>
                </div>
                <ScrollArea className="h-[200px] rounded-lg border p-4">
                  <div className="space-y-3">
                    {activeExternalSources.map((source) => (
                      <div
                        key={source.id}
                        className="flex items-center gap-3 rounded-lg p-3 hover-elevate"
                      >
                        <Checkbox
                          id={`source-${source.id}`}
                          checked={selectedExternalSources.includes(source.id)}
                          onCheckedChange={() => handleToggleExternalSource(source.id)}
                          data-testid={`checkbox-source-${source.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`source-${source.id}`}
                            className="font-medium cursor-pointer block truncate"
                          >
                            {source.name}
                          </Label>
                          <p className="text-xs text-muted-foreground truncate">
                            {source.channelId}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No hay fuentes externas activas
                </p>
                <Button variant="outline" asChild>
                  <a href="/external-sources" data-testid="link-go-to-external-sources">
                    Agregar Fuentes
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending || (selectedChannels.length === 0 && selectedExternalSources.length === 0)}
          className="w-full"
          size="lg"
          data-testid="button-generate-epg"
        >
          {generateMutation.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FileCode className="mr-2 h-4 w-4" />
              Generar EPG XML ({selectedChannels.length + selectedExternalSources.length} fuentes)
            </>
          )}
        </Button>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                URL del EPG
              </CardTitle>
              <CardDescription>
                Usa esta URL en tu aplicación IPTV
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : epgConfig?.xmlUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-lg border bg-muted/50 px-4 py-3 font-mono text-sm text-foreground overflow-x-auto">
                      <code data-testid="text-epg-url">{epgConfig.xmlUrl}</code>
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
                  {lastGenerated && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Última generación: {lastGenerated}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Genera el EPG para obtener la URL
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Vista Previa XML
              </CardTitle>
              <CardDescription>
                Fragmento del archivo generado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {xmlPreview ? (
                <ScrollArea className="h-[250px] rounded-lg border bg-muted/30 p-4">
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                    <code data-testid="text-xml-preview">{xmlPreview}</code>
                  </pre>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed">
                  <FileCode className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    La vista previa aparecerá aquí después de generar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Programación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-500/10 p-2">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Bucle de 1 hora</h4>
                <p className="text-sm text-muted-foreground">
                  Cada programa se repite automáticamente cada hora
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-500/10 p-2">
                <RefreshCw className="h-5 w-5 text-green-500" />
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
    </div>
  );
}
