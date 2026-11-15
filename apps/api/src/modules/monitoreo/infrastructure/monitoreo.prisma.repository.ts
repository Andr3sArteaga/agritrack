import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  AnalisisSuelo,
  MonitoreoRepository,
  NuevoAnalisisSuelo,
  NuevoRegistroClima,
  RegistroClima,
} from '../domain/repositories/monitoreo.repository';

@Injectable()
export class MonitoreoPrismaRepository implements MonitoreoRepository {
  constructor(private readonly prisma: PrismaService) {}

  listarSuelo(parcelaId: string): Promise<AnalisisSuelo[]> {
    return this.prisma.analisisSuelo.findMany({
      where: { parcelaId },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    });
  }

  crearSuelo(datos: NuevoAnalisisSuelo): Promise<AnalisisSuelo> {
    return this.prisma.analisisSuelo.create({ data: datos });
  }

  listarClima(parcelaId: string, desde?: Date): Promise<RegistroClima[]> {
    return this.prisma.registroClima.findMany({
      where: { parcelaId, ...(desde ? { fecha: { gte: desde } } : {}) },
      orderBy: { fecha: 'desc' },
    });
  }

  guardarClima(datos: NuevoRegistroClima): Promise<RegistroClima> {
    const { parcelaId, fecha, ...resto } = datos;
    return this.prisma.registroClima.upsert({
      where: { parcelaId_fecha: { parcelaId, fecha } },
      create: datos,
      update: resto,
    });
  }
}
