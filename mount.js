// While the theme is off, nothing of it stays in SillyTavern's page: the controls it added
// (back button, look editor cog, position toggle, menu bar button and arrow, sheet close
// buttons and handles, chat blur layer…) are taken out, with their listeners intact, and put
// back where they were when it's turned on. Body classes, variables and data attributes the
// theme set are cleared too.

/** Elements the theme adds to SillyTavern's page, outside its own settings panel */
const OWNED = '[id^="yt-"], .yt-sheet-close, .yt-sheet-handle, .yt-vn-handle';
/** The theme's settings live inside these, and stay */
const KEEP = '.yodayo-tavern-settings, #extensions_settings, #extensions_settings2';

/** @type {{node: Element, parent: Node, next: Node | null}[]} */
let stash = [];

function ownedNodes() {
    return [...document.querySelectorAll(OWNED)].filter((node) => {
        if (node.closest(KEEP)) {
            return false;
        }
        // only the outermost owned element; its children go with it
        return !node.parentElement?.closest(OWNED);
    });
}

/** Clears the theme's classes, variables and data attributes from <body> and the chat. */
function clearMarks() {
    const body = document.body;
    for (const name of [...body.classList]) {
        if (name.startsWith('yt-')) {
            body.classList.remove(name);
        }
    }
    for (const property of [...body.style]) {
        if (property.startsWith('--yt-')) {
            body.style.removeProperty(property);
        }
    }
    for (const key of Object.keys(body.dataset)) {
        if (/^yt[A-Z]/.test(key)) {
            delete body.dataset[key];
        }
    }
    for (const node of document.querySelectorAll('#chat .yt-single-swipe, .recentChat.yt-flip')) {
        node.classList.remove('yt-single-swipe', 'yt-flip');
    }
    for (const sheet of document.querySelectorAll('.drawer-content[style*="--yt-"]')) {
        for (const property of [...sheet.style]) {
            if (property.startsWith('--yt-')) {
                sheet.style.removeProperty(property);
            }
        }
    }
}

/**
 * Takes the theme out of the page, or puts it back.
 * @param {boolean} on Whether the theme is on
 */
export function setMounted(on) {
    if (on) {
        // last taken out goes back first, so each one's next sibling is already there
        for (const { node, parent, next } of stash.reverse()) {
            if (!node.isConnected && parent.isConnected) {
                parent.insertBefore(node, next && next.parentNode === parent ? next : null);
            }
        }
        stash = [];
        return;
    }
    for (const node of ownedNodes()) {
        stash.push({ node, parent: node.parentNode, next: node.nextSibling });
        node.remove();
    }
    clearMarks();
}
