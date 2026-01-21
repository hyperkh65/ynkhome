import { loadCfg, saveCfg } from "../lib/notion-api.js";

window.addEventListener("change-tab", (e) => {
  if (e.detail.tab === "settings") showSettings();
});

function showSettings() {
  const cfg = loadCfg();
  document.querySelector("#appMain").innerHTML = `
  <div class="bg-white p-6 rounded-2xl shadow">
    <h2 class="font-semibold text-xl mb-4">시스템 설정</h2>
    <div class="grid md:grid-cols-2 gap-4">
      <div>
        <label>Proxy Base URL</label>
        <input id="proxy" value="${cfg.proxy || ""}">
      </div>
      <div>
        <label>Users DB ID</label>
        <input id="dbUsers" value="${cfg.dbUsers || ""}">
      </div>
    </div>
    <button id="saveCfg" class="mt-4 bg-emerald-600 text-white px-4 py-2 rounded">저장</button>
  </div>`;
  document.querySelector("#saveCfg").onclick = () => {
    saveCfg({
      proxy: document.querySelector("#proxy").value,
      dbUsers: document.querySelector("#dbUsers").value,
    });
  };
}
