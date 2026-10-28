import {C} from '../config.js';
import {depthAt} from '../rules.js';
// Hardcore save codes on the client (the authority's side is save-rules.js). A hardcore room sends {type:'save'} now and then; the latest is
// kept in browser storage under C.save.storageKey, so after a restart the lobby offers it: Resume, Copy save code, or paste a code a crewmate
// sent. In a hardcore room the hub says when the last save arrived and has a Copy button; the code itself never shows on the HUD.
const KEY=C.save.storageKey;
export function savedAgo(ms){const s=Math.max(0,Math.round(ms/1000));if(s<45)return 'just now';const m=Math.round(s/60);if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<36)return h+(h===1?' hour':' hours')+' ago';const d=Math.round(h/24);return d+(d===1?' day':' days')+' ago';}
export function saveDepth(row){const m=depthAt(Math.max(0,Number(row)||0));return m<C.view.km?Math.floor(m)+' m':(m/C.view.km).toFixed(C.view.decimalPlaces)+' km';}
export function createSaveView({document:doc=globalThis.document,storage=globalThis.localStorage,clipboard=()=>globalThis.navigator?.clipboard,toast=()=>{},resume=()=>{},now=()=>Date.now()}={}){
 const $=id=>doc.getElementById(id);let latest=read();
 function read(){try{const v=JSON.parse(storage.getItem(KEY)||'null');return v&&typeof v.code==='string'&&v.code?v:null;}catch{return null;}}
 function write(v){try{if(v)storage.setItem(KEY,JSON.stringify(v));else storage.removeItem(KEY);return true;}catch{return false;}}
 const say=text=>{$('resume-status').textContent=text;};
 // Copy to the clipboard where the browser allows it; otherwise show the code selected so Ctrl+C or Cmd+C takes it.
 async function copy(code,box,tell){try{await clipboard().writeText(code);box.hidden=true;tell('Save code copied');}catch{box.hidden=false;box.value=code;box.focus?.();box.select?.();tell('Press Ctrl+C or Cmd+C to copy the selected code');}}
 // A save from the authority. The first one from a room (a new expedition, or the room a save resumed into) says what saving is for.
 function accept(m){if(typeof m?.code!=='string'||!m.code)return;const meta=m.meta||{},room=String(meta.room||''),first=latest?.room!==room;latest={code:m.code,savedAt:now(),row:Number(m.row)||0,nickname:String(meta.nickname||''),room};if(!write(latest))toast('Browser storage is full or blocked: copy the save code from the hub to keep it');else if(first)toast('Saved. Hardcore expeditions can be resumed from the lobby after a restart.');}
 // An expedition that reached the core has nothing left to resume.
 function finished(room){if(latest&&latest.room===room){latest=null;write(null);}}
 const hasSave=room=>!!latest&&(room==null||latest.room===room);
 function renderLobby(){latest=read();const panel=$('resume-panel'),has=!!latest;$('resume-saved').hidden=!has;panel.classList.toggle('saved',has);$('resume-summary').textContent=has?'Resume hardcore expedition':'Have a hardcore save code?';if(has){panel.open=true;$('resume-detail').textContent=['Saved '+savedAgo(now()-latest.savedAt),saveDepth(latest.row)+' deep',...(latest.nickname?['as '+latest.nickname]:[])].join(' · ');}}
 function renderHub(state){const row=$('save-row'),on=!!state?.hardcore&&!state.showcase&&!state.team?.won;row.hidden=!on;if(!on)return;const mine=hasSave(state.code),text=mine?'Saved '+savedAgo(now()-latest.savedAt):'First save within a minute';if($('save-age').textContent!==text)$('save-age').textContent=text;$('save-copy').disabled=!mine;}
 $('resume-start').onclick=()=>{if(latest)resume(latest.code,latest);};
 $('resume-copy').onclick=()=>{if(latest)copy(latest.code,$('resume-code-text'),say);};
 const paste=()=>{const code=$('resume-paste').value.replace(/\s+/g,'');if(!code){say('Paste a save code first');return;}if(code.length>C.save.maxCodeBytes){say('That is too long to be a save code');return;}say('');resume(code,null);};
 $('resume-paste-go').onclick=paste;$('resume-paste').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();paste();}};
 $('save-copy').onclick=()=>{if(latest)copy(latest.code,$('save-text'),toast);};
 return {accept,finished,renderLobby,renderHub,hasSave,latest:()=>latest};}
