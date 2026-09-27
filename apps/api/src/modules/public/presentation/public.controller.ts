import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogoParcelaDto } from '../application/dto/catalogo-parcela.dto';
import { DetalleParcelaPublicoDto } from '../application/dto/detalle-parcela-publico.dto';
import { PublicService } from '../application/public.service';

@ApiTags('public')
@Controller('public/parcelas')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get()
  listarCatalogo(): Promise<CatalogoParcelaDto[]> {
    return this.publicService.listarCatalogo();
  }

  @Get(':id')
  obtenerDetalle(@Param('id') id: string): Promise<DetalleParcelaPublicoDto> {
    return this.publicService.obtenerDetalle(id);
  }
}
