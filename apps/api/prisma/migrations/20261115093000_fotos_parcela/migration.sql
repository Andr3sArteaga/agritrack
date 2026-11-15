-- CreateTable
CREATE TABLE "fotos_parcela" (
    "id" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "imagenData" TEXT NOT NULL,
    "descripcion" TEXT,
    "visibleEnPreventa" BOOLEAN NOT NULL DEFAULT true,
    "subidaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_parcela_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fotos_parcela_parcelaId_createdAt_idx" ON "fotos_parcela"("parcelaId", "createdAt");

-- CreateIndex
CREATE INDEX "fotos_parcela_parcelaId_visibleEnPreventa_idx" ON "fotos_parcela"("parcelaId", "visibleEnPreventa");

-- AddForeignKey
ALTER TABLE "fotos_parcela" ADD CONSTRAINT "fotos_parcela_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_parcela" ADD CONSTRAINT "fotos_parcela_subidaPorId_fkey" FOREIGN KEY ("subidaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
