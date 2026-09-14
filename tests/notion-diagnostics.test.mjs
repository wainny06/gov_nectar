import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnose,createNotionRequest} from '../lib/notion-api.js';
import {sendNotion} from '../lib/notion-client.js';
import {fields,DATA_SOURCES} from '../lib/notion-records.js';
import handler from '../api/notion-sync.js';

const schema=kind=>({properties:Object.fromEntries(Object.entries({...fields[kind],동기화ID:'rich_text',최근동기화:'date',...(kind==='task'?{목표일:'date',상태:'select',지원사업:'relation'}:{})}).map(([name,type])=>[name,{type,...(type==='relation'?{relation:{data_source_id:DATA_SOURCES.program}}:{}),...(type==='select'?{select:{options:[{name:'할 일'},{name:'완료'}]}}:{})}]))});
test('diagnosis reads both schemas without any writes and catches missing fields/relations',async()=>{
 const calls=[];
 const request=async(path,body,method)=>{calls.push(path);assert.equal(method,'GET');assert.equal(body,undefined);return schema(path.endsWith(DATA_SOURCES.program)?'program':'task');};
 assert.equal((await diagnose(request)).ok,true);assert.equal(calls.length,2);
 await assert.rejects(diagnose(async()=>({properties:{}})),/동기화ID/);
 await assert.rejects(diagnose(async path=>{const s=schema(path.endsWith(DATA_SOURCES.program)?'program':'task');if(s.properties.지원사업)s.properties.지원사업.relation.data_source_id='wrong';return s;}),/관계 대상/);
});
test('upstream errors are actionable and never echo token or raw error payload',async()=>{
 for(const code of [400,401,403,404,429,503]){
  const request=createNotionRequest('private-token',async()=>new Response('private-token',{status:code,headers:{'Retry-After':'7'}}),async()=>{});
  await assert.rejects(request('/pages',{}),e=>e.code===`NOTION_${code}`&&!e.message.includes('private-token')&&(code!==429||e.retryAfter===7));
 }
 const request=createNotionRequest('private-token',async()=>{throw Error('private-token');});
 await assert.rejects(request('/pages',{}),e=>e.code==='NOTION_UNCERTAIN'&&!e.message.includes('private-token'));
});
test('client honors Retry-After with bounded retry, but never automatically retries uncertain writes',async()=>{
 let calls=0;const waits=[];
 const result=await sendNotion({},'key',{fetcher:async()=>++calls<3?new Response(JSON.stringify({code:'NOTION_429',retryAfter:4,error:'rate limit'}),{status:502}):new Response('{"ok":true}'),pause:async ms=>waits.push(ms)});
 assert.equal(result.ok,true);assert.deepEqual(waits,[4000,4000]);
 calls=0;
 await assert.rejects(sendNotion({},'key',{fetcher:async()=>{calls++;return new Response('{"error":"uncertain","code":"NOTION_UNCERTAIN"}',{status:502});}}),/uncertain/);assert.equal(calls,1);
 calls=0;
 await assert.rejects(sendNotion({},'key',{fetcher:async()=>{calls++;return new Response('{"error":"rate limit","code":"NOTION_429","retryAfter":1}',{status:502});},pause:async()=>{}}),/rate limit/);assert.equal(calls,4);
 await assert.rejects(sendNotion({},'key',{fetcher:async()=>new Response('<html>Gateway timeout</html>',{status:504})}),/배포 상태/);
});
test('diagnostic endpoint requires sync secret before making upstream requests',async()=>{
 const old={token:process.env.NOTION_TOKEN,secret:process.env.NOTION_SYNC_SECRET,fetch:globalThis.fetch};let calls=0;
 process.env.NOTION_TOKEN='private-token';process.env.NOTION_SYNC_SECRET='a'.repeat(24);
 globalThis.fetch=async()=>{calls++;throw Error('unexpected network');};
 try {const res={setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;return this;}};await handler({method:'POST',headers:{},body:{action:'diagnose'}},res);assert.equal(res.code,401);assert.equal(calls,0);}
 finally {globalThis.fetch=old.fetch;for(const [env,k] of [['NOTION_TOKEN','token'],['NOTION_SYNC_SECRET','secret']]){if(old[k]===undefined)delete process.env[env];else process.env[env]=old[k];}}
});
