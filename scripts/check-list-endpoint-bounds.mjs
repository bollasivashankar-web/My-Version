import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const checks = [
  ["src/lib/candidates.functions.ts", "listCandidates", /\.range\(/],
  ["src/lib/clients.functions.ts", "listClients", /\.range\(/],
  ["src/lib/clients.functions.ts", "listClientsLite", /\.limit\(200\)/],
  ["src/lib/requirements.functions.ts", "listRequirements", /\.range\(/],
  ["src/lib/access-requests.functions.ts", "getMyAccessRequest", /\.limit\(100\)/],
  ["src/lib/access-requests.functions.ts", "listAccessRequests", /\.limit\(100\)/],
  ["src/lib/users.functions.ts", "listUsers", /\.limit\(100\)/],
  ["src/lib/dashboard.functions.ts", "getRecentActivity", /\.limit\(15\)/],
  ["src/lib/candidates.functions.ts", "getCandidate", /\.limit\(50\)[\s\S]*\.limit\(100\)/],
  ["src/lib/candidates.functions.ts", "semanticSearchCandidates", /\.limit\(data\.limit\)/],
  ["src/lib/dashboard.functions.ts", "getSubmissionsTrend", /\.limit\(MAX_DASHBOARD_DETAIL_ROWS\)/],
  ["src/lib/dashboard.functions.ts", "getPipelineFunnel", /head:\s*true/],
  ["src/lib/dashboard.functions.ts", "getRequirementsBreakdown", /head:\s*true/],
  ["src/lib/dashboard.functions.ts", "getTopRecruiters", /\.limit\(MAX_DASHBOARD_DETAIL_ROWS\)/],
  ["src/lib/dashboard.functions.ts", "getBenchStats", /\.limit\(MAX_DASHBOARD_DETAIL_ROWS\)/],
];

const cache = new Map();

for (const [path, functionName, boundPattern] of checks) {
  const source = cache.get(path) ?? (await readFile(path, "utf8"));
  cache.set(path, source);
  const start = source.indexOf(`export const ${functionName}`);
  assert.notEqual(start, -1, `${functionName} is missing from ${path}`);
  const nextExport = source.indexOf("export const ", start + 13);
  const body = source.slice(start, nextExport === -1 ? source.length : nextExport);
  assert.match(body, boundPattern, `${functionName} must enforce a server-side result bound`);
}

const allServerSources = [...cache.values()].join("\n");
assert.doesNotMatch(
  allServerSources,
  /\.from\(["']notifications["']\)/,
  "A notifications endpoint exists but is not included in the bounded endpoint audit",
);

console.log(`Verified server-side bounds for ${checks.length} collection endpoints.`);
