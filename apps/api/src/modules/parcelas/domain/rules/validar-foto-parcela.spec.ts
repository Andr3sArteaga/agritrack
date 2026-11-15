import {
  MAX_FOTOS_POR_PARCELA,
  MAX_LONGITUD_DATA_URL,
  validarNuevaFotoParcela,
} from './validar-foto-parcela';

describe('validarNuevaFotoParcela', () => {
  const dataUrlValida = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

  it('acepta una imagen WebP/JPEG/PNG valida dentro del limite de cantidad y peso', () => {
    const res = validarNuevaFotoParcela(dataUrlValida, 0);
    expect(res).toEqual({ valido: true });
  });

  it('rechaza cuando ya se alcanzo el maximo de fotos permitidas por parcela', () => {
    const res = validarNuevaFotoParcela(dataUrlValida, MAX_FOTOS_POR_PARCELA);
    expect(res.valido).toBe(false);
    expect(res.motivo).toContain(`${MAX_FOTOS_POR_PARCELA}`);
  });

  it('rechaza formatos que no son Data URL de imagen base64 permitido', () => {
    const res = validarNuevaFotoParcela('https://ejemplo.com/foto.jpg', 1);
    expect(res.valido).toBe(false);
    expect(res.motivo).toBeDefined();
  });

  it('rechaza imagenes cuya longitud excede el limite permitido', () => {
    const muyGrande = `data:image/jpeg;base64,${'A'.repeat(MAX_LONGITUD_DATA_URL)}`;
    const res = validarNuevaFotoParcela(muyGrande, 1);
    expect(res.valido).toBe(false);
    expect(res.motivo).toContain('2 MB');
  });
});
