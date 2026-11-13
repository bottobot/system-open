# System Open

A small VS Code extension that opens PDFs, Office files, video and audio in your computer's default program (for example Acrobat or the Windows video app) instead of a VS Code tab.

## Why

We wanted these files to open in the programs we already use. Other extensions didn't do this for us. This one turned out to be a simple solution.

## How it works

- It watches VS Code's tabs. When a tab opens for a local file of a listed type, it closes the tab and opens the file in the system's default program.
- That works however the file was opened: from the Explorer, Quick Open, `code file.pdf`, or a link in the Claude panel.
- Windows uses `start`, macOS uses `open`, Linux uses `xdg-open`.
- Tabs that were already open when VS Code starts are left alone.
- If VS Code can't start the opener (`start`, `open` or `xdg-open`), the tab stays open and the reason is logged to the **System Open** output channel.

## Open With (Windows)

Right-click a file in the Explorer or on an editor tab and choose **Open With (Windows)...**. You get Windows' own "How do you want to open this file?" chooser, so you can pick any program.

## Settings

- `systemOpen.enabled` (default `true`): turn the tab handling on or off.
- `systemOpen.extensions`: file types to send out, without the dot. Empty means the built-in list: PDF, Office, common video and audio. Images, SVG and CSV are not in that list, so they stay in VS Code. Any list you set replaces the built-in list, so include every type you want, such as `pdf` and `mp4`.

To send one file out once, whatever its type, right-click it and choose **System Open: Open in System App**.

## Install

You need Node.js, the `code` command on your PATH, and internet access (the install downloads the packager).

```
git clone https://github.com/bottobot/system-open
cd system-open
node test.js
npm run install-local
```

Then reload VS Code.

## License

MIT. See [LICENSE](LICENSE).
