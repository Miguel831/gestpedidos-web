
import { state } from './state.js';
import { emailPreviewStoreConfig } from './email-preview-config.js';

const refs = {
  screen: null,
  frame: null,
  html: null,
  meta: null,
  feedback: null,
  backBtn: null,
  copyBtn: null
};

const navigation = {
  setRoute: () => {}
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '#';
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
  return '#';
}

function buildObservacionesBlock(observaciones) {
  if (!observaciones) return '';
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f3ef; border:1px solid rgba(139,115,85,0.16); border-radius:14px; margin:0 0 24px 0;">
      <tr>
        <td style="padding:16px 18px;">
          <div style="font-family: Arial, Helvetica, sans-serif; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:#8b7355; margin-bottom:8px;">
            Información adicional
          </div>
          <div style="font-family: Arial, Helvetica, sans-serif; font-size:15px; line-height:1.65; color:#3d4f5e;">
            ${escapeHtml(observaciones)}
          </div>
        </td>
      </tr>
    </table>`;
}

export function buildPedidoReceivedEmailHtml(pedido) {
  const clienteNombre = escapeHtml(pedido?.clienteNombre || 'Cliente');
  const observaciones = String(pedido?.descripcion || '').trim();
  const tienda = emailPreviewStoreConfig;
  const urlContacto = escapeHtml(sanitizeUrl(tienda.urlContacto));

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Tu pedido ya ha llegado · ${escapeHtml(tienda.nombreTienda)}</title>
</head>
<body style="margin:0; padding:0; background:#faf9f7; color:#1e2a35;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#faf9f7; margin:0; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; margin:0 auto;">

          <tr>
            <td style="padding:0 20px 18px 20px;">
              <div style="font-family: Georgia, 'Times New Roman', serif; font-style:italic; font-size:38px; line-height:1; color:#3d4f5e; text-align:left;">
                Arcas
              </div>
              <div style="font-family: Arial, Helvetica, sans-serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#8496a3; margin-top:8px;">
                Gestión de pedidos
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff; border:1px solid rgba(90,100,115,0.13); border-radius:20px;">
                <tr>
                  <td style="padding:34px 32px 18px 32px;">
                    <div style="font-family: Georgia, 'Times New Roman', serif; font-size:30px; line-height:1.2; color:#3d4f5e; margin:0 0 10px 0;">
                      Tu pedido ya ha llegado
                    </div>
                    <div style="width:56px; height:2px; background:#8b7355; margin:0 0 22px 0;"></div>

                    <p style="margin:0 0 14px 0; font-family: Arial, Helvetica, sans-serif; font-size:16px; line-height:1.7; color:#1e2a35;">
                      Hola ${clienteNombre},
                    </p>

                    <p style="margin:0 0 14px 0; font-family: Arial, Helvetica, sans-serif; font-size:16px; line-height:1.7; color:#1e2a35;">
                      Queríamos avisarte de que tu pedido ya ha sido recibido correctamente en <strong>${escapeHtml(tienda.nombreTienda)}</strong>.
                    </p>

                    <p style="margin:0 0 20px 0; font-family: Arial, Helvetica, sans-serif; font-size:16px; line-height:1.7; color:#1e2a35;">
                      Cuando te venga bien, puedes pasar a recogerlo o ponerte en contacto con nosotros si necesitas cualquier aclaración.
                    </p>

                    ${buildObservacionesBlock(observaciones)}

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px 0;">
                      <tr>
                        <td align="center" style="border-radius:999px; background:#3d4f5e;">
                          <a href="${urlContacto}" style="display:inline-block; padding:14px 22px; font-family: Arial, Helvetica, sans-serif; font-size:14px; font-weight:600; letter-spacing:0.4px; color:#ffffff; text-decoration:none;">
                            Contactar con la tienda
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size:15px; line-height:1.7; color:#7a8a96;">
                      Muchas gracias por tu confianza.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 32px 28px 32px;">
                    <div style="border-top:1px solid rgba(90,100,115,0.13); padding-top:18px; font-family: Arial, Helvetica, sans-serif; font-size:13px; line-height:1.8; color:#7a8a96;">
                      <strong style="color:#3d4f5e;">${escapeHtml(tienda.nombreTienda)}</strong><br>
                      ${escapeHtml(tienda.telefonoTienda)} · ${escapeHtml(tienda.emailTienda)}<br>
                      ${escapeHtml(tienda.direccionTienda)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderEmailPreview() {
  if (!refs.frame || !refs.html || !refs.meta) return;

  const preview = state.emailPreview || {};
  refs.frame.srcdoc = preview.html || '';
  refs.html.value = preview.html || '';

  const pedidoLabel = preview.pedidoCodigo ? `Pedido ${preview.pedidoCodigo}` : 'Pedido sin código';
  const recipientLabel = preview.recipient ? ` · Destinatario: ${preview.recipient}` : '';
  const subjectLabel = preview.subject ? ` · Asunto: ${preview.subject}` : '';
  refs.meta.textContent = `${pedidoLabel}${recipientLabel}${subjectLabel}`;
  if (refs.feedback) refs.feedback.textContent = preview.feedback || 'Vista previa generada para esta prueba.';
}

async function copyPreviewHtml() {
  const preview = state.emailPreview || {};
  if (!preview.html) return;

  try {
    await navigator.clipboard.writeText(preview.html);
    if (refs.feedback) refs.feedback.textContent = 'HTML copiado al portapapeles.';
  } catch (_error) {
    if (refs.feedback) refs.feedback.textContent = 'No se pudo copiar automáticamente. Puedes copiarlo desde el cuadro inferior.';
  }
}

export function initEmailPreview({ setRoute }) {
  navigation.setRoute = setRoute;
  refs.screen = document.getElementById('screenCorreoPreview');
  refs.frame = document.getElementById('emailPreviewFrame');
  refs.html = document.getElementById('emailPreviewHtml');
  refs.meta = document.getElementById('emailPreviewMeta');
  refs.feedback = document.getElementById('emailPreviewFeedback');
  refs.backBtn = document.getElementById('emailPreviewBackBtn');
  refs.copyBtn = document.getElementById('emailPreviewCopyBtn');

  refs.backBtn?.addEventListener('click', () => {
    navigation.setRoute((state.emailPreview && state.emailPreview.backRoute) || 'inicio');
  });

  refs.copyBtn?.addEventListener('click', copyPreviewHtml);

  renderEmailPreview();
}

export function openPedidoReceivedEmailPreview(pedido, { backRoute = 'inicio' } = {}) {
  const html = buildPedidoReceivedEmailHtml(pedido);
  state.emailPreview = {
    pedidoCodigo: pedido?.codigo || '',
    recipient: pedido?.clienteCorreo || '',
    subject: 'Tu pedido ya ha llegado · Arcas Joyeros',
    backRoute,
    html,
    feedback: 'Vista previa generada para esta prueba. Todavía no se envía ningún correo real.'
  };

  renderEmailPreview();
  navigation.setRoute('correo-preview');
}
