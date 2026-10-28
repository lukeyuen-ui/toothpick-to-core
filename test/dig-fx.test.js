import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';import {C} from '../config.js';import {QUALITY} from '../public/quality.js';
import {digBudget,stratumColor,shareChunks,createPool,takeSlot,stepChunks,chunkScale,puffShape,kickOffset,rumbleOffset,kickAngle,createDigFx} from '../public/dig-fx.js';
const D=C.digFx,flat=()=>0;
const view=()=>{const camera=new T.PerspectiveCamera(50,1.4,0.1,90);camera.position.set(8,3,12);camera.lookAt(8,0,8);camera.updateMatrixWorld();return camera;};

test('dig feedback budgets shrink with the preset: low keeps a small chunk pool, no puffs and no kick',()=>{
 const [high,balanced,low]=['high','balanced','low'].map(level=>digBudget(QUALITY[level]));
 assert.deepEqual([high.chunks,high.puffs,high.kick,high.perBurst],[D.chunks,D.puffs,true,1]);
 assert.ok(high.chunks>balanced.chunks&&balanced.chunks>low.chunks&&low.chunks>0);
 assert.ok(high.puffs>balanced.puffs&&balanced.puffs>0&&low.puffs===0);
 assert.ok(high.rate>balanced.rate&&balanced.rate>low.rate);
 assert.ok(high.perBurst>=balanced.perBurst&&balanced.perBurst>low.perBurst);
 assert.equal(balanced.kick,true);assert.equal(low.kick,false);
 assert.ok(low.chunks<=D.chunks/4,'low adds almost nothing: '+low.chunks+' chunks');
});

test('chunks and puffs take the colour of the stratum the row belongs to',()=>{
 let end=0;for(const layer of C.layers){assert.equal(stratumColor(end),layer.color);end+=layer.rows;assert.equal(stratumColor(end-1),layer.color);}
 assert.equal(stratumColor(10000),C.layers.at(-1).color);
});

test('bursts released together share the chunk bucket evenly',()=>{
 const got=shareChunks([18,18,18,18,18,18,18,18,18],53);
 assert.equal(got.reduce((a,b)=>a+b,0),53);for(const g of got)assert.ok(g>=5&&g<=6,'fair share '+g);
 assert.deepEqual([...shareChunks([2,30],20)],[2,18],'a small burst leaves the rest to a big one');
 assert.deepEqual([...shareChunks([4,4],0)],[0,0]);assert.deepEqual([...shareChunks([3,0,5],100)],[3,0,5]);
 const into=new Int32Array(8);assert.equal(shareChunks([5,5,5],7,2,into),into,'fills the array it is given');assert.equal(into[0]+into[1],7);
});

test('chunks fly, bounce, rest and sink away; they never pass through the ground and a wall turns them back',()=>{
 const pool=createPool(64);
 for(let i=0;i<40;i++){const k=takeSlot(pool);pool.x[k]=8.5;pool.y[k]=0.02;pool.z[k]=8.5;pool.vx[k]=Math.cos(i*0.7)*0.8;pool.vz[k]=Math.sin(i*0.7)*0.8;pool.vy[k]=1.5+i%3*0.4;pool.r[k]=0.03;pool.life[k]=1.4;pool.spin[k]=5;pool.ax[k]=1;}
 let bounced=false,rested=false;
 for(let step=0;step<240&&pool.count;step++){stepChunks(pool,1/60,flat);for(let i=0;i<pool.count;i++){assert.ok([pool.x[i],pool.y[i],pool.z[i]].every(Number.isFinite));assert.ok(pool.y[i]>=pool.r[i]*0.6-1e-9,'above the ground');bounced||=pool.bounces[i]>0;rested||=pool.rest[i]>0;}}
 assert.ok(bounced&&rested,'they bounce and come to rest');assert.equal(pool.count,0,'every chunk expires');
 // A hole floor at 0 with solid ground half a unit higher beyond x=9: a chunk thrown low at the wall stays in the hole.
 const hole=createPool(4),k=takeSlot(hole);hole.x[k]=8.6;hole.y[k]=0.05;hole.z[k]=8.5;hole.vx[k]=2;hole.vy[k]=0.5;hole.r[k]=0.02;hole.life[k]=2;
 for(let i=0;i<60;i++)stepChunks(hole,1/60,x=>x>=9?0.5:0);
 assert.ok(hole.x[0]<9,'stays in the hole');assert.ok(hole.vx[0]<=0,'turned back by the wall');
 // A resting chunk falls again when the ground under it is dug away.
 const rest=createPool(2),r=takeSlot(rest);rest.x[r]=2.5;rest.z[r]=2.5;rest.y[r]=0.012;rest.r[r]=0.02;rest.rest[r]=1;rest.life[r]=5;let floor=0;
 stepChunks(rest,1/60,()=>floor);assert.equal(rest.rest[0],1);floor=-0.3;stepChunks(rest,1/60,()=>floor);assert.equal(rest.rest[0],0,'falls into the new hole');
 assert.equal(chunkScale(0,1),1);assert.equal(chunkScale(1,1),0);const half=chunkScale(1-D.settle/2,1);assert.ok(half>0&&half<1,'sinks away at the end');
});

test('pools never pass their budget, puffs decline rather than recycle, and everything clears',()=>{
 const scene=new T.Scene(),fx=createDigFx(scene),camera=view();fx.setBudget(digBudget(QUALITY.balanced));const b=fx.budget;
 assert.ok(scene.getObjectByName('Dig debris chunks')&&scene.getObjectByName('Dig dust puffs'));
 let now=1000;for(let i=0;i<200;i++){fx.burst(4.5+i%9,0.01,4.5+Math.floor(i/9)%9,{row:i%40,heavy:i%2===0,key:i%81,away:camera.position},now);now+=5;fx.update(0.005,camera,flat,now);
  assert.ok(fx.chunks.count<=b.chunks&&fx.puffs.count<=b.puffs);}
 assert.ok(fx.chunks.count>0&&fx.puffs.count>0);
 const [chunkMesh,puffMesh]=fx.meshes;assert.equal(chunkMesh.count,fx.chunks.count);assert.equal(puffMesh.count,fx.puffs.count);
 assert.ok(chunkMesh.instanceMatrix.array.every(Number.isFinite)&&puffMesh.instanceMatrix.array.every(Number.isFinite));
 assert.ok(puffMesh.geometry.attributes.puffAlpha.array.every(a=>a>=0&&a<=1));
 for(let i=0;i<200;i++){now+=16;fx.update(0.016,camera,flat,now);}
 assert.equal(fx.chunks.count,0);assert.equal(fx.puffs.count,0);assert.equal(chunkMesh.visible,false);assert.equal(puffMesh.visible,false);
 fx.setBudget(digBudget(QUALITY.low));fx.burst(8.5,0,8.5,{heavy:true},now+1000);assert.equal(fx.puffs.count,0,'no puffs on low');
 assert.ok(fx.chunks.count>0&&fx.chunks.count<=digBudget(QUALITY.low).chunks);fx.reset();assert.equal(fx.chunks.count,0);
});

test('a break can wait for the strike to land, and repeat bursts on one cell are spaced out',()=>{
 const fx=createDigFx(new T.Scene()),camera=view(),now=5000;
 assert.equal(fx.burst(3.5,0,3.5,{key:7,heavy:true,at:now+150},now),true);assert.equal(fx.chunks.count,0,'held until its time');assert.ok(fx.pendingFor(7));
 fx.update(0.016,camera,flat,now+100);assert.equal(fx.chunks.count,0);
 fx.update(0.016,camera,flat,now+160);assert.ok(fx.chunks.count>0,'released when due');assert.equal(fx.pendingFor(7),false);
 assert.equal(fx.burst(3.5,0,3.5,{key:7},now+100),false,'the same cell inside its cooldown');
 assert.equal(fx.burst(3.5,0,3.5,{key:7},now+D.cellCooldownMs),true);assert.equal(fx.burst(4.5,0,3.5,{key:8},now+100),true,'another cell is free');
});

test('the camera kick stays within a couple of pixels, dies away, and never runs on low',()=>{
 for(let t=-5;t<=D.kickMs+20;t+=5){const k=kickOffset(2,t);assert.ok(k>=0&&k<=2+1e-9,'kick '+k);}
 assert.equal(kickOffset(2,D.kickMs),0);assert.equal(kickOffset(0,10),0);assert.ok(kickOffset(2,D.kickMs*0.2)>1.9,'peaks at the full push');
 const out={x:0,y:0};for(let t=0;t<5000;t+=7){rumbleOffset(D.rumblePx,t,out);assert.ok(Math.abs(out.x)<=D.rumblePx+1e-9&&Math.abs(out.y)<=D.rumblePx+1e-9);}
 const a=kickAngle(D.breakKickPx,C.cab.fov,350);assert.ok(a>0&&a<0.01,'two pixels is a tiny turn even on a phone: '+a);
 assert.ok(Math.abs(kickAngle(2,50,400)-2*kickAngle(1,50,400))<1e-6);
 assert.ok(D.kickPx>=1&&D.breakKickPx<=2&&D.rumblePx<=2,'kicks are one to two pixels');
 const fx=createDigFx(new T.Scene());fx.setBudget(digBudget(QUALITY.high));fx.kick(1.5,100);assert.ok(fx.kickNow(110)>0);
 fx.kick(0.5,112);assert.ok(fx.kickNow(124)>0.5,'a small kick never cuts a big one short');
 fx.setBudget(digBudget(QUALITY.low));fx.kick(2,200);assert.equal(fx.kickNow(205),0,'never on low');
 const p=puffShape(0.3,1,0.2,1,0.5);assert.ok(p.alpha>0.2&&p.size>0.2&&p.size<1);assert.equal(puffShape(0,1,0.2,1,0.5).alpha,0);assert.equal(puffShape(1,1,0.2,1,0.5).alpha,0);
});

test('chunks shrink away as they pass the lens instead of filling the view',()=>{
 const fx=createDigFx(new T.Scene()),camera=view(),[mesh]=fx.meshes,m=new T.Matrix4(),p=new T.Vector3();
 fx.burst(camera.position.x,camera.position.y-0.01,camera.position.z,{heavy:true},1000);fx.burst(8.5,0.01,8.5,{heavy:true,key:3},1000);
 fx.update(0.001,camera,()=>-10,1001);let near=0,far=0;
 // Read the scale from the matrix columns: decompose reports a scale of 1 for a matrix shrunk to nothing.
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);p.setFromMatrixPosition(m);const e=m.elements,size=Math.hypot(e[0],e[1],e[2]);if(p.distanceTo(camera.position)<D.chunkClear[0])near=Math.max(near,size);else if(p.distanceTo(camera.position)>D.chunkClear[1])far=Math.max(far,size);}
 assert.equal(near,0,'nothing at the lens');assert.ok(far>0,'chunks away from it keep their size');
});

test('a chunk that comes to rest on a spoil heap settles into it within heapSettle, and elsewhere lives out its life',()=>{
 const pool=createPool(4),onHeap=takeSlot(pool),off=takeSlot(pool);for(const [k,x] of [[onHeap,2.5],[off,6.5]]){pool.x[k]=x;pool.y[k]=0.2;pool.z[k]=2.5;pool.vy[k]=-0.1;pool.r[k]=0.02;pool.life[k]=3;}
 const heapAt=(x,z)=>x<4?0.05:0,ground=(x,z)=>heapAt(x,z);let rested=false;for(let i=0;i<120&&!rested;i++){stepChunks(pool,1/60,ground,heapAt);rested=pool.rest[0]&&pool.rest[1];}
 assert.ok(rested,'both come to rest');const heapIndex=pool.x[0]<4?0:1;assert.ok(pool.y[heapIndex]>=0.05,'resting on the heap, not in it');
 assert.ok(pool.life[heapIndex]<=pool.age[heapIndex]+D.heapSettle+1e-9,'settles into the heap soon');assert.equal(pool.life[1-heapIndex],3,'on bare ground it keeps its life');
 const fx=createDigFx(new T.Scene()),camera=view();fx.burst(2.5,0.06,2.5,{heavy:true},1000);for(let t=0;t<200;t++)fx.update(1/60,camera,ground,1000+t*16,heapAt);assert.equal(fx.chunks.count,0,'and they all clear');
});
