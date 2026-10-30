import {C} from './config.js';
import {join,gate,within,validCell,liveWell} from './rules.js';
import {atHub} from './shaft-rules.js';
import {validPosition,overPit,isShaft} from './movement-rules.js';
import {machineAt} from './obstacles.js';
import {home,isDepot,holdCapacity} from './hauling-rules.js';
import {lightReach} from './lighting-rules.js';
import {disconnect,expireDepartures} from './presence-rules.js';
import {equipShowcase,crewCap} from './showcase-rules.js';

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

function think(room,p,b,L,now,role,add){add('move',{dx:0,dy:0});b.unreachable??={};
 if(room.vote&&room.vote.voters.includes(p.publicId)&&!room.vote.ballots[p.publicId]){b.voteAt??=now+L.voteDelayMs*(0.5+Math.random());if(now>=b.voteAt){add('vote',{yes:true});b.voteAt=null;}}else b.voteAt=null;
 if(now<b.napUntil)return;if(Math.random()<L.napChance){b.napUntil=now+L.napMs*(0.5+Math.random());return;}
 if(p.belay||p.boarding||p.drive||p.returning)return;
 if(b.hop&&hopStep(room,p,b,now,add))return;
 if(room.showcase){showcaseCrew(room,p,b,L,now,add);return;}
 // The crew rides while a well is live (or the World Breaker runs); a starved rig cannot turn, so the crew gets off and digs for oil.
 const hasMech=p.tool===C.tools.length-1,fueled=room.cells.some(liveWell),crewWanted=!!room.drill&&(!!room.worldBreaker||(fueled&&(people(room).some(h=>h.boarded&&h.connected)||role.rider)));
 // Proposals work from anywhere, even the drill seat: the bot with the mech moves the team through site, coolant, drill, pumps and the finale.
 if(role.planner&&!room.vote&&!room.goal&&now>=(b.nextPropose||0)){b.nextPropose=now+L.voteDelayMs;if(room.site==null){const deepest=room.cells.reduce((best,c,i)=>c.row>room.cells[best].row?i:best,0);add('proposeSite',{x:deepest%C.mapSize,y:Math.floor(deepest/C.mapSize)});return;}
  const pump=room.cells.findIndex(c=>c.oilSite&&!c.pumpBuilt),item=!room.coolant?'coolant':!room.drill?'plasma':pump>=0?'pump':!room.worldBreaker&&room.cells[room.site].row>=C.outerRow?'worldBreaker':null;if(item){add('propose',{item,...(item==='pump'?{index:pump}:{})});return;}}
 if(p.boarded){if(!crewWanted){add('board');return;}const g=room.console?.[p.publicId];if(g)workSeat(g,b,L,now,add);return;}
 if(crewWanted){if(p.shaft!=null)add('returnHome');else add('board');return;}
 const full=p.hold.units>=holdCapacity(p),blocked=p.shaft!=null&&(gate(p,room.cells[p.shaft].row,room)||room.cells[p.shaft].row>lightReach(room,p));
 if(full||blocked){goHome(room,p,b,add,now);if(blocked)b.work=null;return;}
 if(atHub(p)){
  if(now>=b.nextTrade){b.nextTrade=now+L.tradeEveryMs;const options=[{kind:'pods',item:C.cargoPods[p.pods]},{kind:'tool',item:C.tools[p.tool+1]},{kind:'mobility',item:C.mobility[p.mobility+1]},{kind:'lighting',item:C.lighting[p.lighting]}].filter(o=>o.item&&p.wallet>=o.item.cost*L.spare).sort((a,c)=>a.item.cost-c.item.cost);if(options.length){add('buy',{kind:options[0].kind});return;}}
  const chipKey=room.goal?.key+':'+p.deliveredValue;if(room.goal&&p.wallet>0&&b.chipKey!==chipKey){add('chip',{amount:'half'});b.chipKey=chipKey;return;}
}
 const upgrade=[C.cargoPods[p.pods],C.tools[p.tool+1],C.mobility[p.mobility+1],C.lighting[p.lighting]].some(item=>item&&p.wallet>=item.cost*L.spare),pending=!room.vote&&!room.goal&&(room.site==null||!room.coolant||!room.drill||!room.worldBreaker);
 if(!atHub(p)&&now>=(b.nextShop||0)&&(upgrade||(room.goal&&p.wallet>0&&b.chipKey!==room.goal.key+':'+p.deliveredValue))){b.nextShop=now+L.tradeEveryMs*4;goHome(room,p,b,add,now);return;}
 if(p.shaft!=null){if(p.depth+C.damageEpsilon>=room.cells[p.shaft].row&&now>=b.nextTap){add('tap',{x:p.shaft%C.mapSize,y:Math.floor(p.shaft/C.mapSize)});b.nextTap=now+L.tapEveryMs*(0.8+0.4*Math.random());}return;}
 // While the rig is starved the crew digs the unstruck cells of the fields already found. A field cell ringed by shafts has no lip to belay from, but a mech
 // digging a shaft beside it drags it down too (toolPattern in rules.js), so a mech takes those neighbours next; any other cell only when none of these can be worked.
 const workable=i=>{const x=i%C.mapSize,y=Math.floor(i/C.mapSize);return !(isDepot(x,y)||home(x+0.5,y+0.5)||(room.site!=null&&i===room.site)||gate(p,room.cells[i].row,room)||room.cells[i].row>lightReach(room,p,i)||(b.unreachable[i]||0)>now||landlocked(room,i));};
 const oil=rigBurns(room)&&!fueled?unstruckOil(room):[],inside=oil.filter(workable),refuel=inside.length||!C.tools[p.tool]?.area?inside:around(oil).filter(workable);
 if(b.work==null||(refuel.length&&!refuel.includes(b.work))||(room.drill&&b.work===room.site)||gate(p,room.cells[b.work].row,room)||room.cells[b.work].row>lightReach(room,p,b.work)||landlocked(room,b.work)){let best=null,distance=Infinity;for(const i of refuel.length?refuel:room.cells.keys()){if(!refuel.length&&!workable(i))continue;const x=i%C.mapSize,y=Math.floor(i/C.mapSize),d=Math.hypot(x+0.5-p.x,y+0.5-p.y)+Math.random()*C.bots.wander;if(d<distance){distance=d;best=i;}}b.work=best;b.hops=0;}
 if(b.work==null)return;const x=b.work%C.mapSize,y=Math.floor(b.work/C.mapSize),cell=room.cells[b.work];
 if(cell.row>C.shafts.surfaceReachRows&&within(p,x,y)){if(Math.max(Math.abs(Math.floor(p.x)-x),Math.abs(Math.floor(p.y)-y))<=1){b.route=null;add('move',{dx:0,dy:0});add('belayDown',{x,y});}else steer(b,p,x+0.5,y+0.5,room,add,now,true);}
 else if(!within(p,x,y))steer(b,p,x+0.5,y+0.5,room,add,now,true);
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
 if(p.shaft!=null){const floor=room.cells[p.shaft].row;if(floor<crewCap(room,p)&&p.depth+C.damageEpsilon>=floor&&now>=b.nextTap){add('tap',{x:p.shaft%N,y:Math.floor(p.shaft/N)});b.nextTap=now+L.tapEveryMs*(0.8+0.4*Math.random());}return;}
 if(cell.row>C.shafts.surfaceReachRows){if(Math.max(Math.abs(Math.floor(p.x)-x),Math.abs(Math.floor(p.y)-y))<=1){b.route=null;add('belayDown',{x,y});}else steer(b,p,x+0.5,y+0.5,room,add,now);}
 else if(!within(p,x,y))steer(b,p,x+0.5,y+0.5,room,add,now);
 else if(now>=b.nextTap){b.route=null;add('tap',{x,y});b.nextTap=now+L.tapEveryMs*(0.8+0.4*Math.random());}}

// Each bot plays its seat the way a person might, late and loose by skill: HEAT vents only once the needle is already high and sometimes twice,
// PRESSURE opens the valve when high and lets go late, ALIGN grips both pads but slips off now and then, POWER chases the target band with lag and a shaky hand.
export function workSeat(g,b,L,now,add){const d=g.v-0.5,ready=now>=b.nextTune,later=()=>{b.nextTune=now+L.tuneEveryMs*(0.7+0.6*Math.random());};if(b.seat!==g){b.seat=g;b.level=g.level;b.gripAt=0;}
 if(g.kind==='HEAT'){if(d>L.tuneAt&&ready){add('tune');if(Math.random()<L.fumble)add('tune');later();}return;}
 if(g.kind==='PRESSURE'){if(ready&&(g.hold?d<-L.letGo:d>L.tuneAt)){add('tune',{hold:!g.hold});later();}return;}
 // A slipped ALIGN grip comes back when the slip is over, or sooner once the axes visibly fly apart.
 if(g.kind==='ALIGN'){if(g.hold&&Math.random()<L.slip){add('tune',{hold:false});b.gripAt=now+L.slipMs*(0.5+Math.random());}else if(!g.hold&&(now>=b.gripAt||Math.abs(d)>L.tuneAt+0.05))add('tune',{hold:true});return;}
 if(g.kind==='POWER'){b.level=Math.min(1,Math.max(0,b.level+(g.target-b.level)*L.follow+(Math.random()-0.5)*L.shake));add('tune',{level:Math.round(b.level*1000)/1000});}}

// Hemmed in by shafts (holes are walls now), a bot crosses one the way a person does: Belay down into the shaft beside it and belay up looking
// the other way, which brings it out on the far side. planHop picks the neighbouring shaft that leads towards the goal; hopStep plays the hop out.
// A shaft ringed by shafts has no lip to belay down from, so nobody can work it from the surface; bots leave those alone.
// Cells of the oil fields found so far whose pocket is still unstruck at or below their floor: each one is a fresh well.
export function unstruckOil(room){return Object.values(room.oilFields).flatMap(f=>f.cells).filter(i=>!room.cells[i].oilSite&&room.finds.some(f=>f.cell===i&&f.type==='oil'&&!f.extracted&&f.row>=room.cells[i].row));}
// The cells touching any of these cells, sideways or corner to corner, without the cells themselves.
export function around(cells){const N=C.mapSize,own=new Set(cells),out=new Set();for(const i of cells){const x=i%N,y=Math.floor(i/N);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,j=ny*N+nx;if((dx||dy)&&validCell(nx,ny)&&!own.has(j))out.add(j);}}return [...out];}
// The rig burns oil from the moment it is placed until it reaches the magma; the World Breaker needs none.
export function rigBurns(room){return !!room.drill&&!room.worldBreaker&&room.site!=null&&room.cells[room.site].row<C.outerRow;}
export function landlocked(room,i){const N=C.mapSize,x=i%N,y=Math.floor(i/N);if(!isShaft(room.cells[i]))return false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(validCell(nx,ny)&&!isDepot(nx,ny)&&!isShaft(room.cells[ny*N+nx]))return false;}return true;}
function planHop(room,p,b,goal){if((b.hops||0)>=C.bots.maxHops||p.shaft!=null)return false;const N=C.mapSize,bx=Math.floor(p.x),by=Math.floor(p.y),gx=goal%N+0.5,gy=Math.floor(goal/N)+0.5,now=Math.hypot(p.x-gx,p.y-gy);let best=null;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=bx+dx,ny=by+dy;if(!validCell(nx,ny)||isDepot(nx,ny))continue;const i=ny*N+nx;if(!isShaft(room.cells[i])||(room.drill&&i===room.site)||machineAt(room,nx,ny))continue;const l=Math.hypot(dx,dy),ux=dx/l,uy=dy/l,d=Math.hypot(nx+0.5+ux*2-gx,ny+0.5+uy*2-gy);if(d>=now-0.25)continue;if(!best||d<best.d)best={shaft:i,dx:ux,dy:uy,d};}
 if(!best)return false;b.hop={shaft:best.shaft,dx:best.dx,dy:best.dy,goal,phase:null,before:now};b.hops=(b.hops||0)+1;b.route=null;return true;}
function hopStep(room,p,b,now,add){const h=b.hop,N=C.mapSize;
 if(p.shaft===h.shaft){if(h.phase!=='up'){add('belay',{dx:h.dx,dy:h.dy});h.phase='up';}return true;}
 if(p.shaft!=null){add('belay');b.hop=null;return true;}
 if(h.phase==='up'){b.hop=null;const N2=C.mapSize,after=Math.hypot(p.x-(h.goal%N2+0.5),p.y-(Math.floor(h.goal/N2)+0.5));if(after>h.before-0.5)(b.unreachable??={})[h.goal]=now+C.bots.unreachableMs;/* a hop that came up no nearer means the goal is cut off: give it up for a while */return false;}
 if(h.phase==='down'){b.hop=null;(b.unreachable??={})[h.goal]=now+C.bots.unreachableMs;return false;}
 add('belayDown',{x:h.shaft%N,y:Math.floor(h.shaft/N)});h.phase='down';return true;}
// Home is the ring round the depot. From a shaft the belay brings you up towards it; on the surface the bot walks (and hops) to the nearest
// ring cell that is not itself a shaft, and Return to base finishes the delivery once it stands at home.
function goHome(room,p,b,add,now){b.route=null;if(p.shaft!=null||home(p.x,p.y)){add('returnHome');return;}const N=C.mapSize;let best=null,distance=Infinity;
 for(const [cx,cy] of C.hauling.depotCells)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=cx+dx,y=cy+dy;if(!validCell(x,y)||isDepot(x,y)||isShaft(room.cells[y*N+x])||!validPosition(x+0.5,y+0.5,room)||((b.unreachable||{})[y*N+x]||0)>now)continue;const d=Math.hypot(x+0.5-p.x,y+0.5-p.y);if(d<distance){distance=d;best={x,y};}}
 if(!best){add('returnHome');return;}steer(b,p,best.x+0.5,best.y+0.5,room,add,now,true);}
// Grid path search around open shafts (the same walker the pacing simulations use): shafts are walls to the lip, a dug goal is reached from any
// neighbouring cell, and a cell no path reaches (an island among shafts) is left alone for a while.
function steer(b,p,x,y,room,add,now=0,hop=false){const key=x+':'+y,unit=C.pacing.navStep,width=Math.round(C.mapSize/unit),goal=Math.floor(y)*C.mapSize+Math.floor(x);
 if(b.routeKey!==key||!b.route?.length){b.routeKey=key;b.noRoute=false;const gx=goal%C.mapSize,gy=Math.floor(goal/C.mapSize),dug=isShaft(room.cells[goal]),arrived=(px,py)=>dug?Math.max(Math.abs(Math.floor(px)-gx),Math.abs(Math.floor(py)-gy))<=1:Math.hypot(px-x,py-y)<unit/2,safe=(px,py)=>{if(!validPosition(px,py,room))return false;const index=Math.floor(py)*C.mapSize+Math.floor(px);return index===p.rimCell||!overPit(room,px,py);},segment=(tx,ty)=>{const n=Math.max(1,Math.ceil(Math.hypot(tx-p.x,ty-p.y)/C.movement.substep));for(let j=1;j<=n;j++)if(!safe(p.x+(tx-p.x)*j/n,p.y+(ty-p.y)*j/n))return false;return true;},parents=new Map(),queue=[];
  for(let ny=Math.floor(p.y/unit)-2;ny<=Math.ceil(p.y/unit)+2;ny++)for(let nx=Math.floor(p.x/unit)-2;nx<=Math.ceil(p.x/unit)+2;nx++){if(nx<1||ny<1||nx>=width||ny>=width||!safe(nx*unit,ny*unit)||!segment(nx*unit,ny*unit))continue;const id=ny*width+nx;parents.set(id,null);queue.push(id);}
  let end=null,closest=null,near=Infinity;for(let i=0;i<queue.length;i++){const id=queue[i],cx=id%width,cy=Math.floor(id/width);if(arrived(cx*unit,cy*unit)){end=id;break;}const far=Math.hypot(cx*unit-x,cy*unit-y);if(far<near){near=far;closest=id;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,nid=ny*width+nx;if(nx<1||ny<1||nx>=width||ny>=width||parents.has(nid)||!safe(nx*unit,ny*unit))continue;parents.set(nid,id);queue.push(nid);}}
  if(end==null){b.noRoute=true;end=closest;}/* no way through: go to the reachable point nearest the goal and hop a shaft from there */const points=[];while(end!=null){points.push({x:end%width*unit,y:Math.floor(end/width)*unit});end=parents.get(end);}b.route=points.reverse();}
 while(b.route.length&&Math.hypot(p.x-b.route[0].x,p.y-b.route[0].y)<C.damageEpsilon)b.route.shift();const target=b.route[0];if(!target){add('move',{dx:0,dy:0});if(b.noRoute&&hop&&planHop(room,p,b,goal))return;(b.unreachable??={})[goal]=now+C.bots.unreachableMs;b.work=null;return;}
 const dx=target.x-p.x,dy=target.y-p.y,length=Math.max(Math.hypot(dx,dy),C.mobility[p.mobility].speed*C.tickSeconds);add('move',{dx:dx/length,dy:dy/length});}
