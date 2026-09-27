-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('JEFE', 'CONTABILIDAD', 'OPERATIVO');

-- CreateEnum
CREATE TYPE "EstadoCampana" AS ENUM ('PLANIFICADA', 'EN_CURSO', 'COSECHADA');

-- CreateEnum
CREATE TYPE "TipoActividad" AS ENUM ('SIEMBRA', 'FUMIGACION', 'FERTILIZACION', 'MEDICION_HUMEDAD_SUELO', 'MEDICION_HUMEDAD_GRANO', 'COSECHA');

-- CreateEnum
CREATE TYPE "TipoContacto" AS ENUM ('COMPRADOR', 'TRANSPORTISTA', 'MAQUINARIA', 'INSUMOS', 'SERVICIOS', 'OTRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "hectareas" DOUBLE PRECISION NOT NULL,
    "ubicacionTexto" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "disponibleParaPreventa" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultivos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cultivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanas" (
    "id" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "cultivoId" TEXT NOT NULL,
    "temporada" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "estado" "EstadoCampana" NOT NULL DEFAULT 'PLANIFICADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades" (
    "id" TEXT NOT NULL,
    "secuencia" SERIAL NOT NULL,
    "campanaId" TEXT NOT NULL,
    "tipo" "TipoActividad" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "insumo" TEXT,
    "cantidad" DOUBLE PRECISION,
    "unidad" TEXT,
    "responsableId" TEXT NOT NULL,
    "tercerizado" BOOLEAN NOT NULL DEFAULT false,
    "maquinariaUtilizada" TEXT,
    "rendimientoTnHa" DOUBLE PRECISION,
    "correccionDeId" TEXT,
    "motivoCorreccion" TEXT,
    "hash" TEXT NOT NULL,
    "hashAnterior" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoContacto" NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contactos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "parcelas_disponibleParaPreventa_idx" ON "parcelas"("disponibleParaPreventa");

-- CreateIndex
CREATE INDEX "parcelas_activa_idx" ON "parcelas"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "cultivos_nombre_key" ON "cultivos"("nombre");

-- CreateIndex
CREATE INDEX "campanas_parcelaId_idx" ON "campanas"("parcelaId");

-- CreateIndex
CREATE INDEX "campanas_cultivoId_idx" ON "campanas"("cultivoId");

-- CreateIndex
CREATE INDEX "campanas_estado_idx" ON "campanas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "actividades_secuencia_key" ON "actividades"("secuencia");

-- CreateIndex
CREATE INDEX "actividades_campanaId_idx" ON "actividades"("campanaId");

-- CreateIndex
CREATE INDEX "actividades_responsableId_idx" ON "actividades"("responsableId");

-- CreateIndex
CREATE INDEX "actividades_tipo_idx" ON "actividades"("tipo");

-- CreateIndex
CREATE INDEX "contactos_tipo_idx" ON "contactos"("tipo");

-- AddForeignKey
ALTER TABLE "campanas" ADD CONSTRAINT "campanas_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanas" ADD CONSTRAINT "campanas_cultivoId_fkey" FOREIGN KEY ("cultivoId") REFERENCES "cultivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "campanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_correccionDeId_fkey" FOREIGN KEY ("correccionDeId") REFERENCES "actividades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex (partial unique index, no expresable en schema.prisma)
-- Regla de negocio: una parcela solo puede tener una campana EN_CURSO a la vez.
-- El service (CampanasService) valida esto antes de escribir; este indice es
-- una red de seguridad a nivel de base de datos contra condiciones de carrera.
CREATE UNIQUE INDEX "campanas_parcela_en_curso_unica" ON "campanas"("parcelaId") WHERE "estado" = 'EN_CURSO';
