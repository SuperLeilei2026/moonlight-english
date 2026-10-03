import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scope = {Date, Math};
vm.runInNewContext(fs.readFileSync(new URL('../assets/practice.js', import.meta.url), 'utf8'), scope);
const {create, classifyMabel, classifyTransfer, mabelFeedback, sanitize, bindSpeech} = scope.MoonlightPractice;
const plain = value => JSON.parse(JSON.stringify(value));
const memory = () => { const values = new Map(); return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}; };

test('Mabel intent rules follow meaning instead of exact model answer', () => {
  assert.equal(classifyMabel('Then why is your name on this?'), 'evidence');
  assert.equal(classifyMabel('Did the ribbon write your name by itself?'), 'evidence');
  assert.equal(classifyMabel('What is this ribbon for?'), 'information');
  assert.equal(classifyMabel('So you kidnapped the cat!'), 'accusation');
  assert.equal(classifyMabel('I would like more tea.'), 'other');
  assert.match(mabelFeedback('Why your name on this?', 'evidence'), /补一个 is/);
  assert.doesNotMatch(mabelFeedback('Can you explain why your name is on this ribbon?', 'evidence'), /补一个 is/);
});

test('transfer requires a new piece of evidence and a challenge', () => {
  assert.equal(classifyTransfer('But I can hear you singing in this recording.'), 'evidence');
  assert.equal(classifyTransfer('Then whose voice is this?'), 'evidence');
  assert.equal(classifyTransfer('I found a recording.'), 'information');
  assert.equal(classifyTransfer('You are a pigeon.'), 'other');
});

test('speech recognition keeps earlier final segments when a later result changes', () => {
  let recognition;
  class FakeRecognition {
    start() { recognition = this; this.onstart(); }
    stop() {}
    abort() {}
  }
  const listeners = new Map();
  const label = {textContent:''};
  const button = {
    querySelector: () => label,
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name, listener) => { if (listeners.get(name) === listener) listeners.delete(name); },
    setAttribute() {}
  };
  const field = {value:'', dataset:{}, dispatchEvent() {}};
  const status = {textContent:'', dataset:{}};
  scope.Event = Event;
  scope.SpeechRecognition = FakeRecognition;

  const speech = bindSpeech({button, field, status});
  listeners.get('click')();
  const first = Object.assign([{transcript:'But I can '}], {isFinal:true});
  recognition.onresult({resultIndex:0, results:[first]});
  const second = Object.assign([{transcript:'hear you singing.'}], {isFinal:true});
  recognition.onresult({resultIndex:1, results:[first, second]});

  assert.equal(field.value, 'But I can hear you singing.');
  assert.equal(field.dataset.rawTranscript, 'But I can hear you singing.');
  speech.dispose();
});

test('successful attempt schedules one transfer exactly 24 hours later', () => {
  let time = Date.parse('2026-10-03T10:00:00.000Z');
  const store = create(memory(), () => {}, () => time);
  const attempt = store.addAttempt({sceneId:'mabel-ribbon',submittedText:'Why your name on this?',rawTranscript:'Why your name on this?',inputMode:'voice',intent:'evidence',feedback:'Add is.'});
  const scheduled = store.schedule(attempt.id);
  assert.equal(Date.parse(scheduled.dueAt) - time, 24 * 60 * 60 * 1000);
  assert.equal(store.schedule(attempt.id).id, scheduled.id);
  assert.equal(store.due(), null);
  time += 24 * 60 * 60 * 1000;
  assert.equal(store.due().id, scheduled.id);
});

test('practice history survives reload and callers cannot mutate saved snapshots', () => {
  const backend = memory();
  const time = Date.parse('2026-10-03T10:00:00.000Z');
  const first = create(backend, () => {}, () => time);
  const attempt = first.addAttempt({
    sceneId: 'mabel-ribbon',
    submittedText: 'Then why is your name on this?',
    rawTranscript: 'Then why is your name on this?',
    inputMode: 'voice',
    edited: false,
    hintLevel: 1,
    intent: 'evidence',
    feedback: 'You connected the ribbon to Mabel.'
  });
  first.updateAttempt(attempt.id, {coachFeedback: 'Keep the question direct.'});
  const transfer = first.schedule(attempt.id);
  first.noteTransferAttempt(transfer.id, {submittedText: 'I heard a recording.', intent: 'information'});

  const snapshot = first.get();
  snapshot.attempts[0].submittedText = 'changed outside the store';
  snapshot.transfers[0].firstSubmittedText = 'changed outside the store';

  const reloaded = create(backend, () => {}, () => time);
  const saved = reloaded.get();
  assert.equal(saved.attempts[0].submittedText, 'Then why is your name on this?');
  assert.equal(saved.attempts[0].coachFeedback, 'Keep the question direct.');
  assert.equal(saved.transfers[0].firstSubmittedText, 'I heard a recording.');
  assert.equal(saved.transfers[0].attemptCount, 1);
  assert.equal(reloaded.schedule(attempt.id).id, transfer.id);
});

test('practice stays usable when browser storage is blocked and can still be backed up', () => {
  const blocked = {getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); }};
  const time = Date.parse('2026-10-03T10:00:00.000Z');
  const session = create(blocked, () => {}, () => time);
  const attempt = session.addAttempt({sceneId:'mabel-ribbon', submittedText:'Why is your name on this?', intent:'evidence'});
  session.schedule(attempt.id);

  assert.deepEqual(plain(session.status()), {persistent:false, loadProblem:true});
  assert.equal(session.get().attempts.length, 1);
  assert.equal(session.get().transfers.length, 1);

  const restored = create(memory(), () => {}, () => time);
  restored.import(plain(session.get()));
  assert.equal(restored.get().attempts[0].submittedText, 'Why is your name on this?');
  assert.equal(restored.get().transfers[0].sourceAttemptId, attempt.id);
});

test('transfer keeps the first try instead of rewriting the learning history', () => {
  let time = Date.parse('2026-10-03T10:00:00.000Z');
  const store = create(memory(), () => {}, () => time);
  const attempt = store.addAttempt({sceneId:'mabel-ribbon',submittedText:'Why is your name on this?',inputMode:'typed',intent:'evidence'});
  const transfer = store.schedule(attempt.id);
  store.noteTransferAttempt(transfer.id,{submittedText:'I found a recording.',intent:'information'});
  const second = store.noteTransferAttempt(transfer.id,{submittedText:'But I can hear you singing.',intent:'evidence',assistanceUsed:true});
  assert.equal(second.attemptCount, 2);
  assert.equal(second.firstSubmittedText, 'I found a recording.');
  assert.equal(second.firstIntent, 'information');
  const complete = store.completeTransfer(transfer.id,{submittedText:'But I can hear you singing.',intent:'evidence'});
  assert.equal(complete.assistanceUsed, true);
  assert.equal(complete.firstSubmittedText, 'I found a recording.');
});

test('completed transfer is no longer returned as the next or due challenge', () => {
  let time = Date.parse('2026-10-03T10:00:00.000Z');
  const store = create(memory(), () => {}, () => time);
  const attempt = store.addAttempt({sceneId:'mabel-ribbon', submittedText:'Why is your name on this?', intent:'evidence'});
  const transfer = store.schedule(attempt.id);
  time += 24 * 60 * 60 * 1000;
  assert.equal(store.due().id, transfer.id);
  store.noteTransferAttempt(transfer.id, {submittedText:'But I heard you singing.', intent:'evidence'});
  const completed = store.completeTransfer(transfer.id, {submittedText:'But I heard you singing.', intent:'evidence'});
  assert.equal(completed.status, 'complete');
  assert.equal(completed.completedAt, '2026-10-04T10:00:00.000Z');
  assert.equal(store.next(), null);
  assert.equal(store.due(), null);
});

test('sanitized transfers cannot claim completion without answer evidence', () => {
  const createdAt = '2026-10-03T10:00:00.000Z';
  const dueAt = '2026-10-04T10:00:00.000Z';
  const clean = sanitize({version:1, attempts:[], transfers:[
    {id:'missing-answer', sourceAttemptId:'a', variantId:'pip-alibi', createdAt, dueAt, status:'complete', completedAt:dueAt},
    {id:'missing-time', sourceAttemptId:'b', variantId:'pip-alibi', createdAt, dueAt, status:'complete', submittedText:'Then whose voice is this?'}
  ]});
  assert.ok(clean.transfers.every(item => item.status !== 'complete' || Boolean(item.submittedText && item.completedAt)));
});

test('practice import bounds untrusted fields and preserves completion evidence', () => {
  const clean = sanitize({version:1,attempts:[
    {id:'invalid',sceneId:'unknown',submittedText:'discard me',createdAt:'2026-10-03T10:00:00.000Z'},
    {id:'a',sceneId:'mabel-ribbon',submittedText:'x'.repeat(1400),rawTranscript:'y'.repeat(1400),inputMode:'unknown',hintLevel:99,intent:'evidence',coachFeedback:'z'.repeat(2600),createdAt:'2026-10-03T10:00:00.000Z'}
  ],transfers:[{id:'t',sourceAttemptId:'a',variantId:'pip-alibi',dueAt:'2026-10-04T10:00:00.000Z',createdAt:'2026-10-03T10:00:00.000Z',status:'complete',submittedText:'Then whose voice is this?',attemptCount:99,firstIntent:'unknown',intent:'evidence',completedAt:'2026-10-04T10:01:00.000Z'}]});
  assert.equal(clean.attempts.length, 1);
  assert.equal(clean.attempts[0].submittedText.length, 1200);
  assert.equal(clean.attempts[0].rawTranscript.length, 1200);
  assert.equal(clean.attempts[0].coachFeedback.length, 2400);
  assert.equal(clean.attempts[0].inputMode, 'typed');
  assert.equal(clean.attempts[0].hintLevel, 3);
  assert.equal(clean.transfers[0].status, 'complete');
  assert.equal(clean.transfers[0].attemptCount, 20);
  assert.equal(clean.transfers[0].firstIntent, 'other');
  assert.equal(plain(clean).version, 1);
});
