import { VALID_ROUTES } from './config.js';
import { state } from './state.js';

const refs = {};
const actions = {
  openPedidoModal: async () => {},
  openProveedorModal: () => {},
  openClienteModal: () => {},
  editPedido: async () => {},
  promptDeletePedido: () => {},
  promptDeleteProveedor: () => {},
  promptDeleteCliente: () => {},
  confirmDeletePedido: async () => {},
  confirmDeleteProveedor: async () => {},
  confirmDeleteCliente: async () => {},
  markPedidoRecibido: async () => {},
  updateFechaRecepcion: async () => {},
  viewPedido: async () => {},
  notifyClient: () => {},
  onStartCamera: async () => {},
  onReset: () => {},
  onSave: async () => {},
  onToggleProviderMode: () => {},
  onToggleClientMode: () => {},
  onCloseEditor: () => {}
};

export function initUI() {
  Object.assign(refs, {
    menuToggleBtn: document.getElementById('menuToggleBtn'),
    goHomeBtn: document.getElementById('goHomeBtn'),
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    appDrawer: document.getElementById('appDrawer'),
    navInicioBtn: document.getElementById('navInicioBtn'),
    navPedidosBtn: document.getElementById('navPedidosBtn'),
    navProveedoresBtn: document.getElementById('navProveedoresBtn'),
    navClientesBtn: document.getElementById('navClientesBtn'),
    detailModal: document.getElementById('detailModal'),
    detailModalBody: document.getElementById('detailModalBody'),

    screenInicio: document.getElementById('screenInicio'),
    screenPedidos: document.getElementById('screenPedidos'),
    screenProveedores: document.getElementById('screenProveedores'),
    screenClientes: document.getElementById('screenClientes'),

    scannerLayout: document.getElementById('scannerLayout'),
    video: document.getElementById('video'),
    videoWrap: document.getElementById('videoWrap'),
    scanBox: document.getElementById('scanBox'),
    scanLine: document.getElementById('scanLine'),
    startBtn: document.getElementById('startBtn'),
    syncDot: document.getElementById('syncDot'),
    syncStatus: document.getElementById('syncStatus'),
    scanMessage: document.getElementById('scanMessage'),
    currentCodeEl: document.getElementById('currentCode'),
    estadoBadge: document.getElementById('estadoBadge'),
    saveMessage: document.getElementById('saveMessage'),
    editorModal: document.getElementById('editorModal'),
    closeEditorModalBtn: document.getElementById('closeEditorModalBtn'),
    editorCodeInput: document.getElementById('editorCodeInput'),
    pedidoForm: document.getElementById('pedidoForm'),
    codigoInput: document.getElementById('codigoInput'),
    proveedorSelect: document.getElementById('proveedorSelect'),
    toggleNewProviderBtn: document.getElementById('toggleNewProviderBtn'),
    newProviderBox: document.getElementById('newProviderBox'),
    nuevoProveedorNombre: document.getElementById('nuevoProveedorNombre'),
    nuevoProveedorDescripcion: document.getElementById('nuevoProveedorDescripcion'),
    clienteSelect: document.getElementById('clienteSelect'),
    toggleNewClientBtn: document.getElementById('toggleNewClientBtn'),
    newClientBox: document.getElementById('newClientBox'),
    nuevoClienteNombre: document.getElementById('nuevoClienteNombre'),
    nuevoClienteCorreo: document.getElementById('nuevoClienteCorreo'),
    nuevoClienteNumero: document.getElementById('nuevoClienteNumero'),
    fechaEnvioInput: document.getElementById('fechaEnvioInput'),
    fechaReciboInput: document.getElementById('fechaReciboInput'),
    descripcionInput: document.getElementById('descripcionInput'),
    estadoInput: document.getElementById('estadoInput'),
    savePedidoBtn: document.getElementById('savePedidoBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    summaryPedidos: document.getElementById('summaryPedidos'),
    summaryPendientes: document.getElementById('summaryPendientes'),
    summaryProveedores: document.getElementById('summaryProveedores'),
    homePedidosPanel: document.getElementById('homePedidosPanel'),
    homeProveedoresPanel: document.getElementById('homeProveedoresPanel'),
    pagePedidosPanel: document.getElementById('pagePedidosPanel'),
    pageProveedoresPanel: document.getElementById('pageProveedoresPanel'),
    pageClientesPanel: document.getElementById('pageClientesPanel'),
    homeSliderTabs: document.getElementById('homeSliderTabs'),
    homeTabPedidos: document.getElementById('homeTabPedidos'),
    homeTabProveedores: document.getElementById('homeTabProveedores'),
    editorCodeBig: document.getElementById('editorCodeBig'),
    cropCanvas: document.getElementById('cropCanvas'),
    processedCanvas: document.getElementById('processedCanvas'),
    step1Num: document.getElementById('step1Num'),
    step3Num: document.getElementById('step3Num')
  });

  refs.cropCtx = refs.cropCanvas.getContext('2d', { willReadFrequently: true });
  refs.processedCtx = refs.processedCanvas.getContext('2d', { willReadFrequently: true });

  return refs;
}

export function getRefs() {
  return refs;
}

export function setUIActions(nextActions) {
  Object.assign(actions, nextActions);
}

export function setSyncStatus(text, dotState = '') {
  refs.syncStatus.textContent = text;
  refs.syncDot.className = `sync-dot${dotState ? ` ${dotState}` : ''}`;
}

export function setScanMessage(text) {
  refs.scanMessage.textContent = text;
}

export function setSaveMessage(text) {
  refs.saveMessage.textContent = text;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function formatDate(value) {
  if (!value) return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-ES');
}

export function formatDateTime(value) {
  if (!value) return formatDate(value);
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getEstadoClass(estado) {
  if (estado === 'Recibido') return 'estado-recibido';
  if (estado === 'En tránsito') return 'estado-transito';
  if (estado === 'Incidencia') return 'estado-incidencia';
  return 'estado-pendiente';
}

function getProveedorPedidos(proveedor) {
  return state.pedidos
    .filter(pedido => pedido.proveedorId === proveedor.id)
    .map(pedido => pedido.codigo);
}

export function setEstadoBadge(estado) {
  const value = estado || 'Pendiente';
  refs.estadoBadge.textContent = value;
  refs.estadoBadge.className = 'status-badge';
  refs.estadoBadge.classList.add(getEstadoClass(value));
}

export function openDrawer() {
  refs.appDrawer.classList.add('open');
  refs.drawerBackdrop.classList.add('visible');
  refs.appDrawer.setAttribute('aria-hidden', 'false');
}

export function closeDrawer() {
  refs.appDrawer.classList.remove('open');
  refs.drawerBackdrop.classList.remove('visible');
  refs.appDrawer.setAttribute('aria-hidden', 'true');
}

export function setRoute(route, pushHash = true) {
  const safeRoute = VALID_ROUTES.includes(route) ? route : 'inicio';
  state.currentRoute = safeRoute;

  refs.screenInicio.classList.toggle('active', safeRoute === 'inicio');
  refs.screenPedidos.classList.toggle('active', safeRoute === 'pedidos');
  refs.screenProveedores.classList.toggle('active', safeRoute === 'proveedores');
  refs.screenClientes.classList.toggle('active', safeRoute === 'clientes');

  refs.navInicioBtn?.classList.toggle('active', safeRoute === 'inicio');
  refs.navPedidosBtn?.classList.toggle('active', safeRoute === 'pedidos');
  refs.navProveedoresBtn?.classList.toggle('active', safeRoute === 'proveedores');
  refs.navClientesBtn?.classList.toggle('active', safeRoute === 'clientes');

  if (pushHash) {
    const hash = `#${safeRoute}`;
    if (location.hash !== hash) history.pushState(null, '', hash);
  }

  closeDrawer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function applyRouteFromHash() {
  const route = (location.hash || '#inicio').replace('#', '');
  setRoute(route, false);
}

export function setHomeRecordsView(view) {
  state.homeRecordsView = view === 'proveedores' ? 'proveedores' : 'pedidos';
  const isPedidos = state.homeRecordsView === 'pedidos';
  refs.homeSliderTabs.dataset.view = state.homeRecordsView;
  refs.homeTabPedidos.classList.toggle('active', isPedidos);
  refs.homeTabProveedores.classList.toggle('active', !isPedidos);
  refs.homePedidosPanel.style.display = isPedidos ? 'grid' : 'none';
  refs.homeProveedoresPanel.style.display = isPedidos ? 'none' : 'grid';
}

export function renderSummary() {
  refs.summaryPedidos.textContent = String(state.pedidos.length || 0);
  refs.summaryPendientes.textContent = String(state.pedidos.filter(item => item.estado !== 'Recibido').length || 0);
  refs.summaryProveedores.textContent = String(state.proveedores.length || 0);
}

export function renderProveedorSelect() {
  const currentValue = refs.proveedorSelect.value;
  const options = ['<option value="">Selecciona un proveedor</option>'];

  [...state.proveedores]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    .forEach(proveedor => {
      options.push(`<option value="${proveedor.id}">${escapeHtml(proveedor.nombre)}</option>`);
    });

  refs.proveedorSelect.innerHTML = options.join('');
  if (state.proveedores.some(proveedor => proveedor.id === currentValue)) {
    refs.proveedorSelect.value = currentValue;
  }
}

export function renderClienteSelect() {
  const currentValue = refs.clienteSelect.value;
  const options = ['<option value="">Selecciona un cliente</option>'];

  [...state.clientes]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    .forEach(cliente => {
      options.push(`<option value="${cliente.id}">${escapeHtml(cliente.nombre)}</option>`);
    });

  refs.clienteSelect.innerHTML = options.join('');
  if (state.clientes.some(cliente => cliente.id === currentValue)) {
    refs.clienteSelect.value = currentValue;
  }
}

function buildPedidoSummaryLine(pedido) {
  const parts = [];
  parts.push(`<strong>Proveedor:</strong> ${escapeHtml(pedido.proveedorNombre || 'Sin asignar')}`);
  parts.push(`<strong>Cliente:</strong> ${escapeHtml(pedido.clienteNombre || 'Sin asignar')}`);
  if (pedido.fechaEnvio) parts.push(`<strong>Envío:</strong> ${escapeHtml(formatDate(pedido.fechaEnvio))}`);
  if (pedido.fechaRecibo) parts.push(`<strong>Recibo:</strong> ${escapeHtml(formatDate(pedido.fechaRecibo))}`);
  return parts.join(' · ');
}

function getPedidosOrdered() {
  return [...state.pedidos].sort((a, b) => toMillis(b.createdAt || b.updatedAt) - toMillis(a.createdAt || a.updatedAt));
}

function getProveedoresOrdered() {
  return [...state.proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

function getClientesOrdered() {
  return [...state.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

function getClientePedidos(cliente) {
  if (Array.isArray(cliente.listaPedidos)) return cliente.listaPedidos;
  if (Array.isArray(cliente.pedidosAsignados)) return cliente.pedidosAsignados;
  return [];
}

export function renderPedidosInto(target) {
  if (!target) return;
  if (!state.pedidos.length) {
    target.innerHTML = '<div class="empty-state"><div class="empty-icon">◇</div><p>Todavía no hay pedidos guardados. Escanea un código para crear el primero.</p></div>';
    return;
  }

  const ordered = getPedidosOrdered();
  target.innerHTML = ordered.map(pedido => `
    <article class="row-card" data-open-pedido="${pedido.codigo}">
      <div class="row-top">
        <div>
          <div class="row-code-eyebrow">Referencia</div>
          <div class="row-code">${escapeHtml(pedido.codigo)}</div>
        </div>
        <span class="status-badge ${getEstadoClass(pedido.estado)}">${escapeHtml(pedido.estado || 'Pendiente')}</span>
      </div>
      <div class="pedido-resumen-line">${buildPedidoSummaryLine(pedido)}</div>
      ${pedido.descripcion ? `<div class="row-desc">${escapeHtml(pedido.descripcion)}</div>` : ''}
    </article>
  `).join('');

  target.querySelectorAll('[data-open-pedido]').forEach(element => {
    element.addEventListener('click', () => actions.openPedidoModal(element.dataset.openPedido));
  });
}

export function renderProveedoresInto(target) {
  if (!target) return;
  if (!state.proveedores.length) {
    target.innerHTML = '<div class="empty-state"><div class="empty-icon">◇</div><p>Todavía no hay proveedores. Crea uno desde la ficha de pedido.</p></div>';
    return;
  }

  const ordered = getProveedoresOrdered();
  target.innerHTML = ordered.map(proveedor => {
    const pedidos = getProveedorPedidos(proveedor);
    const chips = pedidos.length
      ? pedidos.map(codigo => `<span class="chip" data-open-pedido="${codigo}">${escapeHtml(codigo)}</span>`).join('')
      : '<span class="chip no-link">Sin pedidos</span>';

    return `
      <article class="provider-record-card" data-open-proveedor="${proveedor.id}">
        <div class="provider-record-head">
          <h3 class="provider-record-name">${escapeHtml(proveedor.nombre)}</h3>
          <span class="chip no-link">${pedidos.length} pedido${pedidos.length === 1 ? '' : 's'}</span>
        </div>
        ${proveedor.descripcion ? `<div class="provider-record-desc">${escapeHtml(proveedor.descripcion)}</div>` : ''}
        <div class="chips">${chips}</div>
      </article>
    `;
  }).join('');

  target.querySelectorAll('[data-open-proveedor]').forEach(element => {
    element.addEventListener('click', () => actions.openProveedorModal(element.dataset.openProveedor));
  });
  target.querySelectorAll('[data-open-pedido]').forEach(element => {
    element.addEventListener('click', event => {
      event.stopPropagation();
      actions.openPedidoModal(element.dataset.openPedido);
    });
  });
}

export function renderClientesInto(target) {
  if (!target) return;
  if (!state.clientes.length) {
    target.innerHTML = '<div class="empty-state"><div class="empty-icon">◇</div><p>Todavía no hay clientes. Puedes crear uno desde la ficha de pedido.</p></div>';
    return;
  }

  const ordered = getClientesOrdered();
  target.innerHTML = ordered.map(cliente => {
    const pedidos = getClientePedidos(cliente);
    const dineroGastado = Number.isFinite(Number(cliente.dineroGastado)) ? Number(cliente.dineroGastado) : 0;
    const chips = pedidos.length
      ? pedidos.map(codigo => `<span class="chip" data-open-pedido="${codigo}">${escapeHtml(codigo)}</span>`).join('')
      : '<span class="chip no-link">Sin pedidos</span>';

    return `
      <article class="provider-record-card" data-open-cliente="${cliente.id}">
        <div class="provider-record-head">
          <h3 class="provider-record-name">${escapeHtml(cliente.nombre)}</h3>
          <span class="chip no-link">${pedidos.length} pedido${pedidos.length === 1 ? '' : 's'}</span>
        </div>
        <div class="client-record-meta">
          <span>${escapeHtml(cliente.correo || 'Sin correo')}</span>
          <span>${escapeHtml(cliente.numero || 'Sin número')}</span>
          <span>${escapeHtml(dineroGastado.toFixed(2))} €</span>
        </div>
        <div class="chips">${chips}</div>
      </article>
    `;
  }).join('');

  target.querySelectorAll('[data-open-cliente]').forEach(element => {
    element.addEventListener('click', () => actions.openClienteModal(element.dataset.openCliente));
  });
  target.querySelectorAll('[data-open-pedido]').forEach(element => {
    element.addEventListener('click', event => {
      event.stopPropagation();
      actions.openPedidoModal(element.dataset.openPedido);
    });
  });
}

export function renderAllLists() {
  renderPedidosInto(refs.homePedidosPanel);
  renderPedidosInto(refs.pagePedidosPanel);
  renderProveedoresInto(refs.homeProveedoresPanel);
  renderProveedoresInto(refs.pageProveedoresPanel);
  renderClientesInto(refs.pageClientesPanel);
}

function setEntityMode(box, toggleBtn, select, isNew, labels) {
  box.classList.toggle('visible', isNew);
  box.hidden = !isNew;
  toggleBtn.textContent = isNew ? labels.existing : labels.new;
  toggleBtn.setAttribute('aria-expanded', String(isNew));
  select.disabled = isNew;
}

export function setProviderMode(mode) {
  state.providerMode = mode;
  const isNew = mode === 'new';
  setEntityMode(refs.newProviderBox, refs.toggleNewProviderBtn, refs.proveedorSelect, isNew, {
    existing: '− Usar proveedor existente',
    new: '+ Añadir nuevo proveedor'
  });

  if (!isNew) {
    refs.nuevoProveedorNombre.value = '';
    refs.nuevoProveedorDescripcion.value = '';
  }
}

export function setClientMode(mode) {
  state.clientMode = mode;
  const isNew = mode === 'new';
  setEntityMode(refs.newClientBox, refs.toggleNewClientBtn, refs.clienteSelect, isNew, {
    existing: '− Usar cliente existente',
    new: '+ Añadir nuevo cliente'
  });

  if (!isNew) {
    refs.nuevoClienteNombre.value = '';
    refs.nuevoClienteCorreo.value = '';
    refs.nuevoClienteNumero.value = '';
  }
}

export function showEditor() {
  refs.editorModal.classList.add('visible');
  document.body.classList.add('no-scroll');
}

export function hideEditor() {
  refs.editorModal.classList.remove('visible');
  document.body.classList.remove('no-scroll');
  refs.editorCodeInput.style.display = 'none';
  refs.editorCodeBig.style.display = 'inline-block';
}

export function fillFormFromPedido(pedido) {
  state.currentPedido = pedido || null;
  state.currentCode = pedido?.codigo || '';

  refs.codigoInput.value = pedido?.codigo || '';
  refs.editorCodeBig.textContent = pedido?.codigo || '—';
  refs.currentCodeEl.textContent = pedido?.codigo || '· · · · ·';
  refs.estadoInput.value = pedido?.estado || 'Pendiente';
  refs.fechaEnvioInput.value = pedido?.fechaEnvio || '';
  refs.fechaReciboInput.value = pedido?.fechaRecibo || '';
  refs.descripcionInput.value = pedido?.descripcion || '';
  refs.proveedorSelect.value = pedido?.proveedorId || '';
  refs.clienteSelect.value = pedido?.clienteId || '';
  setEstadoBadge(pedido?.estado || 'Pendiente');
  setProviderMode('existing');
  setClientMode('existing');

  if (pedido) {
    setRoute('inicio');
    showEditor();
    refs.step1Num?.classList.add('done');
    refs.step1Num?.classList.remove('active');
  }
}

export function clearForm() {
  state.currentPedido = null;
  state.currentCode = '';

  refs.codigoInput.value = '';
  refs.editorCodeBig.textContent = '—';
  refs.currentCodeEl.textContent = '· · · · ·';
  refs.proveedorSelect.value = '';
  refs.clienteSelect.value = '';
  refs.fechaEnvioInput.value = '';
  refs.fechaReciboInput.value = '';
  refs.descripcionInput.value = '';
  refs.estadoInput.value = 'Pendiente';
  setEstadoBadge('Pendiente');
  setProviderMode('existing');
  setClientMode('existing');
  setScanMessage('Pulsa “Activar cámara” para iniciar lectura continua. La validación se hace automáticamente cuando el mismo código se repite de forma estable.');
  setSaveMessage('Los datos se sincronizarán con Firebase en tiempo real.');
  hideEditor();
  refs.step1Num?.classList.remove('done');
  refs.step1Num?.classList.add('active');
}

export function updateScannerVisibility() {
  const active = Boolean(state.stream);
  refs.videoWrap.classList.toggle('active', active);
  refs.scannerLayout.classList.toggle('camera-hidden', !active);
  refs.video.style.display = active ? 'block' : 'none';
  refs.scanBox.style.display = active ? 'block' : 'none';
  refs.scanLine.style.display = active ? 'block' : 'none';
  refs.startBtn.disabled = Boolean(state.busy && active);
  refs.startBtn.textContent = active ? 'Cerrar cámara' : 'Activar cámara';
}

export function closeModal() {
  refs.detailModal.classList.remove('visible');
  refs.detailModalBody.innerHTML = '';
  state.modalOpen = false;
  state.modalType = null;
  state.modalTargetId = '';
  document.body.classList.remove('no-scroll');
}

export function openModal(html, modalContext = null) {
  if (modalContext) {
    state.modalType = modalContext.type || null;
    state.modalTargetId = modalContext.targetId || '';
  }

  refs.detailModalBody.innerHTML = html;
  refs.detailModal.classList.add('visible');
  state.modalOpen = true;
  document.body.classList.add('no-scroll');
  bindModalActions();
}

function bindModalActions() {
  refs.detailModalBody.querySelectorAll('[data-close-modal],[data-dismiss-modal]').forEach(element => {
    element.addEventListener('click', closeModal);
  });

  refs.detailModalBody.querySelectorAll('[data-open-pedido-modal]').forEach(element => {
    element.addEventListener('click', () => actions.openPedidoModal(element.dataset.openPedidoModal));
  });

  refs.detailModalBody.querySelectorAll('[data-open-proveedor-modal]').forEach(element => {
    element.addEventListener('click', () => actions.openProveedorModal(element.dataset.openProveedorModal));
  });

  refs.detailModalBody.querySelectorAll('[data-open-cliente-modal]').forEach(element => {
    element.addEventListener('click', () => actions.openClienteModal(element.dataset.openClienteModal));
  });

  refs.detailModalBody.querySelectorAll('[data-edit-pedido]').forEach(element => {
    element.addEventListener('click', async () => {
      await actions.editPedido(element.dataset.editPedido);
      closeModal();
    });
  });

  refs.detailModalBody.querySelectorAll('[data-view-pedido]').forEach(element => {
    element.addEventListener('click', async () => {
      await actions.viewPedido(element.dataset.viewPedido);
    });
  });

  refs.detailModalBody.querySelectorAll('[data-prompt-delete-pedido]').forEach(element => {
    element.addEventListener('click', () => actions.promptDeletePedido(element.dataset.promptDeletePedido));
  });

  refs.detailModalBody.querySelectorAll('[data-prompt-delete-proveedor]').forEach(element => {
    element.addEventListener('click', () => actions.promptDeleteProveedor(element.dataset.promptDeleteProveedor));
  });

  refs.detailModalBody.querySelectorAll('[data-prompt-delete-cliente]').forEach(element => {
    element.addEventListener('click', () => actions.promptDeleteCliente(element.dataset.promptDeleteCliente));
  });

  refs.detailModalBody.querySelectorAll('[data-confirm-delete-pedido]').forEach(element => {
    element.addEventListener('click', () => actions.confirmDeletePedido(element.dataset.confirmDeletePedido));
  });

  refs.detailModalBody.querySelectorAll('[data-confirm-delete-proveedor]').forEach(element => {
    element.addEventListener('click', () => actions.confirmDeleteProveedor(element.dataset.confirmDeleteProveedor));
  });

  refs.detailModalBody.querySelectorAll('[data-confirm-delete-cliente]').forEach(element => {
    element.addEventListener('click', () => actions.confirmDeleteCliente(element.dataset.confirmDeleteCliente));
  });

  refs.detailModalBody.querySelectorAll('[data-mark-received]').forEach(element => {
    element.addEventListener('click', () => actions.markPedidoRecibido(element.dataset.markReceived));
  });

  refs.detailModalBody.querySelectorAll('[data-update-received]').forEach(element => {
    element.addEventListener('click', () => actions.updateFechaRecepcion(element.dataset.updateReceived));
  });

  refs.detailModalBody.querySelectorAll('[data-notify-client]').forEach(element => {
    element.addEventListener('click', () => actions.notifyClient(element.dataset.notifyClient));
  });
}

function buildDangerZoneHtml({ title, note, triggerAttr, triggerValue }) {
  return `
    <div class="danger-zone">
      <div>
        <div class="danger-zone-title">${escapeHtml(title)}</div>
        <div class="danger-zone-note">${escapeHtml(note)}</div>
      </div>
      <button type="button" class="danger-icon-btn" ${triggerAttr}="${escapeHtml(triggerValue)}" aria-label="${escapeHtml(title)}">
        <span aria-hidden="true">🗑</span>
      </button>
    </div>
  `;
}

export function buildPedidoModalHtml(pedido) {
  return `
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Pedido</div>
        <div class="modal-title" id="detailModalTitle">${escapeHtml(pedido.codigo)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="status-badge ${getEstadoClass(pedido.estado)}">${escapeHtml(pedido.estado || 'Pendiente')}</div>

    <div class="modal-grid">
      <div class="modal-item">
        <div class="modal-label">Proveedor</div>
        <div class="modal-value">${escapeHtml(pedido.proveedorNombre || 'Sin asignar')}</div>
      </div>
      <div class="modal-item">
        <div class="modal-label">Cliente</div>
        <div class="modal-value">${escapeHtml(pedido.clienteNombre || 'Sin asignar')}</div>
      </div>
      <div class="modal-item">
        <div class="modal-label">Fecha de envío</div>
        <div class="modal-value">${escapeHtml(formatDate(pedido.fechaEnvio))}</div>
      </div>
      ${pedido.fechaRecibo ? `
        <div class="modal-item">
          <div class="modal-label">Fecha de recibo</div>
          <div class="modal-value">${escapeHtml(formatDate(pedido.fechaRecibo))}</div>
        </div>` : ''}
    </div>

    <div class="modal-item">
      <div class="modal-label">Descripción</div>
      <div class="modal-text">${pedido.descripcion ? escapeHtml(pedido.descripcion) : 'Sin observaciones registradas.'}</div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-primary" data-edit-pedido="${pedido.codigo}">Editar pedido</button>
      ${pedido.proveedorId ? `<button type="button" class="btn-secondary" data-open-proveedor-modal="${pedido.proveedorId}">Ver proveedor</button>` : ''}
      ${pedido.clienteId ? `<button type="button" class="btn-secondary" data-open-cliente-modal="${pedido.clienteId}">Ver cliente</button>` : ''}
    </div>

    ${buildDangerZoneHtml({
      title: 'Eliminar pedido',
      note: 'Acción irreversible. La papelera está separada del resto para evitar pulsaciones accidentales.',
      triggerAttr: 'data-prompt-delete-pedido',
      triggerValue: pedido.codigo
    })}
  `;
}

export function buildProveedorModalHtml(proveedor) {
  const pedidos = getProveedorPedidos(proveedor);
  const note = pedidos.length
    ? `Se desvinculará de ${pedidos.length} pedido${pedidos.length === 1 ? '' : 's'} si confirmas el borrado.`
    : 'No tiene pedidos asociados.';

  return `
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Proveedor</div>
        <div class="modal-title text-title" id="detailModalTitle">${escapeHtml(proveedor.nombre)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="modal-item">
      <div class="modal-label">Notas internas</div>
      <div class="modal-text">${proveedor.descripcion ? escapeHtml(proveedor.descripcion) : 'Sin notas registradas.'}</div>
    </div>

    <div class="modal-item">
      <div class="modal-label">Pedidos asociados</div>
      <div class="chips">
        ${pedidos.length
          ? pedidos.map(codigo => `<span class="chip" data-open-pedido-modal="${codigo}">${escapeHtml(codigo)}</span>`).join('')
          : '<span class="chip no-link">Sin pedidos</span>'}
      </div>
    </div>

    ${buildDangerZoneHtml({
      title: 'Eliminar proveedor',
      note,
      triggerAttr: 'data-prompt-delete-proveedor',
      triggerValue: proveedor.id
    })}
  `;
}

export function buildClienteModalHtml(cliente) {
  const pedidos = getClientePedidos(cliente);
  const dineroGastado = Number.isFinite(Number(cliente.dineroGastado)) ? Number(cliente.dineroGastado) : 0;
  const note = pedidos.length
    ? `Se desvinculará de ${pedidos.length} pedido${pedidos.length === 1 ? '' : 's'} si confirmas el borrado.`
    : 'No tiene pedidos asociados.';

  return `
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Cliente</div>
        <div class="modal-title text-title" id="detailModalTitle">${escapeHtml(cliente.nombre)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="modal-grid">
      <div class="modal-item">
        <div class="modal-label">Correo</div>
        <div class="modal-value">${escapeHtml(cliente.correo || 'Sin correo')}</div>
      </div>
      <div class="modal-item">
        <div class="modal-label">Número</div>
        <div class="modal-value">${escapeHtml(cliente.numero || 'Sin número')}</div>
      </div>
      <div class="modal-item">
        <div class="modal-label">Dinero gastado</div>
        <div class="modal-value">${escapeHtml(dineroGastado.toFixed(2))} €</div>
      </div>
    </div>

    <div class="modal-item">
      <div class="modal-label">Pedidos asociados</div>
      <div class="chips">
        ${pedidos.length
          ? pedidos.map(codigo => `<span class="chip" data-open-pedido-modal="${codigo}">${escapeHtml(codigo)}</span>`).join('')
          : '<span class="chip no-link">Sin pedidos</span>'}
      </div>
    </div>

    ${buildDangerZoneHtml({
      title: 'Eliminar cliente',
      note,
      triggerAttr: 'data-prompt-delete-cliente',
      triggerValue: cliente.id
    })}
  `;
}

export function buildScanPendingConfirmModalHtml(pedido) {
  return `
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Pedido encontrado</div>
        <div class="modal-title" id="detailModalTitle">${escapeHtml(pedido.codigo)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="modal-grid">
      <div class="modal-item">
        <div class="modal-label">Proveedor</div>
        <div class="modal-value">${escapeHtml(pedido.proveedorNombre || 'Sin asignar')}</div>
      </div>
      <div class="modal-item">
        <div class="modal-label">Cliente</div>
        <div class="modal-value">${escapeHtml(pedido.clienteNombre || 'Sin asignar')}</div>
      </div>
      <div class="modal-item">
        <div class="modal-label">Fecha de alta</div>
        <div class="modal-value">${escapeHtml(formatDate(pedido.fechaEnvio || pedido.createdAt))}</div>
      </div>
      <div class="modal-item">
        <div class="modal-label">Estado actual</div>
        <div class="modal-value">${escapeHtml(pedido.estado || 'Pendiente')}</div>
      </div>
    </div>

    <div class="modal-callout">
      <div class="modal-callout-title">¿Marcar como recibido ahora?</div>
      <div class="modal-callout-text">Se guardará la fecha de llegada con la fecha actual sin pedirla manualmente.</div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-primary" data-mark-received="${pedido.codigo}">Marcar como recibido</button>
      <button type="button" class="btn-ghost" data-dismiss-modal>Cancelar</button>
    </div>
  `;
}

export function buildScanAlreadyReceivedModalHtml(pedido) {
  const when = pedido.updatedAt ? formatDateTime(pedido.updatedAt) : formatDate(pedido.fechaRecibo);
  return `
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Pedido ya recibido</div>
        <div class="modal-title" id="detailModalTitle">${escapeHtml(pedido.codigo)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="modal-callout warning">
      <div class="modal-callout-title">Este pedido ya figura como recibido ${when && when !== '—' ? `el ${escapeHtml(when)}` : ''}.</div>
      <div class="modal-callout-text">Por seguridad no se actualiza automáticamente en un segundo reescaneo.</div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-primary" data-view-pedido="${pedido.codigo}">Ver pedido</button>
      <button type="button" class="btn-secondary" data-update-received="${pedido.codigo}">Actualizar fecha de recepción</button>
      <button type="button" class="btn-ghost" data-dismiss-modal>Cancelar</button>
    </div>
  `;
}

export function buildNotifyClientModalHtml(pedido) {
  const hasEmail = Boolean(pedido.clienteCorreo);
  return `
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Pedido recibido</div>
        <div class="modal-title" id="detailModalTitle">${escapeHtml(pedido.codigo)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="modal-callout success">
      <div class="modal-callout-title">El pedido ya está marcado como recibido.</div>
      <div class="modal-callout-text">${hasEmail ? '¿Quieres avisar ahora al cliente por correo?' : 'No hay correo guardado para avisar automáticamente al cliente.'}</div>
    </div>

    <div class="modal-actions">
      ${hasEmail ? `<button type="button" class="btn-primary" data-notify-client="${pedido.codigo}">Sí, avisar</button>` : `<button type="button" class="btn-secondary" data-view-pedido="${pedido.codigo}">Ver pedido</button>`}
      <button type="button" class="btn-ghost" data-dismiss-modal>${hasEmail ? 'Más tarde' : 'Cerrar'}</button>
    </div>
  `;
}

export function buildDeletePedidoConfirmModalHtml(pedido) {
  return `
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Eliminar pedido</div>
        <div class="modal-title" id="detailModalTitle">${escapeHtml(pedido.codigo)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="modal-callout danger">
      <div class="modal-callout-title">¿Eliminar este pedido de la base de datos?</div>
      <div class="modal-callout-text">También se quitará de las listas asociadas del proveedor y del cliente.</div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-danger" data-confirm-delete-pedido="${pedido.codigo}">Eliminar</button>
      <button type="button" class="btn-ghost" data-dismiss-modal>Cancelar</button>
    </div>
  `;
}

export function buildDeleteProveedorConfirmModalHtml(proveedor) {
  const pedidos = getProveedorPedidos(proveedor);
  const text = pedidos.length
    ? `Este proveedor tiene ${pedidos.length} pedido${pedidos.length === 1 ? '' : 's'} asociados. Si continúas, esos pedidos se conservarán pero quedarán sin proveedor asignado.`
    : 'No tiene pedidos asociados. Se eliminará únicamente la ficha del proveedor.';

  return `
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Eliminar proveedor</div>
        <div class="modal-title text-title" id="detailModalTitle">${escapeHtml(proveedor.nombre)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="modal-callout danger">
      <div class="modal-callout-title">${pedidos.length ? 'Este borrado afectará a pedidos vinculados.' : '¿Eliminar este proveedor?'} </div>
      <div class="modal-callout-text">${escapeHtml(text)}</div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-danger" data-confirm-delete-proveedor="${proveedor.id}">Eliminar proveedor</button>
      <button type="button" class="btn-ghost" data-dismiss-modal>Cancelar</button>
    </div>
  `;
}

export function buildDeleteClienteConfirmModalHtml(cliente) {
  const pedidos = getClientePedidos(cliente);
  const text = pedidos.length
    ? `Este cliente tiene ${pedidos.length} pedido${pedidos.length === 1 ? '' : 's'} asociados. Si continúas, esos pedidos se conservarán pero quedarán sin cliente asignado.`
    : 'No tiene pedidos asociados. Se eliminará únicamente la ficha del cliente.';

  return `
    <div class="modal-head">
      <div>
        <div class="modal-eyebrow">Eliminar cliente</div>
        <div class="modal-title text-title" id="detailModalTitle">${escapeHtml(cliente.nombre)}</div>
      </div>
      <button type="button" class="modal-close" data-close-modal aria-label="Cerrar">✕</button>
    </div>

    <div class="modal-callout danger">
      <div class="modal-callout-title">${pedidos.length ? 'Este borrado afectará a pedidos vinculados.' : '¿Eliminar este cliente?'}</div>
      <div class="modal-callout-text">${escapeHtml(text)}</div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn-danger" data-confirm-delete-cliente="${cliente.id}">Eliminar cliente</button>
      <button type="button" class="btn-ghost" data-dismiss-modal>Cancelar</button>
    </div>
  `;
}

export function refreshModalIfNeeded() {
  if (!state.modalOpen) return;

  if (state.modalType === 'pedido' && state.modalTargetId) {
    const pedido = state.pedidosMap.get(state.modalTargetId);
    if (pedido) openModal(buildPedidoModalHtml(pedido), { type: 'pedido', targetId: pedido.codigo });
    else closeModal();
  }

  if (state.modalType === 'proveedor' && state.modalTargetId) {
    const proveedor = state.proveedoresMap.get(state.modalTargetId);
    if (proveedor) openModal(buildProveedorModalHtml(proveedor), { type: 'proveedor', targetId: proveedor.id });
    else closeModal();
  }

  if (state.modalType === 'cliente' && state.modalTargetId) {
    const cliente = state.clientesMap.get(state.modalTargetId);
    if (cliente) openModal(buildClienteModalHtml(cliente), { type: 'cliente', targetId: cliente.id });
    else closeModal();
  }
}

export function bindUIEvents() {
  refs.estadoInput.addEventListener('change', () => setEstadoBadge(refs.estadoInput.value));
  refs.startBtn.addEventListener('click', actions.onStartCamera);
  refs.cancelEditBtn.addEventListener('click', actions.onReset);
  refs.pedidoForm.addEventListener('submit', actions.onSave);
  refs.toggleNewProviderBtn.addEventListener('click', event => {
    event.preventDefault();
    actions.onToggleProviderMode();
  });
  refs.toggleNewClientBtn.addEventListener('click', event => {
    event.preventDefault();
    actions.onToggleClientMode();
  });
  refs.closeEditorModalBtn.addEventListener('click', actions.onCloseEditor);

  refs.menuToggleBtn.addEventListener('click', () => {
    if (refs.appDrawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  });
  refs.drawerBackdrop.addEventListener('click', closeDrawer);
  refs.navInicioBtn?.addEventListener('click', () => setRoute('inicio'));
  refs.navPedidosBtn?.addEventListener('click', () => setRoute('pedidos'));
  refs.navProveedoresBtn?.addEventListener('click', () => setRoute('proveedores'));
  refs.navClientesBtn?.addEventListener('click', () => setRoute('clientes'));
  refs.goHomeBtn?.addEventListener('click', () => setRoute('inicio'));

  refs.homeTabPedidos?.addEventListener('click', () => setHomeRecordsView('pedidos'));
  refs.homeTabProveedores?.addEventListener('click', () => setHomeRecordsView('proveedores'));

  refs.detailModal.addEventListener('click', event => {
    if (event.target === refs.detailModal) closeModal();
  });

  refs.editorCodeBig.addEventListener('dblclick', () => {
    refs.editorCodeBig.style.display = 'none';
    refs.editorCodeInput.style.display = 'inline-block';
    refs.editorCodeInput.value = state.currentCode;
    refs.editorCodeInput.focus();
    refs.editorCodeInput.select();
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (state.modalOpen) closeModal();
      else closeDrawer();
    }
  });

  window.addEventListener('popstate', applyRouteFromHash);
  window.addEventListener('hashchange', applyRouteFromHash);
}
