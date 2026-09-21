window.MoonlightChapters ||= {};
window.MoonlightChapters.midnight = function mountChapter() {
      const root = document.getElementById('midnight-missing-cat');
      const $ = selector => root.querySelector(selector);
      const $$ = selector => [...root.querySelectorAll(selector)];
      const state = {
        started: false, room: 'parlor', bag: new Set(), held: null,
        claim: false, truth: false, booking: false, offended: false,
        singer: false, kind: false, found: false, ending: '', heard: false,
        subtitles: true, sound: true, history: [], beats: [], current: '', currentZh: '', view: 'room'
      };
      const items = {
        note: { name: '纸条', icon: 'mail', en: '“Two taps. Then one.” A tiny leaf is drawn in the corner.', zh: '“敲两下，然后一下。”角落还画着一片小叶子。', shown: 'Show the note.' },
        ribbon: { name: '蓝丝带', icon: 'ribbon', en: 'MIDNIGHT TASTING · HOST: MABEL', zh: '午夜试吃会 · 主持人：Mabel。标签还缝在蓝丝带上。', shown: 'Show the ribbon.' },
        spoon: { name: '茶匙', icon: 'utensils', en: 'A silver spoon. A tiny instrument, perhaps?', zh: '一把银色茶匙。也许还是一件小乐器？', shown: 'Hold up the spoon.' },
        biscuit: { name: '饼干', icon: 'cookie', en: 'A fish-shaped biscuit. There is only one left.', zh: '一块鱼形饼干。罐子里只剩这一块了。', shown: 'Offer the biscuit.' }
      };
      const restored = window.Moonlight.load('midnight');
      Object.assign(state, restored);
      state.bag = new Set(restored.bag || []);
      let active = true;
      let restoring = Boolean(restored.started);
      const entry = window.Moonlight.load('doorstep');
      if (!Object.hasOwn(restored, 'sound') && typeof entry.sound === 'boolean') state.sound = entry.sound;
      if (!Object.hasOwn(restored, 'subtitles') && typeof entry.subtitles === 'boolean') state.subtitles = entry.subtitles;
      const places = { parlor: '客厅', kitchen: '厨房', greenhouse: '温室' };
      let audio;
      const soundButton = document.createElement('button');
      soundButton.type = 'button'; soundButton.className = 'mc-small';
      soundButton.textContent = state.sound ? '音效开' : '音效关'; soundButton.setAttribute('aria-pressed', String(state.sound));
      $('.mc-actions').prepend(soundButton);
      soundButton.addEventListener('click', () => {
        state.sound = !state.sound;
        soundButton.textContent = state.sound ? '音效开' : '音效关';
        soundButton.setAttribute('aria-pressed', String(state.sound));
        if (!state.sound && audio?.state === 'running') void audio.suspend().catch(() => {});
      });
      async function chime(frequency = 540) {
        if (!state.sound || restoring) return;
        try {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (!Audio) return;
          audio ||= new Audio();
          if (audio.state === 'suspended') await audio.resume();
          if (!state.sound) return;
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.type = 'sine'; oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(.035, audio.currentTime);
          gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .22);
          oscillator.connect(gain); gain.connect(audio.destination);
          oscillator.start(); oscillator.stop(audio.currentTime + .24);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        } catch (_) { /* The visual rhythm works even without sound. */ }
      }
      function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      }
      function log(text) { if (!restoring) state.history.push(text); }
      function selected(en) { $('[data-last]').textContent = `你：${en}`; $('[data-last]').hidden = false; log(`选择：${en}`); }
      function help(text) { $('[data-help]').textContent = text; $('[data-help]').hidden = !text; }
      function drawWorld() {
        root.dataset.room = state.room;
        root.dataset.holding = state.held ? 'yes' : 'no';
        root.dataset.ribbon = state.bag.has('ribbon') ? 'found' : '';
        root.dataset.mabel = state.truth ? 'honest' : '';
        root.dataset.found = state.found ? 'yes' : '';
        $$('[data-art]').forEach(art => { art.hidden = art.dataset.art !== state.room; });
        $$('[data-room-button]').forEach(button => {
          button.setAttribute('aria-pressed', String(button.dataset.roomButton === state.room));
          button.disabled = !state.started;
        });
        $('.mc-cat-found').hidden = !state.found;
        $('.mc-whisper').hidden = state.found;
        $('[data-stage]').setAttribute('aria-label', `可点击人物和物品的${places[state.room]}${state.found && state.room === 'greenhouse' ? '，猫已经现身' : ''}`);
        const note = $('[data-stage-note]');
        note.hidden = !state.held;
        note.textContent = state.held ? `拿着${items[state.held].name} · 点人物或物件出示` : '';
        const bag = $('[data-bag]');
        bag.replaceChildren(element('span', 'mc-bag-label', '口袋'));
        if (!state.bag.size) bag.append(element('span', 'mc-empty', '好像多了点什么……'));
        state.bag.forEach(key => {
          const item = items[key];
          const button = element('button', 'mc-item'); button.type = 'button';
          button.dataset.item = key;
          button.setAttribute('aria-pressed', String(state.held === key));
          const icon = element('i'); icon.dataset.lucide = item.icon; icon.setAttribute('aria-hidden', 'true');
          button.append(icon, element('span', '', item.name));
          button.addEventListener('click', () => {
            if (state.held === key) { state.held = null; drawWorld(); roomIntro(); return; }
            state.held = key; drawWorld();
            say(`手中物品 · ${item.name}`, item.en, item.zh, [choice('Put it away.', '先收起来', () => { state.held = null; drawWorld(); roomIntro(); })]);
          });
          bag.append(button);
        });
        globalThis.lucide?.createIcons({ attrs: { width: 16, height: 16 } });
      }
      function choice(en, zh, action, primary = false) { return { en, zh, action, primary }; }
      function say(speaker, en, zh, choices = []) {
        state.current = en; state.currentZh = zh; state.view = 'room';
        $('[data-speaker]').textContent = speaker;
        $('[data-line]').textContent = en;
        $('[data-zh]').textContent = zh;
        $('[data-recap]').hidden = true;
        help('');
        const holder = $('[data-choices]'); holder.replaceChildren();
        choices.forEach((option, index) => {
          const button = element('button', `mc-choice${option.primary ? ' mc-primary' : ''}`); button.type = 'button';
          button.dataset.say = option.en;
          const letter = element('span', 'mc-letter', String.fromCharCode(65 + index)); letter.setAttribute('aria-hidden', 'true');
          const copy = element('span');
          const line = element('span', '', option.en); line.lang = 'en';
          copy.append(line, element('small', '', option.zh));
          const arrow = element('span', '', '↗'); arrow.setAttribute('aria-hidden', 'true');
          button.append(letter, copy, arrow);
          button.addEventListener('click', async () => { if (button.disabled) return; button.disabled = true; selected(option.en); try { await option.action(); } finally { if (button.isConnected) button.disabled = false; } });
          holder.append(button);
        });
      }
      function acquire(key) {
        state.bag.add(key); state.held = null; log(`获得：${items[key].name}`); drawWorld();
        const item = items[key];
        say(`获得物品 · ${item.name}`, item.en, item.zh, [
          choice('Take a closer look.', '拿在手上，试着出示给人物或物件', () => { state.held = key; drawWorld(); say(`手中物品 · ${item.name}`, item.en, item.zh, [choice('Put it away.', '收回口袋', () => { state.held = null; drawWorld(); roomIntro(); })]); }),
          choice('Keep looking.', '收进口袋，继续调查', roomIntro)
        ]);
      }
      function begin() {
        state.started = true; log('灯灭后猫不见了，披风口袋里出现纸条。');
        if (entry.node === 'laugh') log('上一章：用可退货的窗帘笑话逗笑屋主，获得邀请。');
        if (entry.node === 'cat') log('上一章：向猫屋主礼貌请求，获得邀请。');
        acquire('note');
      }
      function roomIntro() {
        if (!state.started) return;
        if (state.room === 'parlor') {
          say('客厅 · 点物品查看，点人物交谈', state.truth ? 'Mabel is trying very hard not to smile.' : 'An empty chair. A nervous hostess. A suspicious cape.', state.truth ? 'Mabel 努力忍着笑。她的秘密已经被你发现了。' : '一张空椅子，一位紧张的女主人，还有你这件可疑的披风。', [choice('Mabel, what happened?', '先听听 Mabel 怎么说', talkMabel)]);
        } else if (state.room === 'kitchen') {
          say('厨房 · 鸽子看起来过于镇定', state.offended ? 'Pip turns his back on you. Slowly. Very slowly.' : 'A pigeon in a tiny hat is guarding the biscuit tin.', state.offended ? 'Pip 背过身去。慢慢地。非常慢地。它还记着刚才的指控。' : '一只戴小帽子的鸽子，正守着饼干罐。', [choice('Did you see the cat?', '问问唯一的目击者', talkPigeon)]);
        } else if (state.found) { talkCat(); }
        else {
          const opts = [choice('Is anyone in there?', '问问门后有没有人', gate)];
          if (state.truth) opts.push(choice('I’m here for the tasting.', 'Mabel 已经告诉你，这是试吃会', () => finish('guest'), true));
          say('温室 · 门里传来轻轻的碰杯声', 'The door is closed. Someone inside is humming badly.', '门关着。里面有人在哼歌，而且相当跑调。', opts);
        }
      }
      function changeRoom(room) {
        if (!state.started) return;
        state.room = room; drawWorld(); roomIntro(); log(`来到：${places[room]}`);
      }
      function talkMabel() {
        if (state.truth) {
          say('Mabel · 秘密保管失败', 'Fine. It’s a midnight tasting. Tell the doorman I sent you.', '好吧，是午夜试吃会。告诉门口那位，你是我叫来的。', [
            choice('And the blackout?', '那停电又是怎么回事？', () => say('Mabel', 'The cat wanted a dramatic entrance. He got the timing wrong.', '猫想来个隆重的登场。结果把时间弄错了。', [choice('Of course he did.', '这确实很像它会干的事', roomIntro)])),
            choice('I’ll try the greenhouse.', '去温室试试', () => changeRoom('greenhouse'), true)
          ]); return;
        }
        state.claim = true;
        say('Mabel · 回避你的目光', 'Nothing is happening in the greenhouse. Have more tea.', '温室里什么活动都没有。再喝点茶吧。', [
          choice('Why did you mention the greenhouse?', '我还没问温室呢？', () => say('Mabel · 端错了茶杯', 'Did I? I meant… the green cup. Lovely cup.', '我说了吗？我说的是……绿色杯子。多好看的杯子。', [choice('I’ll look around.', '先记住这句话，去找证据', roomIntro)])),
          choice('Let me look around.', '先看看房间里有什么', roomIntro)
        ]);
      }
      function confrontMabel() {
        state.held = null; drawWorld();
        say('Mabel · 看见你手里的丝带', 'A ribbon? Lots of people have ribbons.', '一条丝带而已，很多人都有丝带。', [
          choice('Then why is your name on this?', '那上面为什么写着你的名字？', () => {
            state.truth = true; log('出示带 Mabel 名字的试吃会丝带，Mabel 承认自己安排了活动。');
            drawWorld();
            say('Mabel · 被你问住了', 'I promised him a surprise snack. Please use the side door.', '我答应给它准备惊喜点心。请走侧门，报上我的名字。', [choice('Your secret is safe with me.', '我会替你保密', () => changeRoom('greenhouse'), true), choice('Who else knows?', '还有谁知道？', () => say('Mabel', 'Pip saw the guest list. He has been begging to sing all evening.', 'Pip 看过宾客名单。它一晚上都在求我们让它唱歌。', [choice('I should talk to Pip.', '去厨房问 Pip', () => changeRoom('kitchen'))]))]);
          }, true),
          choice('So you kidnapped the cat?', '所以是你绑架了猫？', () => say('Mabel · 挑起眉毛', 'My name proves I’m the host, not a kidnapper. Read it again.', '名字只能证明我是主持人，可不是绑架犯。再读一遍。', [choice('You’re right. Let me ask again.', '收回指控，重新问', confrontMabel)]))
        ]);
      }
      function booking() {
        state.booking = true; log('Pip 证实猫主动订了温室的桌位。');
        say('Pip · 差点说漏嘴', 'The cat booked a table, not a taxi. He went there on purpose.', '猫订的是桌位，可不是出租车。它是自己去的。', [
          choice('So nobody took him?', '所以没人把它带走？', () => say('Pip', 'Exactly. He even asked for the best chair. Typical.', '没错。它还特意要了最好的椅子。真是它的作风。', [choice('I’ll remember that.', '记下猫是主动赴约的', roomIntro)])),
          choice('Thanks. Keep your hat on.', '谢了，继续装作什么都不知道吧', roomIntro)
        ]);
      }
      function talkPigeon() {
        if (state.offended) {
          say('Pip · 背对你整理羽毛', 'Somebody called me a kidnapper. Somebody in a cheap cape.', '有人居然叫我绑架犯。某个披着廉价披风的人。', [
            choice('I’m sorry. I jumped to conclusions.', '对不起，我太快下结论了', () => { state.offended = false; log('向 Pip 道歉，恢复交谈。'); say('Pip · 转回来一点点', 'Apology accepted. The cape still needs work.', '接受道歉。但你的披风还是得改进一下。', [choice('Fair enough. What did you see?', '有道理。你看见了什么？', booking)]); }),
            choice('I’ll come back later.', '先去找点别的线索', roomIntro)
          ]); return;
        }
        say('Pip · 拍拍小帽子', state.singer ? 'My audience is waiting. Ask quickly.' : 'I saw everything. But I don’t gossip for free.', state.singer ? '我的观众还等着呢。有问题快问。' : '我什么都看见了。不过我可不免费八卦。', [
          choice('Was the cat alone?', '换个具体的问题：猫是自己走的吗？', booking),
          choice('You took the cat!', '指控 Pip 把猫带走了', () => finish('pigeon')),
          choice('What do you want?', '听听它想要什么', () => say('Pip · 立刻清了清嗓子', 'A biscuit. Or a chance to sing. Preferably both.', '一块饼干，或者一个唱歌的机会。最好两个都有。', [choice('Maybe later.', '先保留这个交易', roomIntro)]))
        ]);
      }
      function gate() {
        if (state.found) { talkCat(); return; }
        const opts = [choice('Just a very lost curtain.', '我只是一块迷路的窗帘', () => say('门后 · 沉默了两秒', 'The curtains’ meeting is on Tuesday. Try the invitation.', '窗帘的聚会在星期二。看看你的邀请函吧。', [choice('Let me check my pockets.', '检查口袋里的纸条', () => { state.held = 'note'; drawWorld(); say('纸条', items.note.en, items.note.zh, [choice('I need something to tap with.', '去找能敲响东西的小物件', () => changeRoom('kitchen'))]); })]))];
        if (state.truth) opts.unshift(choice('Mabel sent me.', '用刚问来的邀请进门', () => finish('guest'), true));
        say('温室门后 · 一道刻意压低的声音', 'Invitation, please. And no detectives.', '请出示邀请函。还有，不准侦探入内。', opts);
      }
      function rhythm(savedBeats = []) {
        state.held = null; state.beats = [...savedBeats]; drawWorld();
        say('用茶匙敲门铃 · 按纸条的节奏来', 'Two taps. Then one.', '敲两下，停一下，再敲一下。用下面的按钮试试。');
        state.view = 'rhythm';
        const holder = $('[data-choices]');
        const display = element('div', 'mc-beats', '…'); display.setAttribute('aria-live', 'polite'); display.dataset.beats = '';
        const controls = element('div', 'mc-knock-actions');
        function paint() { display.textContent = state.beats.length ? state.beats.map(beat => beat === 'tap' ? '●' : '／').join(' ') : '…'; }
        [['Tap', '敲一下', () => {
          if (state.beats.length >= 7) { help('门后传来咳嗽声：慢一点，重新试试。'); return; }
          state.beats.push('tap'); paint(); void chime(620);
          const bell = $('.mc-bell'); bell.classList.remove('mc-ting'); void bell.offsetWidth; bell.classList.add('mc-ting');
        }], ['Pause', '留一个停顿', () => { if (state.beats.length < 7) state.beats.push('pause'); paint(); }], ['Again', '清空重敲', () => { state.beats = []; paint(); help(''); }]].forEach(([en, zh, action]) => {
          const button = element('button'); button.type = 'button'; button.dataset.rhythm = en; button.append(element('span', '', en), element('small', '', zh)); button.addEventListener('click', action); controls.append(button);
        });
        const submit = element('button', 'mc-choice mc-primary'); submit.type = 'button'; submit.dataset.rhythm = 'Listen';
        submit.append(element('span', 'mc-letter', '→'), element('span', '', 'Wait for an answer.'), element('span', '', '↗'));
        submit.addEventListener('click', () => {
          if (state.beats.join(',') === 'tap,tap,pause,tap') { selected('Two taps. Then one.'); log('用茶匙敲出两下、停顿、一下，暗号成功。'); finish('guest'); }
          else { log('尝试敲门暗号，节奏未匹配。'); help('门后：“That sounds like the pizza delivery. Try again.”（像送披萨的暗号。再试试。）'); state.beats = []; paint(); void chime(240); }
        });
        holder.append(display, controls, submit); paint();
      }
      function talkCat() {
        const opts = [];
        if (state.booking) opts.push(choice('You planned this, didn’t you?', '你是自己计划好这一切的，对吧？', () => {
          if (state.kind) finish('club');
          else say('猫屋主 · 看了看你空着的手', 'A good detective. But did you bring anything to the party?', '是个好侦探。不过，你来参加聚会，有没有带点什么？', [choice('Let me check.', '检查物品栏，或去厨房看看', roomIntro)]);
        }, true));
        opts.push(choice('Why the secret?', '为什么搞得这么神秘？', () => say('猫屋主', 'Last time, the pigeons ate everything. This time, invitations only.', '上次鸽子把东西全吃光了。这次只认邀请函。', [choice('That explains a lot.', '难怪如此', roomIntro)])));
        opts.push(choice('I’ll look around a little more.', '还有点事没弄明白，继续调查', () => changeRoom('kitchen')));
        say('猫屋主 · 戴着正式的蓝领结', state.singer ? 'You invited Pip to sing? You may have to stay for the whole concert.' : 'You found the party. Now find me a better singer.', state.singer ? '你让 Pip 唱歌了？那你恐怕得把整场演出听完。' : '你找到派对了。现在，替我找个唱歌好听点的。', opts);
      }
      function finish(ending) {
        state.held = null; state.ending = ending;
        if (ending === 'pigeon') {
          state.offended = true; state.room = 'kitchen'; log('误判：指控 Pip 把猫带走；Pip 承认只偷了饼干，感到被冒犯。'); drawWorld();
          say('插曲 · 抓到一个饼干贼', 'I stole a biscuit. Very different.', '我是偷了一块饼干。这和绑架差得可远了。', [choice('Okay. That was unfair.', '收回指控，向它道歉', talkPigeon, true), choice('The case is still open.', '保留所有线索，继续调查', () => changeRoom('parlor'))]);
          help('一粒饼干屑从帽子里掉下来。破案失败，破获零食案。调查可以继续。'); state.view = 'ending'; window.Moonlight.ending('midnight', 'pigeon', '抓到一个饼干贼', 'I’m sorry. I jumped to conclusions.'); return;
        }
        state.found = true; state.room = 'greenhouse'; drawWorld(); void chime(784);
        if (ending === 'club') {
          log('隐藏结局：查明猫主动赴约，并把饼干留给猫，获邀加入午夜俱乐部。');
          say('隐藏结局 · 午夜俱乐部的新成员', 'You solved the mystery AND brought snacks. Welcome to the club.', '你既破了案，又带了零食。欢迎加入俱乐部。', [choice('One more mystery?', '带着今晚的经历，复制剧情去自由聊', improv, true), choice('What if I had chosen differently?', '重演这一夜，尝试另一条路线', restart)]);
        } else {
          log('找到猫：它正在温室参加自己安排的午夜试吃会。');
          say('结局 · 找到屋主，也找到夜宵', 'Surprise! You’re late. The milk is getting warm.', '惊喜！你迟到了。牛奶都快不凉了。', [choice('Wait. I still have questions.', '继续问，可能还有没发现的秘密', talkCat, true), choice('Let’s keep the story going.', '复制当前剧情，到 AI 对话里即兴演', improv), choice('What if I had chosen differently?', '重演这一夜，尝试另一条路线', restart)]);
        }
        const recap = $('[data-recap]'); recap.replaceChildren();
        recap.append(element('p', 'mc-recap-label', '今晚碰到的表达 · 可带去自由聊天'));
        const phrases = state.truth ? ['Then why is your name on this? → 用证据追问', 'You planned this, didn’t you? → 核实自己的推断'] : ['Two taps. Then one. → 听懂顺序', 'Did you see the cat? → 打听信息'];
        phrases.forEach(phrase => recap.append(element('p', '', phrase))); recap.hidden = false; state.view = 'ending';
        window.Moonlight.ending('midnight', ending, ending === 'club' ? '午夜俱乐部的新成员' : '找到屋主，也找到夜宵', ending === 'club' ? 'You planned this, didn’t you?' : 'Two taps. Then one.');
      }
      function restart() {
        Object.assign(state, { started: true, room: 'parlor', bag: new Set(), held: null, claim: false, truth: false, booking: false, offended: false, singer: false, kind: false, found: false, ending: '', heard: false, history: [], beats: [] });
        $('[data-last]').hidden = true;
        begin();
      }
      function useItem(target) {
        const key = state.held; if (!key) return false;
        selected(items[key].shown); log(`将${items[key].name}出示给：${target}`);
        if (key === 'ribbon' && target === 'mabel') { confrontMabel(); return true; }
        if (key === 'spoon' && ['bell', 'gate'].includes(target) && !state.found) { rhythm(); return true; }
        if (key === 'note' && target === 'mabel') {
          state.held = null; drawWorld();
          say('Mabel · 飞快看了一眼纸条', 'Looks like music. The kitchen has a fine silver instrument.', '像是乐谱。厨房有一件很不错的银色乐器。', [choice('A silver instrument?', '去厨房找找', () => changeRoom('kitchen'))]); return true;
        }
        if (key === 'note' && ['bell', 'gate'].includes(target)) {
          state.held = null; drawWorld();
          say('纸条背面 · 还有一行小字', 'A silver spoon makes the sweetest sound.', '银茶匙敲出来的声音最好听。', [choice('I should check the kitchen.', '去厨房找茶匙', () => changeRoom('kitchen'))]); return true;
        }
        if (key === 'ribbon' && target === 'pigeon') {
          state.held = null; drawWorld();
          if (state.offended) talkPigeon(); else booking(); return true;
        }
        if (key === 'biscuit' && target === 'pigeon') {
          state.held = null; drawWorld();
          say('Pip · 盯着鱼形饼干', 'For me? I’ll sing your praises. Literally.', '给我的？那我要歌颂你。真的用唱的。', [
            choice('All yours.', '把唯一的饼干送给 Pip', () => {
              state.bag.delete('biscuit'); state.singer = true; state.offended = false; log('把唯一的鱼形饼干给了 Pip；Pip 愿意帮忙，也决定唱歌。'); drawWorld();
              say('Pip · 开始了自信的演唱', 'Ooooh, a caaape in the niiight… Sorry. What was the question?', '噢——夜色中的披——风……抱歉，你刚才问什么？', [choice('Was the cat here?', '趁它心情好，问猫的去向', booking)]);
            }),
            choice('Actually, I’m saving it for someone.', '留给另一位重要客人', roomIntro)
          ]); return true;
        }
        if (key === 'biscuit' && (target === 'cat' || target === 'gate') && state.found) {
          state.bag.delete('biscuit'); state.kind = true; state.held = null; log('把鱼形饼干留给了猫屋主。'); drawWorld();
          if (state.booking) finish('club');
          else say('猫屋主 · 一秒变得客气', 'For me? You’re very welcome here. Now, how do you think I got here?', '给我的？非常欢迎你。现在你猜，我是怎么到这里来的？', [choice('I should ask the witness.', '去问真正看见事情经过的 Pip', () => changeRoom('kitchen')), choice('Enjoy your biscuit.', '先聊点别的', talkCat)]);
          return true;
        }
        if (key === 'biscuit' && target === 'mabel') {
          state.held = null; drawWorld();
          say('Mabel · 轻轻把饼干推回来', 'Save that for the guest of honor. He likes fish shapes.', '留给今晚的主角吧。它喜欢鱼的形状。', [choice('I think I know who that is.', '收好饼干', roomIntro)]); return true;
        }
        if (key === 'spoon' && target === 'pigeon') {
          state.held = null; drawWorld();
          say('Pip', 'An audition? Finally! But the bell has better timing than me.', '试音？终于！不过那只门铃比我的节奏感好。', [choice('I’ll try the bell.', '去温室试试门铃', () => changeRoom('greenhouse'))]); return true;
        }
        state.held = null; drawWorld();
        say('暂时没有新发现', target === 'mabel' ? 'Interesting. But what does that have to do with the cat?' : 'A creative idea. Nothing happens. Yet.', target === 'mabel' ? '有意思。不过，这和猫有什么关系？' : '挺有创意。暂时什么也没发生。物品已经收回口袋。', [choice('Let me try something else.', '换个对象或换件物品', roomIntro)]);
        return true;
      }
      function targetAction(target) {
        if (!state.started) { begin(); return; }
        if (state.held && useItem(target)) return;
        if (target === 'mabel') talkMabel();
        else if (target === 'pigeon') talkPigeon();
        else if (target === 'pocket') {
          say('披风口袋', 'Just a note. No tiny cat. No refund receipt, either.', '只有纸条，没有迷你猫。退货小票也不见了。', [choice('Read the note again.', '重读暗号', () => { state.held = 'note'; drawWorld(); say('纸条', items.note.en, items.note.zh, [choice('Keep looking.', '先收好', () => { state.held = null; drawWorld(); roomIntro(); })]); })]);
        } else if (target === 'chair') {
          if (!state.bag.has('ribbon')) acquire('ribbon');
          else say('空椅子', 'Still warm. Whoever left was in no hurry.', '椅子还是温的。离开的那位似乎并不着急。', [choice('Interesting.', '记下这点', roomIntro)]);
        } else if (target === 'spoon') {
          if (!state.bag.has('spoon')) acquire('spoon');
          else say('厨房台面', 'The spoon is already in your pocket.', '茶匙已经在你口袋里了。', [choice('Right. I knew that.', '当然，我知道', roomIntro)]);
        } else if (target === 'tin') {
          if (!state.bag.has('biscuit') && !state.singer && !state.kind) acquire('biscuit');
          else say('饼干罐', 'Only crumbs. Someone has excellent taste and terrible manners.', '只有碎屑。某位客人品味很好，吃相很差。', [choice('I have a suspect.', '我大概知道是谁', roomIntro)]);
        } else if (target === 'listen') {
          state.heard = true;
          say('温室里 · 有声音突然停住', 'Shh! The guest is outside. Hide the milk!', '嘘！客人在外面。把牛奶藏起来！', [choice('I heard that!', '我听见了！', () => say('门后 · 一本正经', 'You heard a plant. Very talkative plant.', '你听见的是一棵植物。一棵很健谈的植物。', [choice('Of course. A talking plant.', '是是是，一棵会说话的植物', gate)])), choice('Say nothing. Keep looking.', '假装没听见，继续找入口', roomIntro)]);
        } else if (target === 'bell') {
          say('没有铃舌的门铃', 'The bell is missing its clapper. You need something small and hard.', '门铃没有铃舌。需要一件小而硬的东西来敲它。', [choice('The kitchen might help.', '去厨房找找', () => changeRoom('kitchen'))]);
        } else if (target === 'gate') gate();
        else if (target === 'cat') talkCat();
      }
      async function improv() {
        const button = $('[data-action="improv"]'); button.disabled = true;
        const prompt = `请陪我继续「深夜来客·消失的屋主」英语即兴游戏。以下全是虚构剧情状态，不是我的真实经历，也不代表我的英语水平。\n场景：我穿着可退货的披风，进入 Mabel 家。灯灭后猫消失，幕后设定（不一定已被我发现）：猫在温室组织午夜试吃会；Mabel 负责准备，Pip 是爱唱歌的鸽子。不要一下说出我尚未发现的真相。\n当前在${places[state.room]}；已找到猫：${state.found}；已用丝带问出 Mabel 的秘密：${state.truth}；知道猫主动订桌：${state.booking}；Pip 因被冤枉仍生气：${state.offended}；已给 Pip 饼干：${state.singer}；已给猫饼干：${state.kind}。\n物品：${[...state.bag].map(key => items[key].name).join('、') || '无'}。\n最近发生的剧情与我在预设分支选择的台词（不能当作我的自由表达）：\n${state.history.slice(-18).join('\n')}\n角色最后说：${state.current}\n请从这里继续，扮演合适的角色，用 A2–B1 难度的一两句英文接话并留下让我自由回应的空间，然后等待我。让我的说法真实改变局面，保持荒诞而温暖的幽默。不要替我回答，不要每句打断纠错，不要自动总结。若我已加入俱乐部，给一个与这一夜相关的新小悬念。如果聊天应用支持语音，可提醒我用语音回复。游戏结束或我说暂停时，仅根据我的实际自由表达给两条中文反馈，不声称分析了发音。`;
        try { await window.Moonlight.roleplay({ prompt, title: '带着线索，继续即兴故事' }); }
        catch (_) { help('暂时没能打开聊天说明，请再试一次。'); }
        finally { button.disabled = false; }
      }
      $('[data-begin]').addEventListener('click', begin, { once: true });
      $$('[data-room-button]').forEach(button => button.addEventListener('click', () => changeRoom(button.dataset.roomButton)));
      $$('[data-target]').forEach(button => button.addEventListener('click', () => targetAction(button.dataset.target)));
      $('[data-action="subtitles"]').addEventListener('click', event => {
        state.subtitles = !state.subtitles; root.dataset.subtitles = state.subtitles ? 'on' : 'off';
        $('[data-sub-label]').textContent = state.subtitles ? '中文开' : '中文关';
        event.currentTarget.setAttribute('aria-pressed', String(state.subtitles));
      });
      $('[data-action="hint"]').addEventListener('click', () => {
        let hint;
        if (!state.started) hint = '先检查披风口袋。点画面中的物品也可以调查。';
        else if (state.found && state.kind && !state.booking) hint = '猫收了你的礼物。接下来去问 Pip：猫是被带走的，还是主动赴约？';
        else if (state.found && state.booking && state.kind) hint = '你已经查清来龙去脉。问猫：You planned this, didn’t you?';
        else if (state.found && !state.kind && !state.singer) hint = '宾客通常会带点吃的。厨房还有一位证人，知道猫是怎么来的。';
        else if (state.found && state.singer) hint = '你把唯一的饼干送给了 Pip，它会记得这份人情。这一局的礼物已经用掉了；可以通过「自由聊天」复制剧情，接着演派对上的故事。';
        else if (state.truth) hint = '你已经知道聚会的事。去温室敲门，报 Mabel 的名字就能进入。';
        else if (state.held === 'spoon') hint = '拿着茶匙，去温室点门铃。纸条上写的是两下、停顿、一下。';
        else if (state.bag.has('ribbon')) hint = '物品栏点蓝丝带，再点 Mabel。注意标签上的主持人名字。';
        else if (state.bag.has('spoon')) hint = '点物品栏的茶匙，再点温室门铃；或者回客厅看看猫的空椅子。';
        else hint = '可以自由换房间。看看猫的椅子，或到厨房找件能敲东西的小物件。';
        help(hint);
      });
      $('[data-action="improv"]').addEventListener('click', improv);
      drawWorld();
      function persist() {
        if (!active) return;
        window.Moonlight.save('midnight', { ...state, bag: [...state.bag] });
      }
      function afterAction() { queueMicrotask(persist); }
      root.addEventListener('click', afterAction);
      root.dataset.subtitles = state.subtitles ? 'on' : 'off';
      $('[data-action="subtitles"]').setAttribute('aria-pressed', String(state.subtitles));
      $('[data-sub-label]').textContent = state.subtitles ? '中文开' : '中文关';
      if (state.started) {
        const savedView = state.view; const savedBeats = [...state.beats];
        if (savedView === 'ending' && state.ending) finish(state.ending);
        else if (savedView === 'rhythm' && !state.found) rhythm(savedBeats);
        else roomIntro();
      } else if (entry.node === 'laugh') {
        $('[data-line]').textContent = 'The “curtain” is finally inside. The cat has other plans.';
        $('[data-zh]').textContent = '你这块“窗帘”终于进屋了。灯突然灭了；再亮时，猫不见了，口袋里多了点东西。';
      } else if (entry.node === 'cat') {
        $('[data-line]').textContent = 'The owner welcomed you. Then the owner disappeared.';
        $('[data-zh]').textContent = '猫屋主刚刚欢迎了你。灯突然灭了；再亮时，它不见了，口袋里多了点东西。';
      }
      if (!state.started && !['laugh', 'cat'].includes(entry.node)) {
        $('[data-line]').textContent = 'The lights come back on. The cat is gone.';
        $('[data-zh]').textContent = '直接试玩第二章：故事从你获邀进屋后开始。灯重新亮起，猫不见了，披风口袋里多了点东西。';
      }
      restoring = false;
      persist();
      globalThis.lucide?.createIcons({ attrs: { width: 18, height: 18 } });
      return { save: persist, dispose() { persist(); active = false; root.removeEventListener('click', afterAction); if(audio) void audio.close().catch(() => {}); } };
};
