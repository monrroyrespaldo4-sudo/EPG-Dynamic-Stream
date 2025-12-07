import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { insertExternalEpgSourceSchema, type ExternalEpgSource, type InsertExternalEpgSource } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface ExternalSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertExternalEpgSource) => void;
  source?: ExternalEpgSource | null;
  isPending?: boolean;
}

export function ExternalSourceDialog({
  open,
  onOpenChange,
  onSubmit,
  source,
  isPending,
}: ExternalSourceDialogProps) {
  const form = useForm<InsertExternalEpgSource>({
    resolver: zodResolver(insertExternalEpgSourceSchema),
    defaultValues: {
      name: "",
      url: "",
      channelId: "",
      logoUrl: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (source) {
      form.reset({
        name: source.name,
        url: source.url,
        channelId: source.channelId,
        logoUrl: source.logoUrl || "",
        isActive: source.isActive,
      });
    } else {
      form.reset({
        name: "",
        url: "",
        channelId: "",
        logoUrl: "",
        isActive: true,
      });
    }
  }, [source, form, open]);

  const handleSubmit = (data: InsertExternalEpgSource) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">
            {source ? "Editar Fuente Externa" : "Añadir Fuente EPG Externa"}
          </DialogTitle>
          <DialogDescription>
            {source
              ? "Modifica la información de la fuente EPG externa."
              : "Añade una URL JSON externa para importar programación de canales."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Canal</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: CHV"
                      {...field}
                      data-testid="input-source-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del JSON</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://ejemplo.com/epg.json"
                      {...field}
                      data-testid="input-source-url"
                    />
                  </FormControl>
                  <FormDescription>
                    URL que devuelve la programación en formato JSON
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="channelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID del Canal para EPG</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: chv.cl"
                      {...field}
                      data-testid="input-source-channel-id"
                    />
                  </FormControl>
                  <FormDescription>
                    Identificador único para el archivo EPG
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Logo (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://ejemplo.com/logo.png"
                      {...field}
                      data-testid="input-source-logo"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {source ? "Guardar Cambios" : "Añadir Fuente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
