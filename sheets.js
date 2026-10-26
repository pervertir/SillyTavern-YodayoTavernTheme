// Drag handles that resize the rail's drawer sheets. Each sheet has a default width in
// css/nav.css; a drag stores that sheet's own width in settings.sheetWidths.

const MIN_WIDTH = 360;
/** Room always left for the chat beside an open sheet (matches --yt-sheet-room) */
const MIN_CHAT_ROOM = 120;
const HANDLE_HALF = 5;

function getOpenSheet(side) {
    const selector = side === 'right'
        ? '#right-nav-panel.openDrawer'
        : '#top-settings-holder .drawer-content.openDrawer:not(.fillRight)';
    const sheet = document.querySelector(selector);
    return sheet instanceof HTMLElement && sheet.id ? sheet : null;
}

function setSheetWidth(sheet, width) {
    if (Number.isFinite(width)) {
        sheet.style.setProperty('--yt-sheet-user', `${width}px`);
    } else {
        sheet.style.removeProperty('--yt-sheet-user');
    }
}

/** Writes each sheet's saved width onto the sheet. */
export function applySheetWidths(settings) {
    const widths = settings.sheetWidths ?? {};
    for (const sheet of document.querySelectorAll('#top-settings-holder .drawer-content')) {
        if (sheet instanceof HTMLElement && sheet.id) {
            setSheetWidth(sheet, widths[sheet.id]);
        }
    }
}

/**
 * @param {object} options
 * @param {() => object} options.getSettings Returns the extension settings
 * @param {() => void} options.saveSettings Saves them
 */
export function initSheetResizers({ getSettings, saveSettings }) {
    const handles = {};

    const position = () => {
        for (const side of ['left', 'right']) {
            const handle = handles[side];
            const sheet = getOpenSheet(side);
            const usable = sheet && document.body.classList.contains('yt-nav-rail') && window.innerWidth > 1000;
            handle.hidden = !usable;
            if (usable) {
                const rect = sheet.getBoundingClientRect();
                handle.style.left = `${(side === 'left' ? rect.right : rect.left) - HANDLE_HALF}px`;
            }
        }
    };

    for (const side of ['left', 'right']) {
        const handle = document.createElement('div');
        handle.className = `yt-sheet-handle yt-sheet-handle-${side}`;
        handle.title = 'Drag to resize, double-click to reset';
        handle.hidden = true;
        handle.setAttribute('role', 'separator');
        handle.setAttribute('aria-orientation', 'vertical');
        handles[side] = handle;

        handle.addEventListener('pointerdown', (event) => {
            const sheet = getOpenSheet(side);
            if (!sheet) {
                return;
            }
            event.preventDefault();
            handle.setPointerCapture(event.pointerId);
            document.body.classList.add('yt-sheet-resizing');
            const rect = sheet.getBoundingClientRect();

            const onMove = (moveEvent) => {
                const raw = side === 'left' ? moveEvent.clientX - rect.left : rect.right - moveEvent.clientX;
                const room = side === 'left' ? rect.left : window.innerWidth - rect.right;
                const max = Math.max(MIN_WIDTH, window.innerWidth - room - MIN_CHAT_ROOM);
                const width = Math.round(Math.min(Math.max(raw, MIN_WIDTH), max));
                const settings = getSettings();
                settings.sheetWidths = { ...settings.sheetWidths, [sheet.id]: width };
                setSheetWidth(sheet, width);
                position();
            };
            const onUp = () => {
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                handle.removeEventListener('pointercancel', onUp);
                document.body.classList.remove('yt-sheet-resizing');
                saveSettings();
            };
            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
            handle.addEventListener('pointercancel', onUp);
        });

        // double-click puts the sheet back to its default width
        handle.addEventListener('dblclick', () => {
            const sheet = getOpenSheet(side);
            if (!sheet) {
                return;
            }
            const settings = getSettings();
            const { [sheet.id]: _removed, ...rest } = settings.sheetWidths ?? {};
            settings.sheetWidths = rest;
            setSheetWidth(sheet, undefined);
            saveSettings();
            requestAnimationFrame(position);
        });

        document.body.append(handle);
    }

    // follow sheets as they open, close, animate and resize
    const sheets = [...document.querySelectorAll('#top-settings-holder .drawer-content')];
    const resizeObserver = new ResizeObserver(position);
    const classObserver = new MutationObserver(position);
    for (const sheet of sheets) {
        resizeObserver.observe(sheet);
        classObserver.observe(sheet, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('resize', position);
    position();
}
