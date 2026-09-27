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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol, TipoContacto } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { ContactoResponseDto } from '../application/dto/contacto-response.dto';
import { CreateContactoDto } from '../application/dto/create-contacto.dto';
import { UpdateContactoDto } from '../application/dto/update-contacto.dto';
import { ContactosService } from '../application/contactos.service';

@ApiTags('contactos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contactos')
export class ContactosController {
  constructor(private readonly contactosService: ContactosService) {}

  @Get()
  findAll(
    @Query('tipo') tipo?: TipoContacto,
    @Query('search') search?: string,
  ): Promise<ContactoResponseDto[]> {
    return this.contactosService.findAll(tipo, search);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<ContactoResponseDto> {
    return this.contactosService.findById(id);
  }

  @Post()
  @Roles(Rol.JEFE, Rol.CONTABILIDAD)
  create(@Body() dto: CreateContactoDto): Promise<ContactoResponseDto> {
    return this.contactosService.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.JEFE, Rol.CONTABILIDAD)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContactoDto,
  ): Promise<ContactoResponseDto> {
    return this.contactosService.update(id, dto);
  }
}
