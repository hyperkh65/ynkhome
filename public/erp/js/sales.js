/************************************************************
 * YNK ERP2 · 매출 입력 / 조회 / 명세표 출력
 ************************************************************/
import { 
  DB_SALES, rt, num, select, dateISO,
  notionQuery, notionCreate, notionDelete
} from "./core.js";

import { clients, openClientPicker } from "./clients.js";
import { products, openProductPicker } from "./products.js";

/* =========================================================
   매출유형 → 환율 입력 규칙
========================================================= */
const saleType = document.getElementById("saleType");
const saleRate = document.getElementById("saleRate");
const rateHint = document.getElementById("rateHint");

export function applySaleTypeRule(){
  const type = saleType.value;
  if(type === "내자"){
    saleRate.value = 1;
    saleRate.setAttribute("disabled","disabled");
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
async function generateSaleCode(date){
  const prefix = "S" + date.replace(/-/g,'');
  const r = await notionQuery(DB_SALES,{ filter:{property:"Date",date:{equals:date}} });
  const c = (r.results?.length || 0) + 1;
  return `${prefix}-${String(c).padStart(3,"0")}`;
}

/* =========================================================
   매출 항목 행 추가
========================================================= */
const itemsBody = document.querySelector("#itemsTable tbody");

export function addItemRow(code="", name="", spec="", qty=1, price=0){
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

  tr.querySelector(".btnDel").onclick = ()=>{ tr.remove(); calcTotal(); };
  tr.querySelectorAll("input").forEach(i=> i.addEventListener("input", calcTotal));

  tr.querySelector(".btnProdSel").onclick = ()=> openProductPicker(tr);

  itemsBody.appendChild(tr);
  calcTotal();
}

/* 기본 1행 */
addItemRow();
document.getElementById("addItem").onclick = ()=> addItemRow();

/* =========================================================
   총액 계산 (환율 포함)
========================================================= */
export function calcTotal(){
  const rate = Number(saleRate.value || 1);
  let total = 0;
  itemsBody.querySelectorAll("tr").forEach(tr=>{
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
document.getElementById("saleCustomer").onclick = ()=> openClientPicker((name)=>{
  document.getElementById("saleCustomer").value = name;
});

/* =========================================================
   매출 저장
========================================================= */
document.getElementById("btnSaveSale").onclick = async()=>{
  try{
    const date = saleDate.value || new Date().toISOString().slice(0,10);
    const customer = saleCustomer.value.trim();
    const rate = Number(saleRate.value || 1);
    const type = saleType.value;

    if(!customer) return alert("거래처를 선택하세요.");
    if(!clients.find(c=>c.name===customer)) return alert("등록된 거래처가 아닙니다.");

    const items = [...itemsBody.querySelectorAll("tr")].map(tr=>{
      const code = tr.querySelector(".item-code").value.trim();
      const name = tr.querySelector(".item-name").value.trim();
      return{
        code,
        name,
        spec: tr.querySelector(".item-spec").value.trim(),
        qty: Number(tr.querySelector(".item-qty").value||0),
        price: Number(tr.querySelector(".item-price").value||0)
      };
    });

    for(const it of items){
      if(!it.code) return alert("제품을 선택하세요.");
      const found = products.find(p=>p.code===it.code);
      if(!found) return alert(`등록되지 않은 제품코드: ${it.code}`);
      it.name = found.name;
    }

    const saleCode = await generateSaleCode(date);
    document.getElementById("saleCodeEl").textContent = saleCode;

    for(const it of items){
      await notionCreate(DB_SALES,{
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
    setTimeout(()=> saleMsg.classList.add("hidden"),1500);

  }catch(e){
    alert("등록 오류: " + e.message);
  }
};

/* =========================================================
   매출 조회 + 삭제
========================================================= */
const salesTbody = document.getElementById("salesTbody");
document.getElementById("formSalesSearch").onsubmit = async e=>{
  e.preventDefault();
  await loadSales();
};

document.getElementById("btnReloadSales").onclick = async()=>{
  sCustomer.value=sItem.value=sType.value=sFrom.value=sTo.value="";
  await loadSales();
};

async function loadSales(){
  salesTbody.innerHTML = `<tr><td colspan="11" class="py-4 text-center text-gray-400">조회 중...</td></tr>`;
  const filters = [];

  if(sCustomer.value) filters.push({property:"Customer",rich_text:{contains:sCustomer.value}});
  if(sItem.value) filters.push({property:"Items",rich_text:{contains:sItem.value}});
  if(sType.value) filters.push({property:"SaleType",select:{equals:sType.value}});
  if(sFrom.value || sTo.value){
    const d={property:"Date",date:{}};
    if(sFrom.value) d.date.on_or_after=sFrom.value;
    if(sTo.value) d.date.on_or_before=sTo.value;
    filters.push(d);
  }

  const data = await notionQuery(DB_SALES,{
    filter: filters.length?{and:filters}:undefined,
    sorts:[{property:"Date",direction:"descending"}],
    page_size:300
  });

  const rows = data.results || [];
  if(!rows.length)
    return salesTbody.innerHTML = `<tr><td colspan="11" class="py-4 text-center text-gray-400">결과 없음</td></tr>`;

  salesTbody.innerHTML = "";
  rows.forEach(r=>{
    const p = r.properties;
    const tr = document.createElement("tr");
    tr.className = "border-b hover:bg-gray-50";
    tr.innerHTML = `
      <td class="py-2 px-3">${p.code?.rich_text?.[0]?.plain_text||""}</td>
      <td class="py-2 px-3">${p.Date?.date?.start||""}</td>
      <td class="py-2 px-3">${p.Customer?.rich_text?.[0]?.plain_text||""}</td>
      <td class="py-2 px-3">${p.Items?.rich_text?.[0]?.plain_text||""}</td>
      <td class="py-2 px-3">${p.Specification?.rich_text?.[0]?.plain_text||""}</td>
      <td class="py-2 px-3">${p.SaleType?.select?.name||""}</td>
      <td class="py-2 px-3 text-right">${p.Quantity?.number ?? ""}</td>
      <td class="py-2 px-3 text-right">${p.UnitPrice?.number?.toLocaleString("ko-KR") ?? ""}</td>
      <td class="py-2 px-3 text-right">${p.Total?.number?.toLocaleString("ko-KR") ?? ""}</td>
      <td class="py-2 px-3">${p.Salesperson?.rich_text?.[0]?.plain_text||""}</td>
      <td class="py-2 px-3"><button class="text-red-600 underline text-xs btnDel" data-id="${r.id}">삭제</button></td>
    `;
    salesTbody.appendChild(tr);
  });

  document.querySelectorAll(".btnDel").forEach(btn=> btn.onclick = async()=>{
    if(!confirm("정말 삭제하시겠습니까?")) return;
    await notionDelete(btn.dataset.id);
    loadSales();
  });
}

/* =========================================================
   명세표 출력
========================================================= */
document.getElementById("btnPrintStatement").onclick = async()=>{
  const {printStatement} = await import("./statement.js");
  printStatement();
};
