// Moescape's ghost stands in for SillyTavern's logo: the tab's favicon, the loading screen
// and the menu bar button. The favicon goes back to SillyTavern's while the theme is off.

/** The ghost, next to this file */
export const LOGO_URL = new URL('img/moescape.svg', import.meta.url).href;

/** SillyTavern's own favicon link, kept to put back */
let original = null;

/** @param {boolean} on Whether the theme is on */
export function applyFavicon(on) {
    const link = document.querySelector('link[rel="icon"]');
    if (!link) {
        return;
    }
    if (on) {
        original ??= { href: link.getAttribute('href'), type: link.getAttribute('type') };
        link.setAttribute('type', 'image/svg+xml');
        link.setAttribute('href', LOGO_URL);
    } else if (original) {
        link.setAttribute('href', original.href);
        link.setAttribute('type', original.type ?? '');
        original = null;
    }
}

/**
 * The loading screen's logo, from the moment this extension loads (SillyTavern shows its own
 * for the first moment, before any extension runs). The screen is gone soon after startup.
 * @param {boolean} on Whether the theme is on
 */
export function applySplashLogo(on) {
    const logo = document.querySelector('#loader.splash-screen .splash-logo');
    if (logo instanceof HTMLImageElement && on) {
        logo.src = LOGO_URL;
        logo.alt = '';
        logo.style.width = 'min(120px, 40%)';
    }
}
