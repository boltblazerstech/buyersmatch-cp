import axios from 'axios';
import { BASE_URL } from '../api/http';

const PING_INTERVAL_MS = 60 * 1000; // 1 minute
const NOTIFY_EMAIL = import.meta.env.VITE_NOTIFY_EMAIL || 'harshiscoding@gmail.com';

async function sendFailureEmail(errorMessage) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.warn('[KeepAlive] EmailJS not configured — skipping email notification.');
    return;
  }

  try {
    const emailjs = (await import('@emailjs/browser')).default;
    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: NOTIFY_EMAIL,
        backend_url: BASE_URL,
        error_message: errorMessage,
        timestamp: new Date().toLocaleString(),
      },
      publicKey
    );
    console.log('[KeepAlive] Failure notification sent to', NOTIFY_EMAIL);
  } catch (emailErr) {
    console.error('[KeepAlive] Could not send failure email:', emailErr.message);
  }
}

let intervalId = null;
let lastPingFailed = false;

async function ping() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 10000 });
    if (lastPingFailed) {
      console.log('[KeepAlive] Backend recovered at', new Date().toLocaleTimeString());
    }
    lastPingFailed = false;
  } catch (err) {
    const msg = err?.message || 'Unknown error';
    console.error('[KeepAlive] Ping FAILED at', new Date().toLocaleTimeString(), '—', msg);
    // Only email on first failure to avoid spam
    if (!lastPingFailed) {
      await sendFailureEmail(msg);
    }
    lastPingFailed = true;
  }
}

export function startKeepAlive() {
  if (intervalId) return;
  ping(); // immediate first ping
  intervalId = setInterval(ping, PING_INTERVAL_MS);
  console.log('[KeepAlive] Started — pinging backend every 60 s.');
}

export function stopKeepAlive() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[KeepAlive] Stopped.');
  }
}
