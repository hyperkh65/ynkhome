

// ===== core.js =====
/************************************************************
 * YNK ERP2 · Core Module (Notion API Proxy + Helpers)
 ************************************************************/

export const PROXY = '/api/notion';

export const DB_USERS = '26d1f4ff9a0e800cba14e56be989568b';
export const DB_SALES = '26e1f4ff9a0e801f807fde6aa13b12a0';
export const DB_PRODUCTS = '2a01f4ff9a0e8016aa33c239d64eb482';
export const DB_CLIENTS = '2a11f4ff9a0e80c5b431d7ca0194e149';

export const TEMPLATE_URL = './templates/statement.html';

/* --------- Field Helpers --------- */
export const rt = t => ({ rich_text: [{ type: 'text', text: { content: String(t || '') } }] });
export const title = t => ({ title: [{ type: 'text', text: { content: String(t || '') } }] });
export const dateISO = i => ({ date: i ? { start: i } : null });
export const select = n => ({ select: n ? { name: String(n) } : null });
export const num = n => ({ number: (n === '' || n == null) ? null : Number(n) });

/* --------- Request Wrapper --------- */
async function api(path, body) {
  const r = await fetch(PROXY + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* --------- Exported Notion Ops --------- */
export const notionQuery = (db, body) => api('/query', { db, ...body });
export const notionCreate = (db, p) => api('/create', { db, properties: p });
export const notionUpdate = (id, p) => api('/update', { pageId: id, properties: p });
export const notionDelete = id => api('/delete', { pageId: id });

/* --------- File Upload --------- */
export async function uploadFile(inputEl) {
  if (!inputEl?.files?.length) return [];
  const f = inputEl.files[0];
  const fd = new FormData();
  fd.append('file', f);
  const r = await fetch(PROXY + '/upload', { method: 'POST', body: fd });
  const j = await r.json();
  return [{ name: f.name, external: { url: j.url } }];
}

/* --------- Safe Text Escape --------- */
export const escapeHTML = (s = '') =>
  s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));


// ===== settings.js =====
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


// ===== auth.js =====
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
  const filter = {
    and: [
      { property: 'Email', email: { equals: email } },
      { property: 'PasswordHash', rich_text: { contains: password.trim() } }
    ]
  };

  const r = await notionQuery(DB_USERS, { filter, page_size: 1 });
  if (!r.results?.length) return false;

  currentUser = { Email: email };
  saveSession(email);
  return true;
}


// ===== ui.js =====
/************************************************************
 * YNK ERP2  UI  ( ȯ, г ȯ, )
 ************************************************************/

import { logout } from './auth.js';

export function initUI() {
  const authPanel = document.getElementById('authPanel');
  const appPanel = document.getElementById('appPanel');
  const userBadge = document.getElementById('userBadge');
  const userName = document.getElementById('userName');
  const btnLogout = document.getElementById('btnLogout');

  /* α׾ƿ */
  btnLogout.onclick = () => logout();

  /*  ȯ */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('bg-emerald-600', 'text-white'));
      btn.classList.add('bg-emerald-600', 'text-white');
      document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  /* UI ǥ Լ */
  return {
    showApp(userEmail) {
      authPanel.classList.add('hidden');
      appPanel.classList.remove('hidden');
      userBadge.classList.remove('hidden');
      userName.textContent = userEmail;
    },
    showLogin() {
      appPanel.classList.add('hidden');
      authPanel.classList.remove('hidden');
    }
  };
}

/* ----   ---- */
export function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
export function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}


// ===== clients.js =====
/************************************************************
 * YNK ERP2 · 거래처 등록 + 거래처 선택 모달
 ************************************************************/

import { DB_CLIENTS, notionQuery, notionCreate, uploadFile, rt, title, select, dateISO } from './core.js';
import { currentUser } from './auth.js';
import { openModal, closeModal } from './ui.js';

let clients = [];

/* ----- 거래처 전체 로드 (매출입력 자동완성 & 선택 모달 공용) ----- */
export async function loadClients() {
  const data = await notionQuery(DB_CLIENTS, {
    sorts: [{ property: 'ClientName', direction: 'ascending' }],
    page_size: 1000
  });

  clients = data.results.map(r => {
    const p = r.properties;
    return {
      id: r.id,
      name: p.ClientName?.title?.[0]?.plain_text || '',
      ceo: p.CEO?.rich_text?.[0]?.plain_text || '',
      tax: p.TaxType?.select?.name || '과세',
      currency: p.Currency?.select?.name || 'KRW',
      tel: p.Tel?.rich_text?.[0]?.plain_text || ''
    };
  });

  renderClientPickerTable();
}

/* ----- 거래처 등록 ----- */
export function initClientForm() {
  const btnSave = document.getElementById('btnSaveClient');
  const msg = document.getElementById('clientMsg');

  btnSave.onclick = async () => {
    try {
      const data = {
        name: cName.value.trim(),
        type: cType.value,
        ceo: cCEO.value.trim(),
        bizNo: cBizNo.value.trim(),
        industry: cIndustry.value.trim(),
        address: cAddress.value.trim(),
        tel: cTel.value.trim(),
        fax: cFax.value.trim(),
        email: cEmail.value.trim(),
        currency: cCurrency.value,
        bank: cBank.value.trim(),
        account: cAccountNo.value.trim(),
        holder: cAccountHolder.value.trim(),
        taxType: cTaxType.value,
        status: cStatus.value,
        regDate: cRegDate.value
      };

      if (!data.name) return alert("거래처명을 입력하세요.");

      const bizFiles = await uploadFile(cBizFile);
      const bankFiles = await uploadFile(cBankFile);

      await notionCreate(DB_CLIENTS, {
        ClientName: title(data.name),
        Type: select(data.type),
        CEO: rt(data.ceo),
        BusinessNo: rt(data.bizNo),
        Industry: rt(data.industry),
        Address: rt(data.address),
        Tel: rt(data.tel),
        Fax: rt(data.fax),
        Email: { email: data.email || null },
        Currency: select(data.currency),
        Bank: rt(data.bank),
        AccountNo: rt(data.account),
        AccountHolder: rt(data.holder),
        TaxType: select(data.taxType),
        Status: select(data.status),
        RegDate: dateISO(data.regDate),
        BizLicenseFile: { files: bizFiles },
        BankCopyFile: { files: bankFiles }
      });

      msg.classList.remove("hidden");
      setTimeout(() => msg.classList.add("hidden"), 1500);

      await loadClients(); // ✅ 저장 후 자동 리스트 갱신

    } catch (err) {
      alert("거래처 등록 오류: " + err.message);
    }
  };
}

/* ----- 거래처 선택 모달 열기 ----- */
export function openClientPicker() {
  document.getElementById("clientSearch").value = "";
  renderClientPickerTable();
  openModal("clientPickerModal");
}

/* ----- 모달에서 선택 반영 → 매출 입력창에 넣음 ----- */
function chooseClient(name) {
  document.getElementById("saleCustomer").value = name;
  closeModal("clientPickerModal");
}

/* ----- 모달 검색 + 출력 ----- */
export function renderClientPickerTable() {
  const tbody = document.getElementById("clientPickerBody");
  const keyword = document.getElementById("clientSearch")?.value?.trim().toLowerCase() || "";

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(keyword) ||
    c.ceo.toLowerCase().includes(keyword)
  );

  tbody.innerHTML = filtered.map(c => `
    <tr class="hover:bg-gray-100 cursor-pointer" data-name="${c.name}">
      <td class="py-2 px-3">${c.name}</td>
      <td class="py-2 px-3">${c.ceo}</td>
      <td class="py-2 px-3">${c.tax}</td>
      <td class="py-2 px-3">${c.currency}</td>
      <td class="py-2 px-3">${c.tel}</td>
    </tr>
  `).join("");

  tbody.querySelectorAll("tr").forEach(tr => {
    tr.onclick = () => chooseClient(tr.dataset.name);
  });
}

/* ----- 검색 입력 이벤트 연결 ----- */
export function initClientPickerSearch() {
  const input = document.getElementById("clientSearch");
  if (input) input.addEventListener("input", renderClientPickerTable);
}


// ===== products.js =====
/************************************************************
 * YNK ERP2 · 제품등록 + 제품 선택 모달
 ************************************************************/

import { DB_PRODUCTS, notionQuery, notionCreate, uploadFile, rt, select, num } from './core.js';
import { openModal, closeModal } from './ui.js';

let products = [];

/* ----- 제품 목록 로드 ----- */
export async function loadProducts() {
  const data = await notionQuery(DB_PRODUCTS, {
    sorts: [{ property: 'ProductCode', direction: 'ascending' }],
    page_size: 1000
  });

  products = data.results.map(r => {
    const p = r.properties;
    return {
      id: r.id,
      code: p.ProductCode?.rich_text?.[0]?.plain_text || '',
      name: p.ProductName?.rich_text?.[0]?.plain_text || '',
      maker: p.Manufacturer?.rich_text?.[0]?.plain_text || '',
      vendor: p.Vendor?.rich_text?.[0]?.plain_text || ''
    };
  });

  renderProductPickerTable();
}

/* ----- 제품 등록 ----- */
export function initProductForm() {
  const btnSave = document.getElementById('btnSaveProduct');
  const msg = document.getElementById('prodMsg');

  btnSave.onclick = async () => {
    try {
      // 제품코드 자동 생성
      const code = "P" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" +
        Math.floor(Math.random() * 999).toString().padStart(3, '0');

      const data = {
        code,
        name: prodName.value.trim(),
        category: prodCategory.value.trim(),
        maker: prodMaker.value.trim(),
        vendor: prodClient.value.trim(),
        cost: Number(prodCost.value || 0),
        inputA: prodInputA.value.trim(),
        outputV: prodOutputV.value.trim(),
        outputA: prodOutputA.value.trim(),
        material: prodMaterial.value.trim(),
        size: prodSize.value.trim(),
        converter: prodConverter.value.trim(),
        detail: prodDetail.value.trim()
      };

      if (!data.name) return alert("제품명을 입력하세요.");

      const fileSpecArr = await uploadFile(fileSpec);
      const fileKSKCArr = await uploadFile(fileKSKC);
      const fileEMIArr = await uploadFile(fileEMI);
      const fileEfficiencyArr = await uploadFile(fileEfficiency);
      const fileEtcArr = await uploadFile(fileEtc);

      await notionCreate(DB_PRODUCTS, {
        ProductCode: rt(data.code),
        ProductName: rt(data.name),
        Category: rt(data.category),
        Manufacturer: rt(data.maker),
        Vendor: rt(data.vendor),
        Cost: num(data.cost),
        InputCurrent: rt(data.inputA),
        OutputVoltage: rt(data.outputV),
        OutputCurrent: rt(data.outputA),
        Material: rt(data.material),
        Dimensions: rt(data.size),
        ConverterIncluded: rt(data.converter),
        Specifications: rt(data.detail),
        FileSpec: { files: fileSpecArr },
        FileKSKC: { files: fileKSKCArr },
        FileEMI: { files: fileEMIArr },
        FileEfficiency: { files: fileEfficiencyArr },
        FileEtc: { files: fileEtcArr }
      });

      msg.classList.remove("hidden");
      setTimeout(() => msg.classList.add("hidden"), 1500);

      await loadProducts(); // ✅ 등록 → 목록 즉시 갱신

    } catch (err) {
      alert("제품 등록 오류: " + err.message);
    }
  };
}

/* ----- 제품 선택 모달 열기 (매출 입력에서 호출) ----- */
export function openProductPicker(forRow) {
  window._productPickTargetRow = forRow; // 선택 시 주입될 row 기억
  document.getElementById("productSearch").value = "";
  renderProductPickerTable();
  openModal("productPickerModal");
}

/* ----- 모달에서 제품 클릭 시 → 행에 값 채움 ----- */
function chooseProduct(code) {
  const row = window._productPickTargetRow;
  const p = products.find(x => x.code === code);
  if (!row || !p) return;

  row.querySelector(".item-code").value = p.code;
  row.querySelector(".item-name").value = p.name;

  closeModal("productPickerModal");
}

/* ----- 제품 선택 모달 테이블 렌더링 ----- */
export function renderProductPickerTable() {
  const tbody = document.getElementById("productPickerBody");
  const keyword = document.getElementById("productSearch")?.value?.trim().toLowerCase() || "";

  const filtered = products.filter(p =>
    p.code.toLowerCase().includes(keyword) ||
    p.name.toLowerCase().includes(keyword)
  );

  tbody.innerHTML = filtered.map(p => `
    <tr class="hover:bg-gray-100 cursor-pointer" data-code="${p.code}">
      <td class="py-2 px-3">${p.code}</td>
      <td class="py-2 px-3">${p.name}</td>
      <td class="py-2 px-3">${p.maker}</td>
      <td class="py-2 px-3">${p.vendor}</td>
    </tr>
  `).join("");

  tbody.querySelectorAll("tr").forEach(tr => {
    tr.onclick = () => chooseProduct(tr.dataset.code);
  });
}

/* ----- 검색 이벤트 연결 ----- */
export function initProductPickerSearch() {
  const input = document.getElementById("productSearch");
  if (input) input.addEventListener("input", renderProductPickerTable);
}


// ===== sales.js =====
/************************************************************
 * YNK ERP2 · 매출 입력 / 조회 / 명세표 출력
 ************************************************************/
/*
import { 
  DB_SALES, rt, num, select, dateISO,
  notionQuery, notionCreate, notionDelete
} from "./core.js";

import { clients, openClientPicker } from "./clients.js";
import { products, openProductPicker } from "./products.js";
*/

/* =========================================================
   매출유형 → 환율 입력 규칙
========================================================= */
const saleType = document.getElementById("saleType");
const saleRate = document.getElementById("saleRate");
const rateHint = document.getElementById("rateHint");

export function applySaleTypeRule() {
  const type = saleType.value;
  if (type === "내자") {
    saleRate.value = 1;
    saleRate.setAttribute("disabled", "disabled");
    rateHint.textContent = "내자는 환율 1로 고정됩니다.";
  } else {
    saleRate.removeAttribute("disabled");
    rateHint.textContent = "외자는 환율을 입력하세요.";
  }
  calcTotal();
}
saleType.addEventListener("change", applySaleTypeRule);
saleRate.addEventListener("input", calcTotal);

/* =========================================================
   매출번호 생성
========================================================= */
async function generateSaleCode(date) {
  const prefix = "S" + date.replace(/-/g, '');
  const r = await notionQuery(DB_SALES, { filter: { property: "Date", date: { equals: date } } });
  const c = (r.results?.length || 0) + 1;
  return `${prefix}-${String(c).padStart(3, "0")}`;
}

/* =========================================================
   매출 항목 행 추가
========================================================= */
const itemsBody = document.querySelector("#itemsTable tbody");

export function addItemRow(code = "", name = "", spec = "", qty = 1, price = 0) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>
      <div class="flex gap-1">
        <input class="border rounded-xl px-2 py-1 w-28 item-code bg-gray-50" readonly value="${code}">
        <button type="button" class="btn bg-emerald-600 text-white px-2 py-1 text-xs btnProdSel">선택</button>
      </div>
    </td>
    <td><input class="border rounded-xl px-2 py-1 w-full item-name bg-gray-50" readonly value="${name}"></td>
    <td><input class="border rounded-xl px-2 py-1 w-full item-spec" value="${spec}"></td>
    <td><input type="number" class="border rounded-xl px-2 py-1 w-20 text-right item-qty" value="${qty}"></td>
    <td><input type="number" class="border rounded-xl px-2 py-1 w-24 text-right item-price" value="${price}"></td>
    <td class="item-total text-right pr-2 text-gray-700">0</td>
    <td><button type="button" class="text-red-500 text-sm btnDel">✕</button></td>
  `;

  tr.querySelector(".btnDel").onclick = () => { tr.remove(); calcTotal(); };
  tr.querySelectorAll("input").forEach(i => i.addEventListener("input", calcTotal));

  tr.querySelector(".btnProdSel").onclick = () => openProductPicker(tr);

  itemsBody.appendChild(tr);
  calcTotal();
}

/* 기본 1행 */
addItemRow();
document.getElementById("addItem").onclick = () => addItemRow();

/* =========================================================
   총액 계산 (환율 포함)
========================================================= */
export function calcTotal() {
  const rate = Number(saleRate.value || 1);
  let total = 0;
  itemsBody.querySelectorAll("tr").forEach(tr => {
    const q = Number(tr.querySelector(".item-qty").value || 0);
    const p = Number(tr.querySelector(".item-price").value || 0);
    const s = q * p * rate;
    total += s;
    tr.querySelector(".item-total").textContent = s.toLocaleString("ko-KR");
  });
  document.getElementById("saleTotal").textContent = "₩" + total.toLocaleString("ko-KR");
  return total;
}

/* =========================================================
   거래처 선택 모달
========================================================= */
document.getElementById("saleCustomer").onclick = () => openClientPicker((name) => {
  document.getElementById("saleCustomer").value = name;
});

/* =========================================================
   매출 저장
========================================================= */
document.getElementById("btnSaveSale").onclick = async () => {
  try {
    const date = saleDate.value || new Date().toISOString().slice(0, 10);
    const customer = saleCustomer.value.trim();
    const rate = Number(saleRate.value || 1);
    const type = saleType.value;

    if (!customer) return alert("거래처를 선택하세요.");
    if (!clients.find(c => c.name === customer)) return alert("등록된 거래처가 아닙니다.");

    const items = [...itemsBody.querySelectorAll("tr")].map(tr => {
      const code = tr.querySelector(".item-code").value.trim();
      const name = tr.querySelector(".item-name").value.trim();
      return {
        code,
        name,
        spec: tr.querySelector(".item-spec").value.trim(),
        qty: Number(tr.querySelector(".item-qty").value || 0),
        price: Number(tr.querySelector(".item-price").value || 0)
      };
    });

    for (const it of items) {
      if (!it.code) return alert("제품을 선택하세요.");
      const found = products.find(p => p.code === it.code);
      if (!found) return alert(`등록되지 않은 제품코드: ${it.code}`);
      it.name = found.name;
    }

    const saleCode = await generateSaleCode(date);
    document.getElementById("saleCodeEl").textContent = saleCode;

    for (const it of items) {
      await notionCreate(DB_SALES, {
        code: rt(saleCode),
        Date: dateISO(date),
        Customer: rt(customer),
        Items: rt(it.name),
        Specification: rt(it.spec),
        SaleType: select(type),
        ExchangeRate: num(rate),
        Quantity: num(it.qty),
        UnitPrice: num(it.price),
        Total: num(it.qty * it.price * rate),
        Salesperson: rt(window.currentUser?.Email || "")
      });
    }

    saleMsg.classList.remove("hidden");
    btnPrintStatement.classList.remove("hidden");
    setTimeout(() => saleMsg.classList.add("hidden"), 1500);

  } catch (e) {
    alert("등록 오류: " + e.message);
  }
};

/* =========================================================
   매출 조회 + 삭제
========================================================= */
const salesTbody = document.getElementById("salesTbody");
document.getElementById("formSalesSearch").onsubmit = async e => {
  e.preventDefault();
  await loadSales();
};

document.getElementById("btnReloadSales").onclick = async () => {
  sCustomer.value = sItem.value = sType.value = sFrom.value = sTo.value = "";
  await loadSales();
};

async function loadSales() {
  salesTbody.innerHTML = `<tr><td colspan="11" class="py-4 text-center text-gray-400">조회 중...</td></tr>`;
  const filters = [];

  if (sCustomer.value) filters.push({ property: "Customer", rich_text: { contains: sCustomer.value } });
  if (sItem.value) filters.push({ property: "Items", rich_text: { contains: sItem.value } });
  if (sType.value) filters.push({ property: "SaleType", select: { equals: sType.value } });
  if (sFrom.value || sTo.value) {
    const d = { property: "Date", date: {} };
    if (sFrom.value) d.date.on_or_after = sFrom.value;
    if (sTo.value) d.date.on_or_before = sTo.value;
    filters.push(d);
  }

  const data = await notionQuery(DB_SALES, {
    filter: filters.length ? { and: filters } : undefined,
    sorts: [{ property: "Date", direction: "descending" }],
    page_size: 300
  });

  const rows = data.results || [];
  if (!rows.length)
    return salesTbody.innerHTML = `<tr><td colspan="11" class="py-4 text-center text-gray-400">결과 없음</td></tr>`;

  salesTbody.innerHTML = "";
  rows.forEach(r => {
    const p = r.properties;
    const tr = document.createElement("tr");
    tr.className = "border-b hover:bg-gray-50";
    tr.innerHTML = `
      <td class="py-2 px-3">${p.code?.rich_text?.[0]?.plain_text || ""}</td>
      <td class="py-2 px-3">${p.Date?.date?.start || ""}</td>
      <td class="py-2 px-3">${p.Customer?.rich_text?.[0]?.plain_text || ""}</td>
      <td class="py-2 px-3">${p.Items?.rich_text?.[0]?.plain_text || ""}</td>
      <td class="py-2 px-3">${p.Specification?.rich_text?.[0]?.plain_text || ""}</td>
      <td class="py-2 px-3">${p.SaleType?.select?.name || ""}</td>
      <td class="py-2 px-3 text-right">${p.Quantity?.number ?? ""}</td>
      <td class="py-2 px-3 text-right">${p.UnitPrice?.number?.toLocaleString("ko-KR") ?? ""}</td>
      <td class="py-2 px-3 text-right">${p.Total?.number?.toLocaleString("ko-KR") ?? ""}</td>
      <td class="py-2 px-3">${p.Salesperson?.rich_text?.[0]?.plain_text || ""}</td>
      <td class="py-2 px-3"><button class="text-red-600 underline text-xs btnDel" data-id="${r.id}">삭제</button></td>
    `;
    salesTbody.appendChild(tr);
  });

  document.querySelectorAll(".btnDel").forEach(btn => btn.onclick = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await notionDelete(btn.dataset.id);
    loadSales();
  });
}

/* =========================================================
   명세표 출력
========================================================= */
document.getElementById("btnPrintStatement").onclick = async () => {
  const { printStatement } = await import("./statement.js");
  printStatement();
};


// ===== quotes.js =====
/* js/quotes.js — 견적 탭 전용 로직 (제품 상세 모달 포함)
   의존성: window.notionQuery/notationCreate/rt/dateISO/select/num (app.js에서 전역 노출)
*/

const PROXY_FALLBACK = '/api/notion';
const DB_QUOTES = '2a21f4ff9a0e80a5b6b5fd006e46a44a'; // 견적DB
const DB_PRODUCTS = '2a01f4ff9a0e8016aa33c239d64eb482'; // 상품DB

const api = window.api || (async function (path, body) {
  const r = await fetch((window.PROXY || PROXY_FALLBACK) + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text()); return r.json();
});
const notionQuery = window.notionQuery || ((db, body) => api('/query', { db, ...body }));
const notionCreate = window.notionCreate || ((db, p) => api('/create', { db, properties: p }));

const rt = window.rt || (t => ({ rich_text: [{ type: 'text', text: { content: String(t || '') } }] }));
const dateISO = window.dateISO || (i => ({ date: i ? { start: i } : null }));
const select = window.select || (n => ({ select: n ? { name: String(n) } : null }));
const num = window.num || (n => ({ number: (n === '' || n == null) ? null : Number(n) }));

/* 상태 */
let productMaster = [];            // [{code,name,supplier,maker,voltage,watts,eff,lumen,cct}]
let quoteTable; let quoteSummaryEl;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('tab-quotes')) return;

  quoteTable = document.getElementById('quoteItems');
  quoteSummaryEl = document.getElementById('quoteSummary');

  // 버튼
  document.getElementById('btnAddQuoteItem')?.addEventListener('click', addRow);
  document.getElementById('btnSaveQuote')?.addEventListener('click', saveQuote);
  document.getElementById('btnPrintQuote')?.addEventListener('click', printQuote);

  // 거래처 모달 버튼(견적 탭)
  document.getElementById('btnPickClientQuote')?.addEventListener('click', () => {
    window.currentPickingMode = 'quotes';
    if (typeof window.openClientsModal === 'function') window.openClientsModal();
  });

  // 제품 마스터 로드
  preloadProducts();

  // 기본 1행
  addRow();

  // 위임: 합계 계산/삭제/제품선택
  quoteTable?.addEventListener('input', (e) => {
    if (e.target.matches('.item-qty,.item-price,.item-unit')) calcTotal();
  });
  quoteTable?.addEventListener('click', (e) => {
    if (e.target.classList.contains('btnDel')) { e.target.closest('tr').remove(); calcTotal(); }
    if (e.target.classList.contains('btnPickProduct')) { openProductsModalQuote(e.target.closest('tr')); }
  });

  // 모달 이벤트
  document.getElementById('btnCloseProductsQuote')?.addEventListener('click', () => closeModal(document.getElementById('modalProductsQuote')));
  document.getElementById('modalProductQuoteSearch')?.addEventListener('input', (e) => renderProductQuoteList(e.target.value.trim()));
});

/* 제품 마스터 */
async function preloadProducts() {
  try {
    const d = await notionQuery(DB_PRODUCTS, { page_size: 1000, sorts: [{ property: 'ProductCode', direction: 'ascending' }] });
    productMaster = (d.results || []).map(r => {
      const p = r.properties || {};
      return {
        code: p.ProductCode?.rich_text?.[0]?.plain_text || '',
        name: p.ProductName?.rich_text?.[0]?.plain_text || '',
        supplier: p.Supplier?.rich_text?.[0]?.plain_text || '',
        maker: p.Maker?.rich_text?.[0]?.plain_text || '',
        voltage: p.OutputV?.rich_text?.[0]?.plain_text || '',
        watts: p.OutputA?.rich_text?.[0]?.plain_text || '',
        eff: p.Efficiency?.rich_text?.[0]?.plain_text || p.Eff?.rich_text?.[0]?.plain_text || '',
        lumen: p.Lumen?.rich_text?.[0]?.plain_text || '',
        cct: p.CCT?.rich_text?.[0]?.plain_text || ''
      };
    });
  } catch (e) {
    console.warn('제품 마스터 로드 실패:', e);
  }
}

/* 행 추가 (입력 가능) */
function addRow(prefill = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><button type="button" class="btnPickProduct text-emerald-600 underline text-sm">선택</button></td>
    <td><input class="item-name border rounded-xl px-2 py-1 w-full" value="${esc(prefill.name || '')}"></td>
    <td><input class="item-desc border rounded-xl px-2 py-1 w-full" value="${esc(prefill.desc || '')}"></td>
    <td><input class="item-vol  border rounded-xl px-2 py-1 w-20 text-center" value="${esc(prefill.voltage || '')}"></td>
    <td><input class="item-watt border rounded-xl px-2 py-1 w-20 text-center" value="${esc(prefill.watts || '')}"></td>
    <td><input class="item-eff  border rounded-xl px-2 py-1 w-20 text-center" value="${esc(prefill.eff || '')}"></td>
    <td><input class="item-lumen border rounded-xl px-2 py-1 w-20 text-center" value="${esc(prefill.lumen || '')}"></td>
    <td><input class="item-cct border rounded-xl px-2 py-1 w-20 text-center" value="${esc(prefill.cct || '')}"></td>
    <td>
      <select class="item-unit border rounded-xl px-2 py-1">
        <option value="RMB">RMB</option><option value="USD">USD</option><option value="KRW">KRW</option>
      </select>
    </td>
    <td><input type="number" class="item-price border rounded-xl px-2 py-1 w-24 text-right" value="${prefill.price || ''}"></td>
    <td><input type="number" class="item-qty border rounded-xl px-2 py-1 w-20 text-right" value="${prefill.qty || ''}"></td>
    <td class="item-amount text-right px-2">0</td>
    <td class="item-remark text-gray-600 text-sm px-2">${esc(prefill.code || '')}</td>
    <td><button type="button" class="btnDel text-red-500 text-sm">✕</button></td>
  `;
  quoteTable.appendChild(tr);
  calcTotal();
}

/* 합계 */
function calcTotal() {
  let qtySum = 0, amtSum = 0;
  quoteTable.querySelectorAll('tr').forEach(tr => {
    const qty = Number(tr.querySelector('.item-qty')?.value || 0);
    const price = Number(tr.querySelector('.item-price')?.value || 0);
    const amt = qty * price;
    tr.querySelector('.item-amount').textContent = amt.toLocaleString('ko-KR');
    qtySum += qty; amtSum += amt;
  });
  quoteSummaryEl.textContent = `총 수량: ${qtySum.toLocaleString('ko-KR')} / 총 금액: ${amtSum.toLocaleString('ko-KR')}`;
}

/* 견적번호 */
async function generateQuoteNo(date) {
  const prefix = 'Q' + date.replace(/-/g, '');
  const r = await notionQuery(DB_QUOTES, { filter: { property: 'Date', date: { equals: date } } });
  const c = (r.results?.length || 0) + 1;
  return `${prefix}-${String(c).padStart(3, '0')}`;
}

/* 저장 */
async function saveQuote() {
  try {
    const date = document.getElementById('quoteDate').value || new Date().toISOString().slice(0, 10);
    const client = document.getElementById('quoteClient').value.trim();
    if (!client) return alert('거래처를 선택하세요.');
    const rows = [...quoteTable.querySelectorAll('tr')];
    if (!rows.length) return alert('견적 항목을 추가하세요.');

    const no = await generateQuoteNo(date);
    document.getElementById('quoteNo').textContent = no;

    for (const tr of rows) {
      const unit = tr.querySelector('.item-unit').value;
      const price = Number(tr.querySelector('.item-price').value || 0);
      const qty = Number(tr.querySelector('.item-qty').value || 0);

      await notionCreate(DB_QUOTES, {
        EstimateNo: rt(no),
        Date: dateISO(date),
        Client: rt(client),
        Product: rt(tr.querySelector('.item-name').value),
        Description: rt(tr.querySelector('.item-desc').value),
        Voltage: rt(tr.querySelector('.item-vol').value),
        Watts: rt(tr.querySelector('.item-watt').value),
        LuminousEff: rt(tr.querySelector('.item-eff').value),
        LumenOutput: rt(tr.querySelector('.item-lumen').value),
        CCT: rt(tr.querySelector('.item-cct').value),
        Unit: select(unit),                 // RMB / USD / KRW
        UnitPrice: num(price),
        Qty: num(qty),
        Amount: num(qty * price),
        Remarks: rt(tr.querySelector('.item-remark').textContent), // 제품코드 자동
        Terms: rt(document.getElementById('quoteTerms').value),
        GeneralInfo: rt(document.getElementById('quoteGeneral').value),
        SpecialNotes: rt(document.getElementById('quoteSpecial').value)
      });
    }

    alert('견적이 등록되었습니다.');
    document.getElementById('btnPrintQuote').classList.remove('hidden');
  } catch (e) {
    alert('견적 저장 오류: ' + e.message);
  }
}

/* 출력 */
async function printQuote() {
  const tmplRes = await fetch('./templates/estimate.html', { cache: 'no-cache' });
  if (!tmplRes.ok) { alert('견적서 템플릿을 불러오지 못했습니다.'); return; }
  let tmpl = await tmplRes.text();

  const client = document.getElementById('quoteClient').value.trim();
  const date = document.getElementById('quoteDate').value || new Date().toISOString().slice(0, 10);
  const no = document.getElementById('quoteNo').textContent;

  let qtySum = 0, amtSum = 0;
  const rowsHTML = [...quoteTable.querySelectorAll('tr')].map(tr => {
    const name = tr.querySelector('.item-name').value || '';
    const desc = tr.querySelector('.item-desc').value || '';
    const vol = tr.querySelector('.item-vol').value || '';
    const watt = tr.querySelector('.item-watt').value || '';
    const eff = tr.querySelector('.item-eff').value || '';
    const lumen = tr.querySelector('.item-lumen').value || '';
    const cct = tr.querySelector('.item-cct').value || '';
    const unit = tr.querySelector('.item-unit').value || '';
    const price = Number(tr.querySelector('.item-price').value || 0);
    const qty = Number(tr.querySelector('.item-qty').value || 0);
    const amount = qty * price;
    const remark = tr.querySelector('.item-remark').textContent || '';
    qtySum += qty; amtSum += amount;

    return `<tr>
      <td>${esc(name)}</td>
      <td>${esc(desc)}</td>
      <td>${esc(vol)}</td>
      <td>${esc(watt)}</td>
      <td>${esc(eff)}</td>
      <td>${esc(lumen)}</td>
      <td>${esc(cct)}</td>
      <td>${esc(unit)}</td>
      <td class="text-right">${price.toLocaleString('ko-KR')}</td>
      <td class="text-right">${qty.toLocaleString('ko-KR')}</td>
      <td class="text-right">${amount.toLocaleString('ko-KR')}</td>
      <td>${esc(remark)}</td>
    </tr>`;
  }).join('');

  tmpl = tmpl
    .replaceAll('{{client}}', esc(client))
    .replaceAll('{{date}}', esc(date))
    .replaceAll('{{quoteNo}}', esc(no))
    .replace('{{rows}}', rowsHTML)
    .replace('{{totalQty}}', qtySum.toLocaleString('ko-KR'))
    .replace('{{totalAmount}}', amtSum.toLocaleString('ko-KR'))
    .replace('{{general}}', escMultiline(document.getElementById('quoteGeneral').value || ''))
    .replace('{{special}}', escMultiline(document.getElementById('quoteSpecial').value || ''));

  const w = window.open('', '_blank');
  w.document.open(); w.document.write(tmpl); w.document.close();
}

/* 견적 전용 제품 모달 */
let currentQuoteRow = null;
function openProductsModalQuote(targetRow) {
  currentQuoteRow = targetRow;
  renderProductQuoteList('');
  openModal(document.getElementById('modalProductsQuote'));
  setTimeout(() => document.getElementById('modalProductQuoteSearch')?.focus(), 0);
}
function renderProductQuoteList(keyword) {
  const kw = (keyword || '').toLowerCase();
  const tbody = document.getElementById('modalProductQuoteList');
  const rows = (productMaster || []).filter(p => {
    return !kw ||
      p.code.toLowerCase().includes(kw) ||
      p.name.toLowerCase().includes(kw) ||
      p.supplier.toLowerCase().includes(kw) ||
      p.maker.toLowerCase().includes(kw);
  }).map(p => {
    return `<tr class="border-b hover:bg-gray-50">
      <td class="px-2 py-1">${esc(p.code)}</td>
      <td class="px-2 py-1">${esc(p.name)}</td>
      <td class="px-2 py-1">${esc(p.supplier)}</td>
      <td class="px-2 py-1">${esc(p.maker)}</td>
      <td class="px-2 py-1">${esc(p.voltage)}</td>
      <td class="px-2 py-1">${esc(p.watts)}</td>
      <td class="px-2 py-1">
        <button type="button" class="btnPickThis underline text-emerald-600" data-code="${escAttr(p.code)}">선택</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" class="text-center text-gray-400 py-4">검색 결과 없음</td></tr>`;
  tbody.innerHTML = rows;

  tbody.querySelectorAll('.btnPickThis').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      const p = productMaster.find(x => x.code === code);
      if (!p || !currentQuoteRow) return;
      currentQuoteRow.querySelector('.item-name').value = p.name;
      currentQuoteRow.querySelector('.item-desc').value = '';
      currentQuoteRow.querySelector('.item-vol').value = p.voltage || '';
      currentQuoteRow.querySelector('.item-watt').value = p.watts || '';
      currentQuoteRow.querySelector('.item-eff').value = p.eff || '';
      currentQuoteRow.querySelector('.item-lumen').value = p.lumen || '';
      currentQuoteRow.querySelector('.item-cct').value = p.cct || '';
      currentQuoteRow.querySelector('.item-remark').textContent = p.code; // 비고에 제품코드 자동
      closeModal(document.getElementById('modalProductsQuote'));
      calcTotal();
    });
  });
}

/* 공통 모달 유틸 (app.js 노출 사용) */
function openModal(el) { return (window.openModal ? window.openModal(el) : el?.classList.remove('hidden')); }
function closeModal(el) { return (window.closeModal ? window.closeModal(el) : el?.classList.add('hidden')); }

/* 유틸 */
function esc(s = '') { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function escAttr(s = '') { return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function escMultiline(s = '') { return esc(s).replace(/\n/g, '<br>'); }


// ===== app.js =====
/* js/app.js — 로그인/매출/상품/거래처 공통 로직 + 전역 헬퍼 노출 */

/////////////////////////////
// Notion Proxy & DB IDs  //
/////////////////////////////
const PROXY = '/api/notion';
const DB_USERS = '26d1f4ff9a0e800cba14e56be989568b';
const DB_SALES = '26e1f4ff9a0e801f807fde6aa13b12a0';
const DB_PRODUCTS = '2a01f4ff9a0e8016aa33c239d64eb482';
const DB_CLIENTS = '2a11f4ff9a0e80c5b431d7ca0194e149';

/* 거래명세표 템플릿 경로 */
const TEMPLATE_URL = './templates/statement.html';

/////////////////////////////
// Notion prop helpers     //
/////////////////////////////
const rt = t => ({ rich_text: [{ type: 'text', text: { content: String(t || '') } }] });
const title = t => ({ title: [{ type: 'text', text: { content: String(t || '') } }] });
const dateISO = i => ({ date: i ? { start: i } : null });
const select = n => ({ select: n ? { name: String(n) } : null });
const num = n => ({ number: (n === '' || n == null) ? null : Number(n) });

/////////////////////////////
// Proxy wrappers          //
/////////////////////////////
async function api(path, body) {
  const r = await fetch(PROXY + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
const notionQuery = (db, body) => api('/query', { db, ...body });
const notionCreate = (db, p) => api('/create', { db, properties: p });
const notionDelete = id => api('/delete', { pageId: id });

/////////////////////////////
// 전역 노출 (quotes.js용) //
/////////////////////////////
Object.assign(window, {
  PROXY, api,
  notionQuery, notionCreate, notionDelete,
  rt, title, dateISO, select, num
});

/////////////////////////////
// 전역 상태               //
/////////////////////////////
let currentUser = null;
let currentPickingMode = null; // 'sale-entry' | 'sales-search' | 'quotes'
let lastSalesRows = [];        // 엑셀 다운로드용
let clients = [];              // [{name, bizNo, email, tel}]
let productCodes = [];         // [{code,name}]

/////////////////////////////
// 세션(2시간) 자동 복원    //
/////////////////////////////
(function restoreSession() {
  try {
    const saved = localStorage.getItem('erpUser');
    if (saved) {
      const s = JSON.parse(saved);
      if (Date.now() - s.time < 2 * 60 * 60 * 1000) {
        currentUser = { Email: s.email };
        document.getElementById('authPanel').classList.add('hidden');
        document.getElementById('appPanel').classList.remove('hidden');
        document.getElementById('userBadge').classList.remove('hidden');
        document.getElementById('userName').textContent = s.email;
        initAfterLogin();
        return;
      } else {
        localStorage.removeItem('erpUser');
      }
    }
  } catch (e) { console.warn('세션 복원 오류', e); }
})();

/////////////////////////////
// 로그인                   //
/////////////////////////////
document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginMsg = document.getElementById('loginMsg');

  const mail = loginEmail.value.trim(), pass = loginPassword.value.trim();
  const f = { and: [{ property: 'Email', email: { equals: mail } }, { property: 'PasswordHash', rich_text: { contains: pass.trim() } }] };
  try {
    const r = await notionQuery(DB_USERS, { filter: f, page_size: 1 });
    if (r.results?.length) {
      currentUser = { Email: mail };
      document.getElementById('authPanel').classList.add('hidden');
      document.getElementById('appPanel').classList.remove('hidden');
      document.getElementById('userBadge').classList.remove('hidden');
      document.getElementById('userName').textContent = mail;
      localStorage.setItem('erpUser', JSON.stringify({ email: mail, time: Date.now() }));
      await initAfterLogin();
    } else {
      loginMsg.classList.remove('hidden'); setTimeout(() => loginMsg.classList.add('hidden'), 1500);
    }
  } catch (err) {
    alert('로그인 오류: ' + err.message);
  }
});
document.getElementById('btnLogout')?.addEventListener('click', () => {
  try { localStorage.removeItem('erpUser'); } catch (e) { }
  location.reload();
});

/////////////////////////////
// 초기화 (로그인 후)       //
/////////////////////////////
async function initAfterLogin() {
  await loadClients();
  await loadProductCodes();
  applySaleTypeRule();
}

/* 탭 전환 */
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => {
  const tab = b.dataset.tab;
  document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('bg-emerald-600', 'text-white'));
  b.classList.add('bg-emerald-600', 'text-white');
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
}));

/////////////////////////////
// 거래처/제품 목록          //
/////////////////////////////
async function loadClients() {
  const d = await notionQuery(DB_CLIENTS, { sorts: [{ property: 'ClientName', direction: 'ascending' }], page_size: 1000 });
  clients = d.results.map(r => {
    const p = r.properties;
    return {
      name: p.ClientName?.title?.[0]?.plain_text || '',
      bizNo: p.BusinessNo?.rich_text?.[0]?.plain_text || '',
      email: p.Email?.email || '',
      tel: p.Tel?.rich_text?.[0]?.plain_text || '',
    };
  });
}
async function loadProductCodes() {
  const d = await notionQuery(DB_PRODUCTS, { sorts: [{ property: 'ProductCode', direction: 'ascending' }], page_size: 1000 });
  productCodes = d.results.map(r => {
    const p = r.properties;
    return { code: p.ProductCode?.rich_text?.[0]?.plain_text || '', name: p.ProductName?.rich_text?.[0]?.plain_text || '' };
  });
}
Object.assign(window, { loadClients, loadProductCodes }); // 필요시 외부에서 호출 가능

/////////////////////////////
// 매출유형 규칙            //
/////////////////////////////
function applySaleTypeRule() {
  const saleType = document.getElementById('saleType');
  const saleRate = document.getElementById('saleRate');
  const rateHint = document.getElementById('rateHint');
  if (!saleType || !saleRate || !rateHint) return;

  const type = saleType.value;
  if (type === '내자') {
    saleRate.value = 1;
    saleRate.setAttribute('disabled', 'disabled');
    rateHint.textContent = '내자는 환율 1로 고정됩니다.';
  } else {
    saleRate.removeAttribute('disabled');
    rateHint.textContent = '외자는 환율을 입력하세요.';
  }
  calcTotal();
}
document.getElementById('saleType')?.addEventListener('change', applySaleTypeRule);
document.getElementById('saleRate')?.addEventListener('input', calcTotal);

/////////////////////////////
// 번호 자동생성            //
/////////////////////////////
async function generateSaleCode(date) {
  const prefix = 'S' + date.replace(/-/g, '');
  const r = await notionQuery(DB_SALES, { filter: { property: 'Date', date: { equals: date } } });
  const c = (r.results?.length || 0) + 1;
  return `${prefix}-${String(c).padStart(3, '0')}`;
}
async function generateProductCode() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = "P" + today;
  const r = await notionQuery(DB_PRODUCTS, { filter: { property: "ProductCode", rich_text: { contains: prefix } } });
  return `${prefix}-${String((r.results?.length || 0) + 1).padStart(3, '0')}`;
}
Object.assign(window, { generateSaleCode, generateProductCode });

/////////////////////////////
// 매출 항목 테이블         //
/////////////////////////////
const itemsBody = document.querySelector("#itemsTable tbody");
let currentProductTarget = null;

function addItemRow(code = "", name = "", spec = "", qty = 1, price = 0) {
  if (!itemsBody) return;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>
      <div class="flex gap-1 items-center">
        <input class="border rounded-xl px-2 py-1 w-full item-code bg-gray-50" placeholder="제품 선택" value="${escapeHTML(code)}" readonly>
        <button type="button" class="select-product text-xs underline text-emerald-600">선택</button>
      </div>
    </td>
    <td><input class="border rounded-xl px-2 py-1 w-full item-name bg-gray-50" value="${escapeHTML(name)}" placeholder="자동 상품명" readonly></td>
    <td><input class="border rounded-xl px-2 py-1 w-full item-spec" value="${escapeHTML(spec)}"></td>
    <td><input type="number" class="border rounded-xl px-2 py-1 w-20 text-right item-qty" value="${Number(qty) || 0}"></td>
    <td><input type="number" class="border rounded-xl px-2 py-1 w-24 text-right item-price" value="${Number(price) || 0}"></td>
    <td class="item-total text-right pr-2 text-gray-700">0</td>
    <td><button type="button" class="text-red-500 text-sm btn-remove-row">✕</button></td>
  `;
  itemsBody.appendChild(tr);
  calcTotal();
}
if (itemsBody) {
  addItemRow();
  document.getElementById('addItem')?.addEventListener('click', () => addItemRow());
  itemsBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-row')) {
      e.target.closest('tr').remove(); calcTotal(); return;
    }
    if (e.target.classList.contains('select-product')) {
      currentProductTarget = e.target.closest('tr');
      openProductsModal(); // sales용 제품 모달
    }
  });
  itemsBody.addEventListener('input', e => {
    if (e.target.matches('.item-qty,.item-price')) calcTotal();
  });
}

/////////////////////////////
// 총합 (매출 탭)          //
/////////////////////////////
function calcTotal() {
  const saleRate = document.getElementById('saleRate');
  if (!itemsBody || !saleRate) return 0;
  const rate = Number(saleRate.value || 1);
  let total = 0;
  itemsBody.querySelectorAll("tr").forEach(tr => {
    const q = Number(tr.querySelector(".item-qty")?.value || 0);
    const p = Number(tr.querySelector(".item-price")?.value || 0);
    const s = q * p * rate;
    total += s;
    const td = tr.querySelector(".item-total");
    if (td) td.textContent = s.toLocaleString('ko-KR');
  });
  const saleTotal = document.getElementById('saleTotal');
  if (saleTotal) saleTotal.textContent = "₩" + total.toLocaleString('ko-KR');
  return total;
}
Object.assign(window, { calcTotal }); // 외부 출력때 재사용 가능

/////////////////////////////
// 매출 등록               //
/////////////////////////////
document.getElementById('btnSaveSale')?.addEventListener("click", async () => {
  try {
    const saleDateEl = document.getElementById('saleDate');
    const saleCustomerEl = document.getElementById('saleCustomer');
    const saleRateEl = document.getElementById('saleRate');
    const saleTypeEl = document.getElementById('saleType');

    const date = saleDateEl.value || new Date().toISOString().slice(0, 10);
    const customer = saleCustomerEl.value.trim();
    const rate = Number(saleRateEl.value || 1);
    const type = saleTypeEl.value;

    if (!customer) { alert('거래처명을 선택하세요.'); return; }
    if (!clients.find(c => c.name === customer)) {
      alert(`등록되지 않은 거래처명: ${customer}\n거래처 탭에서 먼저 등록해주세요.`); return;
    }

    const rows = [...itemsBody.querySelectorAll("tr")];
    if (!rows.length) { alert('상품 항목을 추가하세요.'); return; }

    const items = rows.map(tr => ({
      code: tr.querySelector(".item-code").value.trim(),
      name: tr.querySelector(".item-name").value.trim(),
      spec: tr.querySelector(".item-spec").value.trim(),
      qty: Number(tr.querySelector(".item-qty").value || 0),
      price: Number(tr.querySelector(".item-price").value || 0)
    }));

    for (const it of items) {
      if (!it.code) { alert('제품코드를 선택하세요.'); return; }
      const found = productCodes.find(p => p.code === it.code);
      if (!found) { alert(`등록되지 않은 제품 코드: ${it.code}`); return; }
      it.name = found.name;
    }

    const saleCode = await generateSaleCode(date);
    document.getElementById('saleCodeEl').textContent = saleCode;

    for (const it of items) {
      await notionCreate(DB_SALES, {
        code: rt(saleCode),
        Date: dateISO(date),
        Customer: rt(customer),
        Items: rt(it.name),                 // 상품명 저장
        Specification: rt(it.spec),
        SaleType: select(type),
        ExchangeRate: num(rate),
        Quantity: num(it.qty),
        UnitPrice: num(it.price),
        Total: num(it.qty * it.price * rate),
        Salesperson: rt(currentUser?.Email || '')
      });
    }
    document.getElementById('saleMsg').classList.remove('hidden');
    document.getElementById('btnPrintStatement').classList.remove('hidden');
    setTimeout(() => document.getElementById('saleMsg').classList.add('hidden'), 1500);
  } catch (e) { alert("등록 오류: " + e.message); }
});

/////////////////////////////
// 매출 조회               //
/////////////////////////////
document.getElementById('formSalesSearch')?.addEventListener("submit", async e => { e.preventDefault(); await loadSales(); });
document.getElementById('btnReloadSales')?.addEventListener("click", async () => {
  document.getElementById('sCustomer').value = "";
  document.getElementById('sItem').value = "";
  document.getElementById('sType').value = "";
  document.getElementById('sFrom').value = "";
  document.getElementById('sTo').value = "";
  await loadSales();
});
document.getElementById('btnClearClientSearch')?.addEventListener('click', () => { document.getElementById('sCustomer').value = ""; });

async function loadSales() {
  try {
    const salesTbody = document.getElementById('salesTbody');
    const salesSummary = document.getElementById('salesSummary');
    salesTbody.innerHTML = `<tr><td colspan="11" class="text-center text-gray-400 py-4">조회 중...</td></tr>`;
    lastSalesRows = [];

    const sCustomer = document.getElementById('sCustomer');
    const sItem = document.getElementById('sItem');
    const sType = document.getElementById('sType');
    const sFrom = document.getElementById('sFrom');
    const sTo = document.getElementById('sTo');

    const f = [];
    if (sCustomer.value) f.push({ property: "Customer", rich_text: { contains: sCustomer.value } });
    if (sItem.value) f.push({ property: "Items", rich_text: { contains: sItem.value } });
    if (sType.value) f.push({ property: "SaleType", select: { equals: sType.value } });
    if (sFrom.value || sTo.value) {
      const d = { property: "Date", date: {} };
      if (sFrom.value) d.date.on_or_after = sFrom.value;
      if (sTo.value) d.date.on_or_before = sTo.value;
      f.push(d);
    }
    const filter = f.length ? { and: f } : undefined;

    const data = await notionQuery(DB_SALES, { filter, sorts: [{ property: "Date", direction: "descending" }], page_size: 200 });
    const rows = data.results || [];
    if (!rows.length) {
      salesTbody.innerHTML = `<tr><td colspan="11" class="text-center text-gray-400 py-4">검색 결과가 없습니다.</td></tr>`;
      salesSummary.textContent = "";
      return;
    }

    salesTbody.innerHTML = "";
    let totalQty = 0;
    let totalAmount = 0;

    rows.forEach(r => {
      const p = r.properties;
      const rec = {
        code: p.code?.rich_text?.[0]?.plain_text || "",
        date: p.Date?.date?.start || "",
        customer: p.Customer?.rich_text?.[0]?.plain_text || "",
        item: p.Items?.rich_text?.[0]?.plain_text || "",
        spec: p.Specification?.rich_text?.[0]?.plain_text || "",
        type: p.SaleType?.select?.name || "",
        qty: p.Quantity?.number ?? null,
        unit: p.UnitPrice?.number ?? null,
        total: p.Total?.number ?? null,
        salesperson: p.Salesperson?.rich_text?.[0]?.plain_text || "",
        id: r.id
      };
      lastSalesRows.push(rec);

      totalQty += rec.qty || 0;
      totalAmount += rec.total || 0;

      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-gray-50";
      tr.innerHTML = `
        <td class="py-2 px-3">${rec.code}</td>
        <td class="py-2 px-3">${rec.date}</td>
        <td class="py-2 px-3">${rec.customer}</td>
        <td class="py-2 px-3">${rec.item}</td>
        <td class="py-2 px-3">${rec.spec}</td>
        <td class="py-2 px-3">${rec.type}</td>
        <td class="py-2 px-3 text-right">${(rec.qty ?? "").toLocaleString?.('ko-KR') ?? rec.qty ?? ""}</td>
        <td class="py-2 px-3 text-right">${(rec.unit ?? "").toLocaleString?.('ko-KR') ?? rec.unit ?? ""}</td>
        <td class="py-2 px-3 text-right">${(rec.total ?? "").toLocaleString?.('ko-KR') ?? rec.total ?? ""}</td>
        <td class="py-2 px-3">${rec.salesperson}</td>
        <td class="py-2 px-3"><button class="text-xs text-red-600 underline btn-del" data-id="${rec.id}">삭제</button></td>`;
      salesTbody.appendChild(tr);
    });

    // 합계 표시
    salesSummary.innerHTML = `
      총 수량: <span class="font-semibold">${totalQty.toLocaleString('ko-KR')}</span>
      / 총 금액: <span class="font-semibold text-emerald-700">${totalAmount.toLocaleString('ko-KR')} 원</span>
    `;

    // 삭제 이벤트
    document.querySelectorAll(".btn-del").forEach(btn => btn.addEventListener("click", async () => {
      const id = btn.dataset.id; if (!confirm("정말 삭제하시겠습니까?")) return;
      await notionDelete(id);
      alert("삭제되었습니다.");
      await loadSales();
    }));

  } catch (e) {
    alert("매출 조회 오류: " + e.message);
  }
}

/////////////////////////////
// 엑셀 다운로드            //
/////////////////////////////
document.getElementById('btnExportExcel')?.addEventListener('click', () => {
  try {
    const header = ["매출번호", "날짜", "거래처", "상품", "규격", "유형", "수량", "단가", "합계", "담당자"];
    const body = lastSalesRows.map(r => [
      r.code, r.date, r.customer, r.item, r.spec, r.type,
      r.qty ?? "", r.unit ?? "", r.total ?? "", r.salesperson
    ]);
    const aoa = [header, ...body];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 1; R <= range.e.r; R++) {
      [6, 7, 8].forEach(C => {
        const cell_addr = XLSX.utils.encode_cell({ r: R, c: C });
        const v = ws[cell_addr]?.v;
        if (v !== undefined && v !== "") {
          ws[cell_addr].t = 'n';
          ws[cell_addr].z = '#,##0';
        }
      });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "매출내역");
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `매출내역_${today}.xlsx`);
  } catch (err) {
    alert('엑셀 생성 오류: ' + err.message);
  }
});

/////////////////////////////
// 상품 등록               //
/////////////////////////////
document.getElementById('btnSaveProduct')?.addEventListener("click", async () => {
  try {
    const prodCategory = document.getElementById('prodCategory');
    const prodName = document.getElementById('prodName');
    const prodMaker = document.getElementById('prodMaker');
    const prodClient = document.getElementById('prodClient');
    const prodCost = document.getElementById('prodCost');
    const prodInputA = document.getElementById('prodInputA');
    const prodOutputV = document.getElementById('prodOutputV');
    const prodOutputA = document.getElementById('prodOutputA');
    const prodMaterial = document.getElementById('prodMaterial');
    const prodSize = document.getElementById('prodSize');
    const prodConverter = document.getElementById('prodConverter');
    const prodDetail = document.getElementById('prodDetail');

    const fileSpec = document.getElementById('fileSpec');
    const fileKSKC = document.getElementById('fileKSKC');
    const fileEMI = document.getElementById('fileEMI');
    const fileEfficiency = document.getElementById('fileEfficiency');
    const fileEtc = document.getElementById('fileEtc');

    const newCode = await generateProductCode();

    const data = {
      code: newCode,
      category: prodCategory.value.trim(),
      name: prodName.value.trim(),
      maker: prodMaker.value.trim(),
      client: prodClient.value.trim(),
      cost: Number(prodCost.value || 0),
      inputA: prodInputA.value.trim(),
      outputV: prodOutputV.value.trim(),
      outputA: prodOutputA.value.trim(),
      material: prodMaterial.value.trim(),
      size: prodSize.value.trim(),
      converter: prodConverter.value.trim(),
      detail: prodDetail.value.trim()
    };

    if (!data.name) {
      alert("제품명을 입력하세요.");
      return;
    }

    async function uploadFile(input) {
      if (!input?.files?.length) return [];
      const f = input.files[0];
      const form = new FormData();
      form.append("file", f);
      const r = await fetch(PROXY + "/upload", { method: "POST", body: form });
      const j = await r.json();
      return [{ name: f.name, external: { url: j.url } }];
    }

    await notionCreate(DB_PRODUCTS, {
      ProductCode: rt(data.code),
      ProductCategory: rt(data.category),
      ProductName: rt(data.name),
      Maker: rt(data.maker),
      Supplier: rt(data.client),
      Cost: num(data.cost),
      InputA: rt(data.inputA),
      OutputV: rt(data.outputV),
      OutputA: rt(data.outputA),
      Material: rt(data.material),
      Size: rt(data.size),
      Converter: rt(data.converter),
      Detail: rt(data.detail),
      FileSpec: { files: await uploadFile(fileSpec) },
      FileKSKC: { files: await uploadFile(fileKSKC) },
      FileEMI: { files: await uploadFile(fileEMI) },
      FileEfficiency: { files: await uploadFile(fileEfficiency) },
      FileEtc: { files: await uploadFile(fileEtc) }
    });

    document.getElementById('prodMsg').classList.remove('hidden');
    setTimeout(() => document.getElementById('prodMsg').classList.add('hidden'), 1500);

    await loadProductCodes(); // 매출입력/견적 즉시 갱신
  } catch (err) {
    alert("상품 등록 오류: " + err.message);
  }
});

/////////////////////////////
// 거래처 등록             //
/////////////////////////////
document.getElementById('btnSaveClient')?.addEventListener('click', async () => {
  try {
    const data = {
      name: document.getElementById('cName').value.trim(),
      type: document.getElementById('cType').value,
      ceo: document.getElementById('cCEO').value.trim(),
      bizNo: document.getElementById('cBizNo').value.trim(),
      industry: document.getElementById('cIndustry').value.trim(),
      address: document.getElementById('cAddress').value.trim(),
      tel: document.getElementById('cTel').value.trim(),
      fax: document.getElementById('cFax').value.trim(),
      email: document.getElementById('cEmail').value.trim(),
      currency: document.getElementById('cCurrency').value,
      bank: document.getElementById('cBank').value.trim(),
      account: document.getElementById('cAccountNo').value.trim(),
      holder: document.getElementById('cAccountHolder').value.trim(),
      taxType: document.getElementById('cTaxType').value,
      status: document.getElementById('cStatus').value,
      regDate: document.getElementById('cRegDate').value
    };
    if (!data.name) { alert('거래처명을 입력하세요.'); return; }

    async function uploadFile(inputEl) {
      if (!inputEl?.files?.length) return [];
      const f = inputEl.files[0];
      const form = new FormData(); form.append("file", f);
      const r = await fetch(PROXY + "/upload", { method: "POST", body: form });
      const j = await r.json();
      return [{ name: f.name, external: { url: j.url } }];
    }
    const bizFiles = await uploadFile(document.getElementById('cBizFile'));
    const bankFiles = await uploadFile(document.getElementById('cBankFile'));

    await notionCreate(DB_CLIENTS, {
      ClientName: title(data.name),
      Type: select(data.type),
      CEO: rt(data.ceo),
      BusinessNo: rt(data.bizNo),
      Industry: rt(data.industry),
      Address: rt(data.address),
      Tel: rt(data.tel),
      Fax: rt(data.fax),
      Email: { email: data.email || null },
      Currency: select(data.currency),
      Bank: rt(data.bank),
      AccountNo: rt(data.account),
      AccountHolder: rt(data.holder),
      TaxType: select(data.taxType),
      Status: select(data.status),
      RegDate: dateISO(data.regDate),
      BizLicenseFile: { files: bizFiles },
      BankCopyFile: { files: bankFiles }
    });

    document.getElementById('clientMsg').classList.remove('hidden');
    setTimeout(() => document.getElementById('clientMsg').classList.add('hidden'), 1500);

    await loadClients(); // 매출/견적 모달 즉시 반영
  } catch (err) {
    alert('거래처 등록 오류: ' + err.message);
  }
});

/////////////////////////////
// 거래명세표 출력         //
/////////////////////////////
document.getElementById('btnPrintStatement')?.addEventListener('click', async () => {
  try {
    const date = document.getElementById('saleDate').value || new Date().toISOString().slice(0, 10);
    const customer = document.getElementById('saleCustomer').value.trim();
    const rate = Number(document.getElementById('saleRate').value || 1);

    const lines = [...itemsBody.querySelectorAll("tr")].map(tr => {
      const name = tr.querySelector('.item-name').value.trim();
      const spec = tr.querySelector('.item-spec').value.trim();
      const qty = Number(tr.querySelector('.item-qty').value || 0);
      const unit = Number(tr.querySelector('.item-price').value || 0);
      const supply = qty * unit * rate;
      const tax = Math.round(supply * 0.1);
      return { date, name, spec, qty, unit, supply, tax };
    });

    const supplySum = lines.reduce((a, b) => a + b.supply, 0);
    const taxSum = lines.reduce((a, b) => a + b.tax, 0);
    const totalSum = supplySum + taxSum;

    const tmplRes = await fetch(TEMPLATE_URL, { cache: 'no-cache' });
    if (!tmplRes.ok) throw new Error('거래명세표 템플릿을 불러오지 못했습니다.');
    let tmpl = await tmplRes.text();

    const rowsHTML = lines.map(li => `
      <tr>
        <td>${li.date}</td>
        <td>${escapeHTML(li.name)}</td>
        <td>${escapeHTML(li.spec)}</td>
        <td>${li.qty.toLocaleString('ko-KR')}</td>
        <td>${li.unit.toLocaleString('ko-KR')}</td>
        <td>${li.supply.toLocaleString('ko-KR')}</td>
        <td>${li.tax.toLocaleString('ko-KR')}</td>
      </tr>
    `).join("");

    tmpl = tmpl
      .replaceAll('{{date}}', date)
      .replaceAll('{{quoteNo}}', document.getElementById('saleCodeEl').textContent || '')
      .replaceAll('{{customer}}', escapeHTML(customer))
      .replace('{{items}}', rowsHTML)
      .replace('{{supply}}', supplySum.toLocaleString('ko-KR'))
      .replace('{{tax}}', taxSum.toLocaleString('ko-KR'))
      .replace('{{total}}', totalSum.toLocaleString('ko-KR'));

    const w = window.open('', '_blank');
    w.document.open(); w.document.write(tmpl); w.document.close();
  } catch (err) {
    alert('거래명세표 생성 오류: ' + err.message);
  }
});

/////////////////////////////
// 모달: 거래처 선택        //
/////////////////////////////
const modalClients = document.getElementById('modalClients');
const modalClientSearch = document.getElementById('modalClientSearch');
const modalClientList = document.getElementById('modalClientList');

document.getElementById('btnPickClient')?.addEventListener('click', () => {
  currentPickingMode = 'sale-entry';
  openClientsModal();
});
document.getElementById('btnPickClientSearch')?.addEventListener('click', () => {
  currentPickingMode = 'sales-search';
  openClientsModal();
});
document.getElementById('btnCloseClients')?.addEventListener('click', () => closeModal(modalClients));

function openClientsModal() {
  renderClientList('');
  openModal(modalClients);
  setTimeout(() => modalClientSearch?.focus(), 0);
}
function renderClientList(keyword) {
  const kw = (keyword || '').toLowerCase();
  const rows = clients
    .filter(c => !kw || c.name.toLowerCase().includes(kw))
    .map(c => {
      return `<button type="button" class="w-full text-left px-3 py-2 hover:bg-gray-100" data-name="${escapeAttr(c.name)}">${escapeHTML(c.name)}</button>`;
    }).join('') || `<div class="px-3 py-6 text-center text-gray-400">검색 결과 없음</div>`;
  modalClientList.innerHTML = rows;
}
modalClientSearch?.addEventListener('input', e => {
  renderClientList(e.target.value.trim());
});
modalClientList?.addEventListener('click', e => {
  const btn = e.target.closest('button[data-name]');
  if (!btn) return;
  const name = btn.getAttribute('data-name');

  if (currentPickingMode === 'sale-entry') {
    document.getElementById('saleCustomer').value = name;
  } else if (currentPickingMode === 'sales-search') {
    document.getElementById('sCustomer').value = name;
  } else if (currentPickingMode === 'quotes') {           // ✅ 견적 탭 분기
    const q = document.getElementById('quoteClient');
    if (q) q.value = name;
  }
  closeModal(modalClients);
});
Object.assign(window, { openClientsModal }); // quotes에서 사용

/////////////////////////////
// 모달: 제품 선택 (매출)   //
/////////////////////////////
const modalProducts = document.getElementById('modalProducts');
const modalProductSearch = document.getElementById('modalProductSearch');
const modalProductList = document.getElementById('modalProductList');
document.getElementById('btnCloseProducts')?.addEventListener('click', () => closeModal(modalProducts));

function openProductsModal() {
  renderProductList('');
  openModal(modalProducts);
  setTimeout(() => modalProductSearch?.focus(), 0);
}
function renderProductList(keyword) {
  const kw = (keyword || '').toLowerCase();
  const rows = productCodes
    .filter(p => !kw || p.code.toLowerCase().includes(kw) || p.name.toLowerCase().includes(kw))
    .map(p => {
      const label = `${p.code} - ${p.name}`;
      return `<button type="button" class="w-full text-left px-3 py-2 hover:bg-gray-100" data-code="${escapeAttr(p.code)}" data-name="${escapeAttr(p.name)}">${escapeHTML(label)}</button>`;
    }).join('') || `<div class="px-3 py-6 text-center text-gray-400">검색 결과 없음</div>`;
  modalProductList.innerHTML = rows;
}
modalProductSearch?.addEventListener('input', e => {
  renderProductList(e.target.value.trim());
});
modalProductList?.addEventListener('click', e => {
  const btn = e.target.closest('button[data-code]');
  if (!btn || !currentProductTarget) return;
  const code = btn.getAttribute('data-code');
  const name = btn.getAttribute('data-name');
  currentProductTarget.querySelector('.item-code').value = code;
  currentProductTarget.querySelector('.item-name').value = name;
  closeModal(modalProducts);
  calcTotal();
});

/////////////////////////////
// 공통 모달 유틸 & 기타     //
/////////////////////////////
function openModal(el) {
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('flex');
}
function closeModal(el) {
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('flex');
}
function escapeHTML(s = '') {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function escapeAttr(s = '') {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
Object.assign(window, { openModal, closeModal, escapeHTML, escapeAttr });