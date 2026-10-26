// Phone menu bar (mobile.css): which edge it sits on.

/** Puts the bar on its edge; call after settings change. */
export function applyPhoneNav(settings) {
    const body = document.body;
    body.classList.toggle('yt-phone-nav-top', settings.phoneNav === 'top');
    body.classList.toggle('yt-phone-nav-bottom', settings.phoneNav !== 'top');
}
