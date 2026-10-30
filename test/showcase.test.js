import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step,snapshot} from '../rules.js';
import {fillBots,botCommands,crewBots,makeRoomForPerson} from '../bot-rules.js';
import {setupShowcase,equipShowcase,breakerPrice} from '../showcase-rules.js';
import {boreCells} from '../team-rules.js';
import {isDepot} from '../hauling-rules.js';
import {showcaseStep,showcaseCopy,showcaseGoals} from '../public/goals.js';
import {playShowcase} from './showcase-play.js';

const S=C.showcase,MECH=C.tools.length-1,N=C.mapSize;
function fresh(seed=7,level='normal'){const r=createRoom('SHOW',seed,false,0,true);r.botLevel=level;setupShowcase(r);const p=join(r,'h','Ana',0);p.publicId='a';equipShowcase(r,p,0);fillBots(r,0);return {r,p};}
// Runs the room with the bots and the person's commands from make(now) until done(now) or the limit.
function run(r,p,{from=0,until=60000,make=()=>[],done=()=>false}={}){let now=from;for(;now<until&&!done(now);now+=C.tickMs){if(now%C.bots.fillEveryMs<C.tickMs)fillBots(r,now);step(r,[...botCommands(r,now),...make(now).map(m=>({player:p,message:m,respond:()=>{}}))],now);}return now;}

test('a showcase starts on a fresh claim: the toothpick at the hub, coolant and two pumps paid for, no drill, an empty fund and a bot crew with mechs',()=>{const {r,p}=fresh();
 assert.equal(p.tool,0);assert.equal(r.arc.beat,'dig');assert.ok(r.coolant);assert.equal(r.drill,null);assert.equal(r.site,null);assert.equal(r.fund,0);assert.equal(r.quick,false,'showcase ore pays base rates');
 assert.ok(r.cells.filter(c=>c.pumpBuilt).length>=2);assert.equal(r.cells[Math.floor(p.y)*N+Math.floor(p.x)].row,0);assert.equal(p.lighting,C.lighting.length);
 assert.equal(crewBots(r).length,3);assert.ok(crewBots(r).every(b=>b.tool===MECH));
 const off=createRoom('OFF',1,false,0,true);off.botLevel='off';setupShowcase(off);assert.equal(off.botLevel,S.botLevel,'a showcase always brings its bot crew');});

test('three toothpick taps barely dent the dirt, then a crewmate throws over the mining mech; without taps it arrives after toothpickMs',()=>{
 const {r,p}=fresh(),x=Math.floor(p.x)-1,y=Math.floor(p.y),cell=r.cells[y*N+x],dents=[];let taps=0;
 // Taps at 1.2, 1.6 and 2.0 seconds: one damage each against the topsoil's three, so the third digs a single block.
 const now=run(r,p,{until:20000,make:now=>now>=1200&&taps<3&&now%400===0?(taps++,[{type:'tap',x,y}]):[],done:now=>{if(now===1700)dents.push(cell.damage[p.id],cell.row);return p.tool===MECH;}});
 assert.deepEqual(dents,[2,0],'two taps, two damage, still no hole');assert.equal(p.taps,3);assert.equal(cell.row,1,'three taps dig one block');
 assert.ok(now>2000+S.throwDelayMs&&now<=2000+S.throwDelayMs+200,'the mech came '+now+' ms in');
 const lazy=fresh(8);const at=run(lazy.r,lazy.p,{until:20000,done:()=>lazy.p.tool===MECH});assert.ok(Math.abs(at-S.toothpickMs)<=200,'no taps: the mech came at '+at);});

test('the first mech hole swallows you, and your shaft stays a 3 by 3 all the way down',()=>{const {r,p}=fresh(3),x=Math.floor(p.x)-1,y=Math.floor(p.y),home=Math.floor(p.y)*N+Math.floor(p.x);p.tool=MECH;p.tour.mechAt=0;
 let next=0;run(r,p,{until:30000,make:now=>{if(now<next)return [];next=now+330;return [p.shaft!=null?{type:'tap',x:p.shaft%N,y:Math.floor(p.shaft/N)}:{type:'tap',x,y}];},done:()=>p.shaft!=null&&r.cells[p.shaft].row>=100});
 assert.equal(p.shaft,home,'the claws cut the cell you stand on and you drop into your own hole');const floor=r.cells[p.shaft].row,sx=p.shaft%N,sy=Math.floor(p.shaft/N);
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const row=r.cells[(sy+dy)*N+sx+dx].row;assert.ok(Math.abs(row-floor)<=4,'ring cell at '+row+' beside a floor at '+floor);}
 const far=fresh(4),q=far.p,fx=Math.floor(q.x)-3,fy=Math.floor(q.y);q.tool=MECH;q.tour.mechAt=0;run(far.r,q,{until:3000,make:now=>now===500?[{type:'tap',x:fx,y:fy}]:[],done:()=>q.shaft!=null});
 assert.equal(q.shaft,fy*N+fx,'a first hole further away but in reach swallows you too');
 assert.ok(p.wallet>0&&p.hold.units===0,'showcase ore is paid on the spot');});

test('the crew lays a free conveyor to the shaft you dig and says so once; from then on your ore rides the hoist and the belt to the hub',()=>{const {r,p}=fresh(3),x=Math.floor(p.x)-1,y=Math.floor(p.y);p.tool=MECH;p.tour.mechAt=0;
 const lines=new Set(),capture=()=>{for(const a of r.announcements)if(a.type==='crew')lines.add(a.text);};let next=0,last=p.wallet,dropped=false;
 const now=run(r,p,{until:30000,make:now=>{capture();if(p.wallet<last)dropped=true;last=p.wallet;if(now<next)return [];next=now+330;return [p.shaft!=null?{type:'tap',x:p.shaft%N,y:Math.floor(p.shaft/N)}:{type:'tap',x,y}];},done:()=>{capture();return p.shaft!=null&&r.conveyorLines.some(l=>l.source===p.shaft);}});
 const line=r.conveyorLines.find(l=>l.source===p.shaft);assert.ok(line,'a conveyor line starts at the shaft you dropped into');assert.equal(line.ownerId,p.publicId,'the belt is yours, so its deliveries pay you');
 const end=line.path.at(-1);assert.ok(isDepot(end%N,Math.floor(end/N)),'the belt runs to the hub');assert.ok(!dropped,'the crew pays for the belt, not you');assert.equal(p.beltsBuilt,1);
 assert.equal([...lines].filter(t=>t.startsWith("Belt's on your shaft")).length,1,'the crew says so, once: '+[...lines].join(' | '));
 const wallet=p.wallet;let hoisted=false;run(r,p,{from:now,until:now+20000,make:t=>{capture();if(Object.values(r.piles).some(pile=>pile.lots.some(l=>l.viaHoist&&l.ownerId===p.publicId)))hoisted=true;/* the belt moves the lot off the shaft cell within the same tick */if(t<next)return [];next=t+330;return [{type:'tap',x:p.shaft%N,y:Math.floor(p.shaft/N)}];},done:()=>hoisted&&p.wallet>wallet});
 assert.ok(hoisted,'ore dug down the shaft goes up the hoist onto the belt instead of paying on the spot');assert.ok(p.wallet>wallet,'and arrives in your wallet at the hub');assert.equal(p.hold.units,0,'the hold stays empty');
 assert.equal(r.conveyorLines.filter(l=>l.source===p.shaft).length,1,'one belt per shaft');assert.equal([...lines].filter(t=>/^Belt/.test(t)).length,1,'no second belt line for the same shaft');});

test('a visitor who follows the guide plays every beat in order and reaches the core in two and a half to three minutes',()=>{
 for(const [seed,level] of [[1,'normal'],[2,'normal'],[5,'normal'],[3,'easy'],[4,'hard']]){const {r,p,t}=playShowcase({seed,level,policy:'follow'}),tag=level+' '+seed+' '+JSON.stringify(t);
  const order=['mech','dropped','siteVote','site','rig','boarded','ready','breakerVote','breaker','won'];for(let i=1;i<order.length;i++)assert.ok(t[order[i]]>=t[order[i-1]],order[i]+' before '+order[i-1]+': '+tag);
  assert.ok(t.mech<=8,'toothpick beat: '+tag);assert.ok(t.siteVote-t.dropped>=30&&t.siteVote-t.dropped<=50,'mech beat: '+tag);assert.ok(t.siteRow>=S.siteRow-6,'the shaft reached the magma: '+tag);
  assert.equal(r.site,p.tour.shaft,'the drill goes into the visitor\'s own shaft');assert.ok(t.boarded-t.rig<=8,'board beat: '+tag);
  assert.ok(t.breaker-t.boarded>=35&&t.breaker-t.boarded<=70,'console beat: '+tag);assert.ok(t.won-t.breaker<=C.team.worldBreakerMs/C.tapWindowMs+1,'overdrive: '+tag);
  assert.ok(t.won>=140&&t.won<=185,'whole arc: '+tag);}});

test('a visitor who never touches anything still sees every beat and reaches the core inside three and a half minutes',()=>{
 for(const [seed,level] of [[1,'normal'],[6,'easy'],[7,'hard']]){const {r,p,t}=playShowcase({seed,level,policy:'passive'}),tag=level+' '+seed+' '+JSON.stringify(t);
  assert.ok(Math.abs(t.mech-S.toothpickMs/1000)<=0.2,tag);assert.ok(t.siteVote>=t.mech+S.digMs/1000-0.2&&t.siteVote<=t.mech+S.digCapMs/1000,tag);
  assert.ok(r.cells[r.site].row>=S.minSiteRow,'the crew shaft is deep enough: '+tag);assert.notEqual(r.site,p.tour.shaft);assert.ok(t.boarded!=null,'walked aboard: '+tag);
  assert.ok(r.won&&t.won<=210,'won at '+t.won+': '+tag);}});

test('someone still down the shaft when the vote passes is winched to the rim, and the rig never drops onto anyone',()=>{
 let clear=null;const {r,t}=playShowcase({seed:2,policy:'stay',onTick:(room)=>{if(room.drill&&clear==null){const bore=boreCells(room);clear=!room.players.some(q=>!q.departed&&!q.boarded&&q.shaft!=null&&bore.includes(q.shaft));}}});
 assert.equal(clear,true);assert.ok(t.rig-t.site>=S.haulMs/1000&&t.rig-t.site<=S.haulMs/1000+S.belaySeconds+1,'winched after the grace: '+JSON.stringify(t));assert.ok(r.won);});

test('the crew proposes the World Breaker a few seconds after the fund covers it, unless someone in a seat proposes it first',()=>{
 const follow=playShowcase({seed:4,policy:'follow'}).t,eager=playShowcase({seed:4,policy:'eager'}).t;
 assert.ok(Math.abs(follow.breakerVote-follow.ready-S.proposeDelayMs/1000)<=0.3,JSON.stringify(follow));assert.ok(eager.breakerVote-eager.ready<=0.3,JSON.stringify(eager));assert.ok(eager.won<follow.won);});

test('the bore ore fills the fund toward the World Breaker with an income line that climbs as the drill goes deeper',()=>{const rates=[],funds=[];let price=0;
 const {t}=playShowcase({seed:5,policy:'follow',onTick:(r,p,now)=>{if(r.drill&&!r.worldBreaker&&now%1000===0){rates.push(r.oil.rate||0);funds.push(r.fund);price=breakerPrice(r);}}});
 const working=rates.filter(v=>v>0);assert.ok(working.length>=30,'the drill ran '+working.length+' s before the finale');assert.ok(funds[0]<price*0.05,'the fund starts near empty');assert.ok(funds.at(-1)>=price,'the fund covers the World Breaker');
 const early=working.slice(2,7).reduce((a,b)=>a+b,0)/5,late=working.slice(-5).reduce((a,b)=>a+b,0)/5;assert.ok(late>early*1.5,'income climbs: '+early+' then '+late);
 assert.ok(late*60<price*10,'the per-minute line stays believable next to the price');assert.ok(t.ready-t.rig>=30&&t.ready-t.rig<=60,JSON.stringify(t));});

test('the guide follows the arc: one step per beat, in order, and the words change inside a step as the beat moves on',()=>{const seen=[],copy=new Set();
 playShowcase({seed:1,policy:'follow',onTick:(r,p,now)=>{if(now%500)return;const state=snapshot(r,true),me=state.players.find(q=>q.id==='a'),step=showcaseStep(state,me);seen.push(step);if(step<showcaseGoals.length)for(const touch of [false,true])copy.add(showcaseCopy(step,state,me,touch).join(' | '));}});
 for(let i=1;i<seen.length;i++)assert.ok(seen[i]>=seen[i-1],'the guide went back from '+seen[i-1]+' to '+seen[i]);
 assert.deepEqual([...new Set(seen)].filter(s=>s<showcaseGoals.length),[0,1,2,3,4,5]);const all=[...copy].join('\n');
 for(const words of [/1 damage/,/million taps/,/3x3/,/magma/i,/Vote YES/,/Belay up/,/Board/,/VENT|Space/,/road to the World Breaker/,/World Breaker ready/,/Overdrive/])assert.match(all,words);
 assert.doesNotMatch(all,/[–—]/);});

test('Dig again turns the reset planet into a fresh showcase, back to the toothpick',()=>{const {r,p}=playShowcase({seed:3,policy:'follow'});assert.ok(r.won);
 let now=r.now+C.tickMs;step(r,[{player:p,message:{type:'reset'},respond:()=>{}}],now);for(let i=0;i<3;i++){now+=C.tickMs;step(r,botCommands(r,now),now);}
 assert.equal(r.won,false);assert.equal(r.arc.beat,'dig');assert.equal(r.arc.round,r.round);assert.equal(p.tool,0);assert.equal(p.taps,0);assert.ok(crewBots(r).every(b=>b.tool===MECH));
 assert.ok(r.coolant&&!r.drill&&r.site==null);assert.ok(r.cells.filter(c=>c.pumpBuilt).length>=2);assert.equal(r.drillScale,1);});

test('someone joining after the dig arrives with the mech, and the crew still radios proposals from anywhere',()=>{const {r,p}=playShowcase({seed:6,policy:'follow',limit:70});assert.ok(['board','console'].includes(r.arc.beat),r.arc.beat);
 makeRoomForPerson(r,r.now);const q=join(r,'late','Bo',r.now);q.publicId='b';equipShowcase(r,q,r.now);assert.equal(q.tool,MECH);
 const bot=crewBots(r)[0];bot.boarded=false;[bot.x,bot.y]=[N-1.5,N-1.5];const toasts=[];step(r,[{player:bot,message:{type:'proposeSite',x:1,y:1},respond:m=>toasts.push(m?.text)}],r.now+C.tickMs);
 assert.ok(!toasts.includes('Trade at the hub'),'showcase bots can radio a proposal');
 makeRoomForPerson(r,r.now);const walker=join(r,'w','Cy',r.now);walker.publicId='c';[walker.x,walker.y]=[N-1.5,N-1.5];const replies=[];step(r,[{player:walker,message:{type:'propose',item:'worldBreaker'},respond:m=>replies.push(m?.text)}],r.now+C.tickMs);
 assert.ok(replies.includes('Trade at the hub'),'people still need the hub or a seat');});

test('two people: an idle second visitor is walked aboard too, and the people get the simplest seats (HEAT, then POWER)',()=>{
 for(const second of [0,80000]){const {r,p,t,bo}=playShowcase({seed:3,policy:'follow',second,onTick:(room)=>{if(room.worldBreaker&&!room.checked){room.checked=true;assert.ok(room.players.find(q=>q.publicId==='b')?.boarded,'Bo is aboard for the finale');}}});
  assert.ok(r.won&&t.won<=200,'won at '+t.won);assert.equal(r.site,p.tour.shaft,'the first visitor\'s shaft is the site');assert.equal(bo.tool,MECH);
  const seats=Object.fromEntries(r.players.filter(q=>q.boarded).map(q=>[q.nickname,r.console[q.publicId]?.kind]));assert.equal(seats.Ana,'HEAT');assert.ok(seats.Bo,'Bo has a seat');
  if(!second)assert.equal(seats.Bo,'POWER','with both aboard from the start, the second person gets POWER');}});

test('a crew member aboard the drill can propose from the seat; someone walking far from the hub cannot',()=>{
 const r=createRoom('SHOW',4,false,0,true);setupShowcase(r);r.site=8*N+4;r.drill={index:r.site};r.cells[r.site].row=C.outerRow;const a=join(r,'a','Ana',0),b=join(r,'b','Bo',0);a.publicId='a';b.publicId='b';
 const far=[N-1.5,N-1.5];[a.x,a.y]=far;[b.x,b.y]=far;b.boarded=true;
 const toasts=[];step(r,[{player:a,message:{type:'propose',item:'worldBreaker'},respond:m=>toasts.push(m?.text)}],100);
 assert.equal(r.vote,null);assert.ok(toasts.includes('Trade at the hub'));
 step(r,[{player:b,message:{type:'propose',item:'worldBreaker'},respond:()=>{}}],200);
 assert.ok(r.vote?.item==='worldBreaker'||r.goal?.item==='worldBreaker'||r.worldBreaker,'the seat proposal did not go through');});
