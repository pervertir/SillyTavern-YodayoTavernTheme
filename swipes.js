// Marks messages that have only one swipe, so the theme can hide their "1/1" counter.
// Runs on SillyTavern's message and chat events only, never per streamed token.

const SINGLE = /^\s*1\D*\/\D*1\s*$/;

function markSingleSwipes() {
    for (const counter of document.querySelectorAll('#chat .mes .swipes-counter')) {
        const mes = counter.closest('.mes');
        mes?.classList.toggle('yt-single-swipe', SINGLE.test(counter.textContent ?? ''));
    }
}

export function initSwipeCounters() {
    const { eventSource, eventTypes } = SillyTavern.getContext();
    let queued = false;
    const schedule = () => {
        if (queued) {
            return;
        }
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            markSingleSwipes();
        });
    };
    for (const type of ['CHAT_CHANGED', 'CHARACTER_MESSAGE_RENDERED', 'USER_MESSAGE_RENDERED', 'MESSAGE_SWIPED', 'MESSAGE_UPDATED', 'MESSAGE_DELETED', 'MORE_MESSAGES_LOADED', 'GENERATION_ENDED']) {
        if (eventTypes[type]) {
            eventSource.on(eventTypes[type], schedule);
        }
    }
    schedule();
}
