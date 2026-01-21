/************************************************************
 * YNK ERP2 · 거래처 등록 + 거래처 선택 모달
 ************************************************************/

import { DB_CLIENTS, notionQuery, notionCreate, uploadFile, rt, title, select, dateISO } from './core.js';
import { currentUser } from './auth.js';
import { openModal, closeModal } from './ui.js';

let clients = [];
export { clients };

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
