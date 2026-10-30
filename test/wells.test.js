import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step,hit,snapshot,rockHp,wellBarrels,liveWell,dryWell} from '../rules.js';
import {catalog,requirement} from '../team-rules.js';
import {fillBots,botCommands,crewBots,landlocked} from '../bot-rules.js';
import {urgentTip} from '../public/goals.js';
import {pipeRoutes} from '../public/logistics-view.js';
import {serializeRoom,restoreRoom,SaveError} from '../save-rules.js';

// Oil wells run dry: a struck pocket holds C.team.wellBarrels barrels and its pump draws one a second, burned by the drill or sold.
const N=C.mapSize,at=(x,y)=>y*N+x,drillTeam={id:C.team.damagerId,publicId:C.team.damagerId,isTeam:true,nickname:'Drill',tool:C.rockTool};
// One explorer, and a two-cell oil field whose pockets sit in the surface blocks of cell and the cell to its right.
function oilRoom({hardcore=false,cell=at(2,2)}={}){const r=createRoom('WELL',5,false,0,false,hardcore),p=join(r,'a','Ana',0);p.publicId='a';r.finds=[{id:'oil-a',groupId:'oil-0',extracted:false,cell,row:0,type:'oil'},{id:'oil-b',groupId:'oil-0',extracted:false,cell:cell+1,row:0,type:'oil'}];return {r,p,cell};}
const strike=(r,cell)=>hit(r,drillTeam,cell%N,Math.floor(cell/N),r.cells[cell].hp);
const money=r=>r.fund+r.players.reduce((n,p)=>n+p.wallet,0);
const well=(r,i,left,extra={})=>Object.assign(r.cells[i],{row:30,hp:rockHp(r,30),damage:{},oilSite:true,oilRow:30,pumpBuilt:true,oilLeft:left,...extra});

test('a struck pocket is a well of wellBarrels barrels, rock toughness times as many in hardcore, and the strike says how many',()=>{
 for(const hardcore of [false,true]){const {r,cell}=oilRoom({hardcore});strike(r,cell);const c=r.cells[cell],want=C.team.wellBarrels*(hardcore?C.hardcore.hpMultiplier:1);
  assert.equal(c.oilSite,true);assert.equal(c.pumpBuilt,false);assert.equal(c.oilLeft,want);assert.equal(wellBarrels(r),want);
  const news=r.announcements.find(a=>a.type==='oil');assert.equal(news.cellLabel,'C3');assert.equal(news.barrels,want);}});

test('a pump draws its well down a barrel a second, goes on the wire once a barrel, runs dry at tick 900 and says so once',()=>{
 const {r,cell}=oilRoom();strike(r,cell);r.cells[cell].pumpBuilt=true;snapshot(r,true);let now=0,wired=0,dry=0;
 const tick=()=>{now+=C.tickMs;step(r,[],now);if((snapshot(r).cells||[]).some(c=>c.index===cell))wired++;dry+=r.announcements.filter(a=>a.type==='dry').length;};
 for(let i=1;i<C.team.wellBarrels*C.tickHz;i++){tick();assert.equal(r.oil.production,C.team.pumpBarrelsPerSecond);}
 assert.ok(Math.abs(r.cells[cell].oilLeft-0.1)<1e-9,'one tick of oil left: '+r.cells[cell].oilLeft);assert.equal(dry,0);assert.equal(catalog(r).find(e=>e.index===cell).left,1);
 tick();assert.equal(r.cells[cell].oilLeft,0,'dry after exactly 900 ticks');assert.equal(r.oil.production,C.team.pumpBarrelsPerSecond,'the last tick still pumps');assert.equal(wired,C.team.wellBarrels,'on the wire once a barrel');assert.equal(dry,1);
 assert.equal(r.announcements.find(a=>a.type==='dry').text,'The well at C3 ran dry. Dig another cell of its field, or follow the rods to a new pocket, and propose a pump.');
 const before=money(r);for(let i=0;i<50;i++)tick();assert.equal(r.oil.production,0);assert.equal(r.oil.sold,0);assert.equal(money(r),before,'sales stop');assert.equal(dry,1,'the well runs dry once');assert.equal(wired,C.team.wellBarrels,'a dry well stays off the wire');
 const entry=catalog(r).find(e=>e.index===cell);assert.equal(entry.built,true);assert.equal(entry.left,0);assert.equal(entry.dry,true);assert.equal(requirement(r,'pump',cell),'Requires an unbuilt confirmed oil site','a dry well cannot be pumped again');
 assert.equal(dryWell(r.cells[cell]),true);assert.equal(liveWell(r.cells[cell]),false);
 assert.deepEqual(snapshot(r,true).cells.filter(c=>'oilLeft' in c).map(c=>[c.index,c.oilLeft]),[[cell,0]],'only oil cells carry oilLeft');});

test('a bottomless well never runs dry, and a dry well beside a live one leaves half the oil',()=>{
 {const {r}=oilRoom(),i=at(1,1);well(r,i,null);let now=0;for(let k=0;k<2*C.team.wellBarrels*C.tickHz;k++){now+=C.tickMs;step(r,[],now);}
  assert.equal(r.cells[i].oilLeft,null);assert.equal(r.oil.production,C.team.pumpBarrelsPerSecond);assert.equal(liveWell(r.cells[i]),true);assert.equal(catalog(r).find(e=>e.index===i).left,null);
  assert.equal(snapshot(r,true).cells[i].oilLeft,null);}
 const production=lefts=>{const {r}=oilRoom();lefts.forEach((left,k)=>well(r,at(1+2*k,1),left));step(r,[],C.tickMs);return r.oil.production;};
 assert.equal(production([50,50]),2*C.team.pumpBarrelsPerSecond);assert.equal(production([50,0]),C.team.pumpBarrelsPerSecond);assert.equal(production([0,0]),0);});

test('every pump keeps its pipe, but oil flows only from live wells, and to the drill only while one pumps',()=>{
 const {r}=oilRoom(),live=at(2,3),dry=at(12,3);well(r,live,40);well(r,dry,0);
 let state=snapshot(r,true);assert.equal(pipeRoutes(state).length,2);assert.equal(pipeRoutes(state,true).length,1);assert.deepEqual(pipeRoutes(state,true)[0][0],[live%N+0.5,Math.floor(live/N)+0.5]);
 r.site=at(4,12);r.drill={index:r.site};state=snapshot(r,true);assert.equal(pipeRoutes(state).length,3);assert.equal(pipeRoutes(state,true).length,2);
 r.cells[live].oilLeft=0;state=snapshot(r,true);assert.equal(pipeRoutes(state).length,3);assert.deepEqual(pipeRoutes(state,true),[],'no live well: no flow, not even the trunk to the drill');});

test('the guide follows the live wells: dry wells with a struck cell, a starved rig, oil running low, and nothing at the magma',()=>{
 const {r,p}=oilRoom();p.x=p.y=6.5;const field=[at(2,12),at(3,12)],first=at(12,2),tip=(touch=false)=>{const state=snapshot(r,true);return urgentTip(state,state.players[0],touch);};
 r.site=at(12,12);r.drill={index:r.site};r.coolant=true;r.cells[r.site].row=130;
 // Never a well yet: the rig needs oil.
 assert.deepEqual(tip(),['The drill needs oil','The drill has nothing to burn. Buy dowsing rods at the hub and dig where they turn green. Then propose a pump in Team.']);
 // The first well ran dry and a cell of a known field is struck but not pumped: propose it.
 well(r,first,0);well(r,field[0],wellBarrels(r),{pumpBuilt:false});r.oilFields={'oil-0':{cells:field}};
 assert.equal(tip()[0],'Oil at C13: propose a pump');assert.ok(tip()[1].startsWith('Your wells ran dry. Go to the hub (E), open Team'),tip()[1]);assert.match(tip(true)[1],/^Your wells ran dry\. Tap Hub, open Team/);
 // That one ran dry too, and the rest of the field is unstruck: dig it. Then every known cell is struck: back to the rods.
 well(r,field[0],0);assert.deepEqual(tip(),['Your wells ran dry','The drill has nothing to burn. Dig the rest of the oil field: its cells are outlined on the minimap. Then propose a pump in Team.']);
 well(r,field[1],0);assert.deepEqual(tip(),['Your wells ran dry','The drill has nothing to burn. Buy dowsing rods at the hub and dig where they turn green. Then propose a pump in Team.']);
 // One live well with few barrels left: strike more, pointing at the nearest way to get them.
 r.cells[first].oilLeft=25;assert.deepEqual(tip(),['Oil running low: 25 barrels left','Strike more oil before the wells run dry: follow the rods to a new pocket.']);
 r.oilFields['oil-1']={cells:[at(5,14),at(6,14)]};assert.equal(tip()[1],'Strike more oil before the wells run dry: dig the rest of the field on the minimap.');
 well(r,at(5,14),wellBarrels(r),{pumpBuilt:false});assert.equal(tip()[1],'Strike more oil before the wells run dry: propose the pump at F15.');
 r.goal={item:'pump',index:at(5,14),key:'pump:'+at(5,14),price:1,multiplier:1,name:'Oil pump'};assert.equal(tip(),null,'a pump is already on its way');r.goal=null;
 r.cells[first].oilLeft=C.team.wellLowBarrels+1;assert.equal(tip(),null,'plenty left');
 // At the magma the rig burns nothing: no oil tips while the World Breaker is the next step.
 r.cells[first].oilLeft=0;assert.equal(tip()[0],'Oil at F15: propose a pump');r.cells[r.site].row=C.outerRow;assert.equal(tip(),null);});

test('a starved rig sends the bot crew to the rest of a known oil field, and they strike it within a minute',()=>{
 const r=createRoom('WELLS',5,false,0);r.botLevel='normal';const p=join(r,'human-a','Ana',0);p.publicId='a';fillBots(r,0);
 const struck=at(2,14),rest=at(1,14),other=at(14,1);r.finds=[{id:'oil-a',groupId:'oil-0',extracted:true,cell:struck,row:2,type:'oil'},{id:'oil-b',groupId:'oil-0',extracted:false,cell:rest,row:2,type:'oil'}];r.oilFields={'oil-0':{cells:[struck,rest]}};
 well(r,struck,0,{row:3,hp:rockHp(r,3),oilRow:2});well(r,other,0);
 r.site=at(12,12);r.drill={index:r.site};r.coolant=true;Object.assign(r.cells[r.site],{row:100,hp:rockHp(r,100),damage:{}});for(const b of crewBots(r))b.boarded=true;
 let now=0;for(;now<60*C.tapWindowMs&&!r.cells[rest].oilSite;now+=C.tickMs){if(now%C.bots.fillEveryMs<C.tickMs)fillBots(r,now);step(r,botCommands(r,now),now);}
 assert.equal(r.cells[rest].oilSite,true,'struck within a minute');assert.equal(r.cells[rest].oilLeft,wellBarrels(r));assert.ok(crewBots(r).every(b=>!b.boarded),'nobody rides a starved rig');});

test('a mech crew strikes a field cell ringed by shafts by digging the shaft beside it',()=>{
 const r=createRoom('RING',5,false,0);r.botLevel='normal';const p=join(r,'human-a','Ana',0);p.publicId='a';fillBots(r,0);
 const rest=at(2,13),struck=at(14,1);r.finds=[{id:'oil-a',groupId:'oil-0',extracted:true,cell:struck,row:2,type:'oil'},{id:'oil-b',groupId:'oil-0',extracted:false,cell:rest,row:8,type:'oil'}];r.oilFields={'oil-0':{cells:[struck,rest]}};
 well(r,struck,0,{row:3,hp:rockHp(r,3),oilRow:2});
 // The rest of the field sits in a shaft ringed by shafts, as a mech's 3 by 3 leaves it: nobody can belay into it from the surface.
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const row=dx||dy?6:5;Object.assign(r.cells[at(2+dx,13+dy)],{row,hp:rockHp(r,row),damage:{}});}assert.equal(landlocked(r,rest),true);
 r.site=at(12,12);r.drill={index:r.site};r.coolant=true;Object.assign(r.cells[r.site],{row:100,hp:rockHp(r,100),damage:{}});for(const b of crewBots(r)){b.tool=C.tools.length-1;b.lighting=C.lighting.length;b.boarded=true;}
 let now=0;for(;now<60*C.tapWindowMs&&!r.cells[rest].oilSite;now+=C.tickMs){if(now%C.bots.fillEveryMs<C.tickMs)fillBots(r,now);step(r,botCommands(r,now),now);}
 assert.equal(r.cells[rest].oilSite,true,'struck within a minute');});

test('a save keeps every well: barrels left, dry, bottomless, and a well saved before wells ran dry is bottomless',()=>{
 const r=createRoom('SAVE',5,false,0,false,true),p=join(r,'tok-a','Ada',0);p.publicId='pa';const lefts=[[at(1,1),12.5],[at(3,1),0],[at(5,1),null],[at(7,1),wellBarrels(r)]],old=at(9,1);
 for(const [i,left] of lefts)well(r,i,left,{pumpBuilt:left!==wellBarrels(r)});well(r,old,undefined);delete r.cells[old].oilLeft;
 const data=JSON.parse(JSON.stringify(serializeRoom(r))),back=restoreRoom(data,{code:'BACK',now:r.now+5000});
 for(const [i,left] of lefts)assert.equal(back.cells[i].oilLeft,left,'cell '+i);
 assert.equal('oilLeft' in back.cells[old],false);assert.equal(liveWell(back.cells[old]),true);
 for(const bad of [-1,'90',true]){const broken=structuredClone(data);broken.cells[at(1,1)].oilLeft=bad;assert.throws(()=>restoreRoom(broken,{code:'BAD',now:0}),SaveError,String(bad));}});
