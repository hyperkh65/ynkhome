<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>YNK Mini ERP (Notion)</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  .btn{padding:.5rem .75rem;border-radius:.75rem}
  .spinner{border:4px solid #e5e7eb;border-top:4px solid #3b82f6;border-radius:50%;width:24px;height:24px;animation:spin 1s linear infinite}
  @keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
  td,th{white-space:nowrap}
</style>
</head>
<body class="bg-gray-50 text-gray-900">

<header class="bg-white border-b border-gray-200 sticky top-0 z-30">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">ERP</div>
      <h1 class="text-lg font-semibold">YNK Mini ERP · Notion</h1>
      <span class="text-xs text-gray-500 ml-2">프록시 연동</span>
    </div>
    <div id="userBadge" class="hidden items-center gap-3">
      <span id="userName" class="text-sm text-gray-700"></span>
      <button id="btnLogout" class="text-sm text-red-600 hover:underline">로그아웃</button>
    </div>
  </div>
</header>

<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

  <!-- CONFIG -->
  <details class="mb-4 bg-white rounded-2xl shadow p-4" open>
    <summary class="cursor-pointer font-semibold">CONFIG · Notion 연결 설정</summary>
    <div class="grid md:grid-cols-2 gap-4 mt-4">
      <div>
        <label class="text-sm">Proxy Base URL</label>
        <input id="cfgProxy" class="mt-1 w-full border rounded-xl px-3 py-2"
          value="https://ynk2014.com:4443/notion" />
        <p class="text-xs text-gray-500 mt-1">엔드포인트: /query, /create, /update, /delete, /upload, /upload-client</p>
      </div>
      <div>
        <label class="text-sm">Users DB ID</label>
        <input id="cfgDbUsers" class="mt-1 w-full border rounded-xl px-3 py-2"
          value="26d1f4ff9a0e800cba14e56be989568b" />
      </div>
      <div>
        <label class="text-sm">Clients DB ID</label>
        <input id="cfgDbClients" class="mt-1 w-full border rounded-xl px-3 py-2"
          value="2701f4ff9a0e80c69aa8faf0d877a8e1" />
      </div>
      <div>
        <label class="text-sm">Products DB ID</label>
        <input id="cfgDbProducts" class="mt-1 w-full border rounded-xl px-3 py-2" placeholder="필수: 저장하세요" />
      </div>
      <div>
        <label class="text-sm">Sales DB ID</label>
        <input id="cfgDbSales" class="mt-1 w-full border rounded-xl px-3 py-2" placeholder="필수: 저장하세요" />
      </div>
      <div>
        <label class="text-sm">Quotations DB ID</label>
        <input id="cfgDbQuotes" class="mt-1 w-full border rounded-xl px-3 py-2" placeholder="필수: 저장하세요" />
      </div>
    </div>
    <div class="mt-4 flex gap-2">
      <button id="btnSaveCfg" class="btn bg-emerald-600 text-white">저장</button>
      <button id="btnClearCfg" class="btn bg-gray-200">리셋</button>
      <span id="cfgSavedMsg" class="text-sm text-green-600 hidden">저장됨</span>
    </div>
  </details>

  <!-- 로그인 -->
  <section id="authPanel" class="max-w-md mx-auto bg-white rounded-2xl shadow p-6">
    <h2 class="text-xl font-semibold">로그인</h2>
    <p class="text-sm text-gray-600 mt-1">Users DB의 Email + Password(평문)로 인증합니다.</p>
    <form id="loginForm" class="mt-4 grid gap-3">
      <div>
        <label class="text-sm">이메일</label>
        <input id="loginEmail" type="email" required class="mt-1 w-full border rounded-xl px-3 py-2" placeholder="you@company.com" />
      </div>
      <div>
        <label class="text-sm">비밀번호</label>
        <input id="loginPassword" type="password" required class="mt-1 w-full border rounded-xl px-3 py-2" placeholder="••••••••" />
      </div>
      <button class="mt-2 btn bg-emerald-600 text-white">로그인</button>
      <div id="loginMsg" class="text-sm text-red-600 hidden">이메일 또는 비밀번호가 올바르지 않습니다.</div>
    </form>
  </section>

  <!-- 앱 -->
  <section id="appPanel" class="hidden">
    <div class="flex flex-wrap gap-2 mb-4">
      <button data-tab="dashboard" class="tab-btn btn bg-emerald-600 text-white">대시보드</button>
      <button data-tab="sales-entry" class="tab-btn btn bg-white border">매출 입력</button>
      <button data-tab="products-entry" class="tab-btn btn bg-white border">상품 입력</button>
      <button data-tab="quotes" class="tab-btn btn bg-white border">견적 조회/입력</button>
      <button data-tab="sales-list" class="tab-btn btn bg-white border">매출 목록</button>
      <button data-tab="products-list" class="tab-btn btn bg-white border">상품 목록</button>
      <button data-tab="clients" class="tab-btn btn bg-white border">거래처 관리</button>
    </div>

    <!-- 대시보드 -->
    <div id="tab-dashboard" class="tab">
      <div class="grid md:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl shadow"><div class="text-sm text-gray-500">오늘 날짜</div><div class="mt-1 text-2xl font-semibold" id="todayStr"></div></div>
        <div class="bg-white p-5 rounded-2xl shadow"><div class="text-sm text-gray-500">최근 매출(건)</div><div class="mt-1 text-2xl font-semibold" id="statSalesCount">—</div></div>
        <div class="bg-white p-5 rounded-2xl shadow"><div class="text-sm text-gray-500">상품 수</div><div class="mt-1 text-2xl font-semibold" id="statProductsCount">—</div></div>
      </div>
      <div class="mt-6 bg-white p-5 rounded-2xl shadow">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">최근 10건 매출</h3>
          <button id="refreshDashboard" class="text-sm text-emerald-700 underline">새로고침</button>
        </div>
        <div class="mt-3 overflow-auto">
          <table class="min-w-full text-sm">
            <thead><tr class="text-left border-b"><th class="py-2 pr-3">날짜</th><th class="py-2 pr-3">고객</th><th class="py-2 pr-3">상품</th><th class="py-2 pr-3">수량</th><th class="py-2 pr-3">단가</th><th class="py-2 pr-3">금액</th></tr></thead>
            <tbody id="dashSalesBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 매출 입력 -->
    <div id="tab-sales-entry" class="tab hidden">
      <div class="bg-white p-5 rounded-2xl shadow">
        <h3 class="font-semibold">매출 입력</h3>
        <form id="formSales" class="grid md:grid-cols-3 gap-4 mt-4">
          <div><label class="text-sm">날짜</label><input type="date" id="saleDate" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div><label class="text-sm">고객</label><input id="saleCustomer" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div><label class="text-sm">상품</label><input id="saleProduct" class="mt-1 w-full border rounded-xl px-3 py-2" placeholder="SKU | Name"/></div>
          <div><label class="text-sm">수량</label><input type="number" id="saleQty" class="mt-1 w-full border rounded-xl px-3 py-2" value="1"/></div>
          <div><label class="text-sm">단가</label><input type="number" id="saleUnitPrice" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div><label class="text-sm">메모</label><input id="saleNotes" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div><label class="text-sm">담당자</label><input id="saleOwner" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div class="flex items-end gap-3"><button class="px-4 py-2 rounded-xl bg-emerald-600 text-white">등록</button><div id="saleMsg" class="text-sm text-green-600 hidden">등록됨</div></div>
        </form>
      </div>
    </div>

    <!-- 상품 입력 -->
    <div id="tab-products-entry" class="tab hidden">
      <div class="bg-white p-5 rounded-2xl shadow">
        <h3 class="font-semibold">상품 입력</h3>
        <form id="formProduct" class="grid md:grid-cols-3 gap-4 mt-4">
          <div><label class="text-sm">SKU (title)</label><input id="pSKU" class="mt-1 w-full border rounded-xl px-3 py-2" /></div>
          <div><label class="text-sm">상품명</label><input id="pName" class="mt-1 w-full border rounded-xl px-3 py-2" /></div>
          <div><label class="text-sm">카테고리(select)</label><input id="pCat" class="mt-1 w-full border rounded-xl px-3 py-2" /></div>
          <div><label class="text-sm">단가(number)</label><input type="number" step="0.01" id="pUnitPrice" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div><label class="text-sm">재고(number)</label><input type="number" id="pStock" class="mt-1 w-full border rounded-xl px-3 py-2" value="0"/></div>
          <div class="md:col-span-3"><label class="text-sm">비고(rich_text)</label><textarea id="pNotes" class="mt-1 w-full border rounded-xl px-3 py-2" rows="3"></textarea></div>
          <div class="flex items-end gap-3"><button class="px-4 py-2 rounded-xl bg-emerald-600 text-white">등록</button><div id="prodMsg" class="text-sm text-green-600 hidden">등록됨</div></div>
        </form>
      </div>
    </div>

    <!-- 견적 조회/입력 -->
    <div id="tab-quotes" class="tab hidden">
      <div class="bg-white p-5 rounded-2xl shadow">
        <h3 class="font-semibold">견적</h3>
        <form id="formQuoteSearch" class="mt-1 flex flex-wrap gap-3 items-end">
          <div><label class="text-sm">견적번호(부분검색)</label><input id="qNo" class="mt-1 w-48 border rounded-xl px-3 py-2"/></div>
          <div><label class="text-sm">고객명(부분검색)</label><input id="qCustomer" class="mt-1 w-48 border rounded-xl px-3 py-2"/></div>
          <button class="btn bg-emerald-600 text-white">검색</button>
          <div id="quoteMsg" class="text-sm text-gray-500 hidden">검색 중…</div>
        </form>
        <div class="mt-3 overflow-auto">
          <table class="min-w-full text-sm">
            <thead><tr class="text-left border-b"><th class="py-2 pr-3">견적번호</th><th class="py-2 pr-3">고객</th><th class="py-2 pr-3">일자</th><th class="py-2 pr-3">합계</th><th class="py-2 pr-3">담당</th></tr></thead>
            <tbody id="quoteTbody"></tbody>
          </table>
        </div>
        <hr class="my-4">
        <h4 class="font-semibold">견적 입력(간단)</h4>
        <form id="formQuoteCreate" class="mt-2 grid md:grid-cols-3 gap-3">
          <div><label class="text-sm">견적번호</label><input id="qcNo" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div><label class="text-sm">고객</label><input id="qcCust" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div><label class="text-sm">일자</label><input id="qcDate" type="date" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div class="md:col-span-3"><label class="text-sm">항목(텍스트)</label><textarea id="qcItems" class="mt-1 w-full border rounded-xl px-3 py-2" rows="2"></textarea></div>
          <div><label class="text-sm">합계</label><input id="qcTotal" type="number" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div><label class="text-sm">담당</label><input id="qcOwner" class="mt-1 w-full border rounded-xl px-3 py-2"/></div>
          <div class="flex items-end gap-3"><button class="btn bg-emerald-600 text-white">등록</button><div id="qcMsg" class="text-sm text-green-600 hidden">등록됨</div></div>
        </form>
      </div>
    </div>

    <!-- 매출 목록 -->
    <div id="tab-sales-list" class="tab hidden">
      <div class="bg-white p-5 rounded-2xl shadow">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">매출 목록</h3>
          <button id="btnReloadSales" class="text-sm text-emerald-700 underline">새로고침</button>
        </div>
        <div class="mt-3 overflow-auto">
          <table class="min-w-full text-sm">
            <thead><tr class="text-left border-b"><th class="py-2 pr-3">날짜</th><th class="py-2 pr-3">고객</th><th class="py-2 pr-3">상품</th><th class="py-2 pr-3">수량</th><th class="py-2 pr-3">단가</th><th class="py-2 pr-3">금액</th><th class="py-2 pr-3">담당</th></tr></thead>
            <tbody id="salesTbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 상품 목록 -->
    <div id="tab-products-list" class="tab hidden">
      <div class="bg-white p-5 rounded-2xl shadow">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">상품 목록</h3>
          <button id="btnReloadProducts" class="text-sm text-emerald-700 underline">새로고침</button>
        </div>
        <div class="mt-3 overflow-auto">
          <table class="min-w-full text-sm">
            <thead><tr class="text-left border-b"><th class="py-2 pr-3">SKU</th><th class="py-2 pr-3">상품명</th><th class="py-2 pr-3">카테고리</th><th class="py-2 pr-3">단가</th><th class="py-2 pr-3">재고</th></tr></thead>
            <tbody id="productsTbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 거래처 관리 -->
    <div id="tab-clients" class="tab hidden">
      <div class="bg-white p-5 rounded-2xl shadow">
        <div class="flex items-center justify-between"><h3 class="font-semibold">거래처 관리</h3><button id="btnReloadClients" class="text-sm text-emerald-700 underline">새로고침</button></div>
        <form id="formClient" class="grid md:grid-cols-2 gap-4 mt-4">
          <input type="hidden" id="cId" />
          <div><label class="text-sm">거래처명</label><input id="cName" class="mt-1 w-full border rounded-xl px-3 py-2" /></div>
          <div><label class="text-sm">구분</label><select id="cType" class="mt-1 w-full border rounded-xl px-3 py-2"><option value="국내">국내</option><option value="해외">해외</option></select></div>
          <div><label class="text-sm">사업자등록번호</label><input id="cBizNo" class="mt-1 w-full border rounded-xl px-3 py-2" /></div>
          <div><label class="text-sm">대표자</label><input id="cCEO" class="mt-1 w-full border rounded-xl px-3 py-2" /></div>
          <div class="md:col-span-2"><label class="text-sm">주소</label><input id="cAddress" class="mt-1 w-full border rounded-xl px-3 py-2" /></div>
          <div><label class="text-sm">전화번호</label><input id="cTel" class="mt-1 w-full border rounded-xl px-3 py-2" /></div>
          <div><label class="text-sm">팩스</label><input id="cFax" class="mt-1 w-full border rounded-xl px-3 py-2" /></div>
          <div class="md:col-span-2"><label class="text-sm">비고</label><textarea id="cNotes" rows="2" class="mt-1 w-full border rounded-xl px-3 py-2"></textarea></div>

          <!-- 첨부파일 -->
          <div><label class="text-sm">사업자등록증</label><input id="cBizFile" type="file" /></div>
          <div><label class="text-sm">통장사본</label><input id="cBankFile" type="file" /></div>
          <div class="md:col-span-2"><label class="text-sm">공장등록증(여러개 가능)</label><input id="cFactoryFiles" type="file" multiple /></div>

          <div class="md:col-span-2 flex gap-3 items-end">
            <button class="btn bg-emerald-600 text-white">등록/수정</button>
            <button id="btnClientDelete" type="button" class="btn bg-red-600 text-white">삭제</button>
            <div id="clientMsg" class="text-sm text-green-600 hidden">처리됨</div>
          </div>
        </form>
        <div class="mt-6 overflow-auto">
          <table class="min-w-full text-sm">
            <thead><tr class="text-left border-b bg-gray-50">
              <th class="py-2 px-3">거래처명</th><th class="py-2 px-3">구분</th><th class="py-2 px-3">대표자</th>
              <th class="py-2 px-3">전화</th><th class="py-2 px-3">주소</th><th class="py-2 px-3">비고</th><th class="py-2 px-3">첨부</th>
            </tr></thead>
            <tbody id="clientsTbody"></tbody>
          </table>
        </div>
      </div>
    </div>

  </section>
</main>

<footer class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-xs text-gray-500">
  <p>© 2025 YNK Mini ERP · 프론트는 Notion API 직접 호출 불가(CORS) → 프록시 필수.</p>
</footer>

<script>
  // ===== CONFIG 저장 =====
  const CFG_KEY='ynk_erp_cfg_v1';
  let CFG={ proxy:'https://ynk2014.com:4443/notion',
            dbUsers:'26d1f4ff9a0e800cba14e56be989568b',
            dbClients:'2701f4ff9a0e80c69aa8faf0d877a8e1',
            dbProducts:'', dbSales:'', dbQuotes:'' };
  function loadCfg(){ try{ const raw=localStorage.getItem(CFG_KEY); if(raw) CFG=JSON.parse(raw);}catch{}
    cfgProxy.value=CFG.proxy; cfgDbUsers.value=CFG.dbUsers; cfgDbClients.value=CFG.dbClients;
    cfgDbProducts.value=CFG.dbProducts; cfgDbSales.value=CFG.dbSales; cfgDbQuotes.value=CFG.dbQuotes; }
  function saveCfg(){ CFG.proxy=cfgProxy.value.trim(); CFG.dbUsers=cfgDbUsers.value.trim(); CFG.dbClients=cfgDbClients.value.trim();
    CFG.dbProducts=cfgDbProducts.value.trim(); CFG.dbSales=cfgDbSales.value.trim(); CFG.dbQuotes=cfgDbQuotes.value.trim();
    localStorage.setItem(CFG_KEY, JSON.stringify(CFG)); cfgSavedMsg.classList.remove('hidden'); setTimeout(()=>cfgSavedMsg.classList.add('hidden'),1200); }
  function clearCfg(){ localStorage.removeItem(CFG_KEY); loadCfg(); }
  btnSaveCfg.onclick=(e)=>{e.preventDefault(); saveCfg();}; btnClearCfg.onclick=(e)=>{e.preventDefault(); clearCfg();};

  // ===== 유틸 =====
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const title=t=>({title:[{type:'text',text:{content:String(t||'')}}]});
  const rt=t=>({rich_text:[{type:'text',text:{content:String(t||'')}}]});
  const select=n=>({select:n?{name:String(n)}:null});
  const dateISO=i=>({date:i?{start:i}:null});
  const num=n=>({number:(n===''||n==null)?null:Number(n)});
  const getTitle=v=>v?.title?.map(x=>x.plain_text).join('')||'';
  const getRT=v=>v?.rich_text?.map(x=>x.plain_text).join('')||'';
  const getSel=v=>v?.select?.name||'';
  const getNum=v=>typeof v?.number==='number'?v.number:0;
  const getDate=v=>v?.date?.start||'';
  const KRW=n=>new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(Number(n||0));

  // ===== Notion 파일 속성 이름(데이터베이스에 만든 이름과 일치해야 합니다) =====
  const FILE_PROPS = {
    biz: 'BizFile',         // 사업자등록증 (Files & media)
    bank: 'BankFile',       // 통장사본    (Files & media)
    factory: 'FactoryCerts' // 공장등록증  (Files & media, 여러개 가능)
  };
  // ※ DB에서 다른 이름을 쓰고 있다면 위 값을 바꿔주세요.

  // ===== API helpers =====
  async function api(path, body){
    const r=await fetch(CFG.proxy+path,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  }
  const notionQuery  =(db,body)=>api('/query',{db,...body});
  const notionCreate =(db,properties)=>api('/create',{db,properties});
  const notionUpdate =(pageId,properties)=>api('/update',{pageId,properties});
  const notionDelete =(pageId)=>api('/delete',{pageId});

  // ---- 클라이언트 전용 업로드 (사업자/통장/공장등록증 일괄) ----
  async function uploadClientFiles(){
    const fd=new FormData();
    if (cBizFile.files[0])   fd.append('bizReg',   cBizFile.files[0]);
    if (cBankFile.files[0])  fd.append('bankbook', cBankFile.files[0]);
    if (cFactoryFiles.files.length) {
      for (const f of cFactoryFiles.files) fd.append('factoryFiles', f);
    }
    if (![...fd.keys()].length) return {}; // 아무것도 선택 안 했으면 빈 객체

    const r=await fetch(CFG.proxy+'/upload-client',{method:'POST',body:fd});
    if(!r.ok) throw new Error(await r.text());
    return r.json(); // { bizRegUrl?, bankbookUrl?, factoryUrls?[] }
  }

  // ===== 로그인 =====
  let currentUser=null;
  loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault(); saveCfg();
    try{
      const mail=loginEmail.value.trim(), pass=loginPassword.value.trim();
      const filter={ and:[ {property:'Email',email:{equals:mail}}, {property:'PasswordHash',rich_text:{equals:pass}} ] };
      const resp=await notionQuery(CFG.dbUsers,{filter,page_size:1});
      if(resp.results?.length){ currentUser={Email:mail}; authPanel.classList.add('hidden'); appPanel.classList.remove('hidden'); userBadge.classList.remove('hidden'); userName.textContent=mail; initDashboard(); reloadProducts(); reloadSales(); reloadClients(); }
      else { loginMsg.classList.remove('hidden'); setTimeout(()=>loginMsg.classList.add('hidden'),1500); }
    }catch(err){ alert('로그인 실패: '+err.message); }
  });
  btnLogout.onclick=()=>location.reload();

  // ===== 탭 =====
  $$('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    const tab=b.dataset.tab; $$('.tab-btn').forEach(x=>x.classList.remove('bg-emerald-600','text-white')); b.classList.add('bg-emerald-600','text-white');
    $$('.tab').forEach(t=>t.classList.add('hidden')); $('#tab-'+tab).classList.remove('hidden');
    if(tab==='sales-list') reloadSales(); if(tab==='products-list') reloadProducts(); if(tab==='clients') reloadClients();
  }));

  // ===== 대시보드 =====
  function initDashboard(){
    todayStr.textContent=new Date().toLocaleDateString('ko-KR',{dateStyle:'long'});
    refreshDashboard.onclick=async()=>{
      try{
        const sales=await notionQuery(CFG.dbSales,{page_size:10,sorts:[{property:'Date',direction:'descending'}]});
        dashSalesBody.innerHTML='';
        (sales.results||[]).forEach(it=>{
          const f=it.properties;
          const total=getNum(f.Total)||getNum(f.UnitPrice)*getNum(f.Quantity);
          const tr=document.createElement('tr');
          tr.innerHTML=`<td class="py-2 pr-3">${getDate(f.Date)}</td>
                        <td class="py-2 pr-3">${getRT(f.Customer)}</td>
                        <td class="py-2 pr-3">${getRT(f.Product)}</td>
                        <td class="py-2 pr-3">${getNum(f.Quantity)}</td>
                        <td class="py-2 pr-3">${getNum(f.UnitPrice)}</td>
                        <td class="py-2 pr-3">${KRW(total)}</td>`;
          dashSalesBody.appendChild(tr);
        });
        statSalesCount.textContent=(sales.results||[]).length;

        // 상품 수 카운트
        let count=0,c=null;
        do{
          const page=await notionQuery(CFG.dbProducts,{page_size:100,start_cursor:c});
          count+=(page.results||[]).length;
          c=page.next_cursor||null;
        }while(c);
        statProductsCount.textContent=String(count);
      }catch(e){ console.warn(e); }
    };
    refreshDashboard.click();
  }

  // ===== 상품 입력/목록 =====
  formProduct.addEventListener('submit', async e=>{
    e.preventDefault();
    try{
      const props={ SKU:title(pSKU.value), Name:rt(pName.value), Category:select(pCat.value),
                    UnitPrice:num(pUnitPrice.value), Stock:num(pStock.value), Notes:rt(pNotes.value) };
      await notionCreate(CFG.dbProducts,props);
      prodMsg.classList.remove('hidden'); setTimeout(()=>prodMsg.classList.add('hidden'),1200);
      formProduct.reset(); reloadProducts();
    }catch(err){ alert('상품 등록 오류: '+err.message); }
  });

  async function reloadProducts(){
    if(!CFG.dbProducts) return;
    try{
      let all=[],cur=null;
      do{
        const page=await notionQuery(CFG.dbProducts,{page_size:100,start_cursor:cur,sorts:[{property:'Name',direction:'ascending'}]});
        all=all.concat(page.results||[]); cur=page.next_cursor||null;
      }while(cur);
      productsTbody.innerHTML='';
      all.forEach(it=>{
        const f=it.properties;
        const tr=document.createElement('tr');
        tr.innerHTML=`<td class="py-2 pr-3">${getTitle(f.SKU)||getRT(f.SKU)}</td>
                      <td class="py-2 pr-3">${getRT(f.Name)}</td>
                      <td class="py-2 pr-3">${getSel(f.Category)}</td>
                      <td class="py-2 pr-3">${getNum(f.UnitPrice)}</td>
                      <td class="py-2 pr-3">${getNum(f.Stock)}</td>`;
        productsTbody.appendChild(tr);
      });
    }catch(err){ alert('상품 목록 오류: '+err.message); }
  }
  btnReloadProducts.onclick=reloadProducts;

  // ===== 매출 입력/목록 =====
  formSales.addEventListener('submit', async e=>{
    e.preventDefault();
    try{
      const qty=Number(saleQty.value||0), unit=Number(saleUnitPrice.value||0);
      const props={ Date:dateISO(saleDate.value||new Date().toISOString().slice(0,10)),
                    Customer:rt(saleCustomer.value), Product:rt(saleProduct.value),
                    Quantity:num(qty), UnitPrice:num(unit), Total:num(qty*unit),
                    Salesperson:rt(saleOwner.value||currentUser?.Email||''), Notes:rt(saleNotes.value) };
      await notionCreate(CFG.dbSales,props);
      saleMsg.classList.remove('hidden'); setTimeout(()=>saleMsg.classList.add('hidden'),1200);
      formSales.reset(); saleDate.value=new Date().toISOString().slice(0,10); reloadSales();
    }catch(err){ alert('매출 등록 오류: '+err.message); }
  });

  async function reloadSales(){
    if(!CFG.dbSales) return;
    try{
      let all=[],cur=null;
      do{
        const page=await notionQuery(CFG.dbSales,{page_size:100,start_cursor:cur,sorts:[{property:'Date',direction:'descending'}]});
        all=all.concat(page.results||[]); cur=page.next_cursor||null;
      }while(cur);
      salesTbody.innerHTML='';
      all.forEach(it=>{
        const f=it.properties;
        const total=getNum(f.Total)||getNum(f.UnitPrice)*getNum(f.Quantity);
        const tr=document.createElement('tr');
        tr.innerHTML=`<td class="py-2 pr-3">${getDate(f.Date)}</td>
                      <td class="py-2 pr-3">${getRT(f.Customer)}</td>
                      <td class="py-2 pr-3">${getRT(f.Product)}</td>
                      <td class="py-2 pr-3">${getNum(f.Quantity)}</td>
                      <td class="py-2 pr-3">${getNum(f.UnitPrice)}</td>
                      <td class="py-2 pr-3">${KRW(total)}</td>
                      <td class="py-2 pr-3">${getRT(f.Salesperson)}</td>`;
        salesTbody.appendChild(tr);
      });
    }catch(err){ alert('매출 목록 오류: '+err.message); }
  }
  btnReloadSales.onclick=reloadSales;

  // ===== 견적 조회/등록 =====
  formQuoteSearch.addEventListener('submit', async e=>{
    e.preventDefault(); if(!CFG.dbQuotes) return alert('CONFIG에서 Quotations DB ID 저장');
    quoteMsg.classList.remove('hidden');
    try{
      let ors=[];
      if(qNo.value){ ors.push({property:'QuoteNo', title:{ contains:qNo.value }}); ors.push({property:'QuoteNo', rich_text:{ contains:qNo.value }}); }
      if(qCustomer.value) ors.push({property:'Customer', rich_text:{ contains:qCustomer.value }});
      const filter = ors.length? { or: ors } : undefined;
      const data = await notionQuery(CFG.dbQuotes,{filter,page_size:50,sorts:[{property:'Date',direction:'descending'}]});
      quoteTbody.innerHTML='';
      (data.results||[]).forEach(it=>{
        const f=it.properties;
        const qno=getTitle(f.QuoteNo)||getRT(f.QuoteNo);
        const tr=document.createElement('tr');
        tr.innerHTML=`<td class="py-2 pr-3">${qno}</td>
                      <td class="py-2 pr-3">${getRT(f.Customer)}</td>
                      <td class="py-2 pr-3">${getDate(f.Date)}</td>
                      <td class="py-2 pr-3">${KRW(getNum(f.Total))}</td>
                      <td class="py-2 pr-3">${getRT(f.Owner)}</td>`;
        quoteTbody.appendChild(tr);
      });
    }catch(err){ alert('견적 조회 오류: '+err.message); }
    finally{ quoteMsg.classList.add('hidden'); }
  });

  formQuoteCreate.addEventListener('submit', async e=>{
    e.preventDefault(); if(!CFG.dbQuotes) return alert('CONFIG에서 Quotations DB ID 저장');
    try{
      const props={ QuoteNo:title(qcNo.value), Customer:rt(qcCust.value), Date:dateISO(qcDate.value),
                    Items:rt(qcItems.value), Total:num(qcTotal.value),
                    Owner:rt(qcOwner.value||currentUser?.Email||'') };
      await notionCreate(CFG.dbQuotes, props);
      qcMsg.classList.remove('hidden'); setTimeout(()=>qcMsg.classList.add('hidden'),1200);
      formQuoteCreate.reset(); formQuoteSearch.dispatchEvent(new Event('submit'));
    }catch(err){ alert('견적 등록 오류: '+err.message); }
  });

  // ===== 거래처 CRUD + 파일 =====
  async function reloadClients(){
    if(!CFG.dbClients) return;
    try{
      const data=await notionQuery(CFG.dbClients,{page_size:100,sorts:[{property:'Name',direction:'ascending'}]});
      clientsTbody.innerHTML='';
      (data.results||[]).forEach(it=>{
        const p=it.properties; const filesCell=[];
        if(p[FILE_PROPS.biz]?.files?.length)   filesCell.push(`<a target="_blank" href="${p[FILE_PROPS.biz].files[0].file?.url||p[FILE_PROPS.biz].files[0].external?.url}">사업자</a>`);
        if(p[FILE_PROPS.bank]?.files?.length)  filesCell.push(`<a target="_blank" href="${p[FILE_PROPS.bank].files[0].file?.url||p[FILE_PROPS.bank].files[0].external?.url}">통장</a>`);
        if(p[FILE_PROPS.factory]?.files?.length) filesCell.push(`<span class="text-gray-500">공장:${p[FILE_PROPS.factory].files.length}개</span>`);
        const tr=document.createElement('tr');
        tr.innerHTML=`<td class="py-2 px-3"><a href="#" data-id="${it.id}" class="client-edit text-emerald-700 underline">${getTitle(p.Name) || getRT(p.Name)}</a></td>
                      <td class="py-2 px-3">${getSel(p.Type)}</td>
                      <td class="py-2 px-3">${getRT(p.CEO)}</td>
                      <td class="py-2 px-3">${getRT(p.Tel)}</td>
                      <td class="py-2 px-3">${getRT(p.Address)}</td>
                      <td class="py-2 px-3">${getRT(p.Notes)}</td>
                      <td class="py-2 px-3">${filesCell.join(' ')}</td>`;
        clientsTbody.appendChild(tr);
      });
      $$('.client-edit').forEach(a=>a.onclick=(e)=>{
        e.preventDefault();
        const id=a.dataset.id;
        const hit=data.results.find(x=>x.id===id); if(!hit) return;
        const p=hit.properties;
        cId.value=hit.id; cName.value=getTitle(p.Name) || getRT(p.Name);
        cType.value=getSel(p.Type)||'국내'; cBizNo.value=getRT(p.BizNo); cCEO.value=getRT(p.CEO);
        cAddress.value=getRT(p.Address); cTel.value=getRT(p.Tel); cFax.value=getRT(p.Fax); cNotes.value=getRT(p.Notes);
      });
    }catch(err){ alert('거래처 목록 오류: '+err.message); }
  }
  btnReloadClients.onclick=reloadClients;

  formClient.addEventListener('submit', async e=>{
    e.preventDefault(); if(!CFG.dbClients) return alert('CONFIG에서 Clients DB ID 저장');
    try{
      // 기본 속성
      const props={
        Name:rt(cName.value), Type:select(cType.value), BizNo:rt(cBizNo.value),
        CEO:rt(cCEO.value), Address:rt(cAddress.value), Tel:rt(cTel.value),
        Fax:rt(cFax.value), Notes:rt(cNotes.value)
      };

      // 파일 업로드 (사업자/통장/공장등록증)
      const up = await uploadClientFiles();
      // ➜ Notion Files 규격: 각 항목에 반드시 name 필요!
      if (up.bizRegUrl) {
        props[FILE_PROPS.biz] = {
          files: [{ name: cBizFile.files[0]?.name || '사업자등록증', external: { url: up.bizRegUrl } }]
        };
      }
      if (up.bankbookUrl) {
        props[FILE_PROPS.bank] = {
          files: [{ name: cBankFile.files[0]?.name || '통장사본', external: { url: up.bankbookUrl } }]
        };
      }
      if (Array.isArray(up.factoryUrls) && up.factoryUrls.length) {
        props[FILE_PROPS.factory] = {
          files: up.factoryUrls.map((u,i)=>({
            name: cFactoryFiles.files[i]?.name || `공장등록증-${i+1}`,
            external: { url: u }
          }))
        };
      }

      // 생성/수정
      if(cId.value) await notionUpdate(cId.value, props);
      else          await notionCreate(CFG.dbClients, props);

      clientMsg.classList.remove('hidden'); setTimeout(()=>clientMsg.classList.add('hidden'),1200);
      formClient.reset(); cId.value=''; reloadClients();
    }catch(err){
      alert('거래처 저장 오류: '+err.message);
    }
  });

  btnClientDelete.onclick=async()=>{
    if(!cId.value) return alert('삭제할 거래처 선택');
    if(!confirm('정말 삭제(아카이브)할까요?')) return;
    try{ await notionDelete(cId.value); formClient.reset(); cId.value=''; reloadClients(); }
    catch(err){ alert('삭제 오류: '+err.message); }
  };

  // 초기화
  loadCfg(); saleDate.value=new Date().toISOString().slice(0,10);
</script>
</body>
</html>
