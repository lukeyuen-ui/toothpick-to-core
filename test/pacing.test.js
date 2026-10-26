import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step,gate,within} from '../rules.js';
import {atHub} from '../shaft-rules.js';
import {validPosition} from '../movement-rules.js';
import {home,isDepot} from '../hauling-rules.js';

function steer(bot,x,y,room,add){const p=bot.p,key=x+':'+y,unit=C.pacing.navStep,width=Math.round(C.mapSize/unit),goal=Math.floor(y)*C.mapSize+Math.floor(x);if(bot.routeKey!==key||!bot.route?.length){bot.routeKey=key;const safe=(px,py)=>{if(!validPosition(px,py))return false;const cx=Math.floor(px),cy=Math.floor(py),index=cy*C.mapSize+cx;return index===goal||!room.cells[index]?.row||Math.abs(px-cx-0.5)>=C.shafts.entryRadius||Math.abs(py-cy-0.5)>=C.shafts.entryRadius||index===p.rimCell;},segment=(tx,ty)=>{const n=Math.max(1,Math.ceil(Math.hypot(tx-p.x,ty-p.y)/C.movement.substep));for(let j=1;j<=n;j++)if(!safe(p.x+(tx-p.x)*j/n,p.y+(ty-p.y)*j/n))return false;return true;},parents=new Map(),queue=[];for(let ny=Math.floor(p.y/unit)-2;ny<=Math.ceil(p.y/unit)+2;ny++)for(let nx=Math.floor(p.x/unit)-2;nx<=Math.ceil(p.x/unit)+2;nx++){if(nx<1||ny<1||nx>=width||ny>=width||!safe(nx*unit,ny*unit)||!segment(nx*unit,ny*unit))continue;const id=ny*width+nx;parents.set(id,null);queue.push(id);}let end=null;for(let i=0;i<queue.length;i++){const id=queue[i],cx=id%width,cy=Math.floor(id/width);if(Math.hypot(cx*unit-x,cy*unit-y)<unit/2){end=id;break;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,nid=ny*width+nx;if(nx<1||ny<1||nx>=width||ny>=width||parents.has(nid)||!safe(nx*unit,ny*unit))continue;parents.set(nid,id);queue.push(nid);}}const points=[];while(end!=null){points.push({x:end%width*unit,y:Math.floor(end/width)*unit});end=parents.get(end);}bot.route=points.reverse();}while(bot.route.length&&Math.hypot(p.x-bot.route[0].x,p.y-bot.route[0].y)<C.damageEpsilon)bot.route.shift();const target=bot.route[0];if(!target){add(p,'move',{dx:0,dy:0});return;}const dx=target.x-p.x,dy=target.y-p.y,length=Math.max(Math.hypot(dx,dy),C.mobility[p.mobility].speed*C.tickSeconds);add(p,'move',{dx:dx/length,dy:dy/length});}

export function simulate(seed=C.pacing.seed){
 const room=createRoom('PACE',seed,false,0),bots=[0,1].map(i=>{const p=join(room,'bot'+i,'Bot '+(i+1),0);p.publicId='bot'+i;return {p,work:null,nextTap:0,nextTrade:0};}),timeline={},upgrades=[];
 const record=(name,now)=>{timeline[name]??=now/C.tapWindowMs;};
 for(let now=C.tickMs;now<=C.pacing.maximumSeconds*C.tapWindowMs&&!room.won;now+=C.tickMs){
  const commands=[],add=(p,type,extra={})=>commands.push({player:p,message:{type,...extra}}),bothMech=bots.every(b=>b.p.tool===C.tools.length-1);
  for(const bot of bots){const p=bot.p;add(p,'move',{dx:0,dy:0});
   if(room.vote&&room.vote.voters.includes(p.publicId)&&!room.vote.ballots[p.publicId])add(p,'vote',{yes:true});
   if(p.belay||p.boarding||p.drive||p.returning)continue;
   if(p.boarded){bot.triedDrill=true;if(!room.worldBreaker){add(p,'board');add(p,'returnHome');continue;}else continue;}
   if(room.drill&&!bot.triedDrill){if(p.shaft!=null)add(p,'returnHome');else add(p,'board');continue;}
   const full=p.hold.units>=C.mobility[p.mobility].hold,blocked=p.shaft!=null&&gate(p,room.cells[p.shaft].row,room);
   if(full||blocked){add(p,'returnHome');bot.route=null;if(blocked){bot.work=null;bot.route=null;}continue;}
   if(atHub(p)){
    if(now<bot.nextTrade)continue;bot.nextTrade=now+C.pacing.tradeEveryMs;
    const options=[{kind:'tool',item:C.tools[p.tool+1]},{kind:'mobility',item:C.mobility[p.mobility+1]},...(p.lighting?[]:[{kind:'lighting',item:C.lighting[0]}])].filter(o=>o.item&&p.wallet>=o.item.cost*C.pacing.spare).sort((a,b)=>a.item.cost-b.item.cost);
    if(options.length){add(p,'buy',{kind:options[0].kind});continue;}
    const chipKey=room.goal?.key+':'+p.deliveredValue;if(room.goal&&p.wallet>0&&bot.chipKey!==chipKey){add(p,'chip',{amount:'half'});bot.chipKey=chipKey;continue;}
    if(bothMech&&!room.vote&&!room.goal){if(room.site==null){const deepest=room.cells.reduce((best,c,i)=>c.row>room.cells[best].row?i:best,0);add(p,'proposeSite',{x:deepest%C.mapSize,y:Math.floor(deepest/C.mapSize)});continue;}
     const pump=room.cells.findIndex(c=>c.oilSite&&!c.pumpBuilt);const item=!room.coolant?'coolant':!room.drill?'plasma':pump>=0?'pump':!room.worldBreaker?'worldBreaker':null;
     if(item){add(p,'propose',{item,...(item==='pump'?{index:pump}:{})});continue;}}
    if(room.drill&&!room.goal){add(p,'board');continue;}
   }
   if(bothMech&&room.site==null&&!atHub(p)){add(p,'returnHome');continue;}
   if(room.drill&&!room.goal){if(p.shaft!=null)add(p,'returnHome');else add(p,'board');continue;}
   if(p.shaft!=null){if(p.depth+C.damageEpsilon>=room.cells[p.shaft].row&&now>=bot.nextTap){add(p,'tap',{x:p.shaft%C.mapSize,y:Math.floor(p.shaft/C.mapSize)});bot.nextTap=now+C.pacing.tapEveryMs;}continue;}
   if(bot.work==null||gate(p,room.cells[bot.work].row,room)){let best=null,distance=Infinity;for(let i=0;i<room.cells.length;i++){const x=i%C.mapSize,y=Math.floor(i/C.mapSize);if(isDepot(x,y)||home(x+0.5,y+0.5)||gate(p,room.cells[i].row,room))continue;const d=Math.hypot(x+0.5-p.x,y+0.5-p.y);if(d<distance){distance=d;best=i;}}bot.work=best;}
   if(bot.work==null)continue;const x=bot.work%C.mapSize,y=Math.floor(bot.work/C.mapSize),cell=room.cells[bot.work];
   if(cell.row>C.shafts.surfaceReachRows&&within(p,x,y)){const dx=x+0.5-p.x,dy=y+0.5-p.y,d=Math.hypot(dx,dy);if(d>C.damageEpsilon)steer(bot,x+0.5,y+0.5,room,add);}
   else if(!within(p,x,y)){steer(bot,x+0.5,y+0.5,room,add);}else if(now>=bot.nextTap){bot.route=null;add(p,'move',{dx:0,dy:0});add(p,'tap',{x,y});bot.nextTap=now+C.pacing.tapEveryMs;}
  }
  const prior=bots.map(b=>b.p.tool);step(room,commands,now);
  bots.forEach((b,i)=>{if(b.p.tool>prior[i]){record('first upgrade',now);upgrades.push({bot:i,tool:C.tools[b.p.tool].name,seconds:now/C.tapWindowMs});}if(b.p.tool===C.tools.length-1)record('first mech',now);});
  if(bots.every(b=>b.p.tool===C.tools.length-1))record('both mechs',now);
  if(room.announcements.some(a=>['silver','gold','diamond'].includes(a.type)))record('first find',now);
  if(room.deliveries.some(d=>d.value>C.pacing.largeDelivery))record('first delivery over $1K',now);
  if(bots.some(b=>b.p.boarded))record('first boarding',now);if(room.coolant)record('coolant',now);if(room.drill)record('drill',now);if(room.worldBreaker)record('World Breaker',now);if(room.won)record('core',now);
 }
 return {room,timeline,upgrades,bots};
}
function check(seed,findExpected){const {room,timeline,upgrades}=simulate(seed);console.log('PACING seed '+seed,JSON.stringify({timeline,upgrades}));assert.equal(room.fast,false);assert.equal(room.won,true,'bots must finish without injected money, finds, positions or elapsed time');assert.ok(timeline.core>=C.pacing.minimumSeconds&&timeline.core<=C.pacing.maximumSeconds,JSON.stringify(timeline));assert.ok(timeline.drill<timeline.core*0.6,'drill is near the middle');assert.ok(timeline['first boarding']<timeline['World Breaker']);assert.equal(Math.round((timeline.core-timeline['World Breaker'])*C.tapWindowMs),C.team.worldBreakerMs);if(findExpected)assert.ok(timeline['first find']);}
test('normal-mode two bots reach the core in 20 to 35 minutes through the real 10 Hz rules',()=>check(C.pacing.seed,true));
test('unlucky seed with no early find still finishes inside the pacing window',()=>check(42,false));
