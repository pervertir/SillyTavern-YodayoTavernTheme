// Character and chat look editor: a cog at the top right of the chat opens a floating
// window that sets colors, a background, message style and background effects for the
// open character or just this chat. Chat settings win over character settings, which win
// over the universal settings (those are only edited in the extension's own panel).

import { COLOR_FIELDS } from './colors.js';
import { ADVANCED_GROUPS } from './advanced.js';
import { getCachedCutout, isCutoutPending, isPluginAvailable } from './bgremove.js';
import { debounce, el, getCurrentAvatar, getCurrentAvatarUrl, HEX_COLOR, makeDraggable, readAsDataUrl, TITLE, unwrapCssUrl } from './util.js';

const COG_ID = 'yt-chat-settings-cog';
const WINDOW_ID = 'yt-chat-settings-window';
/** Advanced groups that can be set per character or chat */
const SCOPED_GROUPS = ['Message style', 'Background effects'];

/** Where a scope's overrides are stored, and the key of the open chat or character in it */
function scopeAddress(scope) {
    return scope === 'chat'
        ? { store: 'chatThemes', key: SillyTavern.getContext().getCurrentChatId?.() ?? null }
        : { store: 'characterThemes', key: getCurrentAvatar() };
}

/** The override object for a scope, created on demand when `create` is set. */
function getScope(settings, scope, create = false) {
    const { store, key } = scopeAddress(scope);
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
    const { store, key } = scopeAddress(scope);
    const entry = settings[store]?.[key];
    if (entry && !Object.keys(entry.colors ?? {}).length && !Object.keys(entry.advanced ?? {}).length && !entry.background && !entry.image && entry.removeBg === undefined) {
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
        image: chat.image || character.image || '',
        // a chat or character can turn background removal on or off; otherwise it's automatic
        // whenever the server plugin is installed
        removeBg: chat.removeBg ?? character.removeBg ?? (Boolean(settings.autoRemoveBg) && isPluginAvailable()),
    };
}

/** Applies the background override for the open chat, if any. */
export function applyBackgroundOverride(settings) {
    const { background } = getEffectiveOverrides(settings);
    document.body.classList.toggle('yt-bg-override', Boolean(background && settings.enabled));
    if (background) {
        // a relative url() inside a custom property resolves against the stylesheet that
        // uses it (this extension's css folder), so make it absolute against the page
        const absolute = new URL(unwrapCssUrl(background), location.href).href;
        document.body.style.setProperty('--yt-bg-override', `url("${absolute.replace(/"/g, '%22')}")`);
    } else {
        document.body.style.removeProperty('--yt-bg-override');
    }
}

function listBackgrounds() {
    return [...document.querySelectorAll('#bg_menu_content .bg_example, #bg_custom_content .bg_example')]
        .map(node => ({
            name: node.getAttribute('title') || node.getAttribute('bgfile') || '',
            file: node.getAttribute('bgfile') || '',
            custom: node.getAttribute('custom') === 'true' || Boolean(node.closest('#bg_custom_content')),
            url: String($(node).data('url') || ''),
        }))
        .filter(bg => bg.url);
}

/** SillyTavern's background folders, as the Backgrounds menu shows them. */
async function loadBackgroundFolders() {
    try {
        const response = await fetch('/api/backgrounds/folders', {
            method: 'POST',
            headers: SillyTavern.getContext().getRequestHeaders(),
            body: JSON.stringify({}),
        });
        if (response.ok) {
            const data = await response.json();
            return { folders: data.folders ?? [], imageFolderMap: data.imageFolderMap ?? {} };
        }
    } catch (error) {
        console.warn(`[${TITLE}] could not load background folders`, error);
    }
    return { folders: [], imageFolderMap: {} };
}

/** Saves an image into SillyTavern's user images folder (under the character's name) and returns its path. */
export async function uploadImage(file, prefix = 'yodayo-art') {
    const dataUrl = await readAsDataUrl(file);
    const [, format = 'png', image = ''] = dataUrl.match(/^data:image\/([a-z0-9.+-]+);base64,(.*)$/i) ?? [];
    const { characters, characterId, getRequestHeaders } = SillyTavern.getContext();
    const response = await fetch('/api/images/upload', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
            image,
            format: format.replace('jpeg', 'jpg').replace('svg+xml', 'svg'),
            ch_name: characters[characterId]?.name || TITLE,
            filename: `${prefix}-${Date.now()}`,
        }),
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const { path } = await response.json();
    return path;
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
        const title = el('b', '', 'Theme for this chat');
        title.id = `${WINDOW_ID}-title`;
        win.setAttribute('aria-labelledby', title.id);
        const close = el('button', 'yt-window-close fa-solid fa-xmark');
        close.type = 'button';
        close.title = 'Close';
        close.setAttribute('aria-label', close.title);
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
                toastr.info('Open a chat first.', TITLE);
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
        const bgSelect = el('select', 'text_pole yt-bg-combo');
        let backgroundFolders = { folders: [], imageFolderMap: {} };
        $(bgSelect).on('change', () => {
            if (bgSelect.value !== (current().background || '')) {
                edit(target => { target.background = bgSelect.value; });
            }
        });
        bgRow.append(el('label', '', 'Image'), bgSelect, resetButton(() => edit(target => { target.background = ''; })));
        const urlRow = el('div', 'yt-setting-row');
        const urlInput = el('input', 'text_pole');
        urlInput.type = 'url';
        urlInput.placeholder = 'Or paste an image URL';
        urlInput.addEventListener('input', debounce(() => edit(target => { target.background = urlInput.value.trim(); })));
        urlRow.append(el('label', '', 'URL'), urlInput);
        body.append(bgRow, urlRow);
        refreshers.push(() => {
            const own = current().background || '';
            bgSelect.replaceChildren();
            const none = el('option', '', 'Default (SillyTavern background)');
            none.value = '';
            bgSelect.append(none);
            // grouped like the Backgrounds menu: chat backgrounds, each folder, then the rest
            const backgrounds = listBackgrounds();
            const { folders, imageFolderMap } = backgroundFolders;
            const addGroup = (label, items) => {
                if (!items.length) {
                    return;
                }
                const group = el('optgroup');
                group.label = label;
                for (const bg of items) {
                    const option = el('option', '', bg.name);
                    option.value = bg.url;
                    group.append(option);
                }
                bgSelect.append(group);
            };
            addGroup('Chat backgrounds', backgrounds.filter(bg => bg.custom));
            const system = backgrounds.filter(bg => !bg.custom);
            for (const folder of folders) {
                addGroup(folder.name, system.filter(bg => imageFolderMap[bg.file]?.includes(folder.id)));
            }
            addGroup(folders.length ? 'Not in a folder' : 'Backgrounds', system.filter(bg => !imageFolderMap[bg.file]?.length));
            const known = [...bgSelect.options].some(option => option.value === own);
            if (own && !known) {
                const custom = el('option', '', 'Custom URL');
                custom.value = own;
                bgSelect.append(custom);
            }
            bgSelect.value = own;
            $(bgSelect).trigger('change.select2');
            if (urlInput !== document.activeElement) {
                urlInput.value = own && !own.startsWith('url(') ? own : '';
            }
        });

        // Character image (shown beside a docked chat and in VN mode)
        body.append(el('h4', 'yt-section-title', 'Character image'));
        const imageRow = el('div', 'yt-setting-row yt-image-row');
        const preview = el('img', 'yt-image-preview');
        preview.alt = '';
        const fileInput = el('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.hidden = true;
        const upload = el('div', 'menu_button menu_button_icon', 'Upload');
        upload.prepend(el('i', 'fa-solid fa-upload'));
        upload.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files?.[0];
            fileInput.value = '';
            if (!file) {
                return;
            }
            try {
                const path = await uploadImage(file);
                edit(target => { target.image = path; });
            } catch (error) {
                console.error(`[${TITLE}] image upload failed`, error);
                toastr.error('The image could not be uploaded.', TITLE);
            }
        });
        imageRow.append(preview, upload, fileInput, resetButton(() => edit(target => { delete target.image; })));
        const imageUrlRow = el('div', 'yt-setting-row');
        const imageUrl = el('input', 'text_pole');
        imageUrl.type = 'url';
        imageUrl.placeholder = 'Or paste an image URL';
        imageUrl.addEventListener('input', debounce(() => edit(target => { target.image = imageUrl.value.trim(); })));
        imageUrlRow.append(el('label', '', 'URL'), imageUrl);
        // one button: remove the background, or bring it back once removed
        const removeRow = el('div', 'yt-setting-row');
        const removeButton = el('div', 'menu_button menu_button_icon yt-remove-bg');
        const removeIcon = el('i', 'fa-solid fa-wand-magic-sparkles');
        const removeText = el('span', '', 'Remove background');
        removeButton.append(removeIcon, removeText);
        removeButton.addEventListener('click', () => {
            const on = getEffectiveOverrides(getSettings()).removeBg;
            edit(target => { target.removeBg = !on; });
        });
        const removeStatus = el('small', 'yt-muted yt-remove-status');
        removeRow.append(removeButton, removeStatus, resetButton(() => edit(target => { delete target.removeBg; })));
        body.append(imageRow, imageUrlRow, removeRow, el('small', 'yt-muted', 'Shown beside the chat when it sits left or right, and in Visual Novel mode. Leave it unset to use the character card.'));
        refreshers.push(() => {
            const own = current().image || '';
            const overrides = getEffectiveOverrides(getSettings());
            const source = overrides.image || getCurrentAvatarUrl();
            const cutout = overrides.removeBg && source ? getCachedCutout(source) : null;
            const effective = cutout || source;
            preview.src = effective || '';
            preview.classList.toggle('yt-cutout', Boolean(cutout));
            removeButton.classList.toggle('active', overrides.removeBg);
            removeText.textContent = overrides.removeBg ? 'Restore background' : 'Remove background';
            removeIcon.className = overrides.removeBg ? 'fa-solid fa-image' : 'fa-solid fa-wand-magic-sparkles';
            removeButton.classList.toggle('disabled', !source);
            removeRow.classList.toggle('yt-value-set', current().removeBg !== undefined);
            removeStatus.textContent = !overrides.removeBg || !source ? ''
                : cutout ? 'Done' : isCutoutPending(source) ? 'Working…' : '';
            preview.classList.toggle('displayNone', !effective);
            imageRow.classList.toggle('yt-value-set', Boolean(own));
            if (imageUrl !== document.activeElement) {
                imageUrl.value = /^\/?user\/images\//.test(own) ? '' : own;
            }
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
                // applies while typing; a half-typed number (empty, "-") waits
                input.addEventListener('input', () => {
                    if (item.type === 'number' && (input.value === '' || !Number.isFinite(Number(input.value)))) {
                        return;
                    }
                    edit(target => {
                        target.advanced[item.key] = item.type === 'number' ? Number(input.value) : input.value;
                    });
                });
                row.append(el('label', '', item.label), input);
                if (item.unit) {
                    row.append(el('span', 'yt-muted', item.unit));
                }
                row.append(resetButton(() => edit(target => { delete target.advanced[item.key]; })));
                body.append(row);
                refreshers.push(() => {
                    const own = current().advanced[item.key];
                    if (input !== document.activeElement) {
                        input.value = String(own ?? getSettings().advanced?.[item.key] ?? item.def);
                    }
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
            title.textContent = name ? `Theme for ${name}` : 'Theme for this chat';
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

        // searchable background picker with thumbnails; typing a folder name shows the folder
        if (typeof $.fn.select2 === 'function') {
            const template = (item) => {
                if (!item.id) {
                    return item.text;
                }
                const row = $('<span class="yt-bg-option"></span>');
                row.append($('<span class="yt-bg-option-thumb"></span>').css('background-image', `url("${unwrapCssUrl(item.id)}")`));
                row.append($('<span></span>').text(item.text));
                return row;
            };
            $(bgSelect).select2({
                dropdownParent: $(win),
                width: '100%',
                placeholder: 'Search backgrounds or folders',
                templateResult: template,
                matcher: (params, data) => {
                    const term = (params.term ?? '').trim().toLowerCase();
                    if (!term) {
                        return data;
                    }
                    if (data.children) {
                        if (data.text.toLowerCase().includes(term)) {
                            return data;
                        }
                        const children = data.children.filter(child => child.text.toLowerCase().includes(term));
                        return children.length ? { ...data, children } : null;
                    }
                    return data.text.toLowerCase().includes(term) ? data : null;
                },
            });
        }
        loadBackgroundFolders().then(result => {
            backgroundFolders = result;
            if (document.getElementById(WINDOW_ID) === win) {
                refresh();
            }
        });

        makeDraggable(win, bar, close);
    }

    return () => refreshWindow();
}
