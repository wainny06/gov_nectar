export function canonicalNoticeUrl(value){try{const u=new URL(value);if(['bizinfo.go.kr','www.bizinfo.go.kr'].includes(u.hostname)&&u.searchParams.get('pblancId'))return 'https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId='+encodeURIComponent(u.searchParams.get('pblancId'));return value;}catch{return value;}}
export const sources = [
 {id:'bizinfo',name:'기업마당',url:'https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do',pattern:'pblancId='},
 {id:'gcgf',name:'경기신용보증재단',url:'https://www.gcgf.or.kr/',pattern:'(?:bbs|board|view|View)'},
 {id:'hwaseong',name:'화성시 기업지원 플랫폼',url:'https://platform.hsbiz.or.kr/',pattern:'/business/detail/'},
 {id:'gobiz',name:'고비즈코리아',url:'https://kr.gobizkorea.com/',pattern:'supporteBsnsInfo.do'},
 {id:'kotra',name:'KOTRA 무역투자24',url:'https://www.kotra.or.kr/index.do',pattern:'(?:detail|Detail|View|view)'},
 {id:'fanfan',name:'판판대로',url:'https://fanfandaero.kr/portal/v2/preSprtBizPbancStage.do',pattern:'(?:View|view|Detail|detail)'},
 {id:'kstartup',name:'K-Startup',url:'https://www.k-startup.go.kr/',pattern:'(?:pbancSn|pbancId)'},
 {id:'wbiz',name:'여성기업종합정보포털',url:'https://www.wbiz.or.kr/',pattern:'(?:board|Board|view|View)'}
];
export const clean = s => String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g,m=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[m])).replace(/\s+/g,' ').trim();
export function category(title) {return /보증|금융|자금|이차보전|보험료|매출채권/.test(title)?'자금·보증':/바우처/.test(title)?'바우처':/수출|해외|물류|바이어/.test(title)?'수출·해외판로':/마케팅|광고|홍보/.test(title)?'마케팅':/판로|입점|판매|유통/.test(title)?'국내판로':'기타 지원';}
export function parseLinks(html, source) {
 const map=new Map(); const re=/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;
 for(const m of html.matchAll(re)) {
  const href=m[1].match(/href\s*=\s*["']([^"']+)["']/i)?.[1]; const title=clean(m[2]);
  if(!href||!new RegExp(source.pattern).test(href)||title.length<9||title.length>240||/채용|입찰|낙찰|개인정보/.test(title))continue;
  if(!/지원|모집|수출|바우처|마케팅|기업|보증|판로/.test(title))continue;
  let url;try{url=new URL(href.replace(/&amp;/g,'&'),source.url);if(!/^https?:$/.test(url.protocol)||url.hostname.replace(/^www\./,'')!==new URL(source.url).hostname.replace(/^www\./,''))continue;}catch{continue;}
  url=new URL(canonicalNoticeUrl(url.href));url.hash='';map.set(url.href,{id:url.href,title,url:url.href,source:source.id,category:category(title),support:'원문 확인 필요',conditions:'원문 확인 필요',deadline:'',deadlineTime:'',status:'미검토',note:'',checkedAt:new Date().toISOString(),verification:'제목 수집 · 상세 확인 필요'});
 }
 return [...map.values()].slice(0,60);
}
