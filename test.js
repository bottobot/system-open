"use strict";
// Plain-node tests for core.js. Run: node test.js
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const core = require("./core");

let failed = 0;
function test(name, fn) {
	try {
		fn();
		console.log(`ok - ${name}`);
	} catch (e) {
		failed++;
		console.log(`not ok - ${name}\n  ${e.message}`);
	}
}

test("defaults cover pdf and mp4", () => {
	const exts = core.normalizeExtensions([]);
	assert.ok(core.wantsSystemApp("C:\\a\\b.PDF", exts));
	assert.ok(core.wantsSystemApp("/home/r/v.mp4", exts));
	assert.ok(!core.wantsSystemApp("C:\\a\\notes.md", exts));
	assert.ok(!core.wantsSystemApp("C:\\a\\Makefile", exts));
});

test("user list accepts dots, stars and capitals", () => {
	const exts = core.normalizeExtensions([".PNG", "*.svg", "csv"]);
	assert.deepEqual(exts, ["png", "svg", "csv"]);
	assert.ok(!core.wantsSystemApp("x.pdf", exts));
});

test("only paths not already open count as new", () => {
	assert.deepEqual(core.newlyOpened(["a.pdf", "b.mp4"], new Set(["a.pdf"])), ["b.mp4"]);
	assert.deepEqual(core.newlyOpened([], new Set(["a.pdf"])), []);
});

test("windows command passes the path in an env var, never in the command line", () => {
	const p = "C:\\Dev Stuff\\a,b & c%PATH%.pdf";
	const c = core.openCommand("win32", p, {});
	assert.equal(c.options.env.SYSTEM_OPEN_TARGET, p);
	assert.ok(!c.args.join(" ").includes("Dev Stuff"));
	assert.equal(c.options.windowsVerbatimArguments, true);
});

test("linux and mac pass the path as one argument", () => {
	assert.deepEqual(core.openCommand("linux", "/a b/c.pdf", {}).args, ["/a b/c.pdf"]);
	assert.equal(core.openCommand("linux", "/x.pdf", {}).file, "xdg-open");
	assert.equal(core.openCommand("darwin", "/x.pdf", {}).file, "open");
});

test("open with: rundll32 OpenAs_RunDLL gets the raw path verbatim, windows only", () => {
	const p = "C:\\Dev Stuff\\a,b & c (1).pdf";
	const c = core.openWithCommand("win32", p, { SystemRoot: "C:\\Windows" });
	assert.equal(c.file, "C:\\Windows\\System32\\rundll32.exe");
	assert.deepEqual(c.args, ["shell32.dll,OpenAs_RunDLL " + p]);
	assert.equal(c.options.windowsVerbatimArguments, true);
	assert.equal(core.openWithCommand("linux", "/x.pdf", {}), undefined);
	assert.equal(core.openWithCommand("darwin", "/x.pdf", {}), undefined);
});

test("open with is wired to the Explorer menu on Windows", () => {
	const pkg = require("./package.json");
	const cmd = "systemOpen.openWithWindows";
	assert.ok(pkg.contributes.commands.some((c) => c.command === cmd));
	const item = pkg.contributes.menus["explorer/context"].find((m) => m.command === cmd);
	assert.ok(item && /isWindows/.test(item.when) && /!explorerResourceIsFolder/.test(item.when));
	assert.ok(fs.readFileSync(path.join(__dirname, "extension.js"), "utf8").includes(`registerCommand("${cmd}"`));
});

// The env-var route must survive awkward paths. Swap `start` for `echo` and read back what cmd expanded.
if (process.platform === "win32") {
	test("cmd expands the env var to the exact path, specials intact", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sysopen "));
		const p = path.join(dir, "a,b & c^d %PATH% (1).pdf");
		const c = core.openCommand("win32", p, process.env);
		const args = c.args.map((a) => a.replace('start "" ', "echo "));
		const r = spawnSync(c.file, args, { ...c.options, encoding: "utf8" });
		fs.rmSync(dir, { recursive: true, force: true });
		assert.equal(r.status, 0, r.stderr);
		assert.equal(r.stdout.trim(), `"${p}"`);
	});
}

if (failed) {
	console.log(`${failed} failed`);
	process.exit(1);
}
console.log("all passed");
