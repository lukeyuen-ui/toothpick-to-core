import test from 'node:test';import assert from 'node:assert/strict';
import {C} from '../config.js';import {QUALITY} from '../public/quality.js';
import {bakeGround,wearStrips,wearGround,wearSignature,createGroundDetail,decodeGround,texelWorld,worldTexel,GROUND_SIZE,GROUND_SPAN} from '../public/ground-detail.js';
import {createPits,pitSdf} from '../public/pit-geometry.js';
const N=C.mapSize,G=C.ground,at=(baked,x,z)=>decodeGround(baked.data,(Math.round(worldTexel(z))*baked.size+Math.round(worldTexel(x)))*4);

test('the ground texture covers the claim and the dunes ring at a fixed, small size and is the same for every player',()=>{
 assert.equal(GROUND_SPAN,N+2*G.margin);assert.equal(GROUND_SIZE,256,'one 256 by 256 texture');
 assert.ok(Math.abs(texelWorld(0)+G.margin)<1/G.texels&&Math.abs(texelWorld(GROUND_SIZE-1)-(N+G.margin))<1/G.texels);
 assert.ok(Math.abs(worldTexel(texelWorld(37))-37)<1e-9);
 const a=bakeGround(),b=bakeGround(),c=bakeGround(G.seed+1);
 assert.deepEqual(a.data,b.data);assert.notDeepEqual(a.data,c.data);assert.equal(a.data.length,GROUND_SIZE*GROUND_SIZE*4);
});

test('the claim gets broad, gentle variation that keeps its overall brightness and stays a grey moon',()=>{
 const baked=bakeGround(),values=[];let warm=0,cool=0;
 for(let z=0.25;z<N;z+=0.5)for(let x=0.25;x<N;x+=0.5){const g=at(baked,x,z);values.push(g.albedo);assert.ok(g.bumps>=G.normalRange[0]-1e-9&&g.bumps<=G.normalRange[1]+1e-9);if(g.warmth>0.6)warm++;if(g.warmth<0.4)cool++;}
 const mean=values.reduce((s,v)=>s+v,0)/values.length,spread=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/values.length);
 assert.ok(Math.abs(mean-1)<0.04,'mean brightness '+mean);assert.ok(spread>0.03&&spread<0.12,'visible but gentle mottle '+spread);
 assert.ok(values.every(v=>v>0.62&&v<1.35),'no harsh blotches');let clamped=0;for(let k=0;k<baked.data.length;k+=4)if(baked.data[k]===0||baked.data[k]===255)clamped++;assert.ok(clamped<baked.data.length/4/1000,'the brightness never runs into the ends of its range: '+clamped);assert.ok(warm>0&&cool>0,'warmer and cooler greys both appear');
 for(const t of [G.cool,G.warm,G.wornTone])assert.ok(Math.max(...t)-Math.min(...t)<0.08,'tints only lean the grey: '+t);
 // Neighbouring texels differ a little: the variation is large scale, not noise.
 let jump=0;for(let i=0;i<baked.size-1;i++){const k=(128*baked.size+i)*4;jump=Math.max(jump,Math.abs(baked.data[k]-baked.data[k+4]));}assert.ok(jump<24,'smooth from texel to texel: '+jump);
});

test('ground is worn round the hub, along conveyor lines and on the paths to the drill and pumps',()=>{
 const baked=bakeGround(),[hx,hz]=G.hub;
 assert.ok(at(baked,hx+1.6,hz).worn>0.4&&at(baked,hx,hz-1.7).worn>0.4,'worn ring round the pad');assert.ok(at(baked,hx+4.5,hz+4.5).worn<0.02,'fresh ground away from it');
 const belts={[2*N+2]:{next:2*N+3},[2*N+3]:{next:null}},site=8*N+4,pumps=[4*N+11];
 const strips=wearStrips({belts,site,pumps});assert.equal(strips.length,4);
 wearGround(baked,strips);
 assert.ok(at(baked,3,2.5).worn>0.5,'under the belt');assert.ok(at(baked,3,3.6).worn<0.05,'not far beside it');
 assert.ok(at(baked,6.2,8.5).worn>0.25,'on the path to the drill');assert.ok(at(baked,(hx+11.5)/2,(hz+4.5)/2).worn>0.2,'on the path to the pump');
 wearGround(baked,[]);assert.ok(at(baked,3,2.5).worn<0.02,'rebuilt from the hub ring alone');assert.ok(at(baked,hx+1.6,hz).worn>0.4);
});

test('the worn channel rebuilds only when belts, pumps or the site change, and not more often than rebakeMs',()=>{
 const cells=Array.from({length:N*N},()=>({row:0})),state={cells,belts:{},team:{site:null}};
 const sig=wearSignature(state);assert.equal(wearSignature({...state}),sig);
 for(const change of [{belts:{5:{next:6}}},{team:{site:40}}])assert.notEqual(wearSignature({...state,...change}),sig);
 cells[70].pumpBuilt=true;assert.notEqual(wearSignature(state),sig);cells[70].pumpBuilt=false;
 const ground=createGroundDetail();assert.equal(ground.texture.image.width,GROUND_SIZE);
 assert.equal(ground.update(state,0),true);assert.equal(ground.update(state,10),false,'nothing changed');
 state.belts={5:{next:6}};assert.equal(ground.update(state,100),false,'throttled');assert.equal(ground.update(state,100+G.rebakeMs),true,'then rebuilt');
 assert.ok(at(ground.baked,5.75,0.5).worn>0.5);
});

test('gravel scatters round dug cells on solid ground, scaled by the preset and none on low',()=>{
 const pits=createPits(),dug=new Map();for(let z=3;z<6;z++)for(let x=3;x<6;x++){pits.update(z*N+x,4);dug.set(z*N+x,4);}pits.update(10*N+10,2);dug.set(10*N+10,2);
 const rowAt=(x,z)=>x<0||z<0||x>=N||z>=N?0:dug.get(z*N+x)||0,count=level=>{pits.setGravel(level);const list=pits.rocks();return (list.length-pits.gravelFrom())/3;};
 const high=count(QUALITY.high.gravel),balanced=count(QUALITY.balanced.gravel),low=count(QUALITY.low.gravel);
 assert.ok(high>balanced&&balanced>0&&low===0,`gravel ${high} > ${balanced} > ${low}`);
 pits.setGravel(1);const list=pits.rocks(),from=pits.gravelFrom();assert.ok(from>0&&from%3===0,'big rocks come first');
 for(let k=from;k<list.length;k+=3){assert.ok(pitSdf(rowAt,list[k],list[k+1])>0,'on solid ground');assert.ok(list[k+2]>0&&list[k+2]<C.pits.rubbleSize,'finer than the rim rocks');const near=Math.min(...[...dug.keys()].map(i=>Math.hypot(Math.max(i%N-list[k],0,list[k]-i%N-1),Math.max(Math.floor(i/N)-list[k+1],0,list[k+1]-Math.floor(i/N)-1))));assert.ok(near<=C.pits.gravelReach+0.12,'near a dug cell: '+near);}
 assert.deepEqual(pits.rocks(),list,'the same holes give the same gravel');
});
