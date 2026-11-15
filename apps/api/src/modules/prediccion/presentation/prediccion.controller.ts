import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
import {
  CultivoQueryDto,
  EstimacionQueryDto,
  ModelosQueryDto,
} from '../application/dto/consultas-prediccion.dto';
import { EstimacionResponseDto } from '../application/dto/estimacion-response.dto';
import {
  ImpactoQueryDto,
  ImpactoResponseDto,
  PrepararParcelaDevDto,
  PrepararParcelaDevResponseDto,
} from '../application/dto/impacto-prediccion.dto';
import { ModeloIaResponseDto } from '../application/dto/modelo-ia-response.dto';
import { EntrenamientoService } from '../application/entrenamiento.service';
import { EstimacionService } from '../application/estimacion.service';
import { PrediccionService } from '../application/prediccion.service';
import type { PrediccionResultado } from '../domain/ports/predictor.port';

@ApiTags('prediccion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prediccion')
export class PrediccionController {
  constructor(
    private readonly prediccionService: PrediccionService,
    private readonly estimacionService: EstimacionService,
    private readonly entrenamientoService: EntrenamientoService,
  ) {}

  // Endpoint original: no cambia (lo usan el panel y la parte publica).
  @Get()
  predecir(
    @Query('parcelaId') parcelaId: string,
    @Query('cultivoId') cultivoId: string,
  ): Promise<PrediccionResultado> {
    return this.prediccionService.predecir(parcelaId, cultivoId);
  }

  @Get('estimacion')
  @UseGuards(RolesGuard)
  @Roles(Rol.JEFE, Rol.CONTABILIDAD, Rol.OPERATIVO)
  @ApiOperation({
    summary:
      'Estimacion de rendimiento de un lote en una campaña: linea base (oficial) y modelo (experimental)',
  })
  @ApiOkResponse({ type: EstimacionResponseDto })
  estimar(@Query() consulta: EstimacionQueryDto): Promise<EstimacionResponseDto> {
    return this.estimacionService.estimar(consulta.lote, consulta.campana);
  }

  @Get('impacto')
  @UseGuards(RolesGuard)
  @Roles(Rol.JEFE, Rol.CONTABILIDAD, Rol.OPERATIVO)
  @ApiOperation({
    summary:
      'Analisis de impacto en tiempo real de las variables ingresadas sobre la produccion estimada',
  })
  @ApiOkResponse({ type: ImpactoResponseDto })
  analizarImpacto(
    @Query() consulta: ImpactoQueryDto,
  ): Promise<ImpactoResponseDto> {
    return this.estimacionService.analizarImpacto(consulta);
  }

  @Get('modelos')
  @UseGuards(RolesGuard)
  @Roles(Rol.JEFE)
  @ApiOperation({ summary: 'Versiones del modelo con estado y metricas' })
  @ApiOkResponse({ type: [ModeloIaResponseDto] })
  async listarModelos(
    @Query() consulta: ModelosQueryDto,
  ): Promise<ModeloIaResponseDto[]> {
    const modelos = await this.estimacionService.listarModelos(consulta.cultivo);
    return modelos.map((modelo) => ModeloIaResponseDto.fromDomain(modelo));
  }

  @Post('entrenar')
  @UseGuards(RolesGuard)
  @Roles(Rol.JEFE)
  @ApiOperation({
    summary:
      'Entrena y evalua (walk-forward) el modelo de un cultivo y guarda una version nueva',
  })
  @ApiCreatedResponse({ type: ModeloIaResponseDto })
  async entrenar(@Query() consulta: CultivoQueryDto): Promise<ModeloIaResponseDto> {
    return ModeloIaResponseDto.fromDomain(
      await this.entrenamientoService.entrenar(consulta.cultivo),
    );
  }

  @Post('preparar-dev')
  @UseGuards(RolesGuard)
  @Roles(Rol.JEFE, Rol.OPERATIVO)
  @ApiOperation({
    summary:
      'Modo desarrollo: genera historial de campañas con registros de cosecha y entrena el modelo del cultivo',
  })
  @ApiCreatedResponse({ type: PrepararParcelaDevResponseDto })
  async prepararDev(
    @Body() dto: PrepararParcelaDevDto,
  ): Promise<PrepararParcelaDevResponseDto> {
    const base = await this.estimacionService.prepararParcelaDev(
      dto.parcelaId,
      dto.cultivoId,
    );
    const modelo = await this.entrenamientoService.entrenar(base.cultivoId);
    return {
      ...base,
      versionModelo: `v${modelo.version}`,
      estadoModelo: modelo.estado,
    };
  }

  @Get('datos-demo')
  @UseGuards(RolesGuard)
  @Roles(Rol.JEFE, Rol.CONTABILIDAD, Rol.OPERATIVO)
  @ApiOperation({
    summary: 'Parcelas que son datos de demostracion (el panel las oculta por defecto)',
  })
  datosDemo(): Promise<{ parcelaIds: string[]; etiqueta: string }> {
    return this.estimacionService.datosDemo();
  }
}
