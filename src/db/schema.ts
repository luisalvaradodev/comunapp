// lib/db/schema.ts

import { pgTable, text, timestamp, pgEnum, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from '@paralleldrive/cuid2';

// --- ENUMS ---

// Define la función del GESTOR, no del beneficiario.
export const roleEnum = pgEnum("rol", ["Admin", "Gestor Adulto Mayor", "Gestor Discapacidad"]);

export const civilStatusEnum = pgEnum("estado_civil", ["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a"]);

// --- TABLAS PRINCIPALES ---

// Tabla para el Consejo Comunal (Entidad organizativa)
export const consejosComunales = pgTable("consejos_comunales", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  nombre: text("nombre").notNull(),
  parroquia: text("parroquia").notNull(),
  municipio: text("municipio").notNull(),
  estado: text("estado").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabla de Usuarios (solo para los miembros del Consejo Comunal que administran el sistema)
export const usuarios = pgTable("usuarios", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  nombreUsuario: text("nombre_usuario").unique().notNull(),
  contrasenaHash: text("contrasena_hash").notNull(),
  rol: roleEnum("rol").notNull(),
  consejoComunalId: text("consejo_comunal_id").references(() => consejosComunales.id, { onDelete: 'set null' }),
  
  // --- NUEVOS CAMPOS DE SEGURIDAD ---
  preguntaSeguridad: text("pregunta_seguridad").notNull().default("¿Cuál es el nombre de tu primera mascota?"),
  respuestaSeguridadHash: text("respuesta_seguridad_hash").notNull().default(""), // Se guardará encriptada igual que la contraseña
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- TABLAS DE DATOS GESTIONADOS (Beneficiarios y otros) ---

// Tabla para el perfil de Adultos Mayores
export const adultosMayores = pgTable("adultos_mayores", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  fechaNacimiento: date("fecha_nacimiento"),
  etniaAborigen: text("etnia_aborigen"),
  direccion: text("direccion"),
  telefono: text("telefono"),
  correoElectronico: text("correo_electronico"),
  estadoCivil: civilStatusEnum("estado_civil"),
  descripcionSalud: text("descripcion_salud"),
  // Campo para saber qué administrador creó el registro (auditoría)
  creadoPorUsuarioId: text("creado_por_usuario_id").references(() => usuarios.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabla para el perfil de Representantes
export const representantes = pgTable("representantes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  fechaNacimiento: date("fecha_nacimiento"),
  direccion: text("direccion"),
  telefono: text("telefono"),
  // Campo para saber qué administrador creó el registro
  creadoPorUsuarioId: text("creado_por_usuario_id").references(() => usuarios.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabla para el perfil de Personas con Discapacidad
export const personasConDiscapacidad = pgTable("personas_con_discapacidad", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  fechaNacimiento: date("fecha_nacimiento"),
  etniaAborigen: text("etnia_aborigen"),
  tipoDiscapacidad: text("tipo_discapacidad"),
  gradoDiscapacidad: text("grado_discapacidad"),
  certificacionMedica: text("certificacion_medica"),
  direccion: text("direccion"),
  telefono: text("telefono"),
  correoElectronico: text("correo_electronico"),
  estadoCivil: civilStatusEnum("estado_civil"),
  // Campo para saber qué administrador creó el registro
  creadoPorUsuarioId: text("creado_por_usuario_id").references(() => usuarios.id, { onDelete: 'set null' }),
  // Una persona puede tener un representante
  representanteId: text("representante_id").references(() => representantes.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabla de Documentos de los beneficiarios
export const documentos = pgTable("documentos", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tipo: text("tipo").notNull(),
  archivo: text("archivo").notNull(), // URL o path al archivo
  fechaEmision: date("fecha_emision"),
  // Un documento puede pertenecer a un adulto mayor O a una persona con discapacidad
  adultoMayorId: text("adulto_mayor_id").references(() => adultosMayores.id, { onDelete: 'cascade' }),
  personaConDiscapacidadId: text("persona_con_discapacidad_id").references(() => personasConDiscapacidad.id, { onDelete: 'cascade' }),
  // Guardamos qué administrador subió el documento
  subidoPorUsuarioId: text("subido_por_usuario_id").references(() => usuarios.id, { onDelete: 'set null' }),
});

// Tabla de Solicitudes (mantenemos para reportes)
export const solicitudes = pgTable("solicitudes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  descripcion: text("descripcion").notNull(),
  prioridad: text("prioridad").notNull().default("Media"),
  estado: text("estado").notNull().default("Pendiente"),
  // Puede estar asociada a un adulto mayor O persona con discapacidad
  adultoMayorId: text("adulto_mayor_id").references(() => adultosMayores.id, { onDelete: 'cascade' }),
  personaConDiscapacidadId: text("persona_con_discapacidad_id").references(() => personasConDiscapacidad.id, { onDelete: 'cascade' }),
  creadaPorUsuarioId: text("creada_por_usuario_id").references(() => usuarios.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- DEFINICIÓN DE RELACIONES ---

export const consejosComunalesRelations = relations(consejosComunales, ({ many }) => ({
  usuarios: many(usuarios),
}));

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  consejoComunal: one(consejosComunales, {
    fields: [usuarios.consejoComunalId],
    references: [consejosComunales.id],
  }),
  // Un usuario (Admin) puede haber creado MUCHOS registros
  adultosMayoresCreados: many(adultosMayores),
  personasConDiscapacidadCreadas: many(personasConDiscapacidad),
  representantesCreados: many(representantes),
  documentosSubidos: many(documentos),
  solicitudesCreadas: many(solicitudes),
}));

export const adultosMayoresRelations = relations(adultosMayores, ({ one, many }) => ({
  // Un adulto mayor fue creado por UN solo usuario (Admin)
  creadoPor: one(usuarios, {
    fields: [adultosMayores.creadoPorUsuarioId],
    references: [usuarios.id],
  }),
  documentos: many(documentos),
  solicitudes: many(solicitudes),
}));

export const representantesRelations = relations(representantes, ({ one, many }) => ({
  creadoPor: one(usuarios, {
    fields: [representantes.creadoPorUsuarioId],
    references: [usuarios.id],
  }),
  // Un representante puede estar asociado a MUCHAS personas (si es el mismo padre/madre para varios hijos)
  representados: many(personasConDiscapacidad),
}));

export const personasConDiscapacidadRelations = relations(personasConDiscapacidad, ({ one, many }) => ({
  // Una persona con discapacidad fue creada por UN usuario (Admin)
  creadoPor: one(usuarios, {
    fields: [personasConDiscapacidad.creadoPorUsuarioId],
    references: [usuarios.id],
  }),
  // Una persona con discapacidad tiene UN representante
  representante: one(representantes, {
    fields: [personasConDiscapacidad.representanteId],
    references: [representantes.id],
  }),
  documentos: many(documentos),
  solicitudes: many(solicitudes),
}));

export const documentosRelations = relations(documentos, ({ one }) => ({
  adultoMayor: one(adultosMayores, {
    fields: [documentos.adultoMayorId],
    references: [adultosMayores.id],
  }),
  personaConDiscapacidad: one(personasConDiscapacidad, {
    fields: [documentos.personaConDiscapacidadId],
    references: [personasConDiscapacidad.id],
  }),
  subidoPor: one(usuarios, {
    fields: [documentos.subidoPorUsuarioId],
    references: [usuarios.id],
  }),
}));

export const solicitudesRelations = relations(solicitudes, ({ one }) => ({
  adultoMayor: one(adultosMayores, {
    fields: [solicitudes.adultoMayorId],
    references: [adultosMayores.id],
  }),
  personaConDiscapacidad: one(personasConDiscapacidad, {
    fields: [solicitudes.personaConDiscapacidadId],
    references: [personasConDiscapacidad.id],
  }),
  creadaPor: one(usuarios, {
    fields: [solicitudes.creadaPorUsuarioId],
    references: [usuarios.id],
  }),
}));