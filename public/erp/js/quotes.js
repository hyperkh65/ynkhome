/* js/quotes.js — 견적 탭 전용 로직 (제품 상세 모달 포함)
   의존성: window.notionQuery/notationCreate/rt/dateISO/select/num (app.js에서 전역 노출)
*/

const PROXY_FALLBACK = 'https://ynk2014.com:4443/notion';
const DB_QUOTES   = '2a21f4ff9a0e80a5b6b5fd006e46a44a'; // 견적DB
const DB_PRODUCTS = '2a01f4ff9a0e8016aa33c239d64eb482'; // 상품DB

const api = window.api || (async function(path, body){
  const r = await fetch((window.PROXY || PROXY_FALLBACK) + path, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
  });
  if(!r.ok) throw new Error(await r.text()); return r.json();
});
const notionQuery  = window.notionQuery  || ((db,body)=>api('/query',{db,...body}));
const notionCreate = window.notionCreate || ((db,p)=>api('/create',{db,properties:p}));

const rt     = window.rt     || (t=>({rich_text:[{type:'text',text:{content:String(t||'')}}]}));
const dateISO= window.dateISO|| (i=>({date:i?{start:i}:null}));
const select = window.select || (n=>({select:n?{name:String(n)}:null}));
const num    = window.num    || (n=>({number:(n===''||n==null)?null:Number(n)}));

/* 상태 */
let productMaster = [];            // [{code,name,supplier,maker,voltage,watts,eff,lumen,cct}]
let quoteTable; let quoteSummaryEl;

document.addEventListener('DOMContentLoaded', () => {
  if(!document.getElementById('tab-quotes')) return;

  quoteTable = document.getElementById('quoteItems');
  quoteSummaryEl = document.getElementById('quoteSummary');

  // 버튼
  document.getElementById('btnAddQuoteItem')?.addEventListener('click', addRow);
  document.getElementById('btnSaveQuote')?.addEventListener('click', saveQuote);
  document.getElementById('btnPrintQuote')?.addEventListener('click', printQuote);

  // 거래처 모달 버튼(견적 탭)
  document.getElementById('btnPickClientQuote')?.addEventListener('click', ()=>{
    window.currentPickingMode = 'quotes';
    if (typeof window.openClientsModal === 'function') window.openClientsModal();
  });

  // 제품 마스터 로드
  preloadProducts();

  // 기본 1행
  addRow();

  // 위임: 합계 계산/삭제/제품선택
  quoteTable?.addEventListener('input', (e)=>{
    if(e.target.matches('.item-qty,.item-price,.item-unit')) calcTotal();
  });
  quoteTable?.addEventListener('click', (e)=>{
    if(e.target.classList.contains('btnDel')){ e.target.closest('tr').remove(); calcTotal(); }
    if(e.target.classList.contains('btnPickProduct')){ openProductsModalQuote(e.target.closest('tr')); }
  });

  // 모달 이벤트
  document.getElementById('btnCloseProductsQuote')?.addEventListener('click', ()=>closeModal(document.getElementById('modalProductsQuote')));
  document.getElementById('modalProductQuoteSearch')?.addEventListener('input', (e)=>renderProductQuoteList(e.target.value.trim()));
});

/* 제품 마스터 */
async function preloadProducts(){
  try{
    const d = await notionQuery(DB_PRODUCTS, { page_size:1000, sorts:[{property:'ProductCode',direction:'ascending'}] });
    productMaster = (d.results||[]).map(r=>{
      const p=r.properties||{};
      return {
        code: p.ProductCode?.rich_text?.[0]?.plain_text || '',
        name: p.ProductName?.rich_text?.[0]?.plain_text || '',
        supplier: p.Supplier?.rich_text?.[0]?.plain_text || '',
        maker: p.Maker?.rich_text?.[0]?.plain_text || '',
        voltage: p.OutputV?.rich_text?.[0]?.plain_text || '',
        watts:   p.OutputA?.rich_text?.[0]?.plain_text || '',
        eff:     p.Efficiency?.rich_text?.[0]?.plain_text || p.Eff?.rich_text?.[0]?.plain_text || '',
        lumen:   p.Lumen?.rich_text?.[0]?.plain_text || '',
        cct:     p.CCT?.rich_text?.[0]?.plain_text || ''
      };
    });
  }catch(e){
    console.warn('제품 마스터 로드 실패:', e);
  }
}

/* 행 추가 (입력 가능) */
function addRow(prefill={}){
  const tr=document.createElement('tr');
  tr.innerHTML = `
    <td><button type="button" class="btnPickProduct text-emerald-600 underline text-sm">선택</button></td>
    <td><input class="item-name border rounded-xl px-2 py-1 w-full" value="${esc(prefill.name||'')}"></td>
    <td><input class="item-desc border rounded-xl px-2 py-1 w-full" value="${esc(prefill.desc||'')}"></td>
    <td><input class="item-vol  border rounded-xl px-2 py-1 w-20 text-center" value="${esc(prefill.voltage||'')}"></td>
    <td><input class="item-watt border rounded-xl px-2 py-1 w-20 text-center" value="${esc(prefill.watts||'')}"></td>
    <td><input class="item-eff  border rounded-xl px-2 py-1 w-20 text-center" value="${esc(prefill.eff||'')}"></td>
    <td><input class="item-lumen border rounded-xl px-2 py-1 w-20 text-center" value="${esc(prefill.lumen||'')}"></td>
    <td><input class="item-cct border rounded-xl px-2 py-1 w-20 text-center" value="${esc(prefill.cct||'')}"></td>
    <td>
      <select class="item-unit border rounded-xl px-2 py-1">
        <option value="RMB">RMB</option><option value="USD">USD</option><option value="KRW">KRW</option>
      </select>
    </td>
    <td><input type="number" class="item-price border rounded-xl px-2 py-1 w-24 text-right" value="${prefill.price||''}"></td>
    <td><input type="number" class="item-qty border rounded-xl px-2 py-1 w-20 text-right" value="${prefill.qty||''}"></td>
    <td class="item-amount text-right px-2">0</td>
    <td class="item-remark text-gray-600 text-sm px-2">${esc(prefill.code||'')}</td>
    <td><button type="button" class="btnDel text-red-500 text-sm">✕</button></td>
  `;
  quoteTable.appendChild(tr);
  calcTotal();
}

/* 합계 */
function calcTotal(){
  let qtySum=0, amtSum=0;
  quoteTable.querySelectorAll('tr').forEach(tr=>{
    const qty = Number(tr.querySelector('.item-qty')?.value||0);
    const price = Number(tr.querySelector('.item-price')?.value||0);
    const amt = qty*price;
    tr.querySelector('.item-amount').textContent = amt.toLocaleString('ko-KR');
    qtySum += qty; amtSum += amt;
  });
  quoteSummaryEl.textContent = `총 수량: ${qtySum.toLocaleString('ko-KR')} / 총 금액: ${amtSum.toLocaleString('ko-KR')}`;
}

/* 견적번호 */
async function generateQuoteNo(date){
  const prefix='Q'+date.replace(/-/g,'');
  const r=await notionQuery(DB_QUOTES,{filter:{property:'Date',date:{equals:date}}});
  const c=(r.results?.length||0)+1;
  return `${prefix}-${String(c).padStart(3,'0')}`;
}

/* 저장 */
async function saveQuote(){
  try{
    const date = document.getElementById('quoteDate').value || new Date().toISOString().slice(0,10);
    const client = document.getElementById('quoteClient').value.trim();
    if(!client) return alert('거래처를 선택하세요.');
    const rows=[...quoteTable.querySelectorAll('tr')];
    if(!rows.length) return alert('견적 항목을 추가하세요.');

    const no = await generateQuoteNo(date);
    document.getElementById('quoteNo').textContent = no;

    for(const tr of rows){
      const unit = tr.querySelector('.item-unit').value;
      const price = Number(tr.querySelector('.item-price').value||0);
      const qty = Number(tr.querySelector('.item-qty').value||0);

      await notionCreate(DB_QUOTES,{
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
        Amount: num(qty*price),
        Remarks: rt(tr.querySelector('.item-remark').textContent), // 제품코드 자동
        Terms: rt(document.getElementById('quoteTerms').value),
        GeneralInfo: rt(document.getElementById('quoteGeneral').value),
        SpecialNotes: rt(document.getElementById('quoteSpecial').value)
      });
    }

    alert('견적이 등록되었습니다.');
    document.getElementById('btnPrintQuote').classList.remove('hidden');
  }catch(e){
    alert('견적 저장 오류: '+e.message);
  }
}

/* 출력 */
async function printQuote(){
  const tmplRes = await fetch('./templates/estimate.html',{cache:'no-cache'});
  if(!tmplRes.ok){ alert('견적서 템플릿을 불러오지 못했습니다.'); return; }
  let tmpl = await tmplRes.text();

  const client = document.getElementById('quoteClient').value.trim();
  const date = document.getElementById('quoteDate').value || new Date().toISOString().slice(0,10);
  const no   = document.getElementById('quoteNo').textContent;

  let qtySum=0, amtSum=0;
  const rowsHTML = [...quoteTable.querySelectorAll('tr')].map(tr=>{
    const name   = tr.querySelector('.item-name').value||'';
    const desc   = tr.querySelector('.item-desc').value||'';
    const vol    = tr.querySelector('.item-vol').value||'';
    const watt   = tr.querySelector('.item-watt').value||'';
    const eff    = tr.querySelector('.item-eff').value||'';
    const lumen  = tr.querySelector('.item-lumen').value||'';
    const cct    = tr.querySelector('.item-cct').value||'';
    const unit   = tr.querySelector('.item-unit').value||'';
    const price  = Number(tr.querySelector('.item-price').value||0);
    const qty    = Number(tr.querySelector('.item-qty').value||0);
    const amount = qty*price;
    const remark = tr.querySelector('.item-remark').textContent||'';
    qtySum+=qty; amtSum+=amount;

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
    .replace('{{general}}', escMultiline(document.getElementById('quoteGeneral').value||''))
    .replace('{{special}}', escMultiline(document.getElementById('quoteSpecial').value||''));

  const w = window.open('', '_blank');
  w.document.open(); w.document.write(tmpl); w.document.close();
}

/* 견적 전용 제품 모달 */
let currentQuoteRow = null;
function openProductsModalQuote(targetRow){
  currentQuoteRow = targetRow;
  renderProductQuoteList('');
  openModal(document.getElementById('modalProductsQuote'));
  setTimeout(()=>document.getElementById('modalProductQuoteSearch')?.focus(),0);
}
function renderProductQuoteList(keyword){
  const kw = (keyword||'').toLowerCase();
  const tbody = document.getElementById('modalProductQuoteList');
  const rows = (productMaster||[]).filter(p=>{
    return !kw ||
      p.code.toLowerCase().includes(kw) ||
      p.name.toLowerCase().includes(kw) ||
      p.supplier.toLowerCase().includes(kw) ||
      p.maker.toLowerCase().includes(kw);
  }).map(p=>{
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

  tbody.querySelectorAll('.btnPickThis').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const code = btn.getAttribute('data-code');
      const p = productMaster.find(x=>x.code===code);
      if(!p || !currentQuoteRow) return;
      currentQuoteRow.querySelector('.item-name').value = p.name;
      currentQuoteRow.querySelector('.item-desc').value = '';
      currentQuoteRow.querySelector('.item-vol').value  = p.voltage||'';
      currentQuoteRow.querySelector('.item-watt').value = p.watts||'';
      currentQuoteRow.querySelector('.item-eff').value  = p.eff||'';
      currentQuoteRow.querySelector('.item-lumen').value= p.lumen||'';
      currentQuoteRow.querySelector('.item-cct').value  = p.cct||'';
      currentQuoteRow.querySelector('.item-remark').textContent = p.code; // 비고에 제품코드 자동
      closeModal(document.getElementById('modalProductsQuote'));
      calcTotal();
    });
  });
}

/* 공통 모달 유틸 (app.js 노출 사용) */
function openModal(el){ return (window.openModal?window.openModal(el):el?.classList.remove('hidden')); }
function closeModal(el){ return (window.closeModal?window.closeModal(el):el?.classList.add('hidden')); }

/* 유틸 */
function esc(s=''){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function escAttr(s=''){ return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function escMultiline(s=''){ return esc(s).replace(/\n/g,'<br>'); }
