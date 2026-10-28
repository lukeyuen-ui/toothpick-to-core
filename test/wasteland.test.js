import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import * as T from '../public/vendor/three.module.js';
import {wastelandLayout,wastelandCounts,createWasteland,outsideClaim,fadeStart,beaconSpots} from '../public/wasteland.js';
const N=C.mapSize,W=C.wasteland,all=layout=>Object.values(layout).flat();

test('wasteland props are seeded: the same ruins for every player, a different seed moves them',()=>{
 assert.deepEqual(wastelandLayout(),wastelandLayout());assert.notDeepEqual(wastelandLayout(W.seed+1),wastelandLayout());
 const layout=wastelandLayout();for(const [kind,n] of Object.entries(W.counts))assert.equal(layout[kind].length,n,kind+' all placed');
});

test('every prop stands in the terrain ring: off the claim and its beacons, inside the ring before its fading edge, out of the crater bowls',()=>{
 const craters=C.visual.largeCraters.filter(([x,z])=>outsideClaim(x,z)>0);
 for(const seed of [W.seed,W.seed+1,7,99])for(const [kind,list] of Object.entries(wastelandLayout(seed)))for(const p of list){assert.ok(p.foot.length>=1,kind);
  for(const [x,z,r] of p.foot){const d=outsideClaim(x,z);assert.ok(d-r>=W.gap-1e-9,`${kind} reaches the claim (${d.toFixed(2)} - ${r})`);assert.ok(d+r<=fadeStart()+1e-9,`${kind} reaches the ring's fade (${d.toFixed(2)} + ${r})`);
   for(const [cx,cz,cr] of craters)assert.ok(Math.hypot(x-cx,z-cz)>=cr+r,`${kind} sits in a crater bowl`);}}
 // No two props overlap.
 const feet=all(wastelandLayout()).flatMap(p=>p.foot.map(f=>[...f,p]));for(let i=0;i<feet.length;i++)for(let j=i+1;j<feet.length;j++){const [x1,z1,r1,p1]=feet[i],[x2,z2,r2,p2]=feet[j];if(p1!==p2)assert.ok(Math.hypot(x1-x2,z1-z2)>=r1+r2,'props overlap');}
});

test('radiation signs stand just outside the boundary beside a beacon, one side after another',()=>{
 const {signs}=wastelandLayout(),beacons=beaconSpots();assert.equal(new Set(signs.map(s=>s.side)).size,Math.min(4,signs.length));
 for(const s of signs){const d=outsideClaim(s.x,s.z);assert.ok(d>0&&d<1,'just outside: '+d);assert.ok(beacons.some(([bx,bz])=>Math.hypot(s.x-bx,s.z-bz)<1.2),'beside a beacon');}
});

test('the ruins build as one or two merged meshes whose every vertex is outside the claim; low builds half, lighter and without shadows',()=>{
 const finishes=new Map(),factory={finish:(kind,color)=>{if(!finishes.has(kind)){const m=new T.MeshStandardMaterial({vertexColors:true});m.name='Finish '+kind;finishes.set(kind,m);}return {material:finishes.get(kind),color:new T.Color(color)};}};
 const build=level=>{const scene=new T.Scene();const out=createWasteland(scene,factory,{level,groundY:(x,z)=>0.1*Math.sin(x)*Math.cos(z),shadows:level!=='low'});return {scene,...out};};
 const tris=meshes=>meshes.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0);
 const high=build('high'),low=build('low');
 assert.ok(high.meshes.length>=1&&high.meshes.length<=2,'two draws at most on high');assert.equal(low.meshes.length,1,'one draw on low');
 let instanced=0;high.scene.traverse(o=>{if(o.isInstancedMesh)instanced++;});assert.ok(instanced<=8);
 assert.ok(high.meshes.every(m=>m.castShadow)&&low.meshes.every(m=>!m.castShadow),'shadows on high only');
 assert.ok(tris(high.meshes)<20000,'high stays well inside the triangle budget: '+tris(high.meshes));assert.ok(tris(low.meshes)<1300,'low is a light set: '+tris(low.meshes));
 const counts=wastelandCounts('low');for(const [kind,n] of Object.entries(W.counts)){assert.equal(low.layout[kind].length,counts[kind]);assert.ok(counts[kind]<=Math.ceil(n/2));assert.deepEqual(low.layout[kind],high.layout[kind].slice(0,counts[kind]),'low is a subset of high');}
 for(const {meshes} of [high,low])for(const m of meshes){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){const d=outsideClaim(a.getX(i),a.getZ(i));assert.ok(d>0.1,'a vertex on the claim at '+a.getX(i).toFixed(2)+', '+a.getZ(i).toFixed(2));assert.ok(d<C.three.terrainWidth,'a vertex past the ring');}}
});

test('on undulating ground every prop is seated: some of it at or under the ground across its footprint, none of it hanging clear',()=>{
 const finishes=new Map(),factory={finish:(kind,color)=>{if(!finishes.has(kind))finishes.set(kind,new T.MeshStandardMaterial({vertexColors:true}));return {material:finishes.get(kind),color:new T.Color(color)};}};
 const groundY=(x,z)=>0.45*Math.sin(x*1.3)*Math.cos(z*1.1)+0.03*x;
 for(const level of ['high','low']){const {meshes,layout}=createWasteland(new T.Scene(),factory,{level,groundY,shadows:false}),points=[];for(const m of meshes){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)points.push([a.getX(i),a.getY(i),a.getZ(i)]);}
  for(const [kind,list] of Object.entries(layout))for(const p of list){const [x,z,r]=p.foot[0];let gap=Infinity;for(const [px,py,pz] of points)if(Math.hypot(px-x,pz-z)<=r+0.02)gap=Math.min(gap,py-groundY(px,pz));assert.ok(gap<=0.01,`${level} ${kind} at ${x.toFixed(2)}, ${z.toFixed(2)} hangs ${gap.toFixed(3)} above the ground`);}}
});
