import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {layoutFlora,blockedCells,growth,rng} from '../public/flora.js';
import {gaussianTaps} from '../public/glow.js';

const N=C.mapSize;
function world(){const cells=Array.from({length:N*N},()=>({row:0}));const site=8*N+4;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)cells[(8+dy)*N+4+dx].row=156;cells[4*N+11].row=30;cells[4*N+11].pumpBuilt=true;cells[10*N+10].row=24;
 return {cells,site,belts:{[2*N+2]:{next:2*N+3},[2*N+3]:{next:null}},excavators:[{cx:12,cy:13,cells:[12*N+11,12*N+12,12*N+13,13*N+11,13*N+12,13*N+13,14*N+11,14*N+12,14*N+13]}],players:[{x:14.5,y:2.5},{x:1.5,y:14.5,departed:true}]};}
const inClaim=p=>p.x>=0&&p.z>=0&&p.x<N&&p.z<N,cellOf=p=>Math.floor(p.z)*N+Math.floor(p.x),outside=p=>Math.max(-p.x,p.x-N,-p.z,p.z-N);

test('blocked cells cover pits, pumps, the depot, conveyors, excavators, the drill footprint and standing crew',()=>{
 const w=world(),{hard,near}=blockedCells({N,...w,depot:C.hauling.depotCells});
 for(const i of [8*N+4,7*N+3,9*N+5,4*N+11,10*N+10,2*N+2,2*N+3,12*N+12,14*N+13,2*N+14])assert.ok(hard.has(i),'hard '+i);
 for(const [x,y] of C.hauling.depotCells)assert.ok(hard.has(y*N+x),'depot '+x+','+y);
 assert.ok(hard.has(6*N+2)&&hard.has(10*N+6),'the whole 5 by 5 around the drill stays clear');
 assert.ok(near.has(5*N+1)&&!hard.has(5*N+1),'big plants keep one more ring clear of the drill');
 assert.ok(near.has(3*N+13),'big plants keep clear of standing crew');
 assert.ok(!hard.has(14*N+1),'a departed player blocks nothing');
 assert.ok(!hard.has(0)&&!near.has(0));
});

test('layout keeps every plant on open ground, spaces the trees, and stays inside the dunes ring',()=>{
 const w=world(),{hard,near}=blockedCells({N,...w,depot:C.hauling.depotCells}),L=layoutFlora({N,...w,seed:42});
 const F=C.flora,K=F.counts;
 assert.ok(L.trees.length>K.trees*0.7&&L.trees.length<=K.trees,'trees '+L.trees.length);
 assert.ok(L.flowers.length>K.flowers*0.7&&L.flowers.length<=K.flowers);assert.ok(L.grass.length<=K.grass&&L.bushes.length<=K.bushes);
 for(const list of [L.trees,L.bushes,L.grass,L.flowers])for(const p of list){
  if(inClaim(p))assert.ok(!hard.has(cellOf(p)),'plant on a blocked cell at '+p.x.toFixed(2)+','+p.z.toFixed(2));
  else{const o=outside(p);assert.ok(o>=F.margin-1e-9&&o<=F.beyond+1e-9,'plant outside the ring at '+o);}
 }
 for(const t of L.trees)if(inClaim(t))assert.ok(!near.has(cellOf(t)),'tree too close to the drill or crew');
 for(let i=0;i<L.trees.length;i++)for(let j=i+1;j<L.trees.length;j++)assert.ok(Math.hypot(L.trees[i].x-L.trees[j].x,L.trees[i].z-L.trees[j].z)>=F.treeGap-1e-9);
 assert.ok(L.trees.some(inClaim)&&L.trees.some(t=>!inClaim(t)),'the forest spreads over the claim and the dunes');
 assert.ok(new Set(L.trees.map(t=>t.species)).size===3,'all three species appear');
 assert.ok(L.butterflies.length>0&&L.birds.length===K.birds);
});

test('layout is deterministic per seed, so every player sees the same forest',()=>{
 const w=world(),a=layoutFlora({N,...w,seed:7}),b=layoutFlora({N,...w,seed:7}),c=layoutFlora({N,...w,seed:8});
 assert.deepEqual(a.trees,b.trees);assert.deepEqual(a.flowers.slice(0,20),b.flowers.slice(0,20));
 assert.notDeepEqual(a.trees.slice(0,5),c.trees.slice(0,5));
 const r=rng(3),values=Array.from({length:1000},r);assert.ok(values.every(v=>v>=0&&v<1));assert.ok(Math.abs(values.reduce((s,v)=>s+v,0)/1000-0.5)<0.05);
});

test('growth starts at zero, overshoots a little, and settles at full size',()=>{
 assert.equal(growth(-1),0);assert.equal(growth(0),0);assert.equal(growth(1),1);assert.equal(growth(3),1);
 const peak=Math.max(...Array.from({length:99},(_,i)=>growth((i+1)/100)));assert.ok(peak>1.02&&peak<1.2,'overshoot '+peak);
 assert.ok(growth(0.1)<growth(0.3)&&growth(0.3)<growth(0.5));
});

test('bloom blur weights cover the whole kernel and sum to one',()=>{
 for(const [radius,sigma] of [[8,3.6],[4,2],[6,1.5]]){const taps=gaussianTaps(radius,sigma),sum=taps[0][1]+2*taps.slice(1).reduce((s,[,w])=>s+w,0);
  assert.ok(Math.abs(sum-1)<1e-9,'sum '+sum);assert.equal(taps.length,1+Math.ceil(radius/2));
  for(let i=1;i<taps.length;i++)assert.ok(taps[i][0]>=2*i-1&&taps[i][0]<=2*i,'bilinear offset sits between its two texels');}
});
