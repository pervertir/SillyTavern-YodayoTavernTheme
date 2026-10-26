// Tavern home: replaces the top of SillyTavern's welcome screen with a Yodayo-style
// character browser (header, tag chips and a grid of portrait cards).

const HOME_ID = 'yt-home';
const ACTIVE_CLASS = 'yt-home-active';
const MAX_TAG_CHIPS = 24;
/** Width of a recent chat's hover card, used to open it leftward near the right edge. */
const RECENT_CARD_WIDTH = 360;
/** SillyTavern's automatic chat file names, e.g. "Ino - 2026-10-25@23h33m30s707ms". */
const DEFAULT_CHAT_NAME = /^(?:.* - )?\d{4}-\d{1,2}-\d{1,2} ?@\d{1,2}h ?\d{1,2}m ?\d{1,2}s ?\d{1,3} ?ms$/;

let activeTagId = null;
let searchText = '';

/** Small DOM helper so names and tags from character cards are never parsed as HTML. */
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

function renderCard({ character, index }) {
    const card = el('button', 'yt-card');
    card.type = 'button';
    card.title = character.name;
    card.addEventListener('click', () => SillyTavern.getContext().selectCharacterById(index));

    const media = el('div', 'yt-card-media');
    const img = el('img');
    img.loading = 'lazy';
    img.alt = '';
    img.src = `characters/${encodeURIComponent(character.avatar)}`;
    media.append(img);

    const stat = el('span', 'yt-card-stat');
    stat.append(el('i', 'fa-regular fa-comment'), el('span', '', getLastChatLabel(character)));
    media.append(stat);

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

function renderGrid(home) {
    const grid = home.querySelector('.yt-home-grid');
    const query = searchText.trim().toLowerCase();
    const entries = getCharacterEntries()
        .filter(({ character }) => activeTagId === null || getTagIds(character).includes(activeTagId))
        .filter(({ character }) => !query || character.name.toLowerCase().includes(query)
            || (character.data?.creator ?? '').toLowerCase().includes(query))
        .sort((a, b) => (Number(b.character.date_last_chat) || 0) - (Number(a.character.date_last_chat) || 0)
            || a.character.name.localeCompare(b.character.name));

    grid.replaceChildren(...entries.map(renderCard));

    if (!entries.length) {
        grid.append(el('div', 'yt-home-empty', query || activeTagId !== null
            ? 'No characters match.'
            : 'No characters yet. Create or import one to get started.'));
    }
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
}

function buildHome() {
    const home = el('section', 'yt-home');
    home.id = HOME_ID;

    const header = el('div', 'yt-home-header');
    const title = el('div', 'yt-home-title', 'Tavern');

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

    actions.append(search, create, importButton);
    header.append(title, actions);

    const divider = el('div', 'yt-home-divider');
    divider.append(el('span', '', 'Characters'));

    home.append(header, el('div', 'yt-home-recent'), divider, el('div', 'yt-home-chips'), el('div', 'yt-home-grid'));
    return home;
}

/** Label under a recent chat's circle: the chat's own name if the user renamed it. */
function getRecentChatLabel(item) {
    const file = item.getAttribute('data-file') ?? '';
    const characterName = item.querySelector('.characterName')?.textContent?.trim() ?? '';
    return file && !DEFAULT_CHAT_NAME.test(file) ? file : characterName || file;
}

/** Moves SillyTavern's welcome panel (recent chats) into the home, above the characters. */
function adoptRecentChats(home) {
    const chat = document.getElementById('chat');
    const slot = home.querySelector('.yt-home-recent');
    const panel = chat?.querySelector(':scope > .welcomePanel');
    if (!slot || !panel) {
        return;
    }
    slot.replaceChildren(panel);

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
        if (!show) {
            existing?.remove();
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
