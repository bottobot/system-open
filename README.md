# System Open

A small local VS Code extension that opens PDFs, Office files, video and audio in the operating system's default program (Acrobat, the Windows video app, and so on) instead of in a VS Code tab.

## How it works

It watches VS Code's tabs. When a tab opens for a local file whose type is on the list, it closes the tab and hands the file to the operating system.

That works however the file was opened: a link in the Claude panel, the Explorer, Quick Open, or `code file.pdf`. The extension it replaces (`slaugaus.open-with-system`) used a custom editor plus `workbench.editorAssociations`. Callers that open a text editor directly, such as the Claude panel's file links, skip associations, so files still opened in VS Code.

- Windows: `cmd /c start`, which uses the Windows default program. The path is passed in an environment variable, so spaces, commas, `&` and `%` in it are safe.
- Linux: `xdg-open`. macOS: `open`.
- Tabs restored when VS Code starts are left alone.
- If the system app cannot be started, the tab stays open and the reason goes to the **System Open** output channel.

## Settings

- `systemOpen.enabled` (default `true`).
- `systemOpen.extensions`: types to send out, without the dot. Empty means the built-in list in `core.js` (PDF, Office, common video and audio). Images, SVG and CSV stay in VS Code unless you add them.

Right-click a file in the Explorer or on a tab: **System Open: Open in System App** sends any file out once.

## Build and install

```
node test.js
npm run install-local
```
