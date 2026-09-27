import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CampanaResponseDto } from '../application/dto/campana-response.dto';
import { CreateCampanaDto } from '../application/dto/create-campana.dto';
import { UpdateCampanaDto } from '../application/dto/update-campana.dto';
import { CampanasService } from '../application/campanas.service';

@ApiTags('campanas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('campanas')
export class CampanasController {
  constructor(private readonly campanasService: CampanasService) {}

  @Get()
  findAll(
    @Query('parcelaId') parcelaId?: string,
  ): Promise<CampanaResponseDto[]> {
    return this.campanasService.findAll(parcelaId);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<CampanaResponseDto> {
    return this.campanasService.findById(id);
  }

  @Post()
  @Roles(Rol.JEFE)
  create(@Body() dto: CreateCampanaDto): Promise<CampanaResponseDto> {
    return this.campanasService.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.JEFE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampanaDto,
  ): Promise<CampanaResponseDto> {
    return this.campanasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.JEFE)
  delete(@Param('id') id: string): Promise<void> {
    return this.campanasService.delete(id);
  }
}
