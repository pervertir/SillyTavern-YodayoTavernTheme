// Character and chat look editor: a cog at the top right of the chat opens a floating
// window that sets colors, a background, message style and background effects for the
// open character or just this chat. Chat settings win over character settings, which win
// over the universal settings (those are only edited in the extension's own panel).

import { COLOR_FIELDS, getCurrentAvatar } from './colors.js';
import { ADVANCED_GROUPS } from './advanced.js';

const COG_ID = 'yt-chat-settings-cog';
const WINDOW_ID = 'yt-chat-settings-window';
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
/** Advanced groups that can be set per character or chat */
const SCOPED_GROUPS = ['Message style', 'Background effects'];
export const SCOPED_ITEMS = Object.freeze(ADVANCED_GROUPS
    .filter(group => SCOPED_GROUPS.includes(group.title))
    .flatMap(group => group.items));

function getChatId() {
    return SillyTavern.getContext().getCurrentChatId?.() ?? null;
}

/** The override object for a scope, created on demand when `create` is set. */
function getScope(settings, scope, create = false) {
    const store = scope === 'chat' ? 'chatThemes' : 'characterThemes';
    const key = scope === 'chat' ? getChatId() : getCurrentAvatar();
    if (!key) {
        return null;
    }
    settings[store] ??= {};
    if (!settings[store][key] && create) {
        settings[store][key] = { colors: {}, advanced: {}, background: '' };
    }
    const entry = settings[store][key];
    if (entry) {
        entry.colors ??= {};
        entry.advanced ??= {};
    }
    return entry ?? null;
}

/** Drops an override object once nothing in it is set. */
function prune(settings, scope) {
    const store = scope === 'chat' ? 'chatThemes' : 'characterThemes';
    const key = scope === 'chat' ? getChatId() : getCurrentAvatar();
    const entry = settings[store]?.[key];
    if (entry && !Object.keys(entry.colors ?? {}).length && !Object.keys(entry.advanced ?? {}).length && !entry.background && !entry.image) {
        delete settings[store][key];
    }
}

/** Colors, Advanced values and background in effect for the open chat. */
export function getEffectiveOverrides(settings) {
    const character = getScope(settings, 'character') ?? {};
    const chat = getScope(settings, 'chat') ?? {};
    return {
        colors: { ...character.colors, ...chat.colors },
        advanced: { ...character.advanced, ...chat.advanced },
        background: chat.background || character.background || '',
    };
}

/** Applies the background override for the open chat, if any. */
export function applyBackgroundOverride(settings) {
    const { background } = getEffectiveOverrides(settings);
    document.body.classList.toggle('yt-bg-override', Boolean(background && settings.enabled));
    if (background) {
        document.body.style.setProperty('--yt-bg-override', background.startsWith('url(') ? background : `url("${background}")`);
    } else {
        document.body.style.removeProperty('--yt-bg-override');
    }
}

function listBackgrounds() {
    return [...document.querySelectorAll('#bg_menu_content .bg_example, #bg_custom_content .bg_example')]
        .map(el => ({ name: el.getAttribute('title') || el.getAttribute('bgfile') || '', url: String($(el).data('url') || '') }))
        .filter(bg => bg.url);
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

function resetButton(onClick) {
    const reset = el('div', 'menu_button menu_button_icon fa-solid fa-rotate-left yt-reset');
    reset.title = 'Use the next level up (character or universal)';
    reset.addEventListener('click', onClick);
    return reset;
}

/**
 * @param {object} options
 * @param {() => object} options.getSettings Returns the extension settings
 * @param {() => void} options.onChange Applies and saves
 * @returns {() => void} Refreshes the open editor, e.g. after switching chats
 */
export function initCharacterSettings({ getSettings, onChange }) {
    const sheld = document.getElementById('sheld');
    if (!sheld) {
        return () => {};
    }

    let scope = 'character';
    let refreshWindow = () => {};

    const cog = el('button', 'fa-solid fa-gear');
    cog.id = COG_ID;
    cog.type = 'button';
    cog.title = 'Look settings for this character or chat';
    cog.setAttribute('aria-label', cog.title);
    cog.addEventListener('click', () => {
        if (document.getElementById(WINDOW_ID)) {
            closeWindow();
        } else {
            openWindow();
        }
    });
    sheld.prepend(cog);

    function closeWindow() {
        document.getElementById(WINDOW_ID)?.remove();
        refreshWindow = () => {};
    }

    function openWindow() {
        scope = 'character';
        const win = el('div', 'yodayo-tavern-settings');
        win.id = WINDOW_ID;
        win.setAttribute('role', 'dialog');

        const bar = el('div', 'yt-window-bar');
        const title = el('b', '', 'Look for this chat');
        const close = el('button', 'yt-window-close fa-solid fa-xmark');
        close.type = 'button';
        close.title = 'Close';
        close.addEventListener('click', closeWindow);
        bar.append(title, close);

        const body = el('div', 'yt-window-body');

        // scope switch
        const scopes = el('div', 'yt-scope-switch');
        const makeScope = (value, label) => {
            const button = el('div', 'menu_button', label);
            button.addEventListener('click', () => {
                scope = value;
                refresh();
            });
            button.dataset.scope = value;
            return button;
        };
        scopes.append(makeScope('character', 'This character'), makeScope('chat', 'This chat'));
        const note = el('small', 'yt-muted', 'Chat settings win over character settings. Your universal look is set in Extensions → Yodayo Tavern Theme.');
        body.append(scopes, note);

        const refreshers = [];
        const edit = (mutate) => {
            const s = getSettings();
            const target = getScope(s, scope, true);
            if (!target) {
                toastr.info('Open a chat first.', 'Yodayo Tavern Theme');
                return;
            }
            mutate(target);
            prune(s, scope);
            onChange();
            refresh();
        };
        const current = () => getScope(getSettings(), scope) ?? { colors: {}, advanced: {}, background: '' };

        // Colors
        body.append(el('h4', 'yt-section-title', 'Colors'));
        for (const field of COLOR_FIELDS) {
            const row = el('div', 'yt-setting-row yt-color-row');
            const label = el('label', '', `${field.group} ${field.label.toLowerCase()}`);
            const input = el('input');
            input.type = 'color';
            input.addEventListener('input', () => edit(target => { target.colors[field.key] = input.value; }));
            row.append(label, input, resetButton(() => edit(target => { delete target.colors[field.key]; })));
            body.append(row);
            refreshers.push(() => {
                const own = current().colors[field.key];
                const style = getComputedStyle(document.body).getPropertyValue(field.cssVar).trim();
                input.value = HEX_COLOR.test(own ?? '') ? own : (HEX_COLOR.test(style) ? style : (field.preview === 'accent' ? getSettings().accent : field.preview));
                row.classList.toggle('yt-color-set', HEX_COLOR.test(own ?? ''));
            });
        }

        // Background
        body.append(el('h4', 'yt-section-title', 'Background'));
        const bgRow = el('div', 'yt-setting-row');
        const bgSelect = el('select', 'text_pole');
        bgSelect.addEventListener('change', () => edit(target => { target.background = bgSelect.value; }));
        bgRow.append(el('label', '', 'Image'), bgSelect, resetButton(() => edit(target => { target.background = ''; })));
        const urlRow = el('div', 'yt-setting-row');
        const urlInput = el('input', 'text_pole');
        urlInput.type = 'url';
        urlInput.placeholder = 'Or paste an image URL';
        urlInput.addEventListener('change', () => edit(target => { target.background = urlInput.value.trim(); }));
        urlRow.append(el('label', '', 'URL'), urlInput);
        body.append(bgRow, urlRow);
        refreshers.push(() => {
            const own = current().background || '';
            bgSelect.replaceChildren();
            const none = el('option', '', 'Default (SillyTavern background)');
            none.value = '';
            bgSelect.append(none);
            for (const bg of listBackgrounds()) {
                const option = el('option', '', bg.name);
                option.value = bg.url;
                bgSelect.append(option);
            }
            const known = [...bgSelect.options].some(option => option.value === own);
            if (own && !known) {
                const custom = el('option', '', 'Custom URL');
                custom.value = own;
                bgSelect.append(custom);
            }
            bgSelect.value = own;
            urlInput.value = own && !own.startsWith('url(') ? own : '';
        });

        // Message style and background effects
        for (const group of ADVANCED_GROUPS.filter(g => SCOPED_GROUPS.includes(g.title))) {
            body.append(el('h4', 'yt-section-title', group.title));
            for (const item of group.items) {
                if (item.type === 'checkbox') {
                    const row = el('label', 'checkbox_label');
                    const input = el('input');
                    input.type = 'checkbox';
                    input.addEventListener('change', () => edit(target => { target.advanced[item.key] = input.checked; }));
                    row.append(input, el('span', '', item.label));
                    body.append(row);
                    refreshers.push(() => {
                        const own = current().advanced[item.key];
                        input.checked = own ?? getSettings().advanced?.[item.key] ?? item.def;
                    });
                    continue;
                }
                const row = el('div', 'yt-setting-row');
                const input = el('input', 'text_pole');
                input.type = item.type === 'number' ? 'number' : 'text';
                if (item.type === 'number') {
                    input.min = String(item.min ?? '');
                    input.max = String(item.max ?? '');
                    input.step = String(item.step ?? 1);
                }
                input.addEventListener('change', () => edit(target => {
                    target.advanced[item.key] = item.type === 'number' ? Number(input.value) : input.value;
                }));
                row.append(el('label', '', item.label), input);
                if (item.unit) {
                    row.append(el('span', 'yt-muted', item.unit));
                }
                row.append(resetButton(() => edit(target => { delete target.advanced[item.key]; })));
                body.append(row);
                refreshers.push(() => {
                    const own = current().advanced[item.key];
                    input.value = String(own ?? getSettings().advanced?.[item.key] ?? item.def);
                    row.classList.toggle('yt-value-set', own !== undefined);
                });
            }
        }

        win.append(bar, body);
        document.body.append(win);

        function refresh() {
            const avatar = getCurrentAvatar();
            const { characters, characterId } = SillyTavern.getContext();
            const name = avatar ? characters[characterId]?.name : '';
            title.textContent = name ? `Look for ${name}` : 'Look for this chat';
            const characterButton = scopes.querySelector('[data-scope="character"]');
            characterButton.classList.toggle('disabled', !avatar);
            if (!avatar && scope === 'character') {
                scope = 'chat';
            }
            for (const button of scopes.children) {
                button.classList.toggle('active', button.dataset.scope === scope);
            }
            for (const refresher of refreshers) {
                refresher();
            }
        }

        refreshWindow = refresh;
        refresh();

        // drag by the title bar
        bar.addEventListener('pointerdown', (event) => {
            if (event.target === close) {
                return;
            }
            event.preventDefault();
            bar.setPointerCapture(event.pointerId);
            const start = win.getBoundingClientRect();
            const dx = event.clientX - start.left;
            const dy = event.clientY - start.top;
            const onMove = (moveEvent) => {
                win.style.left = `${Math.min(Math.max(moveEvent.clientX - dx, 0), window.innerWidth - win.offsetWidth)}px`;
                win.style.top = `${Math.min(Math.max(moveEvent.clientY - dy, 0), window.innerHeight - 48)}px`;
                win.style.right = 'auto';
            };
            const onUp = () => {
                bar.removeEventListener('pointermove', onMove);
                bar.removeEventListener('pointerup', onUp);
            };
            bar.addEventListener('pointermove', onMove);
            bar.addEventListener('pointerup', onUp);
        });
    }

    return () => refreshWindow();
}
