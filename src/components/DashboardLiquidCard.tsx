'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DashboardLiquidCardProps {
  title: string;
  value: number;
  // Icono recibido como Elemento JSX (<Icon />) para evitar error de server component
  icon: React.ReactNode; 
  description?: string;
  totalForCalculation?: number; // Para calcular qué tan lleno está el tanque
}

// Configuración de colores estilo "Semáforo"
// Verde: Pocos (<5) | Azul: Medio (5-10) | Rojo: Muchos (>10)
const THEMES = {
  green: {
    gradient: "from-emerald-500 via-teal-400 to-green-300",
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-600",
    shadow: "shadow-emerald-200/50"
  },
  blue: {
    gradient: "from-blue-600 via-cyan-400 to-sky-300",
    bg: "bg-blue-50",
    text: "text-blue-900",
    border: "border-blue-200",
    iconBg: "bg-blue-100 text-blue-600",
    shadow: "shadow-blue-200/50"
  },
  red: {
    gradient: "from-red-600 via-orange-400 to-amber-300",
    bg: "bg-red-50",
    text: "text-red-900",
    border: "border-red-200",
    iconBg: "bg-red-100 text-red-600",
    shadow: "shadow-red-200/50"
  }
};

const getTheme = (value: number) => {
  if (value <= 4) return THEMES.green;
  if (value <= 10) return THEMES.blue;
  return THEMES.red;
};

export const DashboardLiquidCard = ({
  title,
  value,
  icon,
  description,
  totalForCalculation = 20 // Valor referencia para "tanque lleno"
}: DashboardLiquidCardProps) => {
  
  const theme = getTheme(value);
  
  // Calculamos porcentaje (mínimo 15% para que se vea el agua, máximo 100%)
  const rawPercent = (value / totalForCalculation) * 100;
  const percent = Math.min(100, Math.max(15, rawPercent));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative w-full h-64 overflow-hidden rounded-3xl border bg-white shadow-xl transition-all hover:scale-[1.02]",
        theme.border,
        theme.shadow
      )}
    >
      {/* --- FONDO ESTRUCTURAL --- */}
      <div className={cn("absolute inset-0 opacity-20", theme.bg)} />

      {/* --- LÍQUIDO ANIMADO --- */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 w-full z-0"
        initial={{ height: "0%" }}
        animate={{ height: `${percent}%` }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        {/* Cuerpo del líquido (Gradiente) */}
        <div className={cn("w-full h-full bg-gradient-to-t opacity-90", theme.gradient)} />
        
        {/* Olas CSS */}
        <div className="liquid-wave wave-back" style={{ bottom: '95%' }} />
        <div className="liquid-wave wave-front" style={{ bottom: '95%' }} />
      </motion.div>

      {/* --- CONTENIDO (Por encima del líquido) --- */}
      <div className="relative z-10 flex flex-col justify-between h-full p-6">
        
        {/* Header: Título e Icono */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className={cn("text-lg font-semibold tracking-wide mix-blend-darken", theme.text)}>
              {title}
            </h3>
            {description && (
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1 bg-white/60 w-fit px-2 py-0.5 rounded-full backdrop-blur-sm">
                {description}
              </span>
            )}
          </div>
          
          <div className={cn("p-3 rounded-2xl shadow-sm backdrop-blur-md bg-white/80", theme.text)}>
            {icon}
          </div>
        </div>

        {/* Footer: Valor Grande */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
             {/* Texto del valor con sombra y transición de color para contraste */}
             <motion.span 
               className={cn(
                 "text-7xl font-black tracking-tighter drop-shadow-sm transition-colors duration-700",
                 // Si el agua sube mucho (>50%), el texto se vuelve blanco para leerse mejor
                 percent > 55 ? "text-white" : theme.text
               )}
               initial={{ scale: 0.5, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ delay: 0.2, type: "spring" }}
             >
               {value}
             </motion.span>
             <span className={cn(
               "text-sm font-bold ml-1 opacity-80",
               percent > 55 ? "text-white" : "text-slate-600"
             )}>
               Registros Totales
             </span>
          </div>
        </div>
      </div>

      {/* Brillo estilo cristal en la esquina superior */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
    </motion.div>
  );
};