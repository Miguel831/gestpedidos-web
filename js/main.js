import { state } from './state.js';
import { cleanupFirebase, initFirebase, loadPedidoByCode, markPedidoAsRecibido, savePedido } from './firebase.js';
import { cleanupScanner, readNumber, setScannerActions, startCamera } from './scanner.js';
import {
  applyRouteFromHash,
  bindUIEvents,
  buildClienteModalHtml,
  buildPedidoModalHtml,
  buildProveedorModalHtml,
  clearForm,
  closeModal,
  escapeHtml,
  fillFormFromPedido,
  formatDate,
  formatDateTime,
  getRefs,
  initUI,
  openModal,
  refreshModalIfNeeded,
  renderAllLists,
  renderSummary,
  setClientMode,
  setHomeRecordsView,
  setProviderMode,
  setSaveMessage,
  setScanMessage,
  setSyncStatus,
  setUIActions,
  updateScannerVisibility
} from './ui.js';

initUI();
const refs = getRefs();

async function loadPedidoIntoEditor(code) {
  const pedido = await loadPedidoByCode(code);
  refs.currentCodeEl.textContent = pedido.codigo;
  fillFormFromPedido(pedido);
  return pedido;
}

async function openPedidoModal(code) {
  const pedido = await loadPedidoByCode(code);
  state.modalType = 'pedido';
  state.modalTargetId = pedido.codigo;
  openModal(buildPedidoModalHtml(pedido));
}

function openProveedorModal(proveedorId) {
  const proveedor = state.proveedoresMap.get(proveedorId);
  if (!proveedor) return;

  state.modalType = 'proveedor';
  state.modalTargetId = proveedor.id;
  openModal(buildProveedorModalHtml(proveedor));
}

function openClienteModal(clienteId) {
  const cliente = state.clientesMap.get(clienteId);
  if (!cliente) return;

  state.modalType = 'cliente';
  state.modalTargetId = cliente.id;
  openModal(buildClienteModalHtml(cliente));
}

function buildMailtoUrl(pedido) {
  const destinatario = encodeURIComponent(pedido.clienteCorreo || '');
  const asunto = encodeURIComponent(`Tu pedido ${pedido.codigo} ya está disponible`);
  const saludo = pedido.clienteNombre ? `Hola ${pedido.clienteNombre},` : 'Hola,';
  const cuerpo = encodeURIComponent(`${saludo}

Te confirmamos que tu pedido ${pedido.codigo} ya ha sido recibido y está disponible.

Gracias.`);
  return `mailto:${destinatario}?subject=${asunto}&body=${cuerpo}`;
}

function bindModalAction(selector, handler) {
  const element = refs.detailModalBody.querySelector(selector);
  if (element) element.addEventListener('click', handler);
}

function showNotifyClientModal(pedido, notice = 'Pedido recibido.') {
  state.modalType = null;
  state.modalTargetId = '';

  const hasEmail = Boolean(String(pedido.clienteCorreo || '').trim());
  openModal(`
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Confirmación</div>
        <div class="modal-title text-title" id="detailModalTitle">Pedido recibido</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="scan-flow-stack">
      <div class="scan-flow-note">${escapeHtml(notice)}</div>
      <div class="scan-flow-note">${hasEmail
        ? `¿Avisar ahora a ${escapeHtml(pedido.clienteNombre || 'este cliente')} por correo?`
        : `${escapeHtml(pedido.clienteNombre || 'Este cliente')} no tiene correo guardado.`}</div>
    </div>

    <div class="modal-actions">
      ${hasEmail ? '<button type="button" class="btn-primary" id="notifyClientNowBtn">Sí</button>' : '<button type="button" class="btn-secondary" id="viewClienteAfterReceiveBtn">Ver cliente</button>'}
      <button type="button" class="btn-ghost" id="notifyClientLaterBtn">Más tarde</button>
    </div>
  `);

  bindModalAction('#notifyClientNowBtn', () => {
    window.location.href = buildMailtoUrl(pedido);
    closeModal();
  });
  bindModalAction('#viewClienteAfterReceiveBtn', () => {
    closeModal();
    if (pedido.clienteId) openClienteModal(pedido.clienteId);
  });
  bindModalAction('#notifyClientLaterBtn', closeModal);
}

async function handleReceiveAction(code, { force = false, notice } = {}) {
  try {
    setSyncStatus('Actualizando pedido', 'busy');
    const updatedPedido = await markPedidoAsRecibido(code, { force });
    if (updatedPedido) {
      fillFormFromPedido(updatedPedido);
      setSaveMessage(notice || `Pedido ${code} marcado como recibido.`);
      setScanMessage(`Pedido ${code} recibido correctamente.`);
      setSyncStatus('Sincronizado', 'ready');
      showNotifyClientModal(updatedPedido, notice || 'Pedido recibido correctamente.');
    }
  } catch (error) {
    console.error(error);
    setSaveMessage(error.message || 'No se pudo actualizar el pedido.');
    setSyncStatus('Error', 'error');
  }
}

function showPendingReceiptModal(pedido) {
  state.modalType = null;
  state.modalTargetId = '';

  openModal(`
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Pedido encontrado</div>
        <div class="modal-title" id="detailModalTitle">${escapeHtml(pedido.codigo)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="scan-flow-stack">
      <div class="scan-flow-card">
        <div><strong>Proveedor:</strong> ${escapeHtml(pedido.proveedorNombre || 'Sin asignar')}</div>
        <div><strong>Cliente:</strong> ${escapeHtml(pedido.clienteNombre || 'Sin asignar')}</div>
        <div><strong>Fecha de alta:</strong> ${escapeHtml(formatDate(pedido.fechaEnvio || pedido.createdAt))}</div>
      </div>
      <div class="scan-flow-question">¿Marcar como recibido ahora?</div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-primary" id="confirmReceiveBtn">Marcar como recibido</button>
      <button type="button" class="btn-ghost" id="cancelReceiveBtn">Cancelar</button>
    </div>
  `);

  bindModalAction('#confirmReceiveBtn', async () => {
    closeModal();
    await handleReceiveAction(pedido.codigo, {
      notice: `Pedido ${pedido.codigo} marcado como recibido.`
    });
  });
  bindModalAction('#cancelReceiveBtn', closeModal);
}

function showAlreadyReceivedModal(pedido) {
  state.modalType = null;
  state.modalTargetId = '';

  openModal(`
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Pedido ya recibido</div>
        <div class="modal-title" id="detailModalTitle">${escapeHtml(pedido.codigo)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="scan-flow-stack">
      <div class="scan-flow-note">
        Este pedido ya figura como recibido el ${escapeHtml(formatDateTime(pedido.fechaRecibo || pedido.updatedAt))}.
      </div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-secondary" id="viewPedidoBtn">Ver pedido</button>
      <button type="button" class="btn-primary" id="forceReceiveBtn">Actualizar fecha de recepción</button>
      <button type="button" class="btn-ghost" id="cancelAlreadyReceivedBtn">Cancelar</button>
    </div>
  `);

  bindModalAction('#viewPedidoBtn', async () => {
    closeModal();
    await openPedidoModal(pedido.codigo);
  });
  bindModalAction('#forceReceiveBtn', async () => {
    closeModal();
    await handleReceiveAction(pedido.codigo, {
      force: true,
      notice: `Fecha de recepción actualizada para el pedido ${pedido.codigo}.`
    });
  });
  bindModalAction('#cancelAlreadyReceivedBtn', closeModal);
}

async function handleScannedCode(code) {
  const pedido = await loadPedidoByCode(code);
  refs.currentCodeEl.textContent = pedido.codigo;

  if (!pedido.existsInDb) {
    const draftPedido = {
      ...pedido,
      fechaEnvio: pedido.fechaEnvio || new Date().toISOString(),
      fechaRecibo: '',
      estado: 'Pendiente'
    };
    fillFormFromPedido(draftPedido);
    setSaveMessage('Nuevo pedido preparado. Completa proveedor y cliente para guardarlo.');
    setScanMessage(`Pedido ${code} preparado. Completa la ficha y guárdalo.`);
    setSyncStatus('Nuevo pedido', 'ready');
    return draftPedido;
  }

  if (pedido.estado === 'Recibido' || pedido.fechaRecibo) {
    setScanMessage(`El pedido ${code} ya figuraba como recibido.`);
    showAlreadyReceivedModal(pedido);
    return pedido;
  }

  setScanMessage(`Pedido ${code} encontrado. Confirma si ha sido recibido.`);
  showPendingReceiptModal(pedido);
  return pedido;
}

async function applyCodeChange() {
  const nuevoCodigo = refs.editorCodeInput.value.trim();
  refs.editorCodeInput.style.display = 'none';
  refs.editorCodeBig.style.display = 'inline-block';

  if (/^\d{5}$/.test(nuevoCodigo) && nuevoCodigo !== state.currentCode) {
    refs.editorCodeBig.textContent = nuevoCodigo;
    refs.codigoInput.value = nuevoCodigo;
    refs.currentCodeEl.textContent = nuevoCodigo;

    setSaveMessage('Cargando datos del nuevo código...');
    const pedidoActualizado = await loadPedidoIntoEditor(nuevoCodigo);
    fillFormFromPedido(pedidoActualizado);
    setSaveMessage('Los datos se sincronizarán con Firebase en tiempo real.');
    return;
  }

  refs.editorCodeBig.textContent = state.currentCode || '—';
}

async function handleSavePedido(event) {
  event.preventDefault();
  refs.savePedidoBtn.disabled = true;
  setSaveMessage('Guardando…');

  try {
    const { savedPedido, proveedor, cliente } = await savePedido({
      codigo: refs.codigoInput.value,
      estado: refs.estadoInput.value,
      proveedorId: refs.proveedorSelect.value,
      providerMode: state.providerMode,
      nuevoProveedorNombre: refs.nuevoProveedorNombre.value,
      nuevoProveedorDescripcion: refs.nuevoProveedorDescripcion.value,
      clienteId: refs.clienteSelect.value,
      clientMode: state.clientMode,
      nuevoClienteNombre: refs.nuevoClienteNombre.value,
      nuevoClienteCorreo: refs.nuevoClienteCorreo.value,
      nuevoClienteNumero: refs.nuevoClienteNumero.value,
      fechaEnvio: refs.fechaEnvioInput.value,
      fechaRecibo: refs.fechaReciboInput.value,
      descripcion: refs.descripcionInput.value
    });

    if (savedPedido) fillFormFromPedido(savedPedido);
    setProviderMode('existing');
    setClientMode('existing');
    refs.proveedorSelect.value = proveedor.id;
    refs.clienteSelect.value = cliente.id;
    setSaveMessage(`Pedido ${refs.codigoInput.value.trim()} guardado correctamente.`);
    setSyncStatus('Sincronizado', 'ready');
  } catch (error) {
    console.error(error);
    setSaveMessage(error.message || 'No se pudo guardar.');
    setSyncStatus('Error', 'error');
  } finally {
    refs.savePedidoBtn.disabled = false;
    refreshModalIfNeeded();
  }
}

setUIActions({
  openPedidoModal,
  openProveedorModal,
  openClienteModal,
  editPedido: loadPedidoIntoEditor,
  onStartCamera: startCamera,
  onCapture: () => readNumber(false),
  onRetry: () => readNumber(true),
  onReset: clearForm,
  onSave: handleSavePedido,
  onToggleProviderMode: () => setProviderMode(state.providerMode === 'new' ? 'existing' : 'new'),
  onToggleClientMode: () => setClientMode(state.clientMode === 'new' ? 'existing' : 'new'),
  onCloseEditor: clearForm
});

setScannerActions({
  onCodeDetected: handleScannedCode
});

bindUIEvents();

refs.editorCodeInput.addEventListener('blur', applyCodeChange);
refs.editorCodeInput.addEventListener('keydown', async event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    await applyCodeChange();
  }

  if (event.key === 'Escape') {
    refs.editorCodeInput.value = state.currentCode;
    await applyCodeChange();
  }
});

window.addEventListener('beforeunload', () => {
  cleanupScanner();
  cleanupFirebase();
});

clearForm();
updateScannerVisibility();
renderAllLists();
renderSummary();
setHomeRecordsView('pedidos');
applyRouteFromHash();

initFirebase().catch(error => {
  console.error(error);
  setSyncStatus('Firebase pendiente', 'error');
  setScanMessage(error.message || 'Revisa la configuración de Firebase.');
});
