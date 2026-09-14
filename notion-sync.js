import {sendNotion} from './lib/notion-client.js';
import {HUB,STORAGE_KEYS,records} from './lib/notion-records.js';
const panel=document.createElement('section');panel.className='panel';panel.style.cssText='margin:20px 0;padding:18px';
panel.innerHTML=`<h2>Notion 연동</h2><p><a href="${HUB}" target="_blank" rel="noopener">지원사업·할 일·타임라인 열기 ↗</a></p><p>공고 정보와 준비 권장일을 보냅니다. Notion의 담당자·상태·목표일·관리메모는 Notion에서 관리하며 유지됩니다. 삭제는 전파하지 않습니다.</p><label>동기화 키 <input type="password" id="notion-key" autocomplete="off" placeholder="NOTION_SYNC_SECRET 값"></label> <button type="button" id="notion-diagnose">연결 진단</button> <button type="button" id="notion-send">Notion 업데이트</button> <label><input type="checkbox" id="notion-auto"> 이 탭에서 저장 후 자동 업데이트</label><p id="notion-status" role="status" aria-live="polite">연결 설정 확인 중…</p>`;
(document.querySelector('main')||document.body).append(panel);
const status=panel.querySelector('#notion-status'),button=panel.querySelector('#notion-send'),auto=panel.querySelector('#notion-auto'),key=panel.querySelector('#notion-key');
const diagnoseButton=panel.querySelector('#notion-diagnose');
let busy=false,pending=false,timer;const sent=new Map();
const states=()=>Object.fromEntries(STORAGE_KEYS.map(k=>[k,JSON.parse(localStorage.getItem(k)||'null')]));
async function sync(){
 if(busy){pending=true;return;}if(!key.value){status.textContent='Vercel에 설정한 동기화 키를 입력해 주세요. Notion API 토큰은 입력하지 마세요.';return;}
 busy=true;button.disabled=true;diagnoseButton.disabled=true;
 try{
  const all=records(states()),changed=all.filter(r=>sent.get(r.key)!==JSON.stringify(r));let done=0;
  for(const r of changed){status.textContent=`Notion 업데이트 ${done}/${changed.length} · 창을 열어 두세요.`;await sendNotion(r,key.value,{onRetry:(seconds)=>{status.textContent=`요청 한도 · ${seconds}초 후 재시도 · 완료 ${done}/${changed.length}`;}});sent.set(r.key,JSON.stringify(r));done++;}
  status.textContent=`업데이트 완료 · ${done}건 · ${new Date().toLocaleTimeString('ko-KR')}`;
 }catch(e){pending=false;status.textContent=`${e.message} 완료된 항목은 유지되며 버튼을 눌러 이어서 시도할 수 있습니다.`;}
 finally{busy=false;button.disabled=false;diagnoseButton.disabled=false;if(pending){pending=false;schedule();}}
}
function schedule(){clearTimeout(timer);if(!auto.checked)return;timer=setTimeout(()=>{if(auto.checked)sync();},5000);}
diagnoseButton.addEventListener('click',async()=>{
 if(busy)return;
 if(!key.value){status.textContent='동기화 키를 입력한 뒤 연결 진단을 실행하세요.';return;}
 busy=true;button.disabled=true;diagnoseButton.disabled=true;status.textContent='Notion 접근·필드 구조 확인 중…';
 try{const value=await sendNotion({action:'diagnose'},key.value);status.textContent=value.message;}
 catch(e){status.textContent=e.message;}
 finally{busy=false;button.disabled=false;diagnoseButton.disabled=false;if(pending){pending=false;schedule();}}
});
button.addEventListener('click',()=>sync());auto.addEventListener('change',schedule);
window.addEventListener('dashboard-saved',schedule);window.addEventListener('storage',e=>{if(STORAGE_KEYS.includes(e.key))schedule();});
fetch('/api/notion-sync').then(r=>{if(!r.ok)throw Error();return r.json();}).then(r=>{status.textContent=r.configured?'환경변수 설정 있음 · 키 입력 후 연결 진단을 실행해 주세요. 실제 Notion 접근은 아직 확인되지 않았습니다.':'설정 대기 · Vercel에 NOTION_TOKEN, NOTION_SYNC_SECRET 등록 후 재배포가 필요합니다.';}).catch(()=>{status.textContent='연결 상태를 확인하지 못했습니다. 배포 상태를 확인해 주세요.';});
