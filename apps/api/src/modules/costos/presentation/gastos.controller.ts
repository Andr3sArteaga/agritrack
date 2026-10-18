import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import type { UsuarioAutenticado } from '../../auth/infrastructure/strategies/jwt.strategy';
import { CurrentUsuario } from '../../auth/presentation/decorators/current-usuario.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { AnularGastoDto } from '../application/dto/anular-gasto.dto';
import { CreateGastoDto } from '../application/dto/create-gasto.dto';
import { GastoResponseDto } from '../application/dto/gasto-response.dto';
import { ListarGastosQueryDto } from '../application/dto/listar-gastos-query.dto';
import { UpdateGastoDto } from '../application/dto/update-gasto.dto';
import { GastosService } from '../application/gastos.service';

@ApiTags('gastos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.JEFE, Rol.CONTABILIDAD)
@Controller('gastos')
export class GastosController {
  constructor(private readonly gastosService: GastosService) {}

  @Get()
  @ApiOperation({ summary: 'Gastos de una campana (por defecto sin anulados)' })
  @ApiOkResponse({ type: [GastoResponseDto] })
  listar(@Query() filtros: ListarGastosQueryDto): Promise<GastoResponseDto[]> {
    return this.gastosService.listar(filtros);
  }

  @Get(':id')
  @ApiOkResponse({ type: GastoResponseDto })
  findById(@Param('id') id: string): Promise<GastoResponseDto> {
    return this.gastosService.findById(id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Registra un gasto. Con insumoId el monto se calcula (cantidad x precio vigente a la fecha)',
  })
  @ApiCreatedResponse({ type: GastoResponseDto })
  crear(
    @Body() dto: CreateGastoDto,
    @CurrentUsuario() usuario: UsuarioAutenticado,
  ): Promise<GastoResponseDto> {
    return this.gastosService.crear(dto, usuario.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edita categoria, descripcion, monto, fecha o estado (pagado/comprometido)',
  })
  @ApiOkResponse({ type: GastoResponseDto })
  editar(
    @Param('id') id: string,
    @Body() dto: UpdateGastoDto,
  ): Promise<GastoResponseDto> {
    return this.gastosService.editar(id, dto);
  }

  @Post(':id/anular')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Anula un gasto con motivo obligatorio. No existe DELETE: los anulados no cuentan en los totales',
  })
  @ApiOkResponse({ type: GastoResponseDto })
  anular(
    @Param('id') id: string,
    @Body() dto: AnularGastoDto,
  ): Promise<GastoResponseDto> {
    return this.gastosService.anular(id, dto);
  }
}
