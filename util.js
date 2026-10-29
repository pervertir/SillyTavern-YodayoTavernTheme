// Small helpers shared by the theme's modules.

export const MODULE_NAME = 'yodayoTavernTheme';
export const BODY_CLASS = 'yodayo-tavern';
/** Title for toasts and prefix for console messages */
export const TITLE = 'Yodayo Tavern Theme';
export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isThemeOn() {
    return document.body.classList.contains(BODY_CLASS);
}

/** Creates an element; text goes in as textContent, so names from cards are never parsed as HTML. */
export function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

export function debounce(fn, ms = 400) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

/** Click, Enter and Space all run `handler`, for elements that act as buttons but can't be one. */
export function onActivate(node, handler) {
    node.addEventListener('click', handler);
    node.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            handler(event);
        }
    });
}

export function hexToRgb(hex) {
    const value = parseInt(String(hex).replace('#', ''), 16) || 0;
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** `url("x")` → `x`; anything else is returned as is. */
export function unwrapCssUrl(value) {
    return value.match(/^url\((['"]?)(.*)\1\)$/)?.[2] ?? value;
}

/** @returns {Promise<string>} The blob as a data: URL */
export function readAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export function downloadJson(data, fileName) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = el('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Avatar file of the character in the open solo chat, or null. */
export function getCurrentAvatar() {
    const { characters, characterId, groupId } = SillyTavern.getContext();
    if (groupId || characterId === undefined) {
        return null;
    }
    const avatar = characters[characterId]?.avatar;
    return avatar && avatar !== 'none' ? avatar : null;
}

/** URL of the open solo chat character's full card image, or '' */
export function getCurrentAvatarUrl() {
    const avatar = getCurrentAvatar();
    return avatar ? `characters/${encodeURIComponent(avatar)}` : '';
}

/**
 * Follows the pointer from a pointerdown until it's released. `onMove` gets each pointermove,
 * `onEnd` runs once on release or cancel.
 */
export function trackPointer(target, downEvent, onMove, onEnd = () => {}) {
    target.setPointerCapture(downEvent.pointerId);
    const end = () => {
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', end);
        target.removeEventListener('pointercancel', end);
        onEnd();
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
}

/** Lets a floating window be dragged by its title bar, kept inside the viewport. */
export function makeDraggable(win, bar, ignore) {
    bar.addEventListener('pointerdown', (event) => {
        if (ignore && event.target === ignore) {
            return;
        }
        event.preventDefault();
        const start = win.getBoundingClientRect();
        const dx = event.clientX - start.left;
        const dy = event.clientY - start.top;
        trackPointer(bar, event, (move) => {
            win.style.left = `${Math.min(Math.max(move.clientX - dx, 0), window.innerWidth - win.offsetWidth)}px`;
            win.style.top = `${Math.min(Math.max(move.clientY - dy, 0), window.innerHeight - 48)}px`;
            win.style.right = 'auto';
        });
    });
}
