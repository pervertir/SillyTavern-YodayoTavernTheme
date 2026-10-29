// New group: SillyTavern saves it with a small unlabelled check mark. The theme shows that
// button as "Create group" (lists.css), lets Enter in the group name create it, and says that
// the group's scenario can be set once it exists. Nothing happens while the theme is off.

const HINT_ID = 'yt-group-create-hint';

function themeOn() {
    return document.body.classList.contains('yodayo-tavern');
}

/** Whether the group panel is creating a new group (SillyTavern shows its submit button then) */
function creating() {
    const submit = document.getElementById('rm_group_submit');
    return !!submit && submit.style.display !== 'none' && getComputedStyle(submit).display !== 'none';
}

export function initGroupCreate() {
    const bar = document.getElementById('rm_group_top_bar');
    if (bar && !document.getElementById(HINT_ID)) {
        const hint = document.createElement('div');
        hint.id = HINT_ID;
        hint.textContent = 'Pick members below, then Create group. Once the group exists you can set its scenario (the scroll button).';
        bar.after(hint);
    }
    document.getElementById('rm_group_chat_name')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.isComposing && themeOn() && creating()) {
            event.preventDefault();
            document.getElementById('rm_group_submit')?.click();
        }
    });
}
