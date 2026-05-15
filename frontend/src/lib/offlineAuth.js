// Offline credential store — secure-enough device-bound auth.
//
// Strategy:
//   • On successful ONLINE login we derive PBKDF2-SHA256 (100k iters) of the
//     password with a per-credential random salt, and persist the *hash + salt
//     + user object + last server-issued JWT* in IndexedDB (db
//     `mosaytra-auth`, store `credentials`).
//   • On OFFLINE login we recompute the hash from the typed password and the
//     stored salt; if it matches, we restore the cached JWT + user so the SPA
//     keeps working.
//   • The password is NEVER persisted in plaintext.
//   • Hash is per-device (random salt). 100k iters resists brute-force on a
//     stolen DB blob.
import { createStore, get, set, del, keys } from "idb-keyval";

const STORE = createStore("mosaytra-auth", "credentials");
const ITER = 100_000;
const HASH = "SHA-256";

function bytesToHex(arr) {
  return Array.from(new Uint8Array(arr))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(n = 16) {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

async function deriveHashHex(password, saltHex) {
  const enc = new TextEncoder();
  // Re-encode salt back from hex → bytes.
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)),
  );
  const keyMat = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITER, hash: HASH },
    keyMat,
    256,
  );
  return bytesToHex(bits);
}

const normKey = (u) => `cred:${String(u || "").trim().toLowerCase()}`;

export async function storeCredential({ username, password, user, token }) {
  const salt = randomHex();
  const password_hash = await deriveHashHex(password, salt);
  await set(
    normKey(username),
    {
      username,
      salt,
      password_hash,
      user,
      token,
      last_online_auth: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    STORE,
  );
}

export async function getCredential(username) {
  return (await get(normKey(username), STORE)) || null;
}

export async function verifyCredential(username, password) {
  const rec = await get(normKey(username), STORE);
  if (!rec) return null;
  const hash = await deriveHashHex(password, rec.salt);
  // Constant-time-ish compare (length is fixed).
  if (hash.length !== rec.password_hash.length) return null;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ rec.password_hash.charCodeAt(i);
  }
  return diff === 0 ? rec : null;
}

export async function refreshCredentialUser(username, user) {
  const rec = await get(normKey(username), STORE);
  if (!rec) return;
  rec.user = user;
  rec.last_online_auth = new Date().toISOString();
  await set(normKey(username), rec, STORE);
}

export async function refreshCredentialToken(username, token) {
  const rec = await get(normKey(username), STORE);
  if (!rec) return;
  rec.token = token;
  await set(normKey(username), rec, STORE);
}

export async function deleteCredential(username) {
  await del(normKey(username), STORE);
}

export async function listCredentialUsernames() {
  const all = await keys(STORE);
  return all
    .filter((k) => typeof k === "string" && k.startsWith("cred:"))
    .map((k) => k.slice(5));
}
