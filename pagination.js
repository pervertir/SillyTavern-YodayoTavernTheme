// Moves every list's page controls below the list they page through. SillyTavern finds
// these containers by id, so moving them is safe; turning the theme off puts them back.

/** [pagination container, list it pages] */
const PAIRS = Object.freeze([
    ['rm_print_characters_pagination', 'rm_print_characters_block'],
    ['world_info_pagination', 'world_popup_entries_list'],
    ['persona_pagination_container', 'user_avatar_block'],
    ['rm_group_members_pagination', 'rm_group_members'],
    ['rm_group_add_members_pagination', 'rm_group_add_members'],
]);

/** Where each container lived originally, so it can go back */
const origins = new Map();

/** The character list keeps its grid toggle and bulk edit tools in its page controls; they
 * move up into the list's button bar so the page controls can sit centered on their own. */
const CHARACTER_TOOLS = Object.freeze(['charListGridToggle', 'bulkEditButton', 'bulkSelectedCount', 'bulkSelectAllButton', 'bulkDeleteButton']);

function placeCharacterTools(inToolbar) {
    const pagination = document.getElementById('rm_print_characters_pagination');
    const toolbar = document.getElementById('rm_button_bar');
    if (!pagination || !toolbar) {
        return;
    }
    const tools = CHARACTER_TOOLS.map(id => document.getElementById(id)).filter(Boolean);
    if (inToolbar) {
        toolbar.append(...tools);
    } else if (tools.some(tool => tool.parentElement !== pagination)) {
        pagination.prepend(...tools);
    }
}

/** @param {boolean} atBottom Move the controls below their lists, or back */
export function placePagination(atBottom) {
    placeCharacterTools(atBottom);
    for (const [paginationId, listId] of PAIRS) {
        const pagination = document.getElementById(paginationId);
        const list = document.getElementById(listId);
        if (!pagination || !list?.parentElement) {
            continue;
        }
        if (!origins.has(paginationId)) {
            origins.set(paginationId, { parent: pagination.parentElement, next: pagination.nextSibling });
        }
        if (atBottom) {
            if (list.nextSibling !== pagination) {
                list.after(pagination);
            }
            pagination.classList.add('yt-pagination-bottom');
        } else {
            const origin = origins.get(paginationId);
            if (origin?.parent && pagination.parentElement !== origin.parent) {
                origin.parent.insertBefore(pagination, origin.next?.parentElement === origin.parent ? origin.next : null);
            }
            pagination.classList.remove('yt-pagination-bottom');
        }
    }
}
