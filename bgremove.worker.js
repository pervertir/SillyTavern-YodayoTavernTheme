// Background removal worker: runs BiRefNet (lite) through transformers.js, on the GPU
// (WebGPU) when the browser has it and on the CPU otherwise. transformers.js keeps the
// downloaded model in the browser's Cache Storage, so it's fetched once.

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1';
const MODEL_ID = 'onnx-community/BiRefNet_lite-ONNX';

let modelPromise = null;

function post(type, data = {}) {
    self.postMessage({ type, ...data });
}

async function getModel(forceDevice) {
    modelPromise ??= (async () => {
        const { AutoModel, AutoProcessor, RawImage, env } = await import(TRANSFORMERS_URL);
        env.allowLocalModels = false;
        const files = new Map();
        const progress_callback = (event) => {
            if (event.status === 'progress' && event.total) {
                files.set(event.file, event);
                let received = 0;
                let total = 0;
                for (const file of files.values()) {
                    received += file.loaded;
                    total += file.total;
                }
                post('progress', { received, total });
            }
        };
        const device = forceDevice ?? ('gpu' in navigator ? 'webgpu' : 'wasm');
        let model;
        try {
            model = await AutoModel.from_pretrained(MODEL_ID, { device, dtype: 'fp32', progress_callback });
        } catch (error) {
            if (device !== 'webgpu') {
                throw error;
            }
            console.warn('[Yodayo Tavern Theme] WebGPU unavailable for background removal, using the CPU', error);
            model = await AutoModel.from_pretrained(MODEL_ID, { device: 'wasm', dtype: 'fp32', progress_callback });
        }
        const processor = await AutoProcessor.from_pretrained(MODEL_ID);
        post('status', { message: 'loaded' });
        return { model, processor, RawImage, device };
    })();
    try {
        return await modelPromise;
    } catch (error) {
        modelPromise = null;
        throw error;
    }
}

self.addEventListener('message', async (event) => {
    const { id, bitmap, provider } = event.data;
    try {
        const { model, processor, RawImage, device } = await getModel(provider);
        post('status', { id, message: 'running' });
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        const image = await RawImage.fromBlob(await canvas.convertToBlob({ type: 'image/png' }));
        const { pixel_values } = await processor(image);
        const { output_image } = await model({ input_image: pixel_values });
        const probabilities = output_image[0].sigmoid();
        const [, height, width] = probabilities.dims;
        const values = probabilities.data;
        let sum = 0;
        const alpha = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < width * height; i++) {
            sum += values[i];
            alpha[i * 4 + 3] = Math.round(values[i] * 255);
        }
        post('debug', { stats: { provider: device, dims: probabilities.dims, mean: sum / (width * height) } });
        const mask = await createImageBitmap(new ImageData(alpha, width, height));
        self.postMessage({ type: 'done', id, mask }, [mask]);
    } catch (error) {
        post('error', { id, message: String(error?.message ?? error) });
    } finally {
        bitmap.close?.();
    }
});
