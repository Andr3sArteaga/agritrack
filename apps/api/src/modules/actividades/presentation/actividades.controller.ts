import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import { CurrentUsuario } from '../../auth/presentation/decorators/current-usuario.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import type { UsuarioAutenticado } from '../../auth/infrastructure/strategies/jwt.strategy';
import { ActividadResponseDto } from '../application/dto/actividad-response.dto';
import { CreateActividadDto } from '../application/dto/create-actividad.dto';
import { ActividadesService } from '../application/actividades.service';

@ApiTags('actividades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.JEFE, Rol.OPERATIVO)
@Controller('actividades')
export class ActividadesController {
  constructor(private readonly actividadesService: ActividadesService) {}

  @Get()
  findAllPorCampana(
    @Query('campanaId') campanaId: string,
  ): Promise<ActividadResponseDto[]> {
    return this.actividadesService.findAllPorCampana(campanaId);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<ActividadResponseDto> {
    return this.actividadesService.findById(id);
  }

  @Post()
  crear(
    @Body() dto: CreateActividadDto,
    @CurrentUsuario() usuario: UsuarioAutenticado,
  ): Promise<ActividadResponseDto> {
    return this.actividadesService.crear(dto, usuario.id);
  }
}
