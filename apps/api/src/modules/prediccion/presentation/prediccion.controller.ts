import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { PrediccionService } from '../application/prediccion.service';
import type { PrediccionResultado } from '../domain/ports/predictor.port';

@ApiTags('prediccion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prediccion')
export class PrediccionController {
  constructor(private readonly prediccionService: PrediccionService) {}

  @Get()
  predecir(
    @Query('parcelaId') parcelaId: string,
    @Query('cultivoId') cultivoId: string,
  ): Promise<PrediccionResultado> {
    return this.prediccionService.predecir(parcelaId, cultivoId);
  }
}
