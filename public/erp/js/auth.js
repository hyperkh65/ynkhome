/************************************************************
 * YNK ERP2 · 로그인 / 세션 유지 (2시간 유지)
 ************************************************************/

import { DB_USERS, notionQuery } from './core.js';

const SESSION_KEY = "ynk_session";
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2시간 유지

export let currentUser = null;

/* ---- 세션 읽기 ---- */
function getSession(){
  const raw = localStorage.getItem(SESSION_KEY);
  if(!raw) return null;
  try{
    const data = JSON.parse(raw);
    if(Date.now() > data.expires){
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch(e){
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/* ---- 세션 저장 ---- */
function saveSession(email){
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    email,
    expires: Date.now() + SESSION_DURATION
  }));
}

/* ---- 세션 삭제 ---- */
export function logout(){
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

/* ---- 자동 로그인 ---- */
export async function restoreSession(){
  const s = getSession();
  if(!s) return false;
  currentUser = { Email: s.email };
  return true;
}

/* ---- 로그인 함수 ---- */
export async function login(email, password){
  const filter = {
    and:[
      {property:'Email', email:{equals:email}},
      {property:'PasswordHash', rich_text:{equals:password}}
    ]
  };

  const r = await notionQuery(DB_USERS,{filter,page_size:1});
  if(!r.results?.length) return false;

  currentUser = { Email: email };
  saveSession(email);
  return true;
}
