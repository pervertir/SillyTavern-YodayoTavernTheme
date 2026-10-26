// Yodayo Tavern Theme: toggles the scoped styles in style.css and exposes a small settings panel.

const MODULE_NAME = 'yodayoTavernTheme';
const BODY_CLASS = 'yodayo-tavern';
const DEFAULT_ACCENT = '#e4f063';

const defaultSettings = Object.freeze({
    enabled: true,
    accent: DEFAULT_ACCENT,
    userSide: 'right',
    font: 'inter',
    bubbleWidth: 720,
    flatBackground: false,
    chatPosition: 'middle',
    characterArt: true,
});

const ART_ID = 'yt-character-art';

const fonts = {
    inter: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
};

function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    const settings = extensionSettings[MODULE_NAME];
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(settings, key)) {
            settings[key] = defaultSettings[key];
        }
    }
    return settings;
}

function saveSettings() {
    SillyTavern.getContext().saveSettingsDebounced();
}

/** Picks dark or light ink so text on the accent color stays readable. */
function getAccentInk(hex) {
    const value = parseInt(hex.slice(1), 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    const luminance = (r * 299 + g * 587 + b * 114) / 1000;
    return luminance > 140 ? '#1a1a1a' : '#ffffff';
}

function isMoonlitEnabled() {
    const { extensionSettings } = SillyTavern.getContext();
    const moonlit = extensionSettings.SillyTavernMoonlitEchoesTheme;
    const folderLoaded = document.querySelector('link[href*="SillyTavern-MoonlitEchoesTheme"]') !== null;
    return Boolean(moonlit?.enabled) && folderLoaded;
}

/** Full-size card image of the character in the open solo chat, or null. */
function getCharacterImageUrl() {
    const { characters, characterId, groupId } = SillyTavern.getContext();
    if (groupId || characterId === undefined) {
        return null;
    }
    const avatar = characters[characterId]?.avatar;
    if (!avatar || avatar === 'none') {
        return null;
    }
    return `characters/${encodeURIComponent(avatar)}`;
}

/** Puts the character image on the side opposite the chat when it is docked left or right. */
function updateCharacterArt() {
    const settings = getSettings();
    const docked = settings.chatPosition === 'left' || settings.chatPosition === 'right';
    const url = settings.enabled && settings.characterArt && docked ? getCharacterImageUrl() : null;

    let art = document.getElementById(ART_ID);
    if (!url) {
        art?.remove();
        return;
    }
    if (!art) {
        art = document.createElement('div');
        art.id = ART_ID;
        const img = document.createElement('img');
        img.alt = '';
        art.append(img);
        document.body.append(art);
    }
    const img = art.querySelector('img');
    if (img.getAttribute('src') !== url) {
        img.setAttribute('src', url);
    }
}

function applySettings() {
    const settings = getSettings();
    const body = document.body;

    body.classList.toggle(BODY_CLASS, settings.enabled);
    body.classList.toggle('yt-user-left', settings.userSide === 'left');
    body.classList.toggle('yt-flat-bg', settings.flatBackground);
    body.classList.toggle('yt-pos-left', settings.chatPosition === 'left');
    body.classList.toggle('yt-pos-right', settings.chatPosition === 'right');

    body.style.setProperty('--yt-accent', settings.accent);
    body.style.setProperty('--yt-accent-ink', getAccentInk(settings.accent));
    body.style.setProperty('--yt-bubble-max', `${settings.bubbleWidth}px`);

    if (settings.font === 'default') {
        body.style.removeProperty('--yt-font');
    } else {
        body.style.setProperty('--yt-font', fonts[settings.font] ?? fonts.inter);
    }

    $('#yt_conflict_note').toggleClass('displayNone', !(settings.enabled && isMoonlitEnabled()));
    updateCharacterArt();
}

function syncSettingsUI() {
    const settings = getSettings();
    $('#yt_enabled').prop('checked', settings.enabled);
    $('#yt_accent').val(settings.accent);
    $('#yt_user_side').val(settings.userSide);
    $('#yt_font').val(settings.font);
    $('#yt_bubble_width').val(settings.bubbleWidth);
    $('#yt_bubble_width_value').text(`${settings.bubbleWidth}px`);
    $('#yt_flat_bg').prop('checked', settings.flatBackground);
    $('#yt_chat_position').val(settings.chatPosition);
    $('#yt_character_art').prop('checked', settings.characterArt);
}

function bindSettingsUI() {
    const update = (key, value) => {
        getSettings()[key] = value;
        applySettings();
        saveSettings();
    };

    $('#yt_enabled').on('change', function () {
        update('enabled', $(this).prop('checked'));
    });
    $('#yt_accent').on('input', function () {
        update('accent', String($(this).val()));
    });
    $('#yt_accent_reset').on('click', () => {
        update('accent', DEFAULT_ACCENT);
        syncSettingsUI();
    });
    $('#yt_user_side').on('change', function () {
        update('userSide', String($(this).val()));
    });
    $('#yt_font').on('change', function () {
        update('font', String($(this).val()));
    });
    $('#yt_bubble_width').on('input', function () {
        const width = Number($(this).val());
        $('#yt_bubble_width_value').text(`${width}px`);
        update('bubbleWidth', width);
    });
    $('#yt_flat_bg').on('change', function () {
        update('flatBackground', $(this).prop('checked'));
    });
    $('#yt_chat_position').on('change', function () {
        update('chatPosition', String($(this).val()));
    });
    $('#yt_character_art').on('change', function () {
        update('characterArt', $(this).prop('checked'));
    });
}

jQuery(async () => {
    const html = await fetch(new URL('./settings.html', import.meta.url)).then(response => response.text());
    $('#extensions_settings2').append(html);

    syncSettingsUI();
    bindSettingsUI();
    applySettings();

    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, updateCharacterArt);
    eventSource.on(eventTypes.CHARACTER_EDITED, updateCharacterArt);

    if (getSettings().enabled && isMoonlitEnabled()) {
        toastr.warning('Moonlit Echoes is also enabled and will override parts of the Yodayo Tavern look.', 'Yodayo Tavern Theme');
    }
});
