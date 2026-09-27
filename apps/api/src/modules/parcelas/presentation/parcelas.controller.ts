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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
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
}
