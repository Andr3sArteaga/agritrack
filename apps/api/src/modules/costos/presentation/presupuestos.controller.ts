import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { PresupuestoResponseDto } from '../application/dto/presupuesto-response.dto';
import { UpsertPresupuestoDto } from '../application/dto/upsert-presupuesto.dto';
import { PresupuestosService } from '../application/presupuestos.service';

@ApiTags('presupuestos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.JEFE, Rol.CONTABILIDAD)
@Controller('presupuestos')
export class PresupuestosController {
  constructor(private readonly presupuestosService: PresupuestosService) {}

  @Get('campana/:campanaId')
  @ApiOperation({ summary: 'Presupuesto de la campana (404 si aun no tiene)' })
  @ApiOkResponse({ type: PresupuestoResponseDto })
  obtener(@Param('campanaId') campanaId: string): Promise<PresupuestoResponseDto> {
    return this.presupuestosService.obtener(campanaId);
  }

  @Put('campana/:campanaId')
  @ApiOperation({ summary: 'Crea o reemplaza el presupuesto total de la campana' })
  @ApiOkResponse({ type: PresupuestoResponseDto })
  guardar(
    @Param('campanaId') campanaId: string,
    @Body() dto: UpsertPresupuestoDto,
  ): Promise<PresupuestoResponseDto> {
    return this.presupuestosService.guardar(campanaId, dto);
  }
}
