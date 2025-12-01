'use client';

import { useState, useEffect, useMemo, useCallback, ReactElement } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getRequests, deleteRequest, updateRequestStatus } from '@/lib/actions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  Search,
  FileText,
  Eye,
  Trash2,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  AlertCircle,
  SquarePen,
  ListFilter,
  TrendingUp,
  TrendingDown,
  Flame,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// --- TIPOS Y CONSTANTES ---

type RequestStatus = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Entregada';
type RequestPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente';

type Request = {
  id: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  createdAt: Date;
  updatedAt: Date;
  beneficiaryName: string | null;
  beneficiaryId: string | null;
};

const STATUS_OPTIONS: { value: RequestStatus; label: string; icon: React.ElementType; className: string }[] = [
  { value: 'Pendiente', label: 'Pendiente', icon: Clock, className: 'text-yellow-600 border-yellow-500/50 bg-yellow-500/10' },
  { value: 'Aprobada', label: 'Aprobada', icon: CheckCircle, className: 'text-green-600 border-green-500/50 bg-green-500/10' },
  { value: 'Rechazada', label: 'Rechazada', icon: XCircle, className: 'text-red-600 border-red-500/50 bg-red-500/10' },
  { value: 'Entregada', label: 'Entregada', icon: Package, className: 'text-blue-600 border-blue-500/50 bg-blue-500/10' },
];

const PRIORITY_OPTIONS: { value: RequestPriority; label: string; icon: React.ElementType; className: string }[] = [
  { value: 'Baja', label: 'Baja', icon: TrendingDown, className: 'bg-green-100 text-green-800' },
  { value: 'Media', label: 'Media', icon: TrendingUp, className: 'bg-yellow-100 text-yellow-800' },
  { value: 'Alta', label: 'Alta', icon: AlertCircle, className: 'bg-orange-100 text-orange-800' },
  { value: 'Urgente', label: 'Urgente', icon: Flame, className: 'bg-red-100 text-red-800' },
];


// --- COMPONENTES MODULARES DE UI ---

// Utilidad de clase CSS dinámica
const getDynamicStatusClass = (count: number) => {
  if (count <= 4) return 'text-green-600 bg-green-100 border-green-200';
  if (count <= 10) return 'text-blue-600 bg-blue-100 border-blue-200';
  return 'text-red-600 bg-red-100 border-red-200';
};

const StatsCards = ({ requests }: { requests: Request[] }): ReactElement => {
  const stats = useMemo(() => {
    return STATUS_OPTIONS.map(option => ({
      ...option,
      count: requests.filter(r => r.status === option.value).length,
    }));
  }, [requests]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map(stat => {
        // Calculamos la clase dinámica basada en el conteo
        const dynamicStyle = getDynamicStatusClass(stat.count);
        
        return (
          <Card key={stat.value} className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.label}</CardTitle>
              {/* Aplicamos color dinámico al icono */}
              <stat.icon className={`h-4 w-4 ${dynamicStyle.split(' ')[0]}`} /> 
            </CardHeader>
            <CardContent>
              {/* Aplicamos color dinámico al número */}
              <div className={`text-2xl font-bold ${dynamicStyle.split(' ')[0]}`}>{stat.count}</div>
              <p className="text-xs text-muted-foreground mt-1">Solicitudes activas</p>
              
              {/* Barra de progreso visual simple */}
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                 <div 
                   className={`h-full rounded-full ${dynamicStyle.split(' ')[0].replace('text-', 'bg-')}`} 
                   style={{ width: `${Math.min(100, (stat.count / 15) * 100)}%` }} // Escala visual relativa
                 />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};


const Toolbar = ({ filters, setFilters }: {
  filters: { searchTerm: string; status: string; priority: string; };
  setFilters: React.Dispatch<React.SetStateAction<{ searchTerm: string; status: string; priority: string; }>>;
}) => {
  const activeFiltersCount = Object.values(filters).filter(v => v && v !== '').length - (filters.searchTerm ? 1 : 0);

  const clearFilters = () => {
    setFilters(prev => ({ ...prev, status: '', priority: '' }));
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por descripción o beneficiario..."
          value={filters.searchTerm}
          onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
          className="w-full pl-10"
        />
      </div>
      <div className="flex w-full sm:w-auto items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto flex-1">
              <ListFilter className="mr-2 h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-full">{activeFiltersCount}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-4" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Estado</p>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'todos' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Prioridad</p>
                <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value === 'todos' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar prioridad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {PRIORITY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" onClick={clearFilters} className="text-sm">
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
};


const RequestTableRow = ({ request, onStatusChange, onDelete }: {
  request: Request;
  onStatusChange: (id: string, newStatus: RequestStatus) => void;
  onDelete: (id: string, description: string) => void;
}) => {
  const StatusBadge = ({ status }: { status: RequestStatus }) => {
    const option = STATUS_OPTIONS.find(o => o.value === status)!;
    return (
      <Badge variant="outline" className={`font-normal ${option.className}`}>
        <option.icon className="h-3 w-3 mr-1.5" />
        {option.label}
      </Badge>
    );
  };

  const PriorityBadge = ({ priority }: { priority: RequestPriority }) => {
    const option = PRIORITY_OPTIONS.find(o => o.value === priority)!;
    return (
      <Badge variant="secondary" className={`font-normal ${option.className}`}>
        <option.icon className="h-3 w-3 mr-1.5" />
        {option.label}
      </Badge>
    );
  };

  return (
    <TableRow>
      <TableCell className="max-w-[300px] truncate font-medium">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default">{request.description}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-md">{request.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-muted-foreground">{request.beneficiaryName || 'N/A'}</TableCell>
      <TableCell><PriorityBadge priority={request.priority} /></TableCell>
      <TableCell><StatusBadge status={request.status} /></TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(request.createdAt), 'dd MMM, yyyy', { locale: es })}
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
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/dashboard/solicitudes/${request.id}`}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</Link>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><SquarePen className="mr-2 h-4 w-4" /> Cambiar Estado</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {STATUS_OPTIONS.map(status => (
                  <DropdownMenuItem key={status.value} onClick={() => onStatusChange(request.id, status.value)} className="cursor-pointer">
                    <status.icon className="mr-2 h-4 w-4" /> {status.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(request.id, request.description)} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};


const RequestTable = ({ requests, onStatusChange, onDelete }: {
  requests: Request[];
  onStatusChange: (id: string, newStatus: RequestStatus) => void;
  onDelete: (id: string, description: string) => void;
}) => (
  <Card>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Descripción</TableHead>
              <TableHead>Beneficiario</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length > 0 ? (
              requests.map((request) => (
                <RequestTableRow
                  key={request.id}
                  request={request}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-60 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-12 w-12 text-gray-400" />
                    <h3 className="text-lg font-semibold">No se encontraron solicitudes</h3>
                    <p className="max-w-xs text-sm">Intenta ajustar los filtros o crea una nueva solicitud.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);


const DeleteConfirmationDialog = ({ open, onOpenChange, onConfirm, requestDescription }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  requestDescription: string;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta acción no se puede deshacer. Se eliminará permanentemente la solicitud: <br />
          <span className="font-semibold italic">"{requestDescription.substring(0, 80)}{requestDescription.length > 80 ? '...' : ''}"</span>.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
          Sí, eliminar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);


// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
export default function SolicitudesPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ searchTerm: '', status: '', priority: '' });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, requestId: '', requestDescription: '' });

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRequests();
      // Aseguramos que las fechas son objetos Date para evitar problemas de formato
      const formattedData = data.map(req => ({
        ...req,
        createdAt: new Date(req.createdAt),
        updatedAt: new Date(req.updatedAt),
      }));
      setRequests(formattedData);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      // Aquí podrías agregar un estado de error para mostrar un mensaje al usuario
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const searchTermLower = filters.searchTerm.toLowerCase();
      const searchMatch = filters.searchTerm === '' ||
        r.description.toLowerCase().includes(searchTermLower) ||
        (r.beneficiaryName && r.beneficiaryName.toLowerCase().includes(searchTermLower));
      const statusMatch = filters.status === '' || r.status === filters.status;
      const priorityMatch = filters.priority === '' || r.priority === filters.priority;
      return searchMatch && statusMatch && priorityMatch;
    });
  }, [requests, filters]);

  const handleDelete = async () => {
    try {
      await deleteRequest(deleteDialog.requestId);
      loadRequests(); // Recarga la lista después de eliminar
    } catch (error) {
      console.error('Error al eliminar solicitud:', error);
    } finally {
      setDeleteDialog({ isOpen: false, requestId: '', requestDescription: '' });
    }
  };

  const handleStatusChange = async (id: string, newStatus: RequestStatus) => {
    try {
      await updateRequestStatus(id, newStatus);
      loadRequests(); // Recarga la lista después de actualizar
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    }
  };

  const openDeleteDialog = (id: string, description: string) => {
    setDeleteDialog({ isOpen: true, requestId: id, requestDescription: description });
  };

  // Skeleton UI para el estado de carga
  if (loading && requests.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6 md:p-8">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestión de Solicitudes</h1>
          <p className="text-muted-foreground mt-1">
            Visualiza, filtra y administra todas las solicitudes de ayuda.
          </p>
        </div>
        <Link href="/dashboard/solicitudes/nueva">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Solicitud
          </Button>
        </Link>
      </header>

      <main>
        <div className="space-y-4">
          <StatsCards requests={requests} />
          <Card>
             <CardHeader>
               <Toolbar filters={filters} setFilters={setFilters} />
             </CardHeader>
             <CardContent>
                <RequestTable
                  requests={filteredRequests}
                  onStatusChange={handleStatusChange}
                  onDelete={openDeleteDialog}
                />
             </CardContent>
          </Card>
        </div>
      </main>

      <DeleteConfirmationDialog
        open={deleteDialog.isOpen}
        onOpenChange={(isOpen) => setDeleteDialog(prev => ({ ...prev, isOpen }))}
        onConfirm={handleDelete}
        requestDescription={deleteDialog.requestDescription}
      />
    </div>
  );
}