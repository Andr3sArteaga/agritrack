import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
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

  @Get(':id/fotos/:fotoId')
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  async obtenerFoto(
    @Param('id') id: string,
    @Param('fotoId') fotoId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { tipo, bytes } = await this.publicService.obtenerImagenPublica(id, fotoId);
    res.setHeader('Content-Type', tipo);
    // Corto: una foto ocultada o borrada deja de verse en minutos.
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(bytes);
  }
}
