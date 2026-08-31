import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    if (!/\.tsx?$/.test(entry.name) || entry.name.endsWith(".test.ts")) return [];
    if (path.endsWith(join("lib", "master-mock-dataset.ts"))) return [];
    return [path];
  });
}

const sourceFiles = listSourceFiles("src");

const forbidden = [
  ["MENTOR", "_ACCOUNTS"].join(""),
  ["get", "Demo", "UserForEmail"].join(""),
  ["staffinix", "_active_user"].join(""),
  ["user", "-custom-"].join(""),
  ["auth", "-helpers"].join(""),
  ["setActive", "DemoUser"].join(""),
  ["getActive", "DemoUser"].join(""),
  ["clearActive", "DemoUser"].join(""),
];

const violations = [];
for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  for (const marker of forbidden) {
    if (source.includes(marker)) violations.push(`${file}: prohibited marker ${marker}`);
  }
}

const tenancySource = readFileSync("src/lib/tenancy.functions.ts", "utf8");
for (const unsafeDefault of ['platformRole: "platform_owner"', "isPlatformStaff: true"]) {
  if (tenancySource.includes(unsafeDefault)) {
    violations.push(`src/lib/tenancy.functions.ts: privileged default ${unsafeDefault}`);
  }
}

assert.deepEqual(
  violations,
  [],
  `Production authentication bypass markers found:\n${violations.join("\n")}`,
);

console.log(`Authentication bypass scan passed (${sourceFiles.length} production source files).`);
