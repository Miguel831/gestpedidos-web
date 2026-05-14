import { state } from './state.js';
import {
  cleanupFirebase,
  assignProveedorToPedidoGroup,
  createPedidoFromScan,
  deleteClienteById,
  deletePedidoByCode,
  deleteProveedorById,
  initFirebase,
  loadPedidoByCode,
  markPedidoAsReceivedNow,
  savePedido,
  sendWhatsAppToPedido
} from './firebase.js';
import { cleanupScanner, startCamera, stopCamera, setScannerActions } from './scanner.js';
import { initEmailPreview } from './email-preview.js';
import {
  applyRouteFromHash,
  bindUIEvents,
  buildClienteModalHtml,
  buildDeleteClienteConfirmModalHtml,
  buildDeletePedidoConfirmModalHtml,
  buildDeleteProveedorConfirmModalHtml,
  buildGroupProviderModalHtml,
  buildNotifyClientModalHtml,
  buildPedidoModalHtml,
  buildProveedorModalHtml,
  buildScanAlreadyReceivedModalHtml,
  buildScanPendingConfirmModalHtml,
  clearForm,
  openManualEditor,
  closeModal,
  fillFormFromPedido,
  getRefs,
  initUI,
  openModal,
  refreshModalIfNeeded,
  renderAllLists,
  renderGroupScannerState,
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

  if (/^\d{6}$/.test(nuevoCodigo) && nuevoCodigo !== state.currentCode) {
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

async function sendWhatsAppForPedido(pedido, successMessage) {
  if (!pedido?.codigo) {
    setSaveMessage('Abre un pedido antes de enviar el WhatsApp.');
    return null;
  }

    // En modo temporal, el envío va a un número fijo desde backend.
  //if (!pedido?.clienteNumero) {
  //  setSaveMessage('Este pedido no tiene número de cliente.');
  //  return null;
  //}

  try {
    setSyncStatus('Enviando WhatsApp', 'busy');
    setSaveMessage('Enviando WhatsApp al cliente...');

    const result = await sendWhatsAppToPedido({
      codigo: pedido.codigo,
      telefono: pedido.clienteNumero,
      clienteNombre: pedido.clienteNombre,
      estado: pedido.estado
    });

    setSaveMessage(successMessage || `WhatsApp enviado correctamente (${result.sid}).`);
    setSyncStatus('Sincronizado', 'ready');
    return result;
    } catch (error) {
    console.error(error);

    const message =
      error?.details?.message ||
      error?.message ||
      'No se pudo enviar el WhatsApp.';

    setSaveMessage(message);
    setSyncStatus('Error', 'error');
    return null;
  }
}

async function handleSendWhatsApp() {
  await sendWhatsAppForPedido(state.currentPedido);
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
      nuevoClienteCorreo: '',
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


async function startGroupMode() {
  try {
    await initFirebase();
    closeModal();
    clearForm();
    state.groupModeActive = true;
    state.groupPedidoCodes = [];
    renderGroupScannerState();
    setSyncStatus('Grupo activo', 'busy');
    setScanMessage('Grupo iniciado. Escanea cada pedido de la lista; la cámara seguirá abierta hasta que pulses “Cerrar grupo”.');
    setSaveMessage('Los pedidos escaneados se guardarán en el grupo actual.');

    if (!state.stream) await startCamera();

    setSyncStatus('Grupo activo', 'busy');
    setScanMessage('Grupo iniciado. Escanea cada pedido de la lista; la cámara seguirá abierta hasta que pulses “Cerrar grupo”.');
  } catch (error) {
    console.error(error);
    state.groupModeActive = false;
    state.groupPedidoCodes = [];
    renderGroupScannerState();
    setSyncStatus('Error', 'error');
    setScanMessage(error.message || 'No se pudo iniciar el grupo.');
  }
}

async function handleGroupScannedCode(code) {
  const pedido = await loadPedidoByCode(code);

  if (!pedido.existsInDb) {
    setSyncStatus('Creando pedido', 'busy');
    await createPedidoFromScan(code);
  }

  const alreadyAdded = state.groupPedidoCodes.includes(code);
  if (!alreadyAdded) state.groupPedidoCodes.push(code);

  renderGroupScannerState();
  refs.currentCodeEl.textContent = code;
  setSyncStatus('Grupo activo', 'busy');
  setSaveMessage(alreadyAdded
    ? `El pedido ${code} ya estaba dentro del grupo.`
    : `Pedido ${code} añadido al grupo.`);
  setScanMessage(alreadyAdded
    ? `El pedido ${code} ya estaba añadido. Muestra otro código o pulsa “Cerrar grupo”.`
    : `Pedido ${code} añadido al grupo. Escanea el siguiente o pulsa “Cerrar grupo”.`);

  return { keepCameraOpen: true, nextDelay: 950 };
}

function closeGroupMode() {
  if (!state.groupModeActive) return;

  if (!state.groupPedidoCodes.length) {
    setScanMessage('El grupo está vacío. Escanea al menos un pedido antes de cerrarlo.');
    setSaveMessage('No hay pedidos en el grupo actual.');
    return;
  }

  stopCamera({ preserveMessage: true, preserveStatus: true, preserveCode: true });
  openModal(buildGroupProviderModalHtml(state.groupPedidoCodes), { type: 'transient', targetId: '' });
  setScanMessage('Grupo cerrado para asignación. Elige un proveedor para aplicarlo a todos los pedidos.');
}

function cancelGroupMode() {
  if (!state.groupModeActive) return;

  state.groupModeActive = false;
  state.groupPedidoCodes = [];
  stopCamera({ preserveMessage: true, preserveStatus: false, preserveCode: false });
  closeModal();
  renderGroupScannerState();
  setSaveMessage('Grupo cancelado. No se han asignado proveedores en lote.');
  setScanMessage('Grupo cancelado. Pulsa “Crear Grupo” para iniciar una nueva lectura en lote.');
}

function showGroupProviderError(message) {
  const errorBox = refs.detailModalBody?.querySelector('#groupProviderError');
  const errorText = refs.detailModalBody?.querySelector('#groupProviderErrorText');
  if (!errorBox || !errorText) {
    setSaveMessage(message);
    return;
  }

  errorText.textContent = message;
  errorBox.hidden = false;
}

async function confirmGroupProvider() {
  const codigos = [...state.groupPedidoCodes];

  try {
    const providerMode = refs.detailModalBody?.querySelector('#groupProviderMode')?.value || 'existing';
    const proveedorId = refs.detailModalBody?.querySelector('#groupProveedorSelect')?.value || '';
    const nuevoProveedorNombre = refs.detailModalBody?.querySelector('#groupNuevoProveedorNombre')?.value || '';
    const nuevoProveedorDescripcion = refs.detailModalBody?.querySelector('#groupNuevoProveedorDescripcion')?.value || '';

    setSyncStatus('Asignando proveedor', 'busy');
    setSaveMessage('Asignando proveedor al grupo…');

    const { proveedor, codigos: assignedCodes } = await assignProveedorToPedidoGroup({
      codigos,
      proveedorId,
      providerMode,
      nuevoProveedorNombre,
      nuevoProveedorDescripcion
    });

    state.groupModeActive = false;
    state.groupPedidoCodes = [];
    closeModal();
    stopCamera({ preserveMessage: true, preserveStatus: true, preserveCode: false });
    renderGroupScannerState();
    setSyncStatus('Sincronizado', 'ready');
    setSaveMessage(`Proveedor ${proveedor.nombre} asignado a ${assignedCodes.length} pedido${assignedCodes.length === 1 ? '' : 's'}.`);
    setScanMessage(`Grupo cerrado. ${assignedCodes.length} pedido${assignedCodes.length === 1 ? '' : 's'} asignado${assignedCodes.length === 1 ? '' : 's'} a ${proveedor.nombre}.`);
    refreshModalIfNeeded();
  } catch (error) {
    console.error(error);
    setSyncStatus('Error', 'error');
    showGroupProviderError(error.message || 'No se pudo asignar el proveedor al grupo.');
  }
}

async function handleScannedCode(code) {
  try {
    if (state.groupModeActive) return await handleGroupScannedCode(code);

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

async function notifyClient(code) {
  const pedido = state.pedidosMap.get(code);
  if (!pedido?.clienteNumero) {
    finishScannerFlow({
      saveMessage: 'Este pedido no tiene número de cliente para enviar aviso por WhatsApp.',
      scanMessage: 'No se pudo preparar el aviso automático al cliente.',
      closeTransientModal: true,
      closeEditor: true
    });
    return;
  }

  const result = await sendWhatsAppForPedido(
    pedido,
    `WhatsApp enviado correctamente al cliente del pedido ${code}.`
  );

  if (!result) return;

  finishScannerFlow({
    saveMessage: `WhatsApp enviado correctamente al cliente del pedido ${code}.`,
    scanMessage: `Se ha avisado por WhatsApp al cliente del pedido ${code}.`,
    closeTransientModal: true,
    closeEditor: true
  });
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
  },
  onManualCode: () => { 
    stopCamera();
    openManualEditor();
  },
  onCreateGroup: startGroupMode,
  onCloseGroup: closeGroupMode,
  onCancelGroup: cancelGroupMode,
  confirmGroupProvider
});

setScannerActions({
  onCodeDetected: handleScannedCode,
  shouldKeepCameraOpen: () => state.groupModeActive
});

bindUIEvents();

refs.sendWhatsappBtn?.addEventListener('click', handleSendWhatsApp);

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
renderGroupScannerState();
renderAllLists();
renderSummary();
setHomeRecordsView('pedidos');
applyRouteFromHash();

initFirebase().catch(error => {
  console.error(error);
  setSyncStatus('Firebase pendiente', 'error');
  setScanMessage(error.message || 'Revisa la configuración de Firebase.');
});
