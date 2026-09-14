import test from 'node:test';
import assert from 'node:assert/strict';
import {commonTasks,programs,followups} from '../lib/planning-data.js';
test('preparation records have distinct stable task IDs and evidence links',()=>{
 const ids=[...commonTasks.map(t=>'common-'+t.id),...programs.flatMap(p=>p.tasks.map((_,i)=>p.id+'-'+i))];
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(new Set(programs.map(p=>p.id)).size,programs.length);
 for(const p of programs){
  assert.ok(p.support&&p.eligibility&&p.period&&p.caution);
  assert.match(p.due,/^202[67]-\d{2}-\d{2}$/);
  assert.equal(new URL(p.url).protocol,'https:');
  assert.equal(p.recurrence.includes('반복 확인'),!!p.repeatUrl);
 }
 assert.ok(followups.every(f=>f.reason&&f.url));
});
