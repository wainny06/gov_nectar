import test from 'node:test';
import assert from 'node:assert/strict';
import {programs,commonTasks} from '../lib/beauty-data.js';
test('workspace rendering, filtering and task persistence remain isolated',async()=>{
 const originals={document:globalThis.document,localStorage:globalThis.localStorage,alert:globalThis.alert};
 const saved=new Map();
 try{
  globalThis.localStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
  globalThis.alert=message=>{throw Error(message)};
  for(const beauty of [false,true]){
   const nodes=new Map();const listeners={};
   const el=()=>({value:'',textContent:'',innerHTML:'',hidden:false,addEventListener(type,fn){this[type]=fn},insertAdjacentHTML(_pos,html){this.innerHTML+=html}});
   globalThis.document={body:{dataset:{workspace:beauty?'beauty':''}},querySelector(selector){if(selector==='#region'&&!beauty)return null;if(!nodes.has(selector))nodes.set(selector,el());return nodes.get(selector)},querySelectorAll(){return []},addEventListener(type,fn){listeners[type]=fn}};
   await import('../planning.js?test='+beauty);
   assert.equal(nodes.get('#program-total').textContent,beauty?9:14);
   assert.match(nodes.get('#programs').innerHTML,beauty?/K-뷰티 크리에이터 챌린지/:/중소기업 혁신바우처/);
   if(beauty){nodes.get('#region').value='경기';nodes.get('#region').input();assert.equal(nodes.get('#count').textContent,'2개');}
   const id=beauty?'common-markets':'common-profile';
   listeners.input({target:{dataset:{field:'done'},checked:true,closest(){return {dataset:{task:id},classList:{toggle(){}}}}}});
   const key=beauty?'beauty-support-special-v1':'beauty-support-planning-2027-v1';
   assert.equal(JSON.parse(saved.get(key)).tasks[id].done,true);
   assert.match(nodes.get('#progress').textContent,beauty?/1 \/ 44/:/1 \/ 72/);
  }
  assert.equal(saved.size,2);
  assert.equal(new Set(programs.map(p=>p.id)).size,programs.length);
  assert.equal(commonTasks.length+programs.reduce((n,p)=>n+p.tasks.length,0),44);
 }finally{for(const [key,value]of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
