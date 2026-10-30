import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step,hp,payout} from '../rules.js';
import {operate} from './console-play.js';
const N=C.mapSize,site=12*N+8;
// A crewed, oiled drill whose site is an existing shaft: the owner's bug report was a rig placed in a one-cell hole that paid almost nothing.
function setup(crew=4){const r=createRoom('BORE',11,false,0),players=[];for(let i=0;i<crew;i++){const p=join(r,'t'+i,'P'+i,0);p.publicId='p'+i;players.push(p);}
 r.site=site;r.drill={index:site};r.coolant=true;r.cells[0].pumpBuilt=true;for(const p of players){p.boarded=true;p.boarding=false;p.shaft=null;p.x=8.5;p.y=12.5;}return {r,players};}
const ring=()=>{const x=site%N,y=Math.floor(site/N),cells=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)cells.push((y+dy)*N+x+dx);return cells;};
// The crew aboard works their console seats; left alone the gauges drift out of the green and the drill slows.
function run(r,seconds){for(let t=0;t<Math.round(seconds*C.tickHz);t++){r.clock=(r.clock||0)+C.tickMs;step(r,operate(r),r.clock);}}
test('the bore cuts the ring down to the floor of the site shaft within two seconds, so the rig sits in a three by three bore',()=>{const {r}=setup();r.cells[site]={row:40,hp:hp(40),damage:{}};run(r,2);
 for(const i of ring())assert.ok(r.cells[i].row>=40,'ring cell '+i+' is only at row '+r.cells[i].row);assert.ok(r.cells[site].row>=40);});
test('with no crew aboard the rig still widens its bore but does not descend',()=>{const {r,players}=setup();for(const p of players){p.boarded=false;p.x=2.5;p.y=2.5;}/* unboarded, they stand clear of the bore: nobody stands over a shaft, and the ring never breaks under someone's feet */r.cells[site]={row:30,hp:hp(30),damage:{}};run(r,2);
 for(const i of ring())assert.equal(r.cells[i].row,30);assert.equal(r.cells[site].row,30);});
test('every bore cell pays the team at the drill yield, split between the fund and the crew aboard',()=>{const {r,players}=setup();for(const i of [site,...ring()])r.cells[i]={row:40,hp:hp(40),damage:{}};run(r,0.1);assert.equal(r.cells[site].row,40);assert.equal(r.drillTotal||0,0,'nothing credited before a row breaks');
 let seconds=0;while(r.cells[site].row===40&&seconds<60){run(r,0.1);seconds+=0.1;}assert.equal(r.cells[site].row,41);for(const i of ring())assert.equal(r.cells[i].row,41,'ring cells break with the centre');
 const expected=9*payout(40)*C.team.drillYield;assert.ok(Math.abs(r.drillTotal-expected)<expected*1e-6,`credited ${r.drillTotal}, expected ${expected}`);
 const wallets=players.reduce((s,p)=>s+p.wallet,0);assert.ok(wallets>=expected*C.team.machinePersonalFraction*0.999,'crew share '+wallets);assert.ok(r.oil.income>0,'income rate reported');
 assert.ok(seconds<C.team.drillSecondsPerBlock/C.team.crewSpeed[4]*1.5,'four crew bore a row in '+seconds.toFixed(1)+' s');});
