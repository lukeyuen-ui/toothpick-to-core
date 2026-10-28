import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step,hit,hp,rockHp,rockToughness,payout,snapshot} from '../rules.js';
import {catalog} from '../team-rules.js';
import {incomeMultiplier} from '../economy-rules.js';
import {setupShowcase} from '../showcase-rules.js';
import {validMessage} from '../resilience.js';
import {mergeSnapshot} from '../public/protocol.js';

const H=C.hardcore,near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(b)),`${a} != ${b}`),cmd=(p,type,extra={})=>({player:p,message:{type,...extra}});
function room({hardcore=true,quick=false,fast=false,count=1}={}){const r=createRoom('HARD',42,fast,0,quick,hardcore);r.finds=[];for(let i=0;i<count;i++){const p=join(r,'p'+i,'P'+i,0);p.publicId='p'+i;p.x=p.y=6.5;p.lastActive=0;}return r;}
// Toothpick taps, sent the way a person does (a tap every 200 ms), until the cell at (3,2) gives up its first row.
function toothpickTaps(r){const p=r.players[0],i=2*C.mapSize+3;p.x=p.y=2.5;let taps=0;while(r.cells[i].row===0&&taps<100){taps++;step(r,[cmd(p,'tap',{x:3,y:2})],r.now+2*C.tickMs);}return {p,i,taps};}

test('a Hardcore room says so in every snapshot, on the client too, and keeps the mode through Dig again',()=>{
 const r=room(),p=r.players[0];assert.equal(r.hardcore,true);
 const state=mergeSnapshot(null,snapshot(r,true));assert.equal(state.hardcore,true);
 step(r,[],r.now+C.tickMs);const later=mergeSnapshot(state,snapshot(r));assert.equal(later.hardcore,true,'diffs leave the flag in place');
 assert.equal(rockToughness(later),H.hpMultiplier);assert.equal(rockHp(later,40),hp(40)*H.hpMultiplier,'the renderers measure cracks against the tougher rock');
 const full=room({hardcore:false});assert.equal(full.hardcore,false);assert.equal(snapshot(full,true).hardcore,false);assert.equal(rockHp(mergeSnapshot(null,snapshot(full,true)),40),hp(40));
 r.won=true;step(r,[cmd(p,'reset')],r.now+C.tickMs);assert.equal(r.round,1);assert.equal(r.hardcore,true);assert.equal(snapshot(r,true).hardcore,true);
 assert.ok(r.cells.every(c=>c.hp===hp(0)*H.hpMultiplier),'the new planet is hardcore rock too');});

test(`Hardcore rock takes ${H.hpMultiplier} times the toothpick taps and pays 1/${H.valueDivisor} as much, row after row`,()=>{
 const fullRoom=room({hardcore:false}),hardRoom=room(),full=toothpickTaps(fullRoom),hard=toothpickTaps(hardRoom);
 assert.equal(full.taps,hp(0)/C.tools[0].tap);assert.equal(hard.taps,full.taps*H.hpMultiplier);
 near(full.p.hold.value,payout(0));near(hard.p.hold.value,payout(0)/H.valueDivisor);
 assert.equal(hardRoom.cells[hard.i].row,1);assert.equal(hardRoom.cells[hard.i].hp,hp(1)*H.hpMultiplier,'the next row is tough as well');assert.equal(fullRoom.cells[full.i].hp,hp(1));});

test(`Hardcore ore, finds and oil pay 1/${H.valueDivisor} as much at the same prices; FAST composes once`,()=>{
 for(const fast of [false,true]){const r=room({fast}),p=r.players[0];r.finds=[{id:'g',cell:0,row:0,type:'gold'}];p.x=0.5;p.y=1.5;hit(r,p,0,0,9999);const factor=(fast?C.fastMultiplier:1)/H.valueDivisor;
  near(p.hold.value,(1+C.findBonuses.gold)*factor);near(incomeMultiplier(r),factor);
  r.cells[2].pumpBuilt=true;p.lastWorked=0;const before=r.fund;step(r,[],100);near(r.fund-before,C.team.barrelPrice*C.tickSeconds*factor*C.team.machinePersonalFraction);}
 const hard=room({count:2}),full=room({hardcore:false,count:2});assert.deepEqual(catalog(hard).map(e=>[e.item,e.price]),catalog(full).map(e=>[e.item,e.price]));
 const r=room(),p=r.players[0];p.wallet=100;step(r,[cmd(p,'buy',{kind:'tool'})],r.now+C.tickMs);assert.equal(p.tool,1);near(p.wallet,100-C.tools[1].cost);});

test('Quick and Showcase are untouched: no hardcore flag, ordinary rock, ordinary pay',()=>{
 const quick=createRoom('QUIK',42,false,0,true,true);assert.equal(quick.hardcore,false,'quick wins if a message asks for both');assert.equal(quick.quick,true);assert.ok(quick.cells.every(c=>c.hp===hp(0)));near(incomeMultiplier(quick),C.quickValueMultiplier);assert.equal(snapshot(quick,true).hardcore,false);
 const show=createRoom('SHOW',42,false,0,true);show.botLevel='off';setupShowcase(show);assert.equal(show.hardcore,false);assert.equal(show.quick,false);assert.ok(show.cells.every(c=>c.hp===hp(c.row)));near(incomeMultiplier(show),1);assert.equal(snapshot(show,true).hardcore,false);
 const full=createRoom('FULL',42,false,0);assert.equal(full.hardcore,false);assert.ok(full.cells.every(c=>c.hp===hp(0)));near(incomeMultiplier(full),1);
 for(const m of [{type:'create',hardcore:true},{type:'create',hardcore:false},{type:'create'}])assert.equal(validMessage(m),true,JSON.stringify(m));
 for(const m of [{type:'create',hardcore:'yes'},{type:'create',hardcore:1}])assert.equal(validMessage(m),false,JSON.stringify(m));});

test(`Hardcore machines keep their power: the drill bites as hard but each row takes ${H.hpMultiplier} times as long`,()=>{
 const bite=hardcore=>{const r=room({hardcore}),p=r.players[0];r.site=200;r.drill={index:200};r.coolant=true;r.cells[200]={row:145,hp:rockHp(r,145),damage:{}};r.cells[0].pumpBuilt=r.cells[1].pumpBuilt=true;p.boarded=true;const start=r.cells[200].hp;step(r,[],r.now+C.tickMs);return {damage:start-r.cells[200].hp,start,speed:r.oil.speed};};
 const full=bite(false),hard=bite(true);assert.ok(full.speed>0);near(hard.damage,full.damage);near(hard.damage,hp(145)/(C.team.drillSecondsPerBlock*C.tickHz)*hard.speed);near(hard.start/hard.damage,H.hpMultiplier*full.start/full.damage);});

for(const start of [20,170])test('the World Breaker still opens a hardcore core in exactly 60 seconds from row '+start,()=>{
 const r=room();r.site=200;r.drill={index:200};r.coolant=true;r.cells[200]={row:start,hp:rockHp(r,start),damage:{}};r.fund=C.teamItems.worldBreaker.price;
 step(r,[cmd(r.players[0],'propose',{item:'worldBreaker'})],r.now+C.tickMs);const began=r.worldBreaker.startedAt;
 step(r,[],began+C.team.worldBreakerMs-1);assert.equal(r.won,false);step(r,[],began+C.team.worldBreakerMs);
 assert.equal(r.cells[200].row,C.finalRow);assert.equal(r.won,true);assert.equal(r.wonAt,began+C.team.worldBreakerMs);for(const i of [199,201,184,216])assert.equal(r.cells[i].row,C.finalRow,'neighbour '+i);
 near(r.fund,Array.from({length:C.finalRow-start},(_,i)=>payout(start+i)*(i>=C.deposits.richRows?C.deposits.dryFactor:1)*C.team.drillYield).reduce((a,b)=>a+b,0)/H.valueDivisor);});
