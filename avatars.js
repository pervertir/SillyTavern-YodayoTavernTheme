// Crisp avatars at any size. A picture shrunk a lot (a large card in a ~50px circle) looks
// soft with the browser's downsampling, and a small thumbnail shown bigger than it is (recent
// chats, a large avatar size, a retina screen) looks blurry. Each avatar is pre-scaled to its
// exact on-screen pixel size in steps with high-quality smoothing, from the full card image
// when the thumbnail is too small, and shown through CSS `content`, so the img's src (which
// SillyTavern reads, e.g. to zoom the avatar on click) never changes.

/** `${src}|${width}x${height}|${position}` → Promise of an object URL, oldest first */
const cache = new Map();
/** Pre-scaled pictures kept around; older ones nothing shows any more are let go */
const CACHE_LIMIT = 300;

let isEnabled = () => true;

/** Pictures the theme sharpens: chat messages, recent chats, and the character and persona menus */
const CHAT_AVATARS = '#chat .mes .avatar img, #chat .recentChat .avatar img';
const PANEL_AVATARS = '#right-nav-panel .avatar img, #avatar_load_preview, #PersonaManagement .avatar img';
/** Shown at up to this much over its own size, a picture still looks sharp enough */
const MAX_UPSCALE = 1.15;

/** The full-size image behind a SillyTavern thumbnail URL, or null */
function fullSizeUrl(src) {
    const query = src.match(/(?:^|\/)thumbnail\?(.*)$/)?.[1];
    if (!query) {
        return null;
    }
    const params = new URLSearchParams(query);
    const file = params.get('file');
    const folder = { avatar: 'characters', persona: 'User Avatars' }[params.get('type') ?? ''];
    return file && folder ? `${folder}/${encodeURIComponent(file)}` : null;
}

export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

/** The part of the image `object-fit: cover` shows, as a source rectangle */
function coverCrop(image, width, height, position) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sw = width / scale;
    const sh = height / scale;
    const [px, py] = position.split(' ').map(value => value.endsWith('%') ? parseFloat(value) / 100 : 0.5);
    return [(image.naturalWidth - sw) * (Number.isFinite(px) ? px : 0.5), (image.naturalHeight - sh) * (Number.isFinite(py) ? py : 0), sw, sh];
}

/** `src` cropped like `object-fit: cover` and pre-scaled to exactly width × height device pixels, as an object URL. */
export async function prescale(src, width, height, position) {
    const image = await loadImage(src);
    let [sx, sy, sw, sh] = coverCrop(image, width, height, position);
    /** @type {CanvasImageSource} */
    let source = image;
    // halve until within 2× of the target, then one last high-quality pass
    while (sw / 2 >= width && sh / 2 >= height) {
        const step = new OffscreenCanvas(Math.round(sw / 2), Math.round(sh / 2));
        const context = step.getContext('2d');
        context.imageSmoothingQuality = 'high';
        context.drawImage(source, sx, sy, sw, sh, 0, 0, step.width, step.height);
        source = step;
        [sx, sy, sw, sh] = [0, 0, step.width, step.height];
    }
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return URL.createObjectURL(blob);
}

/** @param {HTMLImageElement} img */
async function sharpen(img) {
    const src = img.getAttribute('src');
    if (!src || !img.complete || !img.naturalWidth) {
        return;
    }
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(img.clientWidth * ratio);
    const height = Math.round(img.clientHeight * ratio);
    if (!width || !height) {
        return;
    }
    const upscale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const full = upscale > MAX_UPSCALE ? fullSizeUrl(src) : null;
    // worth it when the picture is shrunk a lot, or too small and a bigger one exists
    if (!full && img.naturalWidth < width * 2) {
        img.style.removeProperty('content');
        delete img.dataset.ytSharp;
        return;
    }
    const position = getComputedStyle(img).objectPosition;
    const key = `${src}|${width}x${height}|${position}`;
    if (img.dataset.ytSharp === key) {
        return;
    }
    if (!cache.has(key)) {
        cache.set(key, prescale(full ?? src, width, height, position).catch(() => null));
        trimCache();
    }
    const url = await cache.get(key);
    // the message may have been re-rendered with another avatar meanwhile
    if (url && img.getAttribute('src') === src && isEnabled()) {
        img.style.setProperty('content', `url("${url}")`);
        img.dataset.ytSharp = key;
    }
}

/** Lets go of the oldest pre-scaled pictures once there are too many, skipping any in use. */
function trimCache() {
    if (cache.size <= CACHE_LIMIT) {
        return;
    }
    for (const [key, pending] of cache) {
        if (cache.size <= CACHE_LIMIT * 0.8) {
            break;
        }
        if (document.querySelector(`img[data-yt-sharp="${CSS.escape(key)}"]`)) {
            continue;
        }
        cache.delete(key);
        pending.then(url => url && URL.revokeObjectURL(url));
    }
}

function sharpenOrWait(img) {
    if (!isEnabled()) {
        img.style.removeProperty('content');
        delete img.dataset.ytSharp;
        return;
    }
    if (img.complete) {
        sharpen(img);
    } else {
        img.addEventListener('load', () => sharpen(img), { once: true });
    }
}

function sharpenPanelAvatars() {
    for (const img of document.querySelectorAll(PANEL_AVATARS)) {
        sharpenOrWait(img);
    }
}

/**
 * The character management menu redraws its lists and resizes with its sheet, so its
 * avatars are sharpened as each loads (load events reach a capturing listener) and again
 * whenever the menu or its lists change size, which includes opening.
 */
function initPanelAvatars() {
    let frame = 0;
    const observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(sharpenPanelAvatars);
    });
    for (const panel of [document.getElementById('right-nav-panel'), document.getElementById('PersonaManagement')]) {
        if (!panel) {
            continue;
        }
        panel.addEventListener('load', (event) => {
            if (event.target instanceof HTMLImageElement && event.target.matches(PANEL_AVATARS)) {
                sharpenOrWait(event.target);
            }
        }, true);
        // the lists themselves too: they lay out only once the menu has opened
        for (const element of [panel, ...panel.querySelectorAll('#rm_print_characters_block, #rm_group_members, #rm_group_add_members, #avatar_div, #user_avatar_block')]) {
            observer.observe(element);
        }
    }
}

/** Sharpens the avatars of the given messages, or of the whole chat and the menus. */
export function sharpenAvatars(messageId) {
    const selector = messageId === undefined ? CHAT_AVATARS : `#chat .mes[mesid="${messageId}"] .avatar img`;
    for (const img of document.querySelectorAll(selector)) {
        sharpenOrWait(img);
    }
    if (messageId === undefined) {
        sharpenPanelAvatars();
    }
}

/** @param {() => boolean} enabled Whether the theme is on */
export function initSharpAvatars(enabled) {
    isEnabled = enabled;
    const { eventSource, eventTypes } = SillyTavern.getContext();
    const all = () => requestAnimationFrame(() => sharpenAvatars());
    eventSource.on(eventTypes.CHAT_CHANGED, all);
    eventSource.on(eventTypes.MORE_MESSAGES_LOADED, all);
    eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, (id) => sharpenAvatars(id));
    eventSource.on(eventTypes.USER_MESSAGE_RENDERED, (id) => sharpenAvatars(id));
    // only once the window has stopped resizing
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(all, 250);
    });
    // recent chats load their pictures whenever the home shows
    document.getElementById('chat')?.addEventListener('load', (event) => {
        if (event.target instanceof HTMLImageElement && event.target.matches('#chat .recentChat .avatar img')) {
            sharpenOrWait(event.target);
        }
    }, true);
    initPanelAvatars();
    all();
}
