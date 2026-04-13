import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import twilio from "twilio";

initializeApp();
const db = getFirestore();

const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_FROM = defineSecret("TWILIO_WHATSAPP_FROM");

function normalizePhone(phone) {
  const value = String(phone || "").replace(/\s+/g, "").trim();

  if (!/^\+\d{8,15}$/.test(value)) {
    throw new HttpsError(
      "invalid-argument",
      "El número debe estar en formato internacional, por ejemplo +34600111222."
    );
  }

  return value;
}

function buildMessage({ codigo, clienteNombre, estado }) {
  const nombre = clienteNombre || "cliente";
  const pedido = codigo || "sin código";

  if (estado === "Recibido") {
    return `Hola ${nombre}, te confirmamos que el pedido ${pedido} ya ha sido recibido.`;
  }

  if (estado === "En tránsito") {
    return `Hola ${nombre}, tu pedido ${pedido} está en tránsito.`;
  }

  return `Hola ${nombre}, hay una actualización sobre tu pedido ${pedido}.`;
}

export const sendWhatsAppMessage = onCall(
  {
    region: "europe-west1",
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    const { codigo, telefono, clienteNombre, estado } = request.data || {};
    const to = normalizePhone(telefono);

    const client = twilio(
      TWILIO_ACCOUNT_SID.value(),
      TWILIO_AUTH_TOKEN.value()
    );

    const message = await client.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_FROM.value()}`,
      to: `whatsapp:${to}`,
      body: buildMessage({ codigo, clienteNombre, estado })
    });

    await db.collection("whatsapp_logs").doc(message.sid).set({
      sid: message.sid,
      codigo: codigo || "",
      telefono: to,
      clienteNombre: clienteNombre || "",
      estadoPedido: estado || "",
      channel: "whatsapp",
      provider: "twilio",
      twilioStatus: message.status || "queued",
      direction: "outbound",
      createdAt: FieldValue.serverTimestamp()
    });

    return {
      ok: true,
      sid: message.sid,
      status: message.status || "queued"
    };
  }
);

// Opcional en pruebas: registrar cambios de estado de Twilio
export const twilioStatusCallback = onRequest(
  { region: "europe-west1" },
  async (req, res) => {
    const raw = req.rawBody?.toString() || "";
    const params = new URLSearchParams(raw);

    const sid = params.get("MessageSid");
    const status = params.get("MessageStatus");

    if (sid) {
      await db.collection("whatsapp_logs").doc(sid).set(
        {
          twilioStatus: status || "unknown",
          statusUpdatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    res.status(200).send("ok");
  }
);