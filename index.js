// Yodayo Tavern Theme: toggles the scoped styles in style.css and exposes a small settings panel.

import { initTavernHome } from './home.js';
import { applyColors, getCharacterImageOverride, initBackupControls, initColorControls } from './colors.js';
import { applySheetWidths, initSheetResizers } from './sheets.js';
import { applyVnHeight, initVnMode } from './vn.js';
import { initSliderFills } from './sliders.js';
import { initSwipeCounters } from './swipes.js';
import { applyAdvanced, initAdvancedControls } from './advanced.js';
import { initSettingsPopout } from './popout.js';
import { placePagination } from './pagination.js';

const MODULE_NAME = 'yodayoTavernTheme';
/** Folder path under scripts/extensions/, e.g. third-party/SillyTavern-YodayoTavernTheme */
const EXTENSION_FOLDER = new URL('.', import.meta.url).pathname
    .replace(/^.*\/scripts\/extensions\//, '')
    .replace(/\/$/, '');
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
    panelOpacity: 80,
    navMode: 'rail-toggle',
    tavernHome: true,
    /** Colors for all characters, keyed by the fields in colors.js */
    colors: {},
    /** Per-character overrides: { [avatar file]: { colors: {}, image: '' } } */
    characterThemes: {},
    /** Chat height in visual novel mode, as a share of the window height */
    vnHeight: 0.3,
    /** Widths the user dragged menus to: { [sheet id]: px } */
    sheetWidths: {},
    /** Advanced look settings from advanced.js: { [key]: value } */
    advanced: {},
});

let syncTavernHome = () => {};
let refreshColorControls = () => {};
let refreshAdvancedControls = () => {};

const RAIL_TOGGLE_ID = 'yt-rail-toggle';
const BACK_BUTTON_ID = 'yt-back-home';

/** SillyTavern's own recent chats settings (welcome-screen.js) and the theme's defaults */
const RECENT_CHATS_KEY = 'recentChatsSettings';
const ST_RECENT_DEFAULTS = { maxDisplayed: 15, collapsedDisplayed: 3 };
const THEME_RECENT_DEFAULTS = { maxDisplayed: 20, collapsedDisplayed: 20 };

const ART_ID = 'yt-character-art';
/** A character image at least this share of the art area's height is shown at full height. */
const ART_FILL_RATIO = 0.5;

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
    // the auto-hiding rail was replaced by the hamburger button
    if (settings.navMode === 'rail-auto') {
        settings.navMode = 'rail-toggle';
    }
    // one shared menu width became a width per menu
    delete settings.sheetWidth;
    delete settings.rightSheetWidth;
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(settings, key)) {
            settings[key] = structuredClone(defaultSettings[key]);
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

/** Image for the open solo chat's character: a custom image if set, else the card. */
function getCharacterImageUrl() {
    const override = getCharacterImageOverride(getSettings());
    if (override) {
        return override;
    }
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
    const docked = settings.chatPosition === 'left' || settings.chatPosition === 'right'
        || document.body.classList.contains('waifuMode');
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
        // big enough images fill the full height; small ones keep their size instead of blurring
        img.addEventListener('load', () => {
            const big = img.naturalHeight >= art.clientHeight * ART_FILL_RATIO;
            art.classList.toggle('yt-art-fill', big);
        });
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
    body.classList.toggle('yt-nav-rail', settings.navMode !== 'top');
    body.classList.toggle('yt-rail-pinned', settings.navMode === 'rail');

    body.style.setProperty('--yt-accent', settings.accent);
    body.style.setProperty('--yt-accent-ink', getAccentInk(settings.accent));
    body.style.setProperty('--yt-bubble-max', `${settings.bubbleWidth}px`);
    body.style.setProperty('--yt-panel-alpha', String(settings.panelOpacity / 100));

    if (settings.font === 'default') {
        body.style.removeProperty('--yt-font');
    } else {
        body.style.setProperty('--yt-font', fonts[settings.font] ?? fonts.inter);
    }

    $('#yt_conflict_note').toggleClass('displayNone', !(settings.enabled && isMoonlitEnabled()));
    applyColors(settings);
    applyAdvanced(settings);
    placePagination(settings.enabled);
    applySheetWidths(settings);
    applyVnHeight(settings);
    updateCharacterArt();
    syncTavernHome();
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
    $('#yt_nav_mode').val(settings.navMode);
    $('#yt_tavern_home').prop('checked', settings.tavernHome);
    $('#yt_panel_opacity').val(settings.panelOpacity);
    $('#yt_panel_opacity_value').text(`${settings.panelOpacity}%`);
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
    $('#yt_tavern_home').on('change', function () {
        update('tavernHome', $(this).prop('checked'));
    });
    $('#yt_nav_mode').on('change', function () {
        update('navMode', String($(this).val()));
    });
    $('#yt_panel_opacity').on('input', function () {
        const opacity = Number($(this).val());
        $('#yt_panel_opacity_value').text(`${opacity}%`);
        update('panelOpacity', opacity);
    });
}

/** Puts every theme setting back to its default, after the user confirms. */
async function resetAllSettings() {
    const { callGenericPopup, POPUP_TYPE, extensionSettings } = SillyTavern.getContext();
    const confirmed = await callGenericPopup(
        'Reset every Yodayo Tavern Theme setting to its default? This includes colors, per-character colors, menu widths and Advanced settings. Export first if you might want them back.',
        POPUP_TYPE.CONFIRM,
    );
    if (!confirmed) {
        return;
    }
    extensionSettings[MODULE_NAME] = { ...structuredClone(defaultSettings), recentChatsDefaultsApplied: true };
    applySettings();
    syncSettingsUI();
    refreshColorControls();
    refreshAdvancedControls();
    saveSettings();
    toastr.success('All theme settings are back to their defaults.', 'Yodayo Tavern Theme');
}

/** Copies the recognised settings from an exported file and applies them. */
function importSettings(data) {
    const settings = getSettings();
    for (const [key, fallback] of Object.entries(defaultSettings)) {
        const value = data[key];
        const sameType = typeof value === typeof fallback && Array.isArray(value) === Array.isArray(fallback);
        if (value !== undefined && value !== null && sameType) {
            settings[key] = structuredClone(value);
        }
    }
    applySettings();
    syncSettingsUI();
    refreshColorControls();
    refreshAdvancedControls();
    saveSettings();
}

function setRailOpen(open) {
    document.body.classList.toggle('yt-rail-open', open);
    document.getElementById(RAIL_TOGGLE_ID)?.setAttribute('aria-expanded', String(open));
}

/** SillyTavern-logo button that opens the rail; Escape or a click elsewhere closes it again. */
function initRailToggle() {
    const button = document.createElement('button');
    button.id = RAIL_TOGGLE_ID;
    button.type = 'button';
    button.title = 'Menu';
    const logo = document.createElement('img');
    logo.src = 'img/logo.png';
    logo.alt = '';
    button.append(logo);
    button.setAttribute('aria-label', 'Menu');
    button.setAttribute('aria-controls', 'top-settings-holder');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => setRailOpen(!document.body.classList.contains('yt-rail-open')));
    document.body.append(button);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !document.querySelector('.drawer-content.openDrawer')) {
            setRailOpen(false);
        }
    });

    document.addEventListener('pointerdown', (event) => {
        if (!document.body.classList.contains('yt-rail-open') || !(event.target instanceof Element)) {
            return;
        }
        const insideRail = event.target.closest(`#top-settings-holder, #${RAIL_TOGGLE_ID}, .popup, #toast-container`);
        if (!insideRail) {
            setRailOpen(false);
        }
    });
}

/**
 * Shows up to 20 recent chats on the home page, collapsed or not. Runs once, and only
 * replaces SillyTavern's untouched defaults, so counts the user picked are kept.
 */
function applyRecentChatsDefaults() {
    const settings = getSettings();
    if (settings.recentChatsDefaultsApplied) {
        return;
    }
    const { accountStorage } = SillyTavern.getContext();
    let current = null;
    try {
        current = JSON.parse(accountStorage.getItem(RECENT_CHATS_KEY) ?? 'null');
    } catch {
        current = null;
    }
    const untouched = !current
        || (Number(current.maxDisplayed) === ST_RECENT_DEFAULTS.maxDisplayed
            && Number(current.collapsedDisplayed) === ST_RECENT_DEFAULTS.collapsedDisplayed);
    if (untouched) {
        accountStorage.setItem(RECENT_CHATS_KEY, JSON.stringify(THEME_RECENT_DEFAULTS));
    }
    settings.recentChatsDefaultsApplied = true;
    saveSettings();
}

/** Arrow at the top of a chat that closes it and returns to the home page. */
function initBackButton() {
    const sheld = document.getElementById('sheld');
    if (!sheld) {
        return;
    }
    const button = document.createElement('button');
    button.id = BACK_BUTTON_ID;
    button.type = 'button';
    button.className = 'fa-solid fa-arrow-left';
    button.title = 'Back to home';
    button.setAttribute('aria-label', 'Back to home');
    // SillyTavern's own "Close chat" option, from the burger menu
    button.addEventListener('click', () => $('#option_close_chat').trigger('click'));
    sheld.prepend(button);
}

async function init() {
    const { renderExtensionTemplateAsync } = SillyTavern.getContext();
    const container = document.getElementById('extensions_settings2');
    if (container) {
        const html = await renderExtensionTemplateAsync(EXTENSION_FOLDER, 'settings');
        $(container).append(html);
    } else {
        console.warn('[Yodayo Tavern] Extensions panel not found; the theme still applies, settings stay hidden.');
    }

    syncSettingsUI();
    bindSettingsUI();
    refreshColorControls = initColorControls({
        getSettings,
        onChange: () => {
            applySettings();
            saveSettings();
        },
    });
    initBackupControls({ getSettings, onImport: importSettings });
    refreshAdvancedControls = initAdvancedControls({
        getSettings,
        onChange: () => {
            applySettings();
            saveSettings();
        },
    });
    initSettingsPopout();
    document.getElementById('yt_reset_all')?.addEventListener('click', resetAllSettings);
    syncTavernHome = initTavernHome(() => getSettings().enabled && getSettings().tavernHome);
    applySettings();

    initRailToggle();
    initBackButton();
    applyRecentChatsDefaults();
    initSheetResizers({ getSettings, saveSettings });
    initSliderFills();
    initSwipeCounters();
    initVnMode({ getSettings, saveSettings, onModeChange: updateCharacterArt });

    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, () => {
        applySettings();
        refreshColorControls();
    });
    eventSource.on(eventTypes.CHARACTER_EDITED, updateCharacterArt);

    if (getSettings().enabled && isMoonlitEnabled()) {
        toastr.warning('Moonlit Echoes is also enabled and will override parts of the Yodayo Tavern look.', 'Yodayo Tavern Theme');
    }
}

// Start once SillyTavern has finished loading; APP_READY re-fires for late listeners.
const { eventSource: readySource, eventTypes: readyTypes } = SillyTavern.getContext();
readySource.once(readyTypes.APP_READY, init);
