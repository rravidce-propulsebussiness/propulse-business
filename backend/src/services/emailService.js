async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Password reset email delivery is not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Reset your ProPulse Business password',
        html: `<!doctype html><html><body style="margin:0;background:#f4f6f9;font-family:Arial,sans-serif;color:#101828"><div style="max-width:560px;margin:40px auto;padding:32px;background:#fff;border:1px solid #e4e8ee;border-radius:18px"><div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#123f8c">PROPULSE BUSINESS</div><h1 style="font-size:28px;margin:18px 0 10px">Reset your password</h1><p style="line-height:1.6;color:#667085">Hi ${escapeHtml(name || 'there')}, we received a request to reset your ProPulse Business password.</p><p style="line-height:1.6;color:#667085">This link expires in 30 minutes and can only be used once.</p><p style="margin:28px 0"><a href="${escapeAttribute(resetUrl)}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#071b3e;color:#fff;text-decoration:none;font-weight:800">Reset password</a></p><p style="font-size:12px;line-height:1.6;color:#98a2b3">If you did not request this, you can safely ignore this email.</p></div></body></html>`,
      }),
      signal: controller.signal,
    });

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 64 * 1024) {
      throw new Error('Email provider returned an unexpectedly large response');
    }

    if (!response.ok) {
      const body = await readResponseTextLimited(response, 64 * 1024);
      if (body === null) {
        throw new Error(`Email provider rejected the reset email (HTTP ${response.status})`);
      }
      throw new Error(`Email provider rejected the reset email (HTTP ${response.status})`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Email provider request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseTextLimited(response, maxBytes) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, total).toString('utf8');
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

module.exports = { sendPasswordResetEmail };
