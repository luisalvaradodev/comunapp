'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Función para determinar el color según la cantidad (Degradado lógico)
const getColorByValue = (value: number) => {
  if (value <= 4) return '#22c55e'; // Verde
  if (value <= 10) return '#3b82f6'; // Azul
  return '#ef4444'; // Rojo
};

export function DynamicStatChart({ title, data, dataKey = 'count' }: { title: string, data: any[], dataKey?: string }) {
  // Calculamos la tendencia para mostrar un icono
  const lastValue = data[data.length - 1]?.[dataKey] || 0;
  const prevValue = data[data.length - 2]?.[dataKey] || 0;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
           <CardTitle className="text-lg">{title}</CardTitle>
           {lastValue > prevValue ? <TrendingUp className="text-red-500" /> : lastValue < prevValue ? <TrendingDown className="text-green-500" /> : <Minus className="text-gray-400"/>}
        </div>
        <CardDescription>Visualización dinámica por volumen de casos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColorByValue(entry[dataKey])} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-4 text-xs">
           <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Bajo (0-4)</div>
           <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Medio (5-10)</div>
           <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Alto (+10)</div>
        </div>
      </CardContent>
    </Card>
  );
}