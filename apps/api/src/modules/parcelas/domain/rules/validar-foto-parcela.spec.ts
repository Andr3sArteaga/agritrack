import {
  MAX_FOTOS_POR_PARCELA,
  MAX_LONGITUD_DATA_URL,
  decodificarImagen,
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

describe('decodificarImagen', () => {
  it('devuelve el tipo y los bytes de una imagen en base64', () => {
    const imagen = decodificarImagen(`data:image/png;base64,${Buffer.from('hola').toString('base64')}`);
    expect(imagen?.tipo).toBe('image/png');
    expect(imagen?.bytes.toString()).toBe('hola');
  });

  it('normaliza jpg a image/jpeg', () => {
    expect(decodificarImagen('data:image/jpg;base64,AAAA')?.tipo).toBe('image/jpeg');
  });

  it('rechaza lo que no es una imagen permitida (ej. SVG o HTML)', () => {
    expect(decodificarImagen('data:image/svg+xml;base64,AAAA')).toBeNull();
    expect(decodificarImagen('data:text/html;base64,AAAA')).toBeNull();
  });
});
