import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import type { UsuarioAutenticado } from '../../auth/infrastructure/strategies/jwt.strategy';
import { CurrentUsuario } from '../../auth/presentation/decorators/current-usuario.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import {
  CrearAnalisisSueloDto,
  CrearRegistroClimaDto,
  ListarMonitoreoQueryDto,
} from '../application/dto/monitoreo.dto';
import { MonitoreoService } from '../application/monitoreo.service';
import type {
  AnalisisSuelo,
  RegistroClima,
} from '../domain/repositories/monitoreo.repository';

@ApiTags('monitoreo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('monitoreo')
export class MonitoreoController {
  constructor(private readonly monitoreoService: MonitoreoService) {}

  @Get('suelo')
  @Roles(Rol.JEFE, Rol.CONTABILIDAD, Rol.OPERATIVO)
  @ApiOperation({ summary: 'Analisis de suelo de una parcela, del mas reciente al mas antiguo' })
  listarSuelo(@Query() consulta: ListarMonitoreoQueryDto): Promise<AnalisisSuelo[]> {
    return this.monitoreoService.listarSuelo(consulta.parcelaId);
  }

  @Post('suelo')
  @Roles(Rol.JEFE, Rol.OPERATIVO)
  @ApiOperation({ summary: 'Registra un analisis de suelo (al menos un valor)' })
  crearSuelo(
    @Body() dto: CrearAnalisisSueloDto,
    @CurrentUsuario() usuario: UsuarioAutenticado,
  ): Promise<AnalisisSuelo> {
    return this.monitoreoService.crearSuelo(dto, usuario.id);
  }

  @Get('clima')
  @Roles(Rol.JEFE, Rol.CONTABILIDAD, Rol.OPERATIVO)
  @ApiOperation({ summary: 'Clima anotado de una parcela, del mas reciente al mas antiguo' })
  listarClima(@Query() consulta: ListarMonitoreoQueryDto): Promise<RegistroClima[]> {
    return this.monitoreoService.listarClima(consulta.parcelaId, consulta.desde);
  }

  @Post('clima')
  @Roles(Rol.JEFE, Rol.OPERATIVO)
  @ApiOperation({
    summary: 'Anota el clima de un dia. Si ese dia ya estaba anotado, lo reemplaza',
  })
  guardarClima(
    @Body() dto: CrearRegistroClimaDto,
    @CurrentUsuario() usuario: UsuarioAutenticado,
  ): Promise<RegistroClima> {
    return this.monitoreoService.guardarClima(dto, usuario.id);
  }
}
