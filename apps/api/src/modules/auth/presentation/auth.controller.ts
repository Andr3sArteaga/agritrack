import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '../../../generated/prisma/enums';
import { AuthService } from '../application/auth.service';
import { ActualizarPerfilDto } from '../application/dto/actualizar-perfil.dto';
import {
  AprobarSolicitudDto,
  AprobarSolicitudResponseDto,
} from '../application/dto/aprobar-solicitud.dto';
import { LoginResponseDto } from '../application/dto/login-response.dto';
import { LoginDto } from '../application/dto/login.dto';
import {
  RecuperarPasswordDto,
  RestablecerPasswordDto,
} from '../application/dto/recuperar-password.dto';
import { RegisterDto } from '../application/dto/register.dto';
import { SolicitarAccesoDto } from '../application/dto/solicitar-acceso.dto';
import { UsuarioResponseDto } from '../application/dto/usuario-response.dto';
import type { UsuarioAutenticado } from '../infrastructure/strategies/jwt.strategy';
import { CurrentUsuario } from './decorators/current-usuario.decorator';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.JEFE)
  @ApiBearerAuth()
  register(@Body() dto: RegisterDto): Promise<UsuarioResponseDto> {
    return this.authService.register(dto);
  }

  @Post('solicitar-acceso')
  solicitarAcceso(@Body() dto: SolicitarAccesoDto): Promise<UsuarioResponseDto> {
    return this.authService.solicitarAcceso(dto);
  }

  @Get('solicitudes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.JEFE)
  @ApiBearerAuth()
  listarSolicitudesPendientes(): Promise<UsuarioResponseDto[]> {
    return this.authService.listarSolicitudesPendientes();
  }

  @Patch('solicitudes/:id/aprobar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.JEFE)
  @ApiBearerAuth()
  aprobarSolicitud(
    @Param('id') id: string,
    @Body() dto: AprobarSolicitudDto,
  ): Promise<AprobarSolicitudResponseDto> {
    return this.authService.aprobarSolicitud(id, dto);
  }

  @Patch('solicitudes/:id/rechazar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.JEFE)
  @ApiBearerAuth()
  rechazarSolicitud(@Param('id') id: string) {
    return this.authService.rechazarSolicitud(id);
  }

  @Post('recuperar-password')
  @HttpCode(HttpStatus.OK)
  recuperarPassword(@Body() dto: RecuperarPasswordDto) {
    return this.authService.solicitarRecuperacionPassword(dto);
  }

  @Post('restablecer-password')
  @HttpCode(HttpStatus.OK)
  restablecerPassword(@Body() dto: RestablecerPasswordDto) {
    return this.authService.restablecerPassword(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUsuario() usuario: UsuarioAutenticado): UsuarioAutenticado {
    return usuario;
  }

  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  obtenerPerfil(
    @CurrentUsuario() usuario: UsuarioAutenticado,
  ): Promise<UsuarioResponseDto> {
    return this.authService.obtenerPerfil(usuario.id);
  }

  @Patch('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  actualizarPerfil(
    @CurrentUsuario() usuario: UsuarioAutenticado,
    @Body() dto: ActualizarPerfilDto,
  ): Promise<UsuarioResponseDto> {
    return this.authService.actualizarPerfil(usuario.id, dto);
  }
}
