// The character art beside the chat can be dragged to another spot. Where each character was
// put is remembered per chat, as a share of the art area so it holds when the window resizes.
// Double-click a character to put it back.

import { debounce, trackPointer } from './util.js';

const ART_ID = 'yt-character-art';

let getSettings = () => ({});
let saveSettings = () => {};

/** The element that moves for a dragged image: its lineup slot in a group, else the image itself. */
function movable(img) {
    return img.closest('.yt-art-member') ?? img;
}

function avatarOf(node) {
    if (node.dataset.avatar) {
        return node.dataset.avatar;
    }
    const { characters, characterId } = SillyTavern.getContext();
    return characters[characterId]?.avatar ?? null;
}

function chatOffsets(create = false) {
    const chatId = SillyTavern.getContext().getCurrentChatId?.();
    if (!chatId) {
        return null;
    }
    const settings = getSettings();
    if (create) {
        settings.artOffsets ??= {};
        settings.artOffsets[chatId] ??= {};
    }
    return settings.artOffsets?.[chatId] ?? null;
}

function setTranslate(node, art, [dx, dy]) {
    node.style.translate = dx || dy ? `${Math.round(dx * art.clientWidth)}px ${Math.round(dy * art.clientHeight)}px` : '';
}

/** Moves every character in the art area to where it was left in this chat. */
export function applyArtOffsets() {
    const art = document.getElementById(ART_ID);
    if (!art) {
        return;
    }
    const offsets = chatOffsets() ?? {};
    for (const img of art.querySelectorAll('img')) {
        const node = movable(img);
        setTranslate(node, art, offsets[avatarOf(node)] ?? [0, 0]);
    }
}

export function initArtDrag(options) {
    ({ getSettings, saveSettings } = options);
    window.addEventListener('resize', debounce(applyArtOffsets, 100));

    document.addEventListener('pointerdown', (event) => {
        const img = event.target instanceof HTMLImageElement ? event.target : null;
        const art = img?.closest(`#${ART_ID}`);
        if (!img || !art || event.button !== 0) {
            return;
        }
        const node = movable(img);
        const avatar = avatarOf(node);
        if (!avatar) {
            return;
        }
        event.preventDefault();
        const [startX, startY] = chatOffsets()?.[avatar] ?? [0, 0];
        let offset = [startX, startY];
        node.classList.add('yt-art-dragging');
        trackPointer(img, event, (move) => {
            offset = [
                startX + (move.clientX - event.clientX) / art.clientWidth,
                startY + (move.clientY - event.clientY) / art.clientHeight,
            ];
            setTranslate(node, art, offset);
        }, () => {
            node.classList.remove('yt-art-dragging');
            const offsets = chatOffsets(true);
            if (offsets) {
                offsets[avatar] = offset.map(value => Math.round(value * 1000) / 1000);
                saveSettings();
            }
        });
    });

    document.addEventListener('dblclick', (event) => {
        const img = event.target instanceof HTMLImageElement ? event.target : null;
        if (!img?.closest(`#${ART_ID}`)) {
            return;
        }
        const node = movable(img);
        const offsets = chatOffsets();
        if (offsets) {
            delete offsets[avatarOf(node)];
            saveSettings();
        }
        applyArtOffsets();
    });
}
