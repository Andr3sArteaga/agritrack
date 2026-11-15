// @nestjs/* v12 es ESM-only y Jest corre en CJS (Node < 24.9): no se puede
// levantar Nest aqui. Se mockea SetMetadata/Reflector con la MISMA semantica
// de Nest (metadata en la clase o en el metodo) para probar el RolesGuard real
// contra los @Roles reales del controller.
import 'reflect-metadata';

jest.mock('@nestjs/common', () => {
  const noop = () => () => undefined;
  return {
    Injectable: noop,
    Inject: noop,
    Controller: noop,
    Get: noop,
    Param: noop,
    Query: noop,
    Res: noop,
    UseGuards: noop,
    BadRequestException: class BadRequestException extends Error {},
    NotFoundException: class NotFoundException extends Error {},
    SetMetadata:
      (clave: string, valor: unknown) =>
      (
        objetivo: object,
        _propiedad?: string | symbol,
        descriptor?: PropertyDescriptor,
      ) => {
        Reflect.defineMetadata(
          clave,
          valor,
          descriptor ? (descriptor.value as object) : objetivo,
        );
      },
  };
});
jest.mock('@nestjs/core', () => ({
  Reflector: class {
    getAllAndOverride<T>(clave: string, objetivos: object[]): T | undefined {
      for (const objetivo of objetivos) {
        const valor = Reflect.getMetadata(clave, objetivo) as T | undefined;
        if (valor !== undefined) return valor;
      }
      return undefined;
    }
  },
}));
jest.mock('@nestjs/swagger', () => {
  const noop = () => () => undefined;
  return {
    ApiTags: noop,
    ApiBearerAuth: noop,
    ApiOperation: noop,
    ApiOkResponse: noop,
    ApiProduces: noop,
    ApiBadRequestResponse: noop,
    ApiNotFoundResponse: noop,
    ApiProperty: noop,
    ApiPropertyOptional: noop,
  };
});
jest.mock('../../auth/presentation/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class {},
}));

import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../../../generated/prisma/enums';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { ReportesController } from './reportes.controller';

function contextoPara(
  rol: Rol,
  handler: (...args: any[]) => unknown = ReportesController.prototype.reporteCampana,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ReportesController,
    switchToHttp: () => ({ getRequest: () => ({ user: { rol } }) }),
  } as unknown as ExecutionContext;
}

describe('GET /reportes/campanas/:id y exportaciones: acceso por rol', () => {
  const guard = new RolesGuard(new Reflector());

  it('CONTABILIDAD puede ver y exportar el reporte', () => {
    expect(guard.canActivate(contextoPara(Rol.CONTABILIDAD))).toBe(true);
    expect(
      guard.canActivate(
        contextoPara(Rol.CONTABILIDAD, ReportesController.prototype.exportarPdf),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextoPara(
          Rol.CONTABILIDAD,
          ReportesController.prototype.exportarExcel,
        ),
      ),
    ).toBe(true);
  });

  it('JEFE puede ver y exportar el reporte', () => {
    expect(guard.canActivate(contextoPara(Rol.JEFE))).toBe(true);
    expect(
      guard.canActivate(
        contextoPara(Rol.JEFE, ReportesController.prototype.exportarPdf),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextoPara(Rol.JEFE, ReportesController.prototype.exportarExcel),
      ),
    ).toBe(true);
  });

  it('OPERATIVO no puede ver ni exportar (403)', () => {
    expect(guard.canActivate(contextoPara(Rol.OPERATIVO))).toBe(false);
    expect(
      guard.canActivate(
        contextoPara(Rol.OPERATIVO, ReportesController.prototype.exportarPdf),
      ),
    ).toBe(false);
    expect(
      guard.canActivate(
        contextoPara(Rol.OPERATIVO, ReportesController.prototype.exportarExcel),
      ),
    ).toBe(false);
  });
});
