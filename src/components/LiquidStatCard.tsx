'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LiquidStatCardProps {
  title: string;
  value: number;
  totalForCalculation?: number; // Opcional: para calcular porcentaje relativo
  icon: LucideIcon;
  description?: string;
}

// Definición de los esquemas de color (Gradientes vibrantes)
const colorSchemes = {
  low: { // Verde
    gradientBg: 'from-emerald-400/30 to-teal-500/30',
    liquidGradient: 'bg-gradient-to-t from-emerald-500 to-teal-400',
    textColor: 'text-emerald-800',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-200/50',
    shadow: 'shadow-emerald-100'
  },
  mid: { // Azul
    gradientBg: 'from-blue-400/30 to-cyan-500/30',
    liquidGradient: 'bg-gradient-to-t from-blue-600 to-cyan-400',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200/50',
    shadow: 'shadow-blue-100'
  },
  high: { // Rojo/Naranja
    gradientBg: 'from-orange-400/30 to-red-500/30',
    liquidGradient: 'bg-gradient-to-t from-orange-500 to-red-500',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200/50',
    shadow: 'shadow-red-100'
  }
};

const getColorScheme = (value: number) => {
  if (value <= 4) return colorSchemes.low;
  if (value <= 10) return colorSchemes.mid;
  return colorSchemes.high;
};

export const LiquidStatCard = ({
  title,
  value,
  totalForCalculation = 20, // Un valor por defecto para referencia si no se provee
  icon: Icon,
  description
}: LiquidStatCardProps) => {
  const scheme = getColorScheme(value);

  // Cálculo del porcentaje de llenado (tope 100%)
  // Usamos un mínimo del 15% para que siempre se vea algo de líquido si hay valor > 0
  const percentage = value === 0 ? 0 : Math.max(15, Math.min(100, (value / totalForCalculation) * 100));

  return (
    <Card className={cn(
        "relative overflow-hidden border-2 shadow-lg transition-all duration-300 hover:-translate-y-1 h-48",
        scheme.borderColor, scheme.shadow
      )}>
      
      {/* 1. Fondo Sutil Estático */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40 z-0", scheme.gradientBg)} />

      {/* 2. Contenedor del Líquido Animado */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-1000 ease-in-out"
        initial={{ height: '0%' }}
        animate={{ height: `${percentage}%` }}
        style={{ 
            // Pequeño ajuste para que las olas no se corten abruptamente arriba
            boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.1)' 
        }}
      >
        {/* El cuerpo del líquido con gradiente vibrante */}
        <div className={cn("absolute inset-0 opacity-90", scheme.liquidGradient)} />
        
        {/* Las Olas SVG animadas (definidas en globals.css) */}
        <div className="liquid-wave wave-back" />
        <div className="liquid-wave wave-front" />
      </motion.div>

      {/* 3. Contenido de la Tarjeta (Texto e Icono) */}
      <CardContent className="relative z-20 h-full flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
          <h3 className={cn("font-bold text-lg", scheme.textColor)}>{title}</h3>
          <div className={cn("p-2 rounded-full bg-white/50 backdrop-blur-md shadow-sm", scheme.iconColor)}>
             <Icon className="h-6 w-6" />
          </div>
        </div>
        
        <div className="mt-4">
            {/* Usamos mix-blend-mode para que el texto cambie de color al ser "cubierto" por el líquido, 
                o simplemente usamos texto blanco con sombra para garantizar contraste */}
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn("text-5xl font-extrabold drop-shadow-sm tracking-tight transition-colors duration-500", 
                    // Si el porcentaje es alto, el texto debe ser blanco para contrastar con el líquido oscuro
                    percentage > 50 ? 'text-white' : scheme.textColor
                )}
            >
                {value}
            </motion.div>
            {description && (
              <p className={cn("text-sm font-medium mt-1 opacity-80", percentage > 50 ? 'text-white' : scheme.textColor)}>
                {description}
              </p>
            )}
        </div>
      </CardContent>
    </Card>
  );
};