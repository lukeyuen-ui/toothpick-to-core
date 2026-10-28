import {C} from './config.js';
import {join,gate,within} from './rules.js';
import {atHub} from './shaft-rules.js';
import {validPosition} from './movement-rules.js';
import {home,isDepot,holdCapacity} from './hauling-rules.js';
import {lightReach} from './lighting-rules.js';
import {disconnect,expireDepartures} from './presence-rules.js';
import {equipShowcase} from './showcase-rules.js';

// Computer crewmates fill the empty seats so a solo player still has a crew. They send the same messages a person does,
// at a chosen skill: slower hands, later upgrades, looser tuning and the odd pause keep them helpful without playing the game for you.
export const BOT_LEVELS=['off','easy','normal','hard'];
const brains=new WeakMap();
export const people=room=>room.players.filter(p=>!p.bot&&!p.departed);
export const crewBots=room=>room.players.filter(p=>p.bot&&!p.departed);
function removeBot(room,bot,now){disconnect(room,bot,now);bot.leaveAt=now;expireDepartures(room,now);brains.delete(bot);}

// A person joining a full room takes a bot's seat.
export function makeRoomForPerson(room,now){const seated=room.players.filter(p=>!p.departed).length,bot=crewBots(room).pop();if(seated>=C.maxPlayers&&bot)removeBot(room,bot,now);}

// Keep the crew at four: bots fill seats people leave empty, and leave once every person has gone.
export function fillBots(room,now){const level=C.bots.levels[room.botLevel],humans=people(room);let bots=crewBots(room);
 if(!level||!humans.length){for(const b of bots)removeBot(room,b,now);return;}
 const want=Math.max(0,C.maxPlayers-humans.length);while(bots.length>want)removeBot(room,bots.pop(),now);
 while(bots.length<want){const used=new Set(room.players.filter(p=>!p.departed).map(p=>p.nickname)),name=(C.bots.names.find(n=>!used.has(n+C.bots.suffix))||'Crew')+C.bots.suffix;room.botSerial=(room.botSerial||0)+1;let p;try{p=join(room,'bot-'+room.code+'-'+room.botSerial,name,now);}catch{break;}p.publicId='bot-'+room.botSerial;p.bot=true;equipShowcase(room,p);bots.push(p);}}

export function botCommands(room,now){const out=[],L=C.bots.levels[room.botLevel];if(!L||room.won)return out;const bots=crewBots(room);
 for(const p of bots){let b=brains.get(p);if(!b){b={work:null,route:null,routeKey:null,nextTap:0,nextTrade:0,nextTune:0,napUntil:0,voteAt:null,chipKey:null};brains.set(p,b);}
  const rider=bots[bots.length-1],planner=bots.find(q=>q.tool===C.tools.length-1);try{think(room,p,b,L,now,{rider:rider===p,planner:planner===p},(type,extra={})=>out.push({player:p,message:{type,...extra}}));}catch{b.route=null;b.work=null;}}
 return out;}

function think(room,p,b,L,now,role,add){add('move',{dx:0,dy:0});
 if(room.vote&&room.vote.voters.includes(p.publicId)&&!room.vote.ballots[p.publicId]){b.voteAt??=now+L.voteDelayMs*(0.5+Math.random());if(now>=b.voteAt){add('vote',{yes:true});b.voteAt=null;}}else b.voteAt=null;
 if(now<b.napUntil)return;if(Math.random()<L.napChance){b.napUntil=now+L.napMs*(0.5+Math.random());return;}
 if(p.belay||p.boarding||p.drive||p.returning)return;
 if(room.showcase){showcaseCrew(room,p,b,L,now,add);return;}
 const hasMech=p.tool===C.tools.length-1,pumps=room.cells.some(c=>c.pumpBuilt),crewWanted=!!room.drill&&(!!room.worldBreaker||people(room).some(h=>h.boarded&&h.connected)||(role.rider&&pumps));
 // Proposals work from anywhere, even the drill seat: the bot with the mech moves the team through site, coolant, drill, pumps and the finale.
 if(role.planner&&!room.vote&&!room.goal&&now>=(b.nextPropose||0)){b.nextPropose=now+L.voteDelayMs;if(room.site==null){const deepest=room.cells.reduce((best,c,i)=>c.row>room.cells[best].row?i:best,0);add('proposeSite',{x:deepest%C.mapSize,y:Math.floor(deepest/C.mapSize)});return;}
  const pump=room.cells.findIndex(c=>c.oilSite&&!c.pumpBuilt),item=!room.coolant?'coolant':!room.drill?'plasma':pump>=0?'pump':!room.worldBreaker?'worldBreaker':null;if(item){add('propose',{item,...(item==='pump'?{index:pump}:{})});return;}}
 if(p.boarded){if(!crewWanted){add('board');return;}const g=room.console?.[p.publicId];if(g)workSeat(g,b,L,now,add);return;}
 if(crewWanted){if(p.shaft!=null)add('returnHome');else add('board');return;}
 const full=p.hold.units>=holdCapacity(p),blocked=p.shaft!=null&&(gate(p,room.cells[p.shaft].row,room)||room.cells[p.shaft].row>lightReach(room,p));
 if(full||blocked){add('returnHome');b.route=null;if(blocked)b.work=null;return;}
 if(atHub(p)){
  if(now>=b.nextTrade){b.nextTrade=now+L.tradeEveryMs;const options=[{kind:'pods',item:C.cargoPods[p.pods]},{kind:'tool',item:C.tools[p.tool+1]},{kind:'mobility',item:C.mobility[p.mobility+1]},{kind:'lighting',item:C.lighting[p.lighting]}].filter(o=>o.item&&p.wallet>=o.item.cost*L.spare).sort((a,c)=>a.item.cost-c.item.cost);if(options.length){add('buy',{kind:options[0].kind});return;}}
  const chipKey=room.goal?.key+':'+p.deliveredValue;if(room.goal&&p.wallet>0&&b.chipKey!==chipKey){add('chip',{amount:'half'});b.chipKey=chipKey;return;}
}
 const upgrade=[C.cargoPods[p.pods],C.tools[p.tool+1],C.mobility[p.mobility+1],C.lighting[p.lighting]].some(item=>item&&p.wallet>=item.cost*L.spare),pending=!room.vote&&!room.goal&&(room.site==null||!room.coolant||!room.drill||!room.worldBreaker);
 if(!atHub(p)&&now>=(b.nextShop||0)&&(upgrade||(room.goal&&p.wallet>0&&b.chipKey!==room.goal.key+':'+p.deliveredValue))){b.nextShop=now+L.tradeEveryMs*4;b.route=null;add('returnHome');return;}
 if(p.shaft!=null){if(p.depth+C.damageEpsilon>=room.cells[p.shaft].row&&now>=b.nextTap){add('tap',{x:p.shaft%C.mapSize,y:Math.floor(p.shaft/C.mapSize)});b.nextTap=now+L.tapEveryMs*(0.8+0.4*Math.random());}return;}
 if(b.work==null||(room.drill&&b.work===room.site)||gate(p,room.cells[b.work].row,room)||room.cells[b.work].row>lightReach(room,p,b.work)){let best=null,distance=Infinity;for(let i=0;i<room.cells.length;i++){const x=i%C.mapSize,y=Math.floor(i/C.mapSize);if(isDepot(x,y)||home(x+0.5,y+0.5)||(room.site!=null&&i===room.site)||gate(p,room.cells[i].row,room)||room.cells[i].row>lightReach(room,p,i))continue;const d=Math.hypot(x+0.5-p.x,y+0.5-p.y)+Math.random()*C.bots.wander;if(d<distance){distance=d;best=i;}}b.work=best;}
 if(b.work==null)return;const x=b.work%C.mapSize,y=Math.floor(b.work/C.mapSize),cell=room.cells[b.work];
 if(cell.row>C.shafts.surfaceReachRows&&within(p,x,y)){if(Math.max(Math.abs(Math.floor(p.x)-x),Math.abs(Math.floor(p.y)-y))<=1){b.route=null;add('move',{dx:0,dy:0});add('belayDown',{x,y});}else steer(b,p,x+0.5,y+0.5,room,add);}
 else if(!within(p,x,y))steer(b,p,x+0.5,y+0.5,room,add);
 else if(now>=b.nextTap){b.route=null;add('move',{dx:0,dy:0});add('tap',{x,y});b.nextTap=now+L.tapEveryMs*(0.8+0.4*Math.random());}}

// In a showcase the director (showcase-rules.js) makes every proposal and the bots are its crew. Before the rig each digs a crew shaft picked by its seat
// (the first bot waits by the newcomer until the mech changes hands); while the site is chosen they climb out and hold still; once the rig is in they
// board and work their seats.
function showcaseCrew(room,p,b,L,now,add){const S=C.showcase,N=C.mapSize;
 if(p.boarded){const g=room.console?.[p.publicId];if(g)workSeat(g,b,L,now,add);return;}
 if(room.drill){add(p.shaft!=null?'belay':'board');return;}
 if(room.arc?.beat!=='dig'){if(p.shaft!=null)add('belay');return;}
 if(crewBots(room)[0]===p&&people(room).some(h=>h.connected&&h.tool===0))return;
 const spot=S.crewShafts[p.seat];if(!spot)return;const [x,y]=spot,cell=room.cells[y*N+x];
 if(p.shaft!=null){const floor=room.cells[p.shaft].row;if(floor<S.crewRow&&p.depth+C.damageEpsilon>=floor&&now>=b.nextTap){add('tap',{x:p.shaft%N,y:Math.floor(p.shaft/N)});b.nextTap=now+L.tapEveryMs*(0.8+0.4*Math.random());}return;}
 if(cell.row>C.shafts.surfaceReachRows){if(Math.max(Math.abs(Math.floor(p.x)-x),Math.abs(Math.floor(p.y)-y))<=1){b.route=null;add('belayDown',{x,y});}else steer(b,p,x+0.5,y+0.5,room,add);}
 else if(!within(p,x,y))steer(b,p,x+0.5,y+0.5,room,add);
 else if(now>=b.nextTap){b.route=null;add('tap',{x,y});b.nextTap=now+L.tapEveryMs*(0.8+0.4*Math.random());}}

// Each bot plays its seat the way a person might, late and loose by skill: HEAT vents only once the needle is already high and sometimes twice,
// PRESSURE opens the valve when high and lets go late, ALIGN grips both pads but slips off now and then, POWER chases the target band with lag and a shaky hand.
export function workSeat(g,b,L,now,add){const d=g.v-0.5,ready=now>=b.nextTune,later=()=>{b.nextTune=now+L.tuneEveryMs*(0.7+0.6*Math.random());};if(b.seat!==g){b.seat=g;b.level=g.level;b.gripAt=0;}
 if(g.kind==='HEAT'){if(d>L.tuneAt&&ready){add('tune');if(Math.random()<L.fumble)add('tune');later();}return;}
 if(g.kind==='PRESSURE'){if(ready&&(g.hold?d<-L.letGo:d>L.tuneAt)){add('tune',{hold:!g.hold});later();}return;}
 // A slipped ALIGN grip comes back when the slip is over, or sooner once the axes visibly fly apart.
 if(g.kind==='ALIGN'){if(g.hold&&Math.random()<L.slip){add('tune',{hold:false});b.gripAt=now+L.slipMs*(0.5+Math.random());}else if(!g.hold&&(now>=b.gripAt||Math.abs(d)>L.tuneAt+0.05))add('tune',{hold:true});return;}
 if(g.kind==='POWER'){b.level=Math.min(1,Math.max(0,b.level+(g.target-b.level)*L.follow+(Math.random()-0.5)*L.shake));add('tune',{level:Math.round(b.level*1000)/1000});}}

// Grid path search around open holes (the same walker the pacing simulations use).
function steer(b,p,x,y,room,add){const key=x+':'+y,unit=C.pacing.navStep,width=Math.round(C.mapSize/unit),goal=Math.floor(y)*C.mapSize+Math.floor(x);
 if(b.routeKey!==key||!b.route?.length){b.routeKey=key;const safe=(px,py)=>{if(!validPosition(px,py,room))return false;const cx=Math.floor(px),cy=Math.floor(py),index=cy*C.mapSize+cx;return index===goal||!room.cells[index]?.row||Math.abs(px-cx-0.5)>=C.shafts.entryRadius||Math.abs(py-cy-0.5)>=C.shafts.entryRadius||index===p.rimCell;},segment=(tx,ty)=>{const n=Math.max(1,Math.ceil(Math.hypot(tx-p.x,ty-p.y)/C.movement.substep));for(let j=1;j<=n;j++)if(!safe(p.x+(tx-p.x)*j/n,p.y+(ty-p.y)*j/n))return false;return true;},parents=new Map(),queue=[];
  for(let ny=Math.floor(p.y/unit)-2;ny<=Math.ceil(p.y/unit)+2;ny++)for(let nx=Math.floor(p.x/unit)-2;nx<=Math.ceil(p.x/unit)+2;nx++){if(nx<1||ny<1||nx>=width||ny>=width||!safe(nx*unit,ny*unit)||!segment(nx*unit,ny*unit))continue;const id=ny*width+nx;parents.set(id,null);queue.push(id);}
  let end=null;for(let i=0;i<queue.length;i++){const id=queue[i],cx=id%width,cy=Math.floor(id/width);if(Math.hypot(cx*unit-x,cy*unit-y)<unit/2){end=id;break;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,nid=ny*width+nx;if(nx<1||ny<1||nx>=width||ny>=width||parents.has(nid)||!safe(nx*unit,ny*unit))continue;parents.set(nid,id);queue.push(nid);}}
  const points=[];while(end!=null){points.push({x:end%width*unit,y:Math.floor(end/width)*unit});end=parents.get(end);}b.route=points.reverse();}
 while(b.route.length&&Math.hypot(p.x-b.route[0].x,p.y-b.route[0].y)<C.damageEpsilon)b.route.shift();const target=b.route[0];if(!target){add('move',{dx:0,dy:0});b.work=null;return;}
 const dx=target.x-p.x,dy=target.y-p.y,length=Math.max(Math.hypot(dx,dy),C.mobility[p.mobility].speed*C.tickSeconds);add('move',{dx:dx/length,dy:dy/length});}
