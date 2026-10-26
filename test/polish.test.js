import test from 'node:test';
import assert from 'node:assert/strict';
import {fundEta}from '../formatters.js';
import {C}from '../config.js';
import {createRoom,join,step,snapshot}from '../rules.js';
import {catalog,requirement}from '../team-rules.js';
test('ETA suppresses forecasts above two hours while preserving zero-income guidance',()=>{assert.equal(fundEta(10000,0,1),'no steady income yet');assert.equal(fundEta(120,0,1),'about 2 min');assert.equal(fundEta(7200,0,1),'about 120 min');assert.equal(fundEta(7201,0,1),'no steady income yet');assert.equal(fundEta(1,0,0),'add to the fund to start the clock');});
test('built pump catalog signals pumping; unsupported items say Coming soon',()=>{const r=createRoom('TEST',42,false,0);const p=join(r,'private','P',0);p.publicId='p';r.cells[0].oilSite=true;r.cells[0].pumpBuilt=true;const entry=catalog(r).find(e=>e.item==='pump');assert.equal(entry.built,true);assert.equal(C.team.pumpBarrelsPerSecond,1);assert.equal(requirement(r,'supports'),'Coming soon');assert.equal(requirement(r,'survey'),'Coming soon');});
test('a sole-active instant proposal sends the explanatory toast to its proposer',()=>{const r=createRoom('TEST',42,false,0),a=join(r,'a','A',0),b=join(r,'b','B',0),messages=[];a.publicId='a';b.publicId='b';a.x=a.y=10.5;step(r,[{player:a,message:{type:'propose',item:'coolant'},respond:m=>messages.push(m)}],100);assert.equal(messages[0].text,'Passed: you were the only active digger');assert.equal(r.vote,null);assert.equal(r.goal.item,'coolant');assert.equal(snapshot(r,true).players[0].target,null);});
