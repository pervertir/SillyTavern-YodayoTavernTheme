// Phone menu bar (mobile.css): which edge it sits on, and in a chat it slips away while you
// scroll down to read and comes back when you scroll up, open a menu, or tap its handle.

const PHONE_QUERY = window.matchMedia('(max-width: 1000px)');
const HIDDEN_CLASS = 'yt-m-bar-hidden';
/** Scroll this far in one direction before the bar moves, so small jitters don't flicker it */
const SCROLL_SLACK = 24;

let getSettings = () => ({});
/** Until when scroll changes come from the chat resizing as the bar moves, not from the user */
let settlingUntil = 0;

function setHidden(hidden) {
    if (document.body.classList.contains(HIDDEN_CLASS) === hidden) {
        return;
    }
    document.body.classList.toggle(HIDDEN_CLASS, hidden);
    // the chat grows or shrinks by the bar's height, which moves its scroll position
    settlingUntil = performance.now() + 450;
}

/** Whether the bar may hide right now: a phone, in a chat, with nothing open from it */
function canHide() {
    const settings = getSettings();
    return PHONE_QUERY.matches
        && settings.enabled
        && settings.phoneNavAutohide
        && !document.body.classList.contains('yt-home-active')
        && !document.querySelector('#top-settings-holder .drawer-content.openDrawer');
}

/** Puts the bar on its edge and shows it; call after settings change. */
export function applyPhoneNav() {
    const settings = getSettings();
    const body = document.body;
    body.classList.toggle('yt-phone-nav-top', settings.phoneNav === 'top');
    body.classList.toggle('yt-phone-nav-bottom', settings.phoneNav !== 'top');
    if (!canHide()) {
        setHidden(false);
    }
}

/** @param {() => object} settingsGetter */
export function initPhoneNav(settingsGetter) {
    getSettings = settingsGetter;

    const handle = document.createElement('button');
    handle.id = 'yt-m-handle';
    handle.type = 'button';
    handle.title = 'Show the menu bar';
    handle.setAttribute('aria-label', handle.title);
    handle.addEventListener('click', () => setHidden(false));
    document.body.append(handle);

    const chat = document.getElementById('chat');
    let anchor = chat?.scrollTop ?? 0;
    // only scrolling the user does: SillyTavern's own jumps to the newest message don't count
    let userScrollUntil = 0;
    const markUserScroll = () => { userScrollUntil = performance.now() + 800; };
    for (const type of ['touchmove', 'wheel']) {
        chat?.addEventListener(type, markUserScroll, { passive: true });
    }
    chat?.addEventListener('scroll', () => {
        const top = chat.scrollTop;
        const now = performance.now();
        if (now > userScrollUntil || now < settlingUntil) {
            anchor = top;
            return;
        }
        if (!canHide()) {
            setHidden(false);
            anchor = top;
            return;
        }
        const delta = top - anchor;
        if (delta > SCROLL_SLACK) {
            setHidden(true);
            anchor = top;
        } else if (delta < -SCROLL_SLACK) {
            setHidden(false);
            anchor = top;
        }
    }, { passive: true });

    // a menu opening always brings the bar back (its sheet hangs off the bar)
    document.getElementById('top-settings-holder')?.addEventListener('click', () => setHidden(false), true);
    PHONE_QUERY.addEventListener('change', applyPhoneNav);

    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, () => {
        setHidden(false);
        anchor = chat?.scrollTop ?? 0;
    });

    applyPhoneNav();
}
