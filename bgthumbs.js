// Sharp background thumbnails. SillyTavern's background thumbnails are small (160 × 90 by
// default), and the Backgrounds menu shows them bigger than that on most screens, so they
// look pixelated. A thumbnail shown more than a little over its own size is redrawn from the
// full background at its exact on-screen pixel size. SillyTavern only loads the thumbnails
// that scroll into view, and this follows it, so the full images load only for those.

import { loadImage, prescale } from './avatars.js';
import { isThemeOn } from './util.js';

const TILES = '#Backgrounds .bg_example .thumbnail-clipper';
/** Shown at up to this much over its own size, a thumbnail still looks sharp enough */
const MAX_UPSCALE = 1.15;

/** `${file}|${width}x${height}` → Promise of an object URL */
const cache = new Map();
/** Thumbnail URL → Promise of its natural size */
const sizes = new Map();

/** The URL in a CSS background-image (file names may contain parentheses), or null */
function cssUrl(backgroundImage) {
    return backgroundImage.match(/^url\("?(.*?)"?\)$/)?.[1] ?? null;
}

/** The background file behind a SillyTavern bg thumbnail URL in a CSS background-image, or null */
function thumbnailFile(backgroundImage) {
    const query = cssUrl(backgroundImage)?.match(/thumbnail\?(.*)$/)?.[1];
    if (!query) {
        return null;
    }
    const params = new URLSearchParams(query);
    return params.get('type') === 'bg' ? params.get('file') : null;
}

function naturalSize(url) {
    if (!sizes.has(url)) {
        sizes.set(url, loadImage(url).then(image => [image.naturalWidth, image.naturalHeight], () => null));
    }
    return sizes.get(url);
}

/** @param {HTMLElement} tile */
async function sharpen(tile) {
    // our own image is on the tile: SillyTavern's thumbnail is kept in the dataset
    const thumbnail = tile.dataset.ytThumb ?? tile.style.backgroundImage;
    const file = thumbnailFile(thumbnail);
    if (!file || !isThemeOn()) {
        return;
    }
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(tile.clientWidth * ratio);
    const height = Math.round(tile.clientHeight * ratio);
    if (!width || !height) {
        return;
    }
    const url = cssUrl(thumbnail);
    const size = url ? await naturalSize(url) : null;
    if (!size || Math.max(width / size[0], height / size[1]) <= MAX_UPSCALE) {
        return;
    }
    const key = `${file}|${width}x${height}`;
    if (tile.dataset.ytSharp === key) {
        return;
    }
    if (!cache.has(key)) {
        const position = getComputedStyle(tile).backgroundPosition;
        cache.set(key, prescale(`backgrounds/${encodeURIComponent(file)}`, width, height, position).catch(() => null));
    }
    const sharp = await cache.get(key);
    // the tile may have been reused for another background meanwhile
    if (sharp && (tile.dataset.ytThumb ?? tile.style.backgroundImage) === thumbnail && isThemeOn()) {
        tile.dataset.ytThumb = thumbnail;
        tile.dataset.ytSharp = key;
        tile.style.backgroundImage = `url("${sharp}")`;
    }
}

/** Puts SillyTavern's own thumbnails back, e.g. when the theme turns off. */
export function restoreBackgroundThumbnails() {
    for (const tile of document.querySelectorAll(TILES)) {
        if (tile instanceof HTMLElement && tile.dataset.ytThumb) {
            tile.style.backgroundImage = tile.dataset.ytThumb;
            delete tile.dataset.ytThumb;
            delete tile.dataset.ytSharp;
        }
    }
}

export function sharpenBackgroundThumbnails() {
    for (const tile of document.querySelectorAll(TILES)) {
        if (tile instanceof HTMLElement) {
            sharpen(tile);
        }
    }
}

export function initBackgroundThumbnails() {
    const menu = document.getElementById('Backgrounds');
    if (!menu) {
        return;
    }
    let frame = 0;
    const later = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(sharpenBackgroundThumbnails);
    };
    // SillyTavern sets each thumbnail as it scrolls into view, and rebuilds the lists
    new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const tile = mutation.target;
            if (tile instanceof HTMLElement && tile.matches(TILES) && !tile.style.backgroundImage.includes('blob:')) {
                // SillyTavern put a thumbnail on it again
                delete tile.dataset.ytThumb;
                delete tile.dataset.ytSharp;
                sharpen(tile);
            } else if (mutation.type === 'childList') {
                later();
            }
        }
    }).observe(menu, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
    // opening the menu, resizing it and the zoom buttons (more or fewer columns) change the tiles' size
    const resized = new ResizeObserver(later);
    for (const element of [menu, ...menu.querySelectorAll('#bg_menu_content, #bg_custom_content')]) {
        resized.observe(element);
    }
    window.addEventListener('resize', later);
}
