import {validPosition} from './movement-rules.js';
import {machineAt} from './obstacles.js';
import {soloPlayer,creditMachine,incomeMultiplier} from './economy-rules.js';
import {rimArrival,atHub} from './shaft-rules.js';
import {C} from './config.js';
import {hit,payout,hp,createRoom,join,validCell,gate} from './rules.js';
import {isDepot,conveyorQuote,buildConveyor} from './hauling-rules.js';
const T=C.team;
export function initialTeam(){return {console:{},fund:0,fundIncome:0,fundEarned:0,drillEarned:0,drillIncome:0,drillTotal:0,vote:null,goal:null,locks:{},site:null,drill:null,coolant:false,worldBreaker:null,won:false,stats:null,wonAt:null,achievement:0,round:0,oil:{production:0,burn:0,sold:0,demand:0,speed:0,crew:0,blocked:null}};}
export function creditFund(room,value){room.fund+=value;room.fundEarned+=value;}
export function markActive(room,p,now){p.lastActive=now;room.lastActivity=now;}
export function active(room,now){return room.players.filter(p=>p.connected&&(p.boarded||now-p.lastActive<=T.activeMs));}
export function itemKey(item,index){return item==='pump'||item==='conveyor'?item+':'+index:item;}
export function requirement(room,item,index){
 const spec=typeof item==='string'&&Object.hasOwn(C.teamItems,item)?C.teamItems[item]:null;if(!spec)return 'Unknown team item';if(spec.locked)return 'Coming soon';
 if(item==='conveyor'&&(!Number.isInteger(index)||index<0||index>=C.mapSize*C.mapSize))return 'Pick a conveyor source';
 if(item==='pump'&&(!Number.isInteger(index)||!room.cells[index]?.oilSite||room.cells[index]?.pumpBuilt))return 'Requires an unbuilt confirmed oil site';
 if(item==='coolant'&&room.coolant)return 'Already owned';
 if(item==='plasma'&&(room.site===null||room.drill))return room.drill?'Already owned':'Vote a drill site first';
 if(item==='worldBreaker'&&(!room.drill||!room.coolant||room.worldBreaker))return room.worldBreaker?'Already running':'Requires the plasma drill and coolant';
 return null;
}
export function catalogPrice(room,item,index){return item==='conveyor'?conveyorQuote(room,index).price:item==='pump'?Math.max(T.pumpMinimum,T.pumpPayoutMultiplier*payout(room.cells[index]?.oilRow??0)):C.teamItems[item]?.price;}
export function catalog(room){const multiplier=Math.sqrt(room.players.length);return Object.entries(C.teamItems).flatMap(([item,spec])=>spec.locked||spec.personal||item==='conveyor'?[]:item==='pump'?room.cells.flatMap((c,index)=>c.oilSite?[{item,index,name:spec.name+' '+cellLabel(index),price:catalogPrice(room,item,index)*multiplier,requirement:requirement(room,item,index),key:itemKey(item,index),built:!!c.pumpBuilt}]:[]):[{item,name:spec.name,price:spec.price*multiplier,requirement:requirement(room,item),key:itemKey(item)}]);}
export function cellLabel(index){return String.fromCharCode('A'.charCodeAt(0)+index%C.mapSize)+(Math.floor(index/C.mapSize)+1);}
function failVote(room,now,lock=true){if(lock)room.locks[room.vote.key]=now+T.lockMs;room.vote=null;}
function passVote(room,now){const vote=room.vote;room.vote=null;if(vote.kind==='site')room.site=vote.index;else room.goal={item:vote.item,index:vote.index,price:vote.price,multiplier:vote.multiplier,key:vote.key,name:vote.name,...(vote.path?{path:vote.path,newCells:vote.newCells}:{})};autoBuy(room,now);}
export function resolveVote(room,now){const vote=room.vote;if(!vote)return;const values=Object.values(vote.ballots),yes=values.filter(Boolean).length,no=values.filter(v=>v===false).length;if(yes>vote.voters.length/2)passVote(room,now);else if(now>=vote.endsAt){if(yes>no)passVote(room,now);else failVote(room,now);}}
export function teamAction(room,p,msg,now){
 if(msg.type==='proposeConveyor'||msg.type==='propose'&&msg.item==='conveyor')return {type:'toast',text:'Buy personal conveyors in Supply'};
 if(msg.type==='reset'){if(room.won)resetPlanet(room,now);return;}
 if(room.won)return;
 // The drill cab radios the hub, so a crew aboard can chip in and propose from their seats.
 if(['chip','propose','proposeSite','proposeConveyor'].includes(msg.type)&&!atHub(p)&&!p.boarded&&!(room.showcase&&p.bot))return {type:'toast',text:'Trade at the hub'};
 if(msg.type==='board'&&(p.shaft!=null||p.belay))return {type:'toast',text:'Belay up before boarding'};
 if(msg.type==='chip'){
  if(typeof msg.amount!=='string'||!Object.hasOwn(T.chipFractions,msg.amount))return;const fraction=T.chipFractions[msg.amount];
  const amount=p.wallet*fraction;p.wallet-=amount;p.contributed+=amount;if(amount>0)p.contributedAt=++room.achievement;creditFund(room,amount);markActive(room,p,now);autoBuy(room,now);return;
 }
 if(msg.type==='board'){
  if(!room.drill)return {type:'toast',text:'Place the drill first'};
  markActive(room,p,now);p.returning=false;if(p.boarded||p.boarding){p.boarded=false;p.boarding=false;p.drive=null;if(room.cells[Math.floor(p.y)*C.mapSize+Math.floor(p.x)]?.row)rimArrival(room,p);return;}
  const x=room.site%C.mapSize,y=Math.floor(room.site/C.mapSize);p.target=null;
  if(Math.max(Math.abs(Math.floor(p.x)-x),Math.abs(Math.floor(p.y)-y))<=T.boardRadius)board(p,room);else{p.boarding=true;let target=null;for(let dy=-T.boardRadius;dy<=T.boardRadius;dy++)for(let dx=-T.boardRadius;dx<=T.boardRadius;dx++){const nx=x+dx,ny=y+dy;if((!dx&&!dy)||!validCell(nx,ny)||isDepot(nx,ny)||room.cells[ny*C.mapSize+nx].row||!validPosition(nx+0.5,ny+0.5,room))continue;const d=Math.hypot(nx+0.5-p.x,ny+0.5-p.y);if(!target||d<target.d)target={x:nx+0.5,y:ny+0.5,d};}p.drive=target||{x:x+0.5,y:y+0.5};}return;
 }
 if(msg.type==='cancelVote'){if(room.vote?.proposerId===p.publicId){markActive(room,p,now);failVote(room,now,false);}return;}
 if(msg.type==='vote'){
  const vote=room.vote;if(!vote||!vote.voters.includes(p.publicId)||typeof msg.yes!=='boolean')return;
  if(now>=vote.endsAt){resolveVote(room,now);return;}
  markActive(room,p,now);vote.ballots[p.publicId]=msg.yes;resolveVote(room,now);return;
 }
 if(msg.type==='propose'||msg.type==='proposeSite'||msg.type==='proposeConveyor'){
  if(room.vote)return {type:'toast',text:'Vote in progress'};
  const site=msg.type==='proposeSite',conveyor=msg.type==='proposeConveyor',item=conveyor?'conveyor':msg.item,index=site||conveyor?msg.y*C.mapSize+msg.x:msg.index,key=site?'site':itemKey(item,index);
  if((site||conveyor)&&(!validCell(msg.x,msg.y)||(site&&(room.drill||isDepot(msg.x,msg.y)||machineAt(room,msg.x,msg.y,true)))))return {type:'toast',text:site&&room.drill?'The drill site is fixed':'Invalid site. The depot cannot be drilled'};
  if(!site&&room.goal?.key===key)return {type:'toast',text:'Already saving for that item'};
  const reason=site?null:requirement(room,item,index);if(reason)return {type:'toast',text:reason};
  if((room.locks[key]||0)>now)return {type:'toast',text:'Proposal is cooling down'};
  const quote=conveyor?conveyorQuote(room,index):null;if(quote&&!quote.newCells)return {type:'toast',text:'That conveyor line is already built'};
  markActive(room,p,now);const multiplier=Math.sqrt(room.players.length);
  room.vote={kind:site?'site':conveyor?'conveyor':'item',item:site?null:item,index:site||item==='pump'||conveyor?index:null,key,price:site?0:catalogPrice(room,item,index)*multiplier,multiplier,...(quote?{path:quote.path,newCells:quote.newCells}:{}),name:site?'Drill site '+cellLabel(index):conveyor?'Conveyor from '+cellLabel(index):C.teamItems[item].name,proposerId:p.publicId,proposerName:p.nickname,voters:active(room,now).map(v=>v.publicId),ballots:{[p.publicId]:true},endsAt:now+T.voteMs};
  const only=room.vote.voters.length===1;resolveVote(room,now);if(only)return {type:'toast',text:'Passed: you were the only active digger'};
 }
}
export function board(p,room){if(room&&Math.floor(p.y)*C.mapSize+Math.floor(p.x)===room.site){const x=room.site%C.mapSize,y=Math.floor(room.site/C.mapSize),places=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&validPosition(x+dx+0.5,y+dy+0.5,room))places.push({x:x+dx+0.5,y:y+dy+0.5,row:room.cells[(y+dy)*C.mapSize+x+dx]?.row||0});places.sort((a,b)=>a.row-b.row);if(places[0]){p.x=places[0].x;p.y=places[0].y;}}p.boarded=true;p.boarding=false;p.drive=null;p.target=null;p.autoElapsed=0;}
export function autoBuy(room,now){const goal=room.goal;if(!goal||requirement(room,goal.item,goal.index))return;const solo=soloPlayer(room),pooled=solo&&atHub(solo)?solo:null;if(room.fund+(pooled?.wallet||0)<goal.price)return;const fromFund=Math.min(room.fund,goal.price);room.fund-=fromFund;if(pooled)pooled.wallet-=goal.price-fromFund;room.goal=null;
 if(goal.item==='conveyor')buildConveyor(room,goal);
 if(goal.item==='pump'){const c=room.cells[goal.index];c.pumpBuilt=true;room.dirty.add(goal.index);}
 if(goal.item==='coolant')room.coolant=true;
 if(goal.item==='plasma')room.drill={index:room.site};
 if(goal.item==='worldBreaker'){for(const p of room.players)if(!p.departed&&Math.floor(p.y)*C.mapSize+Math.floor(p.x)===room.site){p.shaft=room.site;rimArrival(room,p);p.belay=null;p.drive=null;p.target=null;}room.worldBreaker={startedAt:now,startRow:room.cells[room.site].row,endsAt:now+T.worldBreakerMs};}
}
// The plasma drill bores a 3 by 3 shaft: the site first, then its eight neighbours (never ahead of the site). Extra blocks pay nothing.
export function boreCells(room){const N=C.mapSize,x=room.site%N,y=Math.floor(room.site/N),cells=[room.site];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if((dx||dy)&&nx>=0&&ny>=0&&nx<N&&ny<N&&!isDepot(nx,ny))cells.push(ny*N+nx);}return cells;}
// Drill console: every crew member aboard works one seat, and each seat (pressure, heat, alignment, power) is its own small game.
// HEAT climbs on its own and each tap vents a burst, so tapping too often overcools. PRESSURE builds while the valve is shut and bleeds
// while it is held, so the hold has to be feathered. ALIGN lets two axes wander apart until both pads are held, then pulls them together.
// POWER has a target band that wanders and a throttle that has to ride inside it.
// Every seat still reports one needle v in [0,1] with 0.5 perfect, so drill speed, the zones, the overdrive bonus, the cockpit screens
// and the bots read all four alike. More crew, any red gauge and the overdrive raise the pace of every seat.
// The crew's average zone scales drill speed: green speeds it up, red stalls it.
export function consoleZone(v){const K=C.console,d=Math.abs(v-0.5);return d<=K.green?'green':d<=K.yellow?'yellow':'red';}
function consoleRandom(room){room.consoleSeed=((room.consoleSeed??(room.seed||1))*1103515245+12345)%2147483648;return room.consoleSeed/2147483648;}
const unit=x=>Math.min(1,Math.max(0,x)),sign=room=>consoleRandom(room)<0.5?-1:1;
function newGauge(room,kind,now){const g={kind,v:0.5,dir:sign(room),rate:1,flipAt:now+C.console.flipMs};if(kind==='PRESSURE')g.hold=false;if(kind==='ALIGN')Object.assign(g,{a:0.5,b:0.5,da:g.dir,db:sign(room),hold:false});if(kind==='POWER')Object.assign(g,{level:0.5,target:0.5,speed:0});return g;}
function stepGauge(room,g,now,dt,pace){const K=C.console,noise=()=>(consoleRandom(room)-0.5)*K.jitter*dt;
 // Each flip re-rolls the wander directions and how hard heat and pressure climb, so no seat settles into a rhythm.
 if(now>=g.flipAt){g.dir=sign(room);g.rate=1+K.swing*(consoleRandom(room)*2-1);if(g.kind==='ALIGN'){g.da=sign(room);g.db=sign(room);}g.flipAt=now+K.flipMs*(0.5+consoleRandom(room));}
 if(g.kind==='HEAT')g.v=unit(g.v+K.heat.rise*g.rate*pace*dt+noise());
 else if(g.kind==='PRESSURE')g.v=unit(g.v+(g.hold?-K.pressure.fall:K.pressure.rise*g.rate)*pace*dt+noise());
 else if(g.kind==='ALIGN'){const A=K.align,apart=Math.sign(g.a-g.b)||g.da,move=(x,dir,away)=>x+(dir*K.drift*(g.hold?A.steady:1)+(g.hold?0:away*A.spread))*pace*dt+noise();let a=move(g.a,g.da,apart),b=move(g.b,g.db,-apart);
  if(g.hold){const mid=(a+b)/2,pull=1-Math.exp(-A.pull*dt);a+=(mid-a)*pull;b+=(mid-b)*pull;}
  // The axes bounce off the edges of the graph, so the gap tops out a little short of the needle's end stops.
  if(a<A.edge||a>1-A.edge)g.da=a<A.edge?1:-1;if(b<A.edge||b>1-A.edge)g.db=b<A.edge?1:-1;g.a=Math.min(1-A.edge,Math.max(A.edge,a));g.b=Math.min(1-A.edge,Math.max(A.edge,b));g.v=unit(0.5+(g.a-g.b)/2);}
 else if(g.kind==='POWER'){const P=K.power;g.speed+=(g.dir*K.drift*pace-g.speed)*(1-Math.exp(-P.ease*dt));g.target+=g.speed*dt;if(g.target<P.low||g.target>P.high){g.dir=g.target<P.low?1:-1;g.speed=-g.speed;g.target=Math.min(P.high,Math.max(P.low,g.target));}g.v=unit(0.5+g.level-g.target);}}
export function runConsole(room,crew,now,dt,surge=1){const K=C.console,gauges=room.console??={},ids=new Set(crew.map(p=>p.publicId));for(const id of Object.keys(gauges))if(!ids.has(id))delete gauges[id];
 for(const p of crew)if(!gauges[p.publicId]){const used=new Set(Object.values(gauges).map(g=>g.kind)),order=room.showcase?C.showcase[p.bot?'botSeats':'humanSeats']:K.kinds;gauges[p.publicId]=newGauge(room,order.find(k=>!used.has(k))||K.kinds[0],now);}
 if(!crew.length)return 1;const red=crew.filter(p=>consoleZone(gauges[p.publicId].v)==='red').length,pace=surge*(1+K.crewDrift*(crew.length-1));
 for(const p of crew){const g=gauges[p.publicId];stepGauge(room,g,now,dt,pace*(1+K.redDrag*(red-(consoleZone(g.v)==='red'?1:0))));}
 return crew.reduce((sum,p)=>sum+K.zoneSpeed[consoleZone(gauges[p.publicId].v)],0)/crew.length;}
// A bare tune taps the HEAT vent; hold opens the PRESSURE valve or grips both ALIGN pads; level sets the POWER throttle. Input for another seat does nothing.
export function tuneConsole(room,p,m={}){const g=room.console?.[p.publicId];if(!p.boarded||!g)return;
 if(typeof m.hold==='boolean'){if('hold' in g)g.hold=m.hold;}else if(Number.isFinite(m.level)){if(g.kind==='POWER'){g.level=unit(m.level);g.v=unit(0.5+g.level-g.target);}}else if(g.kind==='HEAT')g.v=unit(g.v-C.console.tuneStep);}
// The wire carries only what the console draws, rounded: the needle plus each seat's valve, axes or throttle.
const round=x=>Math.round(x*1000)/1000;
export function publicConsole(room){return Object.fromEntries(Object.entries(room.console||{}).map(([id,g])=>[id,{kind:g.kind,v:round(g.v),...('hold' in g?{hold:g.hold}:{}),...(g.kind==='ALIGN'?{a:round(g.a),b:round(g.b)}:{}),...(g.kind==='POWER'?{level:round(g.level),target:round(g.target)}:{})}]));}
export function runTeam(room,now,dt){
 resolveVote(room,now);autoBuy(room,now);
 const crew=room.players.filter(p=>p.connected&&p.boarded&&room.drill),count=crew.length,blocked=room.drill?gate({isTeam:true},room.cells[room.site].row,room):null;
 for(const p of crew){p.drillSeconds+=dt;p.drillAt=++room.achievement;}
 const production=room.cells.filter(c=>c.pumpBuilt).length*T.pumpBarrelsPerSecond,demand=count&&!room.worldBreaker&&!blocked?T.drillBurnBase*T.crewBurn[count]:0;
 const burn=Math.min(production,demand),ratio=demand?Math.min(1,production/demand):0;
 const panel=runConsole(room,crew,now,dt,room.worldBreaker?C.console.overdriveDrift:1),speed=count&&!blocked?T.crewSpeed[count]*ratio*panel:0;room.oil={production,burn,sold:Math.max(0,production-burn),demand,speed,crew:count,blocked,console:panel};
 if(speed||room.worldBreaker)for(const p of crew)p.lastWorked=now;
 if(production>burn)creditMachine(room,(production-burn)*T.barrelPrice*dt*incomeMultiplier(room),'oil');
 const team={id:T.damagerId,publicId:T.damagerId,nickname:room.worldBreaker?'World Breaker':'Plasma drill',isTeam:true,tool:C.rockTool};const bore={...team,id:'bore',publicId:'bore'},digger=i=>i===room.site?team:bore;// the World Breaker's ring cells stay uncredited: 60 seconds of nine inner-core cells would flood the ending
 if(room.worldBreaker){const wb=room.worldBreaker,O=C.console,rate=count?1+O.overdriveBonus*Math.max(0,(panel-O.zoneSpeed.red)/(O.zoneSpeed.green-O.zoneSpeed.red)):1;wb.bonus=(wb.bonus||0)+(rate-1)*dt*C.tapWindowMs/T.worldBreakerMs;wb.charge=Math.min(1,(now-wb.startedAt)/T.worldBreakerMs+wb.bonus);wb.rate=rate;if(wb.charge<1)wb.endsAt=Math.round(now+(1-wb.charge)*T.worldBreakerMs/rate);else wb.endsAt=Math.min(wb.endsAt??now,now);const target=wb.startRow+Math.floor((C.finalRow-wb.startRow)*wb.charge);for(const i of boreCells(room)){for(let guard=0;guard<C.finalRow&&room.cells[i].row<target;guard++){const c=room.cells[i],before=c.row;c.damage={};c.hp=hp(c.row);room.broken.delete(i);hit(room,digger(i),i%C.mapSize,Math.floor(i/C.mapSize),c.hp,true);if(room.cells[i].row===before)break;}}}
 else if(room.drill&&!room.won){const siteRow=room.cells[room.site].row,N=C.mapSize;for(const i of boreCells(room)){const c=room.cells[i];
  // The rig bores a 3 by 3 shaft from the floor of the site's hole. Ring cells above that floor are cut down to it at once, so the cutter
  // never sits in a one-cell shaft with its arms in the walls. Widening is spoil, not ore: it pays nothing (the bore digger is uncredited),
  // while every cell the drill then bores downward pays the team (see hit in rules.js).
  // A cell someone stands on or hangs in is left alone, and partial damage is kept, so a digger in a ring cell still breaks their own floor.
  if(i!==room.site&&c.row<siteRow){if(room.players.some(q=>!q.departed&&(q.shaft===i||(!q.boarded&&Math.floor(q.x)===i%N&&Math.floor(q.y)===Math.floor(i/N)))))continue;for(let k=0;k<T.boreCatchUpRows&&c.row<siteRow;k++){const before=c.row;hit(room,bore,i%N,Math.floor(i/N),c.hp,true,false,0,true);if(c.row===before)break;}}
  else if(speed&&(i===room.site||c.row<=siteRow))hit(room,team,i%N,Math.floor(i/N),hp(c.row)/(T.drillSecondsPerBlock*C.tickHz)*speed,true);}}
 if(room.site!==null&&room.cells[room.site].row>=C.finalRow)win(room,room.worldBreaker?room.worldBreaker.endsAt:now);
 const alpha=1-Math.exp(-dt/C.incomeWindowSeconds);room.fundIncome+=(room.fundEarned/dt-room.fundIncome)*alpha;room.fundEarned=0;room.drillIncome=(room.drillIncome||0)+((room.drillEarned||0)/dt-(room.drillIncome||0))*alpha;room.drillEarned=0;room.oil.income=room.drillIncome;if(!room.won)autoBuy(room,now);
}
function award(room,valueKey,timeKey,positive=true){const candidates=room.players.filter(p=>positive?p[valueKey]>0:p[valueKey]>=0).sort((a,b)=>b[valueKey]-a[valueKey]||a[timeKey]-b[timeKey]);const p=candidates[0];return p?{id:p.publicId,nickname:p.nickname,value:p[valueKey]}:null;}
export function win(room,now){if(room.won)return;room.won=true;room.vote=null;room.wonAt=now;for(const p of room.players){p.drive=null;p.target=null;p.boarding=false;}room.stats={timeToCore:(now-room.createdAt)/C.tapWindowMs,deepestDigger:award(room,'deepestRow','deepestAt',false),topContributor:award(room,'contributed','contributedAt'),bestFind:award(room,'bestFind','bestFindAt'),mostTimeInDrill:award(room,'drillSeconds','drillAt'),topHauler:award(room,'deliveredValue','deliveredAt')};room.endEvent={stats:room.stats,wonAt:now,site:room.site};}
export function resetPlanet(room,now){const players=room.players,seed=Math.floor(room.random()*C.seed.modulus),round=room.round+1;Object.assign(room,createRoom(room.code,seed,room.fast,now,room.quick));room.round=round;room.wire=undefined;if(room.showcase)room.arc=null;
 for(const old of [...players.filter(p=>!p.departed),...players.filter(p=>p.departed)]){const gone=old.departed,connected=old.connected,leaveAt=old.leaveAt,disconnectedAt=old.disconnectedAt;const fresh=gone?join(createRoom(room.code,seed,room.fast,now,room.quick),old.token,old.nickname,now):join(room,old.token,old.nickname,now);fresh.publicId=old.publicId;fresh.color=old.color;fresh.seat=old.seat;[fresh.x,fresh.y]=C.spawnSeats[old.seat];const dx=fresh.x-C.mapSize/2,dy=fresh.y-C.mapSize/2,len=Math.hypot(dx,dy);fresh.facing={dx:dx/len,dy:dy/len};Object.assign(old,fresh);old.connected=connected;old.departed=!!gone;if(!connected&&!gone){old.leaveAt=leaveAt;old.disconnectedAt=disconnectedAt;}if(gone)room.players.push(old);else room.players[room.players.length-1]=old;}
 room.resetEvent=true;for(let i=0;i<room.cells.length;i++)room.dirty.add(i);
}
