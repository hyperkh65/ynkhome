/************************************************************
 * YNK ERP2 · Core Module (Notion API Proxy + Helpers)
 ************************************************************/

export const PROXY = 'https://ynk2014.com:4443/notion';

export const DB_USERS    = '26d1f4ff9a0e800cba14e56be989568b';
export const DB_SALES    = '26e1f4ff9a0e801f807fde6aa13b12a0';
export const DB_PRODUCTS = '2a01f4ff9a0e8016aa33c239d64eb482';
export const DB_CLIENTS  = '2a11f4ff9a0e80c5b431d7ca0194e149';

export const TEMPLATE_URL = './templates/statement.html';

/* --------- Field Helpers --------- */
export const rt      = t => ({rich_text:[{type:'text',text:{content:String(t||'')}}]});
export const title   = t => ({title:[{type:'text',text:{content:String(t||'')}}]});
export const dateISO = i => ({date:i?{start:i}:null});
export const select  = n => ({select:n?{name:String(n)}:null});
export const num     = n => ({number:(n===''||n==null)?null:Number(n)});

/* --------- Request Wrapper --------- */
async function api(path, body){
  const r = await fetch(PROXY+path,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

/* --------- Exported Notion Ops --------- */
export const notionQuery  = (db,body)=>api('/query' ,{db,...body});
export const notionCreate = (db,p)=>api('/create',{db,properties:p});
export const notionUpdate = (id,p)=>api('/update',{pageId:id,properties:p});
export const notionDelete = id   =>api('/delete',{pageId:id});

/* --------- File Upload --------- */
export async function uploadFile(inputEl){
  if(!inputEl?.files?.length) return [];
  const f = inputEl.files[0];
  const fd = new FormData();
  fd.append('file', f);
  const r = await fetch(PROXY+'/upload',{method:'POST',body:fd});
  const j = await r.json();
  return [{ name:f.name, external:{ url:j.url } }];
}

/* --------- Safe Text Escape --------- */
export const escapeHTML = (s='') =>
  s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
