"use strict";
// Pure logic for System Open, kept free of the vscode module so test.js can run it with plain node.

const path = require("node:path");

const DEFAULT_EXTENSIONS = [
	// documents
	"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf",
	// video
	"mp4", "m4v", "mov", "mkv", "avi", "webm", "wmv", "flv", "mpg", "mpeg", "3gp",
	// audio
	"mp3", "wav", "flac", "m4a", "aac", "ogg", "wma", "opus",
];

/** Lower-case extension list without dots; falls back to the defaults when the setting is empty or not a list. */
function normalizeExtensions(list) {
	if (!Array.isArray(list) || list.length === 0) return DEFAULT_EXTENSIONS.slice();
	return list.map((e) => String(e).trim().replace(/^\*?\./, "").toLowerCase()).filter(Boolean);
}

function wantsSystemApp(fsPath, extensions) {
	const ext = path.extname(fsPath).slice(1).toLowerCase();
	return ext !== "" && extensions.includes(ext);
}

/** Paths in `current` that were not open before (`known`). These are the tabs that just appeared. */
function newlyOpened(current, known) {
	return [...current].filter((p) => !known.has(p));
}

/**
 * The process that hands a file to the operating system's default program.
 * Windows: `start` in cmd.exe, which calls ShellExecute. The path travels in an environment
 * variable, so spaces, commas, ampersands and percent signs in it are never re-parsed as syntax.
 */
function openCommand(platform, fsPath, env) {
	if (platform === "win32") {
		return {
			file: process.env.ComSpec || "cmd.exe",
			args: ["/d", "/s", "/c", 'start "" "%SYSTEM_OPEN_TARGET%"'],
			options: { env: { ...env, SYSTEM_OPEN_TARGET: fsPath }, windowsVerbatimArguments: true, windowsHide: true },
		};
	}
	if (platform === "darwin") return { file: "open", args: [fsPath], options: { env } };
	return { file: "xdg-open", args: [fsPath], options: { env } };
}

/**
 * The process that shows Windows' own "How do you want to open this file?" chooser, the same
 * one File Explorer's Open with > Choose another app shows. rundll32 hands everything after the
 * entry point to OpenAs_RunDLL as one string, so the path goes unquoted and verbatim: spaces,
 * commas and ampersands are not re-parsed (no shell is involved). Windows only.
 */
function openWithCommand(platform, fsPath, env) {
	if (platform !== "win32") return undefined;
	const root = env.SystemRoot || env.windir || "C:\\Windows";
	return {
		file: path.win32.join(root, "System32", "rundll32.exe"),
		args: ["shell32.dll,OpenAs_RunDLL " + fsPath],
		options: { env, windowsVerbatimArguments: true },
	};
}

module.exports = { DEFAULT_EXTENSIONS, normalizeExtensions, wantsSystemApp, newlyOpened, openCommand, openWithCommand };
