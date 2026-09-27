import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { HistoricoItemDto } from '../application/dto/historico-item.dto';
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
}
