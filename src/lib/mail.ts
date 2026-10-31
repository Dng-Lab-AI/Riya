import "server-only";
import nodemailer from "nodemailer";

// Outgoing e-mail through any SMTP provider (Brevo, Mailgun, Gmail, OVH…), configured with
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and MAIL_FROM. Without SMTP in development,
// messages are printed in the server console instead of being sent.

export function isMailConfigured() {
  return !!process.env.SMTP_HOST;
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

// One call-to-action e-mail in Riya's colours, with a plain-text twin.
export async function sendActionEmail(input: { to: string; subject: string; greeting: string; intro: string; button: string; url: string; outro: string }) {
  const text = `${input.greeting}\n\n${input.intro}\n\n${input.button} : ${input.url}\n\n${input.outro}\n\n— L'équipe Riya`;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#fbf7f0;font-family:Arial,Helvetica,sans-serif;color:#22180f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;border:1px solid #eadbc4;overflow:hidden">
      <tr><td style="background:#143b24;padding:22px 28px;color:#fbf7f0;font-size:24px;font-weight:bold;font-family:Georgia,serif">riya</td></tr>
      <tr><td style="padding:28px">
        <p style="font-size:18px;font-weight:bold;margin:0 0 12px">${escape(input.greeting)}</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#473629">${escape(input.intro)}</p>
        <p style="margin:0 0 24px"><a href="${escape(input.url)}" style="display:inline-block;background:#b84e28;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:999px">${escape(input.button)}</a></p>
        <p style="font-size:13px;line-height:1.6;margin:0 0 8px;color:#7d6754">${escape(input.outro)}</p>
        <p style="font-size:12px;line-height:1.6;margin:0;color:#9c8571;word-break:break-all">Si le bouton ne fonctionne pas, copiez ce lien : ${escape(input.url)}</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP_HOST n'est pas configuré : impossible d'envoyer des e-mails.");
    console.info(`\n[e-mail non envoyé, SMTP absent] À : ${input.to}\nObjet : ${input.subject}\n${input.url}\n`);
    return;
  }
  await smtp().sendMail({ from: process.env.MAIL_FROM || "Riya <no-reply@riya.africa>", to: input.to, subject: input.subject, text, html });
}
