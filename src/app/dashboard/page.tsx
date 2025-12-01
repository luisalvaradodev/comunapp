// app/dashboard/page.tsx
'use server';

// Importaciones de React y Next.js
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Importaciones de Autenticación y Base de Datos
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  adultosMayores,
  personasConDiscapacidad,
  representantes,
  solicitudes,
  usuarios,
} from '@/lib/db/schema';
import { count, eq, desc, sql } from 'drizzle-orm';
import { getTimeBasedStats } from '@/lib/actions'; // Nueva importación

// Importaciones de Componentes UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Importaciones de Iconos
import {
  FileText, Clock, CheckCircle, XCircle, PackageCheck, PlusCircle, FilePlus, BarChart3,
  PersonStanding, Accessibility, Contact, Inbox, PieChart, Star,
  Users,
} from 'lucide-react';

// Importaciones de Gráficos
import { RequestsStatusChart } from '@/components/dashboard/requests-status-chart';
import { RequestPriorityChart } from '@/components/dashboard/request-priority-chart';
import { DynamicStatChart } from '@/components/dynamic-stats'; // Nueva importación

// --- CONFIGURACIÓN Y TIPOS ---

const statusConfig = {
  Pendiente: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100', badgeColor: 'bg-yellow-500 hover:bg-yellow-600' },
  Aprobada: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', badgeColor: 'bg-green-500 hover:bg-green-600' },
  Rechazada: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', badgeColor: 'bg-red-500 hover:bg-red-600' },
  Entregada: { icon: PackageCheck, color: 'text-blue-600', bgColor: 'bg-blue-100', badgeColor: 'bg-blue-500 hover:bg-blue-600' },
};

type RecentRequest = {
  id: number;
  estado: string;
  createdAt: Date;
  beneficiaryName: string | null;
};

type RecentBeneficiary = {
  id: number;
  nombre: string;
  apellido: string;
  createdAt: Date | null;
  type: 'Adulto Mayor' | 'Persona con Discapacidad';
};

// --- COMPONENTES DE CARGA (SKELETONS) ---

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  );
}

function ListCardSkeleton({ rows = 5 }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// --- COMPONENTES DE ESTADO VACÍO (EMPTY STATES) ---

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted-foreground/10">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// --- COMPONENTES DE DATOS (TARJETAS, LISTAS, ETC.) ---

async function OverviewStats() {
  const [
    adultosMayoresCount,
    personasDiscapacidadCount,
    representantesCount,
    pendingRequestsCount,
  ] = await Promise.all([
    db.select({ value: count() }).from(adultosMayores),
    db.select({ value: count() }).from(personasConDiscapacidad),
    db.select({ value: count() }).from(representantes),
    db.select({ value: count() }).from(solicitudes).where(eq(solicitudes.estado, 'Pendiente')),
  ]);

  const stats = [
    { title: "Adultos Mayores", value: adultosMayoresCount[0]?.value || 0, icon: PersonStanding, description: "Total de adultos mayores registrados.", color: "sky" },
    { title: "Personas con Discapacidad", value: personasDiscapacidadCount[0]?.value || 0, icon: Accessibility, description: "Total de PCD registradas.", color: "violet" },
    { title: "Representantes", value: representantesCount[0]?.value || 0, icon: Contact, description: "Total de representantes registrados.", color: "emerald" },
    { title: "Solicitudes Pendientes", value: pendingRequestsCount[0]?.value || 0, icon: Clock, description: "Esperando revisión y aprobación.", color: "yellow", actionLink: "/dashboard/solicitudes?status=Pendiente", actionText: "Revisar ahora" },
  ];

  return (
    <>
      {stats.map(s => (
        <Card key={s.title} className="hover:shadow-lg transition-shadow duration-300 group">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                <div className="text-3xl font-bold">{s.value}</div>
              </div>
              <div className={`p-3 rounded-lg bg-${s.color}-100`}>
                <s.icon className={`h-6 w-6 text-${s.color}-600`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{s.description}</p>
            {s.actionLink && (
              <Link href={s.actionLink} className="text-xs font-semibold text-primary hover:underline mt-2 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                {s.actionText} →
              </Link>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function RecentRequestItem({ req }: { req: RecentRequest }) {
  const config = statusConfig[req.estado as keyof typeof statusConfig] || { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100', badgeColor: 'bg-gray-500' };
  return (
    <li className="flex items-center py-4 px-2 space-x-4 hover:bg-muted/50 rounded-lg transition-colors">
      <div className={`p-2 rounded-full ${config.bgColor}`}>
        <config.icon className={`h-5 w-5 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{req.beneficiaryName || 'Beneficiario no encontrado'}</p>
        <p className="text-sm text-muted-foreground truncate">Creado: {new Date(req.createdAt).toLocaleDateString('es-VE')}</p>
      </div>
      <div className='flex items-center gap-2'>
        <Badge className={`${config.badgeColor} text-white`}>{req.estado}</Badge>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/solicitudes/${req.id}`}>Ver</Link>
        </Button>
      </div>
    </li>
  );
}

async function RecentRequestsList() {
  const recentRequests: RecentRequest[] = await db.select({
    id: solicitudes.id,
    estado: solicitudes.estado,
    createdAt: solicitudes.createdAt,
    beneficiaryName: sql<string>`COALESCE(${adultosMayores.nombre} || ' ' || ${adultosMayores.apellido}, ${personasConDiscapacidad.nombre} || ' ' || ${personasConDiscapacidad.apellido})`,
  })
    .from(solicitudes)
    .leftJoin(adultosMayores, eq(solicitudes.adultoMayorId, adultosMayores.id))
    .leftJoin(personasConDiscapacidad, eq(solicitudes.personaConDiscapacidadId, personasConDiscapacidad.id))
    .orderBy(desc(solicitudes.createdAt))
    .limit(5);

  if (recentRequests.length === 0) {
    return <EmptyState icon={Inbox} title="No hay solicitudes recientes" description="Cuando se cree una nueva solicitud, aparecerá aquí." />;
  }

  return (
    <ul role="list" className="divide-y divide-border">
      {recentRequests.map(req => <RecentRequestItem key={req.id} req={req} />)}
    </ul>
  );
}

function RecentBeneficiaryItem({ beneficiary }: { beneficiary: RecentBeneficiary }) {
  const initials = `${beneficiary.nombre[0] || ''}${beneficiary.apellido[0] || ''}`.toUpperCase();
  const isElder = beneficiary.type === 'Adulto Mayor';

  return (
    <li className="flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarFallback className={isElder ? 'bg-sky-100 text-sky-600' : 'bg-violet-100 text-violet-600'}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-foreground">{beneficiary.nombre} {beneficiary.apellido}</p>
          <p className="text-xs text-muted-foreground">Registrado: {beneficiary.createdAt ? new Date(beneficiary.createdAt).toLocaleDateString('es-VE') : 'N/A'}</p>
        </div>
      </div>
      <Badge variant={isElder ? 'default' : 'secondary'} className={isElder ? 'bg-sky-500' : 'bg-violet-500'}>{beneficiary.type}</Badge>
    </li>
  );
}

async function RecentBeneficiariesList() {
  const recentAdultosMayores = await db.select().from(adultosMayores).orderBy(desc(adultosMayores.createdAt)).limit(3);
  const recentPersonasDiscapacidad = await db.select().from(personasConDiscapacidad).orderBy(desc(personasConDiscapacidad.createdAt)).limit(3);

  const recentBeneficiaries: RecentBeneficiary[] = [
    ...recentAdultosMayores.map(p => ({ ...p, type: 'Adulto Mayor' as const })),
    ...recentPersonasDiscapacidad.map(p => ({ ...p, type: 'Persona con Discapacidad' as const })),
  ].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 5);

  if (recentBeneficiaries.length === 0) {
    return <EmptyState icon={Users} title="No hay beneficiarios registrados" description="Comienza registrando un adulto mayor o una persona con discapacidad." />;
  }

  return (
    <ul role="list" className="divide-y divide-border">
      {recentBeneficiaries.map(b => <RecentBeneficiaryItem key={`${b.type}-${b.id}`} beneficiary={b} />)}
    </ul>
  );
}

async function AnalyticsCharts() {
  const [statusCounts, priorityCounts, totalRequests] = await Promise.all([
    db.select({ estado: solicitudes.estado, count: count() }).from(solicitudes).groupBy(solicitudes.estado),
    db.select({ prioridad: solicitudes.prioridad, count: count() }).from(solicitudes).groupBy(solicitudes.prioridad),
    db.select({ count: count() }).from(solicitudes)
  ]);

  const getCount = (arr: any[], key: string, field: 'estado' | 'prioridad') => arr.find(item => item[field] === key)?.count || 0;

  const requestStatusChartData = [
    { name: 'Pendiente', value: getCount(statusCounts, 'Pendiente', 'estado'), fill: 'var(--color-pending)' },
    { name: 'Aprobada', value: getCount(statusCounts, 'Aprobada', 'estado'), fill: 'var(--color-approved)' },
    { name: 'Rechazada', value: getCount(statusCounts, 'Rechazada', 'estado'), fill: 'var(--color-rejected)' },
    { name: 'Entregada', value: getCount(statusCounts, 'Entregada', 'estado'), fill: 'var(--color-delivered)' },
  ].filter(item => item.value > 0);

  const requestPriorityStats = [
    { name: 'Alta', value: getCount(priorityCounts, 'Alta', 'prioridad'), fill: 'var(--color-priority-high)' },
    { name: 'Media', value: getCount(priorityCounts, 'Media', 'prioridad'), fill: 'var(--color-priority-medium)' },
    { name: 'Baja', value: getCount(priorityCounts, 'Baja', 'prioridad'), fill: 'var(--color-priority-low)' },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <Tabs defaultValue="status">
        <CardHeader>
          <CardTitle>Analíticas de Solicitudes</CardTitle>
          <div className="flex justify-between items-end">
            <CardDescription>Distribución visual de las solicitudes.</CardDescription>
            <TabsList>
              <TabsTrigger value="status">Por Estado</TabsTrigger>
              <TabsTrigger value="priority">Por Prioridad</TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent>
          <TabsContent value="status">
            {requestStatusChartData.length > 0 ? (
              <RequestsStatusChart data={requestStatusChartData} totalRequests={totalRequests[0]?.count || 0} />
            ) : (
              <EmptyState icon={PieChart} title="Sin datos de estado" description="No hay solicitudes para analizar por estado." />
            )}
          </TabsContent>
          <TabsContent value="priority">
            {requestPriorityStats.length > 0 ? (
              <RequestPriorityChart data={requestPriorityStats} />
            ) : (
              <EmptyState icon={Star} title="Sin datos de prioridad" description="No hay solicitudes para analizar por prioridad." />
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Ejecutamos consultas en paralelo para mejorar rendimiento
  const [currentUser, timeStats] = await Promise.all([
    db.query.usuarios.findFirst({
      where: eq(usuarios.id, session.user.id),
      with: { consejoComunal: true },
    }),
    getTimeBasedStats() // Obtenemos las nuevas estadísticas temporales
  ]);

  const userData = {
    nombreUsuario: currentUser?.nombreUsuario || 'Usuario',
    consejoComunalNombre: currentUser?.consejoComunal?.nombre || 'Mi Consejo Comunal',
  };

  // Preparar datos para las gráficas nuevas
  const addedVsSolvedData = [
    { name: 'Hace 2 Meses', agregados: timeStats.twoMonths.added, solucionados: timeStats.twoMonths.solved },
    { name: 'Hace 1 Mes', agregados: timeStats.month.added, solucionados: timeStats.month.solved },
    { name: 'Esta Semana', agregados: timeStats.week.added, solucionados: timeStats.week.solved },
  ];

  // Calcular "Pacientes Activos" (Pendientes) para la gráfica de semáforo
  const activeCasesData = addedVsSolvedData.map(d => ({
    name: d.name,
    activos: Math.max(0, d.agregados - d.solucionados)
  }));

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 lg:p-8 bg-muted/20 min-h-screen">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard del {userData.consejoComunalNombre}</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido de nuevo, {userData.nombreUsuario} 👋. Aquí tienes el resumen del sistema.
        </p>
      </header>

      <main className="flex flex-col gap-8">
        
        {/* Sección 1: Estadísticas Generales (Contadores) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Suspense fallback={<><StatsCardSkeleton /><StatsCardSkeleton /><StatsCardSkeleton /><StatsCardSkeleton /></>}>
            <OverviewStats />
          </Suspense>
        </section>

        {/* Sección 2: Estadísticas Temporales (Tarjetas de Semana/Mes) - NUEVO */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Última Semana</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm">
                <span>Nuevos: <span className="font-bold">{timeStats.week.added}</span></span>
                <span className="text-green-600">Solucionados: <span className="font-bold">{timeStats.week.solved}</span></span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Último Mes</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm">
                <span>Nuevos: <span className="font-bold">{timeStats.month.added}</span></span>
                <span className="text-green-600">Solucionados: <span className="font-bold">{timeStats.month.solved}</span></span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Últimos 2 Meses</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm">
                <span>Nuevos: <span className="font-bold">{timeStats.twoMonths.added}</span></span>
                <span className="text-green-600">Solucionados: <span className="font-bold">{timeStats.twoMonths.solved}</span></span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Sección 3: Gráficas Degradables Dinámicas - NUEVO */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <DynamicStatChart 
              title="Carga de Pacientes Activos" 
              data={activeCasesData} 
              dataKey="activos" 
           />
           <DynamicStatChart 
              title="Nuevos Casos Registrados" 
              data={addedVsSolvedData} 
              dataKey="agregados" 
           />
        </section>

        {/* Sección 4: Listas Detalladas y Acciones */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 flex flex-col gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes Recientes</CardTitle>
                <CardDescription>Las últimas 5 solicitudes creadas en el sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ListCardSkeleton rows={5} />}>
                  <RecentRequestsList />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Últimos Beneficiarios Registrados</CardTitle>
                <CardDescription>Los beneficiarios más recientes añadidos al sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ListCardSkeleton rows={5} />}>
                  <RecentBeneficiariesList />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8 lg:sticky lg:top-8">
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>Funciones principales del sistema.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <Button asChild>
                  <Link href="/dashboard/registros/nuevo" className="flex items-center justify-center">
                    <PlusCircle className="mr-2 h-4 w-4" /> Registrar Beneficiario
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/dashboard/solicitudes/nueva" className="flex items-center justify-center">
                    <FilePlus className="mr-2 h-4 w-4" /> Crear Solicitud
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/reportes" className="flex items-center justify-center">
                    <BarChart3 className="mr-2 h-4 w-4" /> Ver Reportes
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Suspense fallback={<ListCardSkeleton rows={3} />}>
              <AnalyticsCharts />
            </Suspense>
          </div>
        </section>
      </main>
    </div>
  );
}