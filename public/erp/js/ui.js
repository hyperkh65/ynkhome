export const showApp = (userEmail) => {
  document.getElementById('authPanel').classList.add('hidden');
  document.getElementById('appPanel').classList.remove('hidden');
  document.getElementById('userEmailDisplay').textContent = userEmail;
};

export const switchTab = (tabId) => {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

  // Trigger specific refreshes if needed
  window.dispatchEvent(new CustomEvent('tab-switched', { detail: { tabId } }));
};

export const openModal = (id) => {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

export const closeModal = (id) => {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};
