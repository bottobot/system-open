"use strict";
// System Open: when a file of a chosen type opens as a VS Code tab, close the tab and open the
// file in the operating system's default program instead.
//
// It watches tabs rather than registering a custom editor, so it works however the file was
// opened: a link in the Claude panel, the Explorer, Quick Open or `code <file>`. Custom editors
// and editor associations are skipped by callers that open a text editor directly.

const vscode = require("vscode");
const { spawn } = require("node:child_process");
const core = require("./core");

let known = new Set();
let log;

function settings() {
	const cfg = vscode.workspace.getConfiguration("systemOpen");
	return { enabled: cfg.get("enabled", true), extensions: core.normalizeExtensions(cfg.get("extensions")) };
}

function tabFileUri(tab) {
	const input = tab.input;
	if (input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputNotebook) {
		return input.uri.scheme === "file" ? input.uri : undefined;
	}
	return undefined; // diffs, terminals, webviews and the rest are left alone
}

/** Map of open file paths of the chosen types to their tabs. */
function matchingTabs(extensions) {
	const found = new Map();
	for (const group of vscode.window.tabGroups.all) {
		for (const tab of group.tabs) {
			const uri = tabFileUri(tab);
			if (uri && core.wantsSystemApp(uri.fsPath, extensions)) {
				const list = found.get(uri.fsPath) || [];
				list.push(tab);
				found.set(uri.fsPath, list);
			}
		}
	}
	return found;
}

function openInSystemApp(fsPath) {
	return launch(core.openCommand(process.platform, fsPath, process.env));
}

function launch({ file, args, options }) {
	return new Promise((resolve) => {
		const child = spawn(file, args, { ...options, detached: true, stdio: "ignore" });
		child.once("error", (err) => resolve(err));
		child.once("spawn", () => {
			child.unref();
			resolve(undefined);
		});
	});
}

async function onTabsChanged() {
	const { enabled, extensions } = settings();
	const current = matchingTabs(extensions);
	const fresh = enabled ? core.newlyOpened(current.keys(), known) : [];
	known = new Set(current.keys());
	for (const fsPath of fresh) {
		const err = await openInSystemApp(fsPath);
		if (err) {
			log.appendLine(`Could not open ${fsPath}: ${err.message}. The tab stays open.`);
			continue;
		}
		log.appendLine(`Opened in the system app: ${fsPath}`);
		await vscode.window.tabGroups.close(current.get(fsPath), true);
		known.delete(fsPath);
	}
}

/** The Explorer/tab item a menu command was invoked on, else the active editor's file. */
function commandTarget(uri) {
	return uri instanceof vscode.Uri ? uri : vscode.window.activeTextEditor?.document.uri
		?? tabFileUri(vscode.window.tabGroups.activeTabGroup.activeTab ?? {});
}

function activate(context) {	log = vscode.window.createOutputChannel("System Open");
	// Tabs already open when VS Code starts (restored sessions) are not reopened.
	known = new Set(matchingTabs(settings().extensions).keys());
	context.subscriptions.push(
		log,
		vscode.window.tabGroups.onDidChangeTabs(() => onTabsChanged().catch((e) => log.appendLine(String(e && e.stack || e)))),
		vscode.commands.registerCommand("systemOpen.openActiveFile", async (uri) => {
			const target = commandTarget(uri);
			if (!target || target.scheme !== "file") return void vscode.window.showWarningMessage("System Open: no local file to open.");
			const err = await openInSystemApp(target.fsPath);
			if (err) vscode.window.showErrorMessage(`System Open: ${err.message}`);
		}),
		vscode.commands.registerCommand("systemOpen.openWithWindows", async (uri) => {
			const target = commandTarget(uri);
			if (!target || target.scheme !== "file") return void vscode.window.showWarningMessage("System Open: no local file to open.");
			const cmd = core.openWithCommand(process.platform, target.fsPath, process.env);
			if (!cmd) return void vscode.window.showWarningMessage("System Open: the Windows Open With chooser exists only on Windows.");
			const err = await launch(cmd);
			if (err) vscode.window.showErrorMessage(`System Open: ${err.message}`);
		}),
	);
	log.appendLine(`System Open ready. Types: ${settings().extensions.join(", ")}`);
}

function deactivate() {}

module.exports = { activate, deactivate };
