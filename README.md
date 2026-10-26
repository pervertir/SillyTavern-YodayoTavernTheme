# Yodayo Tavern Theme for SillyTavern

A SillyTavern extension that gives the UI the look of the Yodayo / Moescape Tavern chat:
flat charcoal surfaces, a lime accent, Inter type, rounded chat bubbles with your
messages on the right, and a pill-shaped message box with a round send button.

![Chat preview](screenshots/chat.jpg)

Built and tested against **SillyTavern 1.19.0**.

## Install

1. In SillyTavern open **Extensions** (the stacked-cubes icon in the top bar).
2. Click **Install extension** and paste:
   ```
   https://github.com/pervertir/SillyTavern-YodayoTavernTheme
   ```
3. Reload the page. The theme turns on straight away.

To install by hand, clone this repo into
`SillyTavern/public/scripts/extensions/third-party/` and reload.

## Settings

Open **Extensions → Yodayo Tavern Theme**:

![Settings panel](screenshots/settings.jpg)

| Setting | What it does |
| --- | --- |
| Enable theme | Turns the whole look on or off without uninstalling. |
| Accent color | Recolors the send button, names, quotes and highlights. Reset returns to Yodayo lime. |
| Your messages | Put your bubbles on the right (Yodayo style) or the left. |
| Font | Inter (falls back to the system font), the system UI font, or SillyTavern's default. |
| Bubble max width | How wide a chat bubble may grow on desktop. |
| Chat opacity | How see-through the chat panel and message box are (default 80%). |
| Chat position | Dock the chat window on the left, in the middle, or on the right. |
| Show character image | With the chat on the left or right, shows the character's image on the free side. |
| Hide chat background image | Hides your background for a flat Yodayo look. |

### Chat position

With the chat docked to one side, the character appears on the other. If you use
Character Expressions, the expression sprite moves there. Otherwise the extension
shows the character's card image. Group chats and Visual Novel mode keep their own
layout, and on phones the chat always fills the screen.

| Chat on the left | Chat on the right |
| --- | --- |
| ![Chat docked left](screenshots/position-left.jpg) | ![Chat docked right](screenshots/position-right.jpg) |

## Palette

| Role            | Color                       |
| --------------- | --------------------------- |
| Background      | `#1a1c1e`                   |
| Surface         | `#232527`                   |
| Raised surface  | `#2c2e30`                   |
| Text            | `#f0f0f0`                   |
| Muted text      | `#a8a8a8`                   |
| Accent          | `#e4f063`                   |
| Hairline border | `rgba(230, 230, 230, 0.1)`  |

## Notes

- **Other theme extensions:** Moonlit Echoes and similar extensions restyle the same
  elements with `!important` rules, so the two will fight. Disable the other one in
  **Manage extensions** while using this theme. The settings panel warns you when
  Moonlit Echoes is active.
- **Theme presets:** the extension overrides SillyTavern's theme colors while it is
  enabled, so any built-in theme preset works underneath it.
- **Font:** Inter isn't bundled. Install it locally for an exact match, otherwise
  the system UI font is used.

## Development

- `manifest.json`: extension metadata
- `index.js`: settings panel and the body classes / CSS variables it controls
- `settings.html`: the settings panel markup
- `style.css`: the theme, every rule scoped under `body.yodayo-tavern`

To work on it live, clone the repo straight into
`SillyTavern/public/scripts/extensions/third-party/` and reload SillyTavern after edits.

## License

MIT. See [LICENSE](LICENSE).
