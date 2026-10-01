import assert from "node:assert/strict";
import test from "node:test";
import {
  createSecureRandomValue,
  decryptEmailToken,
  encryptEmailToken,
  sha256Base64Url,
} from "./token-crypto.server.ts";

test("email credentials round-trip through authenticated encryption", async () => {
  process.env.EMAIL_TOKEN_ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const encrypted = await encryptEmailToken("provider-secret");
  assert.notEqual(encrypted.includes("provider-secret"), true);
  assert.equal(await decryptEmailToken(encrypted), "provider-secret");
  assert.notEqual(createSecureRandomValue(), createSecureRandomValue());
  assert.equal((await sha256Base64Url("state")).length > 20, true);
});
