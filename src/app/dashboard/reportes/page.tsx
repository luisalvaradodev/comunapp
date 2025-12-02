'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, FileText, TrendingUp, Download, Filter, Clock,
  CheckCircle, Check, Calendar, HeartHandshake, Accessibility, UserCheck
} from 'lucide-react';
import { getReportData, getTrendData } from '@/lib/actions';
import { format, formatDistanceToNow, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, TooltipProps, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { useEffect, useState } from 'react';
import { PDFDownloadLink, Document, Page, StyleSheet, Text, View, Font, Image } from '@react-pdf/renderer';
import { LiquidStatCard } from '@/components/LiquidStatCard';

// --- CONFIGURACIÓN DE COLORES Y ESTILOS WEB ---

const COLORS_STATUS: { [key: string]: string } = {
  Aprobada: '#10B981', Pendiente: '#F59E0B', Rechazada: '#EF4444', Entregada: '#3B82F6',
};
const COLORS_BENEFICIARY_TYPE = ['#3B82F6', '#10B981', '#9333ea', '#f59e0b'];
const STATUS_OPTIONS = ['Pendiente', 'Aprobada', 'Rechazada', 'Entregada'];
const PRIORITY_OPTIONS = ['Baja', 'Media', 'Alta', 'Urgente'];

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/70 border border-white/50 shadow-lg rounded-2xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const getDynamicColor = (value: number) => {
  if (value <= 4) return '#22c55e';
  if (value <= 10) return '#3b82f6';
  return '#ef4444';
};

// --- TIPOS ---
type ReportData = {
  totalBeneficiaries: number;
  totalRequests: number;
  requestsByStatus: any[];
  requestsByPriority: any[];
  recentRequests: any[];
  beneficiariesByType: any[];
  beneficiariesByDisabilityGrade: any[];
  totalAdultosMayores: number;
  totalPersonasConDiscapacidad: number;
  pcdWithRepresentativeCount: number;
  fullRequests: any[];
};

// --- CONFIGURACIÓN DEL PDF (Mejorada y Corregida) ---

// 1. REGISTRO DE FUENTES LOCALES (Asegúrate de que los archivos estén en public/fonts/)
Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Inter-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/Inter-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700 },
  ]
});

// 2. ESTILOS PDF AVANZADOS
const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    backgroundColor: '#F8FAFC', // Slate 50
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
    color: '#334155', // Slate 700
  },
  // Barra decorativa superior
  brandStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 8,
    width: '100%',
    backgroundColor: '#0F172A', // Slate 900
  },
  header: {
    marginBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 15,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0F172A',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaContainer: {
    alignItems: 'flex-end',
  },
  metaText: {
    fontSize: 9,
    color: '#64748B',
  },
  // Cards de Resumen
  summarySection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0F172A',
  },
  // Tabla
  tableContainer: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Slate 100
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 9,
    color: '#334155',
  },
  // Badges dentro del PDF
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 600,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 35,
    right: 35,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#94A3B8',
  }
});

// Componente Auxiliar para Status Badge en PDF
const StatusBadgePDF = ({ status }: { status: string }) => {
  let bg = '#E2E8F0';
  let color = '#475569';

  switch (status) {
    case 'Aprobada': bg = '#DCFCE7'; color = '#166534'; break; // Green
    case 'Pendiente': bg = '#FEF3C7'; color = '#92400E'; break; // Amber
    case 'Rechazada': bg = '#FEE2E2'; color = '#991B1B'; break; // Red
    case 'Entregada': bg = '#DBEAFE'; color = '#1E40AF'; break; // Blue
  }

  return (
    <View style={[pdfStyles.badge, { backgroundColor: bg }]}>
      <Text style={[pdfStyles.badgeText, { color: color }]}>{status}</Text>
    </View>
  );
};

const ReportePDF = ({ data, periodLabel }: { data: ReportData, periodLabel: string }) => {
  const { fullRequests } = data;
  const total = fullRequests.length;
  const approved = fullRequests.filter(r => r.estado === 'Aprobada').length;
  const pending = fullRequests.filter(r => r.estado === 'Pendiente').length;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page} orientation="landscape">
        {/* Barra superior de marca */}
        <View fixed style={pdfStyles.brandStrip} />

        {/* Encabezado */}
        <View style={pdfStyles.header}>
          <View style={pdfStyles.titleContainer}>
            <Text style={pdfStyles.reportTitle}>Reporte de Gestión</Text>
            <Text style={pdfStyles.reportSubtitle}>Sistema de Ayudas Sociales • {periodLabel}</Text>
          </View>
          <View style={pdfStyles.metaContainer}>
            <Text style={[pdfStyles.metaText, { fontWeight: 700 }]}>Fecha de Emisión</Text>
            <Text style={pdfStyles.metaText}>{format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}</Text>
          </View>
        </View>

        {/* Sección de Resumen (Cards) */}
        <View style={pdfStyles.summarySection}>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>TOTAL SOLICITUDES</Text>
            <Text style={[pdfStyles.summaryValue, { color: '#0F172A' }]}>{total}</Text>
          </View>
          <View style={[pdfStyles.summaryCard, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }]}>
            <Text style={[pdfStyles.summaryLabel, { color: '#0F766E' }]}>APROBADAS</Text>
            <Text style={[pdfStyles.summaryValue, { color: '#0F766E' }]}>{approved}</Text>
          </View>
          <View style={[pdfStyles.summaryCard, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
            <Text style={[pdfStyles.summaryLabel, { color: '#B45309' }]}>PENDIENTES</Text>
            <Text style={[pdfStyles.summaryValue, { color: '#B45309' }]}>{pending}</Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>TASA DE RESPUESTA</Text>
            <Text style={pdfStyles.summaryValue}>
              {total > 0 ? Math.round(((total - pending) / total) * 100) : 0}%
            </Text>
          </View>
        </View>

        {/* Tabla Detallada */}
        <View style={pdfStyles.tableContainer}>
          <View style={pdfStyles.tableHeader} fixed>
            <Text style={[pdfStyles.tableHeaderCell, { width: '25%' }]}>BENEFICIARIO</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: '30%' }]}>DESCRIPCIÓN</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>FECHA</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>ESTADO</Text>
            <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>PRIORIDAD</Text>
          </View>
          
          {fullRequests.map((req, i) => {
            const ben = req.adultoMayor || req.personaConDiscapacidad;
            const name = ben ? `${ben.nombre} ${ben.apellido}` : 'Sin nombre';
            const isEven = i % 2 === 0;

            return (
              <View key={i} style={[pdfStyles.tableRow, { backgroundColor: isEven ? '#FFFFFF' : '#F8FAFC' }]}>
                <Text style={[pdfStyles.tableCell, { width: '25%', fontWeight: 600 }]}>{name}</Text>
                <Text style={[pdfStyles.tableCell, { width: '30%', color: '#64748B' }]}>
                   {req.descripcion ? (req.descripcion.length > 45 ? req.descripcion.substring(0, 45) + '...' : req.descripcion) : 'S/D'}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: '15%' }]}>
                  {format(new Date(req.createdAt), 'dd/MM/yyyy')}
                </Text>
                <View style={{ width: '15%' }}>
                   <StatusBadgePDF status={req.estado} />
                </View>
                <Text style={[pdfStyles.tableCell, { width: '15%' }]}>{req.prioridad}</Text>
              </View>
            );
          })}
        </View>

        {/* Footer con paginación */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>Generado automáticamente por el Sistema de Gestión Valle Verde</Text>
          <Text style={pdfStyles.footerText} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};

// --- COMPONENTE PRINCIPAL ---

export default function ReportesPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros Dashboard
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Estados PDF Modal
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfPeriod, setPdfPeriod] = useState('1m');
  const [pdfData, setPdfData] = useState<ReportData | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Carga de datos inicial (Dashboard)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [data, trends] = await Promise.all([
          getReportData({ status: statusFilter, priority: priorityFilter }),
          getTrendData()
        ]);
        setReportData(data);
        setTrendData(trends);
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [statusFilter, priorityFilter]);

  // Carga de datos para PDF (Bajo demanda)
  useEffect(() => {
    if (isPdfModalOpen) {
      const fetchPdfData = async () => {
        setIsGeneratingPdf(true);
        const now = new Date();
        let startDate: Date | undefined;

        switch (pdfPeriod) {
          case '1w': startDate = subDays(now, 7); break;
          case '1m': startDate = subMonths(now, 1); break;
          case '2m': startDate = subMonths(now, 2); break;
          case '3m': startDate = subMonths(now, 3); break;
          case '6m': startDate = subMonths(now, 6); break;
          case '9m': startDate = subMonths(now, 9); break;
          case '1y': startDate = subMonths(now, 12); break;
          case 'all': startDate = undefined; break;
        }

        try {
          // Asegúrate de que tu función getReportData acepte { startDate, endDate }
          const data = await getReportData({ startDate, endDate: now });
          setPdfData(data);
        } catch (e) {
          console.error(e);
        } finally {
          setIsGeneratingPdf(false);
        }
      };
      fetchPdfData();
    }
  }, [pdfPeriod, isPdfModalOpen]);

  if (isLoading) return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-4"/><Skeleton className="h-96 w-full"/></div>;
  if (!reportData) return <div>No hay datos.</div>;

  const {
    totalRequests, requestsByStatus, requestsByPriority,
    recentRequests, beneficiariesByType,
    totalAdultosMayores, totalPersonasConDiscapacidad,
    pcdWithRepresentativeCount
  } = reportData;

  const memoizedStats = {
    approvalRate: totalRequests > 0 ? Math.round(((requestsByStatus?.find(s => s.status === 'Aprobada')?.count || 0) / totalRequests) * 100) : 0,
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* HEADER + BOTONES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900 tracking-tight">
            Panel de Métricas 📊
          </h1>
          <p className="text-slate-500 mt-1">Monitoreo integral y gestión de casos.</p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {/* Botón de Filtros (Dashboard) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 bg-white/60 backdrop-blur-sm border-slate-200 hover:bg-white/80">
                <Filter className="h-4 w-4" /> <span>Filtros Vista</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
               <Command>
                 <CommandInput placeholder="Filtrar por..." />
                 <CommandList>
                   <CommandEmpty>No encontrado.</CommandEmpty>
                   <CommandGroup heading="Estado">
                     {STATUS_OPTIONS.map(s => (
                       <CommandItem key={s} onSelect={() => setStatusFilter(statusFilter === s ? '' : s)}>
                         <Check className={`mr-2 h-4 w-4 ${statusFilter === s ? 'opacity-100' : 'opacity-0'}`} /> {s}
                       </CommandItem>
                     ))}
                   </CommandGroup>
                   <CommandSeparator />
                   <CommandGroup heading="Prioridad">
                     {PRIORITY_OPTIONS.map(p => (
                       <CommandItem key={p} onSelect={() => setPriorityFilter(priorityFilter === p ? '' : p)}>
                         <Check className={`mr-2 h-4 w-4 ${priorityFilter === p ? 'opacity-100' : 'opacity-0'}`} /> {p}
                       </CommandItem>
                     ))}
                   </CommandGroup>
                 </CommandList>
               </Command>
            </PopoverContent>
          </Popover>

          {/* Botón Modal PDF */}
          <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-300/50">
                <FileText className="h-4 w-4" /> <span>Generar Reporte PDF</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md backdrop-blur-xl bg-white/90">
              <DialogHeader>
                <DialogTitle>Exportar Reporte</DialogTitle>
                <DialogDescription>Selecciona el rango de tiempo para el reporte.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Periodo</label>
                  <Select value={pdfPeriod} onValueChange={setPdfPeriod}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1w">1 Semana</SelectItem>
                      <SelectItem value="1m">1 Mes</SelectItem>
                      <SelectItem value="2m">2 Meses</SelectItem>
                      <SelectItem value="3m">3 Meses</SelectItem>
                      <SelectItem value="6m">6 Meses</SelectItem>
                      <SelectItem value="9m">9 Meses</SelectItem>
                      <SelectItem value="1y">1 Año</SelectItem>
                      <SelectItem value="all">Histórico Completo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-lg flex justify-between text-sm text-blue-700">
                  <span>Registros encontrados:</span>
                  <span className="font-bold">{isGeneratingPdf ? '...' : pdfData?.fullRequests.length || 0}</span>
                </div>
              </div>
              <DialogFooter>
                {pdfData && !isGeneratingPdf ? (
                  <PDFDownloadLink 
                    document={<ReportePDF data={pdfData} periodLabel={pdfPeriod === 'all' ? 'Histórico' : `Últimos ${pdfPeriod}`} />} 
                    fileName={`Reporte_${pdfPeriod}_${format(new Date(), 'yyyyMMdd')}.pdf`}>
                    {({ loading }) => (
                      <Button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                        {loading ? 'Preparando...' : 'Descargar PDF'} <Download className="ml-2 h-4 w-4"/>
                      </Button>
                    )}
                  </PDFDownloadLink>
                ) : <Button disabled>Cargando datos...</Button>}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI GRID */}
      <KpiGrid 
        totalAdultosMayores={totalAdultosMayores}
        totalPersonasConDiscapacidad={totalPersonasConDiscapacidad}
        pcdWithRepresentativeCount={pcdWithRepresentativeCount}
        totalRequests={totalRequests}
        memoizedStats={memoizedStats}
      />

      {/* TENDENCIAS Y GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Área (Tendencias) */}
        <GlassCard className="col-span-1 lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Evolución de Casos</h3>
              <p className="text-sm text-slate-500">Nuevas solicitudes vs. Casos solucionados</p>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700"><Calendar className="w-3 h-3 mr-1"/> Tiempo Real</Badge>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'dd MMM', { locale: es })} stroke="#94a3b8" fontSize={12}/>
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="incoming" name="Nuevos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3}/>
                <Area type="monotone" dataKey="solved" name="Solucionados" stroke="#10b981" fillOpacity={1} fill="url(#colorOut)" strokeWidth={3}/>
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Gráfico Circular (Status) */}
        <GlassCard className="col-span-1 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Estado Actual</h3>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={requestsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {requestsByStatus.map((e: any) => <Cell key={e.status} fill={COLORS_STATUS[e.status]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Barras (Prioridad) */}
        <GlassCard className="col-span-1 lg:col-span-2 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Volumen por Prioridad</h3>
          <div className="h-[250px]">
             <ResponsiveContainer>
              <BarChart data={requestsByPriority}>
                <XAxis dataKey="priority" axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {requestsByPriority.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={getDynamicColor(entry.count)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        
        {/* Gráfico Circular (Tipos) */}
        <GlassCard className="col-span-1 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Población</h3>
          <div className="h-[250px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={beneficiariesByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={70}>
                   {beneficiariesByType.map((e: any, i: number) => <Cell key={e.type} fill={COLORS_BENEFICIARY_TYPE[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* TABLA DE DETALLES RECIENTES */}
      <GlassCard className="p-0">
        <div className="p-6 border-b border-gray-100/50 bg-white/40">
           <h3 className="text-lg font-bold text-slate-800">Solicitudes Recientes</h3>
        </div>
        <div className="p-6">
          {recentRequests.length > 0 ? (
            <div className="space-y-3">
              {recentRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${req.status === 'Aprobada' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                         {req.status === 'Aprobada' ? <CheckCircle className="h-5 w-5"/> : <Clock className="h-5 w-5"/>}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{req.description}</p>
                        <p className="text-xs text-slate-500">{req.beneficiaryName} • {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: es })}</p>
                      </div>
                  </div>
                  <Badge variant="outline">{req.priority}</Badge>
                </div>
              ))}
            </div>
          ) : <div className="text-center py-10 text-gray-400">No hay actividad reciente</div>}
        </div>
      </GlassCard>

    </div>
  );
}

// --- TUS COMPONENTES ORIGINALES ---

const KpiGrid = ({ totalAdultosMayores, totalPersonasConDiscapacidad, pcdWithRepresentativeCount, totalRequests, memoizedStats }: any) => {
  const totalBeneficiaries = totalAdultosMayores + totalPersonasConDiscapacidad || 1;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 my-6">
      <LiquidStatCard title="Adultos Mayores" value={totalAdultosMayores} totalForCalculation={totalBeneficiaries} icon={HeartHandshake} description="Registros activos" />
      <LiquidStatCard title="Discapacidad" value={totalPersonasConDiscapacidad} totalForCalculation={totalBeneficiaries} icon={Accessibility} description="Registros activos" />
      <LiquidStatCard title="Con Representante" value={pcdWithRepresentativeCount} totalForCalculation={totalPersonasConDiscapacidad > 0 ? totalPersonasConDiscapacidad : 1} icon={UserCheck} description="Cuentan con tutor" />
      <LiquidStatCard title="Total Solicitudes" value={totalRequests} totalForCalculation={100} icon={FileText} description="Histórico global" />
      <LiquidStatCard title="Tasa Aprobación" value={memoizedStats.approvalRate} totalForCalculation={100} icon={TrendingUp} description="Efectividad de gestión" />
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<string | number, string | number>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-200 rounded-lg shadow-xl text-xs">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}/>
            <span className="text-slate-600">{p.name}: </span>
            <span className="font-bold">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};