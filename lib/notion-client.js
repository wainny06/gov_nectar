export async function sendNotion(body,key,{fetcher=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms)),onRetry=()=>{}}={}) {
 for(let attempt=0;attempt<4;attempt++) {
  let response;
  try {response=await fetcher('/api/notion-sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});}
  catch {throw Error('서버 응답을 확인하지 못했습니다. 네트워크 확인 후 잠시 뒤 수동으로 다시 실행하세요.');}
  let value;
  try {value=await response.json();} catch {throw Error(`서버 응답 오류 (${response.status}). 배포 상태를 확인하세요.`);}
  if(response.ok)return value;
  // Only a definite Notion rate-limit rejection is retried automatically.
  // Timeouts/5xx may have committed a create; leave those to manual reconciliation.
  if(value.code==='NOTION_429'&&attempt<3) {
   const seconds=Math.max(1,Number(value.retryAfter)||2);
   if(seconds>60)throw Error(`${value.error} ${seconds}초 후 버튼으로 다시 실행하세요.`);
   onRetry(seconds,attempt+1);await pause(seconds*1000);continue;
  }
  throw Error(value.error||`동기화 실패 (${response.status})`);
 }
}
