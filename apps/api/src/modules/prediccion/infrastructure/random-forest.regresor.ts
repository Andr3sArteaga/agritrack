import { Injectable } from '@nestjs/common';
import { RandomForestRegression } from 'ml-random-forest';
import type {
  ModeloRegresion,
  RegresorPort,
} from '../domain/ports/regresor.port';

export const ARBOLES = 300;
export const SEMILLA_MODELO = 42;

/**
 * Unico punto del sistema que conoce ml-random-forest (v2.1).
 * 300 arboles, semilla fija 42, todas las variables en cada arbol y muestreo
 * de filas con reemplazo (bagging), como el RandomForestRegressor del prototipo.
 */
@Injectable()
export class RandomForestRegresor implements RegresorPort {
  entrenar(X: number[][], y: number[]): ModeloRegresion {
    const bosque = new RandomForestRegression({
      nEstimators: ARBOLES,
      seed: SEMILLA_MODELO,
      maxFeatures: 1.0,
      replacement: false,
      useSampleBagging: true,
      noOOB: true,
      selectionMethod: 'mean',
      treeOptions: {},
    });
    bosque.train(X, y);
    return this.envolver(bosque);
  }

  cargar(serializado: unknown): ModeloRegresion {
    return this.envolver(
      RandomForestRegression.load(
        serializado as Parameters<typeof RandomForestRegression.load>[0],
      ),
    );
  }

  private envolver(bosque: RandomForestRegression): ModeloRegresion {
    return {
      predecir: (X) => bosque.predict(X),
      // toJSON trae instancias propias de la libreria: se deja como JSON plano.
      serializar: () => JSON.parse(JSON.stringify(bosque.toJSON())) as unknown,
    };
  }
}
