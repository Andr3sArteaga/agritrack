-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('PENDIENTE', 'ACTIVO');

-- AlterTable
ALTER TABLE "usuarios"
ADD COLUMN "apellido" TEXT,
ADD COLUMN "telefono" TEXT,
ADD COLUMN "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO';

-- CreateIndex
CREATE INDEX "usuarios_estado_idx" ON "usuarios"("estado");
