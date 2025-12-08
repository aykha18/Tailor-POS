/* global window, document */
// Barcode Scanner using ZXing (via jsdelivr CDN)
// Provides a modal with camera preview; on scan, fills #productBarcode

(function () {
  function ensureZXing(cb) {
    if (window.ZXing) return cb();
    const s = document.createElement('script');
    s.src = '/static/js/libs/zxing.umd.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function buildModal() {
    const html = `
      <div id="barcodeScannerModal" class="fixed inset-0 bg-black/70 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-white text-lg font-semibold">Scan Barcode</h3>
              <button id="barcodeCloseBtn" class="text-neutral-400 hover:text-white">✕</button>
            </div>
            <div class="space-y-3">
              <video id="barcodeVideo" class="w-full rounded bg-black" autoplay muted playsinline></video>
              <div class="flex flex-wrap gap-2 items-center justify-between">
                <select id="barcodeCameraSelect" class="bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1 text-sm"></select>
                <div class="flex gap-2">
                  <button id="barcodeStartBtn" class="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm">Start</button>
                  <input id="barcodeFile" type="file" accept="image/*" capture="environment" class="hidden" />
                  <button id="barcodeUploadBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-sm">Upload Photo</button>
                </div>
              </div>
              <p id="barcodeHint" class="text-xs text-neutral-400">Align the barcode within the frame. On success, the code will be inserted into the Barcode field.</p>
            </div>
          </div>
        </div>
      </div>`;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);
  }

  let codeReader = null;
  let currentDeviceId = null;
  let stream = null;

  function cameraPermittedInContext() {
    // getUserMedia requires secure context except for localhost
    const isLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
    return (window.isSecureContext || isLocalhost) && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  }

  function showModal() {
    const m = document.getElementById('barcodeScannerModal');
    if (m) m.classList.remove('hidden');
  }
  function hideModal() {
    const m = document.getElementById('barcodeScannerModal');
    if (m) m.classList.add('hidden');
    stop();
  }

  async function populateCameras() {
    let select = document.getElementById('barcodeCameraSelect');
    if (!select) {
      // Modal might not be attached yet (race). Build and re-query.
      buildModal();
      select = document.getElementById('barcodeCameraSelect');
      if (!select) return []; // give up silently; caller will fall back
    }
    select.innerHTML = '';
    const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
    devices.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || `Camera ${select.length + 1}`;
      select.appendChild(opt);
    });
    if (devices[0]) currentDeviceId = devices[0].deviceId;
    select.onchange = () => (currentDeviceId = select.value);
  }

  async function start() {
    if (!codeReader) codeReader = new ZXing.BrowserMultiFormatReader();
    const video = document.getElementById('barcodeVideo');
    try {
      stop();
      if (!cameraPermittedInContext()) {
        throw new Error('insecure-context');
      }
      const hints = new Map();
      await populateCameras();
      const result = await codeReader.decodeFromVideoDevice(currentDeviceId, video, (res, err) => {
        if (res) {
          const val = res.getText();
          const field = document.getElementById('productBarcode');
          if (field) field.value = val;
          hideModal();
          if (window.showToast) window.showToast('Barcode scanned', 'success');
        }
      });
      stream = result;
    } catch (e) {
      console.error('Barcode start error', e);
      const hint = document.getElementById('barcodeHint');
      if (hint) {
        hint.textContent = 'Camera unavailable. Use Upload Photo instead. On mobile over Wi‑Fi, camera needs HTTPS or localhost.';
      }
    }
  }

  function stop() {
    if (codeReader) {
      try {
        codeReader.reset();
      } catch (e) {}
    }
    if (stream && typeof stream.stop === 'function') stream.stop();
    stream = null;
  }

  function initUI() {
    if (!document.getElementById('barcodeScannerModal')) buildModal();
    const directBtn = document.getElementById('openBarcodeScannerBtn');
    if (directBtn) {
      directBtn.addEventListener('click', () => {
        ensureZXing(() => {
          if (!document.getElementById('barcodeScannerModal')) buildModal();
          showModal();
          start();
        });
      });
    }
    // Event delegation for dynamic/mobile cases
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('#openBarcodeScannerBtn');
      if (!btn) return;
      ensureZXing(() => {
        if (!document.getElementById('barcodeScannerModal')) buildModal();
        showModal();
        start();
      });
    });
    document.body.addEventListener('click', (e) => {
      if (e.target && (e.target.id === 'barcodeCloseBtn' || e.target.id === 'barcodeScannerModal')) hideModal();
    });
    document.getElementById('barcodeStartBtn')?.addEventListener('click', start);

    // Upload decoding
    const uploadBtn = document.getElementById('barcodeUploadBtn');
    const fileInput = document.getElementById('barcodeFile');
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        ensureZXing(async () => {
          try {
            if (!codeReader) codeReader = new ZXing.BrowserMultiFormatReader();
            const img = document.createElement('img');
            img.onload = async () => {
              try {
                const res = await codeReader.decodeFromImage(img);
                const val = res && res.getText ? res.getText() : '';
                if (val) {
                  const field = document.getElementById('productBarcode');
                  if (field) field.value = val;
                  hideModal();
                  if (window.showToast) window.showToast('Barcode decoded from photo', 'success');
                } else if (window.showModernAlert) {
                  window.showModernAlert('No barcode detected in the photo. Try again.', 'warning');
                }
              } catch (err) {
                console.error('Decode image error', err);
                if (window.showModernAlert) window.showModernAlert('Could not read barcode from photo', 'error');
              }
            };
            img.src = URL.createObjectURL(file);
          } catch (err) {
            console.error('Upload flow error', err);
          }
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();
