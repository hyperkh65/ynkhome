/************************************************************
 * YNK ERP2 · UI 제어 (탭 전환, 패널 전환, 모달)
 ************************************************************/

import { logout } from './auth.js';

export function initUI(){
  const authPanel = document.getElementById('authPanel');
  const appPanel  = document.getElementById('appPanel');
  const userBadge = document.getElementById('userBadge');
  const userName  = document.getElementById('userName');
  const btnLogout = document.getElementById('btnLogout');

  /* 로그아웃 */
  btnLogout.onclick = ()=> logout();

  /* 탭 전환 */  
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('bg-emerald-600','text-white'));
      btn.classList.add('bg-emerald-600','text-white');
      document.querySelectorAll('.tab').forEach(t=>t.classList.add('hidden'));
      document.getElementById('tab-'+btn.dataset.tab).classList.remove('hidden');
    });
  });

  /* UI 표시 함수 */
  return {
    showApp(userEmail){
      authPanel.classList.add('hidden');
      appPanel.classList.remove('hidden');
      userBadge.classList.remove('hidden');
      userName.textContent = userEmail;
    },
    showLogin(){
      appPanel.classList.add('hidden');
      authPanel.classList.remove('hidden');
    }
  };
}

/* ---- 모달 공통 ---- */
export function openModal(id){
  document.getElementById(id).classList.remove('hidden');
}
export function closeModal(id){
  document.getElementById(id).classList.add('hidden');
}
