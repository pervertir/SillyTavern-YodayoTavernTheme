// Keeps each slider's accent fill in step with its value. SillyTavern only sizes the fill
// for some sliders (and leaves Zen sliders at a fixed 70%), so the theme sets --yt-fill.

function updateFill(slider) {
    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    const value = Number(slider.value);
    const share = max > min ? (value - min) / (max - min) : 0;
    slider.style.setProperty('--yt-fill', `${Math.min(Math.max(share, 0), 1) * 100}%`);
}

export function refreshSliderFills(root = document) {
    for (const slider of root.querySelectorAll('input[type="range"]')) {
        updateFill(slider);
    }
}

export function initSliderFills() {
    // user drags and SillyTavern's own updates (it fires input/change after loading presets)
    for (const type of ['input', 'change']) {
        document.addEventListener(type, (event) => {
            if (event.target instanceof HTMLInputElement && event.target.type === 'range') {
                updateFill(event.target);
            }
        }, true);
    }
    // values set without an event show up correctly once their drawer opens
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const sheet = mutation.target;
            if (sheet instanceof HTMLElement && sheet.classList.contains('openDrawer')) {
                refreshSliderFills(sheet);
            }
        }
    });
    for (const sheet of document.querySelectorAll('#top-settings-holder .drawer-content')) {
        observer.observe(sheet, { attributes: true, attributeFilter: ['class'] });
    }
    refreshSliderFills();
}
