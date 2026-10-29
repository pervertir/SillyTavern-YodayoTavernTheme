// Tavern home: replaces the top of SillyTavern's welcome screen with a Yodayo-style
// character browser (header, tag chips and a grid of portrait cards).

import { deleteCharacter } from '../../../../script.js';
import { openGroupById } from '../../../group-chats.js';
import { renderTemplateAsync } from '../../../templates.js';
import { openWelcomeScreen } from '../../../welcome-screen.js';
import { getCachedCutout } from './bgremove.js';
import { LOGO_URL } from './brand.js';
import { el, onActivate, TITLE } from './util.js';

const HOME_ID = 'yt-home';
const ASSISTANT_ID = 'yt-home-assistant';
const ACTIVE_CLASS = 'yt-home-active';
const MAX_TAG_CHIPS = 24;
/** Width of a recent chat's hover card, used to open it leftward near the right edge. */
const RECENT_CARD_WIDTH = 360;
/** SillyTavern's automatic chat file names, e.g. "Ino - 2026-10-25@23h33m30s707ms". */
const DEFAULT_CHAT_NAME = /^(?:.* - )?\d{4}-\d{1,2}-\d{1,2} ?@\d{1,2}h ?\d{1,2}m ?\d{1,2}s ?\d{1,3} ?ms$/;

let activeTagId = null;
let searchText = '';
/** Aborted when the home is taken down: ends its document listeners and observers */
let homeLifetime = new AbortController();

/** Disconnects an observer once the home is taken down. */
function untilHomeCloses(observer) {
    homeLifetime.signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    return observer;
}

/** Character orders, the same choices as SillyTavern's character list. "Date added" is the
 * card's creation date; "Date modified" is when its file last changed. */
const SORTS = Object.freeze({
    recent: { label: 'Recent chats', key: e => e.lastChat, desc: true },
    'name-asc': { label: 'Name (A–Z)', key: e => e.name.toLowerCase() },
    'name-desc': { label: 'Name (Z–A)', key: e => e.name.toLowerCase(), desc: true },
    'added-desc': { label: 'Date added (newest)', key: e => e.added, desc: true },
    'added-asc': { label: 'Date added (oldest)', key: e => e.added },
    'modified-desc': { label: 'Date modified', key: e => e.modified, desc: true },
    fav: { label: 'Favorites first', key: e => (e.fav ? 1 : 0), desc: true },
    'chats-desc': { label: 'Most chats', key: e => e.chatSize, desc: true },
    random: { label: 'Random', key: e => e.random },
});
const SORT_KEY = 'yodayoTavernHomeSort';

function getSort() {
    const stored = SillyTavern.getContext().accountStorage?.getItem(SORT_KEY);
    return stored && SORTS[stored] ? stored : 'recent';
}

function setSort(value) {
    SillyTavern.getContext().accountStorage?.setItem(SORT_KEY, value);
}

/** Sort fields shared by characters and groups */
function sortFields(item) {
    const created = Date.parse(item.create_date ?? '');
    return {
        name: item.name ?? '',
        lastChat: Number(item.date_last_chat) || 0,
        added: Number.isFinite(created) ? created : Number(item.date_added) || 0,
        modified: Number(item.date_added) || 0,
        fav: item.fav === true || item.fav === 'true',
        chatSize: Number(item.chat_size) || 0,
        random: Math.random(),
    };
}

function getCharacterEntries() {
    const { characters } = SillyTavern.getContext();
    return characters
        .map((character, index) => ({ character, index }))
        .filter(({ character }) => character && character.avatar && character.avatar !== 'none');
}

function getTagIds(character) {
    const { tagMap } = SillyTavern.getContext();
    return tagMap[character.avatar] ?? [];
}

/** Tags that at least one character uses, most used first. */
function getUsedTags(entries) {
    const { tags } = SillyTavern.getContext();
    const counts = new Map();
    for (const { character } of entries) {
        for (const id of getTagIds(character)) {
            counts.set(id, (counts.get(id) ?? 0) + 1);
        }
    }
    return tags
        .filter(tag => counts.has(tag.id))
        .sort((a, b) => counts.get(b.id) - counts.get(a.id) || a.name.localeCompare(b.name))
        .slice(0, MAX_TAG_CHIPS);
}

function getLastChatLabel(character) {
    const { timestampToMoment } = SillyTavern.getContext();
    const lastChat = Number(character.date_last_chat);
    if (!lastChat) {
        return 'New';
    }
    const moment = timestampToMoment(lastChat);
    return moment?.isValid?.() ? moment.fromNow(true) : 'New';
}

function openRightPanel() {
    const panel = document.getElementById('right-nav-panel');
    if (panel && !panel.classList.contains('openDrawer')) {
        document.querySelector('#rightNavHolder .drawer-toggle')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
}

/** SillyTavern's own delete confirmation, with its "also delete the chats" checkbox. */
async function confirmDelete(character) {
    const { Popup } = SillyTavern.getContext();
    let deleteChats = false;
    const confirmed = await Popup.show.confirm(`Delete ${character.name}?`, await renderTemplateAsync('deleteConfirm'), {
        onClose: () => { deleteChats = Boolean(document.getElementById('del_char_checkbox')?.checked); },
    });
    // SillyTavern leaves a "you deleted a character" notice; come back to the home instead
    if (confirmed && await deleteCharacter(character.avatar, { deleteChats })) {
        await openWelcomeScreen({ force: true });
    }
}

/**
 * A card picture from SillyTavern's thumbnail, which is far smaller than the card PNG.
 * Thumbnails are only 96px wide by default, so if this one is too small for the card on
 * this screen, the full image replaces it.
 */
function setCardImage(img, avatar) {
    const file = encodeURIComponent(avatar);
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.addEventListener('load', () => {
        const needed = img.clientWidth * (window.devicePixelRatio || 1);
        if (needed && img.naturalWidth < needed * 0.9 && !img.src.includes('characters/')) {
            img.src = `characters/${file}`;
        }
    });
    img.src = `thumbnail?type=avatar&file=${file}`;
}

function renderCard({ character, index }) {
    const card = el('button', 'yt-card');
    card.type = 'button';
    card.title = character.name;
    card.addEventListener('click', () => SillyTavern.getContext().selectCharacterById(index));

    const media = el('div', 'yt-card-media');
    const img = el('img');
    setCardImage(img, character.avatar);
    img.draggable = false;
    media.append(img);

    const stat = el('span', 'yt-card-stat');
    stat.append(el('i', 'fa-regular fa-comment'), el('span', '', getLastChatLabel(character)));
    media.append(stat);

    // a span, since a button can't sit inside the card's button
    const remove = el('span', 'yt-card-delete');
    remove.setAttribute('role', 'button');
    remove.tabIndex = 0;
    remove.title = `Delete ${character.name}`;
    remove.setAttribute('aria-label', remove.title);
    remove.append(el('i', 'fa-solid fa-trash-can'));
    onActivate(remove, (event) => {
        event.preventDefault();
        event.stopPropagation();
        confirmDelete(character);
    });
    media.append(remove);

    if (character.fav === true || character.fav === 'true') {
        const fav = el('span', 'yt-card-fav');
        fav.append(el('i', 'fa-solid fa-star'));
        fav.title = 'Favorite';
        media.append(fav);
    }

    const name = el('div', 'yt-card-name', character.name);
    const meta = el('div', 'yt-card-meta');
    const creator = character.data?.creator || character.creator;
    meta.append(el('span', 'yt-card-creator', creator ? `by ${creator}` : 'by you'));

    const tagCount = getTagIds(character).length;
    if (tagCount) {
        const tags = el('span', 'yt-card-tags');
        tags.append(el('i', 'fa-solid fa-tag'), el('span', '', String(tagCount)));
        meta.append(tags);
    }

    card.append(media, name, meta);
    return card;
}

function renderGroupCard(group) {
    const card = el('button', 'yt-card yt-card-group');
    card.type = 'button';
    card.title = group.name;
    // getContext() only has openGroupChat, which needs a chat id and doesn't select the group
    card.addEventListener('click', () => openGroupById(group.id));

    const media = el('div', 'yt-card-media');
    // up to four members side by side as the group's picture
    const members = (group.members ?? []).filter(Boolean).slice(0, 4);
    media.classList.add(`yt-card-collage-${Math.max(members.length, 1)}`);
    for (const avatar of members) {
        const img = el('img');
        setCardImage(img, avatar);
        img.draggable = false;
        media.append(img);
    }

    const stat = el('span', 'yt-card-stat');
    stat.append(el('i', 'fa-solid fa-users'), el('span', '', `${group.members?.length ?? 0} members`));
    media.append(stat);

    const meta = el('div', 'yt-card-meta');
    meta.append(el('span', 'yt-card-creator', 'Group chat'));

    card.append(media, el('div', 'yt-card-name', group.name), meta);
    return card;
}

function renderGrid(home) {
    const grid = home.querySelector('.yt-home-grid');
    const query = searchText.trim().toLowerCase();
    const characters = getCharacterEntries()
        .filter(({ character }) => activeTagId === null || getTagIds(character).includes(activeTagId))
        .filter(({ character }) => !query || character.name.toLowerCase().includes(query)
            || (character.data?.creator ?? '').toLowerCase().includes(query))
        .map(entry => ({ ...sortFields(entry.character), render: () => renderCard(entry) }));

    // groups have no tags, so they show only under "All characters"
    const groups = activeTagId !== null ? [] : (SillyTavern.getContext().groups ?? [])
        .filter(group => !query || group.name.toLowerCase().includes(query))
        .map(group => ({ ...sortFields(group), render: () => renderGroupCard(group) }));

    const sort = SORTS[getSort()];
    const compare = (a, b) => {
        const x = sort.key(a);
        const y = sort.key(b);
        const order = typeof x === 'string' ? x.localeCompare(y) : x - y;
        return sort.desc ? -order : order;
    };
    const entries = [...characters, ...groups]
        .sort((a, b) => compare(a, b) || b.lastChat - a.lastChat || a.name.localeCompare(b.name));

    grid.replaceChildren(...entries.map(entry => entry.render()));

    if (!entries.length) {
        grid.append(el('div', 'yt-home-empty', query || activeTagId !== null
            ? 'No characters match.'
            : 'No characters yet. Create or import one to get started.'));
    }
}

/** Fades whichever end of the chip row has more chips past it. */
function updateChipFades(chips) {
    const max = chips.scrollWidth - chips.clientWidth;
    chips.classList.toggle('yt-fade-start', chips.scrollLeft > 1);
    chips.classList.toggle('yt-fade-end', chips.scrollLeft < max - 1);
}

function initChipRow(chips) {
    chips.addEventListener('scroll', () => updateChipFades(chips), { passive: true });
    // a mouse wheel scrolls the row sideways
    chips.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && chips.scrollWidth > chips.clientWidth) {
            event.preventDefault();
            chips.scrollLeft += event.deltaY;
        }
    }, { passive: false });
    untilHomeCloses(new ResizeObserver(() => updateChipFades(chips))).observe(chips);
}

function renderChips(home) {
    const chips = home.querySelector('.yt-home-chips');
    const tags = getUsedTags(getCharacterEntries());
    if (activeTagId !== null && !tags.some(tag => tag.id === activeTagId)) {
        activeTagId = null;
    }

    const makeChip = (label, tagId) => {
        const chip = el('button', 'yt-chip', label);
        chip.type = 'button';
        chip.classList.toggle('active', activeTagId === tagId);
        chip.addEventListener('click', () => {
            activeTagId = tagId;
            renderChips(home);
            renderGrid(home);
        });
        return chip;
    };

    chips.replaceChildren(makeChip('All characters', null), ...tags.map(tag => makeChip(tag.name, tag.id)));
    updateChipFades(chips);
}

function buildHome() {
    homeLifetime = new AbortController();
    const home = el('section', 'yt-home');
    home.id = HOME_ID;

    const header = el('div', 'yt-home-header');
    const title = el('div', 'yt-home-tabs');
    const assistant = el('button', 'yt-home-tab', 'ST Assistant');
    assistant.type = 'button';
    assistant.title = 'Chat with SillyTavern\'s assistant';
    assistant.addEventListener('click', () => {
        // on a phone there's no room for the assistant beside the Tavern window, so this tab
        // shows it in the window's place: picture, greeting and the message box
        if (window.matchMedia('(max-width: 1000px)').matches && document.getElementById(ASSISTANT_ID)) {
            document.body.classList.add('yt-m-assistant');
            return;
        }
        // SillyTavern's own "Temporary Chat" button opens the assistant; it lives in the
        // welcome panel that the home has moved into its recent chats row
        const button = document.querySelector('#chat .welcomePanel .openTemporaryChat');
        if (button instanceof HTMLElement) {
            button.click();
        } else {
            toastr.warning('The assistant chat is not available right now.', TITLE);
        }
    });
    const tavern = el('div', 'yt-home-title', 'Tavern');
    tavern.addEventListener('click', () => document.body.classList.remove('yt-m-assistant'));
    title.append(tavern, assistant);

    const actions = el('div', 'yt-home-actions');
    const search = el('label', 'yt-home-search');
    const searchInput = el('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Search characters';
    searchInput.value = searchText;
    searchInput.addEventListener('input', () => {
        searchText = searchInput.value;
        renderGrid(home);
    });
    search.append(el('i', 'fa-solid fa-magnifying-glass'), searchInput);

    const create = el('button', 'yt-home-action');
    create.type = 'button';
    create.append(el('i', 'fa-solid fa-plus'), el('span', '', 'Create'));
    create.addEventListener('click', () => {
        openRightPanel();
        document.getElementById('rm_button_create')?.click();
    });

    const importButton = el('button', 'yt-home-action');
    importButton.type = 'button';
    importButton.append(el('i', 'fa-solid fa-file-import'), el('span', '', 'Import'));
    importButton.addEventListener('click', () => document.getElementById('character_import_button')?.click());

    const newGroup = el('button', 'yt-home-action');
    newGroup.type = 'button';
    newGroup.append(el('i', 'fa-solid fa-users'), el('span', '', 'New group'));
    newGroup.addEventListener('click', () => {
        openRightPanel();
        document.getElementById('rm_button_group_chats')?.click();
    });

    actions.append(search, create, newGroup, importButton);
    header.append(title, actions);

    const divider = el('div', 'yt-home-divider');
    divider.append(el('span', '', 'Characters'));

    const recentDivider = el('div', 'yt-home-divider yt-home-divider-recent');
    recentDivider.append(el('span', '', 'Recent chats'), el('div', 'yt-home-divider-tools'));

    // tag chips, with the sort order on the right
    const filterBar = el('div', 'yt-home-filterbar');
    const sortLabel = el('label', 'yt-home-sort');
    sortLabel.title = 'Sort characters';
    const sortSelect = el('select');
    sortSelect.setAttribute('aria-label', 'Sort characters');
    for (const [value, { label }] of Object.entries(SORTS)) {
        const option = el('option', '', label);
        option.value = value;
        sortSelect.append(option);
    }
    sortSelect.value = getSort();
    sortSelect.addEventListener('change', () => {
        setSort(sortSelect.value);
        renderGrid(home);
    });
    sortLabel.append(el('i', 'fa-solid fa-arrow-down-wide-short'), sortSelect);
    const chipRow = el('div', 'yt-home-chips');
    initChipRow(chipRow);
    filterBar.append(chipRow, sortLabel);

    home.append(header, recentDivider, el('div', 'yt-home-recent'), divider, filterBar, el('div', 'yt-home-grid'), buildAbout());
    return home;
}

/** Label under a recent chat's circle: the chat's own name if the user renamed it. */
function getRecentChatLabel(item) {
    const file = item.getAttribute('data-file') ?? '';
    const characterName = item.querySelector('.characterName')?.textContent?.trim() ?? '';
    return file && !DEFAULT_CHAT_NAME.test(file) ? file : characterName || file;
}

/** Prev/next arrows for the recent chats row, shown only when there is more to scroll to. */
function addRecentArrows(slot, list) {
    if (!(list instanceof HTMLElement)) {
        return;
    }
    const makeArrow = (direction) => {
        const arrow = el('button', `yt-recent-arrow yt-recent-${direction} fa-solid fa-chevron-${direction === 'prev' ? 'left' : 'right'}`);
        arrow.type = 'button';
        arrow.title = direction === 'prev' ? 'Earlier chats' : 'More chats';
        arrow.addEventListener('click', () => {
            const step = Math.max(list.clientWidth * 0.8, 120);
            list.scrollBy({ left: direction === 'prev' ? -step : step, behavior: 'smooth' });
        });
        return arrow;
    };
    const prev = makeArrow('prev');
    const next = makeArrow('next');
    slot.append(prev, next);

    const update = () => {
        prev.hidden = list.scrollLeft <= 1;
        next.hidden = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1;
    };
    list.addEventListener('scroll', update, { passive: true });
    // a sideways swipe here scrolls the row; it isn't SillyTavern's message swipe gesture
    for (const type of ['swiped-left', 'swiped-right']) {
        list.addEventListener(type, event => event.stopPropagation());
    }
    untilHomeCloses(new ResizeObserver(update)).observe(list);
    // "show more" adds chats to the row without changing its size
    untilHomeCloses(new MutationObserver(update)).observe(list, { childList: true });
    update();
}

/** SillyTavern's version and links, behind an (i) button pinned to the bottom right. */
function buildAbout() {
    const about = el('div', 'yt-home-about');
    const button = el('button', 'yt-home-info fa-solid fa-circle-info');
    button.type = 'button';
    button.title = 'About SillyTavern';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-expanded', 'false');

    const card = el('div', 'yt-home-about-card');
    card.hidden = true;
    const head = el('div', 'yt-home-about-head');
    const logo = el('img', 'yt-home-about-logo');
    logo.src = 'img/logo.png';
    logo.alt = '';
    const text = el('div');
    text.append(el('div', 'yt-home-about-name', 'SillyTavern'), el('div', 'yt-home-about-version', ''));
    head.append(logo, text);

    const links = el('div', 'yt-home-about-links');
    for (const [label, icon, href] of [
        ['Docs', 'fa-solid fa-book', 'https://docs.sillytavern.app/'],
        ['GitHub', 'fa-brands fa-github', 'https://github.com/SillyTavern/SillyTavern'],
        ['Discord', 'fa-brands fa-discord', 'https://discord.gg/sillytavern'],
    ]) {
        const link = el('a', 'yt-home-about-link');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.append(el('i', icon), el('span', '', label));
        links.append(link);
    }
    card.append(head, links);

    const setOpen = (open) => {
        card.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        about.classList.toggle('open', open);
    };
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        setOpen(card.hidden);
    });
    const { signal } = homeLifetime;
    document.addEventListener('click', (event) => {
        if (!card.hidden && !about.contains(/** @type {Node} */ (event.target))) {
            setOpen(false);
        }
    }, { signal });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !card.hidden) {
            setOpen(false);
        }
    }, { signal });

    about.append(card, button);
    return about;
}

/** Welcome panel each home's recent chats tools are wired to */
const toolPanels = new WeakMap();

/** Recent chats settings and show/hide, next to the "Recent chats" heading; they press the
 * welcome panel's own buttons, whose header the home hides. */
function addRecentTools(home, panel) {
    const tools = home.querySelector('.yt-home-divider-tools');
    if (!tools || toolPanels.get(tools) === panel) {
        return;
    }
    toolPanels.set(tools, panel);
    const proxy = (selector, icon, title) => {
        const button = el('button', `yt-divider-tool fa-solid ${icon}`);
        button.type = 'button';
        button.title = title;
        button.setAttribute('aria-label', title);
        button.addEventListener('click', () => panel.querySelector(selector)?.click());
        return button;
    };
    const settings = proxy('.recentChatsSettings', 'fa-gear', 'Recent chats settings');
    const toggle = el('button', 'yt-divider-tool fa-solid fa-chevron-up');
    toggle.type = 'button';
    toggle.addEventListener('click', () => {
        const hidden = panel.classList.contains('recentHidden');
        panel.querySelector(hidden ? '.showRecentChats' : '.hideRecentChats')?.click();
    });
    const update = () => {
        const hidden = panel.classList.contains('recentHidden');
        toggle.classList.toggle('fa-chevron-up', !hidden);
        toggle.classList.toggle('fa-chevron-down', hidden);
        toggle.title = hidden ? 'Show recent chats' : 'Hide recent chats';
        toggle.setAttribute('aria-label', toggle.title);
        home.classList.toggle('yt-recent-collapsed', hidden);
    };
    // the theme used to keep the row visible even when SillyTavern had it hidden; respect
    // the switch from now on, but start from what the user has been seeing
    const { accountStorage } = SillyTavern.getContext();
    if (accountStorage && accountStorage.getItem('yodayoTavernRecentShown') !== 'true') {
        accountStorage.setItem('yodayoTavernRecentShown', 'true');
        if (panel.classList.contains('recentHidden')) {
            panel.querySelector('.showRecentChats')?.click();
        }
    }
    untilHomeCloses(new MutationObserver(update)).observe(panel, { attributes: true, attributeFilter: ['class'] });
    tools.replaceChildren(settings, toggle);
    update();

    const version = panel.querySelector('.welcomeHeaderVersionDisplay')?.textContent?.trim();
    const versionNode = home.querySelector('.yt-home-about-version');
    if (versionNode && version) {
        versionNode.textContent = version.replace(/^SillyTavern\s*/i, '');
    }
}

function adoptRecentChats(home) {
    const chat = document.getElementById('chat');
    const slot = home.querySelector('.yt-home-recent');
    const panel = chat?.querySelector(':scope > .welcomePanel');
    if (!slot || !panel) {
        return;
    }
    slot.replaceChildren(panel);
    addRecentArrows(slot, panel.querySelector('.recentChatList'));
    addRecentTools(home, panel);

    for (const item of panel.querySelectorAll('.recentChat')) {
        if (item.querySelector('.yt-recent-label')) {
            continue;
        }
        const label = el('div', 'yt-recent-label', getRecentChatLabel(item));
        item.querySelector('.avatar')?.after(label);
        // near the right edge the hover card opens leftward so it stays on screen
        item.addEventListener('mouseenter', () => {
            const bounds = slot.getBoundingClientRect();
            const left = item.getBoundingClientRect().left;
            item.classList.toggle('yt-flip', left + RECENT_CARD_WIDTH > bounds.right);
        });
    }
}

function render() {
    const home = document.getElementById(HOME_ID);
    if (!home) {
        return;
    }
    renderChips(home);
    renderGrid(home);
}

/** Full-size card image for the welcome assistant, read from the greeting SillyTavern adds. */
function getAssistantInfo(chat) {
    const message = chat.querySelector(':scope > .mes[type="assistant_message"]');
    if (!message) {
        return null;
    }
    const thumbnail = message.querySelector('.avatar img')?.getAttribute('src') ?? '';
    const file = new URLSearchParams(thumbnail.split('?')[1] ?? '').get('file');
    return {
        name: message.getAttribute('ch_name') ?? '',
        // SillyTavern's own rendered (and sanitized) greeting
        greeting: message.querySelector('.mes_text')?.innerHTML ?? '',
        // with no assistant chosen, SillyTavern's logo greets; Moescape's ghost does instead
        src: file ? `characters/${encodeURIComponent(file)}` : (/(^|\/)img\/(five|logo)\.png$/.test(thumbnail) ? LOGO_URL : thumbnail),
    };
}

/**
 * The welcome assistant beside the home: its picture and greeting over SillyTavern's message box. Sending
 * a message there makes SillyTavern open the assistant's chat, which closes the home.
 */
function syncAssistant(chat, show) {
    const sheld = document.getElementById('sheld');
    let aside = document.getElementById(ASSISTANT_ID);
    const info = show ? getAssistantInfo(chat) : null;
    document.body.classList.toggle('yt-home-assistant', Boolean(info));
    if (!info) {
        document.body.classList.remove('yt-m-assistant');
    }
    if (!info || !sheld) {
        aside?.remove();
        return;
    }
    if (!aside) {
        aside = el('aside');
        aside.id = ASSISTANT_ID;
        const img = el('img');
        img.alt = '';
        img.addEventListener('error', () => img.classList.add('displayNone'));
        img.addEventListener('load', () => img.classList.remove('displayNone'));
        const bubble = el('div', 'yt-home-assistant-bubble');
        bubble.append(el('div', 'yt-home-assistant-name'), el('div', 'yt-home-assistant-greeting mes_text'));
        const picture = el('div', 'yt-home-assistant-picture');
        picture.append(img);
        const back = el('button', 'yt-m-assistant-back fa-solid fa-arrow-left');
        back.type = 'button';
        back.title = 'Back to the Tavern';
        back.setAttribute('aria-label', back.title);
        back.addEventListener('click', () => document.body.classList.remove('yt-m-assistant'));
        aside.append(back, picture, bubble);
        sheld.prepend(aside);
    }
    // a cutout made with Remove background, if there is one; framed with round corners if not
    const cutout = getCachedCutout(info.src);
    const src = cutout || info.src;
    const img = aside.querySelector('img');
    if (img.getAttribute('src') !== src) {
        img.setAttribute('src', src);
    }
    img.classList.toggle('yt-cutout', Boolean(cutout));
    aside.querySelector('.yt-home-assistant-name').textContent = info.name;
    const greeting = aside.querySelector('.yt-home-assistant-greeting');
    if (greeting.innerHTML !== info.greeting) {
        greeting.innerHTML = info.greeting;
    }
    img.alt = info.name;
}

/**
 * Shows the home above the welcome panel whenever SillyTavern draws one, and removes it
 * when a chat opens or the option is off.
 * @param {() => boolean} isEnabled Whether the theme and the home option are on
 * @returns {() => void} Call to re-check after settings change
 */
export function initTavernHome(isEnabled) {
    const chat = document.getElementById('chat');
    if (!chat) {
        return () => {};
    }

    const sync = () => {
        const panel = chat.querySelector('.welcomePanel');
        const existing = document.getElementById(HOME_ID);
        const show = Boolean(panel) && isEnabled();

        document.body.classList.toggle(ACTIVE_CLASS, show);
        syncAssistant(chat, show);
        if (!show) {
            if (existing) {
                // SillyTavern's welcome panel goes back where it came from, as it was
                const adopted = existing.querySelector('.welcomePanel');
                if (adopted) {
                    adopted.querySelectorAll('.yt-recent-label').forEach(label => label.remove());
                    adopted.querySelectorAll('.yt-flip').forEach(item => item.classList.remove('yt-flip'));
                    chat.prepend(adopted);
                }
                existing.remove();
                homeLifetime.abort();
            }
            return;
        }
        const home = existing ?? buildHome();
        if (!existing) {
            chat.prepend(home);
            render();
            chat.scrollTop = 0;
        }
        adoptRecentChats(home);
    };

    new MutationObserver(sync).observe(chat, { childList: true });

    const { eventSource, eventTypes } = SillyTavern.getContext();
    for (const type of [eventTypes.CHARACTER_PAGE_LOADED, eventTypes.CHARACTER_EDITED, eventTypes.CHARACTER_DELETED]) {
        if (type) {
            eventSource.on(type, render);
        }
    }

    sync();
    return sync;
}
