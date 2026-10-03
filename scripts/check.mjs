import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFile(path.join(root,file),'utf8');
const html=await read('index.html');
const base=new URL('https://example.github.io/moonlight-english/index.html');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  const file=match[1],url=new URL(file,base);
  assert.ok(file.startsWith('./'),'Entrypoint assets must be relative: '+file);
  assert.ok(url.pathname.startsWith('/moonlight-english/'),'GitHub Pages subpath escaped');
  await fs.access(path.join(root,file));
}
const files=['assets/storage.js','assets/practice.js','assets/app.js','assets/templates.js','chapters/doorstep.js','chapters/midnight.js'];
for(const file of files){const source=await read(file);new vm.Script(source,{filename:file});assert.doesNotMatch(source,/window\.openai|\bTweak\b|file:\/\/\/|\/Users\//,'Host-only or local-machine dependency: '+file);}
const sandbox={window:{}};vm.runInNewContext(await read('assets/templates.js'),sandbox);
for(const id of ['doorstep','midnight']){
  assert.equal(sandbox.window.MoonlightTemplates[id],await read('chapters/'+id+'.html'),'Generated template is stale; run npm run build');
  assert.doesNotMatch(sandbox.window.MoonlightTemplates[id],/<script\b/i,'Chapter HTML should not contain executable scripts');
}
assert.match(await read('.github/workflows/pages.yml'),/path: dist/,'Only the static build should be deployed');
for(const name of ['mabel-ribbon','mabel-confesses','mabel-small-print','mabel-not-kidnapper','mabel-clarifies','pip-denial','pip-rehearsal','reference-question']) await fs.access(path.join(root,'assets/audio',name+'.mp3'));
console.log('Passed: JavaScript syntax, local assets, GitHub Pages subpath, standalone dependencies, chapter template freshness.');
