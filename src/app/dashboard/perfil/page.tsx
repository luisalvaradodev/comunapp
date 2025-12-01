'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Lock, Save, CheckCircle, AlertCircle, Key, Shield, MapPin, ShieldQuestion } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { updateUserProfile, updateSecuritySettings } from '@/lib/actions'; // <--- IMPORTA LA NUEVA ACCIÓN
import { motion, AnimatePresence } from 'framer-motion';

// --- ESQUEMAS DE VALIDACIÓN ---

// 1. Cambio de Contraseña
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las nuevas contraseñas no coinciden',
  path: ['confirmPassword'],
});

// 2. Preguntas de Seguridad (NUEVO)
const securitySchema = z.object({
  currentPasswordSecurity: z.string().min(1, 'Requerida para confirmar cambios'),
  question: z.string().min(1, 'Selecciona una pregunta'),
  answer: z.string().min(2, 'La respuesta es muy corta'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type SecurityFormData = z.infer<typeof securitySchema>;

const Divider = () => <hr className="my-10 border-gray-200" />;

// Preguntas predefinidas
const SECURITY_QUESTIONS = [
  "¿Cuál es el nombre de tu primera mascota?",
  "¿En qué ciudad naciste?",
  "¿Cuál es el nombre de tu abuela materna?",
  "¿Cuál fue tu primer vehículo?",
  "¿Cuál es tu comida favorita?",
  "¿Cómo se llamaba tu escuela primaria?"
];

export default function PerfilPage() {
  const { data: session, status } = useSession();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- FORMS ---
  
  // Formulario Password
  const { 
    register: registerPass, 
    handleSubmit: handleSubmitPass, 
    formState: { errors: errorsPass, isSubmitting: isSubmittingPass }, 
    reset: resetPass 
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });

  // Formulario Seguridad
  const { 
    register: registerSec, 
    handleSubmit: handleSubmitSec, 
    formState: { errors: errorsSec, isSubmitting: isSubmittingSec }, 
    setValue: setValueSec,
    reset: resetSec 
  } = useForm<SecurityFormData>({ resolver: zodResolver(securitySchema) });

  // Cargar detalles
  useEffect(() => {
    const loadUserDetails = async () => {
      if (session?.user?.id) {
        try {
          // Aquí simulamos datos, en producción vendrían de una action o API
          setUserDetails({
            nombreUsuario: session.user.name,
            rol: session.user.role || 'Admin',
            consejoComunal: 'Valle Verde I',
          });
        } catch (error) {
          console.error('Error loading user details:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    if (status !== 'loading') loadUserDetails();
  }, [session, status]);

  // Handler: Cambiar Contraseña
  const onSubmitPassword = async (data: PasswordFormData) => {
    setSuccessMessage(null); setErrorMessage(null);
    const formData = new FormData();
    formData.append('currentPassword', data.currentPassword);
    formData.append('newPassword', data.newPassword);
    formData.append('confirmPassword', data.confirmPassword);

    try {
      await updateUserProfile(formData);
      setSuccessMessage('¡Contraseña actualizada exitosamente!');
      resetPass();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al actualizar');
    }
  };

  // Handler: Actualizar Preguntas de Seguridad
  const onSubmitSecurity = async (data: SecurityFormData) => {
    setSuccessMessage(null); setErrorMessage(null);
    const formData = new FormData();
    formData.append('currentPassword', data.currentPasswordSecurity);
    formData.append('question', data.question);
    formData.append('answer', data.answer);

    try {
      const res = await updateSecuritySettings(formData);
      if(res.success) {
          setSuccessMessage(res.message);
          resetSec();
          setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al actualizar seguridad');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Helpers visuales
  const getRoleDisplayName = (role: string) => role === 'Admin' ? 'Administrador' : role;
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-10"
    >
      <div className="max-w-4xl mx-auto">
        
        {/* --- Header --- */}
        <div className="flex items-center gap-4 mb-10">
          <Avatar className="h-16 w-16">
            <AvatarImage src={session?.user?.image || ''} />
            <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
              {session?.user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hola, {session?.user?.name || 'Usuario'}!</h1>
            <p className="text-gray-500 capitalize">{formattedDate}</p>
          </div>
        </div>

        {/* --- Mensajes Globales --- */}
        <AnimatePresence>
            {(successMessage || errorMessage) && (
            <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
            >
                <div className={`flex items-center gap-3 p-4 border-l-4 rounded-md ${successMessage ? 'bg-green-50 text-green-800 border-green-400' : 'bg-red-50 text-red-800 border-red-400'}`}>
                {successMessage ? <CheckCircle className="h-5 w-5"/> : <AlertCircle className="h-5 w-5"/>}
                <p className="font-medium text-sm">{successMessage || errorMessage}</p>
                </div>
            </motion.div>
            )}
        </AnimatePresence>

        {/* --- 1. Información de la Cuenta --- */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <User className="text-blue-500" /> Información de la Cuenta
          </h2>
          <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <Label className="w-full sm:w-1/3 text-gray-500 font-medium">Nombre de Usuario</Label>
              <p className="flex-1 mt-1 sm:mt-0 p-3 bg-gray-100 rounded-md text-gray-800 font-medium">
                {userDetails?.nombreUsuario || session?.user?.name}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <Label className="w-full sm:w-1/3 text-gray-500 font-medium">Rol Asignado</Label>
              <div className="flex-1 mt-1 sm:mt-0 p-3 bg-gray-100 rounded-md flex items-center gap-2">
                <Key className="h-4 w-4 text-gray-500" />
                <span className="text-gray-800 font-medium">{getRoleDisplayName(userDetails?.rol || 'Admin')}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center">
              <Label className="w-full sm:w-1/3 text-gray-500 font-medium">Consejo Comunal</Label>
              <div className="flex-1 mt-1 sm:mt-0 p-3 bg-gray-100 rounded-md flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-800 font-medium">{userDetails?.consejoComunal || 'Valle Verde I'}</span>
              </div>
            </div>
          </div>
        </div>

        <Divider />

        {/* --- 2. Cambio de Contraseña --- */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Shield className="text-blue-500" /> Cambio de Contraseña
          </h2>
          <p className="text-gray-500 mt-1 mb-6">Actualiza tu clave periódicamente.</p>

          <form onSubmit={handleSubmitPass(onSubmitPassword)} className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="currentPassword" type="password" placeholder="••••••••" {...registerPass('currentPassword')} className="pl-10" />
                </div>
                {errorsPass.currentPassword && <p className="text-red-500 text-xs mt-1">{errorsPass.currentPassword.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="newPassword" type="password" placeholder="Mínimo 6 car." {...registerPass('newPassword')} className="pl-10" />
                </div>
                {errorsPass.newPassword && <p className="text-red-500 text-xs mt-1">{errorsPass.newPassword.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="confirmPassword" type="password" placeholder="Repite la clave" {...registerPass('confirmPassword')} className="pl-10" />
                </div>
                {errorsPass.confirmPassword && <p className="text-red-500 text-xs mt-1">{errorsPass.confirmPassword.message}</p>}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmittingPass}>
                {isSubmittingPass ? 'Actualizando...' : <><Save className="h-4 w-4 mr-2" /> Actualizar Contraseña</>}
              </Button>
            </div>
          </form>
        </div>

        <Divider />

        {/* --- 3. Configuración de Recuperación (NUEVO) --- */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <ShieldQuestion className="text-blue-500" /> Configurar Recuperación
          </h2>
          <p className="text-gray-500 mt-1 mb-6">Define tu pregunta secreta para recuperar el acceso si olvidas tu contraseña.</p>

          <form onSubmit={handleSubmitSec(onSubmitSecurity)} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <Label>Pregunta de Seguridad</Label>
                <Select onValueChange={(val) => setValueSec('question', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una pregunta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errorsSec.question && <p className="text-red-500 text-xs mt-1">{errorsSec.question.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer">Tu Respuesta</Label>
                <Input id="answer" placeholder="Escribe tu respuesta secreta" {...registerSec('answer')} />
                {errorsSec.answer && <p className="text-red-500 text-xs mt-1">{errorsSec.answer.message}</p>}
              </div>
            </div>

            {/* Confirmación con contraseña actual para seguridad */}
            <div className="space-y-2 max-w-sm">
                <Label htmlFor="currentPasswordSecurity">Confirma con tu Contraseña Actual</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    id="currentPasswordSecurity" 
                    type="password" 
                    placeholder="••••••••" 
                    {...registerSec('currentPasswordSecurity')} 
                    className="pl-10" 
                  />
                </div>
                {errorsSec.currentPasswordSecurity && <p className="text-red-500 text-xs mt-1">{errorsSec.currentPasswordSecurity.message}</p>}
                <p className="text-xs text-muted-foreground">Necesario para guardar cambios de seguridad.</p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmittingSec} variant="secondary">
                {isSubmittingSec ? 'Guardando...' : <><Save className="h-4 w-4 mr-2" /> Guardar Pregunta de Seguridad</>}
              </Button>
            </div>
          </form>
        </div>

      </div>
    </motion.div>
  );
}