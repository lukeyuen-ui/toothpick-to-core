import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step,snapshot,rockHp} from '../rules.js';
import {fillBots,botCommands} from '../bot-rules.js';
import {setupShowcase} from '../showcase-rules.js';
import {addPile,conveyorQuote} from '../hauling-rules.js';
import {validMessage,decodeMessage} from '../resilience.js';
import {serializeRoom,restoreRoom,claimSaved,encodeSave,decodeSave,makeSaveCode,saveDue,markSaved,saveMessage,SaveError,SAVE_TEXT,CODE_PREFIX} from '../save-rules.js';

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
