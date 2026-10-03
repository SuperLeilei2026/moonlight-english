import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const scope={};vm.runInNewContext(fs.readFileSync(new URL('../assets/storage.js',import.meta.url),'utf8'),scope);
const {create,key}=scope.MoonlightStore;
const plain=value=>JSON.parse(JSON.stringify(value));
const memory=()=>{const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('both chapters survive reload including clues, one-use gift and partial rhythm',()=>{
  const backend=memory(),first=create(backend);
  first.save('doorstep',{node:'cat',catSeen:true,sound:false,subtitles:false,history:[{mabel:'Hello.',you:'May I come in?',free:true}]});
  first.save('midnight',{started:true,room:'greenhouse',bag:['note','spoon'],held:null,offended:true,singer:true,booking:true,practiceText:'Why is your name on this?',beats:['tap','tap','pause'],view:'rhythm'});
  first.ending('doorstep','cat');first.ending('doorstep','cat');
  const reloaded=create(backend);
  assert.equal(reloaded.load('doorstep').catSeen,true);assert.equal(reloaded.load('doorstep').sound,false);
  assert.equal(reloaded.load('doorstep').history[0].free,true);
  assert.equal(reloaded.load('midnight').singer,true);assert.equal(reloaded.load('midnight').offended,true);
  assert.equal(reloaded.load('midnight').practiceText,'Why is your name on this?');
  assert.deepEqual(plain(reloaded.load('midnight').beats),['tap','tap','pause']);
  assert.equal(reloaded.get().lastChapter,'midnight');assert.equal(reloaded.get().endings.length,1);
});
test('blocked storage keeps playable session data and export',()=>{
  const backend={getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');}};
  const saved=create(backend);saved.save('doorstep',{node:'curtain'});
  assert.equal(saved.load('doorstep').node,'curtain');assert.equal(saved.status().persistent,false);
  const restored=create(memory());restored.import(plain(saved.get()));assert.equal(restored.load('doorstep').node,'curtain');
});
test('invalid import does not replace a good save; corrupt storage starts safely',()=>{
  const saved=create(memory());saved.save('doorstep',{node:'laugh'});
  assert.throws(()=>saved.import({version:9,chapters:{}}));assert.equal(saved.load('doorstep').node,'laugh');
  const backend=memory();backend.setItem(key,'{bad json');const corrupt=create(backend);
  assert.equal(corrupt.status().loadProblem,true);corrupt.save('doorstep',{node:'door'});assert.equal(corrupt.load('doorstep').node,'door');
});
test('backup normalization bounds data, rejects foreign items and preserves gift consumption',()=>{
  const saved=create(memory());
  saved.import({version:1,lastChapter:'unknown',chapters:{midnight:{started:true,room:'moon',bag:['biscuit','biscuit','secret-key'],held:'biscuit',kind:true,history:Array(150).fill('x'.repeat(1200)),view:'rhythm',beats:['tap','invalid','pause']}},endings:[{chapter:'doorstep',id:'made-up'},{chapter:'midnight',id:'club'}]});
  const state=saved.load('midnight');assert.equal(state.room,'parlor');assert.deepEqual(plain(state.bag),['note']);assert.equal(state.held,null);assert.equal(state.view,'room');assert.equal(state.history.length,120);assert.equal(state.history[0].length,1000);assert.equal(saved.get().endings.length,1);
});
test('snapshots do not mutate stored game state by reference',()=>{
  const saved=create(memory());saved.save('doorstep',{node:'owner',history:[{mabel:'Who?',you:'Hello'}]});
  const returned=saved.load('doorstep');returned.node='laugh';returned.history[0].you='changed';assert.equal(saved.load('doorstep').node,'owner');assert.equal(saved.load('doorstep').history[0].you,'Hello');
});
test('concert ending survives reload and is recorded only once',()=>{
  const backend=memory(),saved=create(backend);
  saved.save('midnight',{started:true,room:'greenhouse',ending:'concert',view:'ending'});
  saved.ending('midnight','concert');saved.ending('midnight','concert');
  const reloaded=create(backend);
  assert.equal(reloaded.load('midnight').ending,'concert');
  assert.equal(reloaded.load('midnight').view,'ending');
  assert.deepEqual(plain(reloaded.get().endings),[{chapter:'midnight',id:'concert'}]);
});
