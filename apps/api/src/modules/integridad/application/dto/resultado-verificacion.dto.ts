export interface ResultadoVerificacion {
  valido: boolean;
  totalVerificadas: number;
  actividadAlteradaId: string | null;
  motivo: string | null;
}
