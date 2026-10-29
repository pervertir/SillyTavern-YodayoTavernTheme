// Pops the theme's settings out of the Extensions menu into a floating window that can be
// dragged by its title bar. Closing the window puts the settings back.

import { el, makeDraggable, onActivate, TITLE } from './util.js';

const WINDOW_ID = 'yt-settings-window';

/**
 * @param {HTMLElement} content The settings panel's content to move
 * @param {HTMLElement} home Where the content lives normally
 */
function openWindow(content, home) {
    if (document.getElementById(WINDOW_ID)) {
        return;
    }
    const win = el('div');
    win.id = WINDOW_ID;
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', `${TITLE} settings`);

    const bar = el('div', 'yt-window-bar');
    const close = el('button', 'yt-window-close fa-solid fa-xmark');
    close.type = 'button';
    close.title = 'Put back in the Extensions menu';
    close.setAttribute('aria-label', 'Close');
    bar.append(el('b', '', TITLE), close);

    // keeps the panel's own styles (they're scoped to .yodayo-tavern-settings)
    const body = el('div', 'yt-window-body yodayo-tavern-settings');
    body.append(content);
    content.style.display = 'block';

    win.append(bar, body);
    document.body.append(win);

    close.addEventListener('click', () => {
        home.append(content);
        content.style.removeProperty('display');
        win.remove();
    });
    makeDraggable(win, bar, close);
}

/** Adds the pop-out button to the settings panel's header. */
export function initSettingsPopout() {
    const panel = document.querySelector('.yodayo-tavern-settings > .inline-drawer');
    const header = panel?.querySelector(':scope > .inline-drawer-header');
    const content = panel?.querySelector(':scope > .inline-drawer-content');
    if (!(panel instanceof HTMLElement) || !(header instanceof HTMLElement) || !(content instanceof HTMLElement)) {
        return;
    }
    const button = el('div', 'yt-popout-button fa-solid fa-window-restore');
    button.title = 'Pop out into a window';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', button.title);
    button.tabIndex = 0;
    onActivate(button, (event) => {
        event.preventDefault();
        event.stopPropagation();
        openWindow(content, panel);
    });
    header.querySelector('.inline-drawer-icon')?.before(button);
}
