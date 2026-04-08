import { state } from './state.js';
import { initFirebase } from './firebase.js';
import { getRefs, setScanMessage, setSyncStatus, updateScannerVisibility } from './ui.js';

const actions = {
  onCodeDetected: async () => {}
};

export function setScannerActions(nextActions) {
  Object.assign(actions, nextActions);
}

export function stopCamera() {
  const refs = getRefs();

  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }

  refs.video.pause();
  refs.video.srcObject = null;
  refs.videoWrap.classList.remove('scanning');
  updateScannerVisibility();

  if (state.firebaseReady) setSyncStatus('Conectado con Firebase', 'ready');
  else setSyncStatus('Sistema listo');

  setScanMessage('Activa la cámara solo cuando vayas a leer un código. El visor aparecerá únicamente mientras esté en uso.');
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
    refs.video.srcObject = stream;
    updateScannerVisibility();
    await refs.video.play();
    setSyncStatus('Cámara activa', 'busy');
    setScanMessage('Sitúa el código dentro del recuadro y pulsa "Escanear pedido".');
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

export async function readNumber(forceRetry = false) {
  const refs = getRefs();

  if (state.busy || !state.stream) return;

  state.busy = true;
  refs.captureBtn.disabled = true;
  refs.retryBtn.disabled = true;
  refs.videoWrap.classList.add('scanning');
  setSyncStatus('Escaneando', 'busy');
  setScanMessage(forceRetry ? 'Repitiendo lectura…' : 'Analizando el código del pedido…');

  try {
    await initFirebase();
    captureRegion();
    const worker = await ensureWorker();
    const result = await worker.recognize(refs.cropCanvas);
    const raw = result?.data?.text || '';
    const value = extractFiveDigits(raw) || extractFastCandidate(raw);

    if (!value) {
      setSyncStatus('No detectado', 'error');
      setScanMessage('No se pudo leer el código. Pulsa "Repetir lectura".');
      return;
    }

    if (value.length !== 5) {
      refs.currentCodeEl.textContent = value;
      refs.codigoInput.value = value;
      setSyncStatus('Lectura parcial', 'busy');
      setScanMessage('Código aproximado. Repite si no coincide.');
      return;
    }

    await actions.onCodeDetected(value);
  } catch (error) {
    console.error(error);
    setSyncStatus('Error', 'error');
    setScanMessage(error.message || 'Error durante el escaneo.');
  } finally {
    state.busy = false;
    refs.videoWrap.classList.remove('scanning');
    updateScannerVisibility();
  }
}

export function cleanupScanner() {
  state.stream?.getTracks().forEach(track => track.stop());
  state.worker?.terminate();
}
