import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';import {C} from '../config.js';import {createPits,pitSdf,edgePieces,pieceRows,wallOffset,lipHeight,floorHeave,pitNoise} from '../public/pit-geometry.js';
const N=C.mapSize,M=C.pits.inset,E=0.5-M,RI=C.pits.innerCorner,grid=cells=>(x,z)=>x<0||z<0||x>=N||z>=N?0:cells.get(z*N+x)||0,near=(a,b,eps=1e-6)=>Math.abs(a-b)<eps;
test('pit state retains only rows; edge walls, lips and steps are fixed pieces fitted in the shader',()=>{const pits=createPits();for(const kind of ['wall','lip','step']){assert.equal(pits[kind].type,'BufferGeometry');assert.ok(pits[kind].attributes.pitPart,kind);assert.ok(pits[kind].index.count>0,kind);}assert.equal(pits.texture.image.width,N);assert.equal(pits.texture.image.height,N);pits.update(34,30);pits.update(35,400);assert.equal(pits.texture.image.data[34*4],30);assert.equal(pits.texture.image.data[35*4],255);pits.reset();assert.ok(pits.texture.image.data.every(x=>x===0));});
test('neighbouring dug cells open into one hole: inset only toward solid ground, rounded outer corners, an undug diagonal still pokes in',()=>{
 const block=new Map();for(let z=3;z<6;z++)for(let x=3;x<6;x++)block.set(z*N+x,4);const rows=grid(block);
 for(const [x,z] of [[4.5,4.5],[4,4.5],[5,4.5],[4.5,4],[4,4],[5,5],[3.5+0.45-E+0.05,4.5]])assert.ok(pitSdf(rows,x,z)<0,'open inside the 3x3 at '+x+','+z);
 for(const [x,z] of [[3.05,4.5],[5.95,4.5],[4.5,3.05],[3.05,3.05],[2.5,4.5]])assert.ok(pitSdf(rows,x,z)>0,'solid rim at '+x+','+z);
 const lone=grid(new Map([[8*N+8,30]]));assert.ok(pitSdf(lone,8.5,8.5)<0);assert.ok(pitSdf(lone,8.5+E-0.02,8.5)<0);assert.ok(pitSdf(lone,8.5+E+0.02,8.5)>0);assert.ok(pitSdf(lone,8.5+E*0.95,8.5+E*0.95)>0,'outer corner rounds off');
 const diagonal=grid(new Map([[8*N+8,5],[9*N+9,5]]));assert.ok(pitSdf(diagonal,9,9)>0,'holes that only touch at a corner stay apart');
 const ell=grid(new Map([[8*N+8,5],[8*N+9,5],[9*N+9,5]]));assert.ok(pitSdf(ell,9,8.5)<0);assert.ok(pitSdf(ell,9-0.02,9-0.02)>0,'the undug diagonal still pokes in at the grid point');
 // Edge pieces per quadrant: straight runs, the rounded outer corner, and the part of an inner fillet crossing this quadrant.
 assert.deepEqual(edgePieces(true,false,false),{alongB:[0,0.5],alongA:null,corner:false,inner:null});assert.deepEqual(edgePieces(true,true,true),{alongB:null,alongA:null,corner:false,inner:null});assert.equal(edgePieces(false,false,false).corner,true);assert.equal(edgePieces(false,false,false).inner,null);
 {const c=edgePieces(true,true,false);assert.deepEqual(c.alongB,RI<M?[E+RI,0.5]:null,'the diagonal cell keeps no straight run once the fillet is wider than the inset');assert.ok(near(c.inner.f[0],E+RI)&&near(c.inner.f[1],E+RI));assert.ok(c.inner.th[0]>=Math.PI-1e-9&&c.inner.th[1]<=1.5*Math.PI+1e-9&&c.inner.th[1]>c.inner.th[0]);}
 {const x=edgePieces(true,false,true);assert.ok(near(x.alongB[1],Math.min(0.5,0.5+M-RI)),'the arm edge stops where the fillet takes over');assert.ok(near(x.inner.th[0],-Math.PI/2),'and the fillet leaves it tangent');const z=edgePieces(false,true,true);assert.ok(near(z.alongA[1],x.alongB[1]));assert.ok(near(z.inner.th[1],Math.PI));}});
// The owner's L shaped dig at row 1: the outer corners were round but the inner corner, where the undug cell pokes in between the two arms,
// came to a hard point on the rim and the wall. Inner corners now take their own fillet (C.pits.innerCorner), running through the three
// dug cells around the corner and tangent to both arms' edges.
test('an L shaped hole turns its inner corner with a fillet of its own, tangent to both arms, and one floor runs between the arms',()=>{
 const rows=grid(new Map([[3,3],[4,3],[5,3],[3,4],[3,5]].map(([x,z])=>[z*N+x,1]))),G=[4,4],F=[G[0]+RI-M,G[1]+RI-M];
 assert.ok(RI>0&&RI<C.pits.corner,'the inner fillet is smaller than the outer corner');
 for(let deg=180;deg<=270;deg+=7.5){const t=deg*Math.PI/180,at=r=>[F[0]+r*Math.cos(t),F[1]+r*Math.sin(t)];assert.ok(Math.abs(pitSdf(rows,...at(RI)))<1e-6,'the rim follows the fillet at '+deg+' degrees');assert.ok(pitSdf(rows,...at(RI+0.02))<0,'open inside it');assert.ok(pitSdf(rows,...at(RI-0.02))>0,'solid ground behind it');}
 for(const d of [0.25,0.35])assert.ok(Math.abs(pitSdf(rows,G[0]+d,E+3.5))<1e-6&&Math.abs(pitSdf(rows,E+3.5,G[1]+d))<1e-6,'past the fillet both arm edges run straight on');
 const tip=RI-(RI-M)*Math.SQRT2,diag=d=>pitSdf(rows,G[0]-d/Math.SQRT2,G[1]-d/Math.SQRT2);assert.ok(Math.abs(diag(tip))<1e-6,'a rounded bulge reaching '+tip.toFixed(3)+' from the grid point');assert.ok(diag(M*Math.SQRT2)<-0.05,'where the old wedge came to its point is open now');
 for(const [x,z] of [[3.5,3.5],[3.8,3.6],[3.6,3.8],[4,3.5],[3.5,4],[4.5,3.5],[3.5,4.5]])assert.ok(pitSdf(rows,x,z)<0,'one open floor between the arms at '+x+','+z);
 const pits=createPits();for(const [x,z] of [[3,3],[4,3],[5,3],[3,4],[3,5]])pits.update(z*N+x,1);const rocks=pits.rocks();for(let k=0;k<rocks.length;k+=3)assert.ok(pitSdf(rows,rocks[k],rocks[k+1])>0,'rim rocks stay on solid ground');assert.ok(rocks.some((_,k)=>k%3===0&&Math.hypot(rocks[k]-F[0],rocks[k+1]-F[1])<0.35),'and some sit in the inner corner');});
test('an undug cell in the corner of a dug block bulges in as a gentle round, not a wedge',()=>{
 const cells=new Map();for(let z=3;z<6;z++)for(let x=3;x<6;x++)if(!(x===5&&z===5))cells.set(z*N+x,6);const rows=grid(cells),G=[5,5],F=[G[0]+RI-M,G[1]+RI-M];
 for(let deg=180;deg<=270;deg+=15){const t=deg*Math.PI/180;assert.ok(Math.abs(pitSdf(rows,F[0]+RI*Math.cos(t),F[1]+RI*Math.sin(t)))<1e-6,'round at '+deg+' degrees');}
 const tip=RI-(RI-M)*Math.SQRT2;assert.ok(pitSdf(rows,G[0]-(tip+0.02)/Math.SQRT2,G[1]-(tip+0.02)/Math.SQRT2)<0&&pitSdf(rows,G[0]-(tip-0.02)/Math.SQRT2,G[1]-(tip-0.02)/Math.SQRT2)>0,'the bulge reaches only '+tip.toFixed(3)+' into the hole');
 assert.ok(tip<M*Math.SQRT2*0.6,'well short of the old wedge point');assert.ok(Math.abs(pitSdf(rows,5.3,4.5+E))<1e-6&&Math.abs(pitSdf(rows,4.5+E,5.3))<1e-6,'the undug cell keeps straight sides past the fillet');assert.ok(pitSdf(rows,5.5,5.5)>0);});
test('the spoil band and rim rocks follow the joined edge and refresh only around newly broken cells',()=>{const pits=createPits(),S=N*C.pits.rimTexels;for(let z=3;z<6;z++)for(let x=3;x<6;x++)pits.update(z*N+x,4);const rocks=pits.rocks();assert.ok(rocks.length>=3*12,'rocks around a 3x3');const rows=grid(new Map(Array.from({length:9},(_,k)=>[(3+Math.floor(k/3))*N+3+k%3,4])));for(let k=0;k<rocks.length;k+=3){assert.ok(pitSdf(rows,rocks[k],rocks[k+1])>0,'rocks sit on solid ground');assert.ok(rocks[k+2]>0);}
 const shade=(x,z)=>pits.rim.image.data[(Math.floor(z*C.pits.rimTexels)*S+Math.floor(x*C.pits.rimTexels))*4];assert.ok(shade(3.01,4.5)>100,'spoil next to the edge');assert.ok(shade(2.9,4.5)>0,'fading out over the band');assert.equal(shade(1.5,4.5),0,'none far from it');
 pits.update(6*N+8,3);pits.refresh();const full=createPits();for(let z=3;z<6;z++)for(let x=3;x<6;x++)full.update(z*N+x,4);full.update(6*N+8,3);full.refresh();assert.deepEqual([...pits.rim.image.data],[...full.rim.image.data],'incremental refresh matches a rebuild');});
test('pit shaders share one opening mask and fit walls, steps and floors to the rows texture',()=>{const pits=createPits();for(const kind of ['cap','floor','wall','lip','step']){const material=new T.MeshStandardMaterial({map:new T.Texture()});pits.decorate(material,kind);const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);assert.equal(shader.uniforms.pitRows.value,pits.texture);assert.equal(shader.uniforms.pitRim.value,pits.rim);assert.match(shader.fragmentShader,/pitEdge/);assert.ok(!shader.vertexShader.includes('undefined'));assert.ok(!shader.fragmentShader.includes('undefined'));if(kind==='cap'||kind==='floor')assert.match(shader.fragmentShader,/discard/);if(kind==='floor')assert.match(shader.vertexShader,/pitFloor/);if(['wall','lip','step'].includes(kind))assert.match(shader.vertexShader,/pitBuild\(\);/);assert.match(shader.fragmentShader,/pitInner/);}});

// Dirt, not cuts: the presets' wall, lip and floor layouts, the rounded rim, the lean and ripple, the lip shoulder and the floor heave.
test('wall and lip pieces get more rows on the higher presets, and Low keeps the original pieces exactly',()=>{const pits=createPits(),P=C.pits;
 assert.deepEqual(pieceRows('wall',C.dirt.low),[0,99]);assert.deepEqual(pieceRows('lip',C.dirt.low),[0,1]);
 for(const kind of ['wall','lip'])assert.equal(pits.geometry(kind,'low'),pits[kind],'Low draws the original '+kind);
 const tris=(kind,level)=>pits.geometry(kind,level).index.count/3;assert.equal(tris('wall','low'),36);assert.equal(tris('lip','low'),36);
 for(const kind of ['wall','lip'])assert.ok(tris(kind,'high')>tris(kind,'balanced')&&tris(kind,'balanced')>tris(kind,'low'),kind);
 assert.ok(tris('wall','high')<=600,'a quadrant wall stays a few hundred triangles: '+tris('wall','high'));
 for(const level of ['high','balanced','low']){const rows=pieceRows('wall',C.dirt[level]);assert.equal(rows[0],0,'the top row is the rim');assert.equal(rows.at(-1),99,'the last is the bottom');assert.ok(rows.every((r,i)=>!i||r>rows[i-1]),'rows run down the wall');
  for(const kind of ['wall','lip']){const g=pits.geometry(kind,level),part=g.attributes.pitPart.array,count=g.attributes.position.count;assert.ok(part.every(Number.isFinite));for(let i=0;i<part.length;i+=3){assert.ok([0,1,2,3].includes(part[i]),'a known piece');assert.ok(part[i+1]>=0&&part[i+1]<=1,'t along the piece');}assert.ok(g.index.array.every(v=>v<count));}}
 assert.equal(pits.geometry('wall','high'),pits.geometry('wall','high'),'built once per layout');
 assert.equal(pits.setLook('high'),C.dirt.high);assert.equal(pits.look.pitShape.value,C.dirt.high.shape);pits.setLook('low');assert.equal(pits.look.pitShape.value,0);assert.equal(pits.look.pitDetail.value,0);
});
test('walls round over the rim into the lip, then lean in and ripple a little: bounded, continuous, and straight at shape 0',()=>{const P=C.pits;let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let n=0;n<120;n++){const x=rnd()*C.mapSize,z=rnd()*C.mapSize;assert.ok(wallOffset(x,z,P.lift,1)===0,'the wall top meets the lip on the opening edge');let last=0;
  for(let y=P.lift;y>-C.three.depthMax;y-=0.01){const o=wallOffset(x,z,y,1);assert.ok(Number.isFinite(o));assert.ok(o<=0,'never out past the edge, so step faces and floors stay tucked behind it');assert.ok(o>=-(P.rimRound+P.lean+P.ripple)-1e-9,'leans at most rim, lean and ripple: '+o);assert.ok(Math.abs(o-last)<0.035,'no jump down the wall');last=o;assert.ok(wallOffset(x,z,y,0)===0,'shape 0 is the straight cut');}
  assert.ok(Math.abs(wallOffset(x,z,P.lift-P.rimRound,1)+P.rimRound)<1e-9,'the rounded rim ends a rim radius in');}
 const pits=createPits();pits.setLook('high');const E=0.5-P.inset;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const reach=pits.wallReach(4.5,4.5,dx,dz,-1);assert.ok(reach<E+P.edgeNoise&&reach>E-P.edgeNoise-P.rimRound-P.lean-P.ripple,'lamps hang on the wall: '+reach);}
});
test('the lip rises from the ground to meet the rounded rim level, and dug floors heave only inside the tile',()=>{const P=C.pits;
 for(const shape of [0,0.5,1]){assert.ok(Math.abs(lipHeight(0,shape)-P.lift)<1e-12,'meets the wall top');assert.ok(Math.abs(lipHeight(1,shape)-0.004)<1e-12,'meets the ground');for(let u=0;u<1;u+=0.05)assert.ok(lipHeight(u+0.05,shape)<=lipHeight(u,shape)+1e-12,'falls away from the rim');}
 const d=1e-4;assert.ok(Math.abs(lipHeight(d,1)-lipHeight(0,1))<1e-6&&Math.abs(lipHeight(1,1)-lipHeight(1-d,1))<1e-6,'level where it meets the rim and the ground');
 for(let k=0;k<400;k++){const cx=k%16,cz=Math.floor(k/16)%16,lx=(k*0.37%1)-0.5,lz=(k*0.61%1)-0.5,h=floorHeave(cx,cz,lx,lz,1);assert.ok(Math.abs(h)<=P.floorRipple+1e-12);assert.ok(floorHeave(cx,cz,lx,lz,0)===0);}
 for(const l of [-0.5,0.5])for(let t=-0.5;t<=0.5;t+=0.1){assert.ok(floorHeave(3,4,l,t,1)===0,'flat along the tile edge');assert.ok(floorHeave(3,4,t,l,1)===0);}
});
test('pit shaders take the preset look as shared uniforms and read the dirt textures without unset numbers',()=>{const pits=createPits(),grit=new T.Texture(),pebbles=new T.Texture();pits.setDirt({grit,pebbles});
 for(const kind of ['cap','floor','wall','lip','step']){const material=new T.MeshStandardMaterial({map:new T.Texture(),normalMap:new T.Texture()});pits.decorate(material,kind);const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.pitShape,pits.look.pitShape,'shared, so a preset change never recompiles');assert.equal(shader.uniforms.pitGrit.value,grit);assert.equal(shader.uniforms.pitPebbles.value,pebbles);
  for(const text of [shader.vertexShader,shader.fragmentShader])assert.ok(!/NaN|undefined/.test(text),kind);}
 const wall={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader},m=new T.MeshStandardMaterial({map:new T.Texture(),normalMap:new T.Texture()});pits.decorate(m,'wall');m.onBeforeCompile(wall);
 assert.match(wall.vertexShader,/pitRipple/);assert.match(wall.fragmentShader,/pitPebbles/);const floor={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader},f=new T.MeshStandardMaterial({normalMap:new T.Texture()});pits.decorate(f,'floor');f.onBeforeCompile(floor);assert.match(floor.vertexShader,/pitFloorBuild\(\);/);assert.match(floor.vertexShader,/objectNormal=pitFloorNormal/);
});

// Spoil heaps: the dirt that left a cell raises its lip and piles into mounds on the side of the hole away from the hub.
test('spoil mounds pile on solid ground on the far side from the hub, grow with the rows dug, and one dig touches only its neighbours',()=>{const P=C.pits,[hx,hz]=C.ground.hub,pits=createPits();pits.setLook('high');
 const dug=new Map(),dig=(x,z,row)=>{pits.update(z*N+x,row);dug.set(z*N+x,row);},rows=(x,z)=>x<0||z<0||x>=N||z>=N?0:dug.get(z*N+x)||0;
 dig(3,12,24);for(let z=3;z<6;z++)for(let x=10;x<13;x++)dig(x,z,9);dig(5,10,2);
 const mounds=new Map();pits.heapChanges((key,x,z,r,h,turn,cell)=>{if(r>0)mounds.set(key,{x,z,r,h,cell});});
 assert.ok(mounds.size>=6,'mounds for the shaft, the 3x3 and the toothpick hole: '+mounds.size);assert.equal(pits.heapCount,new Set([...mounds.values()].map(m=>m.cell)).size);
 let away=0;for(const m of mounds.values()){assert.ok([m.x,m.z,m.r,m.h].every(Number.isFinite));assert.ok(m.r>0&&m.r<=P.heapRadius[1]+1e-6&&m.h>0&&m.h<=P.heapHeight+1e-6,'bounded (stored as 32 bit floats)');
  for(let j=0;j<8;j++){const a=j*Math.PI/4;assert.ok(pitSdf(rows,m.x+Math.cos(a)*m.r*0.9,m.z+Math.sin(a)*m.r*0.9)>0,'on solid ground, never over a hole');}
  assert.ok(m.x-m.r>0&&m.z-m.r>0&&m.x+m.r<N&&m.z+m.r<N,'inside the claim');const cx=m.cell%N+0.5,cz=Math.floor(m.cell/N)+0.5;if((m.x-cx)*(cx-hx)+(m.z-cz)*(cz-hz)>0)away++;}
 assert.ok(away>=mounds.size*0.6,'most pile up on the side away from the hub: '+away+' of '+mounds.size);
 const big=[...mounds.values()].find(m=>m.cell===12*N+3),small=[...mounds.values()].find(m=>m.cell===10*N+5);assert.ok(big&&small&&big.r>small.r&&big.h>small.h,'a deeper hole throws a bigger mound');
 assert.ok(Math.abs(pits.heapAt(big.x,big.z)-big.h)<1e-6,'the mound is as tall as its height at its middle');assert.equal(pits.heapAt(8.5,8.5),0,'nothing by the hub');
 assert.ok(pits.ringLift(12*N+3)>=0.02,'the target ring floats over a raised lip');
 dig(5,10,3);let touched=pits.heapChanges(()=>{});assert.equal(touched,1,'digging deeper re-places only its own mound');dig(3,12,25);assert.equal(pits.heapChanges(()=>{}),0,'past heapRows the mound stays as it is');
 dig(7,13,1);touched=pits.heapChanges(()=>{});assert.ok(touched>=1&&touched<=9+P.heapReach*4,'a new hole re-places its neighbourhood only: '+touched);
 const rocks=pits.rocks();for(let k=0;k*3<rocks.length;k++){const lift=pits.rockLift(k);assert.ok(lift>=0&&lift<=P.heapHeight+P.lift+P.heapLift+1e-6,'rocks rest on the lip or a mound');}
 assert.ok([...Array(rocks.length/3).keys()].some(k=>pits.rockLift(k)>0),'some rocks ride up on lips and mounds');
 const low=createPits();low.setLook('low');low.update(3*N+3,24);let lowMounds=0;low.heapChanges((key,x,z,r)=>{if(r>0)lowMounds++;});assert.equal(lowMounds,0);assert.equal(low.heapCount,0,'no mounds on Low');const lr=low.rocks();for(let k=0;k*3<lr.length;k++)assert.equal(low.rockLift(k),0,'Low rocks sit where they always did');
 pits.reset();let cleared=0;pits.heapChanges((key,x,z,r)=>{if(!(r>0))cleared++;});assert.ok(cleared>=mounds.size,'a reset takes every mound away');assert.equal(pits.heapCount,0);
});
test('lips and wall tops grow with the spoil of the rows dug, capped, and stay continuous where joined cells meet',()=>{const pits=createPits();for(const kind of ['wall','lip']){const m=new T.MeshStandardMaterial({map:new T.Texture(),normalMap:new T.Texture()});pits.decorate(m,kind);const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);assert.match(shader.vertexShader,/pitSpoil\(cell,ax,az,ab\)/,kind+' reads the spoil');assert.equal(shader.uniforms.pitHeap,pits.look.pitHeap);}
 pits.setLook('high');assert.equal(pits.look.pitHeap.value,C.dirt.high.heaps);pits.setLook('low');assert.equal(pits.look.pitHeap.value,0,'Low keeps the original lip');});
