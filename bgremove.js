// Removes the background from character images shown beside the chat. The model runs in
// a worker (bgremove.worker.js); each cutout is saved to SillyTavern's user images and
// remembered in the settings, so every image is only processed once.

import { uploadImage } from './charsettings.js';

/** source image URL → Promise of the cutout's path (in flight) */
const jobs = new Map();
/** source image URLs that failed this session, so they aren't retried in a loop */
const failed = new Set();

let worker = null;
let nextId = 1;
const pending = new Map();
let progressToast = null;

let getSettings = () => ({});
let saveSettings = () => {};

function getWorker() {
    if (worker) {
        return worker;
    }
    worker = new Worker(new URL('./bgremove.worker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event) => {
        const { type, id } = event.data;
        if (type === 'progress') {
            const { received, total } = event.data;
            const percent = total ? Math.round(received / total * 100) : null;
            const text = `Downloading the background removal model (one time only)${percent === null ? '' : `: ${percent}%`}`;
            if (progressToast) {
                progressToast.find('.toast-message').text(text);
            } else {
                progressToast = toastr.info(text, 'Yodayo Tavern Theme', { timeOut: 0, extendedTimeOut: 0, tapToDismiss: false });
            }
            return;
        }
        if (type === 'debug') {
            console.debug('[Yodayo Tavern Theme] background removal mask', event.data.stats);
            window.yodayoTavernLastMask = event.data.stats;
            return;
        }
        if (progressToast) {
            toastr.clear(progressToast);
            progressToast = null;
        }
        if (type === 'status') {
            return;
        }
        if (progressToast) {
            toastr.clear(progressToast);
            progressToast = null;
        }
        const job = pending.get(id);
        if (!job) {
            return;
        }
        pending.delete(id);
        if (type === 'done') {
            job.resolve(event.data.mask);
        } else {
            job.reject(new Error(event.data.message));
        }
    });
    return worker;
}

/** A version stamp for an image file, so a replaced avatar (same name) gets a new cutout. */
async function getVersion(src) {
    try {
        const response = await fetch(src, { method: 'HEAD', cache: 'no-store' });
        return response.headers.get('last-modified') || response.headers.get('etag') || '';
    } catch {
        return '';
    }
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Could not load ${src}`));
        image.src = src;
    });
}

/** Runs the model on one image and returns the cutout as a PNG blob at full size. */
async function cutOut(src) {
    const image = await loadImage(src);
    const bitmap = await createImageBitmap(image);
    const id = nextId++;
    const mask = await new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        // diagnostics: localStorage "yodayoTavernBgProvider" = "wasm" or "webgpu" forces a backend
        let provider;
        try {
            provider = localStorage.getItem('yodayoTavernBgProvider') || undefined;
        } catch {
            provider = undefined;
        }
        getWorker().postMessage({ id, bitmap, provider }, [bitmap]);
    });
    const canvas = new OffscreenCanvas(image.naturalWidth, image.naturalHeight);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = 'destination-in';
    context.imageSmoothingQuality = 'high';
    context.drawImage(mask, 0, 0, canvas.width, canvas.height);
    mask.close?.();
    return canvas.convertToBlob({ type: 'image/png' });
}

/**
 * The cutout for an image if it's ready. Otherwise starts making it (once) and calls
 * `onReady` when it's saved, and returns null meanwhile.
 * @param {string} src Image URL as shown on the page
 * @param {() => void} onReady Called after a new cutout is saved
 * @returns {string|null}
 */
export function getCutout(src, onReady) {
    const settings = getSettings();
    const done = settings.cutouts?.[src];
    if (done) {
        return typeof done === 'string' ? done : done.path;
    }
    if (!jobs.has(src) && !failed.has(src)) {
        const job = Promise.all([cutOut(src), getVersion(src)])
            .then(async ([blob, version]) => ({ version, path: await uploadImage(new File([blob], 'cutout.png', { type: 'image/png' }), 'yodayo-cutout') }))
            .then(({ path, version }) => {
                const current = getSettings();
                current.cutouts ??= {};
                current.cutouts[src] = { path, version };
                saveSettings();
                onReady();
                return path;
            })
            .catch((error) => {
                failed.add(src);
                console.error('[Yodayo Tavern Theme] background removal failed', error);
                window.yodayoTavernLastBgError = String(error?.message ?? error);
                toastr.warning('Could not remove the background from the character image; showing it as is.', 'Yodayo Tavern Theme');
            })
            .finally(() => jobs.delete(src));
        jobs.set(src, job);
    }
    return null;
}

/** The finished cutout for an image, without starting one. */
export function getCachedCutout(src) {
    const done = getSettings().cutouts?.[src];
    return done ? (typeof done === 'string' ? done : done.path) : null;
}

/** Whether a cutout is being made for an image right now */
export function isCutoutPending(src) {
    return jobs.has(src);
}

/**
 * Drops an image's cutout if the image file changed since (a replaced avatar keeps its
 * file name), so the next look at it makes a new one.
 * @returns {Promise<boolean>} Whether the cutout was dropped
 */
export async function revalidateCutout(src) {
    const settings = getSettings();
    const done = settings.cutouts?.[src];
    if (!done) {
        return false;
    }
    const version = await getVersion(src);
    if (version && typeof done === 'object' && done.version === version) {
        return false;
    }
    delete settings.cutouts[src];
    failed.delete(src);
    saveSettings();
    return true;
}

/**
 * @param {object} options
 * @param {() => object} options.getSettings
 * @param {() => void} options.saveSettings
 */
export function initBackgroundRemoval(options) {
    getSettings = options.getSettings;
    saveSettings = options.saveSettings;
}
