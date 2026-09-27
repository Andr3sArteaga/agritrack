import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CreateCultivoDto } from '../application/dto/create-cultivo.dto';
import { CultivoResponseDto } from '../application/dto/cultivo-response.dto';
import { CultivosService } from '../application/cultivos.service';

@ApiTags('cultivos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cultivos')
export class CultivosController {
  constructor(private readonly cultivosService: CultivosService) {}

  @Get()
  findAll(): Promise<CultivoResponseDto[]> {
    return this.cultivosService.findAll();
  }

  @Post()
  @Roles(Rol.JEFE)
  create(@Body() dto: CreateCultivoDto): Promise<CultivoResponseDto> {
    return this.cultivosService.create(dto);
  }
}
