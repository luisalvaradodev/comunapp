'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3, Users, FileText, TrendingUp, Download, Filter, Clock,
  CheckCircle, XCircle, Package, AlertCircle, ClipboardList,
  ChevronDown, Check, Trash2, UserCheck, HeartHandshake, Accessibility
} from 'lucide-react';
import { getReportData } from '@/lib/actions';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, TooltipProps } from 'recharts';
import { useEffect, useState, useMemo, ReactNode } from 'react';
import { PDFDownloadLink, Document, Page, StyleSheet, Text, View, Font } from '@react-pdf/renderer';
import { LiquidStatCard } from '@/components/LiquidStatCard';

// --- TIPOS Y DATOS CONSTANTES ---

const COLORS_STATUS: { [key: string]: string } = {
  Aprobada: '#10B981', Pendiente: '#F59E0B', Rechazada: '#EF4444', Entregada: '#3B82F6',
};

// Nota: Aunque ya no se usen en el gráfico de barras, se mantienen por si se requieren en otros lados
const COLORS_PRIORITY: { [key: string]: string } = {
  Urgente: '#EF4444', Alta: '#F97316', Media: '#F59E0B', Baja: '#22C55E',
};
const COLORS_BENEFICIARY_TYPE = ['#3B82F6', '#10B981', '#9333ea', '#f59e0b'];
const COLORS_DISABILITY_GRADE = ['#84CC16', '#F59E0B', '#EF4444', '#9333EA'];

const STATUS_OPTIONS = ['Pendiente', 'Aprobada', 'Rechazada', 'Entregada'];
const PRIORITY_OPTIONS = ['Baja', 'Media', 'Alta', 'Urgente'];

// --- UTILIDAD DE COLOR DINÁMICO ---
const getDynamicColor = (value: number) => {
  if (value <= 4) return '#22c55e'; // Verde (Bajo)
  if (value <= 10) return '#3b82f6'; // Azul (Medio)
  return '#ef4444'; // Rojo (Alto)
};

// ACTUALIZACIÓN DE TIPOS
type FullRequest = {
  id: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  createdAt: Date;
  adultoMayor: any; 
  personaConDiscapacidad: any; 
}

type ReportData = {
  totalBeneficiaries: number;
  totalRequests: number;
  requestsByStatus: { status: "Aprobada" | "Pendiente" | "Rechazada" | "Entregada"; count: number; }[];
  requestsByPriority: { priority: "Baja" | "Media" | "Alta" | "Urgente"; count: number; }[];
  recentRequests: { id: string | number; description: string; beneficiaryName: string; status: string; priority: string; createdAt: string | Date; }[];
  beneficiariesByDisability: { disabilityType: string; count: number }[];
  beneficiariesByType: { type: string; count: number }[];
  beneficiariesByDisabilityGrade: { grade: string; count: number }[];
  totalAdultosMayores: number;
  totalPersonasConDiscapacidad: number;
  pcdWithRepresentativeCount: number;
  fullRequests: FullRequest[]; 
};

// --- COMPONENTES AUXILIARES DE UI ---

const getStatusAppearance = (status: string) => {
  switch (status) {
    case 'Pendiente': return { className: 'border-yellow-300 bg-yellow-50 text-yellow-800', icon: <Clock className="h-5 w-5 text-yellow-500" /> };
    case 'Aprobada': return { className: 'border-green-300 bg-green-50 text-green-800', icon: <CheckCircle className="h-5 w-5 text-green-500" /> };
    case 'Rechazada': return { className: 'border-red-300 bg-red-50 text-red-800', icon: <XCircle className="h-5 w-5 text-red-500" /> };
    case 'Entregada': return { className: 'border-blue-300 bg-blue-50 text-blue-800', icon: <Package className="h-5 w-5 text-blue-500" /> };
    default: return { className: 'border-gray-300 bg-gray-50 text-gray-800', icon: <AlertCircle className="h-5 w-5 text-gray-500" /> };
  }
};
const getPriorityAppearance = (priority: string) => {
  switch (priority) {
    case 'Urgente': return 'border-red-300 bg-red-50 text-red-800';
    case 'Alta': return 'border-orange-300 bg-orange-50 text-orange-800';
    case 'Media': return 'border-yellow-300 bg-yellow-50 text-yellow-800';
    case 'Baja': return 'border-green-300 bg-green-50 text-green-800';
    default: return 'border-gray-300 bg-gray-50 text-gray-800';
  }
};

const StatCard = ({ title, value, description, icon }: { title: string, value: React.ReactNode, description: string, icon: React.ReactNode }) => (
  <Card className="transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </CardContent>
  </Card>
);

const ChartCard = ({ title, description, data, children }: { title: string, description: string, data: any[], children: ReactNode }) => (
  <Card className="col-span-1">
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>
      {data && data.length > 0 ? (
        <div className="h-[250px] w-full">{children}</div>
      ) : (
        <EmptyState icon={<BarChart3 className="h-10 w-10" />} message={`No hay datos para mostrar.`} />
      )}
    </CardContent>
  </Card>
);

const EmptyState = ({ icon, message }: { icon: React.ReactNode, message: string }) => (
  <div className="flex flex-col items-center justify-center h-[250px] text-center text-gray-500 bg-slate-50 rounded-lg">
    <div className="mb-2 opacity-50">{icon}</div>
    <p className="text-sm">{message}</p>
  </div>
);

const CustomTooltip = ({ active, payload, label }: TooltipProps<string | number, string | number>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-sm p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-bold text-gray-800 text-sm">{label || payload[0].name}</p>
        <p className="text-xs text-gray-600">
          {payload[0].name}: <span className="font-semibold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const DashboardSkeleton = () => (
  <div className="space-y-6 p-8 animate-pulse">
    <div className="flex justify-between items-center">
      <Skeleton className="h-12 w-1/3" />
      <Skeleton className="h-10 w-48" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
    </div>
    <div className="grid lg:grid-cols-3 gap-6">
      <Skeleton className="lg:col-span-1 h-96" />
      <Skeleton className="lg:col-span-2 h-96" />
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="lg:col-span-1 h-96" />
        <Skeleton className="lg:col-span-1 h-96" />
    </div>
  </div>
);

// --- COMPONENTE DE PDF ---

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Inter-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700 },
  ]
});

const pdfStyles = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 8, padding: 25, backgroundColor: '#ffffff', color: '#374151' },
  header: { backgroundColor: '#F3F4F6', padding: 12, marginBottom: 15, borderRadius: 5, textAlign: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 9, color: '#6B7280', marginTop: 4 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1F2937', marginBottom: 8, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  twoColumnGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  column: { width: '48%' },
  statItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statLabel: { fontWeight: 'medium', color: '#4B5563' },
  statValue: { fontWeight: 'bold' },
  table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#E5E7EB' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableRowStriped: { backgroundColor: '#F9FAFB' },
  tableHeaderCell: { padding: 5, fontWeight: 'bold', fontSize: 7 },
  tableCell: { padding: 4 },
  footer: { position: 'absolute', bottom: 20, left: 25, right: 25, textAlign: 'center', color: '#9CA3AF', fontSize: 7, flexDirection: 'row', justifyContent: 'space-between' }
});

const ReportePDF = ({ data }: { data: ReportData }) => {
  const { totalRequests, requestsByStatus, fullRequests, totalAdultosMayores, totalPersonasConDiscapacidad, pcdWithRepresentativeCount } = data;
  const approvalRate = totalRequests > 0 ? Math.round((requestsByStatus.find(s => s.status === 'Aprobada')?.count || 0) / totalRequests * 100) : 0;
  
  return (
    <Document>
      {/* PÁGINA 1: RESUMEN */}
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.headerTitle}>Reporte General de Gestión</Text>
          <Text style={pdfStyles.headerSubtitle}>Generado el {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
        </View>
        
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Resumen de Indicadores Clave</Text>
          <View style={pdfStyles.twoColumnGrid}>
            <View style={pdfStyles.column}>
              <View style={pdfStyles.statItem}><Text style={pdfStyles.statLabel}>Total Adultos Mayores</Text><Text style={pdfStyles.statValue}>{totalAdultosMayores}</Text></View>
              <View style={pdfStyles.statItem}><Text style={pdfStyles.statLabel}>Total Personas c/ Discapacidad</Text><Text style={pdfStyles.statValue}>{totalPersonasConDiscapacidad}</Text></View>
              <View style={pdfStyles.statItem}><Text style={pdfStyles.statLabel}>PCD con Representante</Text><Text style={pdfStyles.statValue}>{pcdWithRepresentativeCount}</Text></View>
            </View>
            <View style={pdfStyles.column}>
              <View style={pdfStyles.statItem}><Text style={pdfStyles.statLabel}>Total Solicitudes</Text><Text style={pdfStyles.statValue}>{totalRequests}</Text></View>
              <View style={pdfStyles.statItem}><Text style={pdfStyles.statLabel}>Tasa de Aprobación</Text><Text style={pdfStyles.statValue}>{approvalRate}%</Text></View>
              <View style={pdfStyles.statItem}><Text style={pdfStyles.statLabel}>Solicitudes Pendientes</Text><Text style={pdfStyles.statValue}>{requestsByStatus.find(s => s.status === 'Pendiente')?.count || 0}</Text></View>
            </View>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Desglose de Solicitudes por Estado</Text>
           <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderCell, { width: '40%' }]}>Estado</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>Cantidad</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>Porcentaje</Text>
            </View>
            {requestsByStatus.map((item, index) => (
              <View style={index % 2 === 1 ? [pdfStyles.tableRow, pdfStyles.tableRowStriped] : pdfStyles.tableRow} key={item.status}>
                <Text style={[pdfStyles.tableCell, { width: '40%' }]}>{item.status}</Text>
                <Text style={[pdfStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{item.count}</Text>
                <Text style={[pdfStyles.tableCell, { width: '30%', textAlign: 'right' }]}>{`${(item.count / totalRequests * 100).toFixed(1)}%`}</Text>
              </View>
            ))}
           </View>
        </View>

        <View style={pdfStyles.section} break> 
          <Text style={pdfStyles.sectionTitle}>Listado Detallado de Solicitudes y Beneficiarios</Text>
          
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader} fixed>
              <Text style={[pdfStyles.tableHeaderCell, { width: '18%' }]}>Beneficiario</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '10%' }]}>Contacto</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '20%' }]}>Dirección</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '22%' }]}>Descripción Solicitud</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '10%' }]}>Fecha</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '10%' }]}>Estado</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '10%' }]}>Prioridad</Text>
            </View>

            {fullRequests.map((req, index) => {
              const beneficiary = req.adultoMayor || req.personaConDiscapacidad;
              const name = beneficiary ? `${beneficiary.nombre} ${beneficiary.apellido}` : 'N/D';
              const contact = beneficiary ? beneficiary.telefono || 'N/D' : 'N/D';
              const address = beneficiary ? beneficiary.direccion || 'N/D' : 'N/D';

              return (
                <View style={index % 2 === 1 ? [pdfStyles.tableRow, pdfStyles.tableRowStriped] : pdfStyles.tableRow} key={req.id} wrap={false}>
                  <Text style={[pdfStyles.tableCell, { width: '18%' }]}>{name}</Text>
                  <Text style={[pdfStyles.tableCell, { width: '10%' }]}>{contact}</Text>
                  <Text style={[pdfStyles.tableCell, { width: '20%' }]}>{address}</Text>
                  <Text style={[pdfStyles.tableCell, { width: '22%' }]}>{req.descripcion}</Text>
                  <Text style={[pdfStyles.tableCell, { width: '10%' }]}>{format(new Date(req.createdAt), 'dd/MM/yy')}</Text>
                  <Text style={[pdfStyles.tableCell, { width: '10%' }]}>{req.estado}</Text>
                  <Text style={[pdfStyles.tableCell, { width: '10%' }]}>{req.prioridad}</Text>
                </View>
              );
            })}
          </View>
        </View>
        
        <View style={pdfStyles.footer} fixed>
          <Text>Reporte de Gestión - Sistema de Beneficiarios</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};


// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---

export default function ReportesPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getReportData({ status: statusFilter, priority: priorityFilter });
        setReportData(data);
        setError(null);
      } catch (err) {
        console.error("Error al cargar datos del reporte:", err);
        setError("No se pudieron cargar los datos. Inténtalo de nuevo más tarde.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [statusFilter, priorityFilter]);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <div className="p-8 text-center text-red-600 font-semibold">{error}</div>;
  if (!reportData) return <div className="p-8 text-center text-gray-500">No hay datos disponibles para mostrar.</div>;

  const {
    totalRequests, totalBeneficiaries, requestsByStatus, requestsByPriority,
    recentRequests, beneficiariesByDisability, beneficiariesByType,
    beneficiariesByDisabilityGrade, totalAdultosMayores, totalPersonasConDiscapacidad,
    pcdWithRepresentativeCount
  } = reportData;

  const memoizedStats = {
    approvalRate: totalRequests > 0 ? Math.round(((requestsByStatus?.find(s => s.status === 'Aprobada')?.count || 0) / totalRequests) * 100) : 0,
    approvedCount: requestsByStatus?.find(s => s.status === 'Aprobada')?.count || 0,
  };
  
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <DashboardHeader 
        reportData={reportData} 
        statusFilter={statusFilter} 
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
      />

      <KpiGrid 
        totalAdultosMayores={totalAdultosMayores}
        totalPersonasConDiscapacidad={totalPersonasConDiscapacidad}
        pcdWithRepresentativeCount={pcdWithRepresentativeCount}
        totalRequests={totalRequests}
        memoizedStats={memoizedStats}
      />
      
      <ChartsGrid 
        requestsByStatus={requestsByStatus}
        requestsByPriority={requestsByPriority}
        beneficiariesByType={beneficiariesByType}
      />
      
      <DetailsGrid 
        recentRequests={recentRequests}
        beneficiariesByDisabilityGrade={beneficiariesByDisabilityGrade}
      />
    </div>
  );
}

// --- SUB-COMPONENTES PARA ORGANIZACIÓN ---

const DashboardHeader = ({ reportData, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter }: any) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Panel de Reportes 📊</h1>
      <p className="text-gray-600 mt-1">Análisis de la gestión de beneficiarios y solicitudes.</p>
    </div>
    <div className="flex gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="end">
          <Command>
            <CommandInput placeholder="Buscar filtro..." />
            <CommandList>
              <CommandEmpty>No se encontraron filtros.</CommandEmpty>
              <CommandGroup heading="Estado">
                {STATUS_OPTIONS.map(status => (
                  <CommandItem key={status} onSelect={() => setStatusFilter(statusFilter === status ? '' : status)}>
                    <Check className={`mr-2 h-4 w-4 ${statusFilter === status ? 'opacity-100' : 'opacity-0'}`} />
                    {status}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Prioridad">
                {PRIORITY_OPTIONS.map(priority => (
                  <CommandItem key={priority} onSelect={() => setPriorityFilter(priorityFilter === priority ? '' : priority)}>
                    <Check className={`mr-2 h-4 w-4 ${priorityFilter === priority ? 'opacity-100' : 'opacity-0'}`} />
                    {priority}
                  </CommandItem>
                ))}
              </CommandGroup>
              {(statusFilter || priorityFilter) && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem onSelect={() => { setStatusFilter(''); setPriorityFilter(''); }} className="text-red-500">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpiar filtros
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <PDFDownloadLink document={<ReportePDF data={reportData} />} fileName={`Reporte_Gestion_${format(new Date(), 'yyyy-MM-dd')}.pdf`}>
        {({ loading }) => (
          <Button className="flex items-center gap-2" disabled={loading}>
            <Download className="h-4 w-4" /> <span>{loading ? 'Generando...' : 'Exportar PDF'}</span>
          </Button>
        )}
      </PDFDownloadLink>
    </div>
  </div>
);

const KpiGrid = ({ totalAdultosMayores, totalPersonasConDiscapacidad, pcdWithRepresentativeCount, totalRequests, memoizedStats }: any) => {
  
  const totalBeneficiaries = totalAdultosMayores + totalPersonasConDiscapacidad || 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 my-6">
      <LiquidStatCard 
        title="Adultos Mayores" 
        value={totalAdultosMayores} 
        totalForCalculation={totalBeneficiaries}
        icon={HeartHandshake}
        description="Registros activos"
      />

      <LiquidStatCard 
        title="Discapacidad" 
        value={totalPersonasConDiscapacidad} 
        totalForCalculation={totalBeneficiaries}
        icon={Accessibility}
        description="Registros activos"
      />

      <LiquidStatCard 
        title="Con Representante" 
        value={pcdWithRepresentativeCount} 
        // Calculamos llenado basado en el total de personas con discapacidad
        totalForCalculation={totalPersonasConDiscapacidad > 0 ? totalPersonasConDiscapacidad : 1}
        icon={UserCheck}
        description="Cuentan con tutor"
      />

      <LiquidStatCard 
        title="Total Solicitudes" 
        value={totalRequests} 
        // Objetivo visual: 100 solicitudes llenan el tanque (ajustable)
        totalForCalculation={100} 
        icon={FileText}
        description="Histórico global"
      />

      <LiquidStatCard 
        title="Tasa Aprobación" 
        value={memoizedStats.approvalRate} // Esto ya es un número 0-100
        totalForCalculation={100} // Como es porcentaje, el total es 100
        icon={TrendingUp}
        description="Efectividad de gestión"
      />
    </div>
  );
};

const ChartsGrid = ({ requestsByStatus, requestsByPriority, beneficiariesByType }: any) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Gráfica de Estado (PieChart - Mantenemos colores semánticos por claridad) */}
    <ChartCard title="Distribución de Solicitudes" description="Por estado actual" data={requestsByStatus}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={requestsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
            {requestsByStatus.map((e: any) => <Cell key={e.status} fill={COLORS_STATUS[e.status]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={10} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>

    {/* MODIFICADO: Gráfica de Prioridad (BarChart - DINÁMICA) */}
    <ChartCard title="Solicitudes por Prioridad" description="Volumen por urgencia" data={requestsByPriority}>
      <ResponsiveContainer>
        <BarChart data={requestsByPriority} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <XAxis dataKey="priority" axisLine={false} tickLine={false} fontSize={12} />
          <YAxis axisLine={false} tickLine={false} fontSize={12} />
          <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {requestsByPriority.map((entry: any, index: number) => (
              // APLICAMOS LA LÓGICA DE COLOR AQUÍ
              <Cell key={`cell-${index}`} fill={getDynamicColor(entry.count)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>

    {/* Gráfica de Tipos (PieChart) */}
    <ChartCard title="Tipos de Beneficiarios" description="Desglose de la población" data={beneficiariesByType}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={beneficiariesByType} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label>
            {beneficiariesByType.map((e: any, i: number) => <Cell key={e.type} fill={COLORS_BENEFICIARY_TYPE[i % COLORS_BENEFICIARY_TYPE.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={10} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  </div>
);

const DetailsGrid = ({ recentRequests, beneficiariesByDisabilityGrade }: any) => (
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Solicitudes Recientes</CardTitle>
        <CardDescription>Últimas 10 solicitudes registradas en el sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        {recentRequests.length > 0 ? (
          <div className="space-y-2">
            {recentRequests.map((req: any) => {
              const statusInfo = getStatusAppearance(req.status);
              const priorityClass = getPriorityAppearance(req.priority);
              return (
                <div key={req.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="mt-1">{statusInfo.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{req.description}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1 flex-wrap gap-x-2">
                      <span className="font-semibold">{req.beneficiaryName}</span> • <span>{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: es })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={`text-xs ${priorityClass}`}>{req.priority}</Badge>
                    <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>{req.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <EmptyState icon={<ClipboardList className="h-10 w-10" />} message="No hay solicitudes recientes" />}
      </CardContent>
    </Card>

  </div>
);