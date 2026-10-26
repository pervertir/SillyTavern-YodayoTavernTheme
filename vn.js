// Visual novel mode: a drag handle on the chat's top edge trades chat height for
// character-image height. The split is saved as a share of the window height.

const MIN_SHARE = 0.15;
const MAX_SHARE = 0.85;
const GAP = 8;

function clampShare(share) {
    return Math.min(Math.max(share, MIN_SHARE), MAX_SHARE);
}

/** Writes the saved chat height to <body>. */
export function applyVnHeight(settings) {
    document.body.style.setProperty('--yt-vn-h', `${clampShare(settings.vnHeight) * 100}dvh`);
}

/**
 * @param {object} options
 * @param {() => object} options.getSettings Returns the extension settings
 * @param {() => void} options.saveSettings Saves them
 * @param {() => void} options.onModeChange Called when SillyTavern turns VN mode on or off
 */
export function initVnMode({ getSettings, saveSettings, onModeChange }) {
    const handle = document.createElement('div');
    handle.className = 'yt-vn-handle';
    handle.title = 'Drag to resize the chat';
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'horizontal');

    handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        document.body.classList.add('yt-vn-resizing');

        const onMove = (moveEvent) => {
            const share = clampShare((window.innerHeight - moveEvent.clientY - GAP) / window.innerHeight);
            getSettings().vnHeight = Math.round(share * 1000) / 1000;
            applyVnHeight(getSettings());
        };
        const onUp = () => {
            handle.removeEventListener('pointermove', onMove);
            handle.removeEventListener('pointerup', onUp);
            handle.removeEventListener('pointercancel', onUp);
            document.body.classList.remove('yt-vn-resizing');
            saveSettings();
        };
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
        handle.addEventListener('pointercancel', onUp);
    });

    document.body.append(handle);

    // SillyTavern toggles VN mode as a body class; react only when that class flips
    let vnOn = document.body.classList.contains('waifuMode');
    new MutationObserver(() => {
        const now = document.body.classList.contains('waifuMode');
        if (now !== vnOn) {
            vnOn = now;
            onModeChange();
        }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
