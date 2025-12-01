'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Search, Users, Eye, Edit, Trash2, Filter, ChevronDown, CheckIcon, XCircle,
  ArrowUp, ArrowDown, MoreHorizontal, FileText, Shapes,
} from 'lucide-react';
import { getBeneficiaries, deleteBeneficiary } from '@/lib/actions';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Beneficiary = Awaited<ReturnType<typeof getBeneficiaries>>[number];

type SortKey = keyof Pick<Beneficiary, 'fullName' | 'createdAt'>;

const getInitials = (name: string) => {
  if (!name) return '?';
  const names = name.split(' ');
  const initials = names.map((n) => n[0]).join('');
  return initials.slice(0, 2).toUpperCase();
};

const stringToColorClasses = (str: string) => {
  if (!str) return 'bg-gray-100 text-gray-800';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
    'bg-teal-100 text-teal-800',
  ];
  const index = Math.abs(hash % colors.length);
  return colors[index];
};

// --- Nueva Función Helper para colores ---
const getMetricColor = (count: number) => {
  if (count <= 4) return 'text-green-600';
  if (count <= 10) return 'text-blue-600';
  return 'text-red-600';
};

const TableSkeleton = () => (
  <div className="border rounded-lg overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]"><Skeleton className="h-5 w-32" /></TableHead>
          <TableHead><Skeleton className="h-5 w-24" /></TableHead>
          <TableHead><Skeleton className="h-5 w-24" /></TableHead>
          <TableHead><Skeleton className="h-5 w-20" /></TableHead>
          <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-6 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default function RegistrosPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisabilityFilters, setSelectedDisabilityFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; name: string | null }>({
    open: false,
    id: null,
    name: null,
  });

  useEffect(() => {
    const loadBeneficiaries = async () => {
      try {
        const data = await getBeneficiaries();
        setBeneficiaries(data);
      } catch (error) {
        console.error('Error al cargar los beneficiarios:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBeneficiaries();
  }, []);

  const filteredBeneficiaries = useMemo(() => {
    let result = [...beneficiaries];

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          b.fullName.toLowerCase().includes(lowercasedTerm) ||
          (b.disabilityType && b.disabilityType.toLowerCase().includes(lowercasedTerm)) ||
          (b.notes && b.notes.toLowerCase().includes(lowercasedTerm))
      );
    }

    if (selectedDisabilityFilters.length > 0) {
      result = result.filter(
        (b) => b.disabilityType && selectedDisabilityFilters.includes(b.disabilityType)
      );
    }

    if (sort) {
      result.sort((a, b) => {
        const aValue = a[sort.key];
        const bValue = b[sort.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue, 'es', { sensitivity: 'base' });
        }

        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [searchTerm, selectedDisabilityFilters, sort, beneficiaries]);

  const uniqueDisabilityTypes = useMemo(() =>
    Array.from(new Set(beneficiaries.map((b) => b.disabilityType).filter(Boolean))) as string[],
    [beneficiaries]
  );

  const disabilityCounts = useMemo(() =>
    uniqueDisabilityTypes.reduce((acc, type) => {
      acc[type] = beneficiaries.filter((b) => b.disabilityType === type).length;
      return acc;
    }, {} as Record<string, number>),
    [beneficiaries, uniqueDisabilityTypes]
  );

  const handleSort = (key: SortKey) => {
    setSort(prevSort => ({
      key,
      direction: prevSort?.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDelete = async () => {
    if (deleteDialog.id) {
      try {
        await deleteBeneficiary(deleteDialog.id);
        setBeneficiaries(prev => prev.filter(b => b.id !== deleteDialog.id));
        setDeleteDialog({ open: false, id: null, name: null });
      } catch (error) {
        console.error('Error al eliminar el registro:', error);
        alert('Error al eliminar el registro');
      }
    }
  };

  const handleDisabilityFilterChange = (type: string) => {
    setSelectedDisabilityFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDisabilityFilters([]);
  };

  return (
    <TooltipProvider>
      <main className="bg-muted/40 min-h-screen p-4 sm:p-8 space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Gestión de Beneficiarios</h1>
            <p className="text-muted-foreground mt-1">
              Administra la información de las personas registradas en el sistema.
            </p>
          </div>
          <Link href="/dashboard/registros/nuevo">
            <Button size="lg" className="flex items-center gap-2 shadow-sm">
              <Plus className="h-5 w-5" />
              Nuevo Registro
            </Button>
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {/* Card: Total Registros con color dinámico */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
              <Users className={`h-4 w-4 ${getMetricColor(beneficiaries.length)}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getMetricColor(beneficiaries.length)}`}>
                {beneficiaries.length}
              </div>
              <p className="text-xs text-muted-foreground">Beneficiarios en el sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registros Filtrados</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredBeneficiaries.length}</div>
              <p className="text-xs text-muted-foreground">Visibles con filtros actuales</p>
            </CardContent>
          </Card>

          {/* Card: Tipos de Discapacidad con color dinámico */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tipos de Discapacidad</CardTitle>
              <Shapes className={`h-4 w-4 ${getMetricColor(uniqueDisabilityTypes.length)}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getMetricColor(uniqueDisabilityTypes.length)}`}>
                {uniqueDisabilityTypes.length}
              </div>
              <p className="text-xs text-muted-foreground">Categorías únicas registradas</p>
            </CardContent>
          </Card>
        </section>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Lista de Beneficiarios</CardTitle>
            <CardDescription>Busca, filtra y gestiona la información de los registros.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 items-center mb-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, tipo de discapacidad, notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-between">
                      <Filter className="mr-2 h-4 w-4" />
                      Filtrar por Tipo
                      {selectedDisabilityFilters.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{selectedDisabilityFilters.length}</Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Buscar tipo..." />
                      <CommandEmpty>No se encontró tipo.</CommandEmpty>
                      <CommandGroup>
                        {uniqueDisabilityTypes.map((type) => (
                          <CommandItem key={type} onSelect={() => handleDisabilityFilterChange(type)} className="cursor-pointer">
                            <div className={cn(
                              'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                              selectedDisabilityFilters.includes(type)
                                ? 'bg-primary text-primary-foreground'
                                : 'opacity-50 [&_svg]:invisible'
                            )}>
                              <CheckIcon className="h-4 w-4" />
                            </div>
                            <span>{type}</span>
                            <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                              {disabilityCounts[type]}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                {(searchTerm || selectedDisabilityFilters.length > 0) && (
                  <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                    <XCircle className="mr-2 h-4 w-4" /> Limpiar
                  </Button>
                )}
              </div>
            </div>

            {selectedDisabilityFilters.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {selectedDisabilityFilters.map((filter) => (
                  <Badge key={filter} variant="secondary" className="pl-2 pr-1 py-1">
                    {filter}
                    <button
                      onClick={() => handleDisabilityFilterChange(filter)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {loading ? (
              <TableSkeleton />
            ) : filteredBeneficiaries.length === 0 ? (
              <div className="text-center py-16 px-6 bg-muted/50 rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {searchTerm || selectedDisabilityFilters.length > 0 ? 'No se encontraron resultados' : 'Aún no hay registros'}
                </h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  {searchTerm || selectedDisabilityFilters.length > 0
                    ? 'Intenta con otros filtros o términos de búsqueda.'
                    : 'Crea el primer registro para empezar a gestionar beneficiarios.'
                  }
                </p>
                {!searchTerm && selectedDisabilityFilters.length === 0 && (
                  <Link href="/dashboard/registros/nuevo">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primer Registro
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[250px]">
                        <Button variant="ghost" onClick={() => handleSort('fullName')} className="px-2">
                          Nombre
                          {sort.key === 'fullName' && (
                            sort.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>Tipo de Discapacidad</TableHead>
                      <TableHead>Fecha de Nacimiento</TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('createdAt')} className="px-2">
                          Fecha de Registro
                          {sort.key === 'createdAt' && (
                            sort.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBeneficiaries.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground">
                              {getInitials(b.fullName)}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900 block">{b.fullName}</span>
                              <span className="text-xs text-muted-foreground">
                                {b.type === 'adulto_mayor' ? 'Adulto Mayor' : 'Persona con Discapacidad'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {b.disabilityType ? (
                            <Badge className={cn('font-normal', stringToColorClasses(b.disabilityType))}>
                              {b.disabilityType}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-sm">No especificado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {b.birthDate ? (
                            format(new Date(b.birthDate), 'dd MMM yyyy', { locale: es })
                          ) : (
                            <span className="italic">No especificado</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-muted-foreground cursor-pointer">
                                {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true, locale: es })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{format(new Date(b.createdAt), "EEEE, dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href={`/dashboard/registros/${b.id}`}>
                                  <Eye className="h-4 w-4 mr-2" /> Ver Detalles
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href={`/dashboard/registros/${b.id}/editar`}>
                                  <Edit className="h-4 w-4 mr-2" /> Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                onClick={() => setDeleteDialog({ open: true, id: b.id, name: b.fullName })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se eliminará permanentemente el registro de{' '}
              <strong className="text-gray-900">{deleteDialog.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}