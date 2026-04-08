import { VALID_ROUTES } from './config.js';
import { state } from './state.js';

const refs = {};
const actions = {
  openPedidoModal: async () => {},
  openProveedorModal: () => {},
  openClienteModal: () => {},
  editPedido: async () => {},
  onApplyRouteFromHash: () => {},
  onStartCamera: async () => {},
  onCapture: async () => {},
  onRetry: async () => {},
  onReset: () => {},
  onSave: async () => {},
  onToggleProviderMode: () => {},
  onToggleClientMode: () => {},
  onCloseEditor: () => {},
  onOpenDrawer: () => {},
  onCloseDrawer: () => {}
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
    captureBtn: document.getElementById('captureBtn'),
    retryBtn: document.getElementById('retryBtn'),
    resetBtn: document.getElementById('resetBtn'),
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
  refs.syncDot.className = 'sync-dot' + (dotState ? ` ${dotState}` : '');
}

export function setScanMessage(text) {
  refs.scanMessage.textContent = text;
}

export function setSaveMessage(text) {
  refs.saveMessage.textContent = text;
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function formatDate(value) {
  if (!value) return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-ES');
}

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function getEstadoClass(estado) {
  if (estado === 'Recibido') return 'estado-recibido';
  if (estado === 'En tránsito') return 'estado-en-transito';
  if (estado === 'Incidencia') return 'estado-incidencia';
  return 'estado-pendiente';
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
  refs.navInicioBtn.classList.toggle('active', safeRoute === 'inicio');
  refs.navPedidosBtn.classList.toggle('active', safeRoute === 'pedidos');
  refs.navProveedoresBtn.classList.toggle('active', safeRoute === 'proveedores');
  refs.navClientesBtn.classList.toggle('active', safeRoute === 'clientes');

  if (pushHash) {
    const hash = safeRoute === 'inicio' ? '#inicio' : `#${safeRoute}`;
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
  refs.summaryPedidos.textContent = state.pedidos.length || '0';
  refs.summaryPendientes.textContent = state.pedidos.filter(item => item.estado !== 'Recibido').length || '0';
  refs.summaryProveedores.textContent = state.proveedores.length || '0';
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
  if (!state.proveedores.length) {
    target.innerHTML = '<div class="empty-state"><div class="empty-icon">◇</div><p>Todavía no hay proveedores. Crea uno desde la ficha de pedido.</p></div>';
    return;
  }

  const ordered = getProveedoresOrdered();
  target.innerHTML = ordered.map(proveedor => {
    const pedidos = Array.isArray(proveedor.pedidosAsignados) ? proveedor.pedidosAsignados : [];
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
  setScanMessage('Activa la cámara solo cuando vayas a leer un código. El visor aparecerá únicamente mientras esté en uso.');
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
  refs.captureBtn.disabled = !active || state.busy;
  refs.retryBtn.disabled = !active || state.busy;
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

export function openModal(html) {
  refs.detailModalBody.innerHTML = html;
  refs.detailModal.classList.add('visible');
  state.modalOpen = true;
  document.body.classList.add('no-scroll');

  const closeBtn = refs.detailModalBody.querySelector('[data-close-modal]');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  bindModalActions();
}

function bindModalActions() {
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
  `;
}

export function buildProveedorModalHtml(proveedor) {
  const pedidos = Array.isArray(proveedor.pedidosAsignados) ? proveedor.pedidosAsignados : [];
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
  `;
}

export function buildClienteModalHtml(cliente) {
  const pedidos = Array.isArray(cliente.listaPedidos)
    ? cliente.listaPedidos
    : (Array.isArray(cliente.pedidosAsignados) ? cliente.pedidosAsignados : []);
  const dineroGastado = Number.isFinite(Number(cliente.dineroGastado)) ? Number(cliente.dineroGastado) : 0;

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
  `;
}

export function refreshModalIfNeeded() {
  if (!state.modalOpen) return;

  if (state.modalType === 'pedido' && state.modalTargetId) {
    const pedido = state.pedidosMap.get(state.modalTargetId);
    if (pedido) openModal(buildPedidoModalHtml(pedido));
    else closeModal();
  }

  if (state.modalType === 'proveedor' && state.modalTargetId) {
    const proveedor = state.proveedoresMap.get(state.modalTargetId);
    if (proveedor) openModal(buildProveedorModalHtml(proveedor));
    else closeModal();
  }

  if (state.modalType === 'cliente' && state.modalTargetId) {
    const cliente = state.clientesMap.get(state.modalTargetId);
    if (cliente) openModal(buildClienteModalHtml(cliente));
    else closeModal();
  }
}

export function bindUIEvents() {
  refs.estadoInput.addEventListener('change', () => setEstadoBadge(refs.estadoInput.value));
  refs.startBtn.addEventListener('click', actions.onStartCamera);
  refs.captureBtn.addEventListener('click', () => actions.onCapture(false));
  refs.retryBtn.addEventListener('click', () => actions.onRetry(true));
  refs.resetBtn.addEventListener('click', actions.onReset);
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
  refs.navInicioBtn.addEventListener('click', () => setRoute('inicio'));
  refs.navPedidosBtn.addEventListener('click', () => setRoute('pedidos'));
  refs.navProveedoresBtn.addEventListener('click', () => setRoute('proveedores'));
  refs.navClientesBtn.addEventListener('click', () => setRoute('clientes'));
  refs.goHomeBtn.addEventListener('click', () => setRoute('inicio'));

  refs.homeTabPedidos.addEventListener('click', () => setHomeRecordsView('pedidos'));
  refs.homeTabProveedores.addEventListener('click', () => setHomeRecordsView('proveedores'));

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
