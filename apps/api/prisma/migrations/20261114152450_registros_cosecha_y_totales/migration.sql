-- CreateTable
CREATE TABLE "registros_cosecha" (
    "id" TEXT NOT NULL,
    "campanaId" TEXT NOT NULL,
    "variedad" TEXT,
    "fechaSiembra" TIMESTAMP(3),
    "fechaCosecha" TIMESTAMP(3),
    "haSembradas" DOUBLE PRECISION NOT NULL,
    "haCosechadas" DOUBLE PRECISION,
    "toneladas" DOUBLE PRECISION,
    "origen" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_cosecha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "totales_campana" (
    "id" TEXT NOT NULL,
    "cultivoId" TEXT NOT NULL,
    "temporada" TEXT NOT NULL,
    "rendimientoTotalTnHa" DOUBLE PRECISION,
    "origen" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "totales_campana_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registros_cosecha_campanaId_key" ON "registros_cosecha"("campanaId");

-- CreateIndex
CREATE INDEX "registros_cosecha_origen_idx" ON "registros_cosecha"("origen");

-- CreateIndex
CREATE UNIQUE INDEX "totales_campana_cultivoId_temporada_origen_key" ON "totales_campana"("cultivoId", "temporada", "origen");

-- AddForeignKey
ALTER TABLE "registros_cosecha" ADD CONSTRAINT "registros_cosecha_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "campanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "totales_campana" ADD CONSTRAINT "totales_campana_cultivoId_fkey" FOREIGN KEY ("cultivoId") REFERENCES "cultivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
