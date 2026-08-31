import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAdmin,
  assertCanManageUser,
  assertPlatformAdmin,
  assertSuperAdmin,
  ForbiddenError,
  type AuthorizationSnapshot,
} from "./authorization-policy.ts";

const snapshot = (
  roles: AuthorizationSnapshot["roles"] = [],
  overrides: Partial<AuthorizationSnapshot> = {},
): AuthorizationSnapshot => ({
  active: true,
  tenantId: "tenant-a",
  roles,
  platformRole: null,
  ...overrides,
});

test("ordinary authenticated and recruiter users cannot access admin operations", () => {
  for (const actor of [snapshot(), snapshot(["recruiter"])]) {
    assert.throws(
      () => assertAdmin(actor),
      (error) => error instanceof ForbiddenError && error.status === 403,
    );
  }
});

test("admin and super admin can access company-admin operations", () => {
  assert.doesNotThrow(() => assertAdmin(snapshot(["admin"])));
  assert.doesNotThrow(() => assertAdmin(snapshot(["super_admin"])));
});

test("only super admin can access super-admin operations", () => {
  assert.throws(() => assertSuperAdmin(snapshot(["admin"])), ForbiddenError);
  assert.doesNotThrow(() => assertSuperAdmin(snapshot(["super_admin"])));
});

test("company roles cannot access platform operations", () => {
  assert.throws(() => assertPlatformAdmin(snapshot(["super_admin"])), ForbiddenError);
  assert.doesNotThrow(() => assertPlatformAdmin(snapshot([], { platformRole: "platform_admin" })));
  assert.doesNotThrow(() => assertPlatformAdmin(snapshot([], { platformRole: "platform_owner" })));
});

test("inactive users are denied regardless of role", () => {
  assert.throws(() => assertAdmin(snapshot(["super_admin"], { active: false })), ForbiddenError);
  assert.throws(
    () => assertPlatformAdmin(snapshot([], { active: false, platformRole: "platform_owner" })),
    ForbiddenError,
  );
});

test("a user can never modify their own authorization state", () => {
  assert.throws(
    () =>
      assertCanManageUser({
        actor: snapshot(["super_admin"]),
        actorId: "user-1",
        targetId: "user-1",
        targetTenantId: "tenant-a",
        assignedRole: "admin",
      }),
    ForbiddenError,
  );
});

test("admin cannot promote a recruiter to admin or super admin", () => {
  for (const assignedRole of ["admin", "super_admin"] as const) {
    assert.throws(
      () =>
        assertCanManageUser({
          actor: snapshot(["admin"]),
          actorId: "admin-1",
          targetId: "recruiter-1",
          targetTenantId: "tenant-a",
          assignedRole,
        }),
      ForbiddenError,
    );
  }
});

test("cross-tenant user modification is denied for every company role", () => {
  for (const roles of [["admin"], ["super_admin"]] as const) {
    assert.throws(
      () =>
        assertCanManageUser({
          actor: snapshot([...roles]),
          actorId: "actor",
          targetId: "target",
          targetTenantId: "tenant-b",
          assignedRole: "recruiter",
        }),
      ForbiddenError,
    );
  }
});

test("super admin may manage another user only inside the same tenant", () => {
  assert.doesNotThrow(() =>
    assertCanManageUser({
      actor: snapshot(["super_admin"]),
      actorId: "super-admin",
      targetId: "other-user",
      targetTenantId: "tenant-a",
      assignedRole: "admin",
    }),
  );
});
