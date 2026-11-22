/**
 * Recuperacion de contraseña: el enlace sirve una sola vez y solo entrega el
 * enlace en pantalla cuando el entorno es de desarrollo.
 */
// @nestjs/* v12 es ESM-only y Jest corre en CJS: se mockean decoradores y servicios.
jest.mock('@nestjs/common', () => {
  class HttpError extends Error {}
  return {
    Injectable: () => () => undefined,
    Inject: () => () => undefined,
    Logger: class {
      log(): void {}
      warn(): void {}
    },
    BadRequestException: class extends HttpError {},
    ConflictException: class extends HttpError {},
    ForbiddenException: class extends HttpError {},
    NotFoundException: class extends HttpError {},
    UnauthorizedException: class extends HttpError {},
  };
});
jest.mock('@nestjs/jwt', () => ({ JwtService: class {} }));
jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
}));
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

import { EstadoUsuario, Rol } from '../../../generated/prisma/enums';
import type { UsuarioEntity } from '../domain/entities/usuario.entity';
import type { UsuarioRepository } from '../domain/repositories/usuario.repository';
import { NotificacionCorreoService } from '../infrastructure/notificacion-correo.service';
import { AuthService } from './auth.service';

/** JwtService minimo: el "token" es el JSON del contenido. */
const jwtFalso = {
  sign: (payload: object) => JSON.stringify(payload),
  verify: (token: string) => JSON.parse(token) as object,
};

function armar() {
  const usuario = {
    id: 'u1',
    nombre: 'Ana',
    apellido: null,
    email: 'ana@agroan.com',
    telefono: null,
    passwordHash: 'hash-original',
    rol: Rol.JEFE,
    estado: EstadoUsuario.ACTIVO,
  } as unknown as UsuarioEntity;
  const repositorio = {
    findById: async () => usuario,
    findByEmail: async () => usuario,
    actualizarPassword: async (_id: string, nuevoHash: string) => {
      usuario.passwordHash = nuevoHash;
    },
  } as unknown as UsuarioRepository;
  // Sin Supabase ni Resend: cae al enlace de respaldo.
  const correo = new NotificacionCorreoService({ get: () => undefined } as never);
  const servicio = new AuthService(repositorio, jwtFalso as never, correo);
  return { servicio };
}

describe('Recuperacion de contraseña', () => {
  const entornoOriginal = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = entornoOriginal;
  });

  it('el enlace sirve una sola vez: despues de usarlo queda invalido', async () => {
    process.env.NODE_ENV = 'development';
    const { servicio } = armar();
    const { resetUrlDesarrollo } = await servicio.solicitarRecuperacionPassword({
      email: 'ana@agroan.com',
    });
    const token = decodeURIComponent(resetUrlDesarrollo!.split('token=')[1]);

    await expect(
      servicio.restablecerPassword({ token, nuevaPassword: 'nueva-clave-1' }),
    ).resolves.toBeDefined();
    await expect(
      servicio.restablecerPassword({ token, nuevaPassword: 'otra-clave-2' }),
    ).rejects.toThrow('inválido o ha expirado');
  });

  it.each(['production', 'test', undefined])(
    'con NODE_ENV=%s NO devuelve el enlace en la respuesta',
    async (entorno) => {
      process.env.NODE_ENV = entorno;
      const { servicio } = armar();
      const respuesta = await servicio.solicitarRecuperacionPassword({
        email: 'ana@agroan.com',
      });
      expect(respuesta.resetUrlDesarrollo).toBeUndefined();
    },
  );
});
