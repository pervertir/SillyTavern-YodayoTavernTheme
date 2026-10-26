# Yodayo Tavern theme for SillyTavern

A SillyTavern UI theme modelled on the Yodayo / Moescape Tavern chat: flat charcoal
surfaces, a lime accent, Inter type, rounded chat bubbles with your messages on the
right, and a pill-shaped message box with a round lime send button.

![Chat preview](screenshots/chat.jpg)

Built and tested against **SillyTavern 1.19.0**.

## Install

**Import from the UI (recommended)**

1. Download `Yodayo Tavern.json` from this repo.
2. In SillyTavern open **User Settings** (the person-with-gear icon in the top bar).
3. Under **Theme**, click the import button and pick the file.
4. Choose **Yodayo Tavern** from the theme dropdown.

**Copy the file**

Copy `Yodayo Tavern.json` into `SillyTavern/data/<your-user>/themes/`
(usually `data/default-user/themes/`), then reload SillyTavern and pick the theme.

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

All of these are CSS variables (`--yt-*`) at the top of `src/theme.css`, so the
whole theme can be recolored by changing a few lines.

## Notes

- **Font:** the theme asks for Inter and falls back to the system UI font. It does
  not load a web font, so SillyTavern won't show its `@import` warning on import.
  Install Inter locally if you want an exact match.
- **Theme extensions:** extensions that restyle the whole UI (for example Moonlit
  Echoes) override the chat layout with `!important` rules. Disable them while
  using this theme.
- **Background:** your chat background image stays visible outside the chat column.
  Pick a dark or plain background for the flattest Yodayo look.

## Development

The theme lives in two source files:

- `src/theme.base.json`: SillyTavern's color pickers and UI toggles
- `src/theme.css`: the custom CSS

`build.mjs` merges them into the importable `Yodayo Tavern.json`. It needs only Node:

```bash
node build.mjs
```

Commit the regenerated `Yodayo Tavern.json` together with the source changes.

## License

MIT. See [LICENSE](LICENSE).
