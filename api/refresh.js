import {refreshHwaseong} from '../lib/hwaseong-refresh.js';
import {sources,parseLinks} from '../lib/sources.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST 요청만 지원합니다.'});
 let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return res.status(400).json({error:'올바른 JSON 요청이 필요합니다.'});}
 const source=sources.find(s=>s.id===body?.source);
 if(!source)return res.status(400).json({error:'지원하지 않는 기관입니다.'});
 if(source.id==='hwaseong')return res.status(200).json(await refreshHwaseong(async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'Accept':'text/html'}});if(!r.ok)throw Error('기관 응답 오류');const bytes=await r.arrayBuffer();if(bytes.byteLength>5e6)throw Error('응답 크기 초과');return new TextDecoder(/euc-kr/i.test(r.headers.get('content-type')||'')?'euc-kr':'utf-8').decode(bytes);}));
 try{
  const response=await fetch(source.url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'BeautySupportDesk/1.0 (public notice reader)','Accept':'text/html'}});
  if(!response.ok)throw new Error(`기관 응답 오류 (${response.status})`);
  const bytes=await response.arrayBuffer();if(bytes.byteLength>5e6)throw new Error('응답 크기 초과');
  const type=response.headers.get('content-type')||'';const html=new TextDecoder(/euc-kr/i.test(type)?'euc-kr':'utf-8').decode(bytes);
  const items=parseLinks(html,source);
  return res.status(200).json({source:source.id,items,checkedAt:new Date().toISOString(),status:items.length?'partial':'unavailable',message:items.length?`${items.length}건 제목·원문 링크 수집. 지원조건과 마감일은 원문 확인이 필요합니다.`:'공고를 추출하지 못했습니다. 동적 페이지 또는 기관별 연동 보완이 필요합니다.'});
 }catch(e){return res.status(200).json({source:source.id,items:[],checkedAt:new Date().toISOString(),status:'error',message:e.name==='TimeoutError'?'기관 응답 시간 초과. 잠시 후 다시 시도하세요.':e.message});}
}
