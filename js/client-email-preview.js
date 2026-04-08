const STORE_INFO = {
  brandName: 'Arcas Joyeros',
  phone: '',
  email: '',
  address: '',
  contactLabel: 'Contactar con la tienda'
};

const OVERLAY_ID = 'clientEmailPreviewOverlay';
const STYLE_ID = 'clientEmailPreviewStyles';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .cep-overlay {
      position: fixed;
      inset: 0;
      z-index: 250;
      background: rgba(20, 28, 36, 0.42);
      backdrop-filter: blur(8px);
      display: grid;
      place-items: center;
      padding: 24px;
    }

    .cep-panel {
      width: min(880px, 100%);
      max-height: min(92vh, 980px);
      overflow: auto;
      background: var(--bg, #faf9f7);
      border: 1px solid rgba(90, 100, 115, 0.18);
      border-radius: 28px;
      box-shadow: 0 16px 48px rgba(30, 42, 53, 0.18);
    }

    .cep-shell {
      display: grid;
      gap: 18px;
      padding: 26px;
    }

    .cep-toolbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
    }

    .cep-kicker {
      font-family: 'Cormorant SC', Georgia, serif;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--brand-soft, #8496a3);
      font-size: 0.72rem;
      margin-bottom: 8px;
    }

    .cep-title {
      color: var(--brand, #3d4f5e);
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-style: italic;
      font-size: clamp(2rem, 3vw, 2.8rem);
      line-height: 0.95;
    }

    .cep-toolbar-note {
      color: var(--text-muted, #7a8a96);
      font-size: 0.96rem;
      line-height: 1.6;
      max-width: 32rem;
    }

    .cep-close {
      border: 1px solid rgba(90, 100, 115, 0.16);
      background: #fff;
      color: var(--brand, #3d4f5e);
      width: 44px;
      height: 44px;
      border-radius: 999px;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
    }

    .cep-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
    }

    .cep-meta-card {
      background: rgba(255,255,255,0.82);
      border: 1px solid rgba(90, 100, 115, 0.12);
      border-radius: 16px;
      padding: 14px 16px;
    }

    .cep-meta-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--text-muted, #7a8a96);
      margin-bottom: 6px;
    }

    .cep-meta-value {
      color: var(--text, #1e2a35);
      font-size: 0.98rem;
      line-height: 1.5;
      word-break: break-word;
    }

    .cep-email {
      background: #fff;
      border: 1px solid rgba(90, 100, 115, 0.13);
      border-radius: 24px;
      overflow: hidden;
    }

    .cep-email-header {
      padding: 28px 30px 20px;
      background: linear-gradient(180deg, rgba(245,243,239,0.92), rgba(255,255,255,0.98));
      border-bottom: 1px solid rgba(90, 100, 115, 0.10);
    }

    .cep-brand {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-style: italic;
      font-size: 2.5rem;
      color: var(--brand, #3d4f5e);
      line-height: 0.95;
    }

    .cep-brand-sub {
      font-family: 'Cormorant SC', Georgia, serif;
      font-size: 0.7rem;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--brand-soft, #8496a3);
      margin-top: 8px;
    }

    .cep-email-body {
      padding: 30px;
      display: grid;
      gap: 18px;
    }

    .cep-heading {
      color: var(--brand, #3d4f5e);
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: clamp(1.9rem, 2.3vw, 2.5rem);
      line-height: 1.05;
    }

    .cep-accent-line {
      width: 60px;
      height: 2px;
      background: var(--accent, #8b7355);
      border-radius: 999px;
    }

    .cep-copy {
      color: var(--text, #1e2a35);
      font-size: 1rem;
      line-height: 1.8;
    }

    .cep-callout {
      background: rgba(139, 115, 85, 0.08);
      border: 1px solid rgba(139, 115, 85, 0.16);
      border-radius: 16px;
      padding: 14px 16px;
      color: var(--text-mid, #3d4f5e);
      font-size: 0.95rem;
      line-height: 1.65;
    }

    .cep-button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding-top: 2px;
    }

    .cep-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 46px;
      border-radius: 999px;
      padding: 0 20px;
      border: 1px solid rgba(90, 100, 115, 0.16);
      background: #fff;
      color: var(--brand, #3d4f5e);
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }

    .cep-button.primary {
      background: var(--brand, #3d4f5e);
      color: #fff;
      border-color: transparent;
    }

    .cep-footer {
      border-top: 1px solid rgba(90, 100, 115, 0.12);
      padding-top: 18px;
      color: var(--text-muted, #7a8a96);
      font-size: 0.9rem;
      line-height: 1.8;
    }

    @media (max-width: 640px) {
      .cep-overlay { padding: 14px; }
      .cep-shell { padding: 18px; }
      .cep-email-header, .cep-email-body { padding: 22px; }
      .cep-title { font-size: 2rem; }
      .cep-brand { font-size: 2.05rem; }
      .cep-toolbar { align-items: center; }
    }
  `;

  document.head.appendChild(style);
}

function buildStoreFooter() {
  const lines = [STORE_INFO.brandName];
  const contactLine = [STORE_INFO.phone, STORE_INFO.email].filter(Boolean).join(' · ');
  if (contactLine) lines.push(contactLine);
  if (STORE_INFO.address) lines.push(STORE_INFO.address);
  return lines.map(line => `<div>${escapeHtml(line)}</div>`).join('');
}

function formatRecipient(pedido) {
  if (pedido.clienteCorreo) return pedido.clienteCorreo;
  return 'Sin correo configurado';
}

function buildPreviewHtml(pedido) {
  const clienteNombre = pedido.clienteNombre?.trim() || 'cliente';
  const subject = `Tu pedido ya ha llegado · ${STORE_INFO.brandName}`;
  const infoBlock = pedido.descripcion?.trim()
    ? `<div class="cep-callout"><strong>Información adicional</strong><br>${escapeHtml(pedido.descripcion.trim())}</div>`
    : '';

  return `
    <div class="cep-panel" role="dialog" aria-modal="true" aria-labelledby="clientEmailPreviewTitle">
      <div class="cep-shell">
        <div class="cep-toolbar">
          <div>
            <div class="cep-kicker">Prueba interna del aviso automático</div>
            <div class="cep-title" id="clientEmailPreviewTitle">Vista previa del correo al cliente</div>
            <div class="cep-toolbar-note">Esta pantalla solo enseña cómo quedaría el aviso. No se envía ningún correo real.</div>
          </div>
          <button type="button" class="cep-close" data-close-email-preview aria-label="Cerrar vista previa">✕</button>
        </div>

        <div class="cep-meta">
          <div class="cep-meta-card">
            <div class="cep-meta-label">Para</div>
            <div class="cep-meta-value">${escapeHtml(formatRecipient(pedido))}</div>
          </div>
          <div class="cep-meta-card">
            <div class="cep-meta-label">Asunto</div>
            <div class="cep-meta-value">${escapeHtml(subject)}</div>
          </div>
          <div class="cep-meta-card">
            <div class="cep-meta-label">Estado</div>
            <div class="cep-meta-value">Pedido recibido · listo para avisar</div>
          </div>
        </div>

        <div class="cep-email">
          <div class="cep-email-header">
            <div class="cep-brand">Arcas</div>
            <div class="cep-brand-sub">Gestión de pedidos</div>
          </div>

          <div class="cep-email-body">
            <div class="cep-heading">Tu pedido ya ha llegado</div>
            <div class="cep-accent-line"></div>

            <div class="cep-copy">Hola ${escapeHtml(clienteNombre)},</div>
            <div class="cep-copy">Queríamos avisarte de que tu pedido ya ha sido recibido correctamente en <strong>${escapeHtml(STORE_INFO.brandName)}</strong>.</div>
            <div class="cep-copy">Cuando te venga bien, puedes pasar a recogerlo o ponerte en contacto con nosotros si necesitas cualquier aclaración.</div>

            ${infoBlock}

            <div class="cep-button-row">
              <span class="cep-button primary">${escapeHtml(STORE_INFO.contactLabel)}</span>
            </div>

            <div class="cep-copy">Muchas gracias por tu confianza.</div>

            <div class="cep-footer">
              ${buildStoreFooter()}
            </div>
          </div>
        </div>

        <div class="cep-button-row">
          <button type="button" class="cep-button" data-close-email-preview>Cerrar vista previa</button>
        </div>
      </div>
    </div>
  `;
}

function closePreview() {
  const existing = document.getElementById(OVERLAY_ID);
  if (!existing) return;
  existing.remove();
  document.body.classList.remove('no-scroll');
}

function bindOverlayEvents(overlay) {
  overlay.addEventListener('click', event => {
    if (event.target === overlay || event.target.closest('[data-close-email-preview]')) {
      closePreview();
    }
  });

  const handleEscape = event => {
    if (event.key === 'Escape') {
      closePreview();
      document.removeEventListener('keydown', handleEscape);
    }
  };

  document.addEventListener('keydown', handleEscape);
}

export function showClientEmailPreview(pedido) {
  injectStyles();
  closePreview();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'cep-overlay';
  overlay.innerHTML = buildPreviewHtml(pedido);

  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');
  bindOverlayEvents(overlay);
}

export function cleanupClientEmailPreview() {
  closePreview();
}
