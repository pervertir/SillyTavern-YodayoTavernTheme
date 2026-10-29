// Group chats: every member stands side by side opposite the chat, each in their own slot. Whoever spoke last stands in
// front, a little bigger; while a member is writing a reply they glow.

import { el } from './util.js';

/** More members than this and only the most recent speakers are shown, so none gets too narrow */
const MAX_MEMBERS = 6;

/** Avatar of the member SillyTavern is generating a reply for, until the reply is done */
let replying = null;

/** Members of the open group chat that take part (not muted), or null outside a group. */
export function getLineupMembers() {
    const { groups, groupId, characters } = SillyTavern.getContext();
    const group = groupId ? groups.find(x => x.id === groupId) : null;
    if (!group) {
        return null;
    }
    const disabled = group.disabled_members ?? [];
    return (group.members ?? [])
        .filter(avatar => avatar && !disabled.includes(avatar) && characters.some(x => x.avatar === avatar));
}

/** The member in front: the one replying now, else the last one who spoke. */
export function getSpeaker(members) {
    if (replying && members.includes(replying)) {
        return replying;
    }
    const { chat } = SillyTavern.getContext();
    for (let i = chat.length - 1; i >= 0; i--) {
        const message = chat[i];
        if (!message.is_user && !message.is_system && members.includes(message.original_avatar)) {
            return message.original_avatar;
        }
    }
    return null;
}

/** Narrows a big group down to the members who spoke most recently, keeping the group's order. */
function pickShown(members) {
    if (members.length <= MAX_MEMBERS) {
        return members;
    }
    const recent = [];
    if (replying && members.includes(replying)) {
        recent.push(replying);
    }
    const { chat } = SillyTavern.getContext();
    for (let i = chat.length - 1; i >= 0 && recent.length < MAX_MEMBERS; i--) {
        const avatar = chat[i].original_avatar;
        if (members.includes(avatar) && !recent.includes(avatar)) {
            recent.push(avatar);
        }
    }
    for (const avatar of members) {
        if (recent.length >= MAX_MEMBERS) {
            break;
        }
        if (!recent.includes(avatar)) {
            recent.push(avatar);
        }
    }
    return members.filter(avatar => recent.includes(avatar));
}

/**
 * Fills the art area with the lineup. Each member keeps its element between updates, so a new
 * speaker steps forward with a transition instead of the row being rebuilt.
 * @param {HTMLElement} art The art area
 * @param {string[]} members Avatars of the group's active members
 * @param {object} look
 * @param {(avatar: string) => string} look.getUrl Image to show for a member
 * @param {(avatar: string) => number} look.getSize A member's height as a percentage of the usual
 * @param {(src: string) => void} look.onError Called with the src of an image that failed to load
 */
export function renderLineup(art, members, { getUrl, getSize, onError }) {
    const shown = pickShown(members);
    const speaker = getSpeaker(members);
    const existing = new Map([...art.querySelectorAll('.yt-art-member')].map(node => [node.dataset.avatar, node]));
    const nodes = shown.map((avatar, slot) => {
        let node = existing.get(avatar);
        if (!node) {
            node = el('div', 'yt-art-member');
            node.dataset.avatar = avatar;
            const img = el('img');
            img.alt = '';
            img.draggable = false;
            img.addEventListener('error', () => onError(img.getAttribute('src')));
            node.append(img);
        }
        const img = node.querySelector('img');
        const url = getUrl(avatar);
        if (img.getAttribute('src') !== url) {
            img.setAttribute('src', url);
        }
        node.style.setProperty('--yt-slot', String(slot));
        node.style.setProperty('--yt-member-size', String(getSize(avatar) / 100));
        node.classList.toggle('yt-art-speaker', avatar === speaker);
        node.classList.toggle('yt-art-replying', avatar === replying);
        return node;
    });
    art.replaceChildren(...nodes);
    art.style.setProperty('--yt-lineup-count', String(nodes.length));
}

/**
 * Follows group replies: `onChange` runs when a member starts or stops replying and when
 * messages come or go, so the art can move the speaker to the front.
 */
export function initLineupEvents(onChange) {
    const { eventSource, eventTypes } = SillyTavern.getContext();
    // quiet generations (summaries and the like) aren't a member speaking
    let quiet = false;
    eventSource.on(eventTypes.GROUP_WRAPPER_STARTED, ({ type }) => {
        quiet = type === 'quiet';
    });
    eventSource.on(eventTypes.GROUP_MEMBER_DRAFTED, (characterId) => {
        if (!quiet) {
            replying = SillyTavern.getContext().characters[characterId]?.avatar ?? null;
            onChange();
        }
    });
    const done = () => {
        if (replying) {
            replying = null;
            onChange();
        }
    };
    eventSource.on(eventTypes.GROUP_WRAPPER_FINISHED, done);
    eventSource.on(eventTypes.GENERATION_STOPPED, done);
    eventSource.on(eventTypes.CHAT_CHANGED, () => {
        replying = null;
    });
    for (const type of [eventTypes.MESSAGE_RECEIVED, eventTypes.MESSAGE_DELETED, eventTypes.MESSAGE_SWIPED, eventTypes.GROUP_UPDATED]) {
        eventSource.on(type, onChange);
    }
}
