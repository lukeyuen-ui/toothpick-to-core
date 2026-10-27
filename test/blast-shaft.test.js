import test from 'node:test';import assert from 'node:assert/strict';import {C} from '../config.js';import {createRoom,join,step,hp} from '../rules.js';import {enterShaft} from '../shaft-rules.js';
test('blasting kit keeps its 3x3 inside a shaft for lit neighbours level with your floor',()=>{
 const r=createRoom('TEST',42,false,0),a=join(r,'a','A',0),b=join(r,'b','B',0),N=C.mapSize,at=(x,y)=>r.cells[y*N+x];a.publicId='a';b.publicId='b';r.finds=[];
 for(let y=3;y<=5;y++)for(let x=3;x<=5;x++)r.cells[y*N+x]={row:5,hp:hp(5),damage:{}};
 r.cells[3*N+3]={row:0,hp:hp(0),damage:{}};r.cells[5*N+5]={row:8,hp:hp(8),damage:{}};r.cells[5*N+3]={row:2,hp:hp(2),damage:{}};
 b.x=5.5;b.y=4.5;a.x=a.y=4.5;enterShaft(r,a,4*N+4);a.depth=5;a.tool=C.tools.findIndex(t=>t.splash);
 step(r,[{player:a,message:{type:'tap',x:4,y:4}}],100);
 const hurt=(x,y,row)=>at(x,y).row>row||at(x,y).hp<hp(row);
 assert.ok(hurt(4,4,5),'own floor');
 for(const [x,y] of [[4,3],[5,3],[3,4],[4,5]])assert.ok(hurt(x,y,5),`neighbour ${x},${y}`);
 assert.ok(!hurt(5,4,5),'occupied neighbour is safe');
 assert.equal(at(3,3).row,0);assert.equal(at(3,3).hp,hp(0));
 assert.equal(at(5,5).row,8);assert.equal(at(5,5).hp,hp(8));
 assert.equal(at(3,5).row,2,'far-above neighbour is left alone');assert.equal(at(3,5).hp,hp(2));
});
test('tools without splash still dig only the shaft floor',()=>{
 const r=createRoom('TEST',42,false,0),a=join(r,'a','A',0),N=C.mapSize,at=(x,y)=>r.cells[y*N+x];a.publicId='a';r.finds=[];
 for(let y=3;y<=5;y++)for(let x=3;x<=5;x++)r.cells[y*N+x]={row:5,hp:hp(5),damage:{}};
 a.x=a.y=4.5;enterShaft(r,a,4*N+4);a.depth=5;a.tool=4;
 step(r,[{player:a,message:{type:'tap',x:4,y:4}}],100);
 for(const [x,y] of [[4,3],[3,4],[5,5]])assert.equal(at(x,y).hp,hp(5));
});
test('tunnel borer drives a line of three; mining mech hits all nine cells around the target',()=>{
 const N=C.mapSize;
 {const r=createRoom('TEST',42,false,0),a=join(r,'a','A',0);a.publicId='a';r.finds=[];a.x=4.5;a.y=4.5;a.tool=C.tools.findIndex(t=>t.line);step(r,[{player:a,message:{type:'tap',x:5,y:4}}],100);for(const x of [5,6,7])assert.ok(r.cells[4*N+x].hp<hp(0)||r.cells[4*N+x].row>0,'line cell '+x);assert.equal(r.cells[5*N+5].hp,hp(0));}
 {const r=createRoom('TEST',42,false,0),a=join(r,'a','A',0);a.publicId='a';r.finds=[];a.x=2.5;a.y=2.5;a.tool=C.tools.findIndex(t=>t.area);step(r,[{player:a,message:{type:'tap',x:4,y:4}}],100);for(let y=3;y<=5;y++)for(let x=3;x<=5;x++)assert.ok(r.cells[y*N+x].hp<hp(0)||r.cells[y*N+x].row>0,'area cell '+x+','+y);assert.equal(r.cells[6*N+4].hp,hp(0));}
});
