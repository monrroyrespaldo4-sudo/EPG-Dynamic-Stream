import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Globe, Image, Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ExternalSourceDialog } from "@/components/external-source-dialog";
import type { ExternalEpgSource, InsertExternalEpgSource } from "@shared/schema";

export default function ExternalSourcesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<ExternalEpgSource | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<ExternalEpgSource | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: sources, isLoading } = useQuery<ExternalEpgSource[]>({
    queryKey: ["/api/external-sources"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertExternalEpgSource) => {
      return apiRequest("POST", "/api/external-sources", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-sources"] });
      toast({
        title: "Fuente añadida",
        description: "La fuente externa se ha añadido correctamente.",
      });
      setDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo añadir la fuente externa.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertExternalEpgSource> }) => {
      return apiRequest("PATCH", `/api/external-sources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-sources"] });
      toast({
        title: "Fuente actualizada",
        description: "Los cambios se han guardado correctamente.",
      });
      setDialogOpen(false);
      setEditingSource(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la fuente externa.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/external-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-sources"] });
      toast({
        title: "Fuente eliminada",
        description: "La fuente externa se ha eliminado correctamente.",
      });
      setDeleteDialogOpen(false);
      setSourceToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la fuente externa.",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/external-sources/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-sources"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingId(id);
      const response = await apiRequest("POST", `/api/external-sources/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Conexión exitosa",
        description: `Canal: ${data.channelName}, ${data.daysCount} días, ${data.programsCount} programas`,
      });
      setTestingId(null);
    },
    onError: () => {
      toast({
        title: "Error de conexión",
        description: "No se pudo obtener datos de la URL.",
        variant: "destructive",
      });
      setTestingId(null);
    },
  });

  const filteredSources = sources?.filter(
    (source) =>
      source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.channelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (source: ExternalEpgSource) => {
    setEditingSource(source);
    setDialogOpen(true);
  };

  const handleDelete = (source: ExternalEpgSource) => {
    setSourceToDelete(source);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (data: InsertExternalEpgSource) => {
    if (editingSource) {
      updateMutation.mutate({ id: editingSource.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingSource(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            Fuentes EPG Externas
          </h1>
          <p className="text-muted-foreground mt-1">
            Importa programación desde URLs JSON externas
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-source">
          <Plus className="h-4 w-4 mr-2" />
          Añadir Fuente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Fuentes Externas
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fuentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-sources"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSources && filteredSources.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Logo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">ID Canal</TableHead>
                    <TableHead className="hidden lg:table-cell">URL</TableHead>
                    <TableHead className="w-[80px]">Activo</TableHead>
                    <TableHead className="w-[140px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSources.map((source) => (
                    <TableRow key={source.id} data-testid={`row-source-${source.id}`}>
                      <TableCell>
                        {source.logoUrl ? (
                          <img
                            src={source.logoUrl}
                            alt={source.name}
                            className="h-10 w-10 rounded-lg object-cover bg-muted"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <div
                          className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${source.logoUrl ? "hidden" : ""}`}
                        >
                          <Image className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm text-muted-foreground">
                        {source.channelId}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                        {source.url}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={source.isActive}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({
                              id: source.id,
                              isActive: checked,
                            })
                          }
                          data-testid={`switch-active-${source.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => testMutation.mutate(source.id)}
                            disabled={testingId === source.id}
                            data-testid={`button-test-${source.id}`}
                          >
                            {testingId === source.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(source)}
                            data-testid={`button-edit-${source.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(source)}
                            data-testid={`button-delete-${source.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Globe className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No hay fuentes externas</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "No se encontraron fuentes con ese criterio"
                  : "Añade tu primera fuente EPG externa"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-source">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Fuente
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ExternalSourceDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        source={editingSource}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar fuente externa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La fuente "{sourceToDelete?.name}" será
              eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sourceToDelete && deleteMutation.mutate(sourceToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
