-- CreateEnum
CREATE TYPE "TipoInsumo" AS ENUM ('SEMILLA', 'FERTILIZANTE', 'AGROQUIMICO', 'COMBUSTIBLE');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('INSUMOS', 'SERVICIO_TERCERIZADO', 'MAQUINARIA', 'MANO_DE_OBRA', 'OTROS');

-- CreateEnum
CREATE TYPE "EstadoGasto" AS ENUM ('PAGADO', 'COMPROMETIDO');

-- CreateTable
CREATE TABLE "insumos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoInsumo" NOT NULL,
    "unidad" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precios_insumo" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "precios_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" TEXT NOT NULL,
    "campanaId" TEXT NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoGasto" NOT NULL,
    "insumoId" TEXT,
    "cantidad" DOUBLE PRECISION,
    "precioUnitario" DOUBLE PRECISION,
    "registradoPorId" TEXT NOT NULL,
    "anulado" BOOLEAN NOT NULL DEFAULT false,
    "motivoAnulacion" TEXT,
    "anuladoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presupuestos" (
    "id" TEXT NOT NULL,
    "campanaId" TEXT NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presupuestos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insumos_nombre_key" ON "insumos"("nombre");

-- CreateIndex
CREATE INDEX "insumos_tipo_idx" ON "insumos"("tipo");

-- CreateIndex
CREATE INDEX "precios_insumo_insumoId_vigenteDesde_idx" ON "precios_insumo"("insumoId", "vigenteDesde");

-- CreateIndex
CREATE INDEX "gastos_campanaId_anulado_idx" ON "gastos"("campanaId", "anulado");

-- CreateIndex
CREATE INDEX "gastos_estado_idx" ON "gastos"("estado");

-- CreateIndex
CREATE INDEX "gastos_insumoId_idx" ON "gastos"("insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "presupuestos_campanaId_key" ON "presupuestos"("campanaId");

-- AddForeignKey
ALTER TABLE "precios_insumo" ADD CONSTRAINT "precios_insumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "campanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "campanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
