// Removes the background from character images shown beside the chat. The model runs on
// this machine in the Background Removal server plugin (a separate, optional install:
// github.com/pervertir/SillyTavern-BackgroundRemoval); each cutout is saved to
// SillyTavern's user images and remembered in the settings, so every image is only
// processed once.

import { uploadImage } from './charsettings.js';
import { readAsDataUrl, TITLE } from './util.js';

const PLUGIN_URL = '/api/plugins/background-removal';
const PLUGIN_REPO = 'https://github.com/pervertir/SillyTavern-BackgroundRemoval';

/** source image URL → Promise of the cutout's path (in flight) */
const jobs = new Map();
/** source image URLs that failed this session, so they aren't retried in a loop */
const failed = new Set();

let getSettings = () => ({});
let saveSettings = () => {};

class PluginMissingError extends Error {}

/** Saved cutouts are { path, version }; the first version stored the path alone. */
function cutoutPath(entry) {
    return typeof entry === 'string' ? entry : entry?.path ?? null;
}

let installHelpShown = false;

/** How to install the server plugin, once per session. */
function showInstallHelp() {
    if (installHelpShown) {
        return;
    }
    installHelpShown = true;
    const { callGenericPopup, POPUP_TYPE } = SillyTavern.getContext();
    const html = `
        <h3>Remove background needs a server plugin</h3>
        <div class="justifyLeft">
            <p>SillyTavern extensions can't run code on your machine, so background removal runs in
            the <a href="${PLUGIN_REPO}" target="_blank" rel="noopener">Background Removal</a> server plugin.</p>
            <ol>
                <li>Set <code>enableServerPlugins: true</code> in SillyTavern's <code>config.yaml</code>.</li>
                <li>In SillyTavern's <code>plugins</code> folder run<br>
                    <code>git clone ${PLUGIN_REPO}</code><br>
                    then <code>npm install</code> inside the new folder.</li>
                <li>Restart SillyTavern and reload this page.</li>
            </ol>
        </div>`;
    callGenericPopup(html, POPUP_TYPE.TEXT, '', { allowVerticalScrolling: true });
}

/** Shows the plugin's model download progress while a cutout is being made. */
function watchProgress() {
    let toast = null;
    const timer = setInterval(async () => {
        try {
            const status = await fetch(`${PLUGIN_URL}/status`, { cache: 'no-store' }).then(r => r.json());
            if (status.status !== 'downloading') {
                return;
            }
            const percent = status.total ? Math.round(status.received / status.total * 100) : null;
            const text = `Downloading the background removal model (one time only)${percent === null ? '' : `: ${percent}%`}`;
            if (toast) {
                toast.find('.toast-message').text(text);
            } else {
                toast = toastr.info(text, TITLE, { timeOut: 0, extendedTimeOut: 0, tapToDismiss: false });
            }
        } catch {
            // the status is only for show
        }
    }, 1000);
    return () => {
        clearInterval(timer);
        if (toast) {
            toastr.clear(toast);
        }
    };
}

/** Sends one image to the server plugin and returns the cutout as a PNG blob at full size. */
async function cutOut(src) {
    const source = await fetch(src);
    if (!source.ok) {
        throw new Error(`Could not load ${src}`);
    }
    const image = (await readAsDataUrl(await source.blob())).replace(/^data:[^,]+,/, '');
    const stopProgress = watchProgress();
    try {
        const response = await fetch(`${PLUGIN_URL}/remove`, {
            method: 'POST',
            headers: SillyTavern.getContext().getRequestHeaders(),
            body: JSON.stringify({ image }),
        });
        if (response.status === 404) {
            throw new PluginMissingError('The Background Removal server plugin is not installed');
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.image) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        return fetch(`data:image/png;base64,${data.image}`).then(r => r.blob());
    } finally {
        stopProgress();
    }
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

/**
 * The cutout for an image if it's ready. Otherwise starts making it (once) and calls
 * `onReady` when it's saved, and returns null meanwhile.
 * @param {string} src Image URL as shown on the page
 * @param {() => void} onReady Called after a new cutout is saved
 * @returns {string|null}
 */
export function getCutout(src, onReady) {
    const settings = getSettings();
    const done = cutoutPath(settings.cutouts?.[src]);
    if (done) {
        return done;
    }
    if (!jobs.has(src) && !failed.has(src)) {
        const job = Promise.all([cutOut(src), getVersion(src)])
            .then(async ([blob, version]) => {
                const path = await uploadImage(new File([blob], 'cutout.png', { type: 'image/png' }), 'yodayo-cutout');
                const current = getSettings();
                current.cutouts ??= {};
                current.cutouts[src] = { path, version };
                saveSettings();
                onReady();
                return path;
            })
            .catch((error) => {
                failed.add(src);
                console.error(`[${TITLE}] background removal failed`, error);
                if (error instanceof PluginMissingError) {
                    showInstallHelp();
                } else {
                    toastr.warning('Could not remove the background from the character image; showing it as is.', TITLE);
                }
            })
            .finally(() => jobs.delete(src));
        jobs.set(src, job);
    }
    return null;
}

/** The finished cutout for an image, without starting one. */
export function getCachedCutout(src) {
    return cutoutPath(getSettings().cutouts?.[src]);
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
