/* Device-local game saves. No network, accounts, or model credentials. */
(function (global) {
  'use strict';
  const KEY = 'moonlight-english:save:v1';
  const CHAPTERS = ['doorstep', 'midnight'];
  const ENDINGS = { doorstep: ['laugh', 'cat', 'pigeon'], midnight: ['guest', 'club', 'pigeon'] };
  const copy = value => JSON.parse(JSON.stringify(value));
  const text = (value, length = 1000) => typeof value === 'string' ? value.slice(0, length) : '';
  const oneOf = (value, choices, fallback) => choices.includes(value) ? value : fallback;
  function chapter(id, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    if (id === 'doorstep') return {
      node: oneOf(value.node, ['intro','door','owner','curtain','laugh','cat','pigeon'], 'intro'),
      catSeen: value.catSeen === true, sound: value.sound !== false, subtitles: value.subtitles !== false,
      history: Array.isArray(value.history) ? value.history.slice(-30).filter(item => item && typeof item === 'object').map(item => ({mabel:text(item.mabel),you:text(item.you)})) : []
    };
    const clean = {
      room: oneOf(value.room,['parlor','kitchen','greenhouse'],'parlor'),
      bag: Array.isArray(value.bag) ? [...new Set(value.bag.filter(item => ['note','ribbon','spoon','biscuit'].includes(item)))] : [],
      ending: oneOf(value.ending, ENDINGS.midnight, ''),
      view: oneOf(value.view,['room','rhythm','ending'],'room'),
      current: text(value.current), currentZh: text(value.currentZh),
      sound: value.sound !== false, subtitles: value.subtitles !== false,
      beats: Array.isArray(value.beats) ? value.beats.filter(beat => ['tap','pause'].includes(beat)).slice(0,7) : [],
      history: Array.isArray(value.history) ? value.history.filter(item => typeof item === 'string').slice(-120).map(item => text(item)) : []
    };
    for (const key of ['started','claim','truth','booking','offended','singer','kind','found','heard']) clean[key] = value[key] === true;
    clean.held = clean.bag.includes(value.held) ? value.held : null;
    if (clean.kind || clean.singer) clean.bag = clean.bag.filter(item => item !== 'biscuit');
    if (!clean.bag.includes(clean.held)) clean.held = null;
    if (clean.started && !clean.bag.includes('note')) clean.bag.unshift('note');
    if (clean.view === 'rhythm' && !clean.bag.includes('spoon')) clean.view = 'room';
    if (clean.view === 'ending' && !clean.ending) clean.view = 'room';
    return clean;
  }
  const empty = () => ({version:1,lastChapter:'doorstep',chapters:{},endings:[],updatedAt:null});
  function sanitize(value) {
    if (!value || value.version !== 1 || !value.chapters || typeof value.chapters !== 'object') throw new Error('这不是当前版本的游戏存档。');
    const clean = empty();
    clean.lastChapter = oneOf(value.lastChapter,CHAPTERS,'doorstep');
    for (const id of CHAPTERS) if (value.chapters[id]) clean.chapters[id] = chapter(id,value.chapters[id]);
    if (Array.isArray(value.endings)) {
      const seen=new Set();
      for (const ending of value.endings.slice(0,20)) {
        if (!ending || !CHAPTERS.includes(ending.chapter) || !ENDINGS[ending.chapter].includes(ending.id)) continue;
        const key=ending.chapter+':'+ending.id;
        if(!seen.has(key)){seen.add(key);clean.endings.push({chapter:ending.chapter,id:ending.id});}
      }
    }
    clean.updatedAt = typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)) ? value.updatedAt : null;
    return clean;
  }
  function create(storage, notify = () => {}) {
    let data=empty(), persistent=Boolean(storage), loadProblem=false;
    try { const raw=storage?.getItem(KEY); if(raw) data=sanitize(JSON.parse(raw)); } catch { loadProblem=true; }
    function write() {
      data.updatedAt = new Date().toISOString();
      try { if (!storage) throw new Error('Storage unavailable'); storage.setItem(KEY,JSON.stringify(data)); persistent=true; }
      catch { persistent=false; }
      notify({persistent,loadProblem});
    }
    return {
      load(id) { return copy(data.chapters[id] || {}); },
      save(id,snapshot) { if(!CHAPTERS.includes(id)) throw new Error('Unknown chapter'); data.chapters[id]=chapter(id,snapshot);data.lastChapter=id;write(); },
      ending(id,name) { if(!ENDINGS[id]?.includes(name)) return; if(!data.endings.some(item=>item.chapter===id&&item.id===name)){data.endings.push({chapter:id,id:name});write();} },
      get() { return copy(data); },
      status() { return {persistent,loadProblem}; },
      import(value) { const clean=sanitize(value);data=clean;loadProblem=false;write();return copy(data); }
    };
  }
  global.MoonlightStore = {create,sanitize,chapter,key:KEY};
})(globalThis);
