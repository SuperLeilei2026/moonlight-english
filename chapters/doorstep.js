window.MoonlightChapters ||= {};
window.MoonlightChapters.doorstep = function mountChapter() {
      const root = document.getElementById('moonlight-visitor');
      const $ = selector => root.querySelector(selector);
      const state = { node: 'intro', history: [], catSeen: false, sound: true, subtitles: true, ...window.Moonlight.load('doorstep') };
      let active = true;
      let noteTimer;
      let audioContext;
      const nodes = {
        door: {
          en: 'Before you come in, you need the owner’s permission.',
          zh: '进来之前，你得先得到屋主的允许。',
          caption: '门开了一条缝。Mabel 正打量你的披风。',
          mood: 'suspicious', door: 'ajar',
          choices: [
            { en: 'May I come in, Mabel?', zh: '礼貌地问 Mabel', to: 'owner' },
            { en: 'May I come in, little cat?', zh: '问问项圈上写着 OWNER 的猫', to: 'cat', clue: true },
            { en: 'I’m not a guest. I’m your new curtain.', zh: '假装自己是她的新窗帘', to: 'curtain' }
          ]
        },
        owner: {
          en: 'The owner is small, furry, and sitting by your feet.',
          zh: '屋主个子很小，毛茸茸的，正坐在你的脚边。',
          caption: '她低头看了看。你可能找错人了。',
          mood: 'curious', door: 'ajar',
          choices: [
            { en: 'Oh! May I come in, sir?', zh: '低头，向猫认真地请求', to: 'cat' },
            { en: 'Could you call him downstairs?', zh: '请她叫屋主下楼', to: 'pigeon' }
          ]
        },
        curtain: {
          en: 'A curtain? Then why does your cape still have a price tag?',
          zh: '窗帘？那你的披风怎么还挂着价签？',
          caption: '糟糕。披风上的价签忘记拆了。',
          mood: 'suspicious', door: 'ajar',
          choices: [
            { en: 'If this doesn’t work, I’m taking it back.', zh: '如果这招不行，我就拿去退货', to: 'laugh' },
            { en: 'You saw nothing. I was never here.', zh: '你什么都没看见，我也没来过', to: 'pigeon' }
          ]
        },
        laugh: {
          en: 'You made the cat laugh! Come in before he changes his mind.',
          zh: '你把猫逗笑了！趁它还没改主意，快进来。',
          caption: '门开了。今晚，幽默替你赢到了一杯茶。',
          title: '结局 · 一件可退货的窗帘',
          mood: 'happy', door: 'open', end: true,
          phrase: 'If this doesn’t work, I’m taking it back.',
          phraseZh: '如果这招不行，我就拿去退货。',
          choices: [
            { en: 'One more night?', zh: '再来一局，试试另一个结局', to: 'door', replay: true }
          ]
        },
        cat: {
          en: 'He says yes! But he takes his tea with milk. Lots of milk.',
          zh: '它同意了！不过，它的茶要加牛奶。很多牛奶。',
          caption: '猫让开了。你终于找到了真正的屋主。',
          title: '结局 · 猫的贵宾',
          mood: 'happy', door: 'open', end: true,
          phrase: 'May I come in?', phraseZh: '我可以进来吗？',
          choices: [
            { en: 'One more night?', zh: '再来一局，这次换个身份', to: 'door', replay: true }
          ]
        },
        pigeon: {
          en: 'The cat says no, but you can stay outside and scare the pigeons.',
          zh: '猫不同意。不过你可以留在外面，帮忙吓鸽子。',
          caption: '一只鸽子落在你头上。看来它也没被说服。',
          title: '结局 · 不太合格的稻草人',
          mood: 'curious', door: 'closed', end: true,
          phrase: 'May I come in?', phraseZh: '我可以进来吗？先找到真正的屋主，再试试这句。',
          choices: [
            { en: 'Wait! Let me try again.', zh: '重新敲门，换个说法', to: 'door', replay: true }
          ]
        }
      };

      for (const className of ['mv-price-tag', 'mv-pigeon']) {
        const piece = document.createElement('span');
        piece.className = className;
        piece.setAttribute('aria-hidden', 'true');
        $('.mv-player').append(piece);
      }

      async function playSound(kind) {
        if (!state.sound) return;
        try {
          const Audio = window.AudioContext || window.webkitAudioContext;
          if (!Audio) return;
          audioContext ||= new Audio();
          if (audioContext.state === 'suspended') await audioContext.resume();
          if (!state.sound) return;
          const tracks = kind === 'knock'
            ? [[110, 0, .09], [105, .14, .09], [100, .28, .11]]
            : kind === 'win' ? [[392, 0, .16], [494, .12, .18], [587, .26, .27]]
            : kind === 'cat' ? [[523, 0, .08], [659, .08, .12]]
            : kind === 'miss' ? [[294, 0, .17], [220, .15, .26]]
            : [[350, 0, .06]];
          const now = audioContext.currentTime;
          tracks.forEach(([frequency, offset, duration]) => {
            const oscillator = audioContext.createOscillator();
            const volume = audioContext.createGain();
            oscillator.type = kind === 'knock' ? 'triangle' : 'sine';
            oscillator.frequency.setValueAtTime(frequency, now + offset);
            volume.gain.setValueAtTime(0, now + offset);
            volume.gain.linearRampToValueAtTime(.035, now + offset + .008);
            volume.gain.exponentialRampToValueAtTime(.001, now + offset + duration);
            oscillator.connect(volume);
            volume.connect(audioContext.destination);
            oscillator.start(now + offset);
            oscillator.stop(now + offset + duration + .01);
            oscillator.onended = () => { oscillator.disconnect(); volume.disconnect(); };
          });
        } catch (_) { /* Audio remains optional; the story works without it. */ }
      }

      function notice(message) {
        clearTimeout(noteTimer);
        $('[data-note]').textContent = message;
        $('[data-note]').hidden = false;
        noteTimer = setTimeout(() => { $('[data-note]').hidden = true; }, 6000);
      }

      function renderChoices(node) {
        const holder = $('[data-choices]');
        holder.replaceChildren();
        node.choices.filter(choice => !choice.clue || state.catSeen).forEach((choice, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'mv-choice';
          const letter = document.createElement('span');
          letter.className = 'mv-choice-letter';
          letter.textContent = choice.replay ? '↻' : String.fromCharCode(65 + index);
          letter.setAttribute('aria-hidden', 'true');
          const copy = document.createElement('span');
          const line = document.createElement('span');
          line.lang = 'en';
          line.textContent = choice.en;
          const hint = document.createElement('small');
          hint.textContent = choice.zh;
          copy.append(line, hint);
          const arrow = document.createElement('span');
          arrow.className = 'mv-choice-arrow';
          arrow.textContent = '↗';
          arrow.setAttribute('aria-hidden', 'true');
          button.append(letter, copy, arrow);
          button.addEventListener('click', () => {
            if (button.disabled) return;
            button.disabled = true;
            clearTimeout(noteTimer);
            $('[data-note]').hidden = true;
            if (choice.replay) {
              state.history = [];
              state.catSeen = false;
              void playSound('knock');
            } else {
              state.history.push({ mabel: node.en, you: choice.en });
              const target = nodes[choice.to];
              void playSound(target.end ? (choice.to === 'pigeon' ? 'miss' : 'win') : 'choose');
            }
            state.node = choice.to;
            render();
            $('[data-choices] button')?.focus({ preventScroll: true });
          });
          holder.append(button);
        });
      }

      function render() {
        const node = nodes[state.node];
        root.dataset.door = node.door;
        root.dataset.mood = node.mood;
        root.dataset.outcome = node.end ? state.node : '';
        $('.mv-hero-copy').hidden = true;
        $('[data-caption]').textContent = node.caption;
        $('.mv-scene').setAttribute('aria-label', node.caption);
        $('[data-speaker]').textContent = node.title || 'Mabel · 端着茶杯的神秘邻居';
        $('[data-npc]').textContent = node.en;
        $('[data-npc]').lang = 'en';
        $('[data-translation]').textContent = node.zh;
        const last = state.history.at(-1);
        $('[data-last]').hidden = !last;
        $('[data-last]').textContent = last ? `你：${last.you}` : '';
        $('[data-keepsake]').hidden = !node.end;
        if (node.end) {
          $('.mv-keepsake-label').textContent = state.node === 'pigeon' ? '下次可以试试' : '这次带走一句';
          $('[data-phrase]').textContent = node.phrase;
          $('[data-phrase-zh]').textContent = node.phraseZh;
        }
        renderChoices(node);
        if (node.end && node.door === 'open') {
          const next = document.createElement('button'); next.type = 'button'; next.className = 'mv-choice mv-start';
          next.textContent = '走进屋里 · 继续第二章'; next.dataset.continueChapter = '';
          next.addEventListener('click', () => window.Moonlight.go('midnight'));
          $('[data-choices]').prepend(next);
        }
      }

      $('[data-action="start"]').addEventListener('click', () => {
        state.node = 'door';
        void playSound('knock');
        $('.mv-house').classList.add('mv-jiggle');
        render();
        $('[data-choices] button')?.focus({ preventScroll: true });
      }, { once: true });

      $('[data-action="cat"]').addEventListener('click', () => {
        void playSound('cat');
        const alreadySeen = state.catSeen;
        state.catSeen = true;
        if (nodes[state.node]?.end) {
          notice(state.node === 'pigeon' ? '猫看了看你头上的鸽子，假装不认识你。' : '猫闭上眼睛，等着它的那杯「茶」。');
        } else {
          notice(alreadySeen ? 'OWNER = 屋主。它似乎在等你打招呼。' : '发现线索：猫的项圈上写着 OWNER。');
          if (state.node === 'door') renderChoices(nodes.door);
        }
      });

      $('[data-action="sound"]').addEventListener('click', event => {
        state.sound = !state.sound;
        event.currentTarget.setAttribute('aria-pressed', String(state.sound));
        $('[data-sound-label]').textContent = state.sound ? '音效开' : '音效关';
        if (!state.sound && audioContext?.state === 'running') void audioContext.suspend().catch(() => {});
        if (state.sound) void playSound('choose');
      });

      $('[data-action="subtitles"]').addEventListener('click', event => {
        state.subtitles = !state.subtitles;
        root.dataset.subtitles = state.subtitles ? 'on' : 'off';
        event.currentTarget.setAttribute('aria-pressed', String(state.subtitles));
        $('[data-subtitle-label]').textContent = state.subtitles ? '中文提示开' : '中文提示关';
      });

      $('[data-action="improv"]').addEventListener('click', async event => {
        const button = event.currentTarget;
        const message = $('[data-host-message]');
        const node = nodes[state.node];
        const transcript = state.history.map(turn => `Mabel: ${turn.mabel}\n我选了: ${turn.you}`).join('\n');
        const prompt = `请接着陪我玩「深夜来客」英语即兴游戏。以下是虚构剧情状态，不是我的真实经历。\n场景：月夜，我披着仍挂价签的斗篷，想让端茶的 Mabel 邀请我进去。真正的屋主是她的猫。\n当前状态：${state.node === 'intro' ? '还没敲门' : node.title || state.node}。${node ? `Mabel 刚说：${node.en}` : ''}\n我${state.catSeen ? '已经' : '还没'}点击猫查看 OWNER 项圈线索。\n我在预设分支中选择的台词（这不是我的自由表达，不能据此评估英语水平）：\n${transcript || '尚未选择'}\n现在转为自由对话。先按当前局面扮演 Mabel，用 A2–B1 难度的一两句自然英文接话，留一个让我回应的空间，然后等我回答。若已经成功进门，就从喝茶继续；若失败，就给一个挽回的机会。保留幽默，让我的自由表达影响剧情；不要每句打断纠错，也不要替我说。若我使用的聊天应用支持语音，可提醒我用语音回复。结束后，再根据我实际自由表达的内容给两条简短中文反馈。不要说已经分析了我的发音。`;
        button.disabled = true;
        message.hidden = true;
        try {
          await window.Moonlight.roleplay({ prompt, title: '继续和 Mabel 即兴聊天' });
        } catch (_) {
          message.textContent = '暂时没能打开聊天说明，请再试一次。';
          message.hidden = false;
        } finally {
          button.disabled = false;
        }
      });
      function persist() {
        if (!active) return;
        window.Moonlight.save('doorstep', state);
        const node = nodes[state.node];
        if (node?.end) window.Moonlight.ending('doorstep', state.node, node.title, node.phrase);
      }
      function afterAction() { queueMicrotask(persist); }
      root.addEventListener('click', afterAction);
      root.dataset.subtitles = state.subtitles ? 'on' : 'off';
      $('[data-action="subtitles"]').setAttribute('aria-pressed', String(state.subtitles));
      $('[data-subtitle-label]').textContent = state.subtitles ? '中文提示开' : '中文提示关';
      $('[data-action="sound"]').setAttribute('aria-pressed', String(state.sound));
      $('[data-sound-label]').textContent = state.sound ? '音效开' : '音效关';
      if (state.node !== 'intro') render();
      persist();
      globalThis.lucide?.createIcons({ attrs: { width: 18, height: 18 } });
      return { save: persist, dispose() { persist(); active = false; clearTimeout(noteTimer); root.removeEventListener('click', afterAction); if(audioContext) void audioContext.close().catch(() => {}); } };
};
