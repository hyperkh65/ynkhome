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
  const f = { and: [{ property: 'Email', email: { equals: mail } }, { property: 'PasswordHash', rich_text: { equals: pass } }] };
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
