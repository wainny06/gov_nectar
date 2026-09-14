import {DATA_SOURCES, fields} from './notion-records.js';

export class SyncError extends Error {
 constructor(message, code, retryAfter) { super(message); this.code=code; this.retryAfter=retryAfter; }
}

export function createNotionRequest(token, fetcher=fetch, pause=ms=>new Promise(r=>setTimeout(r,ms))) {
 return async (path, body, method='POST') => {
  let response;
  try {
   response=await fetcher('https://api.notion.com/v1'+path, {
    method, headers:{Authorization:`Bearer ${token}`,'Notion-Version':'2025-09-03','Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)}), signal:AbortSignal.timeout(6500)
   });
  } catch {
   throw new SyncError('Notion 응답을 확인하지 못했습니다. 생성 여부가 불확실하므로 잠시 후 버튼으로 다시 실행하세요.', 'NOTION_UNCERTAIN');
  }
  if (!response.ok) {
   const messages={401:'Notion 토큰이 유효하지 않습니다. Vercel의 NOTION_TOKEN을 확인하고 재배포하세요.',403:'Notion 연결 권한이 부족합니다. 콘텐츠 읽기·삽입·수정 권한을 확인하세요.',404:'Notion 데이터에 접근할 수 없습니다. 관리 페이지와 하위 두 데이터베이스의 연결 공유 및 ID를 확인하세요.',400:'Notion 필드 이름·유형 또는 전송 값이 맞지 않습니다. 연결 진단 후 입력값을 확인하세요.',429:'Notion 요청 한도에 도달했습니다.'};
   const retry=Number(response.headers.get('Retry-After'));
   throw new SyncError(messages[response.status]||`Notion 서버 오류 (${response.status}). 잠시 후 수동으로 다시 실행하세요.`, `NOTION_${response.status}`, response.status===429?(Number.isFinite(retry)&&retry>0?Math.ceil(retry):2):undefined);
  }
  await pause(350);
  try { return await response.json(); } catch { throw new SyncError('Notion 응답 형식을 확인하지 못했습니다. 잠시 후 수동으로 다시 실행하세요.', 'NOTION_UNCERTAIN'); }
 };
}

export async function diagnose(request) {
 const checks=[];
 for (const [kind,id] of Object.entries(DATA_SOURCES)) {
  const label=kind==='program'?'지원사업':'준비 할 일';
  const source=await request(`/data_sources/${id}`,undefined,'GET');
  const expected={...fields[kind],동기화ID:'rich_text',최근동기화:'date',...(kind==='task'?{목표일:'date',상태:'select',지원사업:'relation'}:{})};
  const issues=Object.entries(expected).filter(([name,type])=>source.properties?.[name]?.type!==type).map(([name,type])=>`${label}: ${name} (${type})`);
  if(kind==='task') {
   const relation=source.properties?.지원사업?.relation;
   if(relation?.data_source_id?.replaceAll('-','')!==DATA_SOURCES.program.replaceAll('-','')) issues.push('준비 할 일: 지원사업 관계 대상');
   const options=source.properties?.상태?.select?.options||[];
   if(!['할 일','완료'].every(name=>options.some(o=>o.name===name))) issues.push('준비 할 일: 상태 선택값 할 일/완료');
  }
  if(issues.length) throw new SyncError('데이터베이스 구조 확인 필요 · '+issues.join(', '),'SCHEMA_MISMATCH');
  checks.push(label+' 접근·필드 확인');
 }
 return {ok:true,checks,message:'두 데이터베이스 접근·필드 확인 완료. 삽입·수정 권한은 첫 동기화로 확인하세요.'};
}
