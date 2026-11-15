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
import {
  GuardarRegistroCosechaDto,
  RegistroCosechaResponseDto,
} from '../application/dto/registro-cosecha.dto';
import { EstimacionService } from '../application/estimacion.service';

@ApiTags('campanas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('campanas')
export class RegistroCosechaController {
  constructor(private readonly estimacionService: EstimacionService) {}

  @Get(':id/registro-cosecha')
  @Roles(Rol.JEFE, Rol.CONTABILIDAD, Rol.OPERATIVO)
  @ApiOperation({
    summary:
      'Obtiene los datos de siembra y cosecha registrados para una campaña (tabla registros_cosecha)',
  })
  @ApiOkResponse({ type: RegistroCosechaResponseDto })
  obtener(@Param('id') campanaId: string): Promise<RegistroCosechaResponseDto | null> {
    return this.estimacionService.obtenerRegistroCosecha(campanaId);
  }

  @Put(':id/registro-cosecha')
  @Roles(Rol.JEFE, Rol.OPERATIVO)
  @ApiOperation({
    summary:
      'Registra o actualiza los datos de siembra y/o cosecha de una campaña (origen real)',
  })
  @ApiOkResponse({ type: RegistroCosechaResponseDto })
  guardar(
    @Param('id') campanaId: string,
    @Body() dto: GuardarRegistroCosechaDto,
  ): Promise<RegistroCosechaResponseDto> {
    return this.estimacionService.guardarRegistroCosecha(campanaId, dto);
  }
}
