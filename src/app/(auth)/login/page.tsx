'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- UI Components (Shadcn UI) ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Icons & Animation ---
import { Lock, User, Users2, ShieldQuestion, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Server Actions ---
// Asegúrate de tener estas funciones creadas en tu archivo de acciones
import { signUp, getSecurityQuestion, resetPasswordWithSecurity } from '@/lib/actions';

// --- CONSTANTES ---

// Imágenes locales ubicadas en la carpeta /public
const carouselImages = [
  '/1.jpg',
  '/2.jpg',
  '/3.jpg',
];

const SECURITY_QUESTIONS = [
  "¿Cuál es el nombre de tu primera mascota?",
  "¿En qué ciudad naciste?",
  "¿Cuál es el nombre de tu abuela materna?",
  "¿Cuál fue tu primer vehículo?",
  "¿Cuál es tu comida favorita?",
  "¿Cómo se llamaba tu escuela primaria?"
];

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_USER' | 'FORGOT_ANSWER';

export default function AuthPage() {
  // --- ESTADOS ---
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  
  // Estados para recuperación de contraseña
  const [recoverUser, setRecoverUser] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  
  // Estado para el Select del Registro
  const [selectedRegisterQuestion, setSelectedRegisterQuestion] = useState("");

  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // --- EFECTOS ---
  // Rotación automática del carrusel cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    const formData = new FormData(e.currentTarget);

    try {
      // 1. LOGIN
      if (mode === 'LOGIN') {
        const result = await signIn('credentials', { 
          username: formData.get('nombreUsuario'), 
          password: formData.get('password'), 
          redirect: false 
        });

        if (result?.error) {
          throw new Error('Credenciales incorrectas. Verifique sus datos.');
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      } 
      
      // 2. REGISTRO
      else if (mode === 'REGISTER') {
        if (!selectedRegisterQuestion) {
            throw new Error("Debes seleccionar una pregunta de seguridad.");
        }

        const result = await signUp(formData);
        if (result.success) {
          setMessage({ type: 'success', text: result.message });
          // Redirigir al login después de 2 segundos
          setTimeout(() => {
            setMode('LOGIN');
            setMessage(null);
          }, 2000);
        }
      }

      // 3. RECUPERAR (PASO 1: Buscar Usuario)
      else if (mode === 'FORGOT_USER') {
        const username = formData.get('nombreUsuario') as string;
        // Esta acción debe devolver la pregunta o lanzar error si el user no existe
        const question = await getSecurityQuestion(username);
        
        setRecoverUser(username);
        setSecurityQuestion(question);
        setMode('FORGOT_ANSWER'); 
        setMessage(null);
      }

      // 4. RECUPERAR (PASO 2: Verificar Respuesta y Resetear)
      else if (mode === 'FORGOT_ANSWER') {
        formData.append('username', recoverUser);
        
        const result = await resetPasswordWithSecurity(formData);
        if (result.success) {
           setMessage({ type: 'success', text: result.message });
           setTimeout(() => {
             setMode('LOGIN');
             setRecoverUser('');
             setSecurityQuestion('');
             setMessage(null);
           }, 3000);
        }
      }

    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Ocurrió un error inesperado.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Título dinámico del Card
  const getTitle = () => {
    switch(mode) {
      case 'REGISTER': return 'Crear Cuenta Administrador';
      case 'FORGOT_USER': return 'Recuperar Contraseña';
      case 'FORGOT_ANSWER': return 'Pregunta de Seguridad';
      default: return 'Bienvenido de Vuelta';
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      
      {/* --- COLUMNA IZQUIERDA: FORMULARIO --- */}
      <div className="flex items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="mx-auto w-full max-w-md space-y-6">
          
          {/* Header Texto */}
          <div className="text-center">
             <div className="inline-flex items-center gap-2 mb-2">
                <Users2 className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Valle Verde I</h1>
             </div>
             <p className="text-gray-500">Portal de Gestión del Consejo Comunal</p>
          </div>

          <Card className="shadow-xl border-blue-50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl text-blue-950">{getTitle()}</CardTitle>
              <CardDescription>
                {mode === 'LOGIN' && 'Ingresa tus credenciales para acceder'}
                {mode === 'REGISTER' && 'Completa los datos para registrar un administrador'}
                {mode === 'FORGOT_USER' && 'Ingresa tu usuario para validar seguridad'}
                {mode === 'FORGOT_ANSWER' && 'Responde correctamente para restablecer'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Alertas Animadas */}
                <AnimatePresence>
                    {message && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-4">
                            <AlertDescription>{message.text}</AlertDescription>
                        </Alert>
                    </motion.div>
                    )}
                </AnimatePresence>

                {/* --- INPUT: USUARIO (Común) --- */}
                {(mode === 'LOGIN' || mode === 'REGISTER' || mode === 'FORGOT_USER') && (
                  <div className="space-y-2">
                    <Label htmlFor="nombreUsuario">Usuario</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        id="nombreUsuario" 
                        name="nombreUsuario" 
                        placeholder="usuario.consejo" 
                        className="pl-10" 
                        required 
                        disabled={isLoading} 
                      />
                    </div>
                  </div>
                )}

                {/* --- INPUT: PASSWORD (Login y Registro) --- */}
                {(mode === 'LOGIN' || mode === 'REGISTER') && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        id="password" 
                        name="password" 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10" 
                        required 
                        disabled={isLoading} 
                      />
                    </div>
                    {/* Link Olvidé Contraseña */}
                    {mode === 'LOGIN' && (
                        <div className="text-right">
                          <Button 
                            variant="link" 
                            type="button" 
                            size="sm" 
                            className="px-0 font-normal h-auto text-blue-600" 
                            onClick={() => { setMode('FORGOT_USER'); setMessage(null); }}
                          >
                            ¿Olvidaste tu contraseña?
                          </Button>
                        </div>
                    )}
                  </div>
                )}

                {/* --- CAMPOS EXTRA: REGISTRO --- */}
                {mode === 'REGISTER' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                id="confirmPassword" 
                                name="confirmPassword" 
                                type="password" 
                                placeholder="••••••••" 
                                className="pl-10" 
                                required 
                                disabled={isLoading} 
                            />
                        </div>
                    </div>
                    
                    {/* Sección Pregunta de Seguridad */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldQuestion className="h-4 w-4 text-blue-600" />
                            <Label className="text-blue-900 font-semibold">Seguridad</Label>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="pregunta-select" className="text-xs text-muted-foreground">Pregunta</Label>
                            <input type="hidden" name="preguntaSeguridad" value={selectedRegisterQuestion} />
                            
                            <Select onValueChange={setSelectedRegisterQuestion} value={selectedRegisterQuestion} required>
                                <SelectTrigger id="pregunta-select" className="bg-white">
                                    <SelectValue placeholder="Elige una pregunta..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {SECURITY_QUESTIONS.map((q) => (
                                        <SelectItem key={q} value={q}>{q}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="respuestaSeguridad" className="text-xs text-muted-foreground">Respuesta</Label>
                            <Input 
                                id="respuestaSeguridad" 
                                name="respuestaSeguridad" 
                                placeholder="Escribe tu respuesta..." 
                                className="bg-white" 
                                required 
                                disabled={isLoading} 
                            />
                        </div>
                    </div>
                  </motion.div>
                )}

                {/* --- CAMPOS: RECUPERACIÓN (PASO 2) --- */}
                {mode === 'FORGOT_ANSWER' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="p-4 bg-blue-50 text-blue-900 rounded-lg border border-blue-100 text-center">
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">Pregunta de Seguridad</p>
                        <p className="font-medium text-lg leading-tight">"{securityQuestion}"</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="answer">Tu Respuesta</Label>
                        <Input 
                            id="answer" 
                            name="answer" 
                            placeholder="Escribe tu respuesta..." 
                            required 
                            autoFocus 
                            disabled={isLoading} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nueva Contraseña</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                id="newPassword" 
                                name="newPassword" 
                                type="password" 
                                placeholder="Mínimo 6 caracteres" 
                                className="pl-10"
                                required 
                                disabled={isLoading} 
                            />
                        </div>
                      </div>
                    </motion.div>
                )}

                {/* BOTÓN SUBMIT */}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-4 h-11 text-base" disabled={isLoading}>
                  {isLoading ? (
                      <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/> Procesando...</>
                  ) : (
                      mode === 'REGISTER' ? 'Crear Cuenta' : 
                      mode === 'LOGIN' ? 'Iniciar Sesión' : 
                      mode === 'FORGOT_USER' ? 'Buscar Pregunta' :
                      'Restablecer Contraseña'
                  )}
                </Button>

                {/* NAVEGACIÓN INFERIOR */}
                <div className="text-center text-sm mt-6 pt-2 border-t">
                  {mode === 'LOGIN' ? (
                      <p className="text-muted-foreground">
                        ¿Necesitas acceso administrativo?{' '}
                        <button 
                            type="button" 
                            onClick={() => { setMode('REGISTER'); setMessage(null); }} 
                            className="text-blue-600 font-semibold hover:underline transition-all"
                        >
                            Regístrate aquí
                        </button>
                      </p>
                  ) : (
                      <button 
                        type="button" 
                        onClick={() => { setMode('LOGIN'); setMessage(null); }} 
                        className="text-slate-500 font-medium hover:text-slate-800 flex items-center justify-center w-full gap-2 transition-all"
                      >
                        <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
                      </button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* --- COLUMNA DERECHA: CARRUSEL VISUAL --- */}
      <div className="hidden lg:block relative bg-slate-900 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            {/* Imagen Local */}
            <Image 
                src={carouselImages[currentImageIndex]} 
                alt="Comunidad" 
                fill 
                className="object-cover opacity-60 mix-blend-overlay"
                priority={true}
            />
            
            {/* Fondo de respaldo animado (gradiente) */}
            <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${
                currentImageIndex === 0 ? 'from-blue-900 to-slate-900' : 
                currentImageIndex === 1 ? 'from-indigo-900 to-purple-900' : 
                'from-emerald-900 to-teal-900'
            }`} />
          </motion.div>
        </AnimatePresence>
        
        {/* Overlay para texto */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        
        {/* Texto del Carrusel */}
        <div className="relative z-10 flex flex-col justify-end h-full p-12 text-white">
          <div className="max-w-lg space-y-4">
            <div className="h-1 w-20 bg-blue-500 rounded-full mb-4" />
            <h2 className="text-4xl font-bold leading-tight">
                Gestión eficiente para una comunidad unida.
            </h2>
            <p className="text-lg text-slate-300">
              Administra beneficiarios, gestiona solicitudes y visualiza el impacto social de tu consejo comunal en tiempo real.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}