import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EstadoUsuario, Rol } from '../../../generated/prisma/enums';
import { UsuarioEntity } from '../domain/entities/usuario.entity';
import {
  USUARIO_REPOSITORY,
  type UsuarioRepository,
} from '../domain/repositories/usuario.repository';
import { NotificacionCorreoService } from '../infrastructure/notificacion-correo.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import {
  AprobarSolicitudDto,
  AprobarSolicitudResponseDto,
} from './dto/aprobar-solicitud.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import {
  RecuperarPasswordDto,
  RestablecerPasswordDto,
} from './dto/recuperar-password.dto';
import { RegisterDto } from './dto/register.dto';
import { SolicitarAccesoDto } from './dto/solicitar-acceso.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
    private readonly jwtService: JwtService,
    private readonly notificacionCorreo: NotificacionCorreoService,
  ) {}

  async register(dto: RegisterDto): Promise<UsuarioResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const existente = await this.usuarioRepository.findByEmail(email);
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const usuario = await this.usuarioRepository.create({
      nombre: dto.nombre.trim(),
      email,
      passwordHash,
      rol: dto.rol,
      estado: EstadoUsuario.ACTIVO,
    });

    return UsuarioResponseDto.fromEntity(usuario);
  }

  async solicitarAcceso(dto: SolicitarAccesoDto): Promise<UsuarioResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const existente = await this.usuarioRepository.findByEmail(email);
    if (existente) {
      throw new ConflictException('Ya existe un usuario registrado con ese correo');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const usuario = await this.usuarioRepository.create({
      nombre: dto.nombre.trim(),
      apellido: dto.apellido.trim(),
      email,
      telefono: dto.telefono.trim(),
      passwordHash,
      rol: Rol.OPERATIVO,
      estado: EstadoUsuario.PENDIENTE,
    });

    return UsuarioResponseDto.fromEntity(usuario);
  }

  async listarSolicitudesPendientes(): Promise<UsuarioResponseDto[]> {
    const pendientes = await this.usuarioRepository.findPendientes();
    return pendientes.map((usuario) => UsuarioResponseDto.fromEntity(usuario));
  }

  async aprobarSolicitud(
    id: string,
    dto: AprobarSolicitudDto,
  ): Promise<AprobarSolicitudResponseDto> {
    const existente = await this.usuarioRepository.findById(id);
    if (!existente) {
      throw new NotFoundException('Solicitud de usuario no encontrada');
    }
    if (existente.estado === EstadoUsuario.ACTIVO) {
      throw new BadRequestException('Este usuario ya se encuentra activo');
    }

    const actualizado = await this.usuarioRepository.aprobar(id, dto.rol);
    const nombreCompleto = [actualizado.nombre, actualizado.apellido]
      .filter(Boolean)
      .join(' ');
    const correo = await this.notificacionCorreo.enviarCorreoAprobacion(
      actualizado.email,
      nombreCompleto || actualizado.nombre,
    );

    return {
      usuario: UsuarioResponseDto.fromEntity(actualizado),
      correoEnviado: correo.enviado,
      detalleCorreo: correo.detalle,
    };
  }

  async obtenerPerfil(id: string): Promise<UsuarioResponseDto> {
    const usuario = await this.usuarioRepository.findById(id);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return UsuarioResponseDto.fromEntity(usuario);
  }

  async actualizarPerfil(
    id: string,
    dto: ActualizarPerfilDto,
  ): Promise<UsuarioResponseDto> {
    const existente = await this.usuarioRepository.findById(id);
    if (!existente) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const actualizado = await this.usuarioRepository.actualizarPerfil(id, {
      ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
      ...(dto.apellido !== undefined
        ? { apellido: dto.apellido.trim() || null }
        : {}),
      ...(dto.telefono !== undefined
        ? { telefono: dto.telefono.trim() || null }
        : {}),
    });

    return UsuarioResponseDto.fromEntity(actualizado);
  }

  async solicitarRecuperacionPassword(dto: RecuperarPasswordDto): Promise<{
    mensaje: string;
    proveedor?: 'supabase' | 'resend' | 'desarrollo';
    resetUrlDesarrollo?: string;
  }> {
    const usuario = await this.usuarioRepository.findByEmail(dto.email);
    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO) {
      return {
        mensaje:
          'Si el correo está registrado y activo, recibirás un enlace para restablecer tu contraseña.',
      };
    }

    const tokenFallback = this.jwtService.sign(
      {
        sub: usuario.id,
        email: usuario.email,
        purpose: 'password-reset',
      },
      { expiresIn: '30m' },
    );

    const resultado = await this.notificacionCorreo.enviarRecuperacionPassword(
      usuario.email,
      tokenFallback,
    );

    return {
      mensaje:
        'Si el correo está registrado y activo, recibirás un enlace para restablecer tu contraseña.',
      proveedor: resultado.proveedor,
      ...(resultado.resetUrlDesarrollo
        ? { resetUrlDesarrollo: resultado.resetUrlDesarrollo }
        : {}),
    };
  }

  async restablecerPassword(
    dto: RestablecerPasswordDto,
  ): Promise<{ mensaje: string }> {
    let usuario: UsuarioEntity | null = null;
    let supabaseUserId = '';

    try {
      const payload = this.jwtService.verify<{
        sub?: string;
        email?: string;
        purpose?: string;
      }>(dto.token);
      if (payload.purpose === 'password-reset' && payload.sub) {
        usuario = await this.usuarioRepository.findById(payload.sub);
      }
    } catch {
      // No es un JWT interno de recuperación; intentamos validarlo contra Supabase Auth.
    }

    if (!usuario) {
      const verificado = await this.notificacionCorreo.verificarTokenSupabase(
        dto.token,
      );
      if (verificado) {
        supabaseUserId = verificado.supabaseUserId;
        usuario = await this.usuarioRepository.findByEmail(verificado.email);
      }
    }

    if (!usuario) {
      throw new BadRequestException(
        'El enlace de recuperación es inválido o ha expirado.',
      );
    }

    if (usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new ForbiddenException(
        'Tu solicitud de acceso aún está pendiente de aprobación por el Jefe.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.nuevaPassword, SALT_ROUNDS);
    await this.usuarioRepository.actualizarPassword(usuario.id, passwordHash);
    if (supabaseUserId) {
      await this.notificacionCorreo.actualizarPasswordSupabase(
        supabaseUserId,
        dto.nuevaPassword,
      );
    }

    return {
      mensaje:
        'Contraseña actualizada con éxito. Ya puedes ingresar con tu nueva clave.',
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const usuario = await this.usuarioRepository.findByEmail(dto.email);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordValida = await bcrypt.compare(
      dto.password,
      usuario.passwordHash,
    );
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (usuario.estado === EstadoUsuario.PENDIENTE) {
      throw new ForbiddenException(
        'Tu solicitud de acceso aún está pendiente de aprobación por el Jefe.',
      );
    }

    const accessToken = this.jwtService.sign({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });

    return {
      accessToken,
      usuario: UsuarioResponseDto.fromEntity(usuario),
    };
  }

  async validateUsuario(id: string): Promise<UsuarioEntity | null> {
    return this.usuarioRepository.findById(id);
  }
}
