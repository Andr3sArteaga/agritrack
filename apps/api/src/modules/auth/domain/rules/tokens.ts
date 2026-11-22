import { createHash } from 'node:crypto';

/** Solo un token de login sirve como sesion; uno de recuperacion de contraseña no. */
export function esTokenDeSesion(payload: { rol?: unknown; purpose?: unknown }): boolean {
  return Boolean(payload.rol) && payload.purpose === undefined;
}

/**
 * Huella de la contraseña actual que viaja en el token de recuperacion.
 * Al cambiar la contraseña la huella cambia, asi el enlace sirve una sola vez.
 */
export function huellaPassword(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}

/** Un token de Supabase solo vale para restablecer si viene de un enlace de recuperacion. */
export function esSesionDeRecuperacionSupabase(accessToken: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { amr?: { method?: string }[] };
    return (payload.amr ?? []).some((metodo) => metodo.method === 'recovery');
  } catch {
    return false;
  }
}
