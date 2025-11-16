'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// MODIFICADO: Añadir createRepresentante
import {
  updateAdultoMayor,
  updatePersonaConDiscapacidad,
  getRepresentantes,
  getBeneficiaryById,
  createRepresentante
} from '@/lib/actions';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from '@/components/ui/badge';
// AÑADIDO: Nuevos componentes y Label
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from '@/components/ui/label';

// MODIFICADO: Añadir nuevos iconos
import { Save, CalendarIcon, Loader2, User, UserPlus, ChevronsUpDown, Check, CheckCircle2, ArrowLeft } from 'lucide-react';

// Utils
import { cn } from '@/lib/utils';
import { format, differenceInYears } from "date-fns";
import { es } from 'date-fns/locale';

// --- Esquemas de Validación (sin cambios) ---
const adultoMayorSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  apellido: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  fechaNacimiento: z.date().optional(),
  etniaAborigen: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  correoElectronico: z.string().email({ message: "Correo electrónico inválido." }).optional().or(z.literal("")).nullable(),
  estadoCivil: z.enum(["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a"]).optional().nullable(),
  descripcionSalud: z.string().max(500, { message: "La descripción no debe exceder los 500 caracteres." }).optional().nullable(),
});

const personaDiscapacidadSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  apellido: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  fechaNacimiento: z.date().optional(),
  etniaAborigen: z.string().optional().nullable(),
  tipoDiscapacidad: z.string().optional().nullable(),
  gradoDiscapacidad: z.string().optional().nullable(),
  certificacionMedica: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  correoElectronico: z.string().email({ message: "Correo electrónico inválido." }).optional().or(z.literal("")).nullable(),
  estadoCivil: z.enum(["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a"]).optional().nullable(),
  representanteId: z.string().optional().nullable(),
});

type BeneficiaryProp = NonNullable<Awaited<ReturnType<typeof getBeneficiaryById>>>;

export function EditForm({ beneficiary }: { beneficiary: BeneficiaryProp }) {
  // --- AÑADIDO: Nuevos estados ---
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [representantes, setRepresentantes] = useState<any[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRepData, setNewRepData] = useState({ nombre: '', apellido: '', telefono: '' });
  const [isCreatingRep, setIsCreatingRep] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (beneficiary.type === 'persona_discapacidad') {
      getRepresentantes().then(setRepresentantes).catch(console.error);
    }
  }, [beneficiary.type]);

  const form = useForm({
    resolver: zodResolver(beneficiary.type === 'adulto_mayor' ? adultoMayorSchema : personaDiscapacidadSchema),
    defaultValues: {
      nombre: beneficiary.nombre || "",
      apellido: beneficiary.apellido || "",
      fechaNacimiento: beneficiary.fechaNacimiento ? new Date(beneficiary.fechaNacimiento) : undefined,
      etniaAborigen: beneficiary.etniaAborigen || "",
      direccion: beneficiary.direccion || "",
      telefono: beneficiary.telefono || "",
      correoElectronico: beneficiary.correoElectronico || "",
      estadoCivil: beneficiary.estadoCivil as any || undefined, // Cast to any to avoid enum issues
      ...(beneficiary.type === 'adulto_mayor'
        ? { descripcionSalud: beneficiary.descripcionSalud || "" }
        : {
          tipoDiscapacidad: beneficiary.tipoDiscapacidad as any || undefined,
          gradoDiscapacidad: beneficiary.gradoDiscapacidad as any || undefined,
          certificacionMedica: beneficiary.certificacionMedica || "",
          representanteId: beneficiary.representanteId || undefined,
        }),
    },
    mode: 'onChange',
  });

  const { isSubmitting, isValid } = form.formState;

  // --- MODIFICADO: onSubmit ahora activa la pantalla de éxito ---
  async function onSubmit(data: any) {
    setServerError(null);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof Date) {
        formData.append(key, value.toISOString().split('T')[0]);
      } else if (value != null && value !== '') { // Asegura que no se envíen nulos o vacíos
        formData.append(key, value as string);
      }
    });
    // Si un campo opcional se vació, hay que asegurarse de enviarlo vacío para que se actualice en la DB
    if (!data.representanteId) formData.append('representanteId', '');


    try {
      if (beneficiary.type === 'adulto_mayor') {
        await updateAdultoMayor(beneficiary.id, formData);
      } else {
        await updatePersonaConDiscapacidad(beneficiary.id, formData);
      }
      router.push(`/dashboard/registros/${beneficiary.id}`); // Activa la pantalla de éxito
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
    }
  }

  // --- AÑADIDO: handleCreateRepresentante ---
  async function handleCreateRepresentante() {
    setIsCreatingRep(true);
    setCreationError(null);
    if (!newRepData.nombre.trim() || !newRepData.apellido.trim()) {
      setCreationError("Nombre y apellido son obligatorios.");
      setIsCreatingRep(false);
      return;
    }
    const formData = new FormData();
    formData.append('nombre', newRepData.nombre);
    formData.append('apellido', newRepData.apellido);
    if (newRepData.telefono) formData.append('telefono', newRepData.telefono);

    try {
      const newRep = await createRepresentante(formData);
      setRepresentantes(prev => [newRep, ...prev]);
      form.setValue('representanteId', newRep.id, { shouldValidate: true });
      setDialogOpen(false);
      setComboboxOpen(false);
      setNewRepData({ nombre: '', apellido: '', telefono: '' });
    } catch (error) {
      setCreationError(error instanceof Error ? error.message : "Error al crear representante.");
    } finally {
      setIsCreatingRep(false);
    }
  }

  // --- RENDER CONDICIONAL ---
  if (isSuccess) {
    return (
      <Card className="shadow-sm flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
        <CardContent className="flex flex-col items-center">
          <CheckCircle2 className="h-20 w-20 text-green-500 mb-4" />
          <CardTitle className="text-2xl mb-2">¡Cambios Guardados!</CardTitle>
          <CardDescription className="mb-8 max-w-sm">
            La información del beneficiario ha sido actualizada correctamente.
          </CardDescription>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {beneficiary.type === 'adulto_mayor' ? (
          <>
            {/* --- FORMULARIO ADULTO MAYOR --- */}
            <Card>
              <CardHeader><CardTitle>Datos Personales</CardTitle><CardDescription>Información básica del adulto mayor.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem><FormLabel>Nombre *</FormLabel><FormControl><Input placeholder="Ej. María" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="apellido" render={({ field }) => ( <FormItem><FormLabel>Apellido *</FormLabel><FormControl><Input placeholder="Ej. García" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="fechaNacimiento" render={({ field }) => ( <FormItem className="flex flex-col pt-2"><FormLabel>Fecha de Nacimiento</FormLabel><div className="flex items-center gap-3"><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Selecciona una fecha</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus captionLayout="dropdown" fromYear={1920} toYear={new Date().getFullYear()}/></PopoverContent></Popover>{field.value && (<Badge variant="secondary" className="whitespace-nowrap font-semibold">{differenceInYears(new Date(), field.value)} años</Badge>)}</div><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="estadoCivil" render={({ field }) => ( <FormItem className="pt-2"><FormLabel>Estado Civil</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona el estado civil" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Soltero/a">Soltero/a</SelectItem><SelectItem value="Casado/a">Casado/a</SelectItem><SelectItem value="Divorciado/a">Divorciado/a</SelectItem><SelectItem value="Viudo/a">Viudo/a</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="etniaAborigen" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Etnia Aborigen</FormLabel><FormControl><Input placeholder="Ej. Wayuu, Pemón, etc." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Información de Contacto</CardTitle><CardDescription>Datos de contacto y ubicación.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="telefono" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="Ej. 0414-1234567" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="correoElectronico" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input placeholder="ejemplo@correo.com" type="email" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="direccion" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Dirección</FormLabel><FormControl><Textarea placeholder="Dirección completa del domicilio" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Información de Salud</CardTitle><CardDescription>Detalles relevantes sobre la salud.</CardDescription></CardHeader>
              <CardContent>
                <FormField control={form.control} name="descripcionSalud" render={({ field }) => (<FormItem><FormLabel>Descripción de Salud</FormLabel><FormControl><Textarea placeholder="Describe condiciones médicas, medicamentos, alergias, etc." className="resize-y min-h-[100px]" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)}/>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* --- FORMULARIO PERSONA CON DISCAPACIDAD --- */}
            <Card>
              <CardHeader><CardTitle>Datos Personales</CardTitle><CardDescription>Información básica de la persona.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem><FormLabel>Nombre *</FormLabel><FormControl><Input placeholder="Ej. Carlos" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="apellido" render={({ field }) => ( <FormItem><FormLabel>Apellido *</FormLabel><FormControl><Input placeholder="Ej. Rodríguez" {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="fechaNacimiento" render={({ field }) => ( <FormItem className="flex flex-col pt-2"><FormLabel>Fecha de Nacimiento</FormLabel><div className="flex items-center gap-3"><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Selecciona una fecha</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus captionLayout="dropdown" fromYear={1920} toYear={new Date().getFullYear()}/></PopoverContent></Popover>{field.value && (<Badge variant="secondary" className="whitespace-nowrap font-semibold">{differenceInYears(new Date(), field.value)} años</Badge>)}</div><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="estadoCivil" render={({ field }) => ( <FormItem className="pt-2"><FormLabel>Estado Civil</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona el estado civil" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Soltero/a">Soltero/a</SelectItem><SelectItem value="Casado/a">Casado/a</SelectItem><SelectItem value="Divorciado/a">Divorciado/a</SelectItem><SelectItem value="Viudo/a">Viudo/a</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="etniaAborigen" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Etnia Aborigen</FormLabel><FormControl><Input placeholder="Ej. Wayuu, Pemón, etc." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Información de Discapacidad</CardTitle><CardDescription>Detalles sobre la discapacidad.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="tipoDiscapacidad" render={({ field }) => ( <FormItem><FormLabel>Tipo de Discapacidad</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Discapacidad Motora">Discapacidad Motora</SelectItem><SelectItem value="Discapacidad Visual">Discapacidad Visual</SelectItem><SelectItem value="Discapacidad Auditiva">Discapacidad Auditiva</SelectItem><SelectItem value="Discapacidad Intelectual">Discapacidad Intelectual</SelectItem><SelectItem value="Discapacidad Psicosocial">Discapacidad Psicosocial</SelectItem><SelectItem value="Discapacidad Múltiple">Discapacidad Múltiple</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="gradoDiscapacidad" render={({ field }) => ( <FormItem><FormLabel>Grado de Discapacidad</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona el grado" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Leve">Leve</SelectItem><SelectItem value="Moderado">Moderado</SelectItem><SelectItem value="Severo">Severo</SelectItem><SelectItem value="Profundo">Profundo</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="certificacionMedica" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Certificación Médica</FormLabel><FormControl><Textarea placeholder="Detalles de la certificación médica..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Información de Contacto</CardTitle><CardDescription>Datos de contacto y ubicación.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="telefono" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="Ej. 0414-1234567" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="correoElectronico" render={({ field }) => (<FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input placeholder="ejemplo@correo.com" type="email" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="direccion" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Dirección</FormLabel><FormControl><Textarea placeholder="Dirección completa del domicilio" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Representante Legal</CardTitle><CardDescription>Busca o crea un representante para esta persona.</CardDescription></CardHeader>
              <CardContent>
                {/* --- REEMPLAZO DEL CAMPO REPRESENTANTE --- */}
                <FormField
                  control={form.control}
                  name="representanteId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Representante</FormLabel>
                      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value
                                ? representantes.find((rep) => rep.id === field.value)?.nombre + ' ' + representantes.find((rep) => rep.id === field.value)?.apellido
                                : "Selecciona o crea un representante"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar representante..." />
                            <CommandList>
                              <CommandEmpty>
                                <div className="py-4 text-center text-sm">
                                  <p className="mb-2">No se encontró el representante.</p>
                                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" onSelect={(e) => e.preventDefault()}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Crear Nuevo
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Nuevo Representante</DialogTitle>
                                        <DialogDescription>Añade los datos del nuevo representante. Se asignará automáticamente.</DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2"><Label htmlFor="rep-nombre">Nombre *</Label><Input id="rep-nombre" value={newRepData.nombre} onChange={(e) => setNewRepData(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Ej. José"/></div>
                                        <div className="space-y-2"><Label htmlFor="rep-apellido">Apellido *</Label><Input id="rep-apellido" value={newRepData.apellido} onChange={(e) => setNewRepData(prev => ({ ...prev, apellido: e.target.value }))} placeholder="Ej. Pérez" /></div>
                                        <div className="space-y-2"><Label htmlFor="rep-telefono">Teléfono (Opcional)</Label><Input id="rep-telefono" value={newRepData.telefono} onChange={(e) => setNewRepData(prev => ({ ...prev, telefono: e.target.value }))} placeholder="Ej. 0412-1234567" /></div>
                                        {creationError && <p className="text-sm font-medium text-destructive">{creationError}</p>}
                                      </div>
                                      <DialogFooter>
                                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                                        <Button onClick={handleCreateRepresentante} disabled={isCreatingRep}>{isCreatingRep ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</>) : "Guardar"}</Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    form.setValue("representanteId", undefined);
                                    setComboboxOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                  Ninguno
                                </CommandItem>
                                {representantes.map((rep) => (
                                  <CommandItem
                                    key={rep.id}
                                    value={`${rep.nombre} ${rep.apellido}`}
                                    onSelect={() => {
                                      form.setValue("representanteId", rep.id);
                                      setComboboxOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", field.value === rep.id ? "opacity-100" : "opacity-0")} />
                                    {rep.nombre} {rep.apellido}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </>
        )}
        
        {serverError && (<div className="text-sm font-medium text-destructive bg-red-50 p-4 rounded-lg">{serverError}</div>)}

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Actualizando...</> : <><Save className="h-4 w-4 mr-2" /> Guardar Cambios</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}