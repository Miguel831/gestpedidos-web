import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js';

import { firebaseConfig } from './config.js';
import { state } from './state.js';
import {
  normalizeText,
  renderAllLists,
  renderClienteSelect,
  renderProveedorSelect,
  renderSummary,
  refreshModalIfNeeded,
  setSaveMessage,
  setSyncStatus
} from './ui.js';

let firebaseInitPromise = null;

function hasFirebasePlaceholders() {
  return Object.values(firebaseConfig).some(value => !value || String(value).includes('PON_AQUI_TU_'));
}

function getNowIso() {
  return new Date().toISOString();
}

function preserveDateTime(nextValue, previousValue = '') {
  if (!nextValue) return '';
  if (typeof previousValue === 'string' && previousValue.length > 10 && previousValue.slice(0, 10) === nextValue) {
    return previousValue;
  }
  return nextValue;
}

export function buildNewPedido(code) {
  return {
    codigo: code,
    proveedorId: '',
    proveedorNombre: '',
    clienteId: '',
    clienteNombre: '',
    clienteCorreo: '',
    clienteNumero: '',
    fechaEnvio: getNowIso(),
    fechaRecibo: '',
    descripcion: '',
    estado: 'Pendiente',
    existsInDb: false
  };
}

export async function initFirebase() {
  if (firebaseInitPromise) return firebaseInitPromise;

  firebaseInitPromise = (async () => {
    if (hasFirebasePlaceholders()) throw new Error('Configura Firebase antes de usar el sistema.');

    state.app = initializeApp(firebaseConfig);
    state.auth = getAuth(state.app);
    state.db = getFirestore(state.app);

    const credential = await signInAnonymously(state.auth);
    state.user = credential.user;
    state.firebaseReady = true;

    setSyncStatus('Conectado con Firebase', 'ready');
    setSaveMessage('Sistema listo. Los cambios se guardan en tiempo real.');
    subscribeToCollections();
    return true;
  })().catch(error => {
    firebaseInitPromise = null;
    state.firebaseReady = false;
    setSyncStatus('Error de conexión', 'error');
    throw error;
  });

  return firebaseInitPromise;
}

export function subscribeToCollections() {
  state.unsubs.forEach(unsub => unsub());
  state.unsubs = [];

  state.unsubs.push(
    onSnapshot(collection(state.db, 'pedidos'), snapshot => {
      state.pedidos = snapshot.docs.map(documento => ({ id: documento.id, ...documento.data(), existsInDb: true }));
      state.pedidosMap = new Map(state.pedidos.map(pedido => [pedido.codigo, pedido]));
      renderAllLists();
      renderSummary();
      refreshModalIfNeeded();
    }),
    onSnapshot(collection(state.db, 'proveedores'), snapshot => {
      state.proveedores = snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }));
      state.proveedoresMap = new Map(state.proveedores.map(proveedor => [proveedor.id, proveedor]));
      renderProveedorSelect();
      renderAllLists();
      renderSummary();
      refreshModalIfNeeded();
    }),
    onSnapshot(collection(state.db, 'clientes'), snapshot => {
      state.clientes = snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }));
      state.clientesMap = new Map(state.clientes.map(cliente => [cliente.id, cliente]));
      renderClienteSelect();
      renderAllLists();
      renderSummary();
      refreshModalIfNeeded();
    })
  );
}

export async function loadPedidoByCode(code) {
  await initFirebase();
  const safeCode = String(code || '').trim();

  if (!/^\d{5}$/.test(safeCode)) {
    throw new Error('El código debe tener exactamente 5 dígitos.');
  }

  const local = state.pedidosMap.get(safeCode);
  if (local) return local;

  const snapshot = await getDoc(doc(state.db, 'pedidos', safeCode));
  return snapshot.exists()
    ? { id: snapshot.id, ...snapshot.data(), existsInDb: true }
    : buildNewPedido(safeCode);
}

function findProveedorByName(name) {
  const normalized = normalizeText(name);
  return state.proveedores.find(proveedor => normalizeText(proveedor.nombre) === normalized) || null;
}

function findClienteByName(name) {
  const normalized = normalizeText(name);
  return state.clientes.find(cliente => normalizeText(cliente.nombre) === normalized) || null;
}

export async function resolveProveedorForSave({ codigo, providerMode, proveedorId, nuevoProveedorNombre, nuevoProveedorDescripcion }) {
  if (providerMode === 'new') {
    const nombre = nuevoProveedorNombre.trim();
    const descripcion = nuevoProveedorDescripcion.trim();

    if (!nombre) throw new Error('Indica el nombre del proveedor.');

    const existing = findProveedorByName(nombre);
    if (existing) {
      if (descripcion && descripcion !== (existing.descripcion || '')) {
        await updateDoc(doc(state.db, 'proveedores', existing.id), {
          descripcion,
          updatedAt: serverTimestamp()
        });
      }

      return {
        id: existing.id,
        nombre: existing.nombre,
        descripcion: descripcion || existing.descripcion || '',
        created: false
      };
    }

    const ref = await addDoc(collection(state.db, 'proveedores'), {
      nombre,
      descripcion,
      pedidosAsignados: [codigo],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: state.user.uid,
      updatedBy: state.user.uid
    });

    return { id: ref.id, nombre, descripcion, created: true };
  }

  if (!proveedorId) throw new Error('Selecciona un proveedor o crea uno nuevo.');
  const proveedor = state.proveedoresMap.get(proveedorId);
  if (!proveedor) throw new Error('Proveedor no encontrado.');

  return {
    id: proveedor.id,
    nombre: proveedor.nombre,
    descripcion: proveedor.descripcion || '',
    created: false
  };
}

export async function resolveClienteForSave({
  codigo,
  clientMode,
  clienteId,
  nuevoClienteNombre,
  nuevoClienteCorreo,
  nuevoClienteNumero
}) {
  if (clientMode === 'new') {
    const nombre = nuevoClienteNombre.trim();
    const correo = nuevoClienteCorreo.trim();
    const numero = nuevoClienteNumero.trim();

    if (!nombre) throw new Error('Indica el nombre del cliente.');

    const existing = findClienteByName(nombre);
    if (existing) {
      if ((correo && correo !== (existing.correo || '')) || (numero && numero !== (existing.numero || ''))) {
        await updateDoc(doc(state.db, 'clientes', existing.id), {
          correo: correo || existing.correo || '',
          numero: numero || existing.numero || '',
          updatedAt: serverTimestamp(),
          updatedBy: state.user.uid
        });
      }

      return {
        id: existing.id,
        nombre: existing.nombre,
        correo: correo || existing.correo || '',
        numero: numero || existing.numero || '',
        dineroGastado: Number(existing.dineroGastado) || 0,
        created: false
      };
    }

    const ref = await addDoc(collection(state.db, 'clientes'), {
      nombre,
      correo,
      numero,
      listaPedidos: [codigo],
      dineroGastado: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: state.user.uid,
      updatedBy: state.user.uid
    });

    return { id: ref.id, nombre, correo, numero, dineroGastado: 0, created: true };
  }

  if (!clienteId) throw new Error('Selecciona un cliente o crea uno nuevo.');
  const cliente = state.clientesMap.get(clienteId);
  if (!cliente) throw new Error('Cliente no encontrado.');

  return {
    id: cliente.id,
    nombre: cliente.nombre,
    correo: cliente.correo || '',
    numero: cliente.numero || '',
    dineroGastado: Number(cliente.dineroGastado) || 0,
    created: false
  };
}

export async function savePedido(formData) {
  await initFirebase();

  if (!state.firebaseReady) {
    throw new Error('Firebase no está listo.');
  }

  const codigo = formData.codigo.trim();
  if (!/^\d{5}$/.test(codigo)) {
    throw new Error('Escanea primero un código válido de 5 dígitos.');
  }

  const proveedor = await resolveProveedorForSave({
    codigo,
    providerMode: formData.providerMode,
    proveedorId: formData.proveedorId,
    nuevoProveedorNombre: formData.nuevoProveedorNombre,
    nuevoProveedorDescripcion: formData.nuevoProveedorDescripcion
  });
  const cliente = await resolveClienteForSave({
    codigo,
    clientMode: formData.clientMode,
    clienteId: formData.clienteId,
    nuevoClienteNombre: formData.nuevoClienteNombre,
    nuevoClienteCorreo: formData.nuevoClienteCorreo,
    nuevoClienteNumero: formData.nuevoClienteNumero
  });

  const previousPedido = state.currentPedido || null;
  const ref = doc(state.db, 'pedidos', codigo);
  const existsInDb = Boolean(previousPedido?.existsInDb);

  const payload = {
    codigo,
    proveedorId: proveedor.id,
    proveedorNombre: proveedor.nombre,
    clienteId: cliente.id,
    clienteNombre: cliente.nombre,
    clienteCorreo: cliente.correo,
    clienteNumero: cliente.numero,
    fechaEnvio: preserveDateTime(formData.fechaEnvio || '', previousPedido?.fechaEnvio || ''),
    fechaRecibo: preserveDateTime(formData.fechaRecibo || '', previousPedido?.fechaRecibo || ''),
    descripcion: formData.descripcion.trim(),
    estado: formData.estado,
    updatedAt: serverTimestamp(),
    updatedBy: state.user.uid
  };

  if (existsInDb) await setDoc(ref, payload, { merge: true });
  else await setDoc(ref, { ...payload, createdAt: serverTimestamp() });

  if (!proveedor.created) {
    await setDoc(doc(state.db, 'proveedores', proveedor.id), {
      nombre: proveedor.nombre,
      descripcion: proveedor.descripcion || '',
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid,
      pedidosAsignados: arrayUnion(codigo)
    }, { merge: true });
  }

  if (!cliente.created) {
    await setDoc(doc(state.db, 'clientes', cliente.id), {
      nombre: cliente.nombre,
      correo: cliente.correo || '',
      numero: cliente.numero || '',
      dineroGastado: Number(cliente.dineroGastado) || 0,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid,
      listaPedidos: arrayUnion(codigo)
    }, { merge: true });
  }

  const oldProveedorId = previousPedido?.proveedorId || '';
  if (oldProveedorId && oldProveedorId !== proveedor.id) {
    await updateDoc(doc(state.db, 'proveedores', oldProveedorId), {
      pedidosAsignados: arrayRemove(codigo),
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
  }

  const oldClienteId = previousPedido?.clienteId || '';
  if (oldClienteId && oldClienteId !== cliente.id) {
    await updateDoc(doc(state.db, 'clientes', oldClienteId), {
      listaPedidos: arrayRemove(codigo),
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
  }

  const saved = await getDoc(ref);
  const savedPedido = saved.exists() ? { id: saved.id, ...saved.data(), existsInDb: true } : null;

  return { savedPedido, proveedor, cliente };
}


export async function markPedidoAsRecibido(codigo, { force = false } = {}) {
  await initFirebase();

  const safeCode = String(codigo || '').trim();
  if (!/^\d{5}$/.test(safeCode)) {
    throw new Error('El código debe tener exactamente 5 dígitos.');
  }

  const pedido = await loadPedidoByCode(safeCode);
  if (!pedido.existsInDb) throw new Error('Ese pedido todavía no está guardado.');

  const yaRecibido = pedido.estado === 'Recibido' || Boolean(pedido.fechaRecibo);
  if (yaRecibido && !force) throw new Error('Este pedido ya estaba marcado como recibido.');

  const ref = doc(state.db, 'pedidos', safeCode);
  await setDoc(ref, {
    estado: 'Recibido',
    fechaRecibo: getNowIso(),
    updatedAt: serverTimestamp(),
    updatedBy: state.user.uid
  }, { merge: true });

  const saved = await getDoc(ref);
  return saved.exists() ? { id: saved.id, ...saved.data(), existsInDb: true } : null;
}

export function cleanupFirebase() {
  state.unsubs.forEach(unsub => unsub());
  state.unsubs = [];
}
