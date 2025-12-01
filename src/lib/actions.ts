// lib/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from './db';
import { 
  usuarios, 
  adultosMayores, 
  personasConDiscapacidad, 
  representantes, 
  documentos, 
  solicitudes,
  consejosComunales 
} from './db/schema';
// Se agregaron 'gte' y 'lte' a las importaciones
import { eq, desc, like, or, count, sql, and, not, gte, lte } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import z from 'zod';
import { auth } from './auth';

// ================================================================= 
// ACTIONS DE AUTENTICACIÓN Y USUARIO
// ================================================================= 

// Esquema actualizado con preguntas de seguridad
const signUpSchema = z.object({
  nombreUsuario: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
  consejoComunal: z.string().optional(),
  preguntaSeguridad: z.string({ required_error: "Debes seleccionar una pregunta de seguridad" }),
  respuestaSeguridad: z.string().min(2, "La respuesta debe tener al menos 2 caracteres"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export async function signUp(formData: FormData) {
  const validated = signUpSchema.safeParse(Object.fromEntries(formData.entries()));
  
  if (!validated.success) {
    const errorMessages = validated.error.errors.map(e => e.message).join('. ');
    throw new Error(errorMessages);
  }

  const { nombreUsuario, password, consejoComunal, preguntaSeguridad, respuestaSeguridad } = validated.data;

  try {
    // Verificar si el usuario ya existe
    const existingUser = await db.select().from(usuarios).where(eq(usuarios.nombreUsuario, nombreUsuario)).limit(1);
    
    if (existingUser.length > 0) {
      throw new Error("El nombre de usuario ya está en uso.");
    }

    // Buscar o crear consejo comunal
    let consejoComunalId = null;
    if (consejoComunal && consejoComunal.trim() !== '') {
      // Buscar consejo comunal existente
      const existingConsejo = await db.select().from(consejosComunales)
        .where(eq(consejosComunales.nombre, consejoComunal)).limit(1);
      
      if (existingConsejo.length > 0) {
        consejoComunalId = existingConsejo[0].id;
      } else {
        // Crear nuevo consejo comunal (valores por defecto)
        const newConsejo = await db.insert(consejosComunales).values({
          nombre: consejoComunal,
          parroquia: "Valle Verde",
          municipio: "Municipio Ejemplo",
          estado: "Estado Ejemplo"
        }).returning({ id: consejosComunales.id });
        consejoComunalId = newConsejo[0].id;
      }
    } else {
      // Buscar Valle Verde I por defecto
      const valleVerde = await db.select().from(consejosComunales)
        .where(eq(consejosComunales.nombre, "Valle Verde I")).limit(1);
      
      if (valleVerde.length > 0) {
        consejoComunalId = valleVerde[0].id;
      } else {
        // Crear Valle Verde I por defecto
        const newConsejo = await db.insert(consejosComunales).values({
          nombre: "Valle Verde I",
          parroquia: "Valle Verde",
          municipio: "Municipio Ejemplo",
          estado: "Estado Ejemplo"
        }).returning({ id: consejosComunales.id });
        consejoComunalId = newConsejo[0].id;
      }
    }

    const contrasenaHash = await bcrypt.hash(password, 10);
    // Encriptamos la respuesta de seguridad para privacidad
    const respuestaSeguridadHash = await bcrypt.hash(respuestaSeguridad.toLowerCase().trim(), 10);

    await db.insert(usuarios).values({
      nombreUsuario,
      contrasenaHash,
      rol: 'Admin',
      consejoComunalId,
      preguntaSeguridad,
      respuestaSeguridadHash
    });

    revalidatePath('/auth');
    return { success: true, message: "¡Cuenta creada con seguridad configurada! Ahora puedes iniciar sesión." };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "No se pudo registrar al usuario.");
  }
}

// Nueva acción: Obtener pregunta de seguridad
export async function getSecurityQuestion(username: string) {
  const user = await db.query.usuarios.findFirst({
    where: eq(usuarios.nombreUsuario, username),
    columns: { preguntaSeguridad: true, id: true } // Traemos ID por si acaso
  });
  
  if (!user) {
    throw new Error("Usuario no encontrado. Verifique el nombre escrito.");
  }

  // VALIDACIÓN NUEVA: Si el usuario existe pero no tiene pregunta
  if (!user.preguntaSeguridad || user.preguntaSeguridad.trim() === '') {
    throw new Error("Tu cuenta no tiene una pregunta de seguridad guardada. Contacta al soporte.");
  }

  return user.preguntaSeguridad;
}

// Nueva acción: Verificar respuesta y cambiar contraseña
export async function resetPasswordWithSecurity(formData: FormData) {
  const username = formData.get('username') as string;
  const answer = formData.get('answer') as string;
  const newPassword = formData.get('newPassword') as string;

  const user = await db.query.usuarios.findFirst({
    where: eq(usuarios.nombreUsuario, username)
  });

  if (!user) throw new Error("Usuario no encontrado");
  if (!user.respuestaSeguridadHash) throw new Error("El usuario no tiene seguridad configurada.");

  // Verificar la respuesta de seguridad
  const isMatch = await bcrypt.compare(answer.toLowerCase().trim(), user.respuestaSeguridadHash);
  if (!isMatch) throw new Error("La respuesta de seguridad es incorrecta.");

  // Actualizar contraseña
  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(usuarios)
    .set({ contrasenaHash: newHash })
    .where(eq(usuarios.id, user.id));

  return { success: true, message: "Contraseña restablecida exitosamente." };
}

export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  
  if (!userId) {
    throw new Error('No estás autenticado.');
  }

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword) {
    throw new Error('Datos inválidos. Asegúrate que las nuevas contraseñas coincidan.');
  }

  const user = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, userId)
  });

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.contrasenaHash);
  if (!isPasswordValid) {
    throw new Error('La contraseña actual es incorrecta.');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  
  await db.update(usuarios).set({ 
    contrasenaHash: newPasswordHash 
  }).where(eq(usuarios.id, userId));

  revalidatePath('/dashboard/perfil');
  return { success: true, message: 'Contraseña actualizada correctamente.' };
}

// ================================================================= 
// BENEFICIARIOS (COMBINADO: Adultos Mayores + Personas con Discapacidad)
// ================================================================= 

type BeneficiaryType = {
  id: string;
  fullName: string;
  type: 'adulto_mayor' | 'persona_discapacidad';
  birthDate: string | null;
  disabilityType: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getBeneficiaries(): Promise<BeneficiaryType[]> {
  // Obtener adultos mayores
  const adultos = await db.select({
    id: adultosMayores.id,
    nombre: adultosMayores.nombre,
    apellido: adultosMayores.apellido,
    fechaNacimiento: adultosMayores.fechaNacimiento,
    descripcionSalud: adultosMayores.descripcionSalud,
    createdAt: adultosMayores.createdAt,
    updatedAt: adultosMayores.updatedAt,
  }).from(adultosMayores).orderBy(desc(adultosMayores.createdAt));

  // Obtener personas con discapacidad
  const personas = await db.select({
    id: personasConDiscapacidad.id,
    nombre: personasConDiscapacidad.nombre,
    apellido: personasConDiscapacidad.apellido,
    fechaNacimiento: personasConDiscapacidad.fechaNacimiento,
    tipoDiscapacidad: personasConDiscapacidad.tipoDiscapacidad,
    createdAt: personasConDiscapacidad.createdAt,
    updatedAt: personasConDiscapacidad.updatedAt,
  }).from(personasConDiscapacidad).orderBy(desc(personasConDiscapacidad.createdAt));

  // Combinar y transformar
  const beneficiaries: BeneficiaryType[] = [
    ...adultos.map(a => ({
      id: a.id,
      fullName: `${a.nombre} ${a.apellido}`,
      type: 'adulto_mayor' as const,
      birthDate: a.fechaNacimiento,
      disabilityType: null,
      notes: a.descripcionSalud,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt || a.createdAt,
    })),
    ...personas.map(p => ({
      id: p.id,
      fullName: `${p.nombre} ${p.apellido}`,
      type: 'persona_discapacidad' as const,
      birthDate: p.fechaNacimiento,
      disabilityType: p.tipoDiscapacidad,
      notes: null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt || p.createdAt,
    }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return beneficiaries;
}

const beneficiarySchema = z.object({
  fullName: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  birthDate: z.string().optional(),
  disabilityType: z.string().optional(),
  notes: z.string().max(500, { message: "Las notas no deben exceder los 500 caracteres." }).optional(),
});

export async function createBeneficiary(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('No estás autenticado.');
  }

  const data = {
    fullName: formData.get('fullName') as string,
    birthDate: formData.get('birthDate') as string,
    disabilityType: formData.get('disabilityType') as string,
    notes: formData.get('notes') as string,
  };

  const validated = beneficiarySchema.safeParse(data);
  if (!validated.success) {
    throw new Error(validated.error.errors[0].message);
  }

  const { fullName, birthDate, disabilityType, notes } = validated.data;
  const [nombre, ...apellidos] = fullName.split(' ');
  const apellido = apellidos.join(' ') || 'Sin Apellido';

  try {
    if (disabilityType && disabilityType !== '') {
      // Es una persona con discapacidad
      await db.insert(personasConDiscapacidad).values({
        nombre,
        apellido,
        fechaNacimiento: birthDate || null,
        tipoDiscapacidad: disabilityType,
        creadoPorUsuarioId: session.user.id,
      });
    } else {
      // Es un adulto mayor
      await db.insert(adultosMayores).values({
        nombre,
        apellido,
        fechaNacimiento: birthDate || null,
        descripcionSalud: notes || null,
        creadoPorUsuarioId: session.user.id,
      });
    }

    revalidatePath('/dashboard/registros');
  } catch (error) {
    throw new Error('Error al crear el beneficiario');
  }
}

export async function getBeneficiaryById(id: string) {
  // Buscar en adultos mayores
  const adulto = await db.query.adultosMayores.findFirst({
    where: eq(adultosMayores.id, id),
  });
  
  if (adulto) {
    return {
      ...adulto,
      type: 'adulto_mayor' as const,
      fullName: `${adulto.nombre} ${adulto.apellido}`,
      // Mapeamos para mantener consistencia con la versión simplificada donde sea posible
      birthDate: adulto.fechaNacimiento,
      notes: adulto.descripcionSalud, 
    };
  }

  // Buscar en personas con discapacidad
  const persona = await db.query.personasConDiscapacidad.findFirst({
    where: eq(personasConDiscapacidad.id, id),
    with: {
      representante: true, // Incluimos los datos del representante si existe
    }
  });
  
  if (persona) {
    return {
      ...persona,
      type: 'persona_discapacidad' as const,
      fullName: `${persona.nombre} ${persona.apellido}`,
      // Mapeamos para mantener consistencia
      birthDate: persona.fechaNacimiento,
      disabilityType: persona.tipoDiscapacidad
    };
  }

  return null;
}

// Define los esquemas de validación
const adultoMayorSchema = z.object({
  nombre: z.string().min(2),
  apellido: z.string().min(2),
  fechaNacimiento: z.string().optional(),
  etniaAborigen: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  correoElectronico: z.string().email().optional().or(z.literal("")),
  estadoCivil: z.enum(["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a"]).optional(),
  descripcionSalud: z.string().max(500).optional(),
});

const personaDiscapacidadSchema = z.object({
  nombre: z.string().min(2),
  apellido: z.string().min(2),
  fechaNacimiento: z.string().optional(),
  etniaAborigen: z.string().optional(),
  tipoDiscapacidad: z.string().optional(),
  gradoDiscapacidad: z.string().optional(),
  certificacionMedica: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  correoElectronico: z.string().email().optional().or(z.literal("")),
  estadoCivil: z.enum(["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a"]).optional(),
  representanteId: z.string().optional(),
});

export async function updateAdultoMayor(id: string, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const validated = adultoMayorSchema.safeParse(data);

  if (!validated.success) {
    throw new Error(validated.error.errors.map(e => e.message).join(', '));
  }

  try {
    await db.update(adultosMayores)
      .set({
        ...validated.data,
        fechaNacimiento: validated.data.fechaNacimiento || null,
        updatedAt: new Date(),
      })
      .where(eq(adultosMayores.id, id));

    revalidatePath(`/dashboard/registros`);
    revalidatePath(`/dashboard/registros/${id}`);
    revalidatePath(`/dashboard/registros/${id}/editar`);
    
  } catch (error) {
    console.error("Error al actualizar adulto mayor:", error);
    throw new Error("No se pudo actualizar el registro.");
  }
}

export async function updatePersonaConDiscapacidad(id: string, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const validated = personaDiscapacidadSchema.safeParse(data);

  if (!validated.success) {
    throw new Error(validated.error.errors.map(e => e.message).join(', '));
  }
  
  try {
    await db.update(personasConDiscapacidad)
      .set({
        ...validated.data,
        fechaNacimiento: validated.data.fechaNacimiento || null,
        representanteId: validated.data.representanteId || null,
        updatedAt: new Date(),
      })
      .where(eq(personasConDiscapacidad.id, id));
    
    revalidatePath(`/dashboard/registros`);
    revalidatePath(`/dashboard/registros/${id}`);
    revalidatePath(`/dashboard/registros/${id}/editar`);
    
  } catch (error) {
    console.error("Error al actualizar persona con discapacidad:", error);
    throw new Error("No se pudo actualizar el registro.");
  }
}

export async function deleteBeneficiary(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('No estás autenticado.');
  }

  try {
    // Intentar eliminar de adultos mayores
    const deletedAdulto = await db.delete(adultosMayores).where(eq(adultosMayores.id, id)).returning({ id: adultosMayores.id });
    
    if (deletedAdulto.length === 0) {
      // Si no se encontró en adultos mayores, intentar en personas con discapacidad
      await db.delete(personasConDiscapacidad).where(eq(personasConDiscapacidad.id, id));
    }

    revalidatePath('/dashboard/registros');
  } catch (error) {
    throw new Error('Error al eliminar el beneficiario');
  }
}

// ================================================================= 
// SOLICITUDES
// ================================================================= 

type RequestType = {
  id: string;
  description: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  beneficiaryName: string | null;
  beneficiaryId: string | null;
};

export async function getRequests(): Promise<RequestType[]> {
  const requests = await db.select({
    id: solicitudes.id,
    descripcion: solicitudes.descripcion,
    estado: solicitudes.estado,
    prioridad: solicitudes.prioridad,
    createdAt: solicitudes.createdAt,
    updatedAt: solicitudes.updatedAt,
    adultoMayorId: solicitudes.adultoMayorId,
    personaConDiscapacidadId: solicitudes.personaConDiscapacidadId,
  }).from(solicitudes).orderBy(desc(solicitudes.createdAt));

  const result: RequestType[] = [];

  for (const request of requests) {
    let beneficiaryName = null;
    let beneficiaryId = null;

    if (request.adultoMayorId) {
      const adulto = await db.select({
        nombre: adultosMayores.nombre,
        apellido: adultosMayores.apellido,
      }).from(adultosMayores).where(eq(adultosMayores.id, request.adultoMayorId)).limit(1);
      
      if (adulto.length > 0) {
        beneficiaryName = `${adulto[0].nombre} ${adulto[0].apellido}`;
        beneficiaryId = request.adultoMayorId;
      }
    } else if (request.personaConDiscapacidadId) {
      const persona = await db.select({
        nombre: personasConDiscapacidad.nombre,
        apellido: personasConDiscapacidad.apellido,
      }).from(personasConDiscapacidad).where(eq(personasConDiscapacidad.id, request.personaConDiscapacidadId)).limit(1);
      
      if (persona.length > 0) {
        beneficiaryName = `${persona[0].nombre} ${persona[0].apellido}`;
        beneficiaryId = request.personaConDiscapacidadId;
      }
    }

    result.push({
      id: request.id,
      description: request.descripcion,
      status: request.estado,
      priority: request.prioridad,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      beneficiaryName,
      beneficiaryId,
    });
  }

  return result;
}

const requestSchema = z.object({
  beneficiaryId: z.string().min(1, "Debes seleccionar un beneficiario"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  priority: z.enum(["Baja", "Media", "Alta", "Urgente"]),
});

export async function createRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('No estás autenticado.');
  }

  const data = {
    beneficiaryId: formData.get('beneficiaryId') as string,
    description: formData.get('description') as string,
    priority: formData.get('priority') as "Baja" | "Media" | "Alta" | "Urgente",
  };

  const validated = requestSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { beneficiaryId, description, priority } = validated.data;

  try {
    // El bloque 'try' ahora solo se enfoca en las operaciones de base de datos
    const esAdultoMayor = await db.query.adultosMayores.findFirst({
      where: eq(adultosMayores.id, beneficiaryId),
      columns: { id: true }
    });

    if (esAdultoMayor) {
      await db.insert(solicitudes).values({
        descripcion: description,
        prioridad: priority,
        adultoMayorId: beneficiaryId,
        creadaPorUsuarioId: session.user.id,
      });
    } else {
      const esPersonaConDiscapacidad = await db.query.personasConDiscapacidad.findFirst({
        where: eq(personasConDiscapacidad.id, beneficiaryId),
        columns: { id: true }
      });

      if (esPersonaConDiscapacidad) {
        await db.insert(solicitudes).values({
          descripcion: description,
          prioridad: priority,
          personaConDiscapacidadId: beneficiaryId,
          creadaPorUsuarioId: session.user.id,
        });
      } else {
        return { error: "El beneficiario seleccionado ya no existe. Por favor, recarga la página y selecciona otro." };
      }
    }
  } catch (error) {
    // Si hay un error REAL de base de datos, lo capturamos aquí
    console.error("Error de base de datos al crear la solicitud:", error);
    return { error: 'Ocurrió un error al guardar los datos. Por favor, inténtalo de nuevo.' };
  }

  // --- LÓGICA DE ÉXITO ---
  revalidatePath('/dashboard/solicitudes');
  redirect('/dashboard/solicitudes');
}

export async function getRequestById(id: string) {
  // 1. Busca la solicitud básica
  const request = await db.query.solicitudes.findFirst({
    where: eq(solicitudes.id, id),
  });

  if (!request) {
    return null;
  }

  // 2. Declara un objeto para los detalles completos del beneficiario
  let beneficiaryDetails = null;

  // 3. Si está asociada a un Adulto Mayor, busca su perfil completo
  if (request.adultoMayorId) {
    const adulto = await db.query.adultosMayores.findFirst({
      where: eq(adultosMayores.id, request.adultoMayorId),
    });
    if (adulto) {
      // Agregamos una propiedad 'type' para identificarlo en el frontend
      beneficiaryDetails = { ...adulto, type: 'adulto_mayor' as const };
    }
  } 
  // 4. Si está asociada a una Persona con Discapacidad, busca su perfil y el de su representante
  else if (request.personaConDiscapacidadId) {
    const persona = await db.query.personasConDiscapacidad.findFirst({
      where: eq(personasConDiscapacidad.id, request.personaConDiscapacidadId),
      with: {
        representante: true, // Incluimos los datos del representante
      },
    });
    if (persona) {
      // Agregamos la propiedad 'type'
      beneficiaryDetails = { ...persona, type: 'persona_discapacidad' as const };
    }
  }

  // 5. Devuelve la solicitud original junto con el objeto de detalles del beneficiario
  return {
    ...request,
    beneficiaryDetails,
  };
}

export async function updateRequestStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('No estás autenticado.');
  }

  try {
    await db.update(solicitudes).set({ 
      estado: status,
      updatedAt: new Date(),
    }).where(eq(solicitudes.id, id));

    revalidatePath('/dashboard/solicitudes');
    revalidatePath(`/dashboard/solicitudes/${id}`);
  } catch (error) {
    throw new Error('Error al actualizar el estado');
  }
}

export async function deleteRequest(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('No estás autenticado.');
  }

  try {
    await db.delete(solicitudes).where(eq(solicitudes.id, id));
    revalidatePath('/dashboard/solicitudes');
  } catch (error) {
    throw new Error('Error al eliminar la solicitud');
  }
}

// ================================================================= 
// REPORTES
// ================================================================= 

export async function getReportData(filters: { status?: string; priority?: string } = {}) {
  // --- KPIs Principales ---
  const [adultosMayoresCount] = await db.select({ count: count() }).from(adultosMayores);
  const [personasDiscapacidadCount] = await db.select({ count: count() }).from(personasConDiscapacidad);
  const totalBeneficiaries = adultosMayoresCount.count + personasDiscapacidadCount.count;

  // --- Datos de Solicitudes (con filtros) ---
  const filterConditions = [];
  if (filters.status) filterConditions.push(eq(solicitudes.estado, filters.status));
  if (filters.priority) filterConditions.push(eq(solicitudes.prioridad, filters.priority));
  
  const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

  const [totalRequestsData] = await db.select({ count: count() }).from(solicitudes).where(whereClause);
  const totalRequests = totalRequestsData.count;
  
  // --- Desglose de Datos ---
  const requestsByStatus = await db.select({
    status: solicitudes.estado,
    count: count(),
  }).from(solicitudes).groupBy(solicitudes.estado);

  const requestsByPriority = await db.select({
    priority: solicitudes.prioridad,
    count: count(),
  }).from(solicitudes).groupBy(solicitudes.prioridad);
  
  const beneficiariesByType = [
    { type: 'Adultos Mayores', count: adultosMayoresCount.count },
    { type: 'Personas con Discapacidad', count: personasDiscapacidadCount.count },
  ];

  const beneficiariesByDisabilityGrade = await db.select({
    grade: personasConDiscapacidad.gradoDiscapacidad,
    count: count(),
  }).from(personasConDiscapacidad)
    .where(not(eq(personasConDiscapacidad.gradoDiscapacidad, '')))
    .groupBy(personasConDiscapacidad.gradoDiscapacidad);

  // --- Solicitudes Recientes (para el dashboard) ---
  const recentRequestsData = await db.select({
    id: solicitudes.id,
    descripcion: solicitudes.descripcion,
    estado: solicitudes.estado,
    prioridad: solicitudes.prioridad,
    createdAt: solicitudes.createdAt,
    adultoMayorId: solicitudes.adultoMayorId,
    personaConDiscapacidadId: solicitudes.personaConDiscapacidadId,
  }).from(solicitudes).orderBy(desc(solicitudes.createdAt)).limit(10);
  
  const recentRequests = await Promise.all(recentRequestsData.map(async (req) => {
    let beneficiaryName = 'N/A';
    if (req.adultoMayorId) {
      const ben = await db.query.adultosMayores.findFirst({ where: eq(adultosMayores.id, req.adultoMayorId), columns: { nombre: true, apellido: true }});
      if (ben) beneficiaryName = `${ben.nombre} ${ben.apellido}`;
    } else if (req.personaConDiscapacidadId) {
      const ben = await db.query.personasConDiscapacidad.findFirst({ where: eq(personasConDiscapacidad.id, req.personaConDiscapacidadId), columns: { nombre: true, apellido: true }});
      if (ben) beneficiaryName = `${ben.nombre} ${ben.apellido}`;
    }
    return {
      id: req.id,
      description: req.descripcion,
      beneficiaryName,
      status: req.estado,
      priority: req.prioridad,
      createdAt: req.createdAt,
    };
  }));
  
  const fullRequests = await db.query.solicitudes.findMany({
    orderBy: [desc(solicitudes.createdAt)],
    with: {
      adultoMayor: true, 
      personaConDiscapacidad: true, 
    }
  });

  const beneficiariesByDisability = await db.select({
    disabilityType: personasConDiscapacidad.tipoDiscapacidad,
    count: count(),
  }).from(personasConDiscapacidad)
    .where(sql`${personasConDiscapacidad.tipoDiscapacidad} IS NOT NULL`)
    .groupBy(personasConDiscapacidad.tipoDiscapacidad);
  
  const [pcdWithRepresentative] = await db.select({ count: count() }).from(personasConDiscapacidad).where(sql`${personasConDiscapacidad.representanteId} IS NOT NULL`);
  
  return {
    totalBeneficiaries,
    totalRequests,
    requestsByStatus,
    requestsByPriority,
    recentRequests, 
    beneficiariesByDisability,
    beneficiariesByType,
    beneficiariesByDisabilityGrade: beneficiariesByDisabilityGrade.map(g => ({ ...g, grade: g.grade ?? 'No especificado' })),
    totalAdultosMayores: adultosMayoresCount.count,
    totalPersonasConDiscapacidad: personasDiscapacidadCount.count,
    pcdWithRepresentativeCount: pcdWithRepresentative.count,
    fullRequests, 
  };
}

// Nueva acción: Estadísticas basadas en tiempo
export async function getTimeBasedStats() {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Función auxiliar para contar
  const countCases = async (fromDate: Date) => {
    const added = await db.select({ count: count() }).from(solicitudes)
       .where(gte(solicitudes.createdAt, fromDate));
    
    const solved = await db.select({ count: count() }).from(solicitudes)
       .where(and(
         gte(solicitudes.updatedAt, fromDate),
         or(eq(solicitudes.estado, 'Aprobada'), eq(solicitudes.estado, 'Entregada'))
       ));
       
    return { added: added[0].count, solved: solved[0].count };
  };

  return {
    week: await countCases(oneWeekAgo),
    month: await countCases(oneMonthAgo),
    twoMonths: await countCases(twoMonthsAgo),
  };
}

// ================================================================= 
// ADULTOS MAYORES ESPECÍFICOS
// ================================================================= 

export async function createAdultoMayor(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado.');

  const data = {
    nombre: formData.get('nombre') as string,
    apellido: formData.get('apellido') as string,
    fechaNacimiento: formData.get('fechaNacimiento') as string,
    etniaAborigen: formData.get('etniaAborigen') as string,
    direccion: formData.get('direccion') as string,
    telefono: formData.get('telefono') as string,
    correoElectronico: formData.get('correoElectronico') as string,
    estadoCivil: formData.get('estadoCivil') as string,
    descripcionSalud: formData.get('descripcionSalud') as string,
  };

  if (!data.nombre || !data.apellido) {
    throw new Error('Nombre y apellido son requeridos.');
  }

  await db.insert(adultosMayores).values({
    nombre: data.nombre,
    apellido: data.apellido,
    fechaNacimiento: data.fechaNacimiento || null,
    etniaAborigen: data.etniaAborigen || null,
    direccion: data.direccion || null,
    telefono: data.telefono || null,
    correoElectronico: data.correoElectronico || null,
    estadoCivil: data.estadoCivil as any || null,
    descripcionSalud: data.descripcionSalud || null,
    creadoPorUsuarioId: session.user.id,
  });

  revalidatePath('/dashboard/adultos-mayores');
}

export async function getAdultosMayores() {
  return await db.select().from(adultosMayores).orderBy(desc(adultosMayores.createdAt));
}

// ================================================================= 
// PERSONAS CON DISCAPACIDAD ESPECÍFICOS
// ================================================================= 

export async function createPersonaConDiscapacidad(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado.');

  const data = {
    nombre: formData.get('nombre') as string,
    apellido: formData.get('apellido') as string,
    fechaNacimiento: formData.get('fechaNacimiento') as string,
    etniaAborigen: formData.get('etniaAborigen') as string,
    tipoDiscapacidad: formData.get('tipoDiscapacidad') as string,
    gradoDiscapacidad: formData.get('gradoDiscapacidad') as string,
    certificacionMedica: formData.get('certificacionMedica') as string,
    direccion: formData.get('direccion') as string,
    telefono: formData.get('telefono') as string,
    correoElectronico: formData.get('correoElectronico') as string,
    estadoCivil: formData.get('estadoCivil') as string,
    representanteId: formData.get('representanteId') as string,
  };

  if (!data.nombre || !data.apellido) {
    throw new Error('Nombre y apellido son requeridos.');
  }

  await db.insert(personasConDiscapacidad).values({
    nombre: data.nombre,
    apellido: data.apellido,
    fechaNacimiento: data.fechaNacimiento || null,
    etniaAborigen: data.etniaAborigen || null,
    tipoDiscapacidad: data.tipoDiscapacidad || null,
    gradoDiscapacidad: data.gradoDiscapacidad || null,
    certificacionMedica: data.certificacionMedica || null,
    direccion: data.direccion || null,
    telefono: data.telefono || null,
    correoElectronico: data.correoElectronico || null,
    estadoCivil: data.estadoCivil as any || null,
    representanteId: data.representanteId || null,
    creadoPorUsuarioId: session.user.id,
  });

  revalidatePath('/dashboard/discapacidad');
}

export async function getPersonasConDiscapacidad() {
  return await db.select().from(personasConDiscapacidad).orderBy(desc(personasConDiscapacidad.createdAt));
}

// ================================================================= 
// REPRESENTANTES
// ================================================================= 

export async function createRepresentante(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado.');

  const data = {
    nombre: formData.get('nombre') as string,
    apellido: formData.get('apellido') as string,
    fechaNacimiento: formData.get('fechaNacimiento') as string,
    direccion: formData.get('direccion') as string,
    telefono: formData.get('telefono') as string,
  };

  if (!data.nombre || !data.apellido) {
    throw new Error('Nombre y apellido son requeridos.');
  }

  const newRepresentante = await db.insert(representantes).values({
    nombre: data.nombre,
    apellido: data.apellido,
    fechaNacimiento: data.fechaNacimiento || null,
    direccion: data.direccion || null,
    telefono: data.telefono || null,
    creadoPorUsuarioId: session.user.id,
  }).returning(); 

  revalidatePath('/dashboard/representantes');
  revalidatePath('/dashboard/registros/nuevo'); 

  return newRepresentante[0];
}

export async function getRepresentantes() {
  return await db.select().from(representantes).orderBy(desc(representantes.createdAt));
}

export async function updateSecuritySettings(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  
  if (!userId) throw new Error('No estás autenticado.');

  const currentPassword = formData.get('currentPassword') as string;
  const question = formData.get('question') as string;
  const answer = formData.get('answer') as string;

  if (!currentPassword || !question || !answer) {
    throw new Error('Todos los campos son obligatorios.');
  }

  // 1. Verificar usuario
  const user = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, userId)
  });

  if (!user) throw new Error('Usuario no encontrado.');

  // 2. Verificar contraseña actual (medida de seguridad vital)
  const isPasswordValid = await bcrypt.compare(currentPassword, user.contrasenaHash);
  if (!isPasswordValid) {
    throw new Error('La contraseña actual es incorrecta. No se pueden guardar los cambios de seguridad.');
  }

  // 3. Hashear la nueva respuesta
  const answerHash = await bcrypt.hash(answer.toLowerCase().trim(), 10);

  // 4. Actualizar base de datos
  await db.update(usuarios).set({ 
    preguntaSeguridad: question,
    respuestaSeguridadHash: answerHash,
  }).where(eq(usuarios.id, userId));

  revalidatePath('/dashboard/perfil');
  return { success: true, message: 'Pregunta de seguridad actualizada correctamente.' };
}