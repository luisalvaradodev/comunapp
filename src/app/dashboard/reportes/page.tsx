'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, FileText, TrendingUp, Download, Calendar,
  CheckCircle, XCircle, Package, Clock, Activity,
  Heart, Accessibility, FileCheck, Layers
} from 'lucide-react';
import { getReportData, getTrendData } from '@/lib/actions';
import { format, subDays, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, TooltipProps, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { useEffect, useState } from 'react';
import { PDFDownloadLink, Document, Page, StyleSheet, Text, View, Font } from '@react-pdf/renderer';

// --- CONFIGURACIÓN ESTÉTICA ---

const COLORS = {
  primary: '#3b82f6',     // Azul
  success: '#10b981',     // Verde Esmeralda
  warning: '#f59e0b',     // Ámbar
  danger: '#ef4444',      // Rojo
  purple: '#8b5cf6',      // Violeta
  glassBg: 'bg-white/40', // Fondo Glass
  glassBorder: 'border-white/50',
};

const COLORS_STATUS: Record<string, string> = {
  Aprobada: COLORS.success,
  Pendiente: COLORS.warning,
  Rechazada: COLORS.danger,
  Entregada: COLORS.primary,
};

// --- COMPONENTES AUXILIARES UI ---

// Tarjeta con diseño Glassmorphism
const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`backdrop-blur-md bg-white/60 border border-white/60 shadow-lg rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:bg-white/70 ${className}`}>
    {children}
  </div>
);

const GlassStatCard = ({ title, value, subtext, icon: Icon, colorClass, trend }: any) => (
  <GlassCard className="p-6 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500 ${colorClass}`}>
      <Icon size={80} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-current`}>
          <Icon size={20} className={colorClass.replace('bg-', 'text-')} />
        </div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-extrabold text-gray-800 tracking-tight">{value}</span>
      </div>
      <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1">
        {trend && <TrendingUp className="h-3 w-3 text-green-500" />}
        {subtext}
      </p>
    </div>
  </GlassCard>
);

const CustomTooltip = ({ active, payload, label }: TooltipProps<string | number, string | number>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md p-4 border border-white/50 rounded-xl shadow-xl ring-1 ring-black/5">
        <p className="font-bold text-gray-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}:</span>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- COMPONENTE PDF (Mejorado) ---

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGkyAZ9hjp-Ek-_EeA.ttf', fontWeight: 700 },
  ]
});

const pdfStyles = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9, padding: 30, backgroundColor: '#f8fafc', color: '#334155' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottom: 1, borderBottomColor: '#e2e8f0', paddingBottom: 10 },
  titleData: { flexDirection: 'column' },
  reportTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  reportSubtitle: { fontSize: 10, color: '#64748b', marginTop: 4 },
  periodBadge: { backgroundColor: '#dbeafe', color: '#1e40af', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, fontSize: 8, alignSelf: 'flex-start', marginTop: 5 },
  section: { marginBottom: 15, backgroundColor: '#ffffff', padding: 10, borderRadius: 4 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#0f172a', marginBottom: 8, textTransform: 'uppercase', borderBottom: 1, borderBottomColor: '#f1f5f9', paddingBottom: 4 },
  table: { width: '100%', borderWidth: 0 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 6, borderRadius: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  col1: { width: '20%', paddingLeft: 5 },
  col2: { width: '25%' },
  col3: { width: '30%' },
  col4: { width: '15%' },
  col5: { width: '10%', textAlign: 'center' },
  textBold: { fontWeight: 'bold' },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, fontSize: 7, textAlign: 'center', width: 60 },
});

const ReportePDF = ({ data, periodLabel }: { data: any, periodLabel: string }) => {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page} orientation="landscape">
        <View style={pdfStyles.header}>
          <View style={pdfStyles.titleData}>
            <Text style={pdfStyles.reportTitle}>Reporte de Gestión y Casos</Text>
            <Text style={pdfStyles.reportSubtitle}>Sistema de Atención Social</Text>
            <Text style={pdfStyles.periodBadge}>Periodo: {periodLabel}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 9, color: '#94a3b8' }}>Generado: {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
          </View>
        </View>

        {/* Resumen KPI */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#3b82f6' }}>
            <Text style={{ fontSize: 8, color: '#64748b' }}>Total Solicitudes en Periodo</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>{data.fullRequests.length}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#10b981' }}>
            <Text style={{ fontSize: 8, color: '#64748b' }}>Casos Aprobados</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>
              {data.fullRequests.filter((r:any) => r.estado === 'Aprobada').length}
            </Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Detalle de Solicitudes ({data.fullRequests.length} registros)</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.col1, pdfStyles.textBold]}>Beneficiario</Text>
              <Text style={[pdfStyles.col2, pdfStyles.textBold]}>Tipo Beneficiario</Text>
              <Text style={[pdfStyles.col3, pdfStyles.textBold]}>Descripción</Text>
              <Text style={[pdfStyles.col4, pdfStyles.textBold]}>Fecha</Text>
              <Text style={[pdfStyles.col5, pdfStyles.textBold]}>Estado</Text>
            </View>
            {data.fullRequests.map((req: any, i: number) => {
              const ben = req.adultoMayor || req.personaConDiscapacidad;
              const type = req.adultoMayor ? 'Adulto Mayor' : 'Persona c/ Discapacidad';
              const statusColor = req.estado === 'Aprobada' ? '#dcfce7' : req.estado === 'Rechazada' ? '#fee2e2' : '#fef9c3';
              const statusText = req.estado === 'Aprobada' ? '#166534' : req.estado === 'Rechazada' ? '#991b1b' : '#854d0e';

              return (
                <View key={i} style={pdfStyles.tableRow}>
                  <Text style={pdfStyles.col1}>{ben ? `${ben.nombre} ${ben.apellido}` : 'N/A'}</Text>
                  <Text style={pdfStyles.col2}>{type}</Text>
                  <Text style={pdfStyles.col3}>{req.descripcion.substring(0, 50)}...</Text>
                  <Text style={pdfStyles.col4}>{format(new Date(req.createdAt), 'dd/MM/yyyy')}</Text>
                  <View style={pdfStyles.col5}>
                     <View style={[pdfStyles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={{ color: statusText }}>{req.estado}</Text>
                     </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </Page>
    </Document>
  );
};

// --- LÓGICA PRINCIPAL ---

export default function ReportesPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para el PDF Modal
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfPeriod, setPdfPeriod] = useState('1m'); // 1w, 1m, 3m, 6m, 1y, all
  const [pdfData, setPdfData] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Carga inicial de datos del Dashboard (Vista general)
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [generalData, trends] = await Promise.all([
          getReportData(), // Sin filtros = histórico completo
          getTrendData()   // Datos para gráfico de área
        ]);
        setReportData(generalData);
        setTrendData(trends);
      } catch (e) {
        console.error("Error cargando dashboard:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();
  }, []);

  // Función para preparar datos del PDF bajo demanda
  const handlePreparePdf = async () => {
    setIsGeneratingPdf(true);
    const now = new Date();
    let startDate: Date | undefined = undefined;

    // Calcular fecha de inicio según selección
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
      // Traemos datos filtrados específicamente para el reporte
      const filteredData = await getReportData({ startDate, endDate: now });
      setPdfData(filteredData);
    } catch (error) {
      console.error("Error generando datos PDF", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Re-ejecutar preparación si cambia el periodo y el modal está abierto
  useEffect(() => {
    if (isPdfModalOpen) {
      handlePreparePdf();
    }
  }, [pdfPeriod, isPdfModalOpen]);

  if (isLoading || !reportData) return <div className="p-10 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;

  // Calculos para tarjetas
  const { totalRequests, requestsByStatus, fullRequests, totalBeneficiaries } = reportData;
  const approved = requestsByStatus.find((s:any) => s.status === 'Aprobada')?.count || 0;
  const delivered = requestsByStatus.find((s:any) => s.status === 'Entregada')?.count || 0;
  const solvedTotal = approved + delivered;
  const efficiencyRate = totalRequests > 0 ? Math.round((solvedTotal / totalRequests) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 space-y-8 font-sans text-slate-800">
      
      {/* 1. Header con Glassmorphism y botón PDF */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Panel de Control
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Monitoreo en tiempo real de gestión social</p>
        </div>
        
        <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-300/50 transition-all hover:scale-105">
              <FileText className="mr-2 h-4 w-4" /> Generar Reporte PDF
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-white/20">
            <DialogHeader>
              <DialogTitle>Exportar Reporte de Gestión</DialogTitle>
              <DialogDescription>
                Selecciona el periodo de tiempo para filtrar los datos del reporte.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-slate-700">Periodo de Análisis</label>
                <Select value={pdfPeriod} onValueChange={setPdfPeriod}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1w">Última semana (7 días)</SelectItem>
                    <SelectItem value="1m">Último mes</SelectItem>
                    <SelectItem value="2m">Últimos 2 meses</SelectItem>
                    <SelectItem value="3m">Últimos 3 meses</SelectItem>
                    <SelectItem value="6m">Últimos 6 meses</SelectItem>
                    <SelectItem value="9m">Últimos 9 meses</SelectItem>
                    <SelectItem value="1y">Último año</SelectItem>
                    <SelectItem value="all">Histórico completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Previsualización rápida de datos */}
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 flex justify-between items-center">
                <span>Registros encontrados para el periodo:</span>
                <span className="font-bold">{isGeneratingPdf ? 'Calculando...' : pdfData?.fullRequests?.length || 0}</span>
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" onClick={() => setIsPdfModalOpen(false)}>Cancelar</Button>
              {pdfData && !isGeneratingPdf ? (
                <PDFDownloadLink
                  document={<ReportePDF data={pdfData} periodLabel={pdfPeriod === 'all' ? 'Histórico' : `Último(s) ${pdfPeriod}`} />}
                  fileName={`Reporte_Gestion_${pdfPeriod}_${format(new Date(), 'yyyyMMdd')}.pdf`}
                >
                  {({ loading }) => (
                    <Button disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                      {loading ? 'Preparando...' : 'Descargar PDF'} <Download className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </PDFDownloadLink>
              ) : (
                <Button disabled>Cargando datos...</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 2. Grid de KPIs (Tarjetas Liquid/Glass) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassStatCard 
          title="Total Solicitudes" 
          value={totalRequests} 
          subtext="Registros totales" 
          icon={Layers} 
          colorClass="text-blue-600 bg-blue-600"
        />
        <GlassStatCard 
          title="Beneficiarios" 
          value={totalBeneficiaries} 
          subtext="Población atendida" 
          icon={Users} 
          colorClass="text-indigo-600 bg-indigo-600" 
        />
        <GlassStatCard 
          title="Casos Resueltos" 
          value={solvedTotal} 
          subtext="Aprobados + Entregados" 
          icon={CheckCircle} 
          colorClass="text-green-600 bg-green-600"
          trend 
        />
        <GlassStatCard 
          title="Efectividad" 
          value={`${efficiencyRate}%`} 
          subtext="Tasa de resolución global" 
          icon={Activity} 
          colorClass="text-purple-600 bg-purple-600" 
        />
      </div>

      {/* 3. Sección de Gráfico de Tendencias (Lo que pediste explícitamente) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="col-span-1 lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Dinámica de Gestión</h3>
              <p className="text-sm text-slate-500">Comparativa: Solicitudes Recibidas vs. Solucionadas</p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <TrendingUp className="w-3 h-3 mr-1" /> Tiempo Real
            </Badge>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => format(new Date(str), 'dd MMM', { locale: es })} 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickMargin={10}
                />
                <YAxis stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area 
                  type="monotone" 
                  dataKey="incoming" 
                  name="Solicitudes Nuevas" 
                  stroke={COLORS.primary} 
                  fillOpacity={1} 
                  fill="url(#colorIncoming)" 
                  strokeWidth={3}
                />
                <Area 
                  type="monotone" 
                  dataKey="solved" 
                  name="Casos Solucionados" 
                  stroke={COLORS.success} 
                  fillOpacity={1} 
                  fill="url(#colorSolved)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Gráfico Circular de Estado */}
        <GlassCard className="col-span-1 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Distribución Actual</h3>
          <p className="text-sm text-slate-500 mb-6">Estado del inventario de casos</p>
          <div className="h-[300px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={requestsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {requestsByStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_STATUS[entry.status] || '#cbd5e1'} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
            {/* Texto Central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-slate-700">{totalRequests}</span>
              <span className="text-xs text-slate-400 font-medium uppercase">Total</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 4. Tabla Glassmorphism (Lista Reciente) */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100/50 bg-white/40">
           <h3 className="text-lg font-bold text-slate-800">Actividad Reciente</h3>
           <p className="text-sm text-slate-500">Últimos movimientos registrados en el sistema</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-3">Beneficiario</th>
                <th className="px-6 py-3">Solicitud</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {reportData.recentRequests.map((req: any) => (
                <tr key={req.id} className="border-b border-gray-100 hover:bg-white/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{req.beneficiaryName}</td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{req.description}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`${req.status === 'Aprobada' ? 'bg-green-50 text-green-700 border-green-200' : req.status === 'Pendiente' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-700'}`}>
                      {req.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {format(new Date(req.createdAt), 'dd MMM yyyy', { locale: es })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}