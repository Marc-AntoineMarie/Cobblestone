import nodemailer from 'nodemailer';
import type { Mailer } from './accounts.ts';

/**
 * E-mails through an SMTP service (Brevo: smtp-relay.brevo.com, port 587),
 * set in the server's environment. Without one, codes go to the server's log
 * (a relay for oneself, or tests).
 */
export function mailerFromEnv(env = process.env): Mailer {
  if (!env.SMTP_HOST) {
    console.warn('No SMTP_HOST: e-mails are written to the log instead of being sent.');
    return { send: async (to, subject, text) => console.log(`[mail] ${to} · ${subject}\n${text}`) };
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? 587),
    secure: Number(env.SMTP_PORT ?? 587) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return {
    send: async (to, subject, text) => {
      await transport.sendMail({ from: env.MAIL_FROM ?? env.SMTP_USER, to, subject, text });
    },
  };
}
