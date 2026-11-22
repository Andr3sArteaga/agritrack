import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Rol } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { HistoricoItemDto } from '../application/dto/historico-item.dto';
import { ReporteCampanaQueryDto } from '../application/dto/reporte-campana-query.dto';
import { CostosReporteDto, ReporteCampanaDto } from '../application/dto/reporte-campana.dto';
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

  @Get('campanas/:id/costos')
  @ApiOperation({ summary: 'Resumen de costos de toda la campana (RF-30)' })
  @ApiOkResponse({ type: CostosReporteDto })
  @ApiNotFoundResponse({ description: 'Campana no encontrada' })
  resumenCostos(@Param('id') id: string): Promise<CostosReporteDto> {
    return this.reportesService.resumenCostosCampana(id);
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

  @Get('campanas/:id/pdf')
  @ApiOperation({
    summary: 'Exportar reporte de campana en PDF (RF-44)',
    description:
      'Genera el reporte profesional en PDF del periodo consultado o de la campana completa si no se aplican filtros de fecha.',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Archivo PDF generado' })
  @ApiBadRequestResponse({
    description: 'Fecha con formato invalido o "desde" posterior a "hasta"',
  })
  @ApiNotFoundResponse({ description: 'Campana no encontrada' })
  async exportarPdf(
    @Param('id') id: string,
    @Query() query: ReporteCampanaQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.reportesService.exportarReporteCampanaPdf(
      id,
      query,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get('campanas/:id/excel')
  @ApiOperation({
    summary: 'Exportar reporte de campana en Excel (RF-44)',
    description:
      'Genera el libro Excel (.xlsx) con el resumen y actividades del periodo consultado o de la campana completa si no se aplican filtros de fecha.',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOkResponse({ description: 'Archivo Excel (.xlsx) generado' })
  @ApiBadRequestResponse({
    description: 'Fecha con formato invalido o "desde" posterior a "hasta"',
  })
  @ApiNotFoundResponse({ description: 'Campana no encontrada' })
  async exportarExcel(
    @Param('id') id: string,
    @Query() query: ReporteCampanaQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } =
      await this.reportesService.exportarReporteCampanaExcel(id, query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
