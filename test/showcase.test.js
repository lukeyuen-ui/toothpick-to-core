import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step} from '../rules.js';
import {fillBots,botCommands,crewBots} from '../bot-rules.js';
import {setupShowcase,equipShowcase} from '../showcase-rules.js';

function play(level){const r=createRoom('SHOW',7,false,0,true);r.botLevel=level;setupShowcase(r);const p=join(r,'h','Ana',0);p.publicId='a';equipShowcase(r,p);fillBots(r,0);
 let now=0,nextTune=0,boarded=null;for(;now<C.showcase.limitSeconds*C.tapWindowMs&&!r.won;now+=C.tickMs){if(now%1000<C.tickMs)fillBots(r,now);const cmds=botCommands(r,now),add=(type,extra={})=>cmds.push({player:p,message:{type,...extra}});
  if(now>=3000&&!p.boarded&&!p.boarding&&!p.drive)add('board');if(p.boarded)boarded??=now;
  if(r.vote?.item==='worldBreaker'&&!r.vote.ballots[p.publicId])add('vote',{yes:true});
  const g=r.console?.[p.publicId];if(p.boarded&&g&&Math.abs(g.v-0.5)>C.console.green&&now>=nextTune){add('tune');nextTune=now+300;}
  step(r,cmds,now);}
 return {r,p,now,boarded};}

test('a showcase starts late-game: mech, deep bore, drill, coolant, pumps and a fund for the finale',()=>{const r=createRoom('SHOW',7,false,0,true);setupShowcase(r);const p=join(r,'h','Ana',0);equipShowcase(r,p);
 assert.equal(p.tool,C.tools.length-1);assert.ok(r.drill&&r.coolant);assert.equal(r.cells[r.site].row,C.showcase.boreRow);assert.ok(r.cells.filter(c=>c.pumpBuilt).length>=2);assert.ok(r.fund>=C.teamItems.worldBreaker.price*2);});

test('with bots, someone who boards, tunes and votes reaches the core within a few minutes',()=>{for(const level of ['normal','easy']){const {r,now,boarded}=play(level);assert.ok(r.won,level+' did not finish');assert.ok(boarded!=null);assert.ok(now<=C.showcase.limitSeconds*C.tapWindowMs);assert.ok(now/C.tapWindowMs<240,level+' took '+now/C.tapWindowMs+' s');assert.ok(crewBots(r).length===3);}});
