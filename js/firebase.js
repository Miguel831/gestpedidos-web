import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-functions.js';
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
  arrayRemove,
  writeBatch
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
  setSyncStatus,
  todayISO
} from './ui.js';

let firebaseInitPromise = null;

function containsPlaceholder(value) {
  return !value || String(value).includes('PON_AQUI_TU_');
}

function assertFirebaseConfig() {
  if (Object.values(firebaseConfig).some(containsPlaceholder)) {
    throw new Error('Configura Firebase antes de usar el sistema.');
  }
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
    fechaEnvio: '',
    fechaRecibo: '',
    descripcion: '',
    estado: 'Pendiente',
    existsInDb: false
  };
}

export async function initFirebase() {
  if (firebaseInitPromise) return firebaseInitPromise;

  firebaseInitPromise = (async () => {
    assertFirebaseConfig();

    state.app = initializeApp(firebaseConfig);
    state.auth = getAuth(state.app);
    state.db = getFirestore(state.app);
    state.functions = getFunctions(state.app, 'europe-west1');

    state.user = state.auth.currentUser;
    if (!state.user) {
      const credential = await signInAnonymously(state.auth);
      state.user = credential.user;
    }

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

export async function sendWhatsAppToPedido({ codigo, telefono, clienteNombre, estado }) {
  await initFirebase();

  const callable = httpsCallable(state.functions, 'sendWhatsAppMessage');
  const result = await callable({
    codigo,
    telefono,
    clienteNombre,
    estado
  });

  return result.data;
}
export async function sendWhatsAppToPedido({ codigo, telefono, clienteNombre, estado }) {
  await initFirebase();

  const callable = httpsCallable(state.functions, 'sendWhatsAppMessage');
  const result = await callable({
    codigo,
    telefono,
    clienteNombre,
    estado
  });

  return result.data;
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

async function getFreshPedido(codigo) {
  const snapshot = await getDoc(doc(state.db, 'pedidos', codigo));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data(), existsInDb: true } : null;
}

export async function loadPedidoByCode(code) {
  await initFirebase();
  const safeCode = String(code || '').trim();

  if (!/^\d{6}$/.test(safeCode)) {
    throw new Error('El código debe tener exactamente 6 dígitos.');
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

export async function createPedidoFromScan(codigo) {
  await initFirebase();

  const safeCode = String(codigo || '').trim();
  if (!/^\d{6}$/.test(safeCode)) throw new Error('El código debe tener exactamente 6 dígitos.');

  const existing = await loadPedidoByCode(safeCode);
  if (existing?.existsInDb) return existing;

  const ref = doc(state.db, 'pedidos', safeCode);
  await setDoc(ref, {
    codigo: safeCode,
    proveedorId: '',
    proveedorNombre: '',
    clienteId: '',
    clienteNombre: '',
    clienteCorreo: '',
    clienteNumero: '',
    fechaEnvio: todayISO(),
    fechaRecibo: '',
    descripcion: '',
    estado: 'Pendiente',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: state.user.uid
  });

  return getFreshPedido(safeCode);
}

export async function markPedidoAsReceivedNow(codigo) {
  await initFirebase();

  const safeCode = String(codigo || '').trim();
  if (!/^\d{6}$/.test(safeCode)) throw new Error('El código debe tener exactamente 6 dígitos.');

  const pedido = await loadPedidoByCode(safeCode);
  if (!pedido?.existsInDb) throw new Error('No se puede marcar como recibido un pedido inexistente.');

  await setDoc(doc(state.db, 'pedidos', safeCode), {
    fechaRecibo: todayISO(),
    estado: 'Recibido',
    updatedAt: serverTimestamp(),
    updatedBy: state.user.uid
  }, { merge: true });

  return getFreshPedido(safeCode);
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
  if (!/^\d{6}$/.test(codigo)) {
    throw new Error('Escanea primero un código válido de 6 dígitos.');
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
    fechaEnvio: formData.fechaEnvio || '',
    fechaRecibo: formData.fechaRecibo || '',
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

  const savedPedido = await getFreshPedido(codigo);
  return { savedPedido, proveedor, cliente };
}

export async function deletePedidoByCode(codigo) {
  await initFirebase();

  const pedido = await loadPedidoByCode(codigo);
  if (!pedido?.existsInDb) throw new Error('Pedido no encontrado.');

  const batch = writeBatch(state.db);

  if (pedido.proveedorId) {
    batch.set(doc(state.db, 'proveedores', pedido.proveedorId), {
      pedidosAsignados: arrayRemove(codigo),
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    }, { merge: true });
  }

  if (pedido.clienteId) {
    batch.set(doc(state.db, 'clientes', pedido.clienteId), {
      listaPedidos: arrayRemove(codigo),
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    }, { merge: true });
  }

  batch.delete(doc(state.db, 'pedidos', codigo));
  await batch.commit();

  return pedido;
}

export async function deleteProveedorById(proveedorId) {
  await initFirebase();

  const proveedor = state.proveedoresMap.get(proveedorId) || (async () => {
    const snapshot = await getDoc(doc(state.db, 'proveedores', proveedorId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  })();

  const resolvedProveedor = await proveedor;
  if (!resolvedProveedor) throw new Error('Proveedor no encontrado.');

  const linkedPedidos = state.pedidos.filter(pedido => pedido.proveedorId === proveedorId);
  const batch = writeBatch(state.db);

  linkedPedidos.forEach(pedido => {
    batch.set(doc(state.db, 'pedidos', pedido.codigo), {
      codigo: pedido.codigo,
      proveedorId: '',
      proveedorNombre: '',
      clienteId: pedido.clienteId || '',
      clienteNombre: pedido.clienteNombre || '',
      clienteCorreo: pedido.clienteCorreo || '',
      clienteNumero: pedido.clienteNumero || '',
      fechaEnvio: pedido.fechaEnvio || '',
      fechaRecibo: pedido.fechaRecibo || '',
      descripcion: pedido.descripcion || '',
      estado: pedido.estado || 'Pendiente',
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    }, { merge: true });
  });

  batch.delete(doc(state.db, 'proveedores', proveedorId));
  await batch.commit();

  return {
    proveedor: resolvedProveedor,
    affectedPedidos: linkedPedidos.map(pedido => pedido.codigo)
  };
}

export async function deleteClienteById(clienteId) {
  await initFirebase();

  const cliente = state.clientesMap.get(clienteId) || (async () => {
    const snapshot = await getDoc(doc(state.db, 'clientes', clienteId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  })();
  const resolvedCliente = await cliente;
  if (!resolvedCliente) throw new Error('Cliente no encontrado.');

  const pedidos = Array.isArray(resolvedCliente.listaPedidos)
    ? resolvedCliente.listaPedidos
    : (Array.isArray(resolvedCliente.pedidosAsignados) ? resolvedCliente.pedidosAsignados : []);
  const batch = writeBatch(state.db);

  pedidos.forEach(codigo => {
    batch.set(doc(state.db, 'pedidos', codigo), {
      clienteId: '',
      clienteNombre: '',
      clienteCorreo: '',
      clienteNumero: '',
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    }, { merge: true });
  });

  batch.delete(doc(state.db, 'clientes', clienteId));
  await batch.commit();

  return { cliente: resolvedCliente, affectedPedidos: pedidos };
}

export function cleanupFirebase() {
  state.unsubs.forEach(unsub => unsub());
  state.unsubs = [];
}
