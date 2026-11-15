import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import type { UsuarioAutenticado } from '../../auth/infrastructure/strategies/jwt.strategy';
import { CurrentUsuario } from '../../auth/presentation/decorators/current-usuario.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import {
  CreateFotoParcelaDto,
  FotoParcelaResponseDto,
  UpdateFotoParcelaDto,
} from '../application/dto/foto-parcela.dto';
import { CreateParcelaDto } from '../application/dto/create-parcela.dto';
import { ParcelaResponseDto } from '../application/dto/parcela-response.dto';
import { UpdateParcelaDto } from '../application/dto/update-parcela.dto';
import { ParcelasService } from '../application/parcelas.service';

@ApiTags('parcelas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parcelas')
export class ParcelasController {
  constructor(private readonly parcelasService: ParcelasService) {}

  @Get()
  findAll(): Promise<ParcelaResponseDto[]> {
    return this.parcelasService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<ParcelaResponseDto> {
    return this.parcelasService.findById(id);
  }

  @Post()
  @Roles(Rol.JEFE)
  create(@Body() dto: CreateParcelaDto): Promise<ParcelaResponseDto> {
    return this.parcelasService.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.JEFE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateParcelaDto,
  ): Promise<ParcelaResponseDto> {
    return this.parcelasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.JEFE)
  desactivar(@Param('id') id: string): Promise<ParcelaResponseDto> {
    return this.parcelasService.desactivar(id);
  }

  @Get(':id/fotos')
  @Roles(Rol.JEFE, Rol.CONTABILIDAD, Rol.OPERATIVO)
  @ApiOperation({ summary: 'Lista las fotos cargadas de una parcela' })
  listarFotos(@Param('id') id: string): Promise<FotoParcelaResponseDto[]> {
    return this.parcelasService.listarFotos(id);
  }

  @Post(':id/fotos')
  @Roles(Rol.JEFE, Rol.OPERATIVO)
  @ApiOperation({ summary: 'Sube una foto comprimida para la parcela' })
  agregarFoto(
    @Param('id') id: string,
    @Body() dto: CreateFotoParcelaDto,
    @CurrentUsuario() usuario: UsuarioAutenticado,
  ): Promise<FotoParcelaResponseDto> {
    return this.parcelasService.agregarFoto(id, dto, usuario.id);
  }

  @Patch(':id/fotos/:fotoId')
  @Roles(Rol.JEFE, Rol.OPERATIVO)
  @ApiOperation({
    summary: 'Actualiza la descripcion o visibilidad en preventa de una foto',
  })
  actualizarFoto(
    @Param('id') id: string,
    @Param('fotoId') fotoId: string,
    @Body() dto: UpdateFotoParcelaDto,
  ): Promise<FotoParcelaResponseDto> {
    return this.parcelasService.actualizarFoto(id, fotoId, dto);
  }

  @Delete(':id/fotos/:fotoId')
  @Roles(Rol.JEFE, Rol.OPERATIVO)
  @ApiOperation({ summary: 'Elimina una foto de la parcela' })
  eliminarFoto(
    @Param('id') id: string,
    @Param('fotoId') fotoId: string,
  ): Promise<void> {
    return this.parcelasService.eliminarFoto(id, fotoId);
  }
}
