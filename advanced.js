// Advanced settings: the look settings Moonlit Echoes offers, mapped onto this theme.
// Each setting either sets a CSS variable on <body>, toggles a body class (yt-adv-<key>),
// or is handled specially (raw CSS, visual novel height). css/advanced.css uses them.

const RAW_CSS_ID = 'yt-raw-css';

/**
 * type: color (hex), rgba (color + opacity), text, number (with unit), select, checkbox, textarea
 * cssVar: variable to set; unit: appended to number values
 */
export const ADVANCED_GROUPS = Object.freeze([
    {
        title: 'Theme colors',
        note: 'The primary theme color is the Accent color at the top of this panel.',
        items: [
            { key: 'accent2', type: 'color', label: 'Secondary theme color', cssVar: '--yt-accent-2', def: '#fac679' },
            { key: 'menuBg', type: 'rgba', label: 'Main background (menus, home page)', cssVar: '--yt-glass', def: ['#1a1c1e', 72] },
            { key: 'menuBg2', type: 'rgba', label: 'Secondary background (popovers, cards)', cssVar: '--yt-glass-raised', def: ['#2c2e30', 78] },
            { key: 'railBg', type: 'rgba', label: 'Menu bar color', cssVar: '--yt-rail-bg', def: ['#232527', 60] },
            { key: 'iconColor', type: 'rgba', label: 'Menu icon color', cssVar: '--yt-icon', def: ['#a8a8a8', 100] },
            { key: 'chatFieldBg', type: 'rgba', label: 'Chat field background', cssVar: '--yt-chat-field-bg', def: ['#000000', 0] },
            { key: 'scrollbar', type: 'rgba', label: 'Scrollbar color', cssVar: '--yt-scrollbar', def: ['#36393b', 100] },
        ],
    },
    {
        title: 'Message style',
        items: [
            { key: 'hideAvatarBorder', type: 'checkbox', label: 'Hide avatar border', def: false },
            { key: 'avatarSize', type: 'number', unit: 'px', min: 24, max: 120, label: 'Chat avatar size', cssVar: '--yt-avatar-size', def: 50 },
            { key: 'pTop', type: 'number', unit: 'em', step: 0.05, min: 0, max: 3, label: 'Paragraph spacing (top)', cssVar: '--yt-p-top', def: 0.35 },
            { key: 'pBottom', type: 'number', unit: 'em', step: 0.05, min: 0, max: 3, label: 'Paragraph spacing (bottom)', cssVar: '--yt-p-bottom', def: 0.35 },
            { key: 'charNameSize', type: 'number', unit: 'px', min: 8, max: 32, label: 'Character name size', cssVar: '--yt-char-name-size', def: 13 },
            { key: 'userNameSize', type: 'number', unit: 'px', min: 8, max: 32, label: 'Your name size', cssVar: '--yt-user-name-size', def: 13 },
            { key: 'textSize', type: 'number', unit: 'px', min: 10, max: 32, label: 'Message text size', cssVar: '--yt-mes-size', def: 15 },
            { key: 'lineHeight', type: 'number', step: 0.05, min: 1, max: 3, label: 'Message line height', cssVar: '--yt-mes-line', def: 1.6 },
            { key: 'letterSpacing', type: 'number', unit: 'px', step: 0.1, min: -2, max: 5, label: 'Message letter spacing', cssVar: '--yt-mes-tracking', def: 0 },
            { key: 'contextMarker', type: 'text', label: 'Context limit marker (CSS border)', cssVar: '--yt-context-marker', def: '1px dashed var(--yt-accent-line)' },
        ],
    },
    {
        title: 'Background effects',
        items: [
            { key: 'bgBlur', type: 'number', unit: 'px', min: 0, max: 40, label: 'Background blur', cssVar: '--yt-bg-blur', def: 0 },
            { key: 'bgOpacity', type: 'number', step: 0.05, min: 0, max: 1, label: 'Background image opacity', cssVar: '--yt-bg-opacity', def: 1 },
            { key: 'chatFieldBlur', type: 'number', unit: 'px', min: 0, max: 40, label: 'Chat field blur', cssVar: '--yt-chat-field-backdrop', wrap: 'blur', def: 0 },
            { key: 'mobileChatFieldBlur', type: 'number', unit: 'px', min: 0, max: 40, label: 'Chat field blur on phones', cssVar: '--yt-chat-field-backdrop-mobile', wrap: 'blur', def: 0 },
        ],
    },
    {
        title: 'Theme extras',
        items: [
            { key: 'colorize', type: 'checkbox', label: 'Apply theme colors to more UI elements', def: false },
            { key: 'noRailAnimation', type: 'checkbox', label: 'Disable menu animations', def: false },
            { key: 'lockPanelHeight', type: 'checkbox', label: 'Lock AI settings and character panel to full height', def: true },
            { key: 'fitMenuHeight', type: 'checkbox', label: 'Shrink other menus to fit their content', def: false },
            { key: 'noRadius', type: 'checkbox', label: 'Disable all rounded corners', def: false },
            { key: 'wideEntryInputs', type: 'checkbox', label: 'Expand World Info entry inputs', def: true },
            { key: 'compactWorldInfo', type: 'checkbox', label: 'Compact Worlds/Lorebooks top bar', def: true },
        ],
    },
    {
        title: 'Chat',
        items: [
            {
                key: 'chatFade', type: 'select', label: 'Fade chat edges', def: 'none',
                options: [['none', 'Off'], ['top', 'Top'], ['bottom', 'Bottom'], ['both', 'Top and bottom']],
            },
            { key: 'modelIcon', type: 'checkbox', label: 'Show the model icon on messages', def: false },
            { key: 'justify', type: 'checkbox', label: 'Justify message text', def: false },
            { key: 'hideDetails', type: 'checkbox', label: 'Hide message details (ID, timer, tokens) until hover', def: false },
            { key: 'detailsDuration', type: 'number', unit: 's', step: 0.1, min: 0, max: 3, label: 'Message details fade time', cssVar: '--yt-details-duration', def: 0.8 },
            { key: 'favSymbol', type: 'text', label: 'Favorite symbol', cssVar: '--yt-fav-symbol', def: '★', quoted: true },
            { key: 'favAnimation', type: 'checkbox', label: 'Animate the favorite symbol', def: true },
        ],
    },
    {
        title: 'Visual novel mode',
        items: [
            { key: 'vnHeightPct', type: 'number', unit: '%', min: 15, max: 85, label: 'Chat height', special: 'vnHeight', def: 30 },
            {
                key: 'vnFade', type: 'select', label: 'Character portrait fade', def: 'none',
                options: [['none', 'Off'], ['bottom', 'Fade at the bottom'], ['top', 'Fade at the top']],
            },
        ],
    },
    {
        title: 'Phones and tablets',
        items: [
            { key: 'mobileHideScrollbar', type: 'checkbox', label: 'Hide scrollbars on phones', def: true },
            { key: 'mobileComposer', type: 'checkbox', label: 'Use the theme message box on phones', def: true },
            { key: 'mobileInlineMeta', type: 'checkbox', label: 'Name and icons on one line on phones', def: false },
            { key: 'mobileInputSpacing', type: 'checkbox', label: 'More space around the message box on phones', def: false },
            { key: 'desktopInputSpacing', type: 'checkbox', label: 'More space around the message box on desktop and tablet', def: false },
            { key: 'tabletMenus', type: 'checkbox', label: 'Full-width menus on tablets', def: false },
            {
                key: 'mobileQrRows', type: 'select', label: 'Quick Reply rows on phones', def: '2',
                options: [['1', '1 row'], ['2', '2 rows'], ['3', '3 rows'], ['0', 'No limit']],
            },
            { key: 'mobileQrBelow', type: 'checkbox', label: 'Quick Replies below the message box on phones', def: true },
            { key: 'mobileHotswapScroll', type: 'checkbox', label: 'Scroll HotSwap avatars sideways on phones', def: false },
        ],
    },
    {
        title: 'Raw CSS',
        items: [
            { key: 'rawCss', type: 'textarea', label: 'Extra CSS, applied after the theme', def: '' },
        ],
    },
]);

const ALL_ITEMS = ADVANCED_GROUPS.flatMap(group => group.items);

function hexToRgb(hex) {
    const value = parseInt(String(hex).replace('#', ''), 16) || 0;
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function getValue(settings, item) {
    if (item.special === 'vnHeight') {
        return Math.round((settings.vnHeight ?? 0.3) * 100);
    }
    const value = settings.advanced?.[item.key];
    return value === undefined ? item.def : value;
}

function cssValue(item, value) {
    switch (item.type) {
        case 'rgba': {
            const [hex, alpha] = value;
            const [r, g, b] = hexToRgb(hex);
            return `rgb(${r} ${g} ${b} / ${Number(alpha) / 100})`;
        }
        case 'number':
            return item.wrap ? `${item.wrap}(${value}${item.unit ?? ''})` : `${value}${item.unit ?? ''}`;
        case 'text':
            return item.quoted ? JSON.stringify(String(value)) : String(value);
        default:
            return String(value);
    }
}

/** Writes every advanced setting to <body>. */
export function applyAdvanced(settings) {
    const body = document.body;
    for (const item of ALL_ITEMS) {
        const value = getValue(settings, item);
        if (item.special) {
            continue;
        }
        if (item.type === 'checkbox') {
            body.classList.toggle(`yt-adv-${item.key}`, Boolean(value));
        } else if (item.type === 'select') {
            body.dataset[`yt${item.key[0].toUpperCase()}${item.key.slice(1)}`] = String(value);
        } else if (item.type === 'textarea') {
            let style = document.getElementById(RAW_CSS_ID);
            if (!style) {
                style = document.createElement('style');
                style.id = RAW_CSS_ID;
                document.head.append(style);
            }
            style.textContent = settings.enabled ? String(value) : '';
        } else if (item.cssVar) {
            const isDefault = JSON.stringify(value) === JSON.stringify(item.def);
            if (isDefault) {
                body.style.removeProperty(item.cssVar);
            } else {
                body.style.setProperty(item.cssVar, cssValue(item, value));
            }
        }
    }
}

/**
 * Builds the Advanced section's controls.
 * @param {object} options
 * @param {() => object} options.getSettings Returns the extension settings
 * @param {() => void} options.onChange Applies and saves
 * @returns {() => void} Refreshes the controls from settings
 */
export function initAdvancedControls({ getSettings, onChange }) {
    const container = document.getElementById('yt_advanced');
    if (!container) {
        return () => {};
    }

    const setValue = (item, value) => {
        const settings = getSettings();
        if (item.special === 'vnHeight') {
            settings.vnHeight = Number(value) / 100;
        } else {
            settings.advanced = { ...settings.advanced, [item.key]: value };
        }
        onChange();
    };

    const refreshers = [];

    for (const group of ADVANCED_GROUPS) {
        const drawer = document.createElement('div');
        drawer.className = 'inline-drawer yt-adv-group';
        const header = document.createElement('div');
        header.className = 'inline-drawer-toggle inline-drawer-header';
        const title = document.createElement('b');
        title.textContent = group.title;
        const icon = document.createElement('div');
        icon.className = 'inline-drawer-icon fa-solid fa-circle-chevron-down down';
        header.append(title, icon);
        const content = document.createElement('div');
        content.className = 'inline-drawer-content';

        if (group.note) {
            const note = document.createElement('small');
            note.className = 'yt-muted';
            note.textContent = group.note;
            content.append(note);
        }

        for (const item of group.items) {
            const id = `yt_adv_${item.key}`;
            let row;
            if (item.type === 'checkbox') {
                row = document.createElement('label');
                row.className = 'checkbox_label';
                row.htmlFor = id;
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = id;
                input.addEventListener('change', () => setValue(item, input.checked));
                const text = document.createElement('span');
                text.textContent = item.label;
                row.append(input, text);
                refreshers.push(() => { input.checked = Boolean(getValue(getSettings(), item)); });
            } else {
                row = document.createElement('div');
                row.className = 'yt-setting-row';
                const label = document.createElement('label');
                label.htmlFor = id;
                label.textContent = item.label;
                row.append(label);

                if (item.type === 'textarea') {
                    row.classList.add('yt-setting-stack');
                    const area = document.createElement('textarea');
                    area.id = id;
                    area.className = 'text_pole';
                    area.rows = 6;
                    area.spellcheck = false;
                    area.placeholder = '/* e.g. body.yodayo-tavern #chat { … } */';
                    area.addEventListener('change', () => setValue(item, area.value));
                    row.append(area);
                    refreshers.push(() => { area.value = String(getValue(getSettings(), item)); });
                } else if (item.type === 'select') {
                    const select = document.createElement('select');
                    select.id = id;
                    select.className = 'text_pole';
                    for (const [value, text] of item.options) {
                        const option = document.createElement('option');
                        option.value = value;
                        option.textContent = text;
                        select.append(option);
                    }
                    select.addEventListener('change', () => setValue(item, select.value));
                    row.append(select);
                    refreshers.push(() => { select.value = String(getValue(getSettings(), item)); });
                } else if (item.type === 'color') {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.id = id;
                    input.addEventListener('input', () => setValue(item, input.value));
                    row.append(input);
                    refreshers.push(() => { input.value = getValue(getSettings(), item); });
                } else if (item.type === 'rgba') {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.id = id;
                    const alpha = document.createElement('input');
                    alpha.type = 'range';
                    alpha.min = '0';
                    alpha.max = '100';
                    alpha.title = 'Opacity';
                    const update = () => setValue(item, [input.value, Number(alpha.value)]);
                    input.addEventListener('input', update);
                    alpha.addEventListener('input', update);
                    row.append(input, alpha);
                    refreshers.push(() => {
                        const [hex, a] = getValue(getSettings(), item);
                        input.value = hex;
                        alpha.value = String(a);
                        alpha.style.setProperty('--yt-fill', `${a}%`);
                    });
                } else {
                    const input = document.createElement('input');
                    input.id = id;
                    input.className = 'text_pole';
                    if (item.type === 'number') {
                        input.type = 'number';
                        input.min = String(item.min ?? '');
                        input.max = String(item.max ?? '');
                        input.step = String(item.step ?? 1);
                    } else {
                        input.type = 'text';
                    }
                    input.addEventListener('change', () => {
                        setValue(item, item.type === 'number' ? Number(input.value) : input.value);
                    });
                    row.append(input);
                    if (item.unit) {
                        const unit = document.createElement('span');
                        unit.className = 'yt-muted';
                        unit.textContent = item.unit;
                        row.append(unit);
                    }
                    refreshers.push(() => { input.value = String(getValue(getSettings(), item)); });
                }

                const reset = document.createElement('div');
                reset.className = 'menu_button menu_button_icon fa-solid fa-rotate-left';
                reset.title = 'Back to default';
                reset.addEventListener('click', () => {
                    const settings = getSettings();
                    if (item.special === 'vnHeight') {
                        settings.vnHeight = item.def / 100;
                    } else {
                        const { [item.key]: _removed, ...rest } = settings.advanced ?? {};
                        settings.advanced = rest;
                    }
                    refresh();
                    onChange();
                });
                row.append(reset);
            }
            content.append(row);
        }

        drawer.append(header, content);
        container.append(drawer);
    }

    function refresh() {
        for (const refresher of refreshers) {
            refresher();
        }
    }

    refresh();
    return refresh;
}
