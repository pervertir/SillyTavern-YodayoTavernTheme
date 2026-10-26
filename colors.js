// Chat colors, modelled on the Yodayo Chat Customizer: one set for all characters,
// optional per-character overrides, a per-character image, and JSON export/import.

/** Each color maps to a CSS variable; null in settings means "use the theme default". */
export const COLOR_FIELDS = Object.freeze([
    { group: 'Character', key: 'charName', label: 'Name', cssVar: '--yt-char-name', preview: 'accent' },
    { group: 'Character', key: 'charText', label: 'Text', cssVar: '--yt-char-text', preview: '#f0f0f0' },
    { group: 'Character', key: 'charQuote', label: 'Dialogue "…"', cssVar: '--yt-char-quote', preview: 'accent' },
    { group: 'Character', key: 'charNarration', label: 'Narration *…*', cssVar: '--yt-char-em', preview: '#a8a8a8' },
    { group: 'Character', key: 'charBubble', label: 'Bubble', cssVar: '--yt-char-bubble', preview: '#232527' },
    { group: 'You', key: 'userName', label: 'Name', cssVar: '--yt-user-name', preview: '#f0f0f0' },
    { group: 'You', key: 'userText', label: 'Text', cssVar: '--yt-user-text', preview: '#f0f0f0' },
    { group: 'You', key: 'userBubble', label: 'Bubble', cssVar: '--yt-user-bubble', preview: '#3a3d33' },
]);

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const EXPORT_FILE = 'yodayo-tavern-theme.json';

/** Avatar file of the character in the open solo chat, or null. */
export function getCurrentAvatar() {
    const { characters, characterId, groupId } = SillyTavern.getContext();
    if (groupId || characterId === undefined) {
        return null;
    }
    return characters[characterId]?.avatar ?? null;
}

function getCurrentCharacterName() {
    const { characters, characterId } = SillyTavern.getContext();
    return characters[characterId]?.name ?? '';
}

/** The per-character entry for an avatar, created on demand when `create` is set. */
function getCharacterTheme(settings, avatar, create = false) {
    if (!avatar) {
        return null;
    }
    if (!settings.characterThemes[avatar] && create) {
        settings.characterThemes[avatar] = { colors: {}, image: '' };
    }
    return settings.characterThemes[avatar] ?? null;
}

/** Drops a character's entry once nothing is customized, so settings stay small. */
function pruneCharacterTheme(settings, avatar) {
    const theme = settings.characterThemes[avatar];
    const emptyAdvanced = !Object.keys(theme?.advanced ?? {}).length;
    if (theme && !Object.keys(theme.colors).length && !theme.image && !theme.background && emptyAdvanced) {
        delete settings.characterThemes[avatar];
    }
}

/** Custom image URL for the open character, if one is set. */
export function getCharacterImageOverride(settings) {
    return getCharacterTheme(settings, getCurrentAvatar())?.image || null;
}

/**
 * Writes the effective colors to <body>: the universal colors, then the character's and
 * chat's overrides (charsettings.js works those out and passes them in).
 */
export function applyColors(settings, overrides = {}) {
    const effective = { ...settings.colors, ...overrides };
    for (const field of COLOR_FIELDS) {
        const value = effective[field.key];
        if (HEX_COLOR.test(value ?? '')) {
            document.body.style.setProperty(field.cssVar, value);
        } else {
            document.body.style.removeProperty(field.cssVar);
        }
    }
}

/**
 * Builds and wires the Colors section of the settings panel.
 * @param {object} options
 * @param {() => object} options.getSettings Returns the extension settings
 * @param {() => void} options.onChange Applies and saves after any change
 * @returns {() => void} Refreshes the controls, e.g. after switching chats
 */
export function initColorControls({ getSettings, onChange }) {
    const rows = document.getElementById('yt_color_rows');
    const scope = /** @type {HTMLSelectElement|null} */ (document.getElementById('yt_color_scope'));
    if (!rows || !scope) {
        return () => {};
    }

    const isCharacterScope = () => scope.value === 'character' && Boolean(getCurrentAvatar());

    /** The color map being edited: all characters, or this character's overrides. */
    const getEditedColors = (create = false) => {
        const settings = getSettings();
        if (!isCharacterScope()) {
            return settings.colors;
        }
        return getCharacterTheme(settings, getCurrentAvatar(), create)?.colors ?? {};
    };

    const previewValue = (field) => {
        const settings = getSettings();
        const own = getCharacterTheme(settings, getCurrentAvatar())?.colors ?? {};
        const value = (isCharacterScope() ? own[field.key] : undefined) ?? settings.colors[field.key];
        if (HEX_COLOR.test(value ?? '')) {
            return value;
        }
        return field.preview === 'accent' ? settings.accent : field.preview;
    };

    let group = '';
    for (const field of COLOR_FIELDS) {
        if (field.group !== group) {
            group = field.group;
            const heading = document.createElement('div');
            heading.className = 'yt-color-group';
            heading.textContent = group;
            rows.append(heading);
        }
        const row = document.createElement('div');
        row.className = 'yt-setting-row yt-color-row';

        const label = document.createElement('label');
        label.htmlFor = `yt_color_${field.key}`;
        label.textContent = field.label;

        const input = document.createElement('input');
        input.type = 'color';
        input.id = `yt_color_${field.key}`;
        input.addEventListener('input', () => {
            getEditedColors(true)[field.key] = input.value;
            row.classList.add('yt-color-set');
            onChange();
        });

        const reset = document.createElement('div');
        reset.className = 'menu_button menu_button_icon fa-solid fa-rotate-left';
        reset.title = 'Back to default';
        reset.addEventListener('click', () => {
            delete getEditedColors()[field.key];
            const avatar = getCurrentAvatar();
            if (isCharacterScope() && avatar) {
                pruneCharacterTheme(getSettings(), avatar);
            }
            refresh();
            onChange();
        });

        row.append(label, input, reset);
        rows.append(row);
    }

    const imageRow = document.getElementById('yt_char_image_row');
    const imageInput = /** @type {HTMLInputElement|null} */ (document.getElementById('yt_char_image'));
    imageInput?.addEventListener('change', () => {
        const avatar = getCurrentAvatar();
        if (!avatar) {
            return;
        }
        const url = imageInput.value.trim();
        getCharacterTheme(getSettings(), avatar, true).image = url;
        pruneCharacterTheme(getSettings(), avatar);
        onChange();
    });

    document.getElementById('yt_colors_reset')?.addEventListener('click', () => {
        const settings = getSettings();
        const avatar = getCurrentAvatar();
        if (isCharacterScope() && avatar) {
            const theme = getCharacterTheme(settings, avatar);
            if (theme) {
                theme.colors = {};
                pruneCharacterTheme(settings, avatar);
            }
        } else {
            settings.colors = {};
        }
        refresh();
        onChange();
    });

    scope.addEventListener('change', () => refresh());

    function refresh() {
        const avatar = getCurrentAvatar();
        const characterOption = scope.querySelector('option[value="character"]');
        if (characterOption) {
            characterOption.disabled = !avatar;
            characterOption.textContent = avatar ? `Only ${getCurrentCharacterName()}` : 'Only this character (open a chat first)';
        }
        if (!avatar && scope.value === 'character') {
            scope.value = 'all';
        }

        const edited = getEditedColors();
        for (const field of COLOR_FIELDS) {
            const input = /** @type {HTMLInputElement} */ (document.getElementById(`yt_color_${field.key}`));
            input.value = previewValue(field);
            input.closest('.yt-color-row')?.classList.toggle('yt-color-set', HEX_COLOR.test(edited[field.key] ?? ''));
        }

        imageRow?.classList.toggle('displayNone', !isCharacterScope());
        if (imageInput) {
            imageInput.value = getCharacterTheme(getSettings(), avatar)?.image ?? '';
        }
    }

    refresh();
    return refresh;
}

/** Wires the Export and Import buttons. `onImport` receives the parsed settings object. */
export function initBackupControls({ getSettings, onImport }) {
    document.getElementById('yt_export')?.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(getSettings(), null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = EXPORT_FILE;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 0);
    });

    const fileInput = /** @type {HTMLInputElement|null} */ (document.getElementById('yt_import_file'));
    document.getElementById('yt_import')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) {
            return;
        }
        try {
            const data = JSON.parse(await file.text());
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('not a settings object');
            }
            onImport(data);
            toastr.success('Theme settings imported.', 'Yodayo Tavern Theme');
        } catch (error) {
            console.error('[Yodayo Tavern] Import failed', error);
            toastr.error('That file is not a Yodayo Tavern settings export.', 'Yodayo Tavern Theme');
        }
    });
}
