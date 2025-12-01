'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, User, Users2, MapPin, ShieldQuestion, KeyRound } from 'lucide-react';
import { signUp, getSecurityQuestion, resetPasswordWithSecurity } from '@/lib/actions';
import { motion, AnimatePresence } from 'framer-motion';

// --- Imágenes para el carrusel visual ---
const carouselImages = [
  '/ejemplo-comunidad-1.jpg',
  '/ejemplo-jornada-social.jpg',
  '/ejemplo-voluntarios.jpg',
];

// --- Tipos para los modos de autenticación ---
type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_USER' | 'FORGOT_ANSWER';

export default function AuthPage() {
  // Estado principal de modo (Login vs Registro vs Recuperación)
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Estados para el flujo de recuperación
  const [recoverUser, setRecoverUser] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');

  const router = useRouter();

  // --- Efecto para el carrusel de imágenes ---
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- Manejador del formulario ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    try {
      // 1. LÓGICA DE LOGIN
      if (mode === 'LOGIN') {
        const nombreUsuario = formData.get('nombreUsuario') as string;
        const password = formData.get('password') as string;
        
        const result = await signIn('credentials', { 
          username: nombreUsuario, 
          password, 
          redirect: false 
        });

        if (result?.error) {
          throw new Error('Credenciales incorrectas. Verifique sus datos.');
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      } 
      
      // 2. LÓGICA DE REGISTRO
      else if (mode === 'REGISTER') {
        const result = await signUp(formData); // Llama a server action
        if (result.success) {
          setMessage({ type: 'success', text: result.message });
          // Esperar 2 segundos y cambiar a login
          setTimeout(() => setMode('LOGIN'), 2000);
        }
      }

      // 3. RECUPERACIÓN PASO 1: Buscar Usuario y obtener pregunta
      else if (mode === 'FORGOT_USER') {
        const username = formData.get('nombreUsuario') as string;
        // Server action para obtener la pregunta de seguridad de ese usuario
        const question = await getSecurityQuestion(username); 
        
        setRecoverUser(username);
        setSecurityQuestion(question);
        setMode('FORGOT_ANSWER'); // Avanzar al siguiente paso
      }

      // 4. RECUPERACIÓN PASO 2: Verificar respuesta y cambiar password
      else if (mode === 'FORGOT_ANSWER') {
        formData.append('username', recoverUser); // Adjuntamos el usuario que guardamos en el paso anterior
        const result = await resetPasswordWithSecurity(formData);
        
        if (result.success) {
           setMessage({ type: 'success', text: result.message });
           setTimeout(() => {
             setMode('LOGIN');
             setRecoverUser('');
             setSecurityQuestion('');
           }, 3000);
        }
      }

    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error desconocido.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Título dinámico según el modo
  const getTitle = () => {
    switch(mode) {
      case 'REGISTER': return 'Crear Cuenta Administrador';
      case 'FORGOT_USER': return 'Recuperar Contraseña';
      case 'FORGOT_ANSWER': return 'Pregunta de Seguridad';
      default: return 'Bienvenido de Vuelta';
    }
  };

  // Subtítulo dinámico
  const getDescription = () => {
    switch(mode) {
        case 'REGISTER': return 'Regístrate para gestionar el consejo comunal';
        case 'FORGOT_USER': return 'Ingresa tu usuario para buscar tu pregunta secreta';
        case 'FORGOT_ANSWER': return 'Responde correctamente para restablecer tu clave';
        default: return 'Ingresa a tu cuenta para continuar';
      }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* --- COLUMNA IZQUIERDA: FORMULARIO --- */}
      <div className="flex items-center justify-center p-6 sm:p-12 lg:p-8 bg-white">
        <div className="mx-auto w-full max-w-md space-y-6">
          
          {/* Header Branding */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-3 mb-2 justify-center">
              <Users2 className="h-10 w-10 text-blue-600" />
              <h1 className="text-3xl font-bold text-blue-900">Valle Verde I</h1>
            </Link>
            <p className="text-gray-500">Portal de Gestión del Consejo Comunal</p>
          </div>

          <Card className="border-0 shadow-none sm:border-blue-100 sm:shadow-xl">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl text-blue-800">{getTitle()}</CardTitle>
              <CardDescription>{getDescription()}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {message && (
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                {/* --- INPUTS COMUNES (Usuario) --- */}
                {/* Se muestra en Login, Registro y Recuperación Paso 1 */}
                {(mode === 'LOGIN' || mode === 'REGISTER' || mode === 'FORGOT_USER') && (
                  <div className="space-y-2">
                    <Label htmlFor="nombreUsuario">Usuario</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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

                {/* --- INPUTS PASSWORD --- */}
                {/* Se muestra en Login y Registro */}
                {(mode === 'LOGIN' || mode === 'REGISTER') && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                    {/* Link de Olvidé Contraseña (Solo en Login) */}
                    {mode === 'LOGIN' && (
                       <div className="text-right">
                         <Button 
                            variant="link" 
                            type="button" 
                            size="sm" 
                            onClick={() => { setMode('FORGOT_USER'); setMessage(null); }}
                            className="text-blue-600 px-0 font-normal h-auto"
                         >
                           ¿Olvidaste tu contraseña?
                         </Button>
                       </div>
                    )}
                  </div>
                )}

                {/* --- CAMPOS EXCLUSIVOS DE REGISTRO --- */}
                <AnimatePresence mode="wait">
                  {mode === 'REGISTER' && (
                    <motion.div
                      key="registerFields"
                      variants={formVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="space-y-4"
                    >
                      {/* Confirmar Password */}
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <div className="relative">
                           <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                           <Input name="confirmPassword" type="password" required className="pl-10" placeholder="••••••••" />
                        </div>
                      </div>

                      {/* Pregunta de Seguridad (NUEVO) */}
                      <div className="space-y-3 bg-blue-50 p-4 rounded-md border border-blue-100">
                         <div className="flex items-center gap-2 text-blue-800 font-medium">
                            <ShieldQuestion className="h-4 w-4" />
                            <Label className="text-blue-800">Seguridad de la Cuenta</Label>
                         </div>
                         
                         <div className="space-y-2">
                            <Input name="preguntaSeguridad" placeholder="Pregunta: Ej. ¿Nombre de tu primera mascota?" required className="bg-white" />
                            <Input name="respuestaSeguridad" placeholder="Respuesta secreta" required className="bg-white" />
                         </div>
                      </div>

                      {/* Consejo Comunal (Manteniendo lógica original) */}
                      <div className="space-y-2">
                        <Label htmlFor="consejoComunal">Consejo Comunal (Opcional)</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="consejoComunal"
                            name="consejoComunal"
                            type="text"
                            className="pl-10"
                            placeholder="Valle Verde I"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Si no se especifica, se asignará a "Valle Verde I" por defecto.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* --- CAMPOS EXCLUSIVOS: RESPUESTA DE SEGURIDAD (Recuperación Paso 2) --- */}
                <AnimatePresence mode="wait">
                    {mode === 'FORGOT_ANSWER' && (
                       <motion.div
                          key="recoverFields"
                          variants={formVariants}
                          initial="hidden"
                          animate="visible"
                          className="space-y-4"
                       >
                          <div className="p-4 bg-blue-50 text-blue-900 rounded-md text-center border border-blue-100">
                             <ShieldQuestion className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                             <p className="text-sm font-semibold">Pregunta de Seguridad:</p>
                             <p className="text-lg font-bold mt-1">{securityQuestion}</p>
                          </div>
                          
                          <div className="space-y-2">
                             <Label>Tu Respuesta</Label>
                             <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input name="answer" placeholder="Escribe tu respuesta..." required className="pl-10" />
                             </div>
                          </div>
                          
                          <div className="space-y-2">
                             <Label>Nueva Contraseña</Label>
                             <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input name="newPassword" type="password" placeholder="Nueva contraseña segura" required className="pl-10" />
                             </div>
                          </div>
                       </motion.div>
                    )}
                </AnimatePresence>

                {/* Botón Submit Principal */}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? 'Procesando...' : (
                      mode === 'REGISTER' ? 'Crear Cuenta' : 
                      mode === 'LOGIN' ? 'Iniciar Sesión' : 
                      'Continuar'
                  )}
                </Button>

                {/* --- BOTONES DE NAVEGACIÓN ENTRE MODOS --- */}
                <div className="mt-6 text-center text-sm">
                  {mode === 'LOGIN' ? (
                     <p>
                       ¿No tienes cuenta?{' '}
                       <Button 
                         variant="link" 
                         className="font-bold text-blue-600 p-0 h-auto" 
                         onClick={() => { setMode('REGISTER'); setMessage(null); }}
                         type="button"
                        >
                         Regístrate
                       </Button>
                     </p>
                  ) : (
                     <Button 
                        variant="link" 
                        className="font-bold text-blue-600 p-0 h-auto" 
                        onClick={() => { setMode('LOGIN'); setMessage(null); setRecoverUser(''); }}
                        type="button"
                     >
                        Volver al inicio de sesión
                     </Button>
                  )}
                </div>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- COLUMNA DERECHA: CARRUSEL DE IMÁGENES --- */}
      <div className="hidden lg:block relative bg-gray-900">
        <AnimatePresence>
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <Image
              src={carouselImages[currentImageIndex]}
              alt="Imágenes de la comunidad"
              fill
              className="object-cover brightness-50"
              priority={true}
            />
          </motion.div>
        </AnimatePresence>
        <div className="relative z-10 flex flex-col justify-end h-full p-10 text-white">
          <div className="bg-black/40 p-6 rounded-lg backdrop-blur-sm border-l-4 border-blue-500">
            <h2 className="text-3xl font-bold">Unidos por un bien común</h2>
            <p className="mt-2 text-gray-100 text-lg">
              Esta plataforma es el corazón digital de nuestra comunidad. 
              Gestiona, conecta y organiza los recursos de Valle Verde I de manera eficiente y transparente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}