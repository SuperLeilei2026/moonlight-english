(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const ids=['doorstep','midnight'];
  const endings={
    doorstep:{laugh:['一件可退货的窗帘','If this doesn’t work, I’m taking it back.'],cat:['猫的贵宾','May I come in?'],pigeon:['不太合格的稻草人','Wait! Let me try again.']},
    midnight:{guest:['找到屋主，也找到夜宵','Two taps. Then one.'],club:['午夜俱乐部的新成员','You planned this, didn’t you?'],pigeon:['抓到一个饼干贼','I’m sorry. I jumped to conclusions.']}
  };
  let storage=null;
  try { storage=window.localStorage; } catch { /* Private modes may deny storage. */ }
  const store=window.MoonlightStore.create(storage,()=>paintStatus());
  let controller=null,current='doorstep';
  function iconRefresh(){globalThis.lucide?.createIcons({attrs:{width:18,height:18}});}
  function paintStatus(){
    const saved=store.get(),status=store.status();
    $('#save-status').textContent=!status.persistent ? '暂存于本次会话 · 可导出备份' : status.loadProblem ? '旧存档未能读取 · 已建立新存档' : '已自动存到此浏览器';
    $('#save-status').dataset.error=String(!status.persistent||status.loadProblem);
    for(const id of ids){
      const complete=saved.endings.some(item=>item.chapter===id&&(id==='doorstep'?['laugh','cat'].includes(item.id):['guest','club'].includes(item.id)));
      const started=id==='doorstep' ? saved.chapters[id]?.node && saved.chapters[id].node!=='intro' : saved.chapters[id]?.started;
      $(`[data-chapter-status="${id}"]`).textContent=complete?'已走到结局 · 可以重玩':started?'有存档 · 接着玩':id==='doorstep'?'从敲门开始':'进屋之后的谜案';
    }
  }
  function go(id){
    if(!ids.includes(id)) id='doorstep';
    controller?.dispose();controller=null;current=id;
    $('#play-area').innerHTML=window.MoonlightTemplates[id];
    for(const button of document.querySelectorAll('[data-chapter]'))button.setAttribute('aria-pressed',String(button.dataset.chapter===id));
    $('#chapter-caption').textContent=id==='doorstep'?'用一句话，改变今晚的故事。':'点物品找线索，选中物品再出示。';
    controller=window.MoonlightChapters[id]();
    try{history.replaceState(null,'','#'+id);}catch{/* File previews can restrict history. */}
    iconRefresh();paintStatus();
  }
  function openDialog(id){const dialog=$(id);if(!dialog.open)dialog.showModal();}
  function roleplay({prompt}){$('#roleplay-prompt').value=String(prompt);$('#copy-status').textContent='内容尚未发送给任何 AI 服务。';openDialog('#roleplay-dialog');}
  window.Moonlight={load:id=>store.load(id),save:(id,snapshot)=>store.save(id,snapshot),ending:(id,name)=>store.ending(id,name),go,roleplay};
  function records(){
    const container=$('#records-content');container.replaceChildren();
    const saved=store.get();
    if(!saved.endings.length){const empty=document.createElement('p');empty.className='record-empty';empty.textContent='先去敲敲门。遇见的结局和表达会留在这里。';container.append(empty);}
    else{
      const list=document.createElement('ul');list.className='record-list';
      for(const entry of saved.endings){
        const [title,phrase]=endings[entry.chapter][entry.id];const row=document.createElement('li');
        const label=document.createElement('small');label.textContent=entry.chapter==='doorstep'?'第一章 · 门外':'第二章 · 屋内';
        const name=document.createElement('b');name.textContent=title;
        const expression=document.createElement('p');expression.lang='en';expression.textContent=phrase;
        row.append(label,name,expression);list.append(row);
      }
      const note=document.createElement('p');note.className='dialog-status';note.textContent='这里记的是剧情经历和参考表达，不是英语水平评分。';container.append(list,note);
    }
    $('#backup-status').textContent='存档包含两章进度、物品和已遇见的结局。';
    openDialog('#records-dialog');
  }
  document.querySelectorAll('[data-chapter]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.chapter)));
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.close).close()));
  $('#open-about').addEventListener('click',()=>openDialog('#about-dialog'));
  $('#open-records').addEventListener('click',records);
  $('#copy-roleplay').addEventListener('click',async()=>{
    const field=$('#roleplay-prompt');
    try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(field.value);$('#copy-status').textContent='已复制。粘贴到 AI 聊天里即可继续。';}
    catch{field.focus();field.select();$('#copy-status').textContent='文字已选中。请按 ⌘C / Ctrl+C，或长按复制。';}
  });
  $('#export-save').addEventListener('click',()=>{
    controller?.save();const blob=new Blob([JSON.stringify(store.get(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='moonlight-english-save.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#backup-status').textContent='已生成本机存档备份。';
  });
  $('#import-save').addEventListener('change',async event=>{
    const input=event.currentTarget,file=input.files?.[0];if(!file)return;
    try{
      if(file.size>512*1024)throw new Error('存档文件太大，请选择本游戏导出的 JSON。');
      const validated=window.MoonlightStore.sanitize(JSON.parse(await file.text()));
      if(!window.confirm('恢复这份备份会替换当前浏览器的两章进度。继续吗？'))return;
      controller?.dispose();controller=null;
      const restored=store.import(validated);go(restored.lastChapter);records();$('#backup-status').textContent=store.status().persistent?'备份已恢复。':'备份已恢复到本次会话；浏览器暂时无法永久保存。';
    }catch(error){$('#backup-status').textContent=error instanceof SyntaxError?'无法读取这份 JSON 存档。':error.message;}
    finally{input.value='';}
  });
  window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(ids.includes(id)&&id!==current)go(id);});
  window.addEventListener('pagehide',()=>controller?.save());
  const initial=location.hash.slice(1);
  go(ids.includes(initial)?initial:store.get().lastChapter);
})();
