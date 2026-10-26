import { z } from 'zod';

export const authEmailSchema = z.object({
  to: z.email(),
  kind: z.enum(['verification', 'password-reset', 'existing-account']),
  url: z.url(),
});
export type AuthEmail = z.infer<typeof authEmailSchema>;

const copy = {
  verification: {
    subject: 'Verify your SWUBASE email and set a password',
    heading: 'Welcome to your base.',
    description:
      'Verify your email and choose a password to save your decks, track your collection, and join the community.',
    action: 'Verify email & set password',
    note: 'This link expires in one hour and can only be used once. Choose your own password on the next page to verify your address. Then you can also sign in with Google using this email.',
  },
  'password-reset': {
    subject: 'Set your SWUBASE password',
    heading: 'Let’s get you back in.',
    description:
      'Choose a new password for your SWUBASE account. If you normally use Google or GitHub, this adds a password to that same account. Your decks and collection stay with you.',
    action: 'Set a new password',
    note: 'This link expires in one hour and can only be used once. Your existing sessions will be signed out after the password changes. Google and GitHub sign-in will keep working.',
  },
  'existing-account': {
    subject: 'Your SWUBASE account already exists',
    heading: 'Your base is already here.',
    description:
      'Someone tried to create a SWUBASE account with this email. You already have one. Sign in with your existing password, Google, or GitHub, or use “Forgot password?” to set a password.',
    action: 'Go to sign in',
    note: 'Your password has not changed. If this wasn’t you, you can ignore this email.',
  },
} as const;

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
}

export function renderAuthEmail(email: AuthEmail) {
  const content = copy[email.kind];
  const url = escapeHtml(email.url);
  const text = `${content.heading}\n\n${content.description}\n\n${content.action}: ${email.url}\n\n${content.note}\n\nIf you didn’t request this email, you can ignore it.\nSWUBASE — Your Star Wars: Unlimited companion.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${content.subject}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3f4f1;color:#17251f;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${content.description}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e5df;border-radius:20px;overflow:hidden">
<tr><td style="background:#17352e;border-radius:20px 20px 0 0"><img src="cid:swubase-header" width="600" height="180" alt="SWUBASE — Your Star Wars: Unlimited companion" style="display:block;width:100%;height:auto;border:0;border-radius:20px 20px 0 0;color:#fffaf0;font-size:24px"></td></tr>
<tr><td style="padding:32px 28px"><h1 style="margin:0 0 16px;font-size:30px;line-height:1.2;letter-spacing:-1px">${content.heading}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#56615a">${content.description}</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#17352e" style="border-radius:10px"><a href="${url}" style="display:inline-block;padding:15px 22px;border:1px solid #17352e;border-radius:10px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold">${content.action}</a></td></tr></table>
<p style="margin:24px 0 16px;font-size:13px;line-height:1.7;color:#56615a">${content.note}</p>
<p style="margin:0;font-size:12px;line-height:1.7;color:#6b746e">If the button doesn’t work, copy this link into your browser:<br><a href="${url}" style="color:#276547;word-break:break-all;overflow-wrap:anywhere">${url}</a></p></td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #e2e5df;background:#f8f9f6;border-radius:0 0 20px 20px;font-size:12px;line-height:1.7;color:#6b746e">If you didn’t request this email, you can ignore it.<br>SWUBASE · Your Star Wars: Unlimited companion<br><span style="font-size:10px">Header illustrations: Theed Palace — Adrien Girod · Shield Generator Complex — Reno. Star Wars: Unlimited © Fantasy Flight Games / Lucasfilm.</span></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: content.subject, html, text };
}
