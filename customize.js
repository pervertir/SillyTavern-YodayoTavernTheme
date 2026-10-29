// Customize: one page to change every element of the theme, with a live preview on top.
// Sections follow the shape shared by pervertir's SillyTavern themes: Colors, Text, Shape,
// Spacing, Layout, Messages, Chat background, Motion, Advanced.
//
// Each control edits one of:
//   token    a CSS custom property, kept in settings.customize.tokens and set on <body>
//   setting  a top-level theme setting (accent, font, bubble width…)
//   advanced an Advanced setting (advanced.js), so the panel and this page stay in step
//   color    a chat color (colors.js), the universal one; per-character colors still win
//   hide     a Layout flag, hide-<part> in settings.customize.flags, which hides that part
//
// The stored and exported shape is the one pervertir's themes share
// (AI/shared/customize-spec.md): { tokens, flags, css }, exported with themeId and version.
// Controls that live in other settings travel in flags under their own key.
// Everything applies live through the theme's own apply step.

import { ADVANCED_GROUPS } from './advanced.js';
import { COLOR_FIELDS } from './colors.js';

const THEME_ID = 'yodayo-tavern';
const VERSION = 1;
const HIDE_STYLE_ID = 'yt-customize-hide';

const ADVANCED = Object.fromEntries(ADVANCED_GROUPS.flatMap(group => group.items).map(item => [item.key, item]));

/** Elements the Layout section can hide, with the selectors that make them up */
const HIDEABLE = [
    ['homeRecent', 'Home: recent chats', '.yt-home-divider-recent, .yt-home-recent'],
    ['homeChips', 'Home: tag chips', '.yt-home-chips'],
    ['homeSort', 'Home: sort order', '.yt-home-sort'],
    ['homeActions', 'Home: Create, New group and Import', '.yt-home-actions .yt-home-action'],
    ['homeSearch', 'Home: search', '.yt-home-search'],
    ['homeAssistantTab', 'Home: ST Assistant tab', '.yt-home-tab'],
    ['homeAssistant', 'Home: welcome assistant beside the Tavern window', '#yt-home-assistant'],
    ['cardStat', 'Home cards: last chat time', '.yt-card-stat'],
    ['cardMeta', 'Home cards: creator and tags', '.yt-card-meta'],
    ['cardDelete', 'Home cards: delete button', '.yt-card-delete'],
    ['homeAbout', 'Home: info button', '.yt-home-about'],
    ['backButton', 'Chat: back to home button', '#yt-back-home'],
    ['chatCog', 'Chat: look editor button', '#yt-chat-settings-cog'],
    ['positionToggle', 'Chat: position button by the message box', '#yt-position-toggle'],
    ['mesAvatars', 'Messages: avatars', '#chat .mes .mesAvatarWrapper'],
    ['mesNames', 'Messages: names', '#chat .mes .ch_name .name_text'],
    ['mesButtons', 'Messages: action buttons', '#chat .mes .mes_buttons'],
    ['swipeArrows', 'Messages: swipe arrows and counter', '#chat .swipe_left, #chat .swipeRightBlock'],
    ['menuLogo', 'Menu bar: SillyTavern logo button', '#yt-rail-toggle'],
];

const px = (min, max, step = 1) => ({ kind: 'number', unit: 'px', min, max, step });

/** The page. Defaults come from css/tokens.css, the theme settings and advanced.js. */
const SECTIONS = [
    {
        id: 'colors', title: 'Colors', controls: [
            { type: 'setting', key: 'accent', label: 'Accent', kind: 'color', def: '#f597e8' },
            { type: 'advanced', key: 'accent2', label: 'Secondary accent' },
            { type: 'token', key: '--yt-accent-ink', label: 'Text on the accent', kind: 'color', def: '#1a1a1a' },
            { type: 'token', key: '--yt-bg', label: 'Page background', kind: 'color', def: '#1a1c1e' },
            { type: 'token', key: '--yt-surface', label: 'Surface', kind: 'color', def: '#232527' },
            { type: 'token', key: '--yt-surface-2', label: 'Raised surface', kind: 'color', def: '#2c2e30' },
            { type: 'token', key: '--yt-surface-3', label: 'Highest surface (hover, chips)', kind: 'color', def: '#36393b' },
            { type: 'advanced', key: 'menuBg', label: 'Menus and Tavern window' },
            { type: 'advanced', key: 'menuBg2', label: 'Popovers and cards' },
            { type: 'advanced', key: 'railBg', label: 'Menu bar' },
            { type: 'advanced', key: 'iconColor', label: 'Menu icons' },
            { type: 'token', key: '--yt-text', label: 'Text', kind: 'color', def: '#f0f0f0' },
            { type: 'token', key: '--yt-muted', label: 'Secondary text', kind: 'color', def: '#a8a8a8' },
            { type: 'token', key: '--yt-faint', label: 'Faint text', kind: 'color', def: '#6f7276' },
            { type: 'token', key: '--yt-line', label: 'Hairlines', kind: 'rgba', def: ['#e6e6e6', 10] },
            { type: 'token', key: '--yt-line-strong', label: 'Strong borders', kind: 'rgba', def: ['#e6e6e6', 18] },
            { type: 'advanced', key: 'scrollbar', label: 'Scrollbars' },
            { type: 'token', key: '--yt-success', label: 'Success', kind: 'color', def: '#4ade80' },
            { type: 'token', key: '--yt-warning', label: 'Warning', kind: 'color', def: '#fbbf24' },
            { type: 'token', key: '--yt-danger', label: 'Danger', kind: 'color', def: '#f87171' },
        ],
    },
    {
        id: 'text', title: 'Text', controls: [
            {
                type: 'setting', key: 'font', label: 'Font', kind: 'select', def: 'inter',
                options: [['inter', 'Inter (system font if missing)'], ['system', 'System UI font'], ['default', "SillyTavern's font"]],
            },
            { type: 'token', key: '--yt-font', label: 'Custom font family (overrides the above)', kind: 'text', def: '', placeholder: 'e.g. "Nunito", sans-serif' },
            { type: 'token', key: '--yt-text-md', label: 'Body text', ...px(11, 22), def: 14 },
            { type: 'token', key: '--yt-text-sm', label: 'Small text', ...px(10, 20), def: 13 },
            { type: 'token', key: '--yt-text-xs', label: 'Smallest text', ...px(9, 18), def: 12 },
            { type: 'advanced', key: 'textSize', label: 'Message text' },
            { type: 'advanced', key: 'lineHeight', label: 'Message line height' },
            { type: 'advanced', key: 'letterSpacing', label: 'Message letter spacing' },
            { type: 'advanced', key: 'charNameSize', label: 'Character name' },
            { type: 'advanced', key: 'userNameSize', label: 'Your name' },
        ],
    },
    {
        id: 'shape', title: 'Shape', controls: [
            { type: 'advanced', key: 'noRadius', label: 'Square corners everywhere' },
            { type: 'token', key: '--yt-bubble-radius', label: 'Chat bubble corners', ...px(0, 32), def: 16 },
            { type: 'token', key: '--yt-radius-sm', label: 'Smallest corners (tags, keys)', ...px(0, 16), def: 4 },
            { type: 'token', key: '--yt-radius', label: 'Corners (buttons, fields)', ...px(0, 24), def: 6 },
            { type: 'token', key: '--yt-radius-md', label: 'Medium corners', ...px(0, 24), def: 8 },
            { type: 'token', key: '--yt-radius-lg', label: 'Large corners (cards, sections)', ...px(0, 32), def: 12 },
            { type: 'token', key: '--yt-radius-xl', label: 'Largest corners (menus, windows)', ...px(0, 40), def: 16 },
            { type: 'token', key: '--yt-control-h', label: 'Field and button height', ...px(24, 48), def: 34 },
            { type: 'advanced', key: 'avatarSize', label: 'Chat avatar size' },
            { type: 'advanced', key: 'hideAvatarBorder', label: 'No avatar border' },
            { type: 'token', key: '--yt-panel-blur', label: 'Frosted glass blur', ...px(0, 48), def: 24 },
            { type: 'token', key: '--yt-shadow', label: 'Menu and window shadow (CSS)', kind: 'text', def: '0 12px 32px rgba(0, 0, 0, 0.45)' },
        ],
    },
    {
        id: 'spacing', title: 'Spacing', controls: [
            { type: 'token', key: '--yt-space-1', label: 'Extra small', ...px(0, 12), def: 4 },
            { type: 'token', key: '--yt-space-2', label: 'Small', ...px(0, 20), def: 8 },
            { type: 'token', key: '--yt-space-3', label: 'Medium', ...px(0, 28), def: 12 },
            { type: 'token', key: '--yt-space-4', label: 'Large', ...px(0, 36), def: 16 },
            { type: 'token', key: '--yt-space-5', label: 'Extra large', ...px(0, 48), def: 24 },
            { type: 'setting', key: 'bubbleWidth', label: 'Chat bubble max width', ...px(360, 1400, 10), def: 720 },
            { type: 'advanced', key: 'pTop', label: 'Paragraph spacing above' },
            { type: 'advanced', key: 'pBottom', label: 'Paragraph spacing below' },
            { type: 'advanced', key: 'desktopInputSpacing', label: 'More room around the message box (desktop)' },
            { type: 'advanced', key: 'mobileInputSpacing', label: 'More room around the message box (phones)' },
        ],
    },
    {
        id: 'layout', title: 'Layout', note: 'Show or hide individual parts of the theme.', controls: [
            { type: 'setting', key: 'tavernHome', label: 'Tavern home page', kind: 'checkbox', def: true },
            { type: 'setting', key: 'characterArt', label: 'Character image beside a docked chat', kind: 'checkbox', def: true },
            {
                type: 'setting', key: 'chatPosition', label: 'Chat position', kind: 'select', def: 'middle',
                options: [['left', 'Left'], ['middle', 'Middle'], ['right', 'Right']],
            },
            {
                type: 'setting', key: 'navPosition', label: 'Menu bar position', kind: 'select', def: 'left',
                options: [['left', 'Left'], ['right', 'Right'], ['top', 'Top'], ['bottom', 'Bottom']],
            },
            {
                type: 'setting', key: 'phoneNav', label: 'Menu bar on phones', kind: 'select', def: 'bottom',
                options: [['bottom', 'Bottom'], ['top', 'Top']],
            },
            ...HIDEABLE.map(([key, label]) => ({ type: 'hide', key, label })),
        ],
    },
    {
        id: 'messages', title: 'Messages', controls: [
            ...COLOR_FIELDS.map(field => ({ type: 'color', key: field.key, label: `${field.group}: ${field.label}` })),
            { type: 'setting', key: 'panelOpacity', label: 'Bubble and message box opacity', kind: 'number', unit: '%', min: 0, max: 100, step: 1, def: 80 },
            {
                type: 'setting', key: 'userSide', label: 'Your messages', kind: 'select', def: 'right',
                options: [['right', 'On the right'], ['left', 'On the left']],
            },
            { type: 'advanced', key: 'justify', label: 'Justify message text' },
            { type: 'advanced', key: 'hideDetails', label: 'Hide message details until hover' },
            { type: 'advanced', key: 'favSymbol', label: 'Favorite symbol' },
            { type: 'advanced', key: 'contextMarker', label: 'Context limit marker (CSS border)' },
            { type: 'advanced', key: 'chatFade', label: 'Fade chat edges' },
        ],
    },
    {
        id: 'background', title: 'Chat Background', controls: [
            { type: 'setting', key: 'flatBackground', label: 'Hide the background image', kind: 'checkbox', def: false },
            { type: 'advanced', key: 'bgBlur', label: 'Background blur' },
            { type: 'advanced', key: 'bgOpacity', label: 'Background image opacity' },
            { type: 'advanced', key: 'chatFieldBg', label: 'Chat field tint' },
            { type: 'advanced', key: 'chatFieldBlur', label: 'Chat field blur' },
            { type: 'advanced', key: 'chatFieldFeather', label: 'Chat field blur feather' },
            { type: 'advanced', key: 'mobileChatFieldBlur', label: 'Chat field blur on phones' },
        ],
    },
    {
        id: 'motion', title: 'Motion', controls: [
            { type: 'token', key: '--yt-fast', label: 'Quick transitions', kind: 'number', unit: 'ms', min: 0, max: 600, step: 10, def: 150 },
            { type: 'token', key: '--yt-slow', label: 'Slow transitions (menus, sheets)', kind: 'number', unit: 'ms', min: 0, max: 1000, step: 10, def: 250 },
            { type: 'advanced', key: 'noRailAnimation', label: 'No menu animations' },
            { type: 'advanced', key: 'favAnimation', label: 'Animate the favorite symbol' },
            { type: 'advanced', key: 'detailsDuration', label: 'Message details fade time' },
        ],
    },
    {
        id: 'advanced', title: 'Advanced', note: 'Extra CSS, applied after the theme. Start selectors with body.yodayo-tavern so it only applies while the theme is on.', controls: [
            { type: 'advanced', key: 'rawCss', label: 'Custom CSS' },
        ],
    },
];

let api = null;

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

function customizeState(settings) {
    settings.customize ??= {};
    settings.customize.tokens ??= {};
    settings.customize.flags ??= {};
    // the first version kept Layout flags under hide
    for (const [key, on] of Object.entries(settings.customize.hide ?? {})) {
        if (on) {
            settings.customize.flags[`hide-${key}`] = true;
        }
    }
    delete settings.customize.hide;
    return settings.customize;
}

function hexToRgb(hex) {
    const value = parseInt(String(hex).slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** The control's description, with an Advanced item's own type, range and default */
function describe(control) {
    if (control.type === 'advanced') {
        const item = ADVANCED[control.key];
        const kind = { color: 'color', rgba: 'rgba', number: 'number', checkbox: 'checkbox', select: 'select', text: 'text', textarea: 'textarea' }[item.type];
        return { ...item, ...control, kind, def: item.def };
    }
    if (control.type === 'color') {
        return { ...control, kind: 'color', def: null };
    }
    if (control.type === 'hide') {
        return { ...control, kind: 'checkbox', def: false };
    }
    return control;
}

function getValue(control) {
    const settings = api.getSettings();
    const state = customizeState(settings);
    switch (control.type) {
        case 'token': return state.tokens[control.key] ?? control.def;
        case 'setting': return settings[control.key] ?? control.def;
        case 'advanced': return settings.advanced?.[control.key] ?? control.def;
        case 'color': return settings.colors?.[control.key] ?? null;
        case 'hide': return Boolean(state.flags[`hide-${control.key}`]);
    }
    return undefined;
}

function setValue(control, value) {
    const settings = api.getSettings();
    const state = customizeState(settings);
    const isDefault = JSON.stringify(value) === JSON.stringify(control.def);
    switch (control.type) {
        case 'token':
            if (isDefault || value === '' || value === null) {
                delete state.tokens[control.key];
            } else {
                state.tokens[control.key] = value;
            }
            break;
        case 'setting':
            settings[control.key] = value;
            break;
        case 'advanced':
            settings.advanced ??= {};
            if (isDefault) {
                delete settings.advanced[control.key];
            } else {
                settings.advanced[control.key] = value;
            }
            break;
        case 'color':
            settings.colors ??= {};
            if (value === null) {
                delete settings.colors[control.key];
            } else {
                settings.colors[control.key] = value;
            }
            break;
        case 'hide':
            if (value) {
                state.flags[`hide-${control.key}`] = true;
            } else {
                delete state.flags[`hide-${control.key}`];
            }
            break;
    }
}

function isChanged(control) {
    const value = getValue(control);
    if (control.type === 'color') {
        return value !== null;
    }
    return JSON.stringify(value) !== JSON.stringify(control.def);
}

/** CSS for one token's stored value */
function tokenCss(control, value) {
    if (control.kind === 'rgba') {
        const [r, g, b] = hexToRgb(value[0]);
        return `rgb(${r} ${g} ${b} / ${Number(value[1]) / 100})`;
    }
    if (control.kind === 'number') {
        return `${value}${control.unit ?? ''}`;
    }
    return String(value);
}

/** The shared rule for tokens: a plain custom property name, and no value that breaks out */
function isSafeToken(name, value) {
    return /^--[a-zA-Z0-9-]+$/.test(name) && !/[;{}<>]/.test(String(value));
}

const TOKEN_CONTROLS = SECTIONS.flatMap(section => section.controls).filter(control => control.type === 'token');
let appliedTokens = new Set();

/**
 * Writes the custom tokens and hidden elements to the page. index.js calls this at the end
 * of every apply, so tokens it also sets on <body> (the font) take the custom value.
 */
export function applyCustomize(settings) {
    const body = document.body;
    const state = customizeState(settings);
    const enabled = settings.enabled;
    const next = new Set();
    for (const control of TOKEN_CONTROLS) {
        const value = state.tokens[control.key];
        if (enabled && value !== undefined && value !== '' && isSafeToken(control.key, tokenCss(control, value))) {
            body.style.setProperty(control.key, tokenCss(control, value));
            next.add(control.key);
        } else if (appliedTokens.has(control.key)) {
            body.style.removeProperty(control.key);
        }
    }
    appliedTokens = next;

    let style = document.getElementById(HIDE_STYLE_ID);
    if (!enabled) {
        style?.remove();
        return;
    }
    if (!style) {
        style = el('style');
        style.id = HIDE_STYLE_ID;
        document.head.append(style);
    }
    const hidden = HIDEABLE.filter(([key]) => state.flags[`hide-${key}`]).flatMap(([, , selectors]) => selectors.split(',').map(s => `body.yodayo-tavern ${s.trim()}`));
    style.textContent = enabled && hidden.length ? `${hidden.join(',\n')} { display: none !important; }` : '';
}

/** One row: label, control, reset. Returns the row, its control and a refresh function. */
function buildRow(raw, onChange) {
    const control = describe(raw);
    const row = el('div', 'yt-cz-row');
    const label = el('label', 'yt-cz-label', control.label);
    const field = el('div', 'yt-cz-field');
    const reset = el('button', 'yt-cz-reset fa-solid fa-rotate-left');
    reset.type = 'button';
    reset.title = 'Reset to default';
    let refresh = () => {};

    const commit = (value) => {
        setValue(control, value);
        onChange();
        row.classList.toggle('yt-cz-changed', isChanged(control));
    };

    switch (control.kind) {
        case 'color': {
            const input = el('input');
            input.type = 'color';
            input.addEventListener('input', () => commit(input.value));
            field.append(input);
            refresh = () => {
                const value = getValue(control);
                const fallback = control.type === 'color'
                    ? getComputedStyle(document.body).getPropertyValue(COLOR_FIELDS.find(f => f.key === control.key).cssVar).trim()
                    : control.def;
                input.value = /^#[0-9a-f]{6}$/i.test(value ?? '') ? value : (/^#[0-9a-f]{6}$/i.test(fallback) ? fallback : '#000000');
            };
            break;
        }
        case 'rgba': {
            const input = el('input');
            input.type = 'color';
            const alpha = el('input');
            alpha.type = 'range';
            alpha.min = '0';
            alpha.max = '100';
            alpha.title = 'Opacity';
            const out = el('span', 'yt-cz-value');
            const read = () => [input.value, Number(alpha.value)];
            input.addEventListener('input', () => commit(read()));
            alpha.addEventListener('input', () => { out.textContent = `${alpha.value}%`; commit(read()); });
            field.append(input, alpha, out);
            refresh = () => {
                const [hex, a] = getValue(control);
                input.value = hex;
                alpha.value = String(a);
                out.textContent = `${a}%`;
            };
            break;
        }
        case 'number': {
            const range = el('input');
            range.type = 'range';
            const number = el('input', 'text_pole');
            number.type = 'number';
            for (const input of [range, number]) {
                input.min = String(control.min ?? 0);
                input.max = String(control.max ?? 100);
                input.step = String(control.step ?? 1);
                input.addEventListener('input', () => {
                    const value = Number(input.value);
                    if (Number.isFinite(value)) {
                        (input === range ? number : range).value = String(value);
                        commit(value);
                    }
                });
            }
            field.append(range, number, el('span', 'yt-cz-unit', control.unit ?? ''));
            refresh = () => {
                const value = getValue(control);
                range.value = String(value);
                number.value = String(value);
            };
            break;
        }
        case 'checkbox': {
            const input = el('input');
            input.type = 'checkbox';
            // Layout rows read "show": a hide flag is shown unticked
            const inverted = control.type === 'hide';
            input.addEventListener('change', () => commit(inverted ? !input.checked : input.checked));
            field.append(input);
            label.htmlFor = input.id = `yt-cz-${control.type}-${control.key}`;
            refresh = () => { input.checked = inverted ? !getValue(control) : Boolean(getValue(control)); };
            break;
        }
        case 'select': {
            const select = el('select', 'text_pole');
            for (const [value, text] of control.options) {
                const option = el('option', '', text);
                option.value = value;
                select.append(option);
            }
            select.addEventListener('change', () => commit(select.value));
            field.append(select);
            refresh = () => { select.value = String(getValue(control)); };
            break;
        }
        case 'textarea': {
            const area = el('textarea', 'text_pole yt-cz-css');
            area.rows = 8;
            area.spellcheck = false;
            area.placeholder = 'body.yodayo-tavern #chat .mes_text { … }';
            area.addEventListener('input', () => commit(area.value));
            field.append(area);
            row.classList.add('yt-cz-wide');
            refresh = () => { if (area !== document.activeElement) area.value = getValue(control); };
            break;
        }
        default: {
            const input = el('input', 'text_pole');
            input.type = 'text';
            input.placeholder = control.placeholder ?? '';
            input.addEventListener('input', () => commit(input.value));
            field.append(input);
            refresh = () => { if (input !== document.activeElement) input.value = getValue(control) ?? ''; };
        }
    }

    reset.addEventListener('click', () => {
        commit(control.type === 'color' ? null : structuredClone(control.def));
        refresh();
    });
    row.append(label, field, reset);
    const fullRefresh = () => {
        refresh();
        row.classList.toggle('yt-cz-changed', isChanged(control));
    };
    fullRefresh();
    return { control, refresh: fullRefresh, element: row };
}

/** A small mock of the theme, styled by the same tokens, so changes show as you make them */
function buildPreview() {
    const preview = el('div', 'yt-cz-preview');
    preview.setAttribute('aria-hidden', 'true');
    preview.innerHTML = `
        <div class="yt-cz-pv-rail"><i class="fa-solid fa-sliders"></i><i class="fa-solid fa-plug"></i><i class="fa-solid fa-palette"></i><i class="fa-solid fa-id-card"></i></div>
        <div class="yt-cz-pv-window">
            <div class="yt-cz-pv-tabs"><b>Tavern</b><span>ST Assistant</span><span class="yt-cz-pv-search"><i class="fa-solid fa-magnifying-glass"></i> Search</span></div>
            <div class="yt-cz-pv-cards"><div class="yt-cz-pv-card"><div></div><b>Character</b><small>by you</small></div><div class="yt-cz-pv-card"><div></div><b>Another</b><small>2 tags</small></div></div>
        </div>
        <div class="yt-cz-pv-chat">
            <div class="yt-cz-pv-mes"><div class="yt-cz-pv-avatar"></div><div class="yt-cz-pv-bubble yt-cz-pv-char"><b>Character</b><p><em>She waves.</em> <q>Hello there!</q> How are you today?</p></div></div>
            <div class="yt-cz-pv-mes yt-cz-pv-user"><div class="yt-cz-pv-bubble"><b>You</b><p>Doing well, thanks!</p></div></div>
            <div class="yt-cz-pv-composer"><span>Type a message…</span><i class="fa-solid fa-paper-plane"></i></div>
        </div>`;
    return preview;
}

/** A control's value as a shared-format flag: true, or a string; null when at its default */
function toFlag(control, value) {
    if (!isChanged(control)) {
        return null;
    }
    if (value === true) {
        return true;
    }
    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }
    return String(value);
}

function fromFlag(control, flag) {
    switch (control.kind) {
        case 'checkbox': return flag === true || flag === 'true';
        case 'number': {
            const value = Number(flag);
            return Number.isFinite(value) ? value : undefined;
        }
        case 'rgba': {
            try {
                const value = JSON.parse(flag);
                return Array.isArray(value) && /^#[0-9a-f]{6}$/i.test(value[0]) ? [value[0], Number(value[1])] : undefined;
            } catch {
                return undefined;
            }
        }
        case 'color': return /^#[0-9a-f]{6}$/i.test(String(flag)) ? String(flag) : undefined;
        case 'select': return control.options.some(([option]) => option === String(flag)) ? String(flag) : undefined;
        default: return String(flag);
    }
}

const ALL_CONTROLS = SECTIONS.flatMap(section => section.controls).map(describe);
const CSS_CONTROL = ALL_CONTROLS.find(control => control.type === 'advanced' && control.key === 'rawCss');

/** The current customization in the shared format */
function toSharedFormat() {
    const state = customizeState(api.getSettings());
    const flags = {};
    for (const control of ALL_CONTROLS) {
        if (control.type === 'token' || control === CSS_CONTROL) {
            continue;
        }
        const flag = control.type === 'hide' ? (getValue(control) || null) : toFlag(control, getValue(control));
        if (flag !== null) {
            flags[control.type === 'hide' ? `hide-${control.key}` : control.key] = flag;
        }
    }
    return {
        themeId: THEME_ID,
        version: VERSION,
        // tokens travel as CSS strings
        tokens: Object.fromEntries(Object.entries(state.tokens).map(([key, value]) => {
            const control = TOKEN_CONTROLS.find(item => item.key === key);
            return [key, control ? tokenCss(control, value) : String(value)];
        })),
        flags,
        css: getValue(CSS_CONTROL) ?? '',
    };
}

function exportCustomization() {
    const blob = new Blob([JSON.stringify(toSharedFormat(), null, 2)], { type: 'application/json' });
    const link = el('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'yodayo-tavern-customize.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Replaces the customization with a shared-format file; keeps only what this theme knows. */
function importCustomization(data, rows, onChange) {
    if (!data || typeof data !== 'object' || !data.themeId || typeof data.tokens !== 'object') {
        toastr.error('This is not a theme customization file.', 'Yodayo Tavern Theme');
        return;
    }
    resetControls(ALL_CONTROLS, () => {});
    let kept = 0;
    for (const control of ALL_CONTROLS) {
        let value;
        if (control.type === 'token') {
            const raw = data.tokens[control.key];
            if (raw === undefined || !isSafeToken(control.key, raw)) {
                continue;
            }
            value = control.kind === 'number' ? parseFloat(raw) : control.kind === 'rgba' ? undefined : raw;
            if (control.kind === 'rgba') {
                const match = String(raw).match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)\s*(?:[/,]\s*([\d.]+))?/);
                if (match) {
                    const hex = `#${[match[1], match[2], match[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('')}`;
                    value = [hex, Math.round(Number(match[4] ?? 1) * 100)];
                } else if (Array.isArray(raw)) {
                    value = raw;
                }
            }
        } else if (control === CSS_CONTROL) {
            value = typeof data.css === 'string' ? data.css : undefined;
        } else {
            const flag = data.flags?.[control.type === 'hide' ? `hide-${control.key}` : control.key];
            value = flag === undefined ? undefined : fromFlag(control, flag);
        }
        if (value !== undefined && !(typeof value === 'number' && Number.isNaN(value))) {
            setValue(control, value);
            kept++;
        }
    }
    onChange();
    rows.forEach(row => row.refresh());
    if (data.themeId !== THEME_ID) {
        toastr.info(`This customization was made for another theme (${String(data.themeId)}). ${kept} matching option${kept === 1 ? '' : 's'} were kept.`, 'Yodayo Tavern Theme');
    } else {
        toastr.success('Customization imported.', 'Yodayo Tavern Theme');
    }
}

function resetControls(controls, onChange) {
    for (const control of controls) {
        setValue(control, control.type === 'color' ? null : structuredClone(control.def));
    }
    onChange();
}

/** Opens the Customize page. */
export async function openCustomize() {
    const { callGenericPopup, POPUP_TYPE } = SillyTavern.getContext();
    const page = el('div', 'yt-cz');
    const onChange = () => api.onChange();

    const head = el('div', 'yt-cz-head');
    const title = el('h3', '', 'Customize Yodayo Tavern');
    const tools = el('div', 'yt-cz-tools');
    const makeTool = (icon, text) => {
        const button = el('button', 'menu_button menu_button_icon');
        button.type = 'button';
        button.append(el('i', `fa-solid ${icon}`), el('span', '', text));
        return button;
    };
    const exportButton = makeTool('fa-file-export', 'Export Theme');
    const importButton = makeTool('fa-file-import', 'Import Theme');
    const resetAll = makeTool('fa-rotate-left', 'Reset All');
    const file = el('input');
    file.type = 'file';
    file.accept = 'application/json,.json';
    file.hidden = true;
    tools.append(exportButton, importButton, resetAll, file);
    head.append(title, tools);

    const nav = el('nav', 'yt-cz-nav');
    const body = el('div', 'yt-cz-body');
    const rows = [];
    for (const section of SECTIONS) {
        const block = el('section', 'yt-cz-section');
        block.id = `yt-cz-${section.id}`;
        const header = el('div', 'yt-cz-section-head');
        const resetSection = el('button', 'menu_button yt-cz-reset-section', 'Reset section');
        resetSection.type = 'button';
        header.append(el('h4', '', section.title), resetSection);
        block.append(header);
        if (section.note) {
            block.append(el('small', 'yt-muted', section.note));
        }
        const sectionRows = section.controls.map(control => buildRow(control, onChange));
        sectionRows.forEach(row => block.append(row.element));
        rows.push(...sectionRows);
        resetSection.addEventListener('click', () => {
            resetControls(sectionRows.map(row => row.control), onChange);
            sectionRows.forEach(row => row.refresh());
        });
        body.append(block);

        const link = el('a', '', section.title);
        link.href = `#yt-cz-${section.id}`;
        link.addEventListener('click', (event) => {
            event.preventDefault();
            block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        nav.append(link);
    }

    exportButton.addEventListener('click', exportCustomization);
    importButton.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
        const chosen = file.files?.[0];
        file.value = '';
        if (!chosen) {
            return;
        }
        try {
            importCustomization(JSON.parse(await chosen.text()), rows, onChange);
        } catch {
            toastr.error('That file could not be read.', 'Yodayo Tavern Theme');
        }
    });
    resetAll.addEventListener('click', async () => {
        const confirmed = await callGenericPopup('Reset every customization on this page to the theme defaults?', POPUP_TYPE.CONFIRM);
        if (confirmed) {
            resetControls(rows.map(row => row.control), onChange);
            rows.forEach(row => row.refresh());
        }
    });

    page.append(head, buildPreview(), nav, body);
    await callGenericPopup(page, POPUP_TYPE.TEXT, '', { wide: true, large: true, allowVerticalScrolling: true, leftAlign: true, okButton: 'Done' });
    api.onClose?.();
}

/**
 * @param {object} options
 * @param {() => object} options.getSettings
 * @param {() => void} options.onChange Applies and saves the settings
 * @param {() => void} [options.onClose] Refreshes the settings panel afterwards
 */
export function initCustomize(options) {
    api = options;
}
