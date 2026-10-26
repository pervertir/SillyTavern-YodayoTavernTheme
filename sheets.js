// Drag handles that resize the rail's drawer sheets. The left sheets share one width and
// the character panel on the right has its own; both are saved in the extension settings.

const MIN_WIDTH = 360;
/** Room always left for the chat beside an open sheet */
const MIN_CHAT_ROOM = 120;
/** Left edge of the sheets: rail gap + rail width + rail gap (see --yt-sheet-left) */
const RAIL_EDGE = 68;
const RIGHT_EDGE = 8;

function clampWidth(width, start) {
    const max = Math.max(MIN_WIDTH, window.innerWidth - start - MIN_CHAT_ROOM);
    return Math.round(Math.min(Math.max(width, MIN_WIDTH), max));
}

/**
 * @param {object} options
 * @param {() => object} options.getSettings Returns the extension settings
 * @param {() => void} options.saveSettings Saves them
 */
export function initSheetResizers({ getSettings, saveSettings }) {
    const sides = [
        { side: 'left', key: 'sheetWidth', cssVar: '--yt-sheet-w-pref' },
        { side: 'right', key: 'rightSheetWidth', cssVar: '--yt-right-sheet-w-pref' },
    ];

    for (const { side, key, cssVar } of sides) {
        const handle = document.createElement('div');
        handle.className = `yt-sheet-handle yt-sheet-handle-${side}`;
        handle.title = 'Drag to resize';
        handle.setAttribute('role', 'separator');
        handle.setAttribute('aria-orientation', 'vertical');

        handle.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            handle.setPointerCapture(event.pointerId);
            document.body.classList.add('yt-sheet-resizing');

            const onMove = (moveEvent) => {
                const width = side === 'left'
                    ? clampWidth(moveEvent.clientX - RAIL_EDGE, RAIL_EDGE)
                    : clampWidth(window.innerWidth - RIGHT_EDGE - moveEvent.clientX, RIGHT_EDGE);
                getSettings()[key] = width;
                document.body.style.setProperty(cssVar, `${width}px`);
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

        // double-click goes back to the default width
        handle.addEventListener('dblclick', () => {
            delete getSettings()[key];
            document.body.style.removeProperty(cssVar);
            saveSettings();
        });

        document.body.append(handle);
    }
}

/** Writes saved sheet widths to <body>. */
export function applySheetWidths(settings) {
    for (const [key, cssVar] of [['sheetWidth', '--yt-sheet-w-pref'], ['rightSheetWidth', '--yt-right-sheet-w-pref']]) {
        if (Number.isFinite(settings[key])) {
            document.body.style.setProperty(cssVar, `${settings[key]}px`);
        } else {
            document.body.style.removeProperty(cssVar);
        }
    }
}
