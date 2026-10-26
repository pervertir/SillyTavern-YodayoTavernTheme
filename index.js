// Yodayo Tavern Theme: toggles the scoped styles in style.css and exposes a small settings panel.

import { initTavernHome } from './home.js';
import { applyPhoneNav, initPhoneNav } from './phone.js';
import { applyColors, getCharacterImageOverride, initBackupControls, initColorControls } from './colors.js';
import { applySheetWidths, initSheetResizers } from './sheets.js';
import { applyVnHeight, initVnMode } from './vn.js';
import { initSliderFills } from './sliders.js';
import { initSwipeCounters } from './swipes.js';
import { applyAdvanced, initAdvancedControls } from './advanced.js';
import { initSettingsPopout } from './popout.js';
import { placePagination } from './pagination.js';
import { initSharpAvatars, sharpenAvatars } from './avatars.js';
import { getCutout, initBackgroundRemoval, revalidateCutout } from './bgremove.js';
import { applyBackgroundOverride, getEffectiveOverrides, initCharacterSettings } from './charsettings.js';

const MODULE_NAME = 'yodayoTavernTheme';
/** Folder path under scripts/extensions/, e.g. third-party/SillyTavern-YodayoTavernTheme */
const EXTENSION_FOLDER = new URL('.', import.meta.url).pathname
    .replace(/^.*\/scripts\/extensions\//, '')
    .replace(/\/$/, '');
const BODY_CLASS = 'yodayo-tavern';
const DEFAULT_ACCENT = '#f597e8';

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
    /** Menu bar: which edge (left, right, top, bottom) and what shows it (always, menu, arrow, autohide) */
    navPosition: 'left',
    navTrigger: 'menu',
    /** Keyboard shortcut that shows or hides the menu bar, e.g. Alt+M */
    navShortcut: 'Alt+M',
    /** Phones: the menu bar's edge (bottom, top), and whether it slips away while scrolling a chat */
    phoneNav: 'bottom',
    phoneNavAutohide: true,
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
    /** Per-chat overrides from the chat's cog: { [chat id]: { colors, advanced, background } } */
    chatThemes: {},
    /** Background-removed character images: { [source URL]: { path, version } } */
    cutouts: {},
});

let syncTavernHome = () => {};
let refreshColorControls = () => {};
let refreshAdvancedControls = () => {};
let refreshCharacterSettings = () => {};

const RAIL_TOGGLE_ID = 'yt-rail-toggle';
const RAIL_ARROW_ID = 'yt-rail-arrow';
const NAV_POSITIONS = ['left', 'right', 'top', 'bottom'];
const NAV_TRIGGERS = ['always', 'menu', 'arrow', 'autohide'];
/** Arrow tab icon while the bar is hidden, per edge; it flips once the bar is out */
const ARROW_ICONS = { left: 'fa-chevron-right', right: 'fa-chevron-left', top: 'fa-chevron-down', bottom: 'fa-chevron-up' };
const ARROW_ICONS_OPEN = { left: 'fa-chevron-left', right: 'fa-chevron-right', top: 'fa-chevron-up', bottom: 'fa-chevron-down' };
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
    // the single Navigation setting became a position plus a trigger
    if (settings.navMode !== undefined) {
        const legacy = { 'rail-toggle': ['left', 'menu'], 'rail-auto': ['left', 'autohide'], rail: ['left', 'always'], top: ['top', 'always'] };
        [settings.navPosition, settings.navTrigger] = legacy[settings.navMode] ?? ['left', 'menu'];
        delete settings.navMode;
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
    const override = getEffectiveOverrides(getSettings()).image || getCharacterImageOverride(getSettings());
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
    const source = settings.enabled && settings.characterArt && docked ? getCharacterImageUrl() : null;
    // the cutout once it's ready; the original meanwhile
    const url = source && getEffectiveOverrides(settings).removeBg
        ? getCutout(source, () => {
            updateCharacterArt();
            refreshCharacterSettings();
        }) ?? source
        : source;

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
    body.classList.add('yt-nav-rail');
    for (const position of NAV_POSITIONS) {
        body.classList.toggle(`yt-nav-${position}`, settings.navPosition === position);
    }
    for (const trigger of NAV_TRIGGERS) {
        body.classList.toggle(`yt-nav-${trigger}`, settings.navTrigger === trigger);
    }
    updateRailArrow();
    applyPhoneNav();

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
    const overrides = getEffectiveOverrides(settings);
    applyColors(settings, overrides.colors);
    applyAdvanced({ ...settings, advanced: { ...settings.advanced, ...overrides.advanced } });
    applyBackgroundOverride(settings);
    // avatar size may have changed
    requestAnimationFrame(() => sharpenAvatars());
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
    $('#yt_nav_position').val(settings.navPosition);
    $('#yt_nav_trigger').val(settings.navTrigger);
    $('#yt_nav_shortcut').val(settings.navShortcut);
    $('#yt_phone_nav').val(settings.phoneNav);
    $('#yt_phone_nav_autohide').prop('checked', settings.phoneNavAutohide);
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
    $('#yt_nav_position').on('change', function () {
        setRailOpen(false);
        update('navPosition', String($(this).val()));
    });
    $('#yt_nav_trigger').on('change', function () {
        setRailOpen(false);
        update('navTrigger', String($(this).val()));
    });
    $('#yt_nav_shortcut').on('input', function () {
        update('navShortcut', String($(this).val()).trim());
    });
    $('#yt_phone_nav').on('change', function () {
        update('phoneNav', String($(this).val()));
    });
    $('#yt_phone_nav_autohide').on('change', function () {
        update('phoneNavAutohide', $(this).prop('checked'));
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
    document.getElementById(RAIL_ARROW_ID)?.setAttribute('aria-expanded', String(open));
    updateRailArrow();
}

/** Points the arrow tab toward the bar when it's hidden, and back toward the edge when it's out. */
function updateRailArrow() {
    const arrow = document.getElementById(RAIL_ARROW_ID);
    if (!arrow) {
        return;
    }
    const position = getSettings().navPosition;
    const open = document.body.classList.contains('yt-rail-open');
    arrow.className = `fa-solid ${(open ? ARROW_ICONS_OPEN : ARROW_ICONS)[position] ?? 'fa-chevron-right'}`;
}

/** Does a keydown match a shortcut written like "Alt+M" or "Ctrl+Shift+K"? */
function matchesShortcut(event, shortcut) {
    const parts = String(shortcut || '').split('+').map(part => part.trim().toLowerCase()).filter(Boolean);
    const key = parts.pop();
    if (!key) {
        return false;
    }
    const wants = {
        alt: parts.includes('alt') || parts.includes('option'),
        ctrl: parts.includes('ctrl') || parts.includes('control'),
        shift: parts.includes('shift'),
        meta: parts.includes('meta') || parts.includes('cmd'),
    };
    if (event.altKey !== wants.alt || event.ctrlKey !== wants.ctrl || event.shiftKey !== wants.shift || event.metaKey !== wants.meta) {
        return false;
    }
    // Alt changes the typed character on macOS, so compare the physical key too
    const code = event.code.toLowerCase().replace(/^key|^digit/, '');
    return event.key.toLowerCase() === key || code === key;
}

/** SillyTavern-logo button and arrow tab that open the bar; Escape or a click elsewhere closes it again. */
function initRailToggle() {
    const arrow = document.createElement('button');
    arrow.id = RAIL_ARROW_ID;
    arrow.type = 'button';
    arrow.title = 'Menu';
    arrow.setAttribute('aria-label', 'Menu');
    arrow.setAttribute('aria-controls', 'top-settings-holder');
    arrow.setAttribute('aria-expanded', 'false');
    arrow.addEventListener('click', () => setRailOpen(!document.body.classList.contains('yt-rail-open')));
    document.body.append(arrow);
    updateRailArrow();

    document.addEventListener('keydown', (event) => {
        const settings = getSettings();
        if (settings.enabled && settings.navTrigger !== 'always' && matchesShortcut(event, settings.navShortcut)) {
            event.preventDefault();
            setRailOpen(!document.body.classList.contains('yt-rail-open'));
        }
    });

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
        const insideRail = event.target.closest(`#top-settings-holder, #${RAIL_TOGGLE_ID}, #${RAIL_ARROW_ID}, .popup, #toast-container`);
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

const POSITIONS = Object.freeze([
    { value: 'left', icon: 'fa-arrow-left', label: 'Chat on the left' },
    { value: 'middle', icon: 'fa-arrow-down', label: 'Chat in the middle' },
    { value: 'right', icon: 'fa-arrow-right', label: 'Chat on the right' },
]);

/** Round arrow button to the left of the message box, like Yodayo's, that moves the chat left, middle or right. */
function initPositionToggle() {
    const formSheld = document.getElementById('form_sheld');
    if (!formSheld) {
        return;
    }
    const wrap = document.createElement('div');
    wrap.id = 'yt-position-toggle';

    const button = document.createElement('div');
    button.className = 'yt-position-button fa-solid interactable';
    button.tabIndex = 0;
    button.setAttribute('role', 'button');
    button.setAttribute('aria-haspopup', 'true');

    const menu = document.createElement('div');
    menu.className = 'yt-position-menu';
    menu.hidden = true;
    for (const position of POSITIONS) {
        const option = document.createElement('div');
        option.className = `yt-position-option fa-solid ${position.icon} interactable`;
        option.title = position.label;
        option.tabIndex = 0;
        option.setAttribute('role', 'button');
        option.dataset.value = position.value;
        const choose = (event) => {
            event.stopPropagation();
            getSettings().chatPosition = position.value;
            applySettings();
            syncSettingsUI();
            saveSettings();
            menu.hidden = true;
            refresh();
        };
        option.addEventListener('click', choose);
        option.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                choose(event);
            }
        });
        menu.append(option);
    }

    const refresh = () => {
        const current = POSITIONS.find(p => p.value === getSettings().chatPosition) ?? POSITIONS[1];
        button.className = `yt-position-button fa-solid ${current.icon} interactable`;
        button.title = `${current.label} (click to change)`;
        for (const option of menu.children) {
            option.classList.toggle('active', option.dataset.value === current.value);
        }
    };

    const toggle = (event) => {
        event.stopPropagation();
        menu.hidden = !menu.hidden;
    };
    button.addEventListener('click', toggle);
    button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            toggle(event);
        }
    });
    document.addEventListener('click', (event) => {
        if (!wrap.contains(/** @type {Node} */ (event.target))) {
            menu.hidden = true;
        }
    });

    wrap.append(button, menu);
    formSheld.append(wrap);
    refresh();
    $('#yt_chat_position').on('change', refresh);
}

/** Arrow at the top of a chat that closes it and returns to the home page. */
/**
 * SillyTavern imports any image file dropped on the page as a character, and an image
 * dragged from the page itself (a card, an avatar) counts too, which made copies of
 * characters. Drags that start on the page are dropped before SillyTavern sees them; files
 * dragged in from outside still import as before.
 */
function initDragGuard() {
    let dragFromPage = false;
    document.addEventListener('dragstart', () => { dragFromPage = true; }, true);
    document.addEventListener('dragend', () => { dragFromPage = false; }, true);
    for (const type of ['dragenter', 'dragover', 'drop']) {
        document.addEventListener(type, (event) => {
            if (!dragFromPage || !getSettings().enabled) {
                return;
            }
            // a plain text field still takes a dragged selection
            if (event.target instanceof HTMLElement && event.target.closest('textarea, input, [contenteditable="true"]')) {
                return;
            }
            event.stopImmediatePropagation();
            if (type === 'drop') {
                event.preventDefault();
                dragFromPage = false;
            }
        }, true);
    }
}

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

/** Resolves once style.css and every stylesheet it imports have loaded (3s at most). */
async function waitForStyles() {
    const deadline = Date.now() + 3000;
    const loaded = () => {
        const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find(l => l.href.includes(`${EXTENSION_FOLDER.split('/').pop()}/style.css`));
        if (!link?.sheet) {
            return false;
        }
        try {
            return [...link.sheet.cssRules].every(rule => !(rule instanceof CSSImportRule) || rule.styleSheet?.cssRules);
        } catch {
            return true;
        }
    };
    while (!loaded() && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 25));
    }
}

async function init() {
    // SillyTavern awaits this before lifting its loading screen, so the old look never shows
    await waitForStyles();
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
    // the chat field blur lives on its own layer: #sheld clips its overflow, so a blur
    // that spills past the chat's edges can't be part of it
    if (!document.getElementById('yt-chat-blur')) {
        const blur = document.createElement('div');
        blur.id = 'yt-chat-blur';
        document.body.append(blur);
    }

    initSharpAvatars(() => getSettings().enabled);
    initBackgroundRemoval({ getSettings, saveSettings });

    refreshCharacterSettings = initCharacterSettings({
        getSettings,
        onChange: () => {
            applySettings();
            saveSettings();
        },
    });
    document.getElementById('yt_reset_all')?.addEventListener('click', resetAllSettings);
    syncTavernHome = initTavernHome(() => getSettings().enabled && getSettings().tavernHome);
    applySettings();

    initRailToggle();
    initPhoneNav(getSettings);
    initBackButton();
    initDragGuard();
    initPositionToggle();
    applyRecentChatsDefaults();
    initSheetResizers({ getSettings, saveSettings });
    initSliderFills();
    initSwipeCounters();
    initVnMode({ getSettings, saveSettings, onModeChange: updateCharacterArt });

    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, () => {
        applySettings();
        refreshColorControls();
        refreshCharacterSettings();
    });
    eventSource.on(eventTypes.CHARACTER_EDITED, async () => {
        // a new avatar keeps the same file name, so its old cutout may be stale
        const { characters, characterId } = SillyTavern.getContext();
        const avatar = characters[characterId]?.avatar;
        if (avatar) {
            await revalidateCutout(`characters/${encodeURIComponent(avatar)}`);
        }
        updateCharacterArt();
    });

    if (getSettings().enabled && isMoonlitEnabled()) {
        toastr.warning('Moonlit Echoes is also enabled and will override parts of the Yodayo Tavern look.', 'Yodayo Tavern Theme');
    }
}

// Start while SillyTavern's loading screen is still up: it waits for APP_INITIALIZED
// listeners before fading the screen out (APP_READY only fires after). Both events re-fire
// for late listeners, so a theme enabled later still starts.
const { eventSource: readySource, eventTypes: readyTypes } = SillyTavern.getContext();
readySource.once(readyTypes.APP_INITIALIZED, init);
