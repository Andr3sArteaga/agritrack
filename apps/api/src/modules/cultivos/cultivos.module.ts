import { Module } from '@nestjs/common';
import { CULTIVO_REPOSITORY } from './domain/repositories/cultivo.repository';
import { CultivoPrismaRepository } from './infrastructure/cultivo.prisma.repository';
import { CultivosService } from './application/cultivos.service';
import { CultivosController } from './presentation/cultivos.controller';

@Module({
  controllers: [CultivosController],
  providers: [
    CultivosService,
    { provide: CULTIVO_REPOSITORY, useClass: CultivoPrismaRepository },
  ],
  exports: [CultivosService, CULTIVO_REPOSITORY],
})
export class CultivosModule {}
