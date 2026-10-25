import { Resend } from "resend";
import { OTP_TTL_MINUTES } from "@/lib/otp";

const DEFAULT_FROM = "tryyON <onboarding@resend.dev>";

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

type SendResult = { ok: true } | { ok: false; error: string };

export async function sendPasswordResetCode(to: string, code: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set" };

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || DEFAULT_FROM,
    to,
    subject: `${code} is your tryyON password reset code`,
    html: passwordResetHtml(code),
    text:
      `Your tryyON password reset code is ${code}.\n\n` +
      `It expires in ${OTP_TTL_MINUTES} minutes. If you didn't ask to reset your password, ` +
      `you can ignore this email and your password will stay the same.`,
  });

  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Table-based, inline-styled markup so it renders in Gmail, Outlook and Apple Mail. */
function passwordResetHtml(code: string) {
  const spaced = code.split("").join("&nbsp;");
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f6fa;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#131845;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:20px;padding:36px 32px;">
          <tr><td style="font-size:22px;font-weight:700;letter-spacing:-0.3px;">tryy<span style="background:#4c5cff;color:#ffffff;border-radius:999px;padding:2px 9px;font-size:13px;margin-left:3px;">ON</span></td></tr>
          <tr><td style="padding-top:24px;font-size:20px;font-weight:600;">Reset your password</td></tr>
          <tr><td style="padding-top:8px;font-size:15px;line-height:1.55;color:#4a5088;">Enter this code to choose a new password. It expires in ${OTP_TTL_MINUTES} minutes.</td></tr>
          <tr><td align="center" style="padding:24px 0;">
            <div style="display:inline-block;background:#eceef6;border-radius:14px;padding:16px 22px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:4px;color:#131845;">${spaced}</div>
          </td></tr>
          <tr><td style="font-size:13px;line-height:1.55;color:#6b71a3;">If you didn't ask to reset your password, you can ignore this email. Your password will stay the same and nobody can change it without this code.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
