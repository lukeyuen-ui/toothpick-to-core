import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step,snapshot,rockHp} from '../rules.js';
import {fillBots,botCommands} from '../bot-rules.js';
import {setupShowcase} from '../showcase-rules.js';
import {addPile,conveyorQuote} from '../hauling-rules.js';
import {validMessage,decodeMessage} from '../resilience.js';
import {serializeRoom,restoreRoom,claimSaved,encodeSave,decodeSave,makeSaveCode,saveDue,markSaved,saveMessage,SaveError,SAVE_TEXT,CODE_PREFIX} from '../save-rules.js';
import {createSaveView,savedAgo,saveDepth} from '../public/save-view.js';
import {readFile} from 'node:fs/promises';

const cmd=(p,type,extra={})=>({player:p,message:{type,...extra}});
const json=v=>JSON.parse(JSON.stringify(v));
// A person arriving the way server.js seats one: join, take any saved progress for that nickname, then get a public id.
function arrive(room,token,nickname,now=room.now){const p=join(room,token,nickname,now);claimSaved(room,p);p.publicId??='pub-'+token;return p;}
// The crew: Ada and Bo dig, Cy minds the hub and radios the proposals, and the bot rules fill the last seat. Ada and Bo play with the bot
// brains (bot-rules.js, the walker the pacing harness uses): they count as bots only while botCommands picks their moves, so step() and
// the save treat them as people.
function crewRoom(seed=5){const room=createRoom('SAVE',seed,false,0,false,true);room.botLevel='hard';const people=[arrive(room,'tok-a','Ada',0),arrive(room,'tok-b','Bo',0)],cy=arrive(room,'tok-c','Cy',0);cy.x=cy.y=6.5;fillBots(room,0);return {room,people,cy};}
function drive(room,people,ticks,extra=()=>[]){for(let i=0;i<ticks;i++){const now=room.now+C.tickMs;if(now%C.bots.fillEveryMs<C.tickMs)fillBots(room,now);for(const p of people)p.bot=true;const commands=botCommands(room,now);for(const p of people)p.bot=false;step(room,[...commands,...extra(room,now)],now);}}
// Ten minutes in, Cy proposes a drill site and then coolant, so the crew chips their wallets into the fund at every hub visit.
function planGoal(cy){return room=>room.site==null&&!room.vote?[cmd(cy,'proposeSite',{x:3,y:12})]:room.site!=null&&!room.goal&&!room.vote&&!room.coolant?[cmd(cy,'propose',{item:'coolant'})]:[];}
function midGame(){const {room,people,cy}=crewRoom();drive(room,people,4000);for(let i=0;i<300&&!room.goal;i++)drive(room,people,1,planGoal(cy));drive(room,people,1500);
 // Save while a vote is open, so its ballots and its clock have to survive as well.
 drive(room,people,1,()=>[cmd(cy,'propose',{item:'plasma'})]);return {room,people,cy};}

test('a hardcore crew mid-game saves to a code and resumes as the same planet, then keeps playing',()=>{
 const {room,people:[ada,bo]}=midGame();
 assert.ok(room.goal?.item==='coolant'&&room.vote?.item==='plasma','a goal is being saved for and a vote is open');assert.ok(room.deepest>0&&room.cells.some(c=>c.row>0));
 const picture=serializeRoom(room),code=makeSaveCode(room);assert.match(code,new RegExp('^'+CODE_PREFIX+'\\.[\\w-]+\\.[\\w-]+$'));
 assert.ok(code.length<C.save.maxCodeBytes/8,'a mid-game code is a few kilobytes: '+code.length);
 assert.deepEqual(decodeSave(code),json(picture),'the code round-trips through verify');
 assert.deepEqual(Object.keys(picture.players).sort(),['Ada','Bo','Cy'],'people are keyed by nickname and bots are left out');
 assert.ok(!JSON.stringify(picture).includes('tok-')&&!JSON.stringify(picture).includes('pub-'),'no token or public id is saved');
 // Resumed a day later in a fresh room: the same planet, team and people.
 const later=room.now+86400000,back=restoreRoom(decodeSave(code),{code:'NEXT',now:later});
 assert.equal(back.code,'NEXT');assert.equal(back.hardcore,true);assert.equal(back.quick,false);assert.equal(back.players.length,0,'nobody is seated until they arrive');
 assert.deepEqual(json(serializeRoom(back)),json(picture),'cells, team and players are the same picture');
 assert.equal(back.vote.endsAt-later,room.vote.endsAt-room.now,'the vote clock picks up where it stopped');assert.equal(back.createdAt-later,room.createdAt-room.now,'the expedition clock too');
 // Everyone comes back by nickname with their progress, at the surface; the bots refill the empty seats.
 const ada2=arrive(back,'tok-a2','Ada'),bo2=arrive(back,'tok-b2','Bo');fillBots(back,later);
 for(const [was,now] of [[ada,ada2],[bo,bo2]]){for(const k of ['wallet','lifetime','tool','mobility','pods','lighting','metal','diamond','dowsing','deliveredValue','contributed','deepestRow'])assert.equal(now[k],was[k],was.nickname+' '+k);assert.deepEqual(now.hold,json(was.hold),was.nickname+' hold');assert.equal(now.shaft,null);assert.equal(now.boarded,false);}
 assert.equal(back.players.filter(p=>p.bot&&!p.departed).length,2,'Cy has not come back, so two bots fill in');{const now=json(serializeRoom(back));for(const k of ['cells','team','players','piles','belts','finds','hints'])assert.deepEqual(now[k],json(picture[k]),'still the same '+k+' once they are back');}
 const a=snapshot(room,true),b=snapshot(back,true);assert.deepEqual(b.cells.map(c=>[c.row,c.surfaceSign,c.oilSite,c.litDepth]),a.cells.map(c=>[c.row,c.surfaceSign,c.oilSite,c.litDepth]));a.cells.forEach((c,i)=>assert.ok(Math.abs(b.cells[i].hp-c.hp)<=1e-9*rockHp(room,c.row),'cell '+i+' hp'));
 for(const k of ['fund','site','goal','coolant','locks'])assert.deepEqual(json(b.team[k]),json(k==='locks'?Object.fromEntries(Object.entries(a.team.locks).map(([key,t])=>[key,t-room.now+later])):a.team[k]),k);
 // A few thousand more ticks: nothing throws, the vote resolves, and the crew keeps chipping into the fund.
 const fund=back.fund;drive(back,[ada2,bo2],3000);assert.equal(back.vote,null);assert.ok(back.fund>fund,`fund ${back.fund} > ${fund}`);assert.ok(back.tick>room.tick+2999);
 assert.doesNotThrow(()=>snapshot(back,true));});

test('a resumed room keeps every owner: machine, hopper, belts, ore lots, ballots and half-dug damage go back to the right person',()=>{
 const room=createRoom('OWNS',42,false,0,false,true),ada=arrive(room,'tok-a','Ada',0),bo=arrive(room,'tok-b','Bo',0),bot=arrive(room,'tok-c','Rook (bot)',0);bot.bot=true;
 for(const p of [ada,bo,bot]){p.x=p.y=6.5;p.lastActive=0;}ada.wallet=C.excavator.price+conveyorQuote(room,2*C.mapSize+4,ada).price+C.detectors.metal[0].cost;ada.tool=5;
 step(room,[cmd(ada,'buyExcavator'),cmd(ada,'placeExcavator',{x:2,y:2}),cmd(ada,'layConveyor',{x:4,y:2}),cmd(ada,'buy',{kind:'metal'})],100);
 for(let t=0;t<400&&room.excavators[0].phase==='driving';t++)step(room,[],room.now+C.tickMs);
 const m=room.excavators[0];assert.equal(m.phase,'placed');assert.equal(room.conveyorLines[0].ownerId,ada.publicId);
 m.hopper.lots.push({value:7,order:++room.cargoSequence,ownerId:ada.publicId});m.hopper.units++;m.hopper.value+=7;
 addPile(room,14*C.mapSize+14,{value:5,order:++room.cargoSequence,ownerId:bo.publicId,beltEntry:true});addPile(room,14*C.mapSize+14,{value:3,order:++room.cargoSequence,ownerId:bot.publicId,beltEntry:true});
 const cell=room.cells[13*C.mapSize+1];cell.damage={[ada.id]:2,[bo.id]:1,[bot.id]:0.5};cell.hp=rockHp(room,0)-3.5;
 room.site=12*C.mapSize+12;step(room,[cmd(bo,'propose',{item:'coolant'})],room.now+C.tickMs);assert.equal(room.vote.proposerId,bo.publicId);
 const back=restoreRoom(decodeSave(makeSaveCode(room)),{code:'BACK',now:room.now+5000});
 const savedAda=back.roster.find(p=>p.nickname==='Ada'),savedBo=back.roster.find(p=>p.nickname==='Bo');assert.equal(back.roster.length,2,'the bot is not saved');
 assert.equal(back.excavators[0].ownerId,savedAda.publicId,'owned by the saved Ada until she arrives');
 const ada2=arrive(back,'tok-a2','Ada'),bo2=arrive(back,'tok-b2','Bo');
 assert.equal(ada2.publicId,savedAda.publicId);assert.equal(bo2.publicId,savedBo.publicId);assert.equal(ada2.excavatorKits,0);assert.equal(ada2.metal,1);assert.equal(ada2.tool,5);assert.equal(ada2.beltsBuilt,1);
 const m2=back.excavators[0];assert.equal(m2.ownerId,ada2.publicId);assert.ok(m2.hopper.lots.every(l=>l.ownerId===ada2.publicId));assert.deepEqual(m2.cells,m.cells);assert.equal(m2.damagerId,m.damagerId);
 assert.equal(back.conveyorLines[0].ownerId,ada2.publicId);assert.ok(Object.values(back.belts).every(b=>b.ownerId===ada2.publicId));
 assert.deepEqual(back.piles[14*C.mapSize+14].lots.map(l=>l.ownerId),[bo2.publicId,undefined],'a bot\'s ore loses its owner and pays the fund');
 assert.deepEqual(back.cells[13*C.mapSize+1].damage,{[ada2.id]:2,[bo2.id]:1},'half-dug damage goes back to the right people; the bot\'s share is dropped');
 assert.equal(back.vote.proposerId,bo2.publicId);assert.equal(back.vote.ballots[bo2.publicId],true);assert.ok(back.vote.voters.includes(ada2.publicId)&&!back.vote.voters.includes(bot.publicId));
 assert.deepEqual(json(back.hints),json(room.hints));assert.ok(Object.keys(back.hints).length>0,'the metal detector left hints');
 // The machine digs on for its owner and the belts still pay her.
 const wallet=ada2.wallet;for(let t=0;t<200;t++)step(back,[],back.now+C.tickMs);assert.ok(ada2.wallet>wallet,'the hopper empties onto Ada\'s belt and pays her');});

test('the World Breaker overdrive, cooldowns and the expedition clock carry over from save to resume',()=>{
 const room=createRoom('CLOK',42,false,0,false,true),p=arrive(room,'tok-a','Ada',0);p.x=p.y=6.5;p.lastActive=0;room.site=200;room.drill={index:200};room.coolant=true;room.cells[200]={row:150,hp:rockHp(room,150),damage:{}};room.fund=C.teamItems.worldBreaker.price;
 step(room,[cmd(p,'propose',{item:'worldBreaker'})],60000);const began=room.worldBreaker.startedAt;step(room,[],began+25000);room.locks.pump=began+30000;
 const resume=began+25000+7*86400000,back=restoreRoom(decodeSave(makeSaveCode(room)),{code:'WAKE',now:resume});
 assert.equal(back.worldBreaker.startedAt-resume,began-(began+25000));assert.equal(back.locks.pump-resume,5000);assert.equal(back.createdAt-resume,0-(began+25000));
 let now=resume;while(!back.won&&now<resume+40000){now+=C.tickMs;step(back,[],now);}
 assert.equal(back.won,true);assert.equal(back.wonAt,resume+35000,'the overdrive ends sixty seconds after it began, counting only time in play');assert.equal(back.cells[200].row,C.finalRow);
 assert.equal(makeSaveCode(back),null,'a finished expedition makes no more saves');assert.equal(back.stats.timeToCore,(began+60000)/C.tapWindowMs,'time to the core counts only time in play');});

test('a half-dug block keeps its share across a recalibration: toughness comes from the hardcore flag, not from the save',()=>{
 const room=createRoom('TUFF',8,false,0,false,true),p=arrive(room,'a','Ada',0),i=3*C.mapSize+3,full=rockHp(room,0);room.cells[i].hp=full*0.25;room.cells[i].damage={[p.id]:full*0.75};
 const picture=serializeRoom(room);assert.equal(picture.cells[i].left,0.25);assert.ok(picture.cells.every(c=>!('hp' in c)),'no absolute hit points are saved');
 const was=C.hardcore.hpMultiplier;try{C.hardcore.hpMultiplier=was*5;const back=restoreRoom(json(picture),{code:'TUF2',now:0});assert.equal(back.cells[i].hp,rockHp(back,0)*0.25);assert.equal(back.cells[i+1].hp,rockHp(back,0),'untouched blocks are as tough as new rock');assert.equal(rockHp(back,0),full*5);}
 finally{C.hardcore.hpMultiplier=was;}});

test('nickname matching: saved people get their own progress back, anyone else starts with the hardcore kit',()=>{
 const room=createRoom('NAME',7,false,0,false,true),ada=arrive(room,'a','Ada',0),bo=arrive(room,'b','Bo',0),digger=arrive(room,'d','Digger',0),digger2=arrive(room,'e','Digger',0);
 Object.assign(ada,{wallet:500,tool:3,mobility:1,lighting:1});Object.assign(bo,{wallet:9000,tool:5,pods:1,metal:2});Object.assign(digger,{wallet:1,tool:1});Object.assign(digger2,{wallet:2,tool:2});
 const picture=serializeRoom(room);assert.deepEqual(Object.keys(picture.players),['Ada','Bo','Digger','Digger (2)'],'a shared nickname gets a numbered key');
 const back=restoreRoom(decodeSave(encodeSave(picture)),{code:'MTCH',now:1000}),leave=p=>{p.connected=false;p.departed=true;return p;};// each arrival frees its seat again
 const kit=C.hardcore.startWallet??0,cy=leave(arrive(back,'c1','Cy'));assert.equal(cy.tool,0);assert.equal(cy.wallet,kit,'a new explorer gets the hardcore starting kit');assert.equal(back.roster.length,4,'an unknown nickname takes nothing');
 const b2=leave(arrive(back,'b1','Bo'));assert.equal(b2.tool,5);assert.equal(b2.wallet,9000,'the saved wallet replaces the starting wallet, so nobody is granted it twice');assert.equal(b2.pods,1);assert.equal(b2.metal,2);
 const a2=leave(arrive(back,'a1','ada'));assert.equal(a2.tool,3,'case does not matter');assert.equal(a2.wallet,500);assert.equal(a2.mobility,1);assert.equal(a2.lighting,1);
 assert.equal(leave(arrive(back,'a9','Ada')).wallet,kit,'a saved record is claimed once');
 assert.equal(leave(arrive(back,'d1','Digger')).wallet,1,'the first Digger');assert.equal(leave(arrive(back,'d2','Digger')).tool,2,'then the second');
 assert.equal(claimSaved(back,join(back,'d3','Digger',1000)),null,'nobody left to claim');
 // Saved people nobody has claimed yet stay in the next save, so a crewmate who never came back keeps their gear.
 const room2=createRoom('LEFT',7,false,0,false,true),p=arrive(room2,'z','Zed',0);p.tool=4;const back2=restoreRoom(decodeSave(makeSaveCode(room2)),{code:'L2',now:1});arrive(back2,'y','Yan',1);
 const again=restoreRoom(decodeSave(makeSaveCode(back2)),{code:'L3',now:2});assert.equal(arrive(again,'z2','Zed',2).tool,4);
 // Dig again after the core: the old planet's saved gear does not carry over to the new one.
 back2.won=true;step(back2,[cmd(back2.players[0],'reset')],back2.now+C.tickMs);assert.equal(arrive(back2,'z3','Zed').tool,0);});

test('tampered, foreign, unfinished and unknown codes are refused before anything inside is trusted',()=>{
 const {room}=crewRoom(9),code=makeSaveCode(room),[prefix,body,tag]=code.split('.'),flip=s=>s.slice(0,40)+(s[40]==='A'?'B':'A')+s.slice(41);
 const refused=(c,text)=>assert.throws(()=>decodeSave(c),e=>e instanceof SaveError&&e.message===text,c.slice(0,60));
 refused([prefix,flip(body),tag].join('.'),SAVE_TEXT.forged);refused([prefix,body,flip(tag)].join('.'),SAVE_TEXT.forged);refused(code.slice(0,-3),SAVE_TEXT.forged);refused(code.slice(0,200),SAVE_TEXT.damaged);
 refused(encodeSave(serializeRoom(room),'another server'),SAVE_TEXT.forged);refused('hello',SAVE_TEXT.damaged);refused('',SAVE_TEXT.damaged);
 refused(CODE_PREFIX+'.'+'A'.repeat(C.save.maxCodeBytes)+'.'+tag,SAVE_TEXT.damaged);
 assert.deepEqual(decodeSave(code.slice(0,500)+'\n  '+code.slice(500)),decodeSave(code),'line breaks from a chat window are ignored');
 const picture=serializeRoom(room);refused(encodeSave({...picture,v:2}),SAVE_TEXT.version);refused(encodeSave({...picture,hardcore:false}),SAVE_TEXT.mode);refused(encodeSave({...picture,quick:true}),SAVE_TEXT.mode);refused(encodeSave({...picture,team:{...picture.team,won:true}}),SAVE_TEXT.won);
 // Quick, Full and Showcase rooms never save, and their pictures are refused.
 const quick=createRoom('QUIK',3,false,0,true),full=createRoom('FULL',3,false,0),show=createRoom('SHOW',3,false,0,true);show.botLevel='off';setupShowcase(show);
 for(const r of [quick,full,show]){arrive(r,'q','Quinn',0);assert.equal(makeSaveCode(r),null);for(let t=1;t<=1300;t++){step(r,[],t*C.tickMs);assert.equal(saveDue(r,r.now),false);}refused(encodeSave(serializeRoom(r)),SAVE_TEXT.mode);assert.throws(()=>restoreRoom(json(serializeRoom(r)),{code:'NOPE',now:0}),SaveError);}});

test('a picture signed with the right key but made by hand never yields a room the rules trip on',()=>{
 // The default key is public, so restoreRoom checks every field itself. Mutate leaves of a real picture: each either restores into a room that
 // plays and snapshots, or is refused with the damaged-code message. Nothing else may escape.
 const {room}=midGame(),base=json(serializeRoom(room)),leaves=[];
 (function walk(v,path){if(v!==null&&typeof v==='object'){for(const [k,x]of Object.entries(v))walk(x,[...path,k]);}else leaves.push(path);})(base,[]);
 let seed=7;const rand=n=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed%n;},odd=[null,-1,0.5,1e300,-1e300,'x','__proto__',true,false,[],{},[1,2],{a:1},300,C.mapSize*C.mapSize,C.finalRow+1,'p:Nobody'];
 let restored=0,refusedCount=0;
 for(let i=0;i<400;i++){const picture=json(base),path=leaves[rand(leaves.length)];let at=picture;for(const k of path.slice(0,-1))at=at[k];at[path.at(-1)]=odd[rand(odd.length)];
  try{const r=restoreRoom(picture,{code:'FUZZ',now:1e12});const p=arrive(r,'f','Ada',r.now);fillBots(r,r.now);for(let t=0;t<5;t++)step(r,[cmd(p,'tap',{x:3,y:3})],r.now+C.tickMs);snapshot(r,true);serializeRoom(r);restored++;}
  catch(error){assert.ok(error instanceof SaveError,path.join('.')+': '+error.stack);refusedCount++;}}
 assert.ok(restored>20&&refusedCount>20,`${restored} restored, ${refusedCount} refused`);
 for(const broken of [{...base,cells:base.cells.slice(1)},{...base,players:{Ada:{...base.players.Ada,hold:null}}},{...base,cells:base.cells.map((c,i)=>i?c:{...c,damage:{'p:Nobody':1}})}])assert.throws(()=>restoreRoom(broken,{code:'X',now:0}),SaveError);});

test('saves go out every minute and soon after a milestone, only in live hardcore rooms',()=>{
 const room=createRoom('TIME',4,false,0,false,true),p=arrive(room,'a','Ada',0);p.x=p.y=6.5;p.wallet=1000;let t=0;const tick=(commands=[])=>{t+=C.tickMs;step(room,commands,t);return saveDue(room,t);};
 assert.equal(tick(),false,'not at once');const first=t;while(t<first+C.save.everyMs-C.tickMs)assert.equal(tick(),false);assert.equal(tick(),true,'after a minute');markSaved(room,t);
 assert.equal(tick([cmd(p,'buy',{kind:'tool'})]),false,'a purchase right after a save waits out the gap');let waited=C.tickMs;while(!tick())waited+=C.tickMs;assert.ok(waited<=C.save.minGapMs,'then saves at once: '+waited);markSaved(room,t);
 assert.equal(tick(),false);const msg=saveMessage(room,makeSaveCode(room),p,t);assert.equal(msg.type,'save');assert.equal(msg.row,room.deepest);assert.deepEqual(msg.meta,{room:'TIME',nickname:'Ada',round:0,crew:['Ada']});
 const back=restoreRoom(decodeSave(msg.code),{code:'TIM2',now:t});assert.equal(saveDue(back,t),true,'a resumed room saves at once, so every lobby learns the new room');});

test('the wire takes a long create only when it carries a save code, and only before joining',()=>{
 for(const m of [{type:'create',resume:'TPC1.a.b'},{type:'create',hardcore:true,resume:'x'},{type:'export'}])assert.equal(validMessage(m),true,JSON.stringify(m));
 for(const m of [{type:'create',resume:5},{type:'join',code:'ABCD',resume:'TPC1.a.b'},{type:'create',resume:{}}])assert.equal(validMessage(m),false,JSON.stringify(m));
 const big=JSON.stringify({type:'create',resume:'A'.repeat(100000),nickname:'Ada'}),padded=JSON.stringify({type:'create',nickname:'x'.repeat(100000)});
 assert.equal(decodeMessage(big),null,'ordinary limit');assert.equal(decodeMessage(big,false,C.save.maxCodeBytes+C.maxPayload).resume.length,100000);assert.equal(decodeMessage(padded,false,C.save.maxCodeBytes+C.maxPayload),null,'long but not a save code');
 assert.equal(decodeMessage(JSON.stringify({type:'create',resume:'A'.repeat(C.save.maxCodeBytes+C.maxPayload)}),false,C.save.maxCodeBytes+C.maxPayload),null,'past the cap');});

// The lobby and hub halves on the client (public/save-view.js), driven through fake elements the way goals and supply are tested.
class Element{constructor(){this.textContent='';this.hidden=false;this.disabled=false;this.open=false;this.value='';this.classes=new Set();this.classList={toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};this.selected=false;}focus(){}select(){this.selected=true;}}
function lobby({clipboardFails=false,storageFails=false}={}){const ids=['resume-panel','resume-summary','resume-saved','resume-detail','resume-start','resume-copy','resume-code-text','resume-paste','resume-paste-go','resume-status','save-row','save-age','save-copy','save-text'],elements=Object.fromEntries(ids.map(id=>[id,new Element()])),values=new Map(),copied=[],toasts=[],resumed=[];let time=1e12;
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(storageFails)throw Error('quota');values.set(k,v);},removeItem:k=>values.delete(k)};
 const clipboard=()=>({writeText:async text=>{if(clipboardFails)throw Error('denied');copied.push(text);}});
 const make=()=>createSaveView({document:{getElementById:id=>elements[id]},storage,clipboard,toast:t=>toasts.push(t),resume:(code,saved)=>resumed.push({code,saved}),now:()=>time});
 return {elements,values,copied,toasts,resumed,make,tick:ms=>{time+=ms;}};}
const message=(room='ABCD',row=40)=>({type:'save',code:'TPC1.body.tag-'+room,savedAt:5,row,meta:{room,nickname:'Ada',round:0,crew:['Ada']}});
const settle=()=>new Promise(r=>setTimeout(r,0));

test('the lobby offers the latest hardcore save: when, how deep and as whom, with Resume, Copy and a paste field for a crewmate\'s code',async()=>{
 const t=lobby(),e=t.elements;let view=t.make();view.renderLobby();
 assert.equal(e['resume-summary'].textContent,'Have a hardcore save code?');assert.equal(e['resume-saved'].hidden,true);assert.equal(e['resume-panel'].classes.has('saved'),false);
 view.accept(message());view.accept(message());assert.deepEqual(t.toasts,['Saved. Hardcore expeditions can be resumed from the lobby after a restart.'],'the first save of a room says what saving is for, once');
 const kept=JSON.parse(t.values.get(C.save.storageKey));assert.deepEqual({...kept,savedAt:0},{code:'TPC1.body.tag-ABCD',savedAt:0,row:40,nickname:'Ada',room:'ABCD'});
 t.tick(3*60000);view=t.make();view.renderLobby();// a reload after a restart
 assert.equal(e['resume-summary'].textContent,'Resume hardcore expedition');assert.equal(e['resume-saved'].hidden,false);assert.equal(e['resume-panel'].open,true);assert.equal(e['resume-panel'].classes.has('saved'),true);
 assert.equal(e['resume-detail'].textContent,'Saved 3 min ago · '+saveDepth(40)+' deep · as Ada');
 e['resume-start'].onclick();assert.deepEqual(t.resumed.map(r=>[r.code,r.saved.room]),[['TPC1.body.tag-ABCD','ABCD']]);
 e['resume-copy'].onclick();await settle();assert.deepEqual(t.copied,['TPC1.body.tag-ABCD']);assert.equal(e['resume-status'].textContent,'Save code copied');assert.equal(e['resume-code-text'].hidden,true,'a copy that worked shows no code box');
 e['resume-paste-go'].onclick();assert.equal(e['resume-status'].textContent,'Paste a save code first');assert.equal(t.resumed.length,1);
 e['resume-paste'].value='  TPC1.from\n  a.crewmate  ';let prevented=false;e['resume-paste'].onkeydown({key:'Enter',preventDefault(){prevented=true;}});assert.equal(prevented,true,'Enter in the paste field resumes instead of joining a room code');assert.deepEqual(t.resumed.at(-1),{code:'TPC1.froma.crewmate',saved:null},'chat line breaks are stripped and no seat token is sent for a pasted code');
 e['resume-paste'].value='x'.repeat(C.save.maxCodeBytes+1);e['resume-paste-go'].onclick();assert.equal(e['resume-status'].textContent,'That is too long to be a save code');
 view.finished('ABCD');view.renderLobby();assert.equal(t.values.has(C.save.storageKey),false,'reaching the core clears the save');assert.equal(e['resume-saved'].hidden,true);});

test('a refused clipboard shows the code selected instead, and a full browser storage says so',async()=>{
 const t=lobby({clipboardFails:true}),e=t.elements,view=t.make();view.accept(message('WXYZ'));view.renderLobby();e['resume-copy'].onclick();await settle();
 assert.equal(e['resume-code-text'].hidden,false);assert.equal(e['resume-code-text'].value,'TPC1.body.tag-WXYZ');assert.equal(e['resume-code-text'].selected,true);assert.equal(e['resume-status'].textContent,'Press Ctrl+C or Cmd+C to copy the selected code');
 const full=lobby({storageFails:true});full.make().accept(message());assert.match(full.toasts[0],/storage is full or blocked/);});

test('in a hardcore room the hub shows when the last save arrived and copies it; the code never reaches the HUD',async()=>{
 const t=lobby(),e=t.elements,view=t.make(),state=(extra={})=>({code:'ABCD',hardcore:true,showcase:false,team:{won:false},...extra});
 view.renderHub(state());assert.equal(e['save-row'].hidden,false);assert.equal(e['save-age'].textContent,'First save within a minute');assert.equal(e['save-copy'].disabled,true);
 view.accept(message());view.renderHub(state());assert.equal(e['save-age'].textContent,'Saved just now');assert.equal(e['save-copy'].disabled,false);
 t.tick(2*3600000);view.renderHub(state());assert.equal(e['save-age'].textContent,'Saved 2 hours ago');
 e['save-copy'].onclick();await settle();assert.deepEqual(t.copied,['TPC1.body.tag-ABCD']);assert.equal(t.toasts.at(-1),'Save code copied');assert.equal(e['save-text'].hidden,true,'nothing of the code shows in the hub');
 view.renderHub(state({code:'QRST'}));assert.equal(e['save-copy'].disabled,true,'a save from another room is not this room\'s');
 for(const other of [state({hardcore:false}),state({showcase:true}),state({team:{won:true}})]){view.renderHub(other);assert.equal(e['save-row'].hidden,true);}
 for(const [ms,text] of [[0,'just now'],[44000,'just now'],[90000,'2 min ago'],[59*60000,'59 min ago'],[3600000,'1 hour ago'],[35*3600000,'35 hours ago'],[48*3600000,'2 days ago']])assert.equal(savedAgo(ms),text);});

test('the save code UI ships: lobby panel, hub row, the module route and its styles, and no long dashes in the copy',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8'),server=await readFile(new URL('../server.js',import.meta.url),'utf8'),view=await readFile(new URL('../public/save-view.js',import.meta.url),'utf8'),client=await readFile(new URL('../public/client.js',import.meta.url),'utf8'),{SAVE_STYLE}=await import('../config.js');
 for(const id of ['resume-panel','resume-start','resume-copy','resume-paste','resume-paste-go','save-row','save-copy'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/<input id="nickname"[^>]*><details id="resume-panel">/,'the panel sits under the callsign it resumes with');assert.ok([...html.matchAll(/<button id="(resume|save)-[a-z-]+" type="button"/g)].length>=4,'panel buttons never submit the join form');
 assert.match(server,/'save-view\.js'/);assert.match(server,/\+SAVE_STYLE[+)]/);assert.match(SAVE_STYLE,/#save-row:not\(\[hidden\]\)/);
 assert.match(client,/message\.type==='save'\)\{saves\.accept\(message\)/);assert.match(client,/send\(\{type:'export'\}\)/);
 for(const text of [html.match(/<details id="resume-panel">.*?<\/details>/)[0],view,SAVE_STYLE])assert.doesNotMatch(text,/[\u2013\u2014]/);});
