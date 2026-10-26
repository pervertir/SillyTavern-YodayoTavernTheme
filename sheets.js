// Drag handle that resizes the rail's drawer sheets. Each sheet has a default width in
// css/nav.css; a drag stores that sheet's own width in settings.sheetWidths.

const MIN_WIDTH = 360;
/** Room always left for the chat beside an open sheet (matches --yt-sheet-room) */
const MIN_CHAT_ROOM = 120;
const HANDLE_HALF = 5;

function getOpenSheet() {
    const sheet = document.querySelector('#top-settings-holder .drawer-content.openDrawer');
    return sheet instanceof HTMLElement && sheet.id ? sheet : null;
}

function setSheetWidth(sheet, width) {
    if (Number.isFinite(width)) {
        sheet.style.setProperty('--yt-sheet-user', `${width}px`);
    } else {
        sheet.style.removeProperty('--yt-sheet-user');
    }
}

/** A close button in each sheet's top-right corner; it clicks the sheet's own rail icon. */
function addCloseButtons() {
    for (const sheet of document.querySelectorAll('#top-settings-holder .drawer-content')) {
        if (sheet.querySelector(':scope > .yt-sheet-close')) {
            continue;
        }
        const toggle = sheet.closest('.drawer')?.querySelector('.drawer-toggle');
        if (!toggle) {
            continue;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'yt-sheet-close fa-solid fa-xmark';
        button.title = 'Close';
        button.setAttribute('aria-label', 'Close');
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        sheet.prepend(button);
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
    const handle = document.createElement('div');
    handle.className = 'yt-sheet-handle';
    handle.title = 'Drag to resize, double-click to reset';
    handle.hidden = true;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');

    // the handle sits on the open sheet's right edge
    const position = () => {
        const sheet = getOpenSheet();
        const usable = sheet && document.body.classList.contains('yt-nav-rail') && window.innerWidth > 1000;
        handle.hidden = !usable;
        if (usable) {
            handle.style.left = `${sheet.getBoundingClientRect().right - HANDLE_HALF}px`;
        }
    };

    handle.addEventListener('pointerdown', (event) => {
        const sheet = getOpenSheet();
        if (!sheet) {
            return;
        }
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        document.body.classList.add('yt-sheet-resizing');
        const left = sheet.getBoundingClientRect().left;

        const onMove = (moveEvent) => {
            const max = Math.max(MIN_WIDTH, window.innerWidth - left - MIN_CHAT_ROOM);
            const width = Math.round(Math.min(Math.max(moveEvent.clientX - left, MIN_WIDTH), max));
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
        const sheet = getOpenSheet();
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
    addCloseButtons();

    // follow sheets as they open, close, animate and resize
    const resizeObserver = new ResizeObserver(position);
    const classObserver = new MutationObserver(position);
    for (const sheet of document.querySelectorAll('#top-settings-holder .drawer-content')) {
        resizeObserver.observe(sheet);
        classObserver.observe(sheet, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('resize', position);
    position();
}
