# AureShot

Chrome Extension (Manifest V3) for capturing screenshots from the current tab and annotating them in a dedicated editor window.

## Features

- Resizable region capture on the current page
- Full-page capture with stitched scrolling
- Dedicated editor window for annotation and export
- Annotation tools:
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
- Undo / redo
- Copy image to clipboard
- Save draft and reopen the latest project
- PNG export
- Built-in help modal with shortcuts
- UI localization with browser-language default and manual switching

## Supported Languages

- English
- Portuguese (Brazil)
- Portuguese (Portugal)
- Spanish
- French

The extension uses the browser UI language by default. Users can change the language manually from the popup and the editor.

## Installation

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `printExtensionChrome` folder

## Usage

### Capture Modes

- `Select area`: injects a resizable selection overlay into the current page
- `Full page`: captures the full scrollable page and opens it in the editor
- `Resume latest project`: reopens the most recent saved capture/draft

### Editor

After capture, the extension opens a separate editor window where you can:

- Draw annotations and shapes
- Move and resize supported items
- Pan and zoom the captured image
- Apply crop to the captured image
- Copy the result to the clipboard
- Save a draft
- Export the final image as PNG

## Keyboard Shortcuts

- `Shift + scroll`: zoom
- `Space`: temporary pan
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`: redo
- `Delete / Backspace`: delete selected item
- `Ctrl/Cmd + Shift + C`: copy image
- `Ctrl/Cmd + S`: save draft
- `Shift` while drawing: snap to aligned or proportional shapes
- `F1` or `?`: open help

## Technical Notes

- Full-page capture is built by stitching viewport slices from top to bottom
- The extension stores recent captures and drafts in local browser storage / IndexedDB
- The current implementation is optimized for standard document scrolling and common SPA layouts

## Known Limitations

- Cross-origin iframes cannot always be captured as a single fully controlled surface
- Closed shadow DOM content cannot be fully inspected or normalized during capture
- Highly virtualized pages may not render every item during stitched full-page capture

## Permissions

- `activeTab`: interact with the current tab for capture
- `scripting`: inject the selector and capture helpers
- `storage`: persist language preference and recent projects

## Development

Main files:

- `manifest.json`: extension manifest
- `popup.html`, `popup.css`, `popup.js`: capture launcher UI
- `content-script.js`, `content-style.css`: in-page region selector
- `service-worker.js`: capture orchestration and full-page stitching
- `editor.html`, `editor.css`, `editor.js`: annotation editor
- `i18n.js`: localization system
- `capture-store.js`: IndexedDB persistence

## Contributing

Issues and pull requests are welcome. If you plan to change capture behavior, test both region capture and full-page capture before submitting.
