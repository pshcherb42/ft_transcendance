import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

const LOGO_URL = 'https://transcendance.rmanzanas.com/icon.jpg';

const button = (link: string, label: string) =>
  `<p style="margin:16px;">
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#ee4424;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
        ${label}
      </a>
  </p>
`;
/* We have i8n only lives in the front, so if we want
    to send the email in multiple languages, the easy
    way is just having a hardcoded template for each
    language :S
*/
const templates: Record<
  string,
  { subject: string; body: (link: string) => string }
> = {
  en: {
    subject: 'Transcendance password reset',
    body: (link) =>
      `<p>Click the button below to reset your password. This link expires in 30 minutes.</p>${button(link, 'Reset password')}`,
  },
  es: {
    subject: 'Recupera tu contraseña de Transcendance',
    body: (link) =>
      `<p>Haz click en el siguiente botón para recuperar tu contraseña.</p><p>Este enlace caduca en 30 minutos.</p>${button(link, 'Recuperar contraseña')}`,
  },
  lv: {
    subject: 'Atiestatiet savu paroli',
    body: (link) =>
      `<p>Noklikšķiniet uz pogas zemāk, lai atiestatītu paroli. Saite ir derīga 30 minūtes.</p>${button(link, 'Atiestatīt paroli')}`,
  },
};

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendPasswordReset(to: string, resetLink: string, lang = 'en') {
    const template = templates[lang] ?? templates.en;
    const html = `
      <div style="text-align:center; font-family:Arial, Helvetica, sans-serif; color:#1a1a1a;">
        <img
          src="${LOGO_URL}"
          alt="Transcendance"
          width="64"
          height="64"
          style="margin-bottom:20px; border-radius:12px;"
        />
        ${template.body(resetLink)}
      </div>
    `;
    await this.resend.emails.send({
      from: 'Transcendance <noreply@mail.rmanzanas.com>',
      to,
      subject: template.subject,
      html,
    });
  }
}
