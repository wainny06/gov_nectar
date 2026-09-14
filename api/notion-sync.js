import {timingSafeEqual} from 'node:crypto';
import {DATA_SOURCES,validateRecord,notionProperties} from '../lib/notion-records.js';
export async function syncRecord(record,request){
 const query=async(kind,key)=>{const q=await request(`/data_sources/${DATA_SOURCES[kind]}/query`,{filter:{property:'동기화ID',rich_text:{equals:key}},page_size:2});if(q.results.length>1)throw Error('동일 ID가 여러 개 있습니다. Notion에서 중복을 정리해 주세요.');return q.results[0];};
 const existing=await query(record.kind,record.key);
 let parentId;
 if(record.parent){const parent=await query('program',record.parent);if(!parent)throw Error('연결할 지원사업이 없습니다. 전체 동기화를 다시 실행하세요.');parentId=parent.id;}
 const properties=notionProperties(record,!existing,parentId);
 properties['최근동기화']={date:{start:new Date().toISOString()}};
 await request(existing?`/pages/${existing.id}`:'/pages',existing?{properties}:{parent:{type:'data_source_id',data_source_id:DATA_SOURCES[record.kind]},properties},existing?'PATCH':'POST');
 return {ok:true,action:existing?'updated':'created'};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const token=process.env.NOTION_TOKEN,secret=process.env.NOTION_SYNC_SECRET;
 const configured=Boolean(token&&secret&&secret.length>=24);
 if(req.method==='GET')return res.status(200).json({configured});
 if(req.method!=='POST')return res.status(405).json({error:'POST만 지원합니다.'});
 if(!configured)return res.status(503).json({error:'Vercel에서 NOTION_TOKEN과 24자 이상의 NOTION_SYNC_SECRET 설정이 필요합니다.'});
 const supplied=String(req.headers.authorization||'').replace(/^Bearer /,'');
 if(Buffer.byteLength(supplied)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(secret)))return res.status(401).json({error:'동기화 키를 확인해 주세요.'});
 let record;try{if(JSON.stringify(req.body).length>60000)throw Error();record=validateRecord(req.body);}catch{return res.status(400).json({error:'전송 데이터 형식을 확인해 주세요.'});}
 const request=async(path,body,method='POST')=>{const response=await fetch('https://api.notion.com/v1'+path,{method,headers:{Authorization:`Bearer ${token}`,'Notion-Version':'2025-09-03','Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(6500)});if(!response.ok){const error=new Error(response.status===429?'Notion 요청 한도입니다. 잠시 후 다시 동기화하세요.':`Notion 연결 오류 (${response.status}). 연결 권한과 데이터베이스 설정을 확인해 주세요.`);throw error;}await new Promise(r=>setTimeout(r,350));return response.json();};
 try{return res.status(200).json(await syncRecord(record,request));}catch(e){return res.status(502).json({error:e.name==='TimeoutError'?'Notion 응답 시간이 초과되었습니다. 다시 시도해 주세요.':e.message});}
}
