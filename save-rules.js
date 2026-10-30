import {createHmac,timingSafeEqual,randomBytes,randomUUID} from 'node:crypto';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {C} from './config.js';
import {createRoom,rockHp} from './rules.js';
import {cleanNickname} from './presence-rules.js';
import {footprint} from './excavator-rules.js';

// Hardcore save codes. A hardcore expedition is tuned for about two weeks of play, but rooms live in server memory: every deploy and
// C.idleMs of quiet end them. So the authority hands each crewmate a signed save code, and a code rebuilds the planet in a fresh room.
//
// serializeRoom: a plain JSON picture of what the rules need to carry on. Every cell (its row, damage shares, signs, oil, lights and any
// other plain value on it; its hit points as the share of the current block still standing, so toughness always comes from the restored
// room's hardcore flag and a recalibration rescales a half-dug block instead of leaving it soft), the finds, hints, piles, belts, conveyor
// lines and excavators, the team (fund, goal, vote, locks, site, drill, coolant, World Breaker) and the mode flags. Clock fields are kept
// relative to room.now, so a vote, a cooldown or the overdrive picks up where it stopped. People are keyed by nickname with their
// progress (wallet, hold, tools, suit, pods, lights, detectors, machines, award tallies); they come back at the surface, so depth,
// shafts and drill seats are not kept, and nor are the console gauges (they belong to whoever sits down next). Bots are left out (the
// bot rules refill their seats), and so is everything a tick rebuilds (oil readings, toasts, events, the wire cache).
// References to people (ore and machine owners, ballots, damage shares) become 'p:' plus that person's key, so no token or id is saved.
//
// restoreRoom: reads every field again, checks it and copies it into a fresh room with a new code, so a damaged or hand-made picture
// can never leave a value the rules would trip on. Saved people wait in room.roster until someone joins with their nickname
// (claimSaved), and anyone else joins as a new explorer with the usual starting kit.
//
// A code is TPC1.<base64url of the deflated JSON>.<base64url HMAC-SHA256 of everything before the last dot>, keyed by SAVE_SECRET.
export const SAVE_VERSION=1,CODE_PREFIX='TPC1';
const DEFAULT_SECRET='toothpick-to-the-core public save key 1';
export function saveSecret(){return process.env.SAVE_SECRET||DEFAULT_SECRET;}
export function usingDefaultSecret(){return !process.env.SAVE_SECRET;}
export class SaveError extends Error{}
export const SAVE_TEXT={damaged:'That save code is damaged. Copy the whole code and try again.',forged:'That save code was changed, or it was made by another server.',version:'That save code comes from another version of the game.',mode:'Only hardcore expeditions can be resumed from a save code.',won:'That expedition already reached the core. Start a new one.'};
const fail=key=>{throw new SaveError(SAVE_TEXT[key]);};
const B64=/^[A-Za-z0-9_-]+$/,N=C.mapSize,CELLS=N*N,FINDS=new Set(C.finds.map(f=>f.type)),LEVELS=['off',...Object.keys(C.bots.levels)],put=(o,k,v)=>Object.defineProperty(o,k,{value:v,enumerable:true,writable:true,configurable:true});
// Progress a person keeps. Award order fields hold room.achievement ticks and are Infinity until earned (null in JSON).
const LEVELS_OWNED=['pods','tool','mobility','lighting',...C.detectorLines,'excavatorKits','beltsBuilt','deepestRow'],AMOUNTS=['wallet','lifetime','deliveredValue','bestFind','contributed','drillSeconds'],ORDERS=['deliveredAt','bestFindAt','contributedAt','deepestAt','drillAt'],FLAGS=['firstCargo','deepCoach'];
const roster=room=>room.roster&&room.rosterRound===room.round?room.roster:[];
// Who is saved: people seated or in their grace period first (a returning nickname claims the liveliest record), then those who left, then
// saved people nobody has claimed since the last restore. Bots never.
function savedPeople(room){const people=room.players.filter(p=>!p.bot);return [...people.filter(p=>!p.departed),...people.filter(p=>p.departed),...roster(room)];}
function progressOf(p){const out={nickname:p.nickname};for(const k of [...LEVELS_OWNED,...AMOUNTS,...FLAGS])out[k]=p[k];for(const k of ORDERS)out[k]=Number.isFinite(p[k])?p[k]:null;out.hold={value:p.hold.value,units:p.hold.units,lots:p.hold.lots.map(l=>({value:l.value,order:l.order}))};return out;}
const clone=v=>v==null?null:JSON.parse(JSON.stringify(v)),share=x=>Math.round(Math.min(1,Math.max(0,x))*1e12)/1e12;// twelve places: exact through a round trip

export function serializeRoom(room){
 room.expedition??=randomUUID();// one id per expedition, so two crewmates resuming the same one land in the same room
 const now=room.now,people=new Map(),players={},used=new Set();
 for(const p of savedPeople(room)){let key=p.nickname,n=1;while(used.has(key))key=p.nickname+' ('+(++n)+')';used.add(key);people.set(p.id,'p:'+key);people.set(p.publicId,'p:'+key);put(players,key,progressOf(p));}
 const who=id=>id==null?undefined:people.get(id),machines=new Set(room.excavators.map(m=>m.damagerId)),damager=id=>id===C.team.damagerId||id==='bore'||machines.has(id)?id:people.get(id);
 const owned=thing=>{const {ownerId,...rest}=thing,ref=who(ownerId);return ref?{...rest,ownerId:ref}:rest;};
 const cell=c=>{const out={};for(const [k,v]of Object.entries(c)){if(k==='hp')out.left=share(v/rockHp(room,c.row));else if(k==='damage'){const d={};for(const [id,amount]of Object.entries(v)){const key=damager(id);if(key&&amount>0)d[key]=amount;}out.damage=d;}else if(v===null||['number','string','boolean'].includes(typeof v))out[k]=v;}return out;};
 const vote=room.vote&&(({proposerId,voters,ballots,endsAt,...rest})=>({...clone(rest),proposerId:who(proposerId)??null,voters:voters.map(who).filter(Boolean),ballots:Object.fromEntries(Object.entries(ballots).map(([id,yes])=>[who(id),yes]).filter(([key])=>key)),endsAt:endsAt-now}))(room.vote);
 const wb=room.worldBreaker&&{...clone(room.worldBreaker),startedAt:room.worldBreaker.startedAt-now,endsAt:room.worldBreaker.endsAt-now};
 return {v:SAVE_VERSION,expedition:room.expedition,hardcore:!!room.hardcore,quick:!!room.quick,showcase:!!room.showcase,fast:!!room.fast,seed:room.seed,round:room.round,tick:room.tick,achievement:room.achievement,deepest:room.deepest,
  clock:{createdAt:room.createdAt-now},bots:{level:room.botLevel||'off',serial:room.botSerial||0},
  cells:room.cells.map(cell),broken:[...room.broken].sort((a,b)=>a-b),finds:room.finds.map(f=>({...f})),hints:clone(room.hints),oilFields:clone(room.oilFields),
  piles:Object.fromEntries(Object.entries(room.piles).map(([i,pile])=>[i,{value:pile.value,units:pile.units,lots:pile.lots.map(owned)}])),belts:Object.fromEntries(Object.entries(room.belts).map(([i,belt])=>[i,owned(belt)])),
  conveyorLines:room.conveyorLines.map(line=>owned({source:line.source,path:[...line.path],length:line.length,ownerId:line.ownerId})),beltProgress:room.beltProgress,cargoSequence:room.cargoSequence,
  excavators:room.excavators.map(m=>owned({id:m.id,ownerId:m.ownerId,cx:m.cx,cy:m.cy,cells:[...m.cells],x:m.x,y:m.y,mobility:m.mobility,machineSpeed:m.machineSpeed,drive:clone(m.drive),phase:m.phase,active:m.active,status:m.status,hopper:{value:m.hopper.value,units:m.hopper.units,lots:m.hopper.lots.map(owned)},beltProgress:m.beltProgress,depth:m.depth,...(Number.isFinite(m.fullToastAt)?{fullToastAt:m.fullToastAt-now}:{})})),excavatorSequence:room.excavatorSequence,
  team:{fund:room.fund,fundIncome:room.fundIncome,fundEarned:room.fundEarned,drillEarned:room.drillEarned||0,drillIncome:room.drillIncome||0,drillTotal:room.drillTotal||0,consoleSeed:room.consoleSeed??null,goal:clone(room.goal),vote:vote||null,locks:Object.fromEntries(Object.entries(room.locks).map(([key,until])=>[key,until-now])),site:room.site,drill:room.drill?{index:room.drill.index}:null,coolant:!!room.coolant,worldBreaker:wb||null,won:!!room.won},
  players};
}

export function encodeSave(data,secret=saveSecret()){const body=CODE_PREFIX+'.'+deflateRawSync(Buffer.from(JSON.stringify(data))).toString('base64url');return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');}
// The tag is checked before anything inside the code is read, and inflating stops at C.save.maxJsonBytes.
export function decodeSave(code,secret=saveSecret()){
 if(typeof code!=='string'||code.length>C.save.maxCodeBytes)fail('damaged');
 const parts=code.replace(/\s+/g,'').split('.');// chat apps wrap long codes
 if(parts.length!==3||parts[0]!==CODE_PREFIX||!B64.test(parts[1])||!B64.test(parts[2]))fail('damaged');
 const tag=Buffer.from(parts[2],'base64url'),want=createHmac('sha256',secret).update(parts[0]+'.'+parts[1]).digest();
 if(tag.length!==want.length||!timingSafeEqual(tag,want))fail('forged');
 let data;try{data=JSON.parse(inflateRawSync(Buffer.from(parts[1],'base64url'),{maxOutputLength:C.save.maxJsonBytes}).toString('utf8'));}catch{fail('damaged');}
 if(!data||typeof data!=='object'||Array.isArray(data))fail('damaged');
 if(data.v!==SAVE_VERSION)fail('version');
 if(data.hardcore!==true||data.quick!==false||data.showcase!==false)fail('mode');
 if(data.team?.won)fail('won');
 return data;
}
// Only a live hardcore expedition is saved.
export function makeSaveCode(room){return room.hardcore&&!room.quick&&!room.showcase&&!room.won?encodeSave(serializeRoom(room)):null;}

// Checks for restoreRoom: each returns the value or throws the damaged-code error.
const bad=()=>fail('damaged'),isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const obj=v=>isObject(v)?v:bad(),list=(v,max=1e6)=>Array.isArray(v)&&v.length<=max?Array.from(v):bad(),entries=v=>Object.entries(obj(v));// a dense copy: a hole reads as undefined and is refused
const num=(v,lo=-Infinity,hi=Infinity)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi?v:bad();
const int=(v,lo=0,hi=Number.MAX_SAFE_INTEGER)=>Number.isInteger(v)&&v>=lo&&v<=hi?v:bad();
const flag=v=>typeof v==='boolean'?v:bad(),text=(v,max=200)=>typeof v==='string'&&v.length<=max?v:bad();
const index=v=>int(v,0,CELLS-1),indexKey=k=>/^\d{1,4}$/.test(k)?index(Number(k)):bad(),row=v=>int(v,0,C.finalRow);
// Upgrade levels are capped at what this version of the game sells, so an older save still loads after a catalogue change.
const level=(v,top)=>Math.min(int(v??0),top);

export function restoreRoom(data,{code,now=Date.now()}={}){
 const d=obj(data);if(d.v!==SAVE_VERSION)fail('version');if(d.hardcore!==true||d.quick!==false||d.showcase!==false)fail('mode');if(d.team?.won)fail('won');
 const cells=list(d.cells);if(cells.length!==CELLS)fail('version');
 const room=createRoom(code,int(d.seed,0,2**32-1),flag(d.fast),now,false,true),t=obj(d.team);
 room.expedition=typeof d.expedition==='string'&&/^[A-Za-z0-9-]{8,64}$/.test(d.expedition)?d.expedition:randomUUID();
 // People first: everything else refers to them.
 const people=new Map();room.roster=[];room.rosterRound=room.round=int(d.round);
 for(const [key,raw]of entries(d.players)){if(room.roster.length>=256)bad();const s=obj(raw),hold=obj(s.hold),lots=list(hold.lots).map(l=>({value:num(obj(l).value),order:num(l.order)}));
  const p={nickname:cleanNickname(text(s.nickname)),id:'saved-'+randomBytes(12).toString('hex'),publicId:randomUUID(),hold:{value:num(hold.value),units:lots.length,lots}};
  for(const [k,top]of [['pods',C.cargoPods.length],['tool',C.tools.length-1],['mobility',C.mobility.length-1],['lighting',C.lighting.length],...C.detectorLines.map(k=>[k,C.detectors[k].length]),['excavatorKits',C.excavator.maxPerPlayer],['beltsBuilt',Number.MAX_SAFE_INTEGER]])p[k]=level(s[k],top);
  p.deepestRow=int(s.deepestRow??-1,-1,C.finalRow);for(const k of AMOUNTS)p[k]=num(s[k]??0);for(const k of ORDERS)p[k]=s[k]==null?Infinity:num(s[k],0);for(const k of FLAGS)p[k]=flag(s[k]??false);
  room.roster.push(p);people.set('p:'+key,p);}
 const person=ref=>people.get(ref)??bad(),ownerOf=v=>v==null?{}:{ownerId:person(v).publicId};
 const lot=raw=>{const l=obj(raw);return {value:num(l.value),order:num(l.order),...ownerOf(l.ownerId),...(l.beltEntry!=null?{beltEntry:flag(l.beltEntry)}:{}),...(l.viaHoist!=null?{viaHoist:flag(l.viaHoist)}:{})};};
 // Machines next: their damage shares are keyed by their own ids.
 const E=C.excavator,ids=new Set();let sequence=int(d.excavatorSequence??0);
 room.excavators=list(d.excavators,64).map(raw=>{const m=obj(raw),id=text(m.id,40),match=/^excavator-(\d{1,6})$/.exec(id);if(!match||ids.has(id))bad();ids.add(id);sequence=Math.max(sequence,Number(match[1]));
  const cx=int(m.cx,E.halfSize,N-1-E.halfSize),cy=int(m.cy,E.halfSize,N-1-E.halfSize),hopper=obj(m.hopper),hopperLots=list(hopper.lots).map(lot),drive=m.drive==null?null:{x:num(obj(m.drive).x,0,N),y:num(m.drive.y,0,N)},phase=m.phase==='driving'||m.phase==='placed'?m.phase:bad();
  return {id,...ownerOf(m.ownerId),cx,cy,cells:footprint(cx,cy),x:num(m.x,0,N),y:num(m.y,0,N),mobility:level(m.mobility,C.mobility.length-1),machineSpeed:num(m.machineSpeed??E.driveSpeed,0,C.mapSize),drive,phase,active:flag(m.active),status:text(m.status),hopper:{value:num(hopper.value),units:hopperLots.length,lots:hopperLots},beltProgress:num(m.beltProgress??0,0,1),depth:row(m.depth??0),damagerId:'@'+id,...(m.fullToastAt!=null?{fullToastAt:now+num(m.fullToastAt)}:{})};});
 room.excavatorSequence=sequence;
 const damagers=new Set([C.team.damagerId,'bore',...room.excavators.map(m=>m.damagerId)]);
 // Cells keep anything else the rules have put on them as long as it is a plain value; the fields the rules read are checked one by one.
 room.cells=cells.map(raw=>{const c=obj(raw),r=row(c.row),out={row:r,hp:num(c.left,0,1)*rockHp(room,r),damage:{}};
  for(const [k,v]of entries(c.damage))out.damage[damagers.has(k)?k:k.startsWith('p:')?person(k).id:bad()]=num(v,0);
  for(const [k,v]of Object.entries(c)){if(k in out||k==='left')continue;if(!/^[a-z][A-Za-z0-9]{0,31}$/.test(k)||!(v===null||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v))||(typeof v==='string'&&v.length<=40)))bad();out[k]=v;}
  for(const k of ['richStart','oilRow','litDepth'])if(k in out)row(out[k]);for(const k of ['oilSite','pumpBuilt','shaftLights'])if(k in out)flag(out[k]);
  // Barrels left in a well: null is bottomless, and so is a well saved before wells ran dry (no oilLeft at all).
  if('oilLeft' in out&&out.oilLeft!==null)num(out.oilLeft,0);
  if('surfaceSign' in out&&!FINDS.has(out.surfaceSign))bad();if('oilField' in out&&!/^oil-\d{1,4}$/.test(out.oilField))bad();return out;});
 room.broken=new Set(list(d.broken,CELLS).map(index));
 room.finds=list(d.finds,4096).map(raw=>{const f=obj(raw);if(!FINDS.has(f.type))bad();return {id:text(f.id,40),...(f.groupId!=null?{groupId:text(f.groupId,40)}:{}),extracted:flag(f.extracted),cell:index(f.cell),row:row(f.row),type:f.type,...(f.surface!=null?{surface:flag(f.surface)}:{})};});
 room.hints={};for(const [k,raw]of entries(d.hints)){const h=obj(raw),out={};
  if(h.metal!=null)out.metal={heat:int(obj(h.metal).heat,0,C.heatLevels),findId:text(h.metal.findId,40)};if(h.diamond!=null)out.diamond={sparkle:flag(obj(h.diamond).sparkle),findId:text(h.diamond.findId,40)};if(h.oil!=null)out.oil={oil:flag(obj(h.oil).oil),findId:text(h.oil.findId,40)};
  if(Object.keys(out).length)room.hints[indexKey(k)]=out;}
 room.oilFields={};for(const [k,raw]of entries(d.oilFields)){if(!/^oil-\d{1,4}$/.test(k))bad();room.oilFields[k]={cells:list(obj(raw).cells,CELLS).map(index)};}
 room.piles={};for(const [k,raw]of entries(d.piles)){const pile=obj(raw),lots=list(pile.lots).map(lot);if(lots.length)room.piles[indexKey(k)]={value:num(pile.value),units:lots.length,lots};}
 room.belts={};for(const [k,raw]of entries(d.belts)){const belt=obj(raw);room.belts[indexKey(k)]={next:belt.next==null?null:index(belt.next),...ownerOf(belt.ownerId)};}
 room.conveyorLines=list(d.conveyorLines,1024).map(raw=>{const line=obj(raw),path=list(line.path,CELLS*2).map(index);return {source:index(line.source),path,length:path.length,...ownerOf(line.ownerId)};});
 room.beltProgress=num(d.beltProgress??0,0,1);room.cargoSequence=num(d.cargoSequence??0,0);room.tick=int(d.tick??0);room.achievement=num(d.achievement??0,0);
 room.deepest=Math.max(row(d.deepest??0),...room.cells.map(c=>c.row));room.createdAt=now+num(obj(d.clock).createdAt,-Number.MAX_SAFE_INTEGER,0);
 const bots=obj(d.bots??{});room.botLevel=LEVELS.includes(bots.level)?bots.level:'off';room.botSerial=int(bots.serial??0);
 // The team. Prices, names and keys were fixed when the goal or vote was proposed and are carried as they were.
 for(const k of ['fund','fundIncome','fundEarned','drillEarned','drillIncome','drillTotal'])room[k]=num(t[k]??0);
 if(t.consoleSeed!=null)room.consoleSeed=int(t.consoleSeed,0,2**31);
 room.site=t.site==null?null:index(t.site);room.drill=t.drill==null?null:room.site!=null?{index:room.site}:bad();room.coolant=flag(t.coolant);
 room.locks={};for(const [k,v]of entries(t.locks??{})){if(!/^[a-zA-Z]{1,20}(:\d{1,4})?$/.test(k))bad();room.locks[k]=now+num(v);}
 const item=v=>v==null?null:typeof v==='string'&&Object.hasOwn(C.teamItems,v)?v:bad();
 const purchase=g=>({item:item(g.item),index:g.index==null?null:index(g.index),price:num(g.price,0),multiplier:num(g.multiplier,0),key:text(g.key,40),name:text(g.name),...(g.path!=null?{path:list(g.path,CELLS*2).map(index),newCells:int(g.newCells??0)}:{})});
 room.goal=t.goal==null?null:purchase(obj(t.goal));if(room.goal&&(!room.goal.item||(room.goal.item==='conveyor'&&!room.goal.path)))bad();// buying a conveyor lays its saved path
 if(t.vote!=null){const v=obj(t.vote),voters=list(v.voters,256).map(ref=>person(ref).publicId),ballots={};for(const [ref,yes]of entries(v.ballots))ballots[person(ref).publicId]=flag(yes);
  const kind=['site','conveyor','item'].includes(v.kind)?v.kind:bad();room.vote={kind,...purchase(v),proposerId:v.proposerId==null?null:person(v.proposerId).publicId,proposerName:text(v.proposerName),voters,ballots,endsAt:now+num(v.endsAt)};
  if(kind==='site'?room.vote.index==null:!room.vote.item||(room.vote.item==='conveyor'&&!room.vote.path))bad();}
 if(t.worldBreaker!=null){const w=obj(t.worldBreaker);room.worldBreaker={startedAt:now+num(w.startedAt),startRow:row(w.startRow),endsAt:now+num(w.endsAt),...Object.fromEntries(['bonus','charge','rate'].filter(k=>w[k]!=null).map(k=>[k,num(w[k])]))};if(!room.drill)bad();}
 room.saveNext=now;// the resumed room sends its first save at once, so every crewmate's lobby points at the new room
 return room;
}

// A person joining a restored room with a saved nickname takes that saved progress (an exact match first, then ignoring case).
// They also take the saved public id, so their ore, belts, machine and ballots are theirs again, and their damage shares on half-dug cells.
// Call it right after join() makes a new player, before the server hands out a public id.
export function claimSaved(room,p){const list=roster(room);if(!list.length||p.bot)return null;const name=p.nickname,lower=name.toLowerCase();let i=list.findIndex(s=>s.nickname===name);if(i<0)i=list.findIndex(s=>s.nickname.toLowerCase()===lower);if(i<0)return null;
 const saved=list.splice(i,1)[0];for(const k of [...LEVELS_OWNED,...AMOUNTS,...ORDERS,...FLAGS])p[k]=saved[k];p.hold={value:saved.hold.value,units:saved.hold.units,lots:saved.hold.lots.map(l=>({...l}))};p.publicId=saved.publicId;
 for(const cell of room.cells){const amount=cell.damage[saved.id];if(amount!==undefined){delete cell.damage[saved.id];cell.damage[p.id]=(cell.damage[p.id]||0)+amount;}}
 return saved;}

// When to send the next save: every C.save.everyMs, and C.save.minGapMs after a milestone (a purchase, a site or goal, a pump or belt,
// the drill, the World Breaker, someone joining or leaving). Only live hardcore expeditions save.
export function milestoneKey(room){let pumps=0;for(const c of room.cells)if(c.pumpBuilt)pumps++;return [room.round,room.site,!!room.drill,!!room.coolant,!!room.worldBreaker,room.goal?.key,pumps,room.conveyorLines.length,room.excavators.length,...room.players.filter(p=>!p.bot&&!p.departed).map(p=>[p.publicId,p.tool,p.mobility,p.pods,p.lighting,...C.detectorLines.map(k=>p[k]),p.excavatorKits].join(','))].join('|');}
export function saveDue(room,now){if(!room.hardcore||room.quick||room.showcase||room.won)return false;const key=milestoneKey(room);if(room.saveKey!==key){if(room.saveKey!==undefined)room.saveNext=Math.min(room.saveNext??Infinity,now);room.saveKey=key;}room.saveNext??=now+C.save.everyMs;return now>=room.saveNext&&now-(room.savedAt??-Infinity)>=C.save.minGapMs;}
export function markSaved(room,now){room.savedAt=now;room.saveNext=now+C.save.everyMs;}
// The wire message: the code, when and how deep, and who it is for.
export function saveMessage(room,code,p,now){return {type:'save',code,savedAt:now,row:room.deepest,meta:{room:room.code,nickname:p.nickname,round:room.round,crew:room.players.filter(q=>!q.bot&&!q.departed).map(q=>q.nickname)}};}
