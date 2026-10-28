import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';import {C} from '../config.js';import {QUALITY} from '../public/quality.js';
import {digBudget,stratumColor,shareChunks,createPool,takeSlot,stepChunks,chunkScale,puffShape,kickOffset,rumbleOffset,kickAngle,createDigFx,stepGrains,grainAlpha,rowAtDepth} from '../public/dig-fx.js';import {qualitySettings} from '../public/quality.js';
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

// Crumble: when a cell breaks its rim gives a little, a trickle of grains down each wall on solid ground and a sheet of clots off one rim.
test('the crumble pool follows the preset: full on High, half on Balanced, none on Low',()=>{
 const [high,balanced,low]=['high','balanced','low'].map(level=>digBudget(qualitySettings(level)));
 assert.equal(high.grains,D.grains);assert.ok(balanced.grains>0&&balanced.grains<high.grains);assert.equal(low.grains,0,'Low throws no crumble');
 assert.equal(digBudget(QUALITY.high).grains,0,'an unknown preset throws none');assert.equal(digBudget(QUALITY.high,C.dirt.high).grains,D.grains);
 const fx=createDigFx(new T.Scene());fx.setBudget(low);assert.equal(fx.crumble(4.5,4.5,{sides:15,floor:-0.3,key:1},1000),false);assert.equal(fx.grains.count,0);
});
test('a break trickles grains down only its solid walls, once per cooldown a cell, and a mech 3x3 never floods the pool',()=>{
 const scene=new T.Scene(),fx=createDigFx(scene),camera=view();fx.setBudget(digBudget(qualitySettings('high')));const reach=0.3;
 assert.ok(scene.getObjectByName('Dig crumble grains'),'one points cloud');
 assert.equal(fx.crumble(4.5,4.5,{sides:1,floor:-0.4,rim:0.03,row:3,key:7,reach},1000),true);const one=fx.grains.count;assert.equal(one,D.crumbleGrains+D.crumbleSheet,'a trickle and a sheet off the one solid wall');
 for(let i=0;i<one;i++){assert.ok(fx.grains.x[i]>=4.5+reach-1e-9,'on the +x wall: '+fx.grains.x[i]);assert.ok(fx.grains.y[i]<=0.03+1e-9&&fx.grains.y[i]>=-0.4);assert.ok(Math.abs(fx.grains.z[i]-4.5)<0.5);}
 assert.equal(fx.crumble(4.5,4.5,{sides:1,floor:-0.4,key:7,reach},1000+D.crumbleCooldownMs/2),false,'cooled down per cell');assert.equal(fx.crumble(4.5,4.5,{sides:0,floor:-0.4,key:8},1000),false,'no walls, no crumble');
 // A mech breaks nine cells at once: only the outer eight have walls on solid ground, and the pool caps the grains.
 let thrown=0;for(let z=0;z<3;z++)for(let x=0;x<3;x++){const sides=(x===2?1:0)|(x===0?2:0)|(z===2?4:0)|(z===0?8:0);if(fx.crumble(10.5+x,3.5+z,{sides,floor:-0.9,row:9,key:100+z*16+x,reach},2000))thrown++;}
 assert.equal(thrown,8,'the middle cell has no wall to crumble');assert.ok(fx.grains.count<=D.grains,'never past the pool');
 let lightest=0;for(let i=0;i<fx.grains.count;i++)lightest=Math.max(lightest,fx.grains.cr[i],fx.grains.cg[i],fx.grains.cb[i]);assert.ok(lightest<0.9,'dirt coloured, not a white blob: '+lightest);
 const points=fx.points;for(let t=0,now=2000;t<120;t++,now+=16){fx.update(0.016,camera,()=>0,now);assert.equal(points.geometry.drawRange.count,fx.grains.count);for(let i=0;i<fx.grains.count;i++)assert.ok(fx.grains.y[i]>=fx.grains.floor[i]-1e-9,'never below its floor');}
 assert.equal(fx.grains.count,0,'the crumble clears within a couple of seconds');assert.equal(points.visible,false);
 fx.crumble(4.5,4.5,{sides:15,floor:-0.4,key:9,reach},9000);assert.ok(fx.grains.count>0);fx.reset();assert.equal(fx.grains.count,0);
});
test('grains wait their turn, fall, stop at the floor and fade quickly',()=>{
 const pool=createPool(4,['x','y','z','vx','vy','vz','age','life','floor','size','alpha','cr','cg','cb']),k=takeSlot(pool);pool.y[k]=0.03;pool.floor[k]=-0.3;pool.age[k]=-0.1;pool.life[k]=2;pool.alpha[k]=0.9;
 stepGrains(pool,0.05);assert.ok(Math.abs(pool.y[k]-0.03)<1e-6,'still waiting');assert.equal(grainAlpha(pool.age[k],pool.life[k],0.9),0);
 let landed=false;for(let i=0;i<60&&pool.count;i++){stepGrains(pool,0.02);if(pool.count&&pool.vy[0]===0&&pool.age[0]>0){landed=true;break;}}assert.ok(landed&&Math.abs(pool.y[0]+0.3)<1e-6,'landed on its floor');assert.ok(pool.life[0]<=pool.age[0]+D.grainFade+1e-6,'and fades out');
 assert.ok(grainAlpha(0.5,2,0.9)>0.8);assert.equal(grainAlpha(2,2,0.9),0);
});

// Rock fall (physics pass): a break loosens rocks the size of the tool's bite from the walls above the new floor; they share the chunk
// pool (one draw), keep to their wall as they fall, rest on the floor and sink away. Low throws none.
test('rock fall shares by preset: High all of it, Balanced half, Low none',()=>{
 const [high,balanced,low]=['high','balanced','low'].map(level=>digBudget(qualitySettings(level)));
 assert.deepEqual([high.rocks,balanced.rocks,low.rocks],[C.dirt.high.rocks,C.dirt.balanced.rocks,0]);assert.ok(high.rocks>balanced.rocks&&balanced.rocks>0);
 assert.ok(high.fallRate>balanced.fallRate&&low.fallRate===0&&low.fallBurst===0);
 assert.equal(D.fallCount.length,C.tools.length);assert.equal(D.fallScale.length,C.tools.length);
 for(let t=1;t<C.tools.length;t++)assert.ok(D.fallScale[t]>=D.fallScale[t-1],'bigger tools break bigger rocks');
 assert.ok(D.fallSize[1]*D.fallScale[0]<0.02,'a toothpick sheds grit');assert.ok(D.fallSize[1]*D.fallScale.at(-1)>0.05,'the mech fist-sized lumps');
 assert.equal(rowAtDepth(0),0);for(const row of [1,10,40])assert.ok(Math.abs(rowAtDepth(C.three.depthMax*(1-Math.exp(-row/C.three.depthScale)))-row)<1e-6);
});
test('rocks come off the wall, never pass its face as it leans in, come to rest on the floor and sink away',()=>{
 const fx=createDigFx(new T.Scene()),camera=view(),floor=-0.6,face=8.89;fx.setBudget(digBudget(qualitySettings('high')));
 // Cell (8, 8) dug to floor: solid ground beyond its +x wall at x = 8.89, which leans in by up to 0.04 below the rim.
 const groundAt=(x,z)=>x>=face?0:floor,wall=(nx,nz,along,y,r,out)=>{out.wx=8.5+nx*0.39-nz*along;out.wz=8.5+nz*0.39+nx*along;out.x=out.wx-nx*r;out.z=out.wz-nz*r;out.top=0;out.lean=0.04;return true;};
 let now=1000;const made=fx.rockfall(8.5,8.5,{sides:1,floor,rim:0.022,row:6,key:3,count:5,scale:3,wall,eyeX:6,eyeZ:8.5},now);
 assert.equal(made,5,'five rocks off the one wall');assert.equal(fx.chunks.count,5);
 for(let i=0;i<fx.chunks.count;i++){assert.equal(fx.chunks.nx[i],1);assert.ok(fx.chunks.age[i]<0,'each waits its turn');assert.ok(fx.chunks.x[i]+fx.chunks.r[i]<=face+1e-5,'starts against the wall');assert.ok(fx.chunks.y[i]>floor&&fx.chunks.y[i]<=0.022);}
 assert.equal(fx.rockfall(8.5,8.5,{sides:1,floor,key:3,count:5,wall},now+100),0,'once per cooldown a cell');
 let rested=0,rose=false;const top=new Float32Array(16).fill(-9);
 for(let t=0;t<90;t++){now+=16;fx.update(0.016,camera,groundAt,now);for(let i=0;i<fx.chunks.count;i++){if(fx.chunks.age[i]<0)continue;const r=fx.chunks.r[i]*0.6;
  assert.ok(fx.chunks.x[i]+r<=face+1e-5,'never into the wall');assert.ok(fx.chunks.y[i]>=floor+r-1e-5,'never through the floor');}}
 for(let i=0;i<fx.chunks.count;i++)if(fx.chunks.rest[i])rested++;assert.ok(rested>=3,'most have come to rest on the floor: '+rested);
 for(let i=0;i<fx.chunks.count;i++)if(fx.chunks.rest[i])assert.ok(Math.abs(fx.chunks.y[i]-floor-fx.chunks.r[i]*0.6)<1e-5,'resting on the floor');
 const [mesh]=fx.meshes;assert.equal(mesh.count,fx.chunks.count,'drawn in the chunk mesh, one draw');assert.ok(mesh.instanceMatrix.array.every(Number.isFinite));
 for(let t=0;t<260;t++){now+=16;fx.update(0.016,camera,groundAt,now);}assert.equal(fx.chunks.count,0,'all sink away within a few seconds');assert.equal(mesh.visible,false);
 // Low throws none, Balanced a share; the bucket refills over time.
 fx.setBudget(digBudget(qualitySettings('low')));assert.equal(fx.rockfall(8.5,8.5,{sides:15,floor,key:4,count:5,wall},now),0,'none on Low');
 fx.setBudget(digBudget(qualitySettings('balanced')));const some=fx.rockfall(8.5,8.5,{sides:15,floor,key:5,count:6,wall},now+1);assert.ok(some>0&&some<=3,'Balanced half: '+some);
 fx.reset();assert.equal(fx.chunks.count,0);
});
test('a rock meeting its leaning wall is knocked off it, and the walls facing the camera shed most',()=>{
 // A rock falling straight down beside a wall that leans in below it is pushed off the wall and keeps going down.
 const pool=createPool(4),k=takeSlot(pool);pool.x[k]=8.86;pool.y[k]=-0.05;pool.z[k]=8.5;pool.r[k]=0.04;pool.life[k]=3;pool.nx[k]=1;pool.wx[k]=8.9;pool.wz[k]=8.5;pool.wy[k]=0;pool.wl[k]=0.06;pool.wo[k]=0;
 const ground=()=>-2;let pushed=false;for(let i=0;i<40;i++){stepChunks(pool,1/60,ground);if(pool.vx[k]<-1e-4)pushed=true;}
 assert.ok(pushed,'knocked off the leaning face');assert.ok(pool.x[k]<8.86,'away from the wall');assert.ok(pool.vy[k]<0,'still falling');
 // Thrown at the wall, a rock bounces back off it.
 const hit=createPool(2),h=takeSlot(hit);hit.x[h]=8.7;hit.y[h]=-0.3;hit.z[h]=8.5;hit.vx[h]=1.5;hit.r[h]=0.03;hit.life[h]=3;hit.nx[h]=1;hit.wx[h]=8.9;hit.wz[h]=8.5;hit.wy[h]=0;hit.wl[h]=0;hit.wo[h]=0;
 for(let i=0;i<30;i++)stepChunks(hit,1/60,ground);assert.ok(hit.vx[h]<0&&hit.x[h]+hit.r[h]*0.6<=8.9+1e-5,'bounced back');
 // With the camera to the -x side, the +x wall (which faces it) gets most of the rocks.
 const fx=createDigFx(new T.Scene());fx.setBudget(digBudget(qualitySettings('high')));let far=0,near=0;
 for(let n=0;n<40;n++){fx.reset();fx.rockfall(8.5,8.5,{sides:3,floor:-0.6,key:n,count:6,eyeX:5,eyeZ:8.5},1000);for(let i=0;i<fx.chunks.count;i++)fx.chunks.nx[i]>0?far++:near++;}
 assert.ok(far>near*3,'far wall '+far+', near wall '+near);
});

// Rolling pebbles: a stone set rolling off the lip climbs to the crest, rolls over the rounded rim, drops down the wall and rests on the floor.
test('a pebble rolls up to the crest, over the rounded rim and down into the hole, keeping off the wall; none on Low',()=>{
 assert.deepEqual(['high','balanced','low'].map(level=>digBudget(qualitySettings(level)).rolls),[C.dirt.high.rolls,C.dirt.balanced.rolls,0]);assert.ok(C.dirt.high.rolls>=C.dirt.balanced.rolls&&C.dirt.balanced.rolls>0);
 const fx=createDigFx(new T.Scene()),camera=view(),floor=-0.7,edge=8.11,rb=C.pits.rimRound;fx.setBudget(digBudget(qualitySettings('high')));
 // Cell (8, 8) is dug; the stone lies on the lip 0.06 outside its -z edge at z = 8.11 and rolls in along +z.
 const groundAt=(x,z)=>z>edge?floor:0,spot={wx:8.5,wz:edge+rb,top:0.022+0.02-rb,lean:0.04,round:rb,cr:0.4,cg:0.4,cb:0.38};
 assert.equal(fx.pebble(8.5,0.03,edge-0.06,0.015,0,1,0.06,0.042+0.009,spot),true);const i=0;assert.ok(fx.chunks.rollAll[i]>0.06+rb);
 let topY=0,fell=false,now=1000;for(let t=0;t<200;t++){now+=16;fx.update(0.016,camera,groundAt,now);if(!fx.chunks.count)break;const y=fx.chunks.y[i],z=fx.chunks.z[i];topY=Math.max(topY,y);
  assert.ok(Math.abs(fx.chunks.x[i]-8.5)<1e-6,'rolls straight in');if(fx.chunks.roll[i]>0)assert.ok(y>=spot.top+0.015*0.6-1e-5,'on the lip and over the rim while it rolls');
  if(y<spot.top-0.01)assert.ok(z>=spot.wz+0.009*0.6-0.02,'clear of the wall below the rim');if(y<floor+0.05)fell=true;}
 assert.ok(topY>=0.042,'it climbs to the crest first');assert.ok(fell,'and ends on the floor');
 fx.setBudget(digBudget(qualitySettings('low')));assert.equal(fx.pebble(8.5,0.03,8,0.015,0,1,0.06,0.05,spot),false,'none on Low');
});

// Footstep dust: a planted boot throws one low puff, a mech's tread two bigger ones; steps never take the last stepReserve puffs.
test('a step throws a low puff of dust, a mech tread two, and steps leave the dig its share of the puff pool',()=>{
 const fx=createDigFx(new T.Scene()),camera=view();fx.setBudget(digBudget(qualitySettings('high')));
 assert.equal(fx.step(4.5,6.5,1,0,0),1);assert.equal(fx.puffs.count,1);assert.ok(fx.puffs.y[0]<0.1,'low to the ground');assert.ok(fx.puffs.vx[0]>0,'kicked along the stride');
 assert.equal(fx.step(5.5,6.5,1,0,1),2,'a mech tread throws two');assert.ok(fx.puffs.s1[1]>fx.puffs.s1[0]*1.2,'and bigger');
 let thrown=3;for(let k=0;k<100;k++)thrown+=fx.step(3+k*0.05,4,0,1,k%2);assert.ok(fx.puffs.count<=fx.puffs.limit-D.stepReserve,'steps leave '+D.stepReserve+' puffs for digging');
 fx.burst(8.5,0,8.5,{heavy:true,key:5},1000);assert.equal(fx.puffs.count,fx.puffs.limit-D.stepReserve+1,'a break still gets its puff');
 for(let t=0;t<160;t++)fx.update(0.016,camera,()=>0,1000+t*16);assert.equal(fx.puffs.count,0,'step dust (and the break) settles within a couple of seconds');
 fx.setBudget(digBudget(qualitySettings('low')));assert.equal(fx.step(4.5,6.5,1,0,0),0,'none on Low');
 fx.setBudget(digBudget(qualitySettings('balanced')));let some=0;for(let k=0;k<40;k++)some+=fx.step(3+k*0.05,4,0,1,0);assert.ok(some>0&&fx.puffs.count<=Math.max(0,digBudget(qualitySettings('balanced')).puffs-D.stepReserve),'Balanced a smaller share');
});
