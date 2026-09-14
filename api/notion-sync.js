import {createNotionRequest,diagnose} from '../lib/notion-api.js';
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
 let record;try{if(req.body?.action==='diagnose'){return res.status(200).json(await diagnose(createNotionRequest(token)));}if(JSON.stringify(req.body).length>60000)throw Error();record=validateRecord(req.body);}catch(e){return res.status(e.code?502:400).json({error:e.code?e.message:'전송 데이터 형식을 확인해 주세요.',code:e.code,retryAfter:e.retryAfter});}
 const request=createNotionRequest(token);
 try{return res.status(200).json(await syncRecord(record,request));}catch(e){return res.status(502).json({error:e.message,code:e.code,retryAfter:e.retryAfter});}
}
