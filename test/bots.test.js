import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step,snapshot} from '../rules.js';
import {fillBots,makeRoomForPerson,botCommands,crewBots,people} from '../bot-rules.js';
import {disconnect} from '../presence-rules.js';

function room(level,quick=false){const r=createRoom('BOTS',5,false,0,quick);r.botLevel=level;const p=join(r,'human-a','Ana',0);p.publicId='a';return {r,p};}
function run(r,seconds,start=0){let now=start;for(;now<start+seconds*C.tapWindowMs;now+=C.tickMs){if(now%C.bots.fillEveryMs<C.tickMs)fillBots(r,now);step(r,botCommands(r,now),now);}return now;}

test('bots fill the crew to four, step aside for people, and leave when everyone has gone',()=>{
 const {r}=room('normal');fillBots(r,0);assert.equal(crewBots(r).length,3);assert.ok(crewBots(r).every(b=>b.bot&&b.nickname.endsWith(' (bot)')));assert.equal(new Set(crewBots(r).map(b=>b.nickname)).size,3);
 makeRoomForPerson(r,10);const b=join(r,'human-b','Bea',10);b.publicId='b';fillBots(r,10);assert.equal(crewBots(r).length,2);assert.equal(people(r).length,2);
 assert.equal(r.players.filter(p=>!p.departed).length,C.maxPlayers);
 for(const p of people(r)){disconnect(r,p,20);p.leaveAt=20;}step(r,[],30);fillBots(r,30);assert.equal(crewBots(r).length,0);
 const off=room('off').r;fillBots(off,0);assert.equal(crewBots(off).length,0);
 assert.ok(snapshot(r,true).players.some(p=>p.bot));});

test('bots dig, haul to the hub, upgrade and never stall the room',()=>{
 const {r}=room('normal');fillBots(r,0);run(r,240);
 const bots=crewBots(r);assert.ok(bots.some(b=>b.tool>0),'someone upgraded');assert.ok(bots.reduce((n,b)=>n+b.deliveredValue,0)>0,'ore reached the hub');assert.ok(r.deepest>3);});

test('skill matters: hard bots out-dig easy bots over the same five minutes',()=>{
 const total=level=>{const {r}=room(level);fillBots(r,0);run(r,300);return crewBots(r).reduce((n,b)=>n+b.deliveredValue+b.wallet,0);};
 const easy=total('easy'),hard=total('hard');assert.ok(hard>easy*1.5,`hard ${hard} vs easy ${easy}`);});

test('bots tune their drill gauges toward green during the overdrive',()=>{
 const {r,p}=room('hard');fillBots(r,0);r.site=8*C.mapSize+3;r.drill={index:r.site};r.coolant=true;for(const b of crewBots(r)){b.boarded=true;}p.boarded=true;
 r.worldBreaker={startedAt:0,startRow:r.cells[r.site].row,endsAt:C.team.worldBreakerMs};let now=0;for(;now<8000;now+=C.tickMs)step(r,botCommands(r,now),now);
 const gauges=crewBots(r).map(b=>r.console[b.publicId]).filter(Boolean);assert.equal(gauges.length,3);assert.ok(gauges.every(g=>Math.abs(g.v-0.5)<0.3),JSON.stringify(gauges));});
