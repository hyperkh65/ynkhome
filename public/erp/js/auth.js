/************************************************************
 * YNK ERP2 · 로그인 / 세션 유지 (2시간 유지)
 ************************************************************/

import { DB_USERS, notionQuery } from './core.js';

const SESSION_KEY = "ynk_session";
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2시간 유지

export let currentUser = null;

/* ---- 세션 읽기 ---- */
function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (Date.now() > data.expires) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch (e) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/* ---- 세션 저장 ---- */
function saveSession(email) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    email,
    expires: Date.now() + SESSION_DURATION
  }));
}

/* ---- 세션 삭제 ---- */
export function logout() {
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

/* ---- 자동 로그인 ---- */
export async function restoreSession() {
  const s = getSession();
  if (!s) return false;
  currentUser = { Email: s.email };
  return true;
}

/* ---- 로그인 함수 ---- */
export async function login(email, password) {
  console.log("[YNK] Login Process Started for:", email);

  // Try different property types for 'Email' just in case the Notion DB structure differs
  const filterCandidates = [
    { property: 'Email', email: { equals: email } },
    { property: 'Email', title: { equals: email } },
    { property: 'Email', rich_text: { equals: email } }
  ];

  for (const emailFilter of filterCandidates) {
    try {
      const filter = {
        and: [
          emailFilter,
          { property: 'PasswordHash', rich_text: { equals: password } }
        ]
      };

      console.log("[YNK] Attempting query with filter:", JSON.stringify(filter));

      const r = await notionQuery(DB_USERS, { filter, page_size: 1 });

      if (r && r.results && r.results.length > 0) {
        console.log("[YNK] Login Successful! Match found.");
        currentUser = { Email: email };
        saveSession(email);
        return true;
      }
    } catch (e) {
      console.warn("[YNK] Login attempt failed for a specific filter combination:", e);
      // Check if it's a structural error (like property type mismatch) or a network error
      if (e.message && e.message.includes("does not exist") || e.message.includes("expected")) {
        console.log("[YNK] Structural error detected, trying next filter...");
        continue;
      }
      throw e; // Rethrow network or API key errors to be caught by the caller
    }
  }

  console.warn("[YNK] No user records found matching the provided credentials.");
  return false;
}
