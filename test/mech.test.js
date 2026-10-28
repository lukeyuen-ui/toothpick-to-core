import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step,hp} from '../rules.js';
const N=C.mapSize,MECH=C.tools.findIndex(t=>t.area),BLAST=C.tools.findIndex(t=>t.splash);
// The owner's phone report: tapping the ground beside you with the mech left your own cell standing, so you never dropped in and the
// "3x3" was eight cells around a pillar; in a shaft the claws then worked around the cell first tapped instead of the one you were in.
function setup(x=12.5,y=12.5){const r=createRoom('MECH',42,false,0),p=join(r,'t','Ada',0);p.publicId='p';r.finds=[];p.tool=MECH;p.lighting=C.lighting.length;p.x=x;p.y=y;p.facing={dx:-1,dy:0};return {r,p};}
function run(r,seconds,commands=[]){for(let t=0;t<Math.round(seconds*C.tickHz);t++){r.clock=(r.clock||0)+C.tickMs;step(r,t?[]:commands,r.clock);}}
const ring=i=>{const x=i%N,y=Math.floor(i/N),out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)out.push((y+dy)*N+x+dx);return out;};
const level=(r,centre,rows=2)=>{for(const i of ring(centre))assert.ok(Math.abs(r.cells[i].row-r.cells[centre].row)<=rows,`neighbour ${i} at row ${r.cells[i].row}, centre ${centre} at row ${r.cells[centre].row}`);};
test('tapping the ground beside you with the mech cuts the full 3x3, your own cell included, and drops you into your own hole',()=>{const {r,p}=setup(),own=12*N+12;
 run(r,C.tickSeconds,[{player:p,message:{type:'tap',x:11,y:12}}]);
 const rows=[11,12,13].flatMap(y=>[10,11,12].map(x=>r.cells[y*N+x].row));assert.ok(rows[0]>0,'the 3x3 is cut');assert.ok(rows.every(v=>v===rows[0]),'one level 3x3: '+rows.join(','));
 assert.equal(p.shaft,own,'you drop into the cell you stood on');assert.deepEqual(p.target,{x:12,y:12},'and the claws keep working there');});
test('in its own shaft the mech keeps carving the 3x3 centred on you, level, as you go deeper',()=>{const {r,p}=setup(),own=12*N+12;
 run(r,C.tickSeconds,[{player:p,message:{type:'tap',x:11,y:12}}]);let last=r.cells[own].row;
 for(let k=0;k<6;k++){run(r,1);assert.equal(p.shaft,own);assert.ok(r.cells[own].row>last,'still digging down: row '+r.cells[own].row);last=r.cells[own].row;level(r,own);assert.ok(p.depth>=r.cells[own].row-C.damageEpsilon,'riding the floor down');}
 assert.equal(r.cells[12*N+9].row,0,'nothing two cells out from the hole');});
test('belaying into a narrow shaft with the mech widens it into a level 3x3 that follows you down',()=>{const {r,p}=setup(11.5,12.5),shaft=12*N+12;r.cells[shaft]={row:30,hp:hp(30),damage:{}};
 run(r,4,[{player:p,message:{type:'belayDown',x:12,y:12}}]);assert.equal(p.shaft,shaft);assert.equal(p.depth,30);
 run(r,0.5,[{player:p,message:{type:'tap',x:13,y:12}}]);assert.ok(r.cells[shaft].row>30,'a tap at the wall beside you still digs your own floor');level(r,shaft);
 run(r,3);assert.ok(r.cells[shaft].row>40);level(r,shaft);});
test('other explorers stay safe: the mech never cuts a cell someone else stands on, and splash tools still spare their own digger',()=>{const {r,p}=setup(),b=join(r,'b','Bo',0);b.publicId='b';b.x=10.5;b.y=13.5;
 run(r,C.tickSeconds,[{player:p,message:{type:'tap',x:11,y:12}}]);assert.equal(r.cells[13*N+10].row,0,'the teammate is not dropped');assert.equal(r.cells[13*N+10].hp,hp(0));assert.equal(p.shaft,12*N+12);
 const s=setup(),q=s.p;q.tool=BLAST;run(s.r,C.tickSeconds,[{player:q,message:{type:'tap',x:11,y:12}}]);assert.equal(s.r.cells[12*N+12].row,0,'a blast beside you leaves your cell');assert.equal(q.shaft,null);});
