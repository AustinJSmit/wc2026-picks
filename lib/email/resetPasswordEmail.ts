export function resetPasswordEmail(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:36px;">⚽</span>
              <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">
                WC2026 Predictions
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;padding:40px 36px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.4px;">
                Reset your password
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.6;">
                We received a request to reset the password for your account.
                Click the button below to choose a new password. This link expires in
                <strong style="color:#1a1a1a;">1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-radius:8px;background-color:#2d6a4f;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:-0.1px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:13px;color:#71717a;line-height:1.5;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="margin:0 0 28px;font-size:12px;color:#2d6a4f;word-break:break-all;font-family:monospace;">
                ${resetUrl}
              </p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 24px;" />

              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;">
                If you didn&rsquo;t request a password reset, you can safely ignore this email —
                your password will not be changed.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                WC2026 Predictions &mdash; sent to you because you requested a password reset.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
