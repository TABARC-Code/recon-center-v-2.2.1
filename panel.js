/*
 TABARC Recon Command Center
 --------------------------------
 Notes to self (and future me):

 This file is intentionally a bit long and chatty.
 Not everything here needs to be perfect.
 The goal is clarity, not cleverness.

 If you're reading this later and wondering
 "why didn't he abstract this?"
 the answer is probably: because abstraction
 would have hidden intent.

 Also: yes, some things could be faster.
 They don't need to be. This runs in a side panel.

 Future ideas scribbled here so they don't vanish:
 - per-project notes attached to saved queries
 - operator autocomplete with warnings
 - showing deprecated operators inline instead of post-run
 - maybe a timeline view of what searches were run when

 Leave this messy. It helps.
*/


const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);


// default storage shape. boring, explicit, predictable
const DEFAULTS={v:221,projects:{},currentProjectId:null,queries:{},templatePacks:null,lastTarget:""};
const ALLOWLIST_HOSTS=['raw.githubusercontent.com','gist.githubusercontent.com'];
const DEPRECATED_OPS=['link:','info:','cache:','daterange:'];

const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
const status=m=>{const s=$('#status');s.textContent=m||'';setTimeout(()=>s.textContent='',2500)};

const els={
 projectSelect:$('#projectSelect'),targetInput:$('#targetInput'),
 grabTargetBtn:$('#grabTargetBtn'),lintToggle:$('#lintToggle'),
 query:$('#query'),operators:$('#operators'),engineSelect:$('#engineSelect'),
 searchBtn:$('#searchBtn'),saveBtn:$('#saveBtn'),savedList:$('#savedList'),
 packSelect:$('#packSelect'),packList:$('#packList'),batchRunBtn:$('#batchRunBtn'),
 batchStepper:$('#batchStepper'),stepNextBtn:$('#stepNextBtn'),
 stepSkipBtn:$('#stepSkipBtn'),stepStopBtn:$('#stepStopBtn'),stepPreview:$('#stepPreview'),
 canaryDisplay:$('#canaryDisplay'),canaryGenBtn:$('#canaryGenBtn'),
 canaryCreateQueryBtn:$('#canaryCreateQueryBtn'),
 remoteUrl:$('#remoteUrl'),remoteImportBtn:$('#remoteImportBtn'),
 exportBtn:$('#exportBtn'),importFile:$('#importFile'),deleteProjectBtn:$('#deleteProjectBtn'),
 savedItemTemplate:$('#savedItemTemplate')
};

const storageGet=()=>new Promise(r=>chrome.storage.local.get(DEFAULTS,r));
const storageSet=d=>new Promise(r=>chrome.storage.local.set(d,r));


// linter is advisory only. it does NOT block execution.
// if you want blocking, do it consciously, not silently.
function lintQuery(q){
 const risky=['password','passwd','credential','secret','token','apikey','private key'];
 const hits=risky.filter(w=>new RegExp('\\b'+w+'\\b','i').test(q));
 const deprecated=DEPRECATED_OPS.filter(op=>q.includes(op));
 return {hits,deprecated};
}


// domain extraction is defensive. urls are liars.
function extractDomain(s){
 try{const u=new URL(s.includes('://')?s:'https://'+s);return u.hostname.replace(/^www\./,'')}catch{return''}
}


// build a search URL based on engine.
// engines are opinionated, so don't pretend this is generic.
function buildUrl(engine,q,target){
 const enc=encodeURIComponent(q),d=extractDomain(target||'');
 switch(engine){
  case'google':return`https://www.google.com/search?q=${enc}`;
  case'bing':return`https://www.bing.com/search?q=${enc}`;
  case'duck':return`https://duckduckgo.com/?q=${enc}`;
  case'wayback':return d?`https://web.archive.org/web/*/${encodeURIComponent('https://'+d+'/*')}`:'';
  case'crt':return d?`https://crt.sh/?q=${encodeURIComponent(d)}`:'';
 }
}

function validatePack(json){
 if(!json||!Array.isArray(json.packs))return false;
 for(const p of json.packs){
  if(typeof p.id!=='string'||typeof p.name!=='string'||!Array.isArray(p.templates))return false;
  for(const t of p.templates){
   if(typeof t.name!=='string'||typeof t.query!=='string')return false;
  }
 }
 return true;
}


// remote pack import is intentionally strict.
// if this ever feels annoying, that's the point.
async function importRemotePack(url){
 try{
  const u=new URL(url);
  if(!ALLOWLIST_HOSTS.includes(u.hostname))return status('Host not allowed');
  const res=await fetch(url);
  const json=await res.json();
  if(!validatePack(json))return status('Invalid pack schema');
  const data=await storageGet();
  const existing=data.templatePacks||{packs:[]};
  data.templatePacks={packs:[...existing.packs,...json.packs]};
  await storageSet(data);
  status('Pack imported');
 }catch{status('Import failed')}
}


// entry point. keep side effects obvious.
async function init(){
 chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(()=>{});
 let data=await storageGet();
 if(!Object.keys(data.projects).length){
  const id=uid();data.projects={[id]:{id,name:'Default'}};data.currentProjectId=id;await storageSet(data);
 }
 els.targetInput.value=data.lastTarget||'';

 els.grabTargetBtn.onclick=async()=>{
  const t=await chrome.tabs.query({active:true,currentWindow:true});
  if(t[0]){
   const u=new URL(t[0].url);const d=u.hostname.replace(/^www\./,'');
   els.targetInput.value=d;await storageSet({lastTarget:d});
  }
 };

 els.searchBtn.onclick=()=>{
  const q=els.query.value.trim();if(!q)return;
  if(els.lintToggle.checked){
   const r=lintQuery(q);
   if(r.deprecated.length)status('Deprecated operators: '+r.deprecated.join(', '));
   else if(r.hits.length)status('Risky terms: '+r.hits.join(', '));
  }
  const url=buildUrl(els.engineSelect.value,q,els.targetInput.value);
  if(!url)return status('Target required');
  chrome.tabs.create({url});
 };

 els.saveBtn.onclick=async()=>{
  const q=els.query.value.trim();if(!q)return;
  data=await storageGet();
  const id=uid();
  data.queries[id]={id,projectId:data.currentProjectId,query:q,createdAt:now()};
  await storageSet(data);
  renderSaved(data);
 };

 els.savedList.onclick=async e=>{
  const li=e.target.closest('li');if(!li)return;
  data=await storageGet();
  if(e.target.classList.contains('act-use'))els.query.value=data.queries[li.dataset.id].query;
  if(e.target.classList.contains('act-del')){delete data.queries[li.dataset.id];await storageSet(data);renderSaved(data);}
 };

 els.canaryGenBtn.onclick=()=>{
  const t='TABARC-'+Math.random().toString(36).slice(2,10).toUpperCase();
  els.canaryDisplay.value=t;els.canaryCreateQueryBtn.disabled=false;
 };
 els.canaryCreateQueryBtn.onclick=()=>{
  els.query.value=`site:${els.targetInput.value||'YOUR_DOMN'} "${els.canaryDisplay.value}"`;
 };

 els.remoteImportBtn.onclick=()=>importRemotePack(els.remoteUrl.value);

 els.exportBtn.onclick=async()=>{
  const d=await storageGet();
  const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='tabarc-recon-v221.json';a.click();
 };

 els.importFile.onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  const j=JSON.parse(await f.text());
  const cur=await storageGet();
  await storageSet({...cur,...j});location.reload();
 };

 els.deleteProjectBtn.onclick=async()=>{
  if(!confirm('Delete project?'))return;
  data=await storageGet();delete data.projects[data.currentProjectId];
  data.currentProjectId=Object.keys(data.projects)[0]||null;
  await storageSet(data);location.reload();
 };
}

function renderSaved(data){
 els.savedList.innerHTML='';
 Object.values(data.queries).filter(q=>q.projectId===data.currentProjectId).forEach(q=>{
  const n=els.savedItemTemplate.content.cloneNode(true);
  n.querySelector('.itemQuery').textContent=q.query;
  n.querySelector('li').dataset.id=q.id;
  els.savedList.appendChild(n);
 });
}

init();
