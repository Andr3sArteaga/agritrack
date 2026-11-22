import {
  esSesionDeRecuperacionSupabase,
  esTokenDeSesion,
  huellaPassword,
} from './tokens';

/** Arma un JWT sin firma, solo para probar como se lee su contenido. */
const jwtFalso = (payload: object): string =>
  `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`;

describe('Token de sesion', () => {
  it('el token de login (con rol, sin purpose) es una sesion', () => {
    expect(esTokenDeSesion({ rol: 'JEFE' })).toBe(true);
  });

  it('el token de recuperacion de contraseña NO sirve como sesion', () => {
    expect(esTokenDeSesion({ purpose: 'password-reset' })).toBe(false);
    expect(esTokenDeSesion({ rol: 'JEFE', purpose: 'password-reset' })).toBe(false);
  });

  it('un token sin rol no es una sesion', () => {
    expect(esTokenDeSesion({})).toBe(false);
  });
});

describe('Huella de la contraseña', () => {
  it('cambia cuando cambia la contraseña (el enlace sirve una sola vez)', () => {
    expect(huellaPassword('hash-a')).toBe(huellaPassword('hash-a'));
    expect(huellaPassword('hash-a')).not.toBe(huellaPassword('hash-b'));
  });

  it('no deja ver el hash de la contraseña', () => {
    expect(huellaPassword('$2b$10$abcdefghij')).not.toContain('abcdefghij');
  });
});

describe('Sesion de recuperacion de Supabase', () => {
  it('acepta solo sesiones que vienen de un enlace de recuperacion', () => {
    expect(esSesionDeRecuperacionSupabase(jwtFalso({ amr: [{ method: 'recovery' }] }))).toBe(true);
  });

  it('rechaza una sesion normal (login o registro)', () => {
    expect(esSesionDeRecuperacionSupabase(jwtFalso({ amr: [{ method: 'password' }] }))).toBe(false);
    expect(esSesionDeRecuperacionSupabase(jwtFalso({}))).toBe(false);
  });

  it('rechaza texto que no es un JWT', () => {
    expect(esSesionDeRecuperacionSupabase('basura')).toBe(false);
    expect(esSesionDeRecuperacionSupabase('a.%%%.b')).toBe(false);
  });
});
