export const MAX_FOTOS_POR_PARCELA = 8;
export const MAX_LONGITUD_DATA_URL = 2_000_000;

const DATA_URL_IMAGEN_REGEX =
  /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export interface ResultadoValidacionFoto {
  valido: boolean;
  motivo?: string;
}

/** Valida que la imagen cumpla cupo, formato Base64 permitido y peso maximo. */
export function validarNuevaFotoParcela(
  imagenData: string,
  cantidadActual: number,
): ResultadoValidacionFoto {
  if (cantidadActual >= MAX_FOTOS_POR_PARCELA) {
    return {
      valido: false,
      motivo: `Cada parcela puede tener como maximo ${MAX_FOTOS_POR_PARCELA} fotos.`,
    };
  }

  const limpio = imagenData.trim();
  if (!DATA_URL_IMAGEN_REGEX.test(limpio)) {
    return {
      valido: false,
      motivo: 'Formato de imagen invalido. Usa JPEG, PNG o WebP en base64.',
    };
  }

  if (limpio.length > MAX_LONGITUD_DATA_URL) {
    return {
      valido: false,
      motivo: 'La imagen comprimida supera el limite permitido (2 MB).',
    };
  }

  return { valido: true };
}
