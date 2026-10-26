// Background removal worker: runs ToonOut (BiRefNet fine-tuned for anime, MIT) through
// onnxruntime-web, on the GPU (WebGPU) when the browser has it and on the CPU otherwise.
// The model is downloaded once and kept in the browser's Cache Storage.

const ORT_VERSION = '1.20.1';
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const MODEL_URL = 'https://huggingface.co/sprited/birefnet-toonout-onnx/resolve/main/birefnet-toonout-fp16.onnx';
const CACHE_NAME = 'yodayo-tavern-models';
const SIZE = 1024;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

let sessionPromise = null;

function post(type, data = {}) {
    self.postMessage({ type, ...data });
}

/** The model's bytes, from Cache Storage or downloaded (reporting progress) and cached. */
async function loadModel() {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(MODEL_URL).catch(() => null);
    if (cached) {
        return new Uint8Array(await cached.arrayBuffer());
    }
    const response = await fetch(MODEL_URL);
    if (!response.ok || !response.body) {
        throw new Error(`Model download failed (HTTP ${response.status})`);
    }
    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    let lastReport = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        chunks.push(value);
        received += value.length;
        if (Date.now() - lastReport > 250) {
            lastReport = Date.now();
            post('progress', { received, total });
        }
    }
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    // keep it for next time; if the browser refuses (storage full or restricted), still use it now
    try {
        await cache.put(MODEL_URL, new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }));
    } catch (error) {
        console.warn('[Yodayo Tavern Theme] could not cache the background removal model', error);
    }
    return bytes;
}

async function getSession() {
    sessionPromise ??= (async () => {
        const ort = await import(`${ORT_BASE}ort.webgpu.min.mjs`);
        ort.env.wasm.wasmPaths = ORT_BASE;
        const model = await loadModel();
        post('status', { message: 'loading' });
        const providers = 'gpu' in navigator ? ['webgpu', 'wasm'] : ['wasm'];
        try {
            return { ort, session: await ort.InferenceSession.create(model, { executionProviders: providers }) };
        } catch (error) {
            if (providers[0] !== 'webgpu') {
                throw error;
            }
            console.warn('[Yodayo Tavern Theme] WebGPU unavailable for background removal, using the CPU', error);
            return { ort, session: await ort.InferenceSession.create(model, { executionProviders: ['wasm'] }) };
        }
    })();
    try {
        return await sessionPromise;
    } catch (error) {
        sessionPromise = null;
        throw error;
    }
}

/** RGB image → normalized 1×3×1024×1024 tensor data */
function preprocess(bitmap) {
    const canvas = new OffscreenCanvas(SIZE, SIZE);
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, SIZE, SIZE);
    const { data } = context.getImageData(0, 0, SIZE, SIZE);
    const plane = SIZE * SIZE;
    const input = new Float32Array(3 * plane);
    for (let i = 0; i < plane; i++) {
        for (let c = 0; c < 3; c++) {
            input[c * plane + i] = (data[i * 4 + c] / 255 - MEAN[c]) / STD[c];
        }
    }
    return input;
}

self.addEventListener('message', async (event) => {
    const { id, bitmap } = event.data;
    try {
        const { ort, session } = await getSession();
        post('status', { id, message: 'running' });
        const input = new ort.Tensor('float32', preprocess(bitmap), [1, 3, SIZE, SIZE]);
        const output = await session.run({ [session.inputNames[0]]: input });
        const mask = output[session.outputNames[0]].data;
        // the mask as an image whose alpha is the foreground probability
        const alpha = new Uint8ClampedArray(SIZE * SIZE * 4);
        for (let i = 0; i < SIZE * SIZE; i++) {
            alpha[i * 4 + 3] = Math.round(Math.min(Math.max(mask[i], 0), 1) * 255);
        }
        const maskBitmap = await createImageBitmap(new ImageData(alpha, SIZE, SIZE));
        self.postMessage({ type: 'done', id, mask: maskBitmap }, [maskBitmap]);
    } catch (error) {
        post('error', { id, message: String(error?.message ?? error) });
    } finally {
        bitmap.close?.();
    }
});
