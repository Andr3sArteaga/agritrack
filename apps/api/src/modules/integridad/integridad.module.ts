import { Module } from '@nestjs/common';
import { ActividadesModule } from '../actividades/actividades.module';
import { IntegridadService } from './application/integridad.service';
import { IntegridadController } from './presentation/integridad.controller';

@Module({
  imports: [ActividadesModule],
  controllers: [IntegridadController],
  providers: [IntegridadService],
  exports: [IntegridadService],
})
export class IntegridadModule {}
