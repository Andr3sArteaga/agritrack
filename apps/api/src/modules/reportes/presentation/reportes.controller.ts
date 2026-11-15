import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { HistoricoItemDto } from '../application/dto/historico-item.dto';
import { ReporteCampanaQueryDto } from '../application/dto/reporte-campana-query.dto';
import { ReporteCampanaDto } from '../application/dto/reporte-campana.dto';
import { ResumenDashboardDto } from '../application/dto/resumen-dashboard.dto';
import { ReportesService } from '../application/reportes.service';

@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.JEFE, Rol.CONTABILIDAD)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('historico')
  historico(
    @Query('parcelaId') parcelaId?: string,
    @Query('cultivoId') cultivoId?: string,
  ): Promise<HistoricoItemDto[]> {
    return this.reportesService.historicoRendimiento(parcelaId, cultivoId);
  }

  @Get('dashboard')
  dashboard(): Promise<ResumenDashboardDto> {
    return this.reportesService.resumenDashboard();
  }

  @Get('campanas/:id')
  @ApiOperation({
    summary: 'Reporte por campana (RF-42)',
    description:
      'Datos de la campana, actividades vigentes y costos del periodo consultado, con la fecha de generacion. Sin desde/hasta se usa el periodo completo de la campana.',
  })
  @ApiOkResponse({ type: ReporteCampanaDto })
  @ApiBadRequestResponse({
    description: 'Fecha con formato invalido o "desde" posterior a "hasta"',
  })
  @ApiNotFoundResponse({ description: 'Campana no encontrada' })
  reporteCampana(
    @Param('id') id: string,
    @Query() query: ReporteCampanaQueryDto,
  ): Promise<ReporteCampanaDto> {
    return this.reportesService.reporteCampana(id, query);
  }
}
