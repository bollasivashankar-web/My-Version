import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function listTypeScript(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScript(path);
    return entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

const violations = [];
let serverFunctionCount = 0;

for (const file of listTypeScript("src")) {
  const source = readFileSync(file, "utf8");
  const starts = [...source.matchAll(/export const (\w+) = createServerFn\(/g)];
  for (let index = 0; index < starts.length; index += 1) {
    serverFunctionCount += 1;
    const start = starts[index];
    const end = starts[index + 1]?.index ?? source.length;
    const block = source.slice(start.index, end);
    if (!block.includes(".middleware([requireSupabaseAuth])")) {
      violations.push(`${file}:${start[1]} has no Supabase authentication middleware`);
    }
  }
}

const privilegedGuards = {
  "src/lib/users.functions.ts": {
    listUsers: "requireAdminContext(context)",
    inviteUser: "requireAdminContext(context)",
    updateUserRole: "assertCanManageUser",
    setUserActive: "assertCanManageUser",
  },
  "src/lib/tenancy.functions.ts": {
    listTenants: "requirePlatformAdmin",
    createTenant: "requirePlatformAdmin",
    updateTenant: "requirePlatformAdmin",
    getCompanyOverview: "requireAdmin",
    updateMyCompany: "requireAdmin",
  },
  "src/lib/access-requests.functions.ts": {
    listAccessRequests: "requirePlatformAdmin",
    reviewAccessRequest: "requirePlatformAdmin",
  },
  "src/lib/developer.functions.ts": {
    getDeveloperConfig: "requireAdmin(context)",
    createApiKey: "requireAdmin(context)",
    revokeApiKey: "requireAdmin(context)",
    updateWorkflowSettings: "requireAdmin(context)",
  },
};

for (const [file, guards] of Object.entries(privilegedGuards)) {
  const source = readFileSync(file, "utf8");
  const starts = [...source.matchAll(/export const (\w+) = createServerFn\(/g)];
  for (let index = 0; index < starts.length; index += 1) {
    const name = starts[index][1];
    const guard = guards[name];
    if (!guard) continue;
    const end = starts[index + 1]?.index ?? source.length;
    const block = source.slice(starts[index].index, end);
    if (!block.includes(guard)) violations.push(`${file}:${name} is missing ${guard}`);
  }
}

const middleware = readFileSync("src/integrations/supabase/auth-middleware.ts", "utf8");
const selectsActiveProfile = /\.select\("[^"]*\bis_active\b[^"]*"\)/.test(middleware);
const deniesInactiveProfile = middleware.includes("profile?.is_active !== true");
if (!selectsActiveProfile || !deniesInactiveProfile) {
  violations.push("Authentication middleware does not enforce active profiles");
}

assert.deepEqual(violations, [], `Server authorization violations:\n${violations.join("\n")}`);
console.log(`Server authorization scan passed (${serverFunctionCount} server functions).`);
