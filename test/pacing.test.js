import {lightReach} from '../lighting-rules.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step,gate,within,validCell} from '../rules.js';
import {atHub} from '../shaft-rules.js';
import {validPosition,overPit,isShaft} from '../movement-rules.js';
import {machineAt} from '../obstacles.js';
import {home,isDepot,holdCapacity} from '../hauling-rules.js';
import {operate} from './console-play.js';
import {landlocked} from '../bot-rules.js';

function steer(bot,x,y,room,add,now=0,hop=false){const p=bot.p,key=x+':'+y,unit=C.pacing.navStep,width=Math.round(C.mapSize/unit),goal=Math.floor(y)*C.mapSize+Math.floor(x);if(bot.routeKey!==key||!bot.route?.length){bot.routeKey=key;bot.noRoute=false;const gx=goal%C.mapSize,gy=Math.floor(goal/C.mapSize),dug=isShaft(room.cells[goal]),arrived=(px,py)=>dug?Math.max(Math.abs(Math.floor(px)-gx),Math.abs(Math.floor(py)-gy))<=1:Math.hypot(px-x,py-y)<unit/2,safe=(px,py)=>{if(!validPosition(px,py,room))return false;const index=Math.floor(py)*C.mapSize+Math.floor(px);return index===p.rimCell||!overPit(room,px,py);},segment=(tx,ty)=>{const n=Math.max(1,Math.ceil(Math.hypot(tx-p.x,ty-p.y)/C.movement.substep));for(let j=1;j<=n;j++)if(!safe(p.x+(tx-p.x)*j/n,p.y+(ty-p.y)*j/n))return false;return true;},parents=new Map(),queue=[];for(let ny=Math.floor(p.y/unit)-2;ny<=Math.ceil(p.y/unit)+2;ny++)for(let nx=Math.floor(p.x/unit)-2;nx<=Math.ceil(p.x/unit)+2;nx++){if(nx<1||ny<1||nx>=width||ny>=width||!safe(nx*unit,ny*unit)||!segment(nx*unit,ny*unit))continue;const id=ny*width+nx;parents.set(id,null);queue.push(id);}let end=null,closest=null,near=Infinity;for(let i=0;i<queue.length;i++){const id=queue[i],cx=id%width,cy=Math.floor(id/width);if(arrived(cx*unit,cy*unit)){end=id;break;}const far=Math.hypot(cx*unit-x,cy*unit-y);if(far<near){near=far;closest=id;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,nid=ny*width+nx;if(nx<1||ny<1||nx>=width||ny>=width||parents.has(nid)||!safe(nx*unit,ny*unit))continue;parents.set(nid,id);queue.push(nid);}}if(end==null){bot.noRoute=true;end=closest;}const points=[];while(end!=null){points.push({x:end%width*unit,y:Math.floor(end/width)*unit});end=parents.get(end);}bot.route=points.reverse();}while(bot.route.length&&Math.hypot(p.x-bot.route[0].x,p.y-bot.route[0].y)<C.damageEpsilon)bot.route.shift();const target=bot.route[0];if(!target){add(p,'move',{dx:0,dy:0});if(bot.noRoute&&hop&&planHop(room,bot,goal))return;(bot.unreachable??={})[goal]=now+C.bots.unreachableMs;bot.work=null;return;}const dx=target.x-p.x,dy=target.y-p.y,length=Math.max(Math.hypot(dx,dy),C.mobility[p.mobility].speed*C.tickSeconds);add(p,'move',{dx:dx/length,dy:dy/length});}

// The same shaft hop and walk home as bot-rules.js, for these harness bots.
function planHop(room,bot,goal){const p=bot.p;if((bot.hops||0)>=C.bots.maxHops||p.shaft!=null)return false;const N=C.mapSize,bx=Math.floor(p.x),by=Math.floor(p.y),gx=goal%N+0.5,gy=Math.floor(goal/N)+0.5,now=Math.hypot(p.x-gx,p.y-gy);let best=null;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=bx+dx,ny=by+dy;if(!validCell(nx,ny)||isDepot(nx,ny))continue;const i=ny*N+nx;if(!isShaft(room.cells[i])||(room.drill&&i===room.site)||machineAt(room,nx,ny))continue;const l=Math.hypot(dx,dy),ux=dx/l,uy=dy/l,d=Math.hypot(nx+0.5+ux*2-gx,ny+0.5+uy*2-gy);if(d>=now-0.25)continue;if(!best||d<best.d)best={shaft:i,dx:ux,dy:uy,d};}if(!best)return false;bot.hop={shaft:best.shaft,dx:best.dx,dy:best.dy,goal,phase:null,before:now};bot.hops=(bot.hops||0)+1;bot.route=null;return true;}
function hopStep(room,bot,now,add){const p=bot.p,h=bot.hop,N=C.mapSize;if(p.shaft===h.shaft){if(h.phase!=='up'){add(p,'belay',{dx:h.dx,dy:h.dy});h.phase='up';}return true;}if(p.shaft!=null){add(p,'belay');bot.hop=null;return true;}if(h.phase==='up'){bot.hop=null;const after=Math.hypot(p.x-(h.goal%N+0.5),p.y-(Math.floor(h.goal/N)+0.5));if(after>h.before-0.5)(bot.unreachable??={})[h.goal]=now+C.bots.unreachableMs;return false;}if(h.phase==='down'){bot.hop=null;(bot.unreachable??={})[h.goal]=now+C.bots.unreachableMs;return false;}add(p,'belayDown',{x:h.shaft%N,y:Math.floor(h.shaft/N)});h.phase='down';return true;}
function goHome(room,bot,add,now){const p=bot.p;bot.route=null;if(p.shaft!=null||home(p.x,p.y)){add(p,'returnHome');return;}const N=C.mapSize;let best=null,distance=Infinity;for(const [cx,cy] of C.hauling.depotCells)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=cx+dx,y=cy+dy;if(!validCell(x,y)||isDepot(x,y)||isShaft(room.cells[y*N+x])||!validPosition(x+0.5,y+0.5,room)||((bot.unreachable||{})[y*N+x]||0)>now)continue;const d=Math.hypot(x+0.5-p.x,y+0.5-p.y);if(d<distance){distance=d;best={x,y};}}if(!best){add(p,'returnHome');return;}steer(bot,best.x+0.5,best.y+0.5,room,add,now,true);}

export function simulate(seed=C.pacing.seed,count=2,{quick=false,hardcore=false,seconds=hardcore?C.hardcore.maximumSeconds:C.pacing.maximumSeconds}={}){
 const room=createRoom('PACE',seed,false,0,quick,hardcore),bots=Array.from({length:count},(_,i)=>{const p=join(room,'bot'+i,'Bot '+(i+1),0);p.publicId='bot'+i;return {p,work:null,nextTap:0,nextTrade:0};}),timeline={},upgrades=[];
 const record=(name,now)=>{timeline[name]??=now/C.tapWindowMs;};
 for(let now=C.tickMs,end=seconds*C.tapWindowMs;now<=end&&!room.won;now+=C.tickMs){
  const commands=[],add=(p,type,extra={})=>commands.push({player:p,message:{type,...extra}}),bothMech=bots.every(b=>b.p.tool===C.tools.length-1);
  for(const bot of bots){const p=bot.p;add(p,'move',{dx:0,dy:0});
   if(room.vote&&room.vote.voters.includes(p.publicId)&&!room.vote.ballots[p.publicId])add(p,'vote',{yes:true});
   if(p.belay||p.boarding||p.drive||p.returning)continue;
   if(bot.hop&&hopStep(room,bot,now,add))continue;
   // The crew stays aboard: hand tools stop at the lower mantle and nothing passes the magma until the World Breaker runs, so the rig is the road to the core. Proposals work
   // from the seat. With no pump built yet the rig cannot turn, so the crew goes back to digging until someone strikes oil.
   const starved=!!room.drill&&!room.worldBreaker&&!room.cells.some(c=>c.pumpBuilt);
   if(p.boarded){bot.triedDrill=true;if(starved){add(p,'board');add(p,'returnHome');continue;}if(bothMech&&!room.vote&&!room.goal&&now>=bot.nextTrade){bot.nextTrade=now+C.pacing.tradeEveryMs;const pump=room.cells.findIndex(c=>c.oilSite&&!c.pumpBuilt),item=!room.coolant?'coolant':pump>=0?'pump':!room.worldBreaker&&room.cells[room.site].row>=C.outerRow?'worldBreaker':null;if(item)add(p,'propose',{item,...(item==='pump'?{index:pump}:{})});}continue;}
   if(room.drill&&!bot.triedDrill&&!starved){if(p.shaft!=null)add(p,'returnHome');else add(p,'board');continue;}
   const full=p.hold.units>=holdCapacity(p),blocked=p.shaft!=null&&(gate(p,room.cells[p.shaft].row,room)||room.cells[p.shaft].row>lightReach(room,p));
   if(full||blocked){goHome(room,bot,add,now);if(blocked)bot.work=null;continue;}
   if(atHub(p)){
    if(now<bot.nextTrade)continue;bot.nextTrade=now+C.pacing.tradeEveryMs;
    const options=[{kind:'pods',item:C.cargoPods[p.pods]},{kind:'tool',item:C.tools[p.tool+1]},{kind:'mobility',item:C.mobility[p.mobility+1]},{kind:'lighting',item:C.lighting[p.lighting]}].filter(o=>o.item&&p.wallet>=o.item.cost*C.pacing.spare).sort((a,b)=>a.item.cost-b.item.cost);
    if(options.length){add(p,'buy',{kind:options[0].kind});continue;}
    const chipKey=room.goal?.key+':'+p.deliveredValue;if(room.goal&&p.wallet>0&&bot.chipKey!==chipKey){add(p,'chip',{amount:'half'});bot.chipKey=chipKey;continue;}
    if(bothMech&&!room.vote&&!room.goal){if(room.site==null){const deepest=room.cells.reduce((best,c,i)=>c.row>room.cells[best].row?i:best,0);add(p,'proposeSite',{x:deepest%C.mapSize,y:Math.floor(deepest/C.mapSize)});continue;}
     const pump=room.cells.findIndex(c=>c.oilSite&&!c.pumpBuilt);const item=!room.coolant?'coolant':!room.drill?'plasma':pump>=0?'pump':!room.worldBreaker&&room.cells[room.site].row>=C.outerRow?'worldBreaker':null;
     if(item){add(p,'propose',{item,...(item==='pump'?{index:pump}:{})});continue;}}
    if(room.drill&&!room.goal&&!starved){add(p,'board');continue;}
   }
   if(bothMech&&room.site==null&&!atHub(p)){goHome(room,bot,add,now);continue;}
   if(room.drill&&!room.goal&&!starved){if(p.shaft!=null)add(p,'returnHome');else add(p,'board');continue;}
   if(p.shaft!=null){if(p.depth+C.damageEpsilon>=room.cells[p.shaft].row&&now>=bot.nextTap){add(p,'tap',{x:p.shaft%C.mapSize,y:Math.floor(p.shaft/C.mapSize)});bot.nextTap=now+C.pacing.tapEveryMs;}continue;}
   if(bot.work==null||(room.drill&&bot.work===room.site)||gate(p,room.cells[bot.work].row,room)||room.cells[bot.work].row>lightReach(room,p,bot.work)||landlocked(room,bot.work)){let best=null,distance=Infinity;for(let i=0;i<room.cells.length;i++){const x=i%C.mapSize,y=Math.floor(i/C.mapSize);if(isDepot(x,y)||home(x+0.5,y+0.5)||(room.drill&&i===room.site)||gate(p,room.cells[i].row,room)||room.cells[i].row>lightReach(room,p,i)||((bot.unreachable||{})[i]||0)>now||landlocked(room,i))continue;const d=Math.hypot(x+0.5-p.x,y+0.5-p.y);if(d<distance){distance=d;best=i;}}bot.work=best;bot.hops=0;}
   if(bot.work==null)continue;const x=bot.work%C.mapSize,y=Math.floor(bot.work/C.mapSize),cell=room.cells[bot.work];
   if(cell.row>C.shafts.surfaceReachRows&&within(p,x,y)){if(Math.max(Math.abs(Math.floor(p.x)-x),Math.abs(Math.floor(p.y)-y))<=1){bot.route=null;add(p,'move',{dx:0,dy:0});add(p,'belayDown',{x,y});}else steer(bot,x+0.5,y+0.5,room,add,now,true);}
   else if(!within(p,x,y)){steer(bot,x+0.5,y+0.5,room,add,now,true);}else if(now>=bot.nextTap){bot.route=null;add(p,'move',{dx:0,dy:0});add(p,'tap',{x,y});bot.nextTap=now+C.pacing.tapEveryMs;}
  }
  commands.push(...operate(room));const prior=bots.map(b=>b.p.tool);step(room,commands,now);
  bots.forEach((b,i)=>{if(b.p.tool>prior[i]){record('first upgrade',now);upgrades.push({bot:i,tool:C.tools[b.p.tool].name,seconds:now/C.tapWindowMs});}if(b.p.tool===C.tools.length-1)record('first mech',now);});
  if(bots.every(b=>b.p.tool===C.tools.length-1))record('both mechs',now);
  if(room.announcements.some(a=>['silver','gold','diamond'].includes(a.type)))record('first find',now);
  if(room.deliveries.some(d=>d.value>C.pacing.largeDelivery))record('first delivery over $1K',now);
  if(bots.some(b=>b.p.boarded))record('first boarding',now);if(room.coolant)record('coolant',now);if(room.drill)record('drill',now);if(room.worldBreaker)record('World Breaker',now);if(room.won)record('core',now);
 }
 return {room,timeline,upgrades,bots};
}
function check(seed,findExpected,count=2,quick=false,hardcore=false){const {room,timeline,upgrades}=simulate(seed,count,{quick,hardcore});console.log((hardcore?'HARDCORE':quick?'QUICK':'PACING')+' '+count+' players seed '+seed,JSON.stringify({timeline,upgrades}));assert.equal(room.fast,false);if(!room.won)console.log('UNFINISHED',JSON.stringify({fund:room.fund,fundIncome:room.fundIncome,goal:room.goal,vote:room.vote,site:room.site,siteRow:room.site!=null?room.cells[room.site].row:null,drill:!!room.drill,wb:!!room.worldBreaker,coolant:room.coolant,oil:room.oil,pumps:room.cells.filter(c=>c.pumpBuilt).length,players:room.players.map(p=>({n:p.nickname,boarded:p.boarded,boarding:p.boarding,shaft:p.shaft,depth:p.depth,wallet:Math.round(p.wallet),hold:p.hold?.units,x:+p.x.toFixed(1),y:+p.y.toFixed(1),tool:p.tool}))}));assert.equal(room.won,true,'bots must finish without injected money, finds, positions or elapsed time');{const [low,high]=hardcore?[C.hardcore.minimumSeconds,C.hardcore.maximumSeconds]:quick?[C.quickMinimumSeconds,C.quickMaximumSeconds]:[C.pacing.minimumSeconds,C.pacing.maximumSeconds];assert.ok(timeline.core>=low&&timeline.core<=high,JSON.stringify(timeline));}if(!quick)assert.ok(timeline.drill<timeline.core*0.95,'the drill lands before the last twentieth: the rig phase is short and fast');/* these bots never ride: after the drill they mech-dig for the World Breaker for a few minutes; riders (yield 20 per bore cell) get there sooner */assert.equal(room.quick,quick);assert.equal(room.hardcore,hardcore);assert.ok(timeline['first boarding']<timeline['World Breaker']);{const overdrive=Math.round((timeline.core-timeline['World Breaker'])*C.tapWindowMs);assert.ok(overdrive<=C.team.worldBreakerMs&&overdrive>=C.team.worldBreakerMs/(1+C.console.overdriveBonus)-C.tickMs,'overdrive lasts between an all-green crew and nobody aboard: '+overdrive);}if(findExpected)assert.ok(timeline['first find']);}
test('normal-mode two bots reach the core in 14 to 35 minutes through the real 10 Hz rules',()=>check(C.pacing.seed,true));
test('a second deterministic deposit layout still finishes inside the pacing window',()=>check(42,false));

test('solo pooling seed 5 reaches the core inside the pacing window',()=>check(5,true,1));
test('solo pooling seed 42 reaches the core inside the pacing window',()=>check(42,true,1));

for(const count of [2,1])for(const seed of [5,42])test(`Quick ${count} explorers seed ${seed} finishes in four to nine minutes`,()=>check(seed,false,count,true));

// Hardcore (C.hardcore): far tougher rock and far poorer ore at the same prices. These bots need about two weeks of nonstop play, which takes about a minute
// of simulation per run, so the default suite checks the first day only. PACING_FULL=1 node --test test/pacing.test.js runs the four full expeditions.
test('Hardcore: the starting wallet buys the first tools at once, and the first day reaches granite without stalling at a light gate',()=>{
 for(const [count,seed] of [[2,5],[1,42]]){const {room,timeline}=simulate(seed,count,{hardcore:true,seconds:24*3600});assert.equal(room.hardcore,true);assert.equal(room.won,false);
  assert.ok(timeline['first upgrade']<=3600,'first upgrade inside the first hour: '+timeline['first upgrade']);
  for(const p of room.players)assert.ok(p.tool>=2&&p.lighting>=2&&p.pods>=1&&p.mobility>=1,'Trowel, Floodlamp, a pod and servos on day one: '+JSON.stringify({tool:p.tool,lighting:p.lighting,pods:p.pods,mobility:p.mobility}));
  assert.ok(room.deepest>=C.graniteRow,'down to granite on day one: row '+room.deepest);}});
const fullHardcore=process.env.PACING_FULL==='1'?false:'about two weeks of play each: run with PACING_FULL=1';
for(const count of [2,1])for(const seed of [5,42])test(`Hardcore ${count} explorers seed ${seed} reaches the core in about two weeks`,{skip:fullHardcore},()=>check(seed,true,count,false,true));
