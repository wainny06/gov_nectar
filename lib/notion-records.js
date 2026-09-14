import * as prep from './planning-data.js';
import * as beauty from './beauty-data.js';
import {curatedNotices} from './curated-notices.js';
export const HUB='https://www.notion.so/3db690c9fd5181b5bafee3fd6459006f';
export const DATA_SOURCES={program:'8e166684-6970-42ba-b3b1-f5b59c55fb17',task:'33734f5a-9c38-410e-8bdc-13be64aa706d'};
export const STORAGE_KEYS=['beauty-support-desk-v1','beauty-support-planning-2027-v1','beauty-support-special-v1'];
export function records(states={}){
 const result=[];
 const addProgram=(key,p,label,s={})=>result.push({kind:'program',key,values:{사업명:p.title,워크스페이스:label,기관:p.agency||p.source||'',지원내용:p.support||'',지원조건:p.eligibility||p.conditions||'',공고기간:p.period||'',확정마감:s.deadline||p.deadline||'',원문:s.url||p.url||'',대시보드메모:s.note||p.note||p.caution||''}});
 const main=states[STORAGE_KEYS[0]];
 for(const p of main?.items||curatedNotices)addProgram('live:'+p.id,p,'현재 공고');
 for(const [index,base,label] of [[1,prep,'2027 준비'],[2,beauty,'인증·공모']]){
  const prefix=index===1?'prep:':'beauty:',saved=states[STORAGE_KEYS[index]]||{};
  for(const p of base.programs)addProgram(prefix+p.id,p,label,saved.programs?.[p.id]);
  const tasks=[...base.commonTasks.map(t=>({...t,id:'common-'+t.id})),...base.programs.flatMap(p=>p.tasks.map((title,i)=>({id:p.id+'-'+i,title,due:p.due,parent:prefix+p.id})))];
  for(const t of tasks){const s=saved.tasks?.[t.id]||{};result.push({kind:'task',key:prefix+t.id,parent:t.parent||'',values:{'할 일':t.title,워크스페이스:label,권장일:s.due||t.due||'',대시보드메모:s.note||'',대시보드담당자:s.owner||'',대시보드완료:s.done===true}});}
 }
 return result.sort((a,b)=>a.kind===b.kind?0:a.kind==='program'?-1:1);
}
export const fields={program:{사업명:'title',워크스페이스:'rich_text',기관:'rich_text',지원내용:'rich_text',지원조건:'rich_text',공고기간:'rich_text',확정마감:'date',원문:'url',대시보드메모:'rich_text'},task:{'할 일':'title',워크스페이스:'rich_text',권장일:'date',대시보드메모:'rich_text',대시보드담당자:'rich_text',대시보드완료:'checkbox'}};
export function validateRecord(r){
 if(!r||!fields[r.kind]||typeof r.key!=='string'||r.key.length>1800||! /^(live:|prep:|beauty:)/.test(r.key)||!r.values||typeof r.values!=='object')throw Error('잘못된 동기화 항목');
 for(const [k,type] of Object.entries(fields[r.kind])){const v=r.values[k];if(type==='checkbox'){if(typeof v!=='boolean')throw Error('완료 값 오류');continue;}if(typeof v!=='string'||v.length>(type==='title'?500:6000))throw Error('필드 값 오류');if(type==='date'&&v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v).toISOString().slice(0,10)!==v))throw Error('날짜 오류');if(type==='url'&&v&&!/^https?:\/\//.test(v))throw Error('URL 오류');}
 if(r.parent&&(typeof r.parent!=='string'||r.parent.length>1800||! /^(prep:|beauty:)/.test(r.parent)))throw Error('관계 오류');
 return r;
}
export function notionProperties(r,isNew=false,parentId){
 const text=v=>Array.from({length:Math.ceil(v.length/2000)},(_,i)=>({type:'text',text:{content:v.slice(i*2000,(i+1)*2000)}}));
 const out={'동기화ID':{rich_text:text(r.key)}};
 for(const [k,type] of Object.entries(fields[r.kind])){const v=r.values[k];out[k]=type==='date'?{date:v?{start:v}:null}:type==='url'?{url:v||null}:type==='checkbox'?{checkbox:v}:{[type]:text(v)};}
 if(isNew&&r.kind==='task'){out['목표일']={date:r.values.권장일?{start:r.values.권장일}:null};out['상태']={select:{name:r.values.대시보드완료?'완료':'할 일'}};}
 if(parentId)out['지원사업']={relation:[{id:parentId}]};
 return out;
}
