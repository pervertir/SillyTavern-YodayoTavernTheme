// Off means off: with this theme switched off, nothing of it may be in SillyTavern's page.
// Loads SillyTavern with the theme off, alone and next to each other installed theme, and
// fails if any yt- element, class, attribute, variable or style is found outside the theme's
// own settings panel. Also checks after turning the theme on and then off without a reload.
//
// Needs a running SillyTavern with a throwaway data folder (it changes extension settings)
// and playwright-core:
//   ST_URL=http://127.0.0.1:8001/ BROWSER=/path/to/chrome node test/off-check.mjs
// Exits 1 on any leak.

import { chromium } from 'playwright-core';

const URL = process.env.ST_URL || 'http://127.0.0.1:8001/';
const BROWSER = process.env.BROWSER || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SELF = 'third-party/SillyTavern-YodayoTavernTheme';
/** Other themes and the settings key each one turns on with */
const OTHERS = [
    ['third-party/SillyTavern-Discord', 'discordTheme'],
    ['third-party/SillyTavern-iMessage', 'iMessageTheme'],
    ['third-party/SillyTavern-MSTeams', 'msTeamsTheme'],
    ['third-party/SillyTavern-MoonlitEchoesTheme', 'SillyTavernMoonlitEchoesTheme'],
];

const browser = await chromium.launch({ executablePath: BROWSER, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const wait = ms => page.waitForTimeout(ms);
const load = async () => {
    await page.goto(URL);
    await page.waitForFunction(() => window.SillyTavern?.getContext?.().characters, null, { timeout: 60000 });
    await wait(4000);
};

/** Sets which extensions are on and whether this theme is enabled, then reloads. */
async function setup(ourEnabled, otherFolder) {
    await page.evaluate(async ([self, others, ourEnabled, otherFolder]) => {
        const ctx = SillyTavern.getContext();
        const e = ctx.extensionSettings;
        const off = new Set(e.disabledExtensions ?? []);
        for (const [folder, key] of others) {
            if (folder === otherFolder) {
                off.delete(folder);
                e[key] ??= {};
                e[key].enabled = true;
                e[key].activatedAt = Date.now() + 60000;
            } else {
                off.add(folder);
            }
        }
        off.delete(self);
        e.yodayoTavernTheme ??= {};
        e.yodayoTavernTheme.enabled = ourEnabled;
        e.yodayoTavernTheme.activatedAt = ourEnabled ? Date.now() + 120000 : 0;
        e.disabledExtensions = [...off];
        ctx.saveSettingsDebounced();
        await new Promise(r => setTimeout(r, 2500));
    }, [SELF, OTHERS, ourEnabled, otherFolder]);
    await load();
}

/** Everything of this theme found in the page, outside its settings panel. */
const findLeaks = () => page.evaluate(() => {
    const keep = (node) => node.closest('.yodayo-tavern-settings');
    const leaks = [];
    for (const node of document.querySelectorAll('*')) {
        if (keep(node)) {
            continue;
        }
        // (SillyTavern's own <script>/<link> tags that load the extension are fine)
        if (node.id && /^yt-|yodayo/i.test(node.id) && !node.id.startsWith('third-party_')) {
            leaks.push(`#${node.id}`);
        }
        for (const name of node.classList) {
            if (/^yt-|^yodayo/.test(name)) {
                leaks.push(`${node.tagName.toLowerCase()}.${name}`);
            }
        }
        for (const attr of node.attributes) {
            if (/^data-yt/i.test(attr.name)) {
                leaks.push(`${node.tagName.toLowerCase()}[${attr.name}]`);
            }
            if (attr.name === 'style' && /--yt-/.test(attr.value)) {
                leaks.push(`${node.id ? '#' + node.id : node.tagName.toLowerCase()} style --yt-`);
            }
        }
    }
    return [...new Set(leaks)];
});

let failed = false;
const report = (label, leaks) => {
    console.log(`${leaks.length ? 'FAIL' : 'ok  '} ${label}${leaks.length ? `: ${leaks.join(', ')}` : ''}`);
    failed ||= leaks.length > 0;
};

await load();
await setup(false, null);
report('off, no other theme', await findLeaks());
for (const [folder] of OTHERS) {
    await setup(false, folder);
    const present = await page.evaluate((name) => [...document.querySelectorAll('script[src], link[href]')].some(x => (x.getAttribute('src') || x.getAttribute('href') || '').includes(`/${name}/`)), folder.split('/')[1]);
    if (!present) {
        console.log(`skip ${folder.split('/')[1]} (not installed)`);
        continue;
    }
    report(`off, ${folder.split('/')[1]} on`, await findLeaks());
}

// on → off live, then on again (which reloads the page once), at home and in a chat
const toggle = (on) => page.evaluate((on) => { const c = document.getElementById('yt_enabled'); c.checked = on; c.dispatchEvent(new Event('change', { bubbles: true })); }, on);
const reportOn = async (label) => {
    const state = await page.evaluate(() => ({
        body: document.body.classList.contains('yodayo-tavern'),
        menuButton: !!document.getElementById('yt-rail-toggle'),
        homeOrChat: !!document.getElementById('yt-home') || !!SillyTavern.getContext().getCurrentChatId(),
    }));
    const missing = Object.entries(state).filter(([, ok]) => !ok).map(([part]) => part);
    console.log(`${missing.length ? 'FAIL' : 'ok  '} ${label}${missing.length ? `: missing ${missing.join(', ')}` : ''}`);
    failed ||= missing.length > 0;
};
/** Turns the theme on and waits for the one reload that follows. */
const turnOn = async () => {
    const reloaded = page.waitForEvent('load', { timeout: 15000 }).then(() => true, () => false);
    await toggle(true);
    if (!await reloaded) {
        console.log('FAIL turning on did not reload the page');
        failed = true;
    }
    await page.waitForFunction(() => window.SillyTavern?.getContext?.().characters, null, { timeout: 60000 });
    await wait(4000);
};
await setup(true, null);
await reportOn('on at load');
await toggle(false);
await wait(2500);
report('turned off live (home)', await findLeaks());
await turnOn();
await reportOn('turned on again (home)');
const opened = await page.evaluate(async () => {
    const ctx = SillyTavern.getContext();
    const id = ctx.characters.findIndex(c => c.avatar);
    if (id < 0) return false;
    await ctx.selectCharacterById(id);
    return true;
});
if (opened) {
    await wait(2500);
    await toggle(false);
    await wait(2500);
    report('turned off live (in a chat)', await findLeaks());
    await turnOn();
    await reportOn('turned on again (in a chat)');
}

// leave the theme on for the next run
await setup(true, null);
await browser.close();
process.exit(failed ? 1 : 0);
