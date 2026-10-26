// Sharper chat and character management avatars. SillyTavern shows each message's avatar from a large thumbnail
// (864×1280 by default) squeezed into a ~50px circle, and the browser's downsampling at
// that ratio looks soft. This pre-scales each avatar to its exact on-screen size in steps
// with high-quality smoothing, and shows the result through CSS `content`, so the img's
// src (which SillyTavern reads, e.g. to zoom the avatar on click) never changes.

/** `${src}|${width}x${height}|${position}` → Promise of an object URL */
const cache = new Map();

let isEnabled = () => true;

function loadImage(src) {
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

async function render(src, width, height, position) {
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
    // only worth it when the picture is shrunk a lot
    if (!width || !height || img.naturalWidth < width * 2) {
        img.style.removeProperty('content');
        return;
    }
    const position = getComputedStyle(img).objectPosition;
    const key = `${src}|${width}x${height}|${position}`;
    if (img.dataset.ytSharp === key) {
        return;
    }
    if (!cache.has(key)) {
        cache.set(key, render(src, width, height, position).catch(() => null));
    }
    const url = await cache.get(key);
    // the message may have been re-rendered with another avatar meanwhile
    if (url && img.getAttribute('src') === src && isEnabled()) {
        img.style.setProperty('content', `url("${url}")`);
        img.dataset.ytSharp = key;
    }
}

/** Character management avatars: the character and group lists and the open character's picture */
const PANEL_AVATARS = '#right-nav-panel .avatar img, #avatar_load_preview';

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
    const panel = document.getElementById('right-nav-panel');
    if (!panel) {
        return;
    }
    panel.addEventListener('load', (event) => {
        if (event.target instanceof HTMLImageElement && event.target.matches(PANEL_AVATARS)) {
            sharpenOrWait(event.target);
        }
    }, true);
    let frame = 0;
    const observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(sharpenPanelAvatars);
    });
    // the lists themselves too: they lay out only once the menu has opened
    for (const element of [panel, ...panel.querySelectorAll('#rm_print_characters_block, #rm_group_members, #rm_group_add_members, #avatar_div')]) {
        observer.observe(element);
    }
}

/** Sharpens the avatars of the given messages, or of the whole chat. */
export function sharpenAvatars(messageId) {
    const scope = messageId === undefined ? '#chat .mes' : `#chat .mes[mesid="${messageId}"]`;
    for (const img of document.querySelectorAll(`${scope} .avatar img`)) {
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
    window.addEventListener('resize', all);
    initPanelAvatars();
    all();
}
