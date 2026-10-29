import './style.css';
import {createClient,createAccount} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {txState,canonical,hash,milli} from './lifecycle.mjs';
const $=id=>document.getElementById(id), escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const deployment=await fetch('/deployment.json').then(r=>r.json());
const rawFixture=await fetch('/revenue.json').then(r=>r.text());
const sourceFixture='https://raw.githubusercontent.com/haris4587/MetricProof/99e1997455eac2419183afa8701f13a551620011/fixtures/revenue.json';
let client=createClient({chain:studionet}),account=null,busy=false,lastCase=null,lastReceipt=null,offset=0,summaryVersion=0;
let transactions=JSON.parse(sessionStorage.getItem('metricproof.transactions')||'[]');
const read=async(name,args=[])=>JSON.parse(await client.readContract({address:deployment.contract,functionName:name,args}));
const txUrl=h=>deployment.explorer+'/transactions/'+h;
$('contractLink').href=deployment.explorer+'/address/'+deployment.contract;
function saveTx(){sessionStorage.setItem('metricproof.transactions',JSON.stringify(transactions));renderTx();}
function route(view){document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==view);document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view));if(view==='registry')loadCases(true);if(view==='activity')renderTx();}
document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>route(el.dataset.view));
function message(text,cls=''){const el=document.createElement('div');el.className=cls;el.textContent=text;$('progress').append(el);}
function setBusy(v){busy=v;for(const el of document.querySelectorAll('button,input,select,textarea'))if(!el.closest('nav')&&!el.closest('header'))el.disabled=v;$('run').textContent=v?'Verification in progress…':'Lock & verify claim ↗';}
async function checkConnection(){const chain=await client.request({method:'eth_chainId',params:[]});if(Number(BigInt(chain))!==deployment.chainId)throw Error('RPC chain ID does not match deployment.');const policy=await read('get_policy');if(policy.version!=='MetricProof/1')throw Error('Contract version mismatch.');}
$('walletButton').onclick=()=>{$('walletError').textContent='';$('walletDialog').showModal();};
$('connect').onclick=async()=>{try{await checkConnection();account=createAccount();client=createClient({chain:studionet,account});$('walletButton').textContent=account.address.slice(0,6)+'…'+account.address.slice(-4)+' · test account';$('walletDialog').close();}catch(e){$('walletError').textContent=e.message;}};
$('disconnect').onclick=()=>{account=null;client=createClient({chain:studionet});$('walletButton').textContent='Choose signing mode ↗';$('walletDialog').close();};
$('studioMode').onclick=()=>{$('walletDialog').close();prepareStudio().catch(e=>message(e.message,'error'));};
async function waitTx(entry){
  for(let i=0;i<100;i++){
    const tx=await client.getTransaction({hash:entry.hash});const state=txState(tx);Object.assign(entry,state);saveTx();
    $('statusPill').textContent=state.status;
    if(state.failed)throw Error('Transaction '+state.status+': '+state.error);
    if(state.committed){message(entry.method+' · '+state.status+(state.final?'':' (provisional)'),'success');return tx;}
    await new Promise(r=>setTimeout(r,1800));
  }
  $('resume').hidden=false;
  throw Error('Still pending. The submitted hash is saved in transaction activity. Check its status; do not submit this transaction again.');
}
async function write(method,args){
  const outstanding=transactions.find(t=>!t.committed&&!t.failed);
  if(outstanding)throw Error('A transaction is unresolved. Check pending transaction '+outstanding.hash+' before sending another.');
  message('Submitting '+method+'…');
  const h=await client.writeContract({address:deployment.contract,functionName:method,args,value:0n});
  const entry={hash:h,method,status:'PENDING',account:account.address,time:new Date().toISOString()};transactions.unshift(entry);saveTx();
  const a=document.createElement('a');a.href=txUrl(h);a.target='_blank';a.rel='noopener';a.textContent=h;$('progress').append(a);
  return waitTx(entry);
}
function formSpec(){
 const d=JSON.parse($('dataset').value),op=$('operation').value,c=$('chartKind').value==='bar';
 const spec={claim:$('claim').value,operation:op,period:$('period').value,baseline:op==='GROWTH'?$('baseline').value:'',category:op==='SHARE'?$('category').value:'',reported_milli:milli($('reported').value),chart:{kind:c?'bar':'none',axis_min:c?Number($('axisMin').value):0,axis_max:c?Number($('axisMax').value):0,unit:$('chartUnit').value||d.unit,caption:c?$('caption').value:''}};
 if(!spec.claim.trim())throw Error('Enter the published claim.');
 if(op==='GROWTH'&&spec.period===spec.baseline)throw Error('Choose distinct target and baseline periods.');
 return spec;
}
async function localCase(did,spec){const policy=await read('get_policy');return hash(canonical({version:'MetricProof/1',dataset_id:did,spec,submitter:account.address,contract:deployment.contract,chain_id:deployment.chainId,policy_hash:await hash(canonical(policy))}));}
async function exists(name,id){try{return await read(name,[id]);}catch(e){if(/Unknown (dataset|claim)/i.test(e.message))return null;throw e;}}
$('run').onclick=async()=>{
 if(!account){$('walletDialog').showModal();return;}
 if(busy)return;
 setBusy(true);$('progress').replaceChildren();$('resume').hidden=true;
 try{
  await checkConnection();const raw=$('dataset').value,did=await hash(raw),spec=formSpec();
  const registered=await exists('get_dataset',did);
  if(!registered)await write('register_dataset',[raw,$('sourceUrl').value.trim()]);
  else message('Dataset already locked; reusing '+did.slice(0,12)+'…');
  const cid=await localCase(did,spec);let c=await exists('get_case',cid);
  if(!c){await write('submit_claim',[did,JSON.stringify(spec)]);c=await read('get_case',[cid]);}
  if(['PENDING','INCONCLUSIVE'].includes(c.status)&&c.attempts<3){await write('verify',[cid]);}
  await showCase(cid);message('Receipt loaded from deployed contract.','success');
 }catch(e){message(e.message,'error');$('statusPill').textContent='CHECK REQUIRED';}finally{setBusy(false);}
};
async function showCase(cid){
 const c=await read('get_case',[cid]);lastCase={id:cid,...c};lastReceipt=c.attempts?await read('get_receipt',[cid,c.attempts]):null;
 $('statusPill').className='pill '+c.status.toLowerCase();$('statusPill').textContent=c.status;
 const r=lastReceipt?.receipt.result,calc=r?.calculation;
 const valid=lastReceipt?await hash(canonical(lastReceipt.receipt))===lastReceipt.sha256:null;
 let html='<div class="notice">'+escape(c.spec.claim)+'</div>';
 if(calc){html+='<div class="eyebrow">RECALCULATED RESULT</div><div class="calculation">'+escape(formatFraction(calc.numerator,calc.denominator))+' <small>'+escape(calc.unit)+'</small></div><p>Published: '+escape(formatFraction(c.spec.reported_milli,1000))+' '+escape(calc.unit)+'</p><div class="receiptrow"><span>Exact fraction</span><b>'+escape(calc.numerator)+' / '+escape(calc.denominator)+'</b></div><div class="receiptrow"><span>Target / baseline totals</span><b>'+escape(calc.current_total)+' / '+escape(calc.baseline_total)+'</b></div><div class="receiptrow"><span>AI meaning / framing</span><b>'+escape(r.semantic.meaning)+' / '+escape(r.semantic.framing)+'</b></div><div class="notice">Grounded excerpt: “'+escape(r.semantic.quote)+'”</div>';if(calc.chart_flags.length)html+='<p class="error">'+calc.chart_flags.map(escape).join(' · ')+'</p>';}
 if(r?.error)html+='<div class="notice error">'+escape(r.error)+'</div>';
 html+='<div class="receiptrow"><span>Claim ID</span></div><div class="hash">'+escape(cid)+'</div><div class="receiptrow"><span>Dataset SHA-256</span></div><div class="hash">'+escape(c.dataset_id)+'</div>';
 if(lastReceipt)html+='<div class="receiptrow"><span>Receipt hash</span><b class="'+(valid?'success':'error')+'">'+(valid?'✓ Recomputed locally':'HASH MISMATCH')+'</b></div><div class="hash">'+escape(lastReceipt.sha256)+'</div><button id="downloadReceipt" class="primary wide">Download verification receipt ↓</button>';
 if(['PENDING','INCONCLUSIVE'].includes(c.status)&&c.attempts<3)html+='<button id="retryReview" class="outline wide">'+(c.status==='PENDING'?'Verify this claim':'Retry inconclusive review')+' · attempt '+(c.attempts+1)+' / 3</button>';
 $('result').innerHTML=html;
 if($('downloadReceipt'))$('downloadReceipt').onclick=downloadReceipt;
 if($('retryReview'))$('retryReview').onclick=async()=>{if(!account){$('walletDialog').showModal();return;}setBusy(true);try{await write('verify',[cid]);await showCase(cid);}catch(e){message(e.message,'error');}finally{setBusy(false);}};
}
function formatFraction(a,b){const n=BigInt(a),d=BigInt(b),neg=n<0n,v=neg?-n:n,rounded=(v*1000n+d/2n)/d;return (neg?'-':'')+(rounded/1000n).toString()+'.'+(rounded%1000n).toString().padStart(3,'0');}
async function downloadReceipt(){try{const d=await read('get_dataset',[lastCase.dataset_id]);const receipt={network:deployment,claim:lastCase,dataset:d,verification:lastReceipt,transactions:transactions.filter(t=>t.account?.toLowerCase()===lastCase.submitter.toLowerCase()),note:'Read from accepted contract state; check transaction finality independently. Dataset bytes do not prove issuer identity or real-world truth.'};download('MetricProof-'+lastCase.id.slice(0,12)+'.json',JSON.stringify(receipt,null,2));}catch(e){message(e.message,'error');}}
function download(name,body){const url=URL.createObjectURL(new Blob([body],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderTx(){const el=$('txList');el.replaceChildren();if(!transactions.length){el.textContent='No transactions in this browser session yet.';return;}for(const t of transactions){const div=document.createElement('article');div.className='txitem';div.innerHTML='<b>'+escape(t.method)+'</b> <span class="pill '+(t.failed?'failed':'')+'">'+escape(t.status)+'</span><small> '+escape(t.time||'')+'</small><a href="'+escape(txUrl(t.hash))+'" target="_blank" rel="noopener">'+escape(t.hash)+' ↗</a>';el.append(div);}}
async function refreshTransactions(){for(const entry of transactions){try{Object.assign(entry,txState(await client.getTransaction({hash:entry.hash})));}catch(e){message(e.message,'error');}}saveTx();$('resume').hidden=!transactions.some(t=>!t.committed&&!t.failed);}
$('refreshTx').onclick=refreshTransactions;
$('resumeButton').onclick=async()=>{await refreshTransactions();message('Transaction states refreshed. If accepted, open the claim in the registry or resume using the same account and unchanged form.');};
async function loadCases(reset=false){try{if(reset){offset=0;$('caseList').replaceChildren();}const list=await read('list_cases',[offset]);for(const cid of list.ids){const c=await read('get_case',[cid]);const article=document.createElement('article');article.innerHTML='<span class="pill '+escape(c.status.toLowerCase())+'">'+escape(c.status)+'</span><h3>'+escape(c.spec.claim)+'</h3><div class="hash">'+escape(cid)+'</div><button class="outline">View receipt ↗</button>';
 article.querySelector('button').onclick=async()=>{try{await showCase(cid);route('verify');$('result').scrollIntoView({behavior:'smooth',block:'center'});}catch(e){message(e.message,'error');}};$('caseList').append(article);}offset+=list.ids.length;$('loadMore').hidden=offset>=list.total;if(!list.total)$('caseList').textContent='No claims registered yet.';}catch(e){$('caseList').textContent='Unable to read registry: '+e.message;}}
$('refresh').onclick=()=>loadCases(true);$('loadMore').onclick=()=>loadCases();$('lookup').onclick=async()=>{try{const cid=$('caseId').value.trim();if(!/^[a-f0-9]{64}$/.test(cid))throw Error('Enter a 64-character lowercase claim ID.');await showCase(cid);route('verify');}catch(e){$('caseList').textContent=e.message;}};
async function prepareStudio(){try{
 const raw=$('dataset').value,did=await hash(raw),spec=formSpec();
 const calls={network:deployment,steps:[{method:'register_dataset',args:[raw,$('sourceUrl').value.trim()],note:'Skip if dataset already registered.'},{method:'submit_claim',args:[did,JSON.stringify(spec)],note:'Execute with the Studio built-in account. Copy the returned claim ID.'},{method:'verify',args:['PASTE_RETURNED_CLAIM_ID'],note:'Use the same Studio account that submitted the claim.'}],dataset_id:did};
 $('studioCalls').hidden=false;$('studioCalls').innerHTML='<div class="notice"><b>Studio signing handoff</b><p>Open Studio → import deployed contract <span class="hash">'+escape(deployment.contract)+'</span> → execute these three methods with your built-in account. Return here and look up the returned claim ID in the registry.</p><a href="https://studio.genlayer.com/run-debug" target="_blank" rel="noopener">Open Studio ↗</a><pre id="callsText" style="max-height:200px;overflow:auto;white-space:pre-wrap;font-size:9px"></pre><button id="callsDownload" class="outline">Download exact arguments ↓</button></div>';$('callsText').textContent=JSON.stringify(calls,null,2);$('callsDownload').onclick=()=>download('MetricProof-Studio-calls.json',JSON.stringify(calls,null,2));$('studioCalls').scrollIntoView({behavior:'smooth',block:'center'});
 }catch(e){message(e.message,'error');}}
$('studioPrepare').onclick=prepareStudio;
async function updateDataset(resetSelectors=false){const v=++summaryVersion;try{const raw=$('dataset').value,d=JSON.parse(raw);if(!Array.isArray(d.rows)||!d.rows.length)throw Error('Dataset rows required.');for(const r of d.rows)if(!Number.isSafeInteger(r.value)||r.value<0)throw Error('Row values must be nonnegative safe integers in this browser.');
 if(resetSelectors){const periods=[...new Set(d.rows.map(r=>r.period))],categories=[...new Set(d.rows.map(r=>r.category))];for(const id of ['period','baseline']){$(id).replaceChildren(...periods.map(p=>new Option(p,p)));}$('period').value=periods.at(-1);$('category').replaceChildren(...categories.map(p=>new Option(p,p)));$('chartUnit').value=d.unit;}
 const fingerprint=await hash(raw);if(v!==summaryVersion)return;$('datasetSummary').innerHTML='<b>▤ '+escape(d.title)+'</b>'+d.rows.length+' rows · '+new TextEncoder().encode(raw).length+' bytes · '+escape(d.unit)+'<br><code>SHA-256 '+fingerprint+'</code>';updatePreview();
 }catch(e){$('datasetSummary').textContent=e.message;}}
function updatePreview(){try{const d=JSON.parse($('dataset').value),s=formSpec(),rows=d.rows.filter(r=>r.period===s.period),sum=rows.reduce((n,r)=>n+BigInt(r.value),0n),base=d.rows.filter(r=>r.period===s.baseline).reduce((n,r)=>n+BigInt(r.value),0n);let n=sum,den=1n;if(s.operation==='GROWTH'){n=(sum-base)*100n;den=base;}if(s.operation==='AVERAGE')den=BigInt(rows.length);if(s.operation==='SHARE'){n=rows.filter(r=>r.category===s.category).reduce((a,r)=>a+BigInt(r.value),0n)*100n;den=sum;}$('preview').textContent=den===0n?'Local preview: undefined denominator. On-chain result will be inconclusive.':'Local arithmetic preview: '+formatFraction(n,den)+' '+(['GROWTH','SHARE'].includes(s.operation)?'%':d.unit)+' · not an on-chain verdict.';$('baseline').disabled=s.operation!=='GROWTH';$('categoryWrap').hidden=s.operation!=='SHARE';$('valueUnit').textContent=['GROWTH','SHARE'].includes(s.operation)?'(%)':'('+d.unit+')';}catch(e){$('preview').textContent='Local preview: '+e.message;}}
function example(){const type=$('example').value;$('claim').value=type==='inconclusive'?'Performance improved by 18%.':'Revenue across all North and South divisions grew by '+(type==='incorrect'?'45':'18')+'% from calendar year 2024 to 2025.';$('reported').value=type==='incorrect'?'45':'18';$('operation').value='GROWTH';$('chartKind').value=type==='misleading'?'bar':'none';$('axisMin').value=type==='misleading'?'30000':'0';$('axisMax').value='80000';$('caption').value=type==='misleading'?'Revenue by division in calendar years 2024 and 2025.':'';$('chartDetails').open=type==='misleading';updatePreview();}
$('dataset').oninput=()=>updateDataset(true);$('datasetFile').onchange=async()=>{try{const f=$('datasetFile').files[0];if(!f)return;if(f.size>24000)throw Error('Dataset exceeds 24,000 UTF-8 bytes.');$('dataset').value=await f.text();$('sourceUrl').value='';await updateDataset(true);}catch(e){message(e.message,'error');}};
for(const id of ['operation','reported','period','baseline','category','chartKind','axisMin','axisMax','chartUnit','caption','claim'])$(id).addEventListener('input',updatePreview);
$('example').onchange=example;$('reset').onclick=async()=>{$('dataset').value=rawFixture;$('sourceUrl').value=sourceFixture;await updateDataset(true);example();};
$('dataset').value=rawFixture;$('sourceUrl').value=sourceFixture;await updateDataset(true);example();renderTx();
if(transactions.some(t=>!t.committed&&!t.failed))$('resume').hidden=false;
