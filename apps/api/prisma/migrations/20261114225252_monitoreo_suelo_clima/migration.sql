-- CreateEnum
CREATE TYPE "CondicionClima" AS ENUM ('SOLEADO', 'NUBLADO', 'LLUVIA_LIGERA', 'LLUVIA_FUERTE', 'HELADA', 'GRANIZO', 'VIENTO_FUERTE');

-- CreateTable
CREATE TABLE "analisis_suelo" (
    "id" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "ph" DOUBLE PRECISION,
    "nitrogeno" DOUBLE PRECISION,
    "fosforo" DOUBLE PRECISION,
    "potasio" DOUBLE PRECISION,
    "materiaOrganica" DOUBLE PRECISION,
    "notas" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analisis_suelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_clima" (
    "id" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "condicion" "CondicionClima" NOT NULL,
    "lluviaMm" DOUBLE PRECISION,
    "notas" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_clima_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analisis_suelo_parcelaId_fecha_idx" ON "analisis_suelo"("parcelaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "registros_clima_parcelaId_fecha_key" ON "registros_clima"("parcelaId", "fecha");

-- AddForeignKey
ALTER TABLE "analisis_suelo" ADD CONSTRAINT "analisis_suelo_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_suelo" ADD CONSTRAINT "analisis_suelo_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_clima" ADD CONSTRAINT "registros_clima_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_clima" ADD CONSTRAINT "registros_clima_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
