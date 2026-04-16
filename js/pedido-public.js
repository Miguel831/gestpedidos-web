const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const ticketEl = document.getElementById('ticket');

const params = new URLSearchParams(window.location.search);
const token = params.get('t');

async function init() {
  if (!token) {
    showError('Enlace inválido.');
    return;
  }

  try {
    const res = await fetch(
      `https://europe-west1-gestpedidos-web.cloudfunctions.net/getPublicPedido?t=${encodeURIComponent(token)}`
    );

    if (!res.ok) {
      throw new Error('No se pudo cargar el pedido.');
    }

    const pedido = await res.json();

    document.getElementById('codigo').textContent = pedido.codigo || '—';
    document.getElementById('clienteNombre').textContent = pedido.clienteNombre || '—';
    document.getElementById('proveedorNombre').textContent = pedido.proveedorNombre || '—';
    document.getElementById('estado').textContent = pedido.estado || 'Pendiente';
    document.getElementById('fechaEnvio').textContent = pedido.fechaEnvio || '—';
    document.getElementById('fechaRecibo').textContent = pedido.fechaRecibo || '—';
    document.getElementById('descripcion').textContent = pedido.descripcion || 'Sin observaciones.';

    await QRCode.toCanvas(
      document.getElementById('qrCanvas'),
      pedido.qrText || pedido.codigo,
      { width: 180, margin: 1 }
    );

    loadingEl.hidden = true;
    ticketEl.hidden = false;
  } catch (error) {
    showError(error.message || 'Error al cargar el pedido.');
  }
}

function showError(message) {
  loadingEl.hidden = true;
  errorEl.hidden = false;
  errorEl.textContent = message;
}

init();