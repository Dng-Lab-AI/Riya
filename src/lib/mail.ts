import "server-only";
import nodemailer from "nodemailer";
import type { Locale } from "@/i18n";

// Outgoing e-mail through Resend (RESEND_API_KEY), or else any SMTP provider (SMTP_HOST,
// SMTP_PORT, SMTP_USER, SMTP_PASSWORD). MAIL_FROM sets the sender for both. With neither
// in development, messages are printed in the server console instead of being sent.

const FROM = () => process.env.MAIL_FROM || "Riya <no-reply@riya.africa>";

export function isMailConfigured() {
  return !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

// https://resend.com/docs/api-reference/emails/send-email
async function sendWithResend(message: { to: string; subject: string; text: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM(), ...message }),
  });
  if (!res.ok) throw new Error(`Resend rejected the e-mail (${res.status}): ${await res.text()}`);
}

let transport: nodemailer.Transporter | null = null;
function smtp() {
  const port = Number(process.env.SMTP_PORT || 587);
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transport;
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const FOOTER: Record<Locale, { team: string; fallback: string }> = {
  en: { team: "— The Riya team", fallback: "If the button doesn't work, copy this link:" },
  fr: { team: "— L'équipe Riya", fallback: "Si le bouton ne fonctionne pas, copiez ce lien :" },
};

// One call-to-action e-mail in Riya's colours, with a plain-text twin, in the recipient's language.
export async function sendActionEmail(input: { to: string; subject: string; greeting: string; intro: string; button: string; url: string; outro: string; locale: Locale }) {
  const footer = FOOTER[input.locale];
  const text = `${input.greeting}\n\n${input.intro}\n\n${input.button}: ${input.url}\n\n${input.outro}\n\n${footer.team}`;
  const html = `<!doctype html><html lang="${input.locale}"><body style="margin:0;background:#fbf7f0;font-family:Arial,Helvetica,sans-serif;color:#22180f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;border:1px solid #eadbc4;overflow:hidden">
      <tr><td style="background:#143b24;padding:22px 28px;color:#fbf7f0;font-size:24px;font-weight:bold;font-family:Georgia,serif">riya</td></tr>
      <tr><td style="padding:28px">
        <p style="font-size:18px;font-weight:bold;margin:0 0 12px">${escape(input.greeting)}</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#473629">${escape(input.intro)}</p>
        <p style="margin:0 0 24px"><a href="${escape(input.url)}" style="display:inline-block;background:#b84e28;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:999px">${escape(input.button)}</a></p>
        <p style="font-size:13px;line-height:1.6;margin:0 0 8px;color:#7d6754">${escape(input.outro)}</p>
        <p style="font-size:12px;line-height:1.6;margin:0;color:#9c8571;word-break:break-all">${escape(footer.fallback)} ${escape(input.url)}</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set: e-mails cannot be sent.");
    console.info(`\n[e-mail not sent, no RESEND_API_KEY] To: ${input.to}\nSubject: ${input.subject}\n${input.url}\n`);
    return;
  }
  const message = { to: input.to, subject: input.subject, text, html };
  if (process.env.RESEND_API_KEY) await sendWithResend(message);
  else await smtp().sendMail({ from: FROM(), ...message });
}
