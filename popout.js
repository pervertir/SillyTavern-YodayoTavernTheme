// Pops the theme's settings out of the Extensions menu into a floating window that can be
// dragged by its title bar. Closing the window puts the settings back.

const WINDOW_ID = 'yt-settings-window';

/**
 * @param {HTMLElement} content The settings panel's content to move
 * @param {HTMLElement} home Where the content lives normally
 */
function openWindow(content, home) {
    if (document.getElementById(WINDOW_ID)) {
        return;
    }
    const win = document.createElement('div');
    win.id = WINDOW_ID;
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Yodayo Tavern Theme settings');

    const bar = document.createElement('div');
    bar.className = 'yt-window-bar';
    const title = document.createElement('b');
    title.textContent = 'Yodayo Tavern Theme';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'yt-window-close fa-solid fa-xmark';
    close.title = 'Put back in the Extensions menu';
    close.setAttribute('aria-label', 'Close');
    bar.append(title, close);

    const body = document.createElement('div');
    // keeps the panel's own styles (they're scoped to .yodayo-tavern-settings)
    body.className = 'yt-window-body yodayo-tavern-settings';
    body.append(content);
    content.style.display = 'block';

    win.append(bar, body);
    document.body.append(win);

    close.addEventListener('click', () => {
        home.append(content);
        content.style.removeProperty('display');
        win.remove();
    });

    // drag by the title bar; the window stays inside the viewport
    bar.addEventListener('pointerdown', (event) => {
        if (event.target === close) {
            return;
        }
        event.preventDefault();
        bar.setPointerCapture(event.pointerId);
        const start = win.getBoundingClientRect();
        const offsetX = event.clientX - start.left;
        const offsetY = event.clientY - start.top;
        const onMove = (moveEvent) => {
            const left = Math.min(Math.max(moveEvent.clientX - offsetX, 0), window.innerWidth - win.offsetWidth);
            const top = Math.min(Math.max(moveEvent.clientY - offsetY, 0), window.innerHeight - 48);
            win.style.left = `${left}px`;
            win.style.top = `${top}px`;
            win.style.right = 'auto';
        };
        const onUp = () => {
            bar.removeEventListener('pointermove', onMove);
            bar.removeEventListener('pointerup', onUp);
            bar.removeEventListener('pointercancel', onUp);
        };
        bar.addEventListener('pointermove', onMove);
        bar.addEventListener('pointerup', onUp);
        bar.addEventListener('pointercancel', onUp);
    });
}

/** Adds the pop-out button to the settings panel's header. */
export function initSettingsPopout() {
    const panel = document.querySelector('.yodayo-tavern-settings > .inline-drawer');
    const header = panel?.querySelector(':scope > .inline-drawer-header');
    const content = panel?.querySelector(':scope > .inline-drawer-content');
    if (!(header instanceof HTMLElement) || !(content instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
        return;
    }
    const button = document.createElement('div');
    button.className = 'yt-popout-button fa-solid fa-window-restore';
    button.title = 'Pop out into a window';
    button.setAttribute('role', 'button');
    button.tabIndex = 0;
    const open = (event) => {
        event.stopPropagation();
        openWindow(content, panel);
    };
    button.addEventListener('click', open);
    button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            open(event);
        }
    });
    header.querySelector('.inline-drawer-icon')?.before(button);
}
