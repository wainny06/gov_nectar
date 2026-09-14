import {sources,parseLinks} from './sources.js';
import {curatedNotices} from './curated-notices.js';
export async function refreshHwaseong(read){
 const source=sources.find(s=>s.id==='hwaseong'),biz=sources.find(s=>s.id==='bizinfo');
 const urls=[source.url,...[1,2,3].map(page=>{const u=new URL('https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do');u.search=new URLSearchParams({condition:'searchPblancNm',condition1:'AND',keyword:'화성',cpage:String(page),rows:'15',schEndAt:'N'});return u.href;})];
 const results=await Promise.allSettled(urls.map(async(url,i)=>parseLinks(await read(url),i===0?source:biz).filter(item=>i===0||/화성/.test(item.title)).map(item=>({...item,source:'hwaseong',verification:i===0?item.verification:'기업마당 보완 수집 · 상세 확인 필요'}))));
 const live=results.flatMap(r=>r.status==='fulfilled'?r.value:[]),direct=results[0].status==='fulfilled'?results[0].value.length:0;
 const map=new Map(live.map(r=>[r.id,r]));for(const r of curatedNotices.filter(r=>r.source==='hwaseong'))map.set(r.id,{...(map.get(r.id)||{}),...r});
 const status=live.length?(direct?'partial':'fallback'):'snapshot';
 return {source:'hwaseong',items:[...map.values()],checkedAt:new Date().toISOString(),status,message:`화성 포털 ${direct}건 · 기업마당 보완 ${live.length-direct}건 제목 수집. 별도로 2026-09-14 확인자료 3건 포함. ${status==='snapshot'?'실시간 공고 추출 실패: 기존 확인자료만 표시하며 최신 접수 상태는 미확인.':'목록 3페이지 범위의 일부 수집이며 전체 공고·실시간 예산을 보장하지 않습니다.'}`};
}
