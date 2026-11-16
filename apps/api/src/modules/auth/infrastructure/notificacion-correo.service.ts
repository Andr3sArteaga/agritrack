import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ResultadoCorreo {
  enviado: boolean;
  detalle: string;
}

export interface ResultadoRecuperacionCorreo {
  enviado: boolean;
  proveedor: 'supabase' | 'resend' | 'desarrollo';
  resetUrlDesarrollo?: string;
}

export interface UsuarioSupabaseVerificado {
  email: string;
  supabaseUserId: string;
}

@Injectable()
export class NotificacionCorreoService {
  private readonly logger = new Logger(NotificacionCorreoService.name);

  constructor(private readonly config: ConfigService) {}

  private obtenerFrontendUrl(): string {
    const explicit = this.config.get<string>('FRONTEND_URL')?.trim();
    if (explicit) {
      return explicit.replace(/\/+$/, '');
    }
    const corsOrigin = this.config.get<string>('CORS_ORIGIN')?.split(',')[0]?.trim();
    if (corsOrigin) {
      return corsOrigin.replace(/\/+$/, '');
    }
    return 'http://localhost:3000';
  }

  private obtenerSupabaseConfig(): {
    url: string | null;
    anonKey: string | null;
    serviceRoleKey: string | null;
  } {
    const url = this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/+$/, '') || null;
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY')?.trim() || null;
    const serviceRoleKey =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim() || null;
    return { url, anonKey, serviceRoleKey };
  }

  private async asegurarUsuarioEnSupabase(
    supabaseUrl: string,
    serviceRoleKey: string,
    email: string,
    nombreCompleto?: string,
  ): Promise<void> {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          email_confirm: true,
          user_metadata: nombreCompleto ? { nombre: nombreCompleto } : undefined,
        }),
      });
      if (!res.ok && res.status !== 422) {
        const body = await res.text();
        this.logger.warn(
          `No se pudo sincronizar usuario ${email} en Supabase Auth (${res.status}): ${body}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Error al contactar Supabase Admin Users: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async enviarCorreoAprobacion(
    email: string,
    nombreCompleto: string,
  ): Promise<ResultadoCorreo> {
    const mensaje =
      'Tu cuenta fue creada y aprobada con éxito. Por favor, ingresa al sistema utilizando los datos que registraste.';
    const { url: supabaseUrl, serviceRoleKey } = this.obtenerSupabaseConfig();

    if (supabaseUrl && serviceRoleKey) {
      await this.asegurarUsuarioEnSupabase(
        supabaseUrl,
        serviceRoleKey,
        email,
        nombreCompleto,
      );
    }

    const resendApiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    if (!resendApiKey) {
      this.logger.log(`[APROBACION DE CUENTA] Para: ${email} | Mensaje: ${mensaje}`);
      return {
        enviado: false,
        detalle:
          'Usuario aprobado. Configura RESEND_API_KEY para enviar la notificación por correo automáticamente.',
      };
    }

    const mailFrom =
      this.config.get<string>('MAIL_FROM')?.trim() ||
      'AgriTrack <onboarding@resend.dev>';
    const frontendUrl = this.obtenerFrontendUrl();

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: mailFrom,
          to: [email],
          subject: 'Cuenta aprobada en AgriTrack',
          text: `Hola ${nombreCompleto},\n\n${mensaje}\n\nIngresar: ${frontendUrl}/login`,
          html: `<div style="font-family:sans-serif;color:#17211D;line-height:1.5">
            <h2 style="color:#004b36">¡Bienvenido a AgriTrack!</h2>
            <p>Hola <strong>${nombreCompleto}</strong>,</p>
            <p>${mensaje}</p>
            <p style="margin-top:20px">
              <a href="${frontendUrl}/login" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#004b36;color:#ffffff;text-decoration:none;font-weight:bold">
                Ingresar a AgriTrack
              </a>
            </p>
          </div>`,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`Resend devolvió ${res.status} al notificar a ${email}: ${body}`);
        return {
          enviado: false,
          detalle: 'La cuenta se aprobó, pero no se pudo enviar el correo vía Resend.',
        };
      }

      return {
        enviado: true,
        detalle: `Correo de aprobación enviado a ${email}.`,
      };
    } catch (error) {
      this.logger.warn(
        `Error enviando correo de aprobación: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        enviado: false,
        detalle: 'La cuenta se aprobó, pero ocurrió un error al contactar el servicio de correo.',
      };
    }
  }

  async enviarRecuperacionPassword(
    email: string,
    tokenFallback: string,
  ): Promise<ResultadoRecuperacionCorreo> {
    const frontendUrl = this.obtenerFrontendUrl();
    const redirectTo = `${frontendUrl}/restablecer-password`;
    const { url: supabaseUrl, anonKey, serviceRoleKey } =
      this.obtenerSupabaseConfig();
    const apiKeySupabase = anonKey || serviceRoleKey;

    if (supabaseUrl && apiKeySupabase) {
      if (serviceRoleKey) {
        await this.asegurarUsuarioEnSupabase(supabaseUrl, serviceRoleKey, email);
      }
      try {
        const res = await fetch(
          `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
          {
            method: 'POST',
            headers: {
              apikey: apiKeySupabase,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          },
        );
        if (res.ok) {
          return { enviado: true, proveedor: 'supabase' };
        }
        const body = await res.text();
        this.logger.warn(
          `Supabase recover respondió ${res.status} para ${email}: ${body}`,
        );
      } catch (error) {
        this.logger.warn(
          `Error en Supabase recover: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const fallbackUrl = `${redirectTo}?token=${encodeURIComponent(tokenFallback)}`;
    const resendApiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    if (resendApiKey) {
      const mailFrom =
        this.config.get<string>('MAIL_FROM')?.trim() ||
        'AgriTrack <onboarding@resend.dev>';
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: mailFrom,
            to: [email],
            subject: 'Recuperación de contraseña - AgriTrack',
            text: `Recibimos una solicitud para restablecer tu contraseña en AgriTrack.\n\nAbre el siguiente enlace (válido por 30 minutos): ${fallbackUrl}`,
            html: `<div style="font-family:sans-serif;color:#17211D;line-height:1.5">
              <h2 style="color:#004b36">Recuperación de contraseña</h2>
              <p>Recibimos una solicitud para restablecer tu contraseña en AgriTrack.</p>
              <p style="margin-top:20px">
                <a href="${fallbackUrl}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#004b36;color:#ffffff;text-decoration:none;font-weight:bold">
                  Restablecer contraseña
                </a>
              </p>
              <p style="font-size:12px;color:#68736D">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
            </div>`,
          }),
        });
        if (res.ok) {
          return { enviado: true, proveedor: 'resend' };
        }
      } catch (error) {
        this.logger.warn(
          `Error enviando correo de recuperación por Resend: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(`[RECUPERACION DEV] Enlace para ${email}: ${fallbackUrl}`);
    return {
      enviado: false,
      proveedor: 'desarrollo',
      resetUrlDesarrollo:
        process.env.NODE_ENV !== 'production' ? fallbackUrl : undefined,
    };
  }

  async verificarTokenSupabase(
    accessToken: string,
  ): Promise<UsuarioSupabaseVerificado | null> {
    const { url: supabaseUrl, anonKey, serviceRoleKey } =
      this.obtenerSupabaseConfig();
    const apiKeySupabase = anonKey || serviceRoleKey;
    if (!supabaseUrl || !apiKeySupabase) {
      return null;
    }

    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: apiKeySupabase,
        },
      });
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as { id?: string; email?: string };
      if (!data.email) {
        return null;
      }
      return {
        email: data.email,
        supabaseUserId: data.id ?? '',
      };
    } catch {
      return null;
    }
  }

  async actualizarPasswordSupabase(
    supabaseUserId: string,
    nuevaPassword: string,
  ): Promise<void> {
    const { url: supabaseUrl, serviceRoleKey } = this.obtenerSupabaseConfig();
    if (!supabaseUrl || !serviceRoleKey || !supabaseUserId) {
      return;
    }

    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${supabaseUserId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: nuevaPassword }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(
          `No se pudo actualizar contraseña en Supabase Auth (${res.status}): ${body}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Error actualizando contraseña en Supabase Auth: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
