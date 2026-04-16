import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import twilio from 'twilio';

import crypto from 'node:crypto';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const PUBLIC_TICKET_BASE_URL = 'https://miguel831.github.io/gestpedidos-web/pedido.html?t={{3}}';

function createPublicToken() {
  return crypto.randomBytes(24).toString('base64url');
}

async function createPedidoPublicLink({ codigo, uid }) {
  const token = createPublicToken();

  await db.collection('pedido_public_links').doc(token).set({
    codigo,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * 30),
    createdByUid: uid
  });

  return token;
}

initializeApp();
const db = getFirestore();

const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
const TWILIO_WHATSAPP_FROM = defineSecret('TWILIO_WHATSAPP_FROM');

const TWILIO_FIXED_TO = '+34628371861';

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

function formatTemplateDate(value) {
  if (!value) return '';

  if (typeof value === 'string') return value;

  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleDateString('es-ES');
  }

  return String(value);
}

export const sendWhatsAppMessage = onCall(
  {
    region: 'europe-west1',
    enforceAppCheck: false,
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM]
  },
  async request => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión antes de enviar mensajes.');
    }

    const codigo = normalizeCodigo(request.data?.codigo);
    const uid = request.auth.uid;

    const pedidoSnap = await db.collection('pedidos').doc(codigo).get();
    if (!pedidoSnap.exists) {
      throw new HttpsError('not-found', 'Pedido no encontrado.');
    }

    const pedido = pedidoSnap.data();

    //const telefono = normalizePhone(pedido.clienteNumero);
    const telefono = normalizePhone(TWILIO_FIXED_TO)
    const clienteNombre = sanitizeName(pedido.clienteNombre || 'cliente');
    const fecha = formatTemplateDate(pedido.fechaEnvio || pedido.createdAt);

    await enforceUidRateLimit(uid);
    const pedidoLockRef = await acquirePedidoLock(codigo, uid, telefono);

    try {
      const client = getTwilioClient();
      const fromNumber = String(TWILIO_WHATSAPP_FROM.value() || '').replace(/^whatsapp:/i, '');

      const publicToken = await createPedidoPublicLink({ codigo, uid });

      const contentSid = 'HXd65479511b5514d38cd9a08129f40901';
      const contentVariables = JSON.stringify({
        1: fecha,
        2: clienteNombre,
        3: publicToken
      });

      const message = await client.messages.create({
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${telefono}`,
        contentSid,
        contentVariables
      });

      await db.collection('whatsapp_logs').doc(message.sid).set({
        sid: message.sid,
        codigo,
        telefono,
        clienteNombre,
        estadoPedido: estado,
        publicToken,
        provider: 'twilio',
        channel: 'whatsapp',
        direction: 'outbound',
        twilioStatus: message.status || 'queued',
        twilioFrom: `whatsapp:${fromNumber}`,
        twilioTo: `whatsapp:${telefono}`,
        contentSid,
        contentVariables: { 1: clienteNombre, 2: codigo, 3: estado, 4: publicToken },
        createdAt: FieldValue.serverTimestamp(),
        createdByUid: uid
      });

      await markPedidoLockSuccess(pedidoLockRef, message.sid);

      return { ok: true, sid: message.sid, status: message.status || 'queued' };
    } catch (error) {
    const safeMessage = String(error?.message || 'No se pudo enviar el WhatsApp.');
    const safeCode = error?.code ?? null;
    const safeStatus = error?.status ?? null;
    const safeMoreInfo = error?.moreInfo ?? null;

    await Promise.allSettled([
      releasePedidoLockOnError(pedidoLockRef, safeMessage),
      db.collection('whatsapp_logs').add({
        codigo,
        telefono,
        clienteNombre,
        estadoPedido: estado,
        provider: 'twilio',
        channel: 'whatsapp',
        direction: 'outbound',
        ok: false,
        errorMessage: safeMessage,
        errorCode: safeCode,
        errorStatus: safeStatus,
        moreInfo: safeMoreInfo,
        createdAt: FieldValue.serverTimestamp(),
        createdByUid: uid
      })
    ]);

    throw new HttpsError(
      'failed-precondition',
      'No se pudo enviar el WhatsApp.',
      {
        provider: 'twilio',
        message: safeMessage,
        twilioCode: safeCode,
        twilioStatus: safeStatus,
        moreInfo: safeMoreInfo
      }
    );
  }})

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


export const getPublicPedido = onRequest(
  { region: 'europe-west1' },
  async (req, res) => {
    const origin = req.get('origin') || '';
    if (origin === 'https://tudominio.com') {
      res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const token = String(req.query.t || '').trim();
    if (!token) {
      res.status(400).json({ error: 'token requerido' });
      return;
    }

    const linkSnap = await db.collection('pedido_public_links').doc(token).get();
    if (!linkSnap.exists) {
      res.status(404).json({ error: 'enlace no encontrado' });
      return;
    }

    const link = linkSnap.data();
    const expiresAtMs = link.expiresAt?.toMillis?.() || 0;

    if (!link.active || (expiresAtMs && expiresAtMs < Date.now())) {
      res.status(410).json({ error: 'enlace caducado' });
      return;
    }

    const pedidoSnap = await db.collection('pedidos').doc(link.codigo).get();
    if (!pedidoSnap.exists) {
      res.status(404).json({ error: 'pedido no encontrado' });
      return;
    }

    const pedido = pedidoSnap.data();

    res.set('Cache-Control', 'private, max-age=60');
    res.json({
      codigo: pedido.codigo,
      clienteNombre: pedido.clienteNombre || '',
      proveedorNombre: pedido.proveedorNombre || '',
      estado: pedido.estado || 'Pendiente',
      fechaEnvio: pedido.fechaEnvio || '',
      fechaRecibo: pedido.fechaRecibo || '',
      descripcion: pedido.descripcion || '',
      qrText: pedido.codigo
    });
  }
);