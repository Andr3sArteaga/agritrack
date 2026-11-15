-- CreateTable
CREATE TABLE "modelos_ia" (
    "id" TEXT NOT NULL,
    "cultivoId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "origenDatos" TEXT NOT NULL,
    "campanasUsadas" JSONB NOT NULL,
    "hashDatos" TEXT NOT NULL,
    "predictores" JSONB NOT NULL,
    "categoriasVariedad" JSONB NOT NULL,
    "medianaDiasSiembra" DOUBLE PRECISION,
    "metricas" JSONB NOT NULL,
    "modelo" JSONB NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'experimental',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modelos_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "modelos_ia_cultivoId_estado_idx" ON "modelos_ia"("cultivoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "modelos_ia_cultivoId_version_key" ON "modelos_ia"("cultivoId", "version");

-- AddForeignKey
ALTER TABLE "modelos_ia" ADD CONSTRAINT "modelos_ia_cultivoId_fkey" FOREIGN KEY ("cultivoId") REFERENCES "cultivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
