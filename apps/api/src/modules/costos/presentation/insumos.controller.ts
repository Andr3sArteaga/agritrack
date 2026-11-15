import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CreateInsumoDto } from '../application/dto/create-insumo.dto';
import { CreatePrecioInsumoDto } from '../application/dto/create-precio-insumo.dto';
import { InsumoResponseDto } from '../application/dto/insumo-response.dto';
import { ListarInsumosQueryDto } from '../application/dto/listar-insumos-query.dto';
import { PrecioInsumoResponseDto } from '../application/dto/precio-insumo-response.dto';
import { UpdateInsumoDto } from '../application/dto/update-insumo.dto';
import { InsumosService } from '../application/insumos.service';

@ApiTags('insumos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.JEFE, Rol.CONTABILIDAD)
@Controller('insumos')
export class InsumosController {
  constructor(private readonly insumosService: InsumosService) {}

  @Get()
  @ApiOperation({ summary: 'Catalogo de insumos con su precio vigente' })
  @ApiOkResponse({ type: [InsumoResponseDto] })
  findAll(@Query() filtros: ListarInsumosQueryDto): Promise<InsumoResponseDto[]> {
    return this.insumosService.findAll(filtros);
  }

  @Get(':id')
  @ApiOkResponse({ type: InsumoResponseDto })
  findById(@Param('id') id: string): Promise<InsumoResponseDto> {
    return this.insumosService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un insumo con su precio inicial' })
  @ApiCreatedResponse({ type: InsumoResponseDto })
  create(@Body() dto: CreateInsumoDto): Promise<InsumoResponseDto> {
    return this.insumosService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edita datos del insumo o lo desactiva (no cambia precios)',
  })
  @ApiOkResponse({ type: InsumoResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInsumoDto,
  ): Promise<InsumoResponseDto> {
    return this.insumosService.update(id, dto);
  }

  @Get(':id/precios')
  @ApiOperation({ summary: 'Historial de precios (del mas reciente al mas antiguo)' })
  @ApiOkResponse({ type: [PrecioInsumoResponseDto] })
  listarPrecios(@Param('id') id: string): Promise<PrecioInsumoResponseDto[]> {
    return this.insumosService.listarPrecios(id);
  }

  @Post(':id/precios')
  @ApiOperation({
    summary: 'Registra un nuevo precio unitario (el historial es de solo agregado)',
  })
  @ApiCreatedResponse({ type: PrecioInsumoResponseDto })
  agregarPrecio(
    @Param('id') id: string,
    @Body() dto: CreatePrecioInsumoDto,
  ): Promise<PrecioInsumoResponseDto> {
    return this.insumosService.agregarPrecio(id, dto);
  }
}
