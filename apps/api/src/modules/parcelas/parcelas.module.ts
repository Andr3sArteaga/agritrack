import { Module } from '@nestjs/common';
import { PARCELA_REPOSITORY } from './domain/repositories/parcela.repository';
import { ParcelaPrismaRepository } from './infrastructure/parcela.prisma.repository';
import { ParcelasService } from './application/parcelas.service';
import { ParcelasController } from './presentation/parcelas.controller';

@Module({
  controllers: [ParcelasController],
  providers: [
    ParcelasService,
    { provide: PARCELA_REPOSITORY, useClass: ParcelaPrismaRepository },
  ],
  exports: [ParcelasService, PARCELA_REPOSITORY],
})
export class ParcelasModule {}
