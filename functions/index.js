import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import twilio from 'twilio';

initializeApp();
const db = getFirestore();

const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
const TWILIO_WHATSAPP_FROM = defineSecret('TWILIO_WHATSAPP_FROM');
const TWILIO_CONTENT_SID = defineSecret('TWILIO_CONTENT_SID');

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_PER_WINDOW = 3;
const DUPLICATE_LOCK_MS = 60 * 1000;
const IN_FLIGHT_LOCK_MS = 15 * 1000;

function normalizePhone(phone) {
  const value = String(phone || '').replace(/\s+/g, '').trim();

  if (!/^\+\d{8,15}$/.test(value)) {
    throw new HttpsError(
      'invalid-argument',
      'El número debe estar en formato internacional, por ejemplo +34600111222.'
    );
  }

  return value;
}

function normalizeCodigo(codigo) {
  const value = String(codigo || '').trim();

  if (!/^\d{6}$/.test(value)) {
    throw new HttpsError('invalid-argument', 'El código de pedido debe tener 6 dígitos.');
  }

  return value;
}

function sanitizeName(value) {
  return String(value || '').trim().slice(0, 120);
}

function sanitizeEstado(value) {
  return String(value || '').trim().slice(0, 80) || 'Pendiente';
}

function buildMessage({ codigo, clienteNombre, estado }) {
  const nombre = clienteNombre || 'cliente';
  const pedido = codigo || 'sin código';

  if (estado === 'Recibido') {
    return `Hola ${nombre}, te confirmamos que el pedido ${pedido} ya ha sido recibido.`;
  }

  if (estado === 'En tránsito') {
    return `Hola ${nombre}, tu pedido ${pedido} está en tránsito.`;
  }

  return `Hola ${nombre}, hay una actualización sobre tu pedido ${pedido}. Estado actual: ${estado}.`;
}

function getTwilioClient() {
  return twilio(TWILIO_ACCOUNT_SID.value(), TWILIO_AUTH_TOKEN.value());
}

function buildRequestUrl(req) {
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
  return `${proto}://${host}${req.originalUrl}`;
}

function getWebhookParams(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return Object.fromEntries(
      Object.entries(req.body).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
    );
  }

  const raw = req.rawBody?.toString('utf8') || '';
  return Object.fromEntries(new URLSearchParams(raw).entries());
}

async function enforceUidRateLimit(uid) {
  const ref = db.collection('_system_whatsapp_rate_limits').doc(uid);
  const now = Date.now();

  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() : {};

    let windowStartedAtMs = Number(data.windowStartedAtMs || 0);
    let sentCount = Number(data.sentCount || 0);

    if (!windowStartedAtMs || now - windowStartedAtMs >= RATE_LIMIT_WINDOW_MS) {
      windowStartedAtMs = now;
      sentCount = 0;
    }

    if (sentCount >= RATE_LIMIT_MAX_PER_WINDOW) {
      throw new HttpsError('resource-exhausted', 'Has alcanzado el límite temporal de envíos. Espera un minuto.');
    }

    transaction.set(ref, {
      uid,
      windowStartedAtMs,
      sentCount: sentCount + 1,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

async function acquirePedidoLock(codigo, uid, telefono) {
  const ref = db.collection('_system_whatsapp_pedido_locks').doc(codigo);
  const now = Date.now();

  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() : {};
    const lockUntilMs = Number(data.lockUntilMs || 0);
    const lastTelefono = String(data.telefono || '');

    if (lockUntilMs > now && (!lastTelefono || lastTelefono === telefono)) {
      throw new HttpsError('resource-exhausted', 'Ese pedido ya tiene un envío reciente o en curso. Espera un minuto.');
    }

    transaction.set(ref, {
      codigo,
      telefono,
      lastAttemptByUid: uid,
      lastAttemptAt: FieldValue.serverTimestamp(),
      lockUntilMs: now + IN_FLIGHT_LOCK_MS
    }, { merge: true });
  });

  return ref;
}

async function markPedidoLockSuccess(ref, sid) {
  const now = Date.now();
  await ref.set({
    lastSid: sid,
    lastSuccessAt: FieldValue.serverTimestamp(),
    lockUntilMs: now + DUPLICATE_LOCK_MS
  }, { merge: true });
}

async function releasePedidoLockOnError(ref, errorMessage) {
  await ref.set({
    lockUntilMs: 0,
    lastError: String(errorMessage || 'error desconocido').slice(0, 300),
    lastErrorAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

export const sendWhatsAppMessage = onCall(
  {
    region: 'europe-west1',
    enforceAppCheck: false,
    secrets: [
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_FROM,
      TWILIO_CONTENT_SID
    ]
  },
  async request => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión antes de enviar mensajes.');
    }

    const client = twilio(
      TWILIO_ACCOUNT_SID.value(),
      TWILIO_AUTH_TOKEN.value()
    );

    try {
      const message = await client.messages.create({
        to: 'whatsapp:+34628371861',
        from: `whatsapp:${TWILIO_WHATSAPP_FROM.value()}`,
        contentSid: TWILIO_CONTENT_SID.value(),
        contentVariables: JSON.stringify({
          1: '12/1',
          2: '3pm'
        })
      });

      await db.collection('whatsapp_logs').doc(message.sid).set({
        sid: message.sid,
        provider: 'twilio',
        channel: 'whatsapp',
        direction: 'outbound',
        twilioStatus: message.status || 'queued',
        createdAt: FieldValue.serverTimestamp(),
        createdByUid: request.auth.uid
      });

      return {
        ok: true,
        sid: message.sid,
        status: message.status || 'queued'
      };
    } catch (error) {
      console.error('Twilio error:', error);
      throw new HttpsError(
        'internal',
        error?.message || 'No se pudo enviar el WhatsApp.'
      );
    }
  }
);

export const twilioStatusCallback = onRequest(
  {
    region: 'europe-west1',
    secrets: [TWILIO_AUTH_TOKEN]
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const signature = req.get('X-Twilio-Signature');
    if (!signature) {
      res.status(403).send('Missing signature');
      return;
    }

    const params = getWebhookParams(req);
    const url = buildRequestUrl(req);
    const isValid = twilio.validateRequest(TWILIO_AUTH_TOKEN.value(), signature, url, params);

    if (!isValid) {
      res.status(403).send('Invalid signature');
      return;
    }

    const sid = String(params.MessageSid || '').trim();
    const status = String(params.MessageStatus || 'unknown').trim();
    const errorCode = String(params.ErrorCode || '').trim();
    const errorMessage = String(params.ErrorMessage || '').trim();

    if (sid) {
      await db.collection('whatsapp_logs').doc(sid).set({
        twilioStatus: status,
        twilioErrorCode: errorCode,
        twilioErrorMessage: errorMessage,
        statusUpdatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    res.status(200).send('ok');
  }
);
