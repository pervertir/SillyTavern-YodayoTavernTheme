# Yodayo Tavern Theme for SillyTavern

A SillyTavern extension that restyles the whole UI after the Yodayo / Moescape Tavern
chat: frosted chat bubbles straight on your background, a lime accent, Inter type, a
navigation rail on the left (opened from a SillyTavern-logo button) with drawers as side sheets, switch toggles,
modern sliders and fields, and popover menus.

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
| Bubble opacity | How see-through chat bubbles and the message box are (default 80%). |
| Tavern home page | Turns the welcome screen into a Yodayo-style character browser: recent chats, search, tag chips and a grid of character and group cards. An ST Assistant tab opens a chat with SillyTavern's assistant, and New group starts a group chat. |
| Navigation | Left rail opened by a SillyTavern-logo button in the top-left corner (default), left rail always shown, or SillyTavern's top bar. The rail is desktop only; phones keep the top bar. |
| Menu width | Each menu opens at a width that suits it (for example 440px for AI settings, 820px for User Settings). Drag an open menu's edge to resize it; each menu remembers its own width. Double-click the edge to reset. |
| Colors | Character name, text, dialogue ("quotes"), narration (*actions*) and bubble, plus your name, text and bubble. Set them for all characters, or for only the open character to override. |
| Character image | With "Only this character" selected, an image URL to show instead of the card art on the free side. |
| Export / Import | Save all theme settings, including per-character colors, to a JSON file and load them back. |
| Chat position | Dock the chat window on the left, in the middle, or on the right. |
| Show character image | With the chat on the left or right, shows the character's image on the free side, at full height when the image is large enough. |
| Hide chat background image | Hides your background for a flat Yodayo look. |

### Chat position

With the chat docked to one side, the character appears on the other. If you use
Character Expressions, the expression sprite moves there. Otherwise the extension
shows the character's card image. Group chats and Visual Novel mode keep their own
layout, and on phones the chat always fills the screen.

| Chat on the left | Chat on the right |
| --- | --- |
| ![Chat docked left](screenshots/position-left.jpg) | ![Chat docked right](screenshots/position-right.jpg) |

### Chat styles and visual novel mode

The theme follows SillyTavern's **Chat Style** setting (User Settings):

- **Bubbles:** Yodayo-style bubbles, yours on the right.
- **Flat:** full-width message rows; yours have an accent stripe.
- **Document:** one centered reading page with book-style text.

With **Visual Novel Mode** on, the chat becomes a centered panel along the bottom (80% wide,
30% tall) and the character stands above it, using the expression sprite when there is one.
Drag the bar on the chat's top edge to give the chat or the image more room; the split is
remembered.

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
- `home.js`: the Tavern home page on the welcome screen
- `vn.js`: the visual novel layout's resize handle
- `sheets.js`: drag handles that resize the menus
- `sliders.js`: keeps each slider's fill in step with its value
- `swipes.js`: marks single-swipe messages so their counter can hide
- `colors.js`: chat colors (all characters or per character), character image and export/import
- `style.css`: imports the theme modules in `css/` (tokens, navigation, controls, chat,
  composer, lists, overlays, layout). Every rule is scoped under `body.yodayo-tavern`.

To work on it live, clone the repo straight into
`SillyTavern/public/scripts/extensions/third-party/` and reload SillyTavern after edits.

## License

MIT. See [LICENSE](LICENSE).
