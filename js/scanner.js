import { state } from './state.js';
import { initFirebase } from './firebase.js';
import { getRefs, setScanMessage, setSyncStatus, updateScannerVisibility } from './ui.js';

const actions = {
  onCodeDetected: async () => {}
};

const SCAN_INTERVAL_MS = 300;
const STABLE_WINDOW_SIZE = 3;
const REQUIRED_MATCHES = 2;

export function setScannerActions(nextActions) {
  Object.assign(actions, nextActions);
}

function clearScanTimer() {
  if (state.scannerTimer) {
    clearTimeout(state.scannerTimer);
    state.scannerTimer = null;
  }
}

function resetScannerValidation() {
  state.scannerSamples = [];
  state.lastStableCode = '';
}

function getFullCodeCandidate(text) {
  const value = extractFiveDigits(text) || extractFastCandidate(text);
  return value && value.length === 5 ? value : null;
}

function registerSample(code) {
  state.scannerSamples.push(code || '');
  if (state.scannerSamples.length > STABLE_WINDOW_SIZE) state.scannerSamples.shift();

  if (!code) return null;

  const matches = state.scannerSamples.filter(sample => sample === code).length;
  if (matches >= REQUIRED_MATCHES) {
    state.lastStableCode = code;
    return code;
  }

  return null;
}

function scheduleNextScan(delay = SCAN_INTERVAL_MS) {
  clearScanTimer();

  if (!state.scannerLoopActive || !state.stream) return;

  state.scannerTimer = window.setTimeout(() => {
    void scanLoop();
  }, delay);
}

async function scanLoop() {
  const refs = getRefs();

  if (!state.scannerLoopActive || !state.stream) return;

  if (state.busy) {
    scheduleNextScan();
    return;
  }

  state.busy = true;
  refs.videoWrap.classList.add('scanning');
  setSyncStatus('Escaneando', 'busy');

  try {
    await initFirebase();
    const region = captureRegion();
    preprocessImage(region);
    const worker = await ensureWorker();
    const result = await worker.recognize(refs.processedCanvas);
    const raw = result?.data?.text || '';
    const stableCode = registerSample(getFullCodeCandidate(raw));

    if (stableCode) {
      refs.currentCodeEl.textContent = stableCode;
      setScanMessage(`Código ${stableCode} validado. Preparando la siguiente acción…`);
      setSyncStatus('Código validado', 'ready');
      stopCamera({ preserveMessage: true, preserveStatus: true, preserveCode: true });
      await actions.onCodeDetected(stableCode);
      return;
    }

    const latestCode = state.scannerSamples[state.scannerSamples.length - 1];
    if (latestCode) {
      refs.currentCodeEl.textContent = latestCode;
      const matches = state.scannerSamples.filter(sample => sample === latestCode).length;
      setScanMessage(matches === 1
        ? `Detectado ${latestCode}. Mantén el código estable para confirmarlo automáticamente.`
        : `Confirmando ${latestCode}. Falta una lectura estable más.`);
    } else {
      refs.currentCodeEl.textContent = '· · · · ·';
      setScanMessage('Buscando un código de 5 dígitos. Mantén la etiqueta centrada y estable.');
    }
  } catch (error) {
    console.error(error);
    setSyncStatus('Error', 'error');
    setScanMessage(error.message || 'Error durante el escaneo automático.');
  } finally {
    state.busy = false;
    refs.videoWrap.classList.remove('scanning');
    updateScannerVisibility();
    if (state.scannerLoopActive && state.stream) scheduleNextScan();
  }
}

export function stopCamera(options = {}) {
  const {
    preserveMessage = false,
    preserveStatus = false,
    preserveCode = false,
    resetValidation = true
  } = options;
  const refs = getRefs();

  state.scannerLoopActive = false;
  clearScanTimer();

  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }

  refs.video.pause();
  refs.video.srcObject = null;
  refs.videoWrap.classList.remove('scanning');

  if (resetValidation) resetScannerValidation();
  if (!preserveCode) refs.currentCodeEl.textContent = '· · · · ·';

  updateScannerVisibility();

  if (!preserveStatus) {
    if (state.firebaseReady) setSyncStatus('Conectado con Firebase', 'ready');
    else setSyncStatus('Sistema listo');
  }

  if (!preserveMessage) {
    setScanMessage('Pulsa “Activar cámara” para iniciar lectura continua. La validación se hace automáticamente cuando el mismo código se repite de forma estable.');
  }
}

export async function startCamera() {
  const refs = getRefs();

  if (state.stream) {
    stopCamera();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setSyncStatus('Cámara no compatible', 'error');
    setScanMessage('Tu navegador no soporta acceso a cámara.');
    return;
  }

  try {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    state.stream = stream;
    state.scannerLoopActive = true;
    resetScannerValidation();
    refs.currentCodeEl.textContent = '· · · · ·';
    refs.video.srcObject = stream;
    updateScannerVisibility();
    await refs.video.play();
    setSyncStatus('Cámara activa', 'busy');
    setScanMessage('Lectura continua activada. Mantén el código quieto; se validará solo cuando coincida en 2 de las últimas 3 lecturas.');
    scheduleNextScan(150);
  } catch (error) {
    console.error(error);
    stopCamera();
    setSyncStatus('Error de cámara', 'error');
    setScanMessage('No se ha podido abrir la cámara. Verifica permisos y usa HTTPS o localhost.');
  }
}

export async function ensureWorker() {
  if (state.worker) return state.worker;

  const { createWorker, PSM } = Tesseract;
  setSyncStatus('Cargando OCR…', 'busy');

  state.worker = await createWorker('eng', 1, {
    logger: message => {
      if (message?.status === 'recognizing') setSyncStatus('Leyendo código', 'busy');
    }
  });

  await state.worker.setParameters({
    tessedit_char_whitelist: '0123456789',
    tessedit_pageseg_mode: PSM.SPARSE_TEXT
  });

  setSyncStatus('OCR listo', 'ready');
  return state.worker;
}

export function captureRegion() {
  const refs = getRefs();
  const vw = refs.video.videoWidth;
  const vh = refs.video.videoHeight;

  if (!vw || !vh) throw new Error('La cámara todavía no está lista.');

  const cropWidth = Math.floor(vw * 0.60);
  const cropHeight = Math.floor(vh * 0.15);
  const startX = Math.floor((vw - cropWidth) / 2);
  const startY = Math.floor((vh - cropHeight) / 2);

  refs.cropCanvas.width = cropWidth;
  refs.cropCanvas.height = cropHeight;
  refs.cropCtx.drawImage(refs.video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  return { cropWidth, cropHeight };
}

export function preprocessImage({ cropWidth, cropHeight }) {
  const refs = getRefs();
  const scale = 1.35;

  refs.processedCanvas.width = Math.max(1, Math.floor(cropWidth * scale));
  refs.processedCanvas.height = Math.max(1, Math.floor(cropHeight * scale));
  refs.processedCtx.imageSmoothingEnabled = false;
  refs.processedCtx.drawImage(refs.cropCanvas, 0, 0, refs.processedCanvas.width, refs.processedCanvas.height);

  const image = refs.processedCtx.getImageData(0, 0, refs.processedCanvas.width, refs.processedCanvas.height);
  const { data } = image;
  let sum = 0;
  const total = data.length / 4;

  for (let index = 0; index < data.length; index += 4) {
    sum += 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
  }

  const average = sum / total;
  const threshold = Math.max(112, Math.min(176, average * 0.96));

  for (let index = 0; index < data.length; index += 4) {
    const gray = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
    const output = gray > threshold ? 255 : 0;
    data[index] = output;
    data[index + 1] = output;
    data[index + 2] = output;
    data[index + 3] = 255;
  }

  refs.processedCtx.putImageData(image, 0, 0);
}

export function extractFiveDigits(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const direct = clean.match(/\b\d{5}\b/);
  if (direct) return direct[0];

  const compact = clean.replace(/\D/g, '').match(/\d{5}/);
  return compact ? compact[0] : null;
}

export function extractFastCandidate(text) {
  const digits = String(text || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 5) return digits;
  if (digits.length > 5) return digits.slice(0, 5);
  if (digits.length === 4) return digits;
  return null;
}

export function cleanupScanner() {
  stopCamera({ preserveMessage: true, preserveStatus: true });
  if (state.worker) {
    state.worker.terminate();
    state.worker = null;
  }
}
