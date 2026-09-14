import {mkdir,rm,copyFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'dist');
const files=['lib/notion-client.js','notion-sync.js','lib/notion-records.js','index.html','app.js','style.css','lib/sources.js','lib/curated-notices.js','lib/keyword-filter.js','planning.html','planning.js','planning.css','lib/planning-data.js','beauty.html','lib/beauty-data.js'];
for(const file of files)await access(path.join(root,file));
await rm(output,{recursive:true,force:true});
for(const file of files){await mkdir(path.dirname(path.join(output,file)),{recursive:true});await copyFile(path.join(root,file),path.join(output,file));}
console.log('Built static dashboard: dist. API remains a separate Vercel function.');
