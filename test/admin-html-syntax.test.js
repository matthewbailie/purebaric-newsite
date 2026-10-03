const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

test("admin inline scripts compile", () => {
  const html = readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

  assert.ok(scripts.length > 0, "expected at least one inline script");
  scripts.forEach((match, index) => {
    const result = spawnSync(process.execPath, ["--check", "-"], {
      input: match[1],
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `inline script ${index + 1} failed syntax check:\n${result.stderr}`);
  });
});
