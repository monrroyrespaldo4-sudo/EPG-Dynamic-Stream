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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertChannelSchema, categories, type Channel, type InsertChannel } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface ChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertChannel) => void;
  channel?: Channel | null;
  isPending?: boolean;
}

export function ChannelDialog({
  open,
  onOpenChange,
  onSubmit,
  channel,
  isPending,
}: ChannelDialogProps) {
  const form = useForm<InsertChannel>({
    resolver: zodResolver(insertChannelSchema),
    defaultValues: {
      name: "",
      channelId: "",
      logoUrl: "",
      category: "",
      isActive: true,
      program: {
        title: "",
        description: "",
      },
    },
  });

  useEffect(() => {
    if (channel) {
      form.reset({
        name: channel.name,
        channelId: channel.channelId,
        logoUrl: channel.logoUrl || "",
        category: channel.category,
        isActive: channel.isActive,
        program: {
          title: channel.program.title,
          description: channel.program.description || "",
        },
      });
    } else {
      form.reset({
        name: "",
        channelId: "",
        logoUrl: "",
        category: "",
        isActive: true,
        program: {
          title: "",
          description: "",
        },
      });
    }
  }, [channel, form, open]);

  const handleSubmit = (data: InsertChannel) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">
            {channel ? "Editar Canal" : "Añadir Canal"}
          </DialogTitle>
          <DialogDescription>
            {channel
              ? "Modifica la información del canal y su programa."
              : "Configura un nuevo canal con su programa que se repetirá cada hora."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Información del Canal</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Canal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Canal Deportes HD"
                          {...field}
                          data-testid="input-channel-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="channelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID del Canal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: canal.deportes.hd"
                          {...field}
                          data-testid="input-channel-id"
                        />
                      </FormControl>
                      <FormDescription>
                        Identificador único para el EPG
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          data-testid="input-channel-logo"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} data-testid={`option-${cat}`}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Programa</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Este programa se repetirá cada hora durante las 24 horas del día.
                </p>
              </div>
              <FormField
                control={form.control}
                name="program.title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del Programa</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Transmisión en Vivo"
                        {...field}
                        data-testid="input-program-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="program.description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe el contenido del programa..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="input-program-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
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
                {channel ? "Guardar Cambios" : "Crear Canal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
