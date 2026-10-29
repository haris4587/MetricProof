import {transactionsStatusNumberToName} from 'genlayer-js/types';
export function txState(tx){
  const status=tx.statusName||(typeof tx.status==='number'?transactionsStatusNumberToName[tx.status]:tx.status)||'PENDING';
  const receipt=tx.consensus_data?.leader_receipt?.[0];
  const execution=tx.txExecutionResultName||receipt?.execution_result;
  const failed=['CANCELED','UNDETERMINED','VALIDATORS_TIMEOUT','LEADER_TIMEOUT'].includes(status)||(['ACCEPTED','FINALIZED'].includes(status)&&execution&&execution!=='SUCCESS');
  return {status,failed,committed:['ACCEPTED','FINALIZED'].includes(status)&&execution==='SUCCESS',final:status==='FINALIZED',execution,error:receipt?.error||receipt?.result?.payload?.readable||''};
}
export function canonical(value){
  const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
  return JSON.stringify(stable(value)).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
}
export async function hash(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function milli(text){if(!/^-?\d{1,15}(\.\d{1,3})?$/.test(text))throw Error('Use a number with up to 3 decimal places.');const negative=text.startsWith('-'),[a,b='']=text.replace('-','').split('.');const v=BigInt(a)*1000n+BigInt(b.padEnd(3,'0'));const n=negative?-v:v;if(n>BigInt(Number.MAX_SAFE_INTEGER)||n<BigInt(Number.MIN_SAFE_INTEGER))throw Error('Number exceeds browser safe integer range.');return Number(n);}
