import { Inject, Injectable } from '@nestjs/common';
import {
  calcularHashSha256,
  canonicalizarActividad,
} from '../../../shared/integridad/canonicalizar-actividad';
import { ActividadEntity } from '../../actividades/domain/entities/actividad.entity';
import {
  ACTIVIDAD_REPOSITORY,
  type ActividadRepository,
} from '../../actividades/domain/repositories/actividad.repository';
import { ResultadoVerificacion } from './dto/resultado-verificacion.dto';

@Injectable()
export class IntegridadService {
  constructor(
    @Inject(ACTIVIDAD_REPOSITORY)
    private readonly actividadRepository: ActividadRepository,
  ) {}

  /**
   * Recalcula el hash de cada actividad de la parcela a partir de su propio
   * contenido + su hashAnterior guardado. Detecta si ESE registro fue
   * alterado. No valida continuidad global (el hashAnterior de una
   * actividad puede pertenecer a otra parcela en la cadena global).
   */
  async verificarPorParcela(parcelaId: string): Promise<ResultadoVerificacion> {
    const actividades = await this.actividadRepository.findPorParcela(
      parcelaId,
    );
    for (const actividad of actividades) {
      if (!this.hashCoincide(actividad)) {
        return this.resultado(false, actividades.length, actividad.id, 'hash no coincide con el contenido');
      }
    }
    return this.resultado(true, actividades.length, null, null);
  }

  /**
   * Ademas del auto-chequeo por registro, valida la continuidad completa
   * de la cadena global: cada hashAnterior debe coincidir con el hash del
   * registro previo por secuencia, y la secuencia no debe tener huecos.
   */
  async verificarGlobal(): Promise<ResultadoVerificacion> {
    const actividades = await this.actividadRepository.findTodasOrdenadas();

    let secuenciaEsperada = 1;
    let hashAnteriorEsperado: string | null = null;

    for (const actividad of actividades) {
      if (!this.hashCoincide(actividad)) {
        return this.resultado(false, actividades.length, actividad.id, 'hash no coincide con el contenido');
      }
      if (actividad.secuencia !== secuenciaEsperada) {
        return this.resultado(false, actividades.length, actividad.id, 'hueco en la secuencia (registro faltante)');
      }
      if (actividad.hashAnterior !== hashAnteriorEsperado) {
        return this.resultado(false, actividades.length, actividad.id, 'hashAnterior no coincide con el registro previo');
      }
      secuenciaEsperada += 1;
      hashAnteriorEsperado = actividad.hash;
    }

    return this.resultado(true, actividades.length, null, null);
  }

  private hashCoincide(actividad: ActividadEntity): boolean {
    const contenidoCanonico = canonicalizarActividad({
      secuencia: actividad.secuencia,
      campanaId: actividad.campanaId,
      tipo: actividad.tipo,
      fecha: actividad.fecha,
      descripcion: actividad.descripcion,
      insumo: actividad.insumo,
      cantidad: actividad.cantidad,
      unidad: actividad.unidad,
      responsableId: actividad.responsableId,
      tercerizado: actividad.tercerizado,
      maquinariaUtilizada: actividad.maquinariaUtilizada,
      rendimientoTnHa: actividad.rendimientoTnHa,
      correccionDeId: actividad.correccionDeId,
      motivoCorreccion: actividad.motivoCorreccion,
      hashAnterior: actividad.hashAnterior,
    });
    return calcularHashSha256(contenidoCanonico) === actividad.hash;
  }

  private resultado(
    valido: boolean,
    totalVerificadas: number,
    actividadAlteradaId: string | null,
    motivo: string | null,
  ): ResultadoVerificacion {
    return { valido, totalVerificadas, actividadAlteradaId, motivo };
  }
}
