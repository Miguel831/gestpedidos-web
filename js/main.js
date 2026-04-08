import { state } from './state.js';
import { cleanupFirebase, initFirebase, loadPedidoByCode, savePedido } from './firebase.js';
import { cleanupScanner, readNumber, setScannerActions, startCamera } from './scanner.js';
import {
  applyRouteFromHash,
  bindUIEvents,
  buildPedidoModalHtml,
  buildProveedorModalHtml,
  clearForm,
  closeModal,
  fillFormFromPedido,
  getRefs,
  initUI,
  openModal,
  refreshModalIfNeeded,
  renderAllLists,
  renderSummary,
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

async function openPedidoByCode(code) {
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

async function applyCodeChange() {
  const nuevoCodigo = refs.editorCodeInput.value.trim();
  refs.editorCodeInput.style.display = 'none';
  refs.editorCodeBig.style.display = 'inline-block';

  if (/^\d{5}$/.test(nuevoCodigo) && nuevoCodigo !== state.currentCode) {
    refs.editorCodeBig.textContent = nuevoCodigo;
    refs.codigoInput.value = nuevoCodigo;
    refs.currentCodeEl.textContent = nuevoCodigo;

    setSaveMessage('Cargando datos del nuevo código...');
    const pedidoActualizado = await loadPedidoByCode(nuevoCodigo);
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
    const { savedPedido, proveedor } = await savePedido({
      codigo: refs.codigoInput.value,
      estado: refs.estadoInput.value,
      proveedorId: refs.proveedorSelect.value,
      providerMode: state.providerMode,
      nuevoProveedorNombre: refs.nuevoProveedorNombre.value,
      nuevoProveedorDescripcion: refs.nuevoProveedorDescripcion.value,
      fechaEnvio: refs.fechaEnvioInput.value,
      fechaRecibo: refs.fechaReciboInput.value,
      descripcion: refs.descripcionInput.value
    });

    if (savedPedido) fillFormFromPedido(savedPedido);
    setProviderMode('existing');
    refs.proveedorSelect.value = proveedor.id;
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
  editPedido: openPedidoByCode,
  onStartCamera: startCamera,
  onCapture: () => readNumber(false),
  onRetry: () => readNumber(true),
  onReset: clearForm,
  onSave: handleSavePedido,
  onToggleProviderMode: () => setProviderMode(state.providerMode === 'new' ? 'existing' : 'new'),
  onCloseEditor: clearForm
});

setScannerActions({
  onCodeDetected: openPedidoByCode
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
