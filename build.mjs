// Embeds src/theme.css into src/theme.base.json and writes the importable theme file.
import { readFileSync, writeFileSync } from 'node:fs';

const base = JSON.parse(readFileSync(new URL('./src/theme.base.json', import.meta.url), 'utf8'));
const css = readFileSync(new URL('./src/theme.css', import.meta.url), 'utf8');

if (css.includes('@import')) {
    throw new Error('theme.css must not use @import (SillyTavern warns on import)');
}

const theme = { ...base, custom_css: css };
const out = `${theme.name}.json`;
writeFileSync(new URL(`./${out}`, import.meta.url), JSON.stringify(theme, null, 4) + '\n');
console.log(`Wrote ${out}`);
