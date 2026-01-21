/************************************************************
 * YNK ERP2 · 제품등록 + 제품 선택 모달
 ************************************************************/

import { DB_PRODUCTS, notionQuery, notionCreate, uploadFile, rt, select, num } from './core.js';
import { openModal, closeModal } from './ui.js';

let products = [];

/* ----- 제품 목록 로드 ----- */
export async function loadProducts(){
  const data = await notionQuery(DB_PRODUCTS,{
    sorts:[{ property:'ProductCode', direction:'ascending' }],
    page_size:1000
  });

  products = data.results.map(r=>{
    const p = r.properties;
    return{
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
export function initProductForm(){
  const btnSave = document.getElementById('btnSaveProduct');
  const msg = document.getElementById('prodMsg');

  btnSave.onclick = async ()=>{
    try{
      // 제품코드 자동 생성
      const code = "P" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" +
        Math.floor(Math.random()*999).toString().padStart(3,'0');

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

      if(!data.name) return alert("제품명을 입력하세요.");

      const fileSpecArr       = await uploadFile(fileSpec);
      const fileKSKCArr       = await uploadFile(fileKSKC);
      const fileEMIArr        = await uploadFile(fileEMI);
      const fileEfficiencyArr = await uploadFile(fileEfficiency);
      const fileEtcArr        = await uploadFile(fileEtc);

      await notionCreate(DB_PRODUCTS,{
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
      setTimeout(()=>msg.classList.add("hidden"),1500);

      await loadProducts(); // ✅ 등록 → 목록 즉시 갱신

    }catch(err){
      alert("제품 등록 오류: " + err.message);
    }
  };
}

/* ----- 제품 선택 모달 열기 (매출 입력에서 호출) ----- */
export function openProductPicker(forRow){
  window._productPickTargetRow = forRow; // 선택 시 주입될 row 기억
  document.getElementById("productSearch").value = "";
  renderProductPickerTable();
  openModal("productPickerModal");
}

/* ----- 모달에서 제품 클릭 시 → 행에 값 채움 ----- */
function chooseProduct(code){
  const row = window._productPickTargetRow;
  const p = products.find(x => x.code === code);
  if(!row || !p) return;

  row.querySelector(".item-code").value = p.code;
  row.querySelector(".item-name").value = p.name;

  closeModal("productPickerModal");
}

/* ----- 제품 선택 모달 테이블 렌더링 ----- */
export function renderProductPickerTable(){
  const tbody = document.getElementById("productPickerBody");
  const keyword = document.getElementById("productSearch")?.value?.trim().toLowerCase() || "";

  const filtered = products.filter(p =>
    p.code.toLowerCase().includes(keyword) ||
    p.name.toLowerCase().includes(keyword)
  );

  tbody.innerHTML = filtered.map(p=>`
    <tr class="hover:bg-gray-100 cursor-pointer" data-code="${p.code}">
      <td class="py-2 px-3">${p.code}</td>
      <td class="py-2 px-3">${p.name}</td>
      <td class="py-2 px-3">${p.maker}</td>
      <td class="py-2 px-3">${p.vendor}</td>
    </tr>
  `).join("");

  tbody.querySelectorAll("tr").forEach(tr=>{
    tr.onclick = ()=> chooseProduct(tr.dataset.code);
  });
}

/* ----- 검색 이벤트 연결 ----- */
export function initProductPickerSearch(){
  const input = document.getElementById("productSearch");
  if(input) input.addEventListener("input", renderProductPickerTable);
}
