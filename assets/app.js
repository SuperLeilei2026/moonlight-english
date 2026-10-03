(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const ids=['doorstep','midnight'];
  const endings={
    doorstep:{laugh:['一件可退货的窗帘','If this doesn’t work, I’m taking it back.'],cat:['猫的贵宾','May I come in?'],pigeon:['不太合格的稻草人','Wait! Let me try again.']},
    midnight:{guest:['找到屋主，也找到夜宵','Two taps. Then one.'],club:['午夜俱乐部的新成员','You planned this, didn’t you?'],concert:['披风伴唱团','That was a rehearsal. A very public rehearsal.'],pigeon:['抓到一个饼干贼','I’m sorry. I jumped to conclusions.']}
  };
  let storage=null;
  try { storage=window.localStorage; } catch { /* Private modes may deny storage. */ }
  const store=window.MoonlightStore.create(storage,()=>paintStatus());
  const practice=window.MoonlightPractice.create(storage,()=>paintStatus());
  const unregisterPracticeTools=window.MoonlightPractice.registerTools(practice);
  let practiceSpeech=null,practiceAudio=null,practiceTimer=null;
  let controller=null,current='doorstep';
  function iconRefresh(){globalThis.lucide?.createIcons({attrs:{width:18,height:18}});}
  function paintStatus(){
    const saved=store.get(),gameStatus=store.status(),practiceStatus=practice.status();
    const persistent=gameStatus.persistent&&practiceStatus.persistent,loadProblem=gameStatus.loadProblem||practiceStatus.loadProblem;
    $('#save-status').textContent=!persistent ? '有一部分暂存于本次会话 · 可导出备份' : loadProblem ? '旧存档未能完整读取 · 已建立可用存档' : '已自动存到此浏览器';
    $('#save-status').dataset.error=String(!persistent||loadProblem);
    for(const id of ids){
      const complete=saved.endings.some(item=>item.chapter===id&&(id==='doorstep'?['laugh','cat'].includes(item.id):['guest','club','concert'].includes(item.id)));
      const started=id==='doorstep' ? saved.chapters[id]?.node && saved.chapters[id].node!=='intro' : saved.chapters[id]?.started;
      $(`[data-chapter-status="${id}"]`).textContent=complete?'已走到结局 · 可以重玩':started?'有存档 · 接着玩':id==='doorstep'?'从敲门开始':'进屋之后的谜案';
    }
    paintPractice();
  }
  function paintPractice(){
    const button=$('#open-practice');if(!button)return;
    const due=practice.due(),next=practice.next();
    $('#practice-label').textContent=due?'今日挑战':next?'挑战已安排':'口语练习';
    $('#practice-badge').hidden=!due;
    clearTimeout(practiceTimer);practiceTimer=null;
    if(next&&!due){const wait=Date.parse(next.dueAt)-Date.now();if(wait>0)practiceTimer=setTimeout(paintPractice,Math.min(wait+100,2147483647));}
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
  function roleplay({prompt,title='把故事接着聊下去',description='复制下面的剧情，粘贴到你常用的 AI 聊天里。它包含你刚才的选择，角色就能从这里接话；对方支持语音的话，也可以直接开口。',fieldLabel='当前剧情',copyLabel='复制剧情'}){$('#roleplay-title').textContent=title;$('#roleplay-description').textContent=description;$('#roleplay-field-label').textContent=fieldLabel;$('#copy-roleplay-label').textContent=copyLabel;$('#roleplay-prompt').value=String(prompt);$('#copy-status').textContent='内容尚未发送给任何 AI 服务。';openDialog('#roleplay-dialog');}
  function playClip(path,button){
    practiceAudio?.pause();practiceAudio=new Audio(path);button.disabled=true;
    practiceAudio.addEventListener('ended',()=>{button.disabled=false;},{once:true});
    practiceAudio.addEventListener('error',()=>{button.disabled=false;button.textContent='语音没有加载成功';},{once:true});
    void practiceAudio.play().catch(()=>{button.disabled=false;});
  }
  function renderPractice(){
    practiceSpeech?.dispose();practiceSpeech=null;practiceAudio?.pause();
    const container=$('#practice-content');container.replaceChildren();
    const data=practice.get(),next=practice.next(),due=practice.due(),lastComplete=[...data.transfers].reverse().find(item=>item.status==='complete');
    if(!next&&lastComplete){
      $('#practice-title').textContent='这次迁移，你已经完成了';
      const box=document.createElement('div');box.className='practice-due';
      const title=document.createElement('strong');title.textContent=lastComplete.attemptCount>1?`你用了 ${lastComplete.attemptCount} 次，把证据问清楚了`:'你第一次就把证据问清楚了';
      const quote=document.createElement('blockquote');quote.lang='en';quote.textContent=lastComplete.submittedText;
      const copy=document.createElement('p');copy.textContent='这句话已经留在“故事记录”里。后续版本会继续增加新的迁移情境。';
      const recordsButton=document.createElement('button');recordsButton.className='solid-button';recordsButton.type='button';recordsButton.textContent='查看我的记录';recordsButton.addEventListener('click',()=>{$('#practice-dialog').close();records();});
      box.append(title,quote,copy,recordsButton);container.append(box);return;
    }
    if(!next){
      $('#practice-title').textContent='今天，先开口一次';
      const box=document.createElement('div');box.className='practice-due';
      const title=document.createElement('strong');title.textContent='先在故事里留下自己的第一句话';
      const copy=document.createElement('p');copy.textContent='进入第二章，找到蓝丝带并出示给 Mabel。你会听到她的解释，然后可以直接开口追问。';
      const goButton=document.createElement('button');goButton.className='solid-button';goButton.type='button';goButton.textContent='去第二章找线索';goButton.addEventListener('click',()=>{$('#practice-dialog').close();go('midnight');});
      box.append(title,copy,goButton);container.append(box);return;
    }
    if(!due){
      $('#practice-title').textContent='明天，换个场景再说';
      const box=document.createElement('div');box.className='practice-due';
      const title=document.createElement('strong');title.textContent='Pip 明天会等你来对质';
      const date=document.createElement('p');date.textContent=`开放时间：${new Date(next.dueAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}`;
      const copy=document.createElement('p');copy.textContent='到时不会先显示旧答案。你需要把同一种“用证据追问”的能力带到新情境。';
      box.append(title,date,copy);container.append(box);return;
    }
    $('#practice-title').textContent='把昨天的话，带到新场景';
    container.innerHTML='<p class="practice-kicker">24 小时后的迁移挑战</p><p class="practice-line" lang="en">“I didn’t sing last night.”</p><p class="practice-zh">Pip 坚称它昨晚没有唱歌，但你听过温室里的披风之歌。</p><button class="practice-listen" type="button" data-transfer-audio><i data-lucide="volume-2" aria-hidden="true"></i>听 Pip 说</button><p class="practice-prompt">用听到的证据追问它。这里不会先显示昨天的句型。</p><label for="transfer-answer">你的英语</label><textarea id="transfer-answer" class="practice-answer" maxlength="500" placeholder="Say it your way…" spellcheck="true"></textarea><div class="practice-controls"><button class="practice-speech" type="button" data-transfer-speech aria-pressed="false"><i data-lucide="mic" aria-hidden="true"></i><span data-speech-label>用语音回答</span></button><button class="quiet-button" type="button" data-transfer-hint>给一点提示</button><button class="solid-button" type="button" data-transfer-submit>这样问</button></div><p class="practice-status" data-transfer-status role="status">语音识别由浏览器提供，结果会先显示在输入框中；也可以直接打字。</p><div data-transfer-feedback></div>';
    const field=$('#transfer-answer'),status=container.querySelector('[data-transfer-status]'),feedback=container.querySelector('[data-transfer-feedback]');let assistance=false;
    const listen=container.querySelector('[data-transfer-audio]');listen.addEventListener('click',()=>playClip('./assets/audio/pip-denial.mp3',listen));
    container.querySelector('[data-transfer-hint]').addEventListener('click',event=>{assistance=true;event.currentTarget.disabled=true;const hint=document.createElement('p');hint.className='practice-hidden-hint';hint.textContent='提醒：录音里是谁的声音？可以从 “But I can hear…” 或 “Then whose voice…” 开始。';feedback.replaceChildren(hint);});
    container.querySelector('[data-transfer-submit]').addEventListener('click',()=>{
      const submittedText=field.value.trim();if(!submittedText){status.textContent='先说或写一句英语，再提交。';status.dataset.state='error';return;}
      const intent=window.MoonlightPractice.classifyTransfer(submittedText);
      const progress=practice.noteTransferAttempt(next.id,{submittedText,intent,assistanceUsed:assistance});
      if(intent!=='evidence'){
        const card=document.createElement('div');card.className='practice-feedback';card.dataset.outcome=intent;
        card.textContent=intent==='information'?'你提到了录音，但还没有把它和 Pip 的否认放在同一个问题里。再追问一次。':'还没听出你在用昨晚的声音反驳 Pip。可以先指出你听见了它唱歌。';feedback.replaceChildren(card);field.focus();return;
      }
      practiceSpeech?.dispose();practiceSpeech=null;
      practice.completeTransfer(next.id,{submittedText,rawTranscript:field.dataset.rawTranscript||'',inputMode:field.dataset.inputMode==='voice'?'voice':'typed',edited:field.dataset.inputMode==='voice'&&field.dataset.rawTranscript!==submittedText,assistanceUsed:assistance,intent});
      const done=document.createElement('div');done.className='practice-success';
      const kicker=document.createElement('p');kicker.className='practice-kicker';kicker.textContent=assistance||progress.attemptCount>1?`完成迁移 · 尝试 ${progress.attemptCount} 次${assistance?' · 使用了提示':''}`:'完成迁移 · 第一次就问清楚了';
      const quote=document.createElement('p');quote.className='practice-line';quote.lang='en';quote.textContent='“That was a rehearsal. A very public rehearsal.”';
      const zh=document.createElement('p');zh.className='practice-zh';zh.textContent='“那是在彩排。一场非常公开的彩排。”';
      const replay=document.createElement('button');replay.type='button';replay.className='practice-listen';replay.textContent='听 Pip 狡辩';replay.addEventListener('click',()=>playClip('./assets/audio/pip-rehearsal.mp3',replay));
      const yours=document.createElement('p');yours.className='practice-feedback';yours.textContent=`你这次说：${submittedText}`;
      done.append(kicker,quote,zh,replay,yours);container.replaceChildren(done);paintPractice();window.dispatchEvent(new CustomEvent('moonlight-practice-update'));globalThis.lucide?.createIcons({attrs:{width:18,height:18}});
    });
    practiceSpeech=window.MoonlightPractice.bindSpeech({button:container.querySelector('[data-transfer-speech]'),field,status});
    globalThis.lucide?.createIcons({attrs:{width:18,height:18}});
  }
  window.Moonlight={load:id=>store.load(id),save:(id,snapshot)=>store.save(id,snapshot),ending:(id,name)=>store.ending(id,name),go,roleplay,practice};
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
    const practiceData=practice.get();
    if(practiceData.attempts.length){
      const heading=document.createElement('h3');heading.className='practice-section-title';heading.textContent='自己说过的话';container.append(heading);
      for(const attempt of practiceData.attempts.slice(-5).reverse()){
        const row=document.createElement('div');row.className='practice-attempt';
        const meta=document.createElement('small');meta.textContent=`${attempt.sceneId==='mabel-ribbon'?'质询 Mabel':'迁移挑战'} · ${attempt.inputMode==='voice'?'语音输入':'文字输入'}${attempt.hintLevel?' · 使用提示':''}`;
        const quote=document.createElement('blockquote');quote.lang='en';quote.textContent=attempt.submittedText;
        const feedback=document.createElement('p');feedback.textContent=attempt.coachFeedback||attempt.feedback;
        row.append(meta,quote,feedback);container.append(row);
      }
    }
    if(practiceData.transfers.length){
      const heading=document.createElement('h3');heading.className='practice-section-title';heading.textContent='迁移挑战';container.append(heading);
      for(const transfer of practiceData.transfers.slice(-3).reverse()){
        const row=document.createElement('div');row.className='practice-attempt';
        const meta=document.createElement('small');meta.textContent=transfer.status==='complete'?`Pip 的不在场证明 · ${transfer.attemptCount||1} 次尝试${transfer.assistanceUsed?' · 使用帮助':''}`:`将在 ${new Date(transfer.dueAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} 开放`;
        const quote=document.createElement('blockquote');quote.lang='en';quote.textContent=transfer.status==='complete'?transfer.submittedText:'同一种能力，换一个新证据再试。';
        row.append(meta,quote);container.append(row);
      }
    }
    $('#backup-status').textContent='备份包含两章进度、物品、结局和口语练习记录。';
    openDialog('#records-dialog');
  }
  document.querySelectorAll('[data-chapter]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.chapter)));
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.close).close()));
  $('#open-about').addEventListener('click',()=>openDialog('#about-dialog'));
  $('#open-practice').addEventListener('click',()=>{paintPractice();renderPractice();openDialog('#practice-dialog');});
  $('#open-records').addEventListener('click',records);
  $('#practice-dialog').addEventListener('close',()=>{practiceSpeech?.dispose();practiceSpeech=null;practiceAudio?.pause();});
  window.addEventListener('moonlight-practice-update',()=>{paintPractice();if($('#records-dialog').open)records();});
  $('#copy-roleplay').addEventListener('click',async()=>{
    const field=$('#roleplay-prompt');
    try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(field.value);$('#copy-status').textContent='已复制。粘贴到 AI 聊天里即可继续。';}
    catch{field.focus();field.select();$('#copy-status').textContent='文字已选中。请按 ⌘C / Ctrl+C，或长按复制。';}
  });
  $('#export-save').addEventListener('click',()=>{
    controller?.save();const backup={kind:'moonlight-english-backup',version:2,game:store.get(),practice:practice.get()};const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='moonlight-english-save.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#backup-status').textContent='已生成本机存档备份。';
  });
  $('#import-save').addEventListener('change',async event=>{
    const input=event.currentTarget,file=input.files?.[0];if(!file)return;
    try{
      if(file.size>1024*1024)throw new Error('存档文件太大，请选择本游戏导出的 JSON。');
      const parsed=JSON.parse(await file.text());const wrapper=parsed?.kind==='moonlight-english-backup'&&parsed.version===2;
      if(wrapper&&(!parsed.practice||parsed.practice.version!==1||!Array.isArray(parsed.practice.attempts)||!Array.isArray(parsed.practice.transfers)))throw new Error('这份备份的练习记录不完整，当前存档没有被替换。');
      const validated=window.MoonlightStore.sanitize(wrapper?parsed.game:parsed);const validatedPractice=wrapper?window.MoonlightPractice.sanitize(parsed.practice):null;
      const replacement=wrapper?'两章进度和练习记录':'两章进度（旧版备份不包含练习记录）';
      if(!window.confirm(`恢复这份备份会替换当前浏览器的${replacement}。继续吗？`))return;
      controller?.dispose();controller=null;
      const restored=store.import(validated);if(validatedPractice)practice.import(validatedPractice);go(restored.lastChapter);records();const fullySaved=store.status().persistent&&practice.status().persistent;$('#backup-status').textContent=fullySaved?'备份已恢复。':'备份已恢复到本次会话；其中一部分暂时无法永久保存。';
    }catch(error){$('#backup-status').textContent=error instanceof SyntaxError?'无法读取这份 JSON 存档。':error.message;}
    finally{input.value='';}
  });
  window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(ids.includes(id)&&id!==current)go(id);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')paintPractice();});
  window.addEventListener('pageshow',()=>paintStatus());
  window.addEventListener('pagehide',event=>{controller?.save();practiceSpeech?.dispose();practiceAudio?.pause();clearTimeout(practiceTimer);if(!event.persisted)unregisterPracticeTools();});
  const initial=location.hash.slice(1);
  go(ids.includes(initial)?initial:store.get().lastChapter);
})();
