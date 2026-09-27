import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { IntegridadService } from '../application/integridad.service';
import { ResultadoVerificacion } from '../application/dto/resultado-verificacion.dto';

@ApiTags('integridad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.JEFE, Rol.CONTABILIDAD)
@Controller('integridad')
export class IntegridadController {
  constructor(private readonly integridadService: IntegridadService) {}

  @Get('global')
  verificarGlobal(): Promise<ResultadoVerificacion> {
    return this.integridadService.verificarGlobal();
  }

  @Get('parcela/:parcelaId')
  verificarPorParcela(
    @Param('parcelaId') parcelaId: string,
  ): Promise<ResultadoVerificacion> {
    return this.integridadService.verificarPorParcela(parcelaId);
  }
}
