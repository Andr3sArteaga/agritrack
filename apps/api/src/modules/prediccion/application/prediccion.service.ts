import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTOR_PORT,
  type PredictorPort,
  type PrediccionResultado,
} from '../domain/ports/predictor.port';

@Injectable()
export class PrediccionService {
  constructor(
    @Inject(PREDICTOR_PORT) private readonly predictor: PredictorPort,
  ) {}

  predecir(parcelaId: string, cultivoId: string): Promise<PrediccionResultado> {
    return this.predictor.predecir(parcelaId, cultivoId);
  }
}
