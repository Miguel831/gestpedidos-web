import { state } from './state.js';
import {
  cleanupFirebase,
  createPedidoFromScan,
  deleteClienteById,
  deletePedidoByCode,
  deleteProveedorById,
  initFirebase,
  loadPedidoByCode,
  markPedidoAsReceivedNow,
  savePedido
} from './firebase.js';
import { cleanupScanner, startCamera, stopCamera, setScannerActions } from './scanner.js';
import { initEmailPreview, openPedidoReceivedEmailPreview } from './email-preview.js';
import {
  applyRouteFromHash,
  bindUIEvents,
  buildClienteModalHtml,
  buildDeleteClienteConfirmModalHtml,
  buildDeletePedidoConfirmModalHtml,
  buildDeleteProveedorConfirmModalHtml,
  buildNotifyClientModalHtml,
  buildPedidoModalHtml,
  buildProveedorModalHtml,
  buildScanAlreadyReceivedModalHtml,
  buildScanPendingConfirmModalHtml,
  clearForm,
  closeModal,
  fillFormFromPedido,
  getRefs,
  initUI,
  openModal,
  refreshModalIfNeeded,
  renderAllLists,
  renderSummary,
  setClientMode,
  setHomeRecordsView,
  setProviderMode,
  setRoute,
  setSaveMessage,
  setScanMessage,
  setSyncStatus,
  setUIActions,
  updateScannerVisibility
} from './ui.js';

initUI();
const refs = getRefs();
initEmailPreview({ setRoute });

function finishScannerFlow({
  saveMessage = '',
  scanMessage = '',
  closeEditor = false,
  closeTransientModal = false,
  resetForm = false
} = {}) {
  stopCamera({ preserveMessage: true, preserveStatus: true, preserveCode: false });

  if (closeTransientModal && state.modalOpen) closeModal();
  if (closeEditor) clearForm();
  else if (resetForm) clearForm();

  if (saveMessage) setSaveMessage(saveMessage);
  if (scanMessage) setScanMessage(scanMessage);
}

function isPedidoRecibido(pedido) {
  return pedido?.estado === 'Recibido' || Boolean(pedido?.fechaRecibo);
}

async function openPedidoByCode(code) {
  const pedido = await loadPedidoByCode(code);
  refs.currentCodeEl.textContent = pedido.codigo;
  fillFormFromPedido(pedido);
  return pedido;
}

async function openPedidoModal(code) {
  const pedido = await loadPedidoByCode(code);
  openModal(buildPedidoModalHtml(pedido), { type: 'pedido', targetId: pedido.codigo });
}

function openProveedorModal(proveedorId) {
  const proveedor = state.proveedoresMap.get(proveedorId);
  if (!proveedor) return;
  openModal(buildProveedorModalHtml(proveedor), { type: 'proveedor', targetId: proveedor.id });
}

function openClienteModal(clienteId) {
  const cliente = state.clientesMap.get(clienteId);
  if (!cliente) return;
  openModal(buildClienteModalHtml(cliente), { type: 'cliente', targetId: cliente.id });
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
    finishScannerFlow({
      saveMessage: `Pedido ${refs.codigoInput.value.trim()} guardado correctamente.`,
      scanMessage: `Pedido ${refs.codigoInput.value.trim()} guardado y cámara cerrada.`,
      closeEditor: true
    });
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

async function handleScannedCode(code) {
  try {
    const pedido = await loadPedidoByCode(code);

    if (!pedido.existsInDb) {
      setSyncStatus('Creando pedido', 'busy');
      const createdPedido = await createPedidoFromScan(code);
      fillFormFromPedido(createdPedido);
      setScanMessage(`Pedido ${code} preparado. Completa la ficha y guarda para cerrar la sesión de escaneo.`);
      setSaveMessage(`Se ha creado el pedido ${code} con fecha de inicio de hoy y estado pendiente.`);
      setSyncStatus('Pedido preparado', 'ready');
      return createdPedido;
    }

    if (isPedidoRecibido(pedido)) {
      openModal(buildScanAlreadyReceivedModalHtml(pedido), { type: 'transient', targetId: '' });
      setScanMessage(`El pedido ${code} ya constaba como recibido.`);
      setSyncStatus('Pedido ya recibido', 'busy');
      return pedido;
    }

    openModal(buildScanPendingConfirmModalHtml(pedido), { type: 'transient', targetId: '' });
    setScanMessage(`El pedido ${code} ya existía. Confirma si quieres marcarlo como recibido.`);
    setSyncStatus('Confirmación requerida', 'busy');
    return pedido;
  } catch (error) {
    console.error(error);
    setSyncStatus('Error', 'error');
    setScanMessage(error.message || 'No se pudo procesar el escaneo.');
    throw error;
  }
}

async function markPedidoRecibido(code) {
  try {
    setSyncStatus('Guardando recepción', 'busy');
    const updatedPedido = await markPedidoAsReceivedNow(code);
    closeModal();
    openModal(buildNotifyClientModalHtml(updatedPedido), { type: 'transient', targetId: '' });
    setSaveMessage(`Pedido ${code} marcado como recibido.`);
    setScanMessage(`Pedido ${code} recibido correctamente. Decide si quieres avisar al cliente.`);
    setSyncStatus('Sincronizado', 'ready');
  } catch (error) {
    console.error(error);
    setSaveMessage(error.message || 'No se pudo marcar como recibido.');
    setSyncStatus('Error', 'error');
  }
}

async function updateFechaRecepcion(code) {
  try {
    setSyncStatus('Actualizando fecha', 'busy');
    await markPedidoAsReceivedNow(code);
    finishScannerFlow({
      saveMessage: `Fecha de recepción de ${code} actualizada.`,
      scanMessage: `La fecha de recepción del pedido ${code} se ha actualizado y la cámara se ha cerrado.`,
      closeTransientModal: true,
      closeEditor: true
    });
    setSyncStatus('Sincronizado', 'ready');
  } catch (error) {
    console.error(error);
    setSaveMessage(error.message || 'No se pudo actualizar la fecha de recepción.');
    setSyncStatus('Error', 'error');
  }
}

async function viewPedido(code) {
  stopCamera({ preserveMessage: true, preserveStatus: true, preserveCode: false });
  closeModal();
  await openPedidoByCode(code);
}

function notifyClient(code) {
  const pedido = state.pedidosMap.get(code);
  if (!pedido?.clienteCorreo) {
    finishScannerFlow({
      saveMessage: 'Este pedido no tiene correo de cliente para enviar aviso.',
      scanMessage: 'No se pudo preparar el aviso automático al cliente.',
      closeTransientModal: true,
      closeEditor: true
    });
    return;
  }

  finishScannerFlow({
    saveMessage: `Vista previa del correo del pedido ${code} preparada.`,
    scanMessage: `Se ha generado la vista previa del aviso del pedido ${code}.`,
    closeTransientModal: true,
    closeEditor: true
  });

  openPedidoReceivedEmailPreview(pedido, { backRoute: state.currentRoute || 'inicio' });
}

function promptDeletePedido(code) {
  const pedido = state.pedidosMap.get(code);
  if (!pedido) return;
  openModal(buildDeletePedidoConfirmModalHtml(pedido), { type: 'transient', targetId: '' });
}

function promptDeleteProveedor(proveedorId) {
  const proveedor = state.proveedoresMap.get(proveedorId);
  if (!proveedor) return;
  openModal(buildDeleteProveedorConfirmModalHtml(proveedor), { type: 'transient', targetId: '' });
}

function promptDeleteCliente(clienteId) {
  const cliente = state.clientesMap.get(clienteId);
  if (!cliente) return;
  openModal(buildDeleteClienteConfirmModalHtml(cliente), { type: 'transient', targetId: '' });
}

async function confirmDeletePedido(code) {
  try {
    setSyncStatus('Eliminando pedido', 'busy');
    await deletePedidoByCode(code);
    if (state.currentCode === code) clearForm();
    closeModal();
    setSaveMessage(`Pedido ${code} eliminado correctamente.`);
    setScanMessage('El pedido se ha eliminado de la base de datos.');
    setSyncStatus('Sincronizado', 'ready');
  } catch (error) {
    console.error(error);
    setSaveMessage(error.message || 'No se pudo eliminar el pedido.');
    setSyncStatus('Error', 'error');
  }
}

async function confirmDeleteProveedor(proveedorId) {
  try {
    setSyncStatus('Eliminando proveedor', 'busy');
    const { proveedor, affectedPedidos } = await deleteProveedorById(proveedorId);

    if (state.currentPedido?.proveedorId === proveedorId) {
      refs.proveedorSelect.value = '';
      if (state.currentPedido) {
        state.currentPedido.proveedorId = '';
        state.currentPedido.proveedorNombre = '';
      }
    }

    closeModal();
    setSaveMessage(affectedPedidos.length
      ? `Proveedor eliminado. ${affectedPedidos.length} pedido${affectedPedidos.length === 1 ? '' : 's'} han quedado sin proveedor asignado.`
      : `Proveedor ${proveedor.nombre} eliminado correctamente.`);
    setSyncStatus('Sincronizado', 'ready');
  } catch (error) {
    console.error(error);
    setSaveMessage(error.message || 'No se pudo eliminar el proveedor.');
    setSyncStatus('Error', 'error');
  }
}

async function confirmDeleteCliente(clienteId) {
  try {
    setSyncStatus('Eliminando cliente', 'busy');
    const { cliente, affectedPedidos } = await deleteClienteById(clienteId);

    if (state.currentPedido?.clienteId === clienteId) {
      refs.clienteSelect.value = '';
      if (state.currentPedido) {
        state.currentPedido.clienteId = '';
        state.currentPedido.clienteNombre = '';
        state.currentPedido.clienteCorreo = '';
        state.currentPedido.clienteNumero = '';
      }
    }

    closeModal();
    setSaveMessage(affectedPedidos.length
      ? `Cliente eliminado. ${affectedPedidos.length} pedido${affectedPedidos.length === 1 ? '' : 's'} han quedado sin cliente asignado.`
      : `Cliente ${cliente.nombre} eliminado correctamente.`);
    setSyncStatus('Sincronizado', 'ready');
  } catch (error) {
    console.error(error);
    setSaveMessage(error.message || 'No se pudo eliminar el cliente.');
    setSyncStatus('Error', 'error');
  }
}

setUIActions({
  openPedidoModal,
  openProveedorModal,
  openClienteModal,
  editPedido: openPedidoByCode,
  promptDeletePedido,
  promptDeleteProveedor,
  promptDeleteCliente,
  confirmDeletePedido,
  confirmDeleteProveedor,
  confirmDeleteCliente,
  markPedidoRecibido,
  updateFechaRecepcion,
  viewPedido,
  notifyClient,
  onStartCamera: startCamera,
  onReset: () => {
    stopCamera();
    clearForm();
  },
  onSave: handleSavePedido,
  onToggleProviderMode: () => setProviderMode(state.providerMode === 'new' ? 'existing' : 'new'),
  onToggleClientMode: () => setClientMode(state.clientMode === 'new' ? 'existing' : 'new'),
  onCloseEditor: () => {
    stopCamera();
    clearForm();
  }
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
