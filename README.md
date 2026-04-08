# AureShot

Chrome Extension (Manifest V3) for capturing regions or full pages, opening the result in a dedicated editor, and exporting the annotated output as PNG or PDF.

## Product Overview

This project is a fully client-side extension. There is no backend, queue, or external capture service. The entire flow runs in the browser:

1. The popup starts the capture from the active tab.
2. The `service-worker` coordinates either region capture or full-page stitching.
3. The result is stored locally.
4. The editor opens in its own window so the user can annotate, crop, copy, share, or export the result.

## Main Features

- Region capture with a resizable selector on the current page
- Full-page capture with viewport-slice stitching
- Full-page capture cancellation with progress feedback in the popup
- Reopen the most recent locally saved project
- Dedicated editor in a separate window
- Annotation tools:
  - Select
  - Move / pan
  - Marker
  - Arrow
  - Text
  - Numbered pin
  - Circle
  - Rectangle
  - Blur
  - Redact
  - Crop
- Per-tool appearance controls:
  - Color
  - Stroke size
  - Opacity
  - Rotation
  - Font size
  - Text background
  - Alignment
  - List style
  - Border radius
- Eyedropper to sample colors directly from the screenshot
- Add extra images on top of the capture
- Undo / redo
- Project autosave and manual draft save
- Copy the final image to the clipboard
- PNG export
- PDF export
- Assisted sharing flow for WhatsApp Web, Telegram Web, Discord, and Slack

## Supported Languages

The UI uses built-in i18n with automatic browser-language selection and manual switching in both the popup and the editor.

- Portuguese (Brazil)
- Portuguese (Portugal)
- English
- Spanish
- French

## Local Installation

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `printExtensionChrome` folder.

## How To Use

### Popup

- `Select area`: injects the selector into the current tab.
- `Full page`: captures the full page, shows progress, and allows cancellation.
- `Resume latest project`: reopens the most recent locally saved capture or draft.

### Editor

After capture, the extension opens `editor.html` in a dedicated popup window. From there you can:

- Annotate the image
- Move and resize supported items
- Apply crop to the base capture
- Insert extra images into the canvas
- Copy the result
- Save the current state as a draft
- Download PNG
- Download PDF
- Open a sharing target and prepare the final file

## Sharing

The sharing flow is assisted, not native.

- For `PNG`, the extension opens the selected web app and copies the file to the clipboard.
- For `PDF`, the extension opens the selected web app and downloads the file for manual attachment.

Currently supported targets:

- WhatsApp Web
- Telegram Web
- Discord
- Slack

## Editor Shortcuts

- `Shift + scroll`: zoom
- `Space`: temporary pan
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`: redo
- `Delete` / `Backspace`: remove selected item
- `Ctrl/Cmd + Shift + C`: copy image
- `Ctrl/Cmd + S`: save draft
- `Shift` while drawing: snap for alignment and proportional shapes
- `F1` or `?`: open help

## Local Persistence

- Captures and drafts are stored in `IndexedDB` through [`capture-store.js`](./capture-store.js).
- The preferred language is stored in `chrome.storage.local`.
- The `service-worker` keeps only the 6 most recent records and removes older ones in the background.

## Development

### Prerequisites

- Node.js 18+ recommended
- A recent version of Google Chrome with Manifest V3 extension support

### Dependencies

```bash
npm install
```

### Distribution Build

```bash
npm run build
```

The build script:

- increments the version in `manifest.json`, `package.json`, and `package-lock.json`
- minifies `.js` and `.css` files
- packages the extension into `build/aureshot-v<version>.zip`

Use this command only when the change is ready for packaging, because it automatically changes the project version.

## Main Structure

- `manifest.json`: extension manifest and permissions
- `popup.html`, `popup.css`, `popup.js`: capture launcher UI
- `content-script.js`, `content-style.css`: region selector injected into the page
- `service-worker.js`: capture orchestration, full-page stitching, and editor launch
- `service-i18n.js`: minimal i18n layer for the worker
- `editor.html`, `editor.css`, `editor.js`: annotation and export editor
- `i18n.js`: UI i18n system
- `capture-store.js`: local persistence via IndexedDB
- `build.mjs`: packaging and versioning pipeline

## Permissions

- `activeTab`: capture the active tab
- `scripting`: inject the region selector and capture helpers
- `storage`: persist preferred language and recent projects

## Known Limitations

- Cross-origin iframes may not be captured as a single fully controlled surface.
- Closed shadow DOM cannot be fully inspected or normalized.
- Pages with aggressive virtualization may fail during full-page capture because not all content is rendered at once.
- The full-page algorithm is optimized for traditional vertical scrolling; highly custom layouts may require additional work.
- Sharing does not send attachments directly to the target apps; it only opens the service and prepares the file.

## Technical Notes

- The project uses its own UI internationalization layer, plus `_locales/en/messages.json` for manifest metadata.
- The editor generates PNG locally from the final canvas and builds the PDF on the client.
- The editor uses Font Awesome via CDNJS, reflected in the manifest `content_security_policy`.
- The repository does not yet include an automated test suite; validation is currently manual.

## Minimum Manual Validation Flow

Before publishing a new version, validate at least:

1. Region capture on a simple page.
2. Full-page capture on a long page.
3. Reopen the latest project.
4. Draft save and restore in the editor.
5. PNG and PDF export.
6. Clipboard copy.
7. Language switching in the popup and editor.

## License

This project is licensed under the MIT License. See [`LICENSE`](./LICENSE).
