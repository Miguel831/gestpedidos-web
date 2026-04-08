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
import { normalizeText, renderAllLists, renderProveedorSelect, renderSummary, refreshModalIfNeeded, setSaveMessage, setSyncStatus } from './ui.js';

let firebaseInitPromise = null;

function hasFirebasePlaceholders() {
  return Object.values(firebaseConfig).some(value => !value || String(value).includes('PON_AQUI_TU_'));
}

export function buildNewPedido(code) {
  return {
    codigo: code,
    proveedorId: '',
    proveedorNombre: '',
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

  const previousPedido = state.currentPedido || null;
  const ref = doc(state.db, 'pedidos', codigo);
  const existsInDb = Boolean(previousPedido?.existsInDb);

  const payload = {
    codigo,
    proveedorId: proveedor.id,
    proveedorNombre: proveedor.nombre,
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

  const oldProveedorId = previousPedido?.proveedorId || '';
  if (oldProveedorId && oldProveedorId !== proveedor.id) {
    await updateDoc(doc(state.db, 'proveedores', oldProveedorId), {
      pedidosAsignados: arrayRemove(codigo),
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
  }

  const saved = await getDoc(ref);
  const savedPedido = saved.exists() ? { id: saved.id, ...saved.data(), existsInDb: true } : null;

  return { savedPedido, proveedor };
}

export function cleanupFirebase() {
  state.unsubs.forEach(unsub => unsub());
  state.unsubs = [];
}
