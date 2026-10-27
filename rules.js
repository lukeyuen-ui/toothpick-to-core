import {surfaceVisible,detectorMask} from './lighting-rules.js';
import {layConveyor} from './personal-conveyors.js';
import {excavatorAction,runExcavators,stashExcavator,publicExcavators} from './excavator-rules.js';
import {machineAt} from './obstacles.js';
import {personalFunds,spendPersonal,soloPlayer,creditMachine,incomeMultiplier} from './economy-rules.js';
import {validMessage} from './resilience.js';
import {cleanNickname,expireDepartures} from './presence-rules.js';
import {shaftGate,enterShaft,trackSurfaceCell,advanceShaft,startBelay,lightShaft,atHub,rimArrival} from './shaft-rules.js';
import { C } from './config.js';
import {applyMove,liveMove,slide,driveStep,validPosition} from './movement-rules.js';
import {initialTeam,creditFund,markActive,teamAction,runTeam,board,catalog,resolveVote} from './team-rules.js';
import {isDepot,addCargo,hoistCargo,haulAlong,runConveyors,publicPiles,returnHome,crossedCells} from './hauling-rules.js';
export function seeded(seed) { let state=seed>>>0; return ()=>{state=(Math.imul(state,C.seed.multiplier)+C.seed.increment)>>>0; return state/C.seed.modulus;}; }
export function generateFinds(seed) {
 const random=seeded(seed),used=new Set(C.hauling.depotCells.map(([x,y])=>y*C.mapSize+x)),finds=[],D=C.deposits;
 for(const spec of C.finds)for(let group=0;group<spec.count;group++){
  const size=spec.type==='oil'?D.oilMinSize+Math.floor(random()*(D.oilMaxSize-D.oilMinSize+1)):spec.type==='gold'||spec.type==='diamond'?D.veinMinCells+Math.floor(random()*(D.veinMaxCells-D.veinMinCells+1)):1;
  let cells=[];for(let attempt=0;attempt<D.placementAttempts;attempt++){
   const x=Math.floor(random()*(C.mapSize-(spec.type==='oil'?size-1:0))),y=Math.floor(random()*(C.mapSize-(spec.type==='oil'?size-1:0))),first=y*C.mapSize+x;
   if(used.has(first))continue;cells=[first];
   if(spec.type==='oil'){for(let dy=0;dy<size;dy++)for(let dx=0;dx<size;dx++)if(dx||dy)cells.push((y+dy)*C.mapSize+x+dx);}
   else if(size>1){while(cells.length<size){const candidates=[];for(const at of cells)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=at%C.mapSize+dx,ny=Math.floor(at/C.mapSize)+dy,i=ny*C.mapSize+nx;if(nx>=0&&ny>=0&&nx<C.mapSize&&ny<C.mapSize&&!used.has(i)&&!cells.includes(i))candidates.push(i);}if(!candidates.length)break;cells.push(candidates[Math.floor(random()*candidates.length)]);}}
   if(cells.length===(spec.type==='oil'?size*size:size)&&!cells.some(i=>used.has(i)))break;cells=[];
  }
  if(!cells.length)throw Error('Find placement exhausted');const row=spec.minRow+Math.floor(random()*(spec.maxRow-spec.minRow+1)),groupId=spec.type+'-'+group;
  for(const cell of cells){used.add(cell);finds.push({id:'find-'+finds.length,groupId,extracted:false,cell,row,type:spec.type,surface:random()<D.surfaceFraction});}
 }return finds;
}
export function layerAt(row) { let start=0; for(const layer of C.layers) { if(row<start+layer.rows) return {...layer,start,progress:(row-start)/layer.rows}; start+=layer.rows; } return {...C.layers.at(-1),start:C.innerRow,progress:1}; }
export function depthAt(row) { if(row>=C.finalRow) return C.layers.at(-1).to; const l=layerAt(row); return l.from+(l.to-l.from)*l.progress; }
export function hp(row) { return Math.round(C.hpBase*C.hpGrowth**row)*(row>=C.innerRow?C.innerMultiplier:1); }
export function payout(row) { return C.payoutGrowth**row*(row>=C.innerRow?C.innerMultiplier:1); }
export function createRoom(code,seed,fast,now,quick=false) {
 const finds=generateFinds(seed),cells=Array.from({length:C.mapSize*C.mapSize},()=>({row:0,damage:{},hp:hp(0)}));for(const f of finds)if(f.surface)cells[f.cell].surfaceSign=f.type;
 return {...initialTeam(),oilFields:{},excavators:[],excavatorSequence:0,machineShares:[],piles:{},belts:{},conveyorLines:[],beltProgress:0,cargoSequence:0,deliveries:[],privateToasts:{},now,code,seed,fast,quick,createdAt:now,lastActivity:now,players:[],cells,finds,hints:{},breakEvents:[],announcements:[],tick:0,deepest:0,dirty:new Set(),broken:new Set(),random:seeded(seed)};
}
export function join(room,token,nickname,now) {
 expireDepartures(room,now);let p=room.players.find(p=>p.token===token);
 const occupied=room.players.filter(who=>!who.departed&&who!==p);if((!p||p.departed)&&occupied.length>=C.maxPlayers)throw Error(`This expedition is full (${C.maxPlayers} of ${C.maxPlayers})`);
 const seat=p&&!p.departed?p.seat:C.spawnSeats.findIndex((_,i)=>!occupied.some(who=>who.seat===i));
 if(!p) {
  
  let [spawnX,spawnY]=C.spawnSeats[seat];if(!validPosition(spawnX,spawnY,room)){const candidates=[];for(let y=0;y<C.mapSize;y++)for(let x=0;x<C.mapSize;x++)if(!room.cells[y*C.mapSize+x].row&&validPosition(x+0.5,y+0.5,room))candidates.push({x:x+0.5,y:y+0.5,d:Math.hypot(x+0.5-spawnX,y+0.5-spawnY)});candidates.sort((a,b)=>a.d-b.d);if(candidates[0]){spawnX=candidates[0].x;spawnY=candidates[0].y;}}
  const outward=Math.hypot(spawnX-C.mapSize/2,spawnY-C.mapSize/2);
  p={id:token,token,nickname:cleanNickname(nickname),seat,color:C.colors[seat],x:spawnX,y:spawnY,hold:{value:0,units:0,lots:[]},holdFullNotified:false,pods:0,beltsBuilt:0,beltIncome:0,beltEarned:0,excavatorKits:0,firstCargo:false,returning:false,shaft:null,depth:0,belay:null,rimCell:null,shaftEntry:null,surfaceCell:null,shaftApproach:null,lighting:0,deepCoach:false,move:{dx:0,dy:0},moveAt:-Infinity,facing:{dx:(spawnX-C.mapSize/2)/outward,dy:(spawnY-C.mapSize/2)/outward},drivePath:null,driveKey:null,deliveredValue:0,deliveredAt:Infinity,wallet:0,lifetime:0,income:0,earned:0,tool:0,mobility:0,metal:0,diamond:0,dowsing:0,bestFind:0,bestFindAt:Infinity,contributed:0,contributedAt:Infinity,deepestRow:-1,deepestAt:Infinity,drillSeconds:0,drillAt:Infinity,boarded:false,boarding:false,lastActive:-Infinity,lastWorked:-Infinity,rods:{bearing:null,onPocket:false},detectorCell:null,target:null,drive:null,autoElapsed:0,tapTimes:[],connected:true};
  room.players.push(p);
 }
 if(!validPosition(p.x,p.y,room)){p.shaft??=Math.floor(p.y)*C.mapSize+Math.floor(p.x);rimArrival(room,p);p.belay=null;}p.seat=seat;p.color=C.colors[seat];p.connected=true;p.departed=false;p.leaveAt=null;p.disconnectedAt=null;room.lastActivity=now; return p;
}
export function within(p,x,y) { return Math.max(Math.abs(Math.floor(p.x)-x),Math.abs(Math.floor(p.y)-y))<=C.mobility[p.mobility].reach; }
export function gate(p,row,room) {
 if(row>=C.innerRow&&!p.isTeam) return 'Needs the plasma drill';
 if(row>=C.outerRow&&!room?.coolant) return 'Magma. Needs coolant';
 if(!p.isTeam && row>=C.graniteRow && p.tool<C.rockTool) return 'Needs a pickaxe';
 return null;
}
export function validCell(x,y) { return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<C.mapSize&&y<C.mapSize; }
export function isThin(cell){return cell.richStart!=null&&cell.row>=cell.richStart+C.deposits.richRows;}
export function cellPayout(cell){return payout(cell.row)*(isThin(cell)?C.deposits.dryFactor:1);}
export function hit(room,p,x,y,amount,indirect=false) {
 if(!validCell(x,y)||isDepot(x,y)) return;
 const index=y*C.mapSize+x, cell=room.cells[index];
 if(indirect&&room.players.some(who=>!who.departed&&Math.floor(who.x)===x&&Math.floor(who.y)===y))return;
 if(machineAt(room,x,y)?.damagerId!==p.id&&machineAt(room,x,y))return;
 if(room.broken.has(index)||gate(p,cell.row,room)||(!p.isTeam&&shaftGate(room,p,x,y))) return;
 if(!p.isTeam){lightShaft(room,p,index);p.lastWorked=room.now;}
 cell.richStart??=cell.row;const actual=Math.min(amount,cell.hp); cell.hp-=actual; cell.damage[p.id]=(cell.damage[p.id]||0)+actual; room.dirty.add(index);
 if(cell.hp<=hp(cell.row)*C.damageEpsilon) {
  const total=Object.values(cell.damage).reduce((a,b)=>a+b,0), value=cellPayout(cell)*incomeMultiplier(room);
  const find=room.finds.find(f=>!f.extracted&&f.cell===index&&f.row===cell.row);
  const bonus=find?(C.findBonuses[find.type]||0)*payout(cell.row)*incomeMultiplier(room):0, shares={},bonuses={},units={},spilled={},viaBelt={};
  for(const who of room.players) {
   const fraction=(cell.damage[who.id]||0)/total, earnedBonus=bonus*fraction, share=(value+bonus)*fraction;
   if(share){shares[who.publicId]=share;bonuses[who.publicId]=earnedBonus;}
   if(fraction>0){units[who.publicId]=1+(earnedBonus>0?1:0);if(hoistCargo(room,who,index,value*fraction)){if(earnedBonus>0)hoistCargo(room,who,index,earnedBonus);viaBelt[who.publicId]=share;spilled[who.publicId]=0;}else{spilled[who.publicId]=addCargo(room,who,index,value*fraction)?1:0;if(earnedBonus>0&&addCargo(room,who,index,earnedBonus))spilled[who.publicId]++;}}
   if(earnedBonus>who.bestFind){who.bestFind=earnedBonus;who.bestFindAt=++room.achievement;}
  }
  const teamFraction=(cell.damage[C.team.damagerId]||0)/total;
  for(const m of room.excavators){const f=(cell.damage[m.damagerId]||0)/total;if(f){stashExcavator(room,m,value*f,bonus*f);shares[m.damagerId]=(value+bonus)*f;bonuses[m.damagerId]=bonus*f;}}
  if(teamFraction){creditMachine(room,(value+bonus)*teamFraction,'drill');shares[C.team.damagerId]=(value+bonus)*teamFraction;bonuses[C.team.damagerId]=bonus*teamFraction;}
  if(!p.isTeam&&cell.row>p.deepestRow){p.deepestRow=cell.row;p.deepestAt=++room.achievement;}
  room.breakEvents.push({index,shares,bonuses,units,spilled,viaBelt});
  if(find){
   const vein=!!find.groupId&&room.finds.some(f=>f!==find&&f.groupId===find.groupId&&f.extracted);find.extracted=true;delete cell.surfaceSign;removeFindHints(room,find.id);
   if(find.type==='oil'){cell.oilSite=true;cell.oilRow=cell.row;cell.pumpBuilt=false;if(find.groupId){cell.oilField=find.groupId;room.oilFields[find.groupId]??={cells:room.finds.filter(f=>f.groupId===find.groupId).map(f=>f.cell)};}}
   room.announcements.push({nickname:p.nickname,type:find.type,bonus,vein,...(find.type==='oil'?{cellLabel:String.fromCharCode('A'.charCodeAt(0)+x)+(y+1)}:{})});
   for(const who of room.players)updateDowsing(room,who);
  }
  const previousRow=cell.row;cell.row++;for(const who of room.players)if(who.shaft===index&&!who.belay&&who.depth+C.damageEpsilon>=previousRow)who.depth=cell.row;
  if(!p.isTeam){if(cell.row>C.shafts.surfaceReachRows)p.deepCoach=true;lightShaft(room,p,index);}cell.damage={}; cell.hp=hp(cell.row); room.deepest=Math.max(room.deepest,cell.row); room.broken.add(index);
 }
}
export function action(room,p,message,now) {
 if(!p.connected||!validMessage(message)) return;
 if(message.type==='layConveyor')return layConveyor(room,p,message);
 if(['buyExcavator','placeExcavator','toggleExcavator','takeExcavator'].includes(message.type))return excavatorAction(room,p,message,now);
 if(['chip','propose','proposeSite','proposeConveyor','vote','cancelVote','board','reset'].includes(message.type))return teamAction(room,p,message,now);
 if(room.won)return;
 if(message.type==='belay'){startBelay(room,p,now);return;}
 if(message.type==='returnHome'){if(p.shaft!=null)startBelay(room,p,now,true);else returnHome(room,p,now);return;}
 if(message.type==='move'){applyMove(room,p,message,now);return;}
 if(message.type==='tap') {
  if(p.belay)return {type:'toast',text:'Belaying to the surface'};
  if(liveMove(p,now))return;
  const {x,y}=message; if(!validCell(x,y)) return;
  p.tapTimes=p.tapTimes.filter(t=>now-t<C.tapWindowMs); if(p.tapTimes.length>=C.tapsPerSecond) return; p.tapTimes.push(now);
  markActive(room,p,now);p.lastWorked=now;
  if(p.boarded){p.returning=false;p.boarded=false;p.boarding=false;p.target=null;p.drive={x:x+0.5,y:y+0.5};return;}
  p.boarding=false;p.returning=false;
  if(p.shaft!=null){const reason=shaftGate(room,p,x,y);if(reason)return {type:'toast',text:reason};}
  if(!within(p,x,y)) {p.drive={x:x+0.5,y:y+0.5};p.target=null;return;}
  p.drive=null;
  const reason=machineAt(room,x,y)?'Keep out. Excavator running.':isDepot(x,y)?'Depot. Bring cargo here.':shaftGate(room,p,x,y)||gate(p,room.cells[y*C.mapSize+x].row,room); if(reason) {p.target=null; return {type:'toast',text:reason,x,y};}
  p.target={x,y}; const tool=C.tools[p.tool]; hit(room,p,x,y,tool.tap);
  if(tool.splash) for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(dx||dy) hit(room,p,x+dx,y+dy,tool.splash,true);
 } else if(message.type==='buy') {
  if(!atHub(p))return {type:'toast',text:'Trade at the hub'};
  const kind=message.kind; if(kind!=='pods'&&kind!=='lighting'&&kind!=='tool'&&kind!=='mobility'&&!C.detectorLines.includes(kind)) return;
  const next=kind==='pods'?C.cargoPods[p.pods]:kind==='lighting'?C.lighting[p.lighting]:C.detectorLines.includes(kind)?C.detectors[kind][p[kind]]:(kind==='tool'?C.tools:C.mobility)[p[kind]+1];
  if(!next) return {type:'toast',text:'Fully upgraded'};
  if(personalFunds(room,p)<next.cost) return {type:'toast',text:'Keep digging. Not enough money yet'};
  spendPersonal(room,p,next.cost); p[kind]++; p.autoElapsed=0; room.lastActivity=now; if(C.detectorLines.includes(kind))scanDetectors(room,p);if(kind==='tool')return {type:'toast',text:'Equipped: '+next.name+', '+next.tap.toLocaleString()+' per hit'};
 }
}
export function step(room,commands,now,dt=C.tickSeconds) {
 room.now=now;room.endEvent=null;room.resetEvent=false;room.privateToasts={};room.deliveries=[];room.machineShares=[];
 room.broken.clear(); room.dirty.clear(); room.breakEvents=[];room.announcements=[]; room.tick++;
 expireDepartures(room,now);room.announcements.push(...(room.pendingAnnouncements||[]));room.pendingAnnouncements=[];
 if(!room.won)resolveVote(room,now);
 for(const {player,message,respond} of commands) {const reply=action(room,player,message,now);if(reply&&respond)respond(reply);if(room.resetEvent)break;}
 if(room.won||room.resetEvent)return;
 for(const p of room.players) {
  if(p.connected) {
   const standing=Math.floor(p.y)*C.mapSize+Math.floor(p.x);if(p.shaft==null&&!p.boarded&&!p.boarding&&p.rimCell!==standing&&room.broken.has(standing))enterShaft(room,p,standing);
   const oldX=p.x,oldY=p.y,wasInShaft=p.shaft!=null;if(!wasInShaft)trackSurfaceCell(p,Math.floor(oldY)*C.mapSize+Math.floor(oldX));
   if(p.shaft!=null){advanceShaft(room,p,now,dt);}else if(liveMove(p,now)){p.drive=null;p.drivePath=null;p.target=null;p.returning=false;p.boarded=false;p.boarding=false;const speed=C.mobility[p.mobility].speed*dt;slide(p,p.move.dx*speed,p.move.dy*speed,room);}else {if(p.move&&(p.move.dx||p.move.dy))p.move={dx:0,dy:0};driveStep(p,dt,room);}

   if(!wasInShaft&&p.shaft==null&&!p.boarding&&!p.boarded&&Math.hypot(p.x-oldX,p.y-oldY)>C.damageEpsilon){const samples=Math.max(1,Math.ceil(Math.hypot(p.x-oldX,p.y-oldY)/C.movement.substep)),endX=p.x,endY=p.y;for(let i=0;i<=samples;i++){const sx=oldX+(endX-oldX)*i/samples,sy=oldY+(endY-oldY)*i/samples,cx=Math.floor(sx),cy=Math.floor(sy),index=cy*C.mapSize+cx;trackSurfaceCell(p,index);if(p.rimCell===index)continue;if(room.cells[index]?.row>0&&Math.abs(sx-cx-0.5)<C.shafts.entryRadius&&Math.abs(sy-cy-0.5)<C.shafts.entryRadius){enterShaft(room,p,index);break;}if(p.rimCell!=null&&index!==p.rimCell)p.rimCell=null;}}
   if(!wasInShaft&&Math.hypot(p.x-oldX,p.y-oldY)>C.damageEpsilon)p.lastWorked=now;
   haulAlong(room,p,oldX,oldY);
   if(p.boarding&&!p.drive)board(p,room);
   const cellKey=Math.floor(p.y)*C.mapSize+Math.floor(p.x);if(cellKey!==p.detectorCell){scanDetectors(room,p);p.detectorCell=cellKey;}
   const tool=C.tools[p.tool];
   if(tool.interval&&!p.boarded) {
    p.autoElapsed+=dt;
    if(p.autoElapsed+Number.EPSILON>=tool.interval) {
     p.autoElapsed%=tool.interval;
     if(tool.areaDamage) {const cx=Math.floor(p.x),cy=Math.floor(p.y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)hit(room,p,cx+dx,cy+dy,tool.areaDamage,true);}
     else if(p.target&&within(p,p.target.x,p.target.y)&&!gate(p,room.cells[p.target.y*C.mapSize+p.target.x].row,room))hit(room,p,p.target.x,p.target.y,tool.autoDamage,true);
    }
   }
   const index=Math.floor(p.y)*C.mapSize+Math.floor(p.x);if(p.shaft==null&&!p.boarded&&!p.boarding&&room.broken.has(index))enterShaft(room,p,index);
  }

 }
 for(const p of room.players)if(p.connected)haulAlong(room,p);
 runExcavators(room,now,dt);
 runConveyors(room,dt);
 runTeam(room,now,dt);
 if(!room.won)for(const p of room.players)if(p.connected)haulAlong(room,p);
 for(const p of room.players){const alpha=1-Math.exp(-dt/C.incomeWindowSeconds);p.income+=(p.earned/dt-p.income)*alpha;p.earned=0;p.beltIncome+=((p.beltEarned||0)/dt-p.beltIncome)*alpha;p.beltEarned=0;}
}
export function publicPlayer(p) { const {controlTimes,token,tapTimes,autoElapsed,earned,id,detectorCell,lastActive,bestFindAt,contributedAt,deepestAt,drillAt,deliveredAt,hold,holdFullNotified,rimCell,shaftEntry,surfaceCell,shaftApproach,lastWorked,beltEarned,moveAt,drivePath,driveKey,...safe}=p; return {...safe,hold:{units:hold.units,value:hold.value},id: p.publicId}; }
function wireCells(room,indices){return [...indices].map(index=>{const c=room.cells[index];return {index,row:c.row,hp:c.hp,thin:isThin(c),surfaceSign:c.surfaceSign||null,oilSite:!!c.oilSite,pumpBuilt:!!c.pumpBuilt,litDepth:c.litDepth||0,shaftLights:!!c.shaftLights,damage:Object.fromEntries(Object.entries(c.damage).map(([id,amount])=>[id===C.team.damagerId?id:room.players.find(p=>p.id===id)?.publicId,amount]))};});}
function delta(previous,next){const patch={};for(const [key,value]of Object.entries(next))if(JSON.stringify(previous?.[key])!==JSON.stringify(value))patch[key]=value;return patch;}
export function snapshot(room,full=false) {
 full=full||room.resetEvent;
 const metadata={code:room.code,fast:room.fast,quick:room.quick,createdAt:room.createdAt,deepest:room.deepest,depth:depthAt(room.deepest),round:room.round};
 const team=Object.fromEntries(['fund','fundIncome','vote','goal','locks','site','drill','coolant','worldBreaker','won','stats','wonAt','oil'].map(key=>[key,room[key]]));team.excavators=publicExcavators(room);team.solo=!!soloPlayer(room);team.fields=Object.entries(room.oilFields).map(([id,f])=>({id,cells:f.cells,wells:f.cells.filter(i=>room.cells[i].pumpBuilt).length}));team.catalog=catalog(room);team.conveyorUnitPrice=C.hauling.conveyorCostPerCell;team.conveyorLines=room.conveyorLines.map(line=>({source:line.source,length:line.length,ownerId:line.ownerId,oreCells:line.path.filter(index=>room.piles[index]?.units).length}));
 const players=room.players.map(publicPlayer),hintStrings=Object.fromEntries(Object.entries(room.hints).map(([key,value])=>[key,JSON.stringify(value)]));
 const piles=publicPiles(room),belts=room.belts;
 const envelope={type:full?'full':'diff',tick:room.tick,serverNow:room.now};
 if(full){if(room.resetEvent){envelope.reset=true;room.resetEvent=false;}return {...envelope,...metadata,players,hints:structuredClone(room.hints),team,piles,belts:structuredClone(belts),cells:wireCells(room,room.cells.keys()),broken:[],announcements:[],deliveries:[],machineShares:[]};}
 const old=room.wire||{},playerChanges=players.map(p=>({id:p.id,...delta(old.players?.find(prior=>prior.id===p.id),p)})).filter(p=>Object.keys(p).length>1),hintChanges={};
 for(const key of new Set([...Object.keys(old.hints||{}),...Object.keys(hintStrings)]))if(old.hints?.[key]!==hintStrings[key])hintChanges[key]=room.hints[key]?structuredClone(room.hints[key]):null;
 const result={...envelope,...delta(old.metadata,metadata),cells:wireCells(room,room.dirty)};
 if(playerChanges.length)result.players=playerChanges;
 if(Object.keys(hintChanges).length)result.hintChanges=hintChanges;
 for(const [field,next]of [['pileChanges',piles],['beltChanges',belts]]){const prior=old[field]||{},patch={};for(const key of new Set([...Object.keys(prior),...Object.keys(next)]))if(JSON.stringify(prior[key])!==JSON.stringify(next[key]))patch[key]=next[key]?structuredClone(next[key]):null;if(Object.keys(patch).length)result[field]=patch;}
 const teamChanges=delta(old.team,team);if(Object.keys(teamChanges).length)result.team=structuredClone(teamChanges);
 if(room.breakEvents.length)result.broken=room.breakEvents;
 if(room.announcements.length)result.announcements=room.announcements;
 if(room.endEvent)result.end=room.endEvent;
 if(room.deliveries.length)result.deliveries=room.deliveries;if(room.machineShares.length)result.machineShares=room.machineShares;
 room.wire={metadata,team:structuredClone(team),players:structuredClone(players),hints:hintStrings,pileChanges:structuredClone(piles),beltChanges:structuredClone(belts)};return result;
}
// Hazards remain a milestone 4 hook.
export function futureHazards() {}

function distance(ax,ay,bx,by){return Math.max(Math.abs(ax-bx),Math.abs(ay-by));}
function nearest(room,x,y,types){let best=null,bestDistance=Infinity;for(const find of room.finds){if(find.extracted||!types.includes(find.type))continue;const d=distance(x,y,find.cell%C.mapSize,Math.floor(find.cell/C.mapSize));if(d<bestDistance){best=find;bestDistance=d;}}return best?{find:best,distance:bestDistance}:null;}
export function removeFindHints(room,findId){for(const [index,hints]of Object.entries(room.hints)){for(const channel of ['metal','diamond','oil'])if(hints[channel]?.findId===findId)delete hints[channel];if(!Object.keys(hints).length)delete room.hints[index];}}
export function heatAt(distance,range){return distance>range?0:C.heatLevels-Math.round((C.heatLevels-1)*distance/range);}
export function updateDowsing(room,p){
 const tier=C.detectors.dowsing[p.dowsing-1],x=Math.floor(p.x),y=Math.floor(p.y),reading=tier?nearest(room,x,y,['oil']):null;
 p.rods={bearing:null,onPocket:false};
 if(!reading||reading.distance>tier.range)return;
 const f=reading.find,dx=f.cell%C.mapSize-x,dy=Math.floor(f.cell/C.mapSize)-y;
 p.rods={bearing:Math.atan2(dy,dx),onPocket:reading.distance<=C.dowsingCrossRadius};
 if(p.rods.onPocket){room.hints[f.cell]??={};room.hints[f.cell].oil={oil:true,findId:f.id};}
}
export function scanDetectors(room,p){
 const rx=Math.floor(p.x),ry=Math.floor(p.y),metal=C.detectors.metal[p.metal-1],diamond=C.detectors.diamond[p.diamond-1];
 if(metal)for(let y=Math.max(0,ry-metal.range);y<=Math.min(C.mapSize-1,ry+metal.range);y++)for(let x=Math.max(0,rx-metal.range);x<=Math.min(C.mapSize-1,rx+metal.range);x++){
  const reading=nearest(room,x,y,['silver','gold']);if(!reading||reading.distance>metal.range)continue;
  const index=y*C.mapSize+x,heat=heatAt(reading.distance,metal.range);room.hints[index]??={};
  if(heat>(room.hints[index].metal?.heat||0))room.hints[index].metal={heat,findId:reading.find.id};
 }
 if(diamond)for(const f of room.finds)if(!f.extracted&&f.type==='diamond'&&distance(rx,ry,f.cell%C.mapSize,Math.floor(f.cell/C.mapSize))<=diamond.range){room.hints[f.cell]??={};room.hints[f.cell].diamond={sparkle:true,findId:f.id};}
 updateDowsing(room,p);
}

// Per-seat signs are filtered before sending; shared detector hints are unchanged.
export function snapshotForPlayer(room,packet,p,previousMask=detectorMask(p)){const cells=packet.cells||[],indices=new Set(cells.map(c=>c.index));const reveal=packet.type==='diff'&&previousMask!==detectorMask(p)?wireCells(room,room.cells.keys()).filter(c=>c.surfaceSign&&!indices.has(c.index)):[];if(!cells.length&&!reveal.length)return packet;return {...packet,cells:[...cells,...reveal].map(c=>({...c,surfaceSign:surfaceVisible(c.surfaceSign,p)?c.surfaceSign:null}))};}
