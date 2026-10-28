import test from 'node:test';import assert from 'node:assert/strict';
import {C} from '../config.js';import {QUALITY} from '../public/quality.js';
import {bakeGround,wearStrips,wearGround,wearSignature,createGroundDetail,decodeGround,texelWorld,worldTexel,GROUND_SIZE,GROUND_SPAN,dirtFields,createDirtTextures,printField,createFootprints} from '../public/ground-detail.js';import * as T from '../public/vendor/three.module.js';
import {createPits,pitSdf} from '../public/pit-geometry.js';
const N=C.mapSize,G=C.ground,at=(baked,x,z)=>decodeGround(baked.data,(Math.round(worldTexel(z))*baked.size+Math.round(worldTexel(x)))*4);

test('the ground texture covers the claim and the dunes ring at a fixed, small size and is the same for every player',()=>{
 assert.equal(GROUND_SPAN,N+2*G.margin);assert.equal(GROUND_SIZE,256,'one 256 by 256 texture');
 assert.ok(Math.abs(texelWorld(0)+G.margin)<1/G.texels&&Math.abs(texelWorld(GROUND_SIZE-1)-(N+G.margin))<1/G.texels);
 assert.ok(Math.abs(worldTexel(texelWorld(37))-37)<1e-9);
 const a=bakeGround(),b=bakeGround(),c=bakeGround(G.seed+1);
 assert.deepEqual(a.data,b.data);assert.notDeepEqual(a.data,c.data);assert.equal(a.data.length,GROUND_SIZE*GROUND_SIZE*4);
});

test('the claim gets broad, gentle variation that keeps its overall brightness and stays grey ash',()=>{
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

// The plain's top layer of dust (step 4 of the dirt pass): a tiling grain and dimple texture over the baked ground, scaled by the preset.
test('the dust layer is a seeded, tiling field of fine grain and small dimples, and only the presets that want it read it',()=>{
 const a=dirtFields(64,5),b=dirtFields(64,5),S=a.size;assert.deepEqual(a.dust,b.dust,'the same for every player');assert.notDeepEqual(dirtFields(64,6).dust,a.dust);
 for(const name of ['grit','pebbles','dust'])assert.equal(a[name].length,S*S*4,name);
 let low=0;for(let k=0;k<S*S;k++)if(a.dust[k*4+2]<100)low++;assert.ok(low>0&&low<S*S*0.3,'some dimples, mostly level dust: '+low);
 // Tiling: the normals across the wrap seam change no more than they do inside the texture.
 const nx=(x,y)=>a.dust[((y%S)*S+(x%S))*4];let inside=0,seam=0;for(let y=0;y<S;y++){for(let x=1;x<S-1;x++)inside=Math.max(inside,Math.abs(nx(x,y)-nx(x+1,y)));seam=Math.max(seam,Math.abs(nx(S-1,y)-nx(S,y)));}assert.ok(seam<=inside,'no seam where it wraps: '+seam+' vs '+inside);
 assert.deepEqual([C.dirt.high.regolith>0,C.dirt.balanced.regolith>0,C.dirt.low.regolith],[true,true,0]);
 const textures=createDirtTextures();for(const name of ['grit','pebbles','dustLayer']){const t=textures[name];assert.ok(t.isDataTexture,name);assert.equal(t.image.width,256);assert.equal(t.wrapS,1000,'tiles');assert.equal(t.colorSpace,'','data, not colour');}
});

test('walkers leave boot prints left and right along their path, the mech its treads, from a pool that fades them over a minute',()=>{
 const scene=new T.Scene(),prints=createFootprints(scene),mesh=scene.getObjectByName('Dust footprints');assert.ok(mesh);assert.equal(prints.limit,G.prints);
 const field=printField(32);assert.equal(field.data.length,64*32*4);let boot=0,mech=0;for(let j=0;j<32;j++)for(let i=0;i<64;i++)if(field.data[(j*64+i)*4+3]>128)(i<32?boot++:mech++);assert.ok(boot>100&&mech>100,'a sole and a pair of treads: '+boot+', '+mech);
 // Walk two units in a straight line: a print every stride, alternating sides of the path, each turned along it.
 let now=1000;for(let k=0;k<=100;k++){prints.walk('ada',2+k*0.02,5,0,now);now+=20;}
 const count=prints.count,expected=Math.floor(2/G.bootStride);assert.ok(Math.abs(count-expected)<=1,'one print a stride: '+count+' for '+expected);
 const m=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3(),sides=new Set();for(let k=0;k<count;k++){mesh.getMatrixAt(k,m);m.decompose(p,q,s);assert.ok(p.x>=2-1e-6&&p.x<=4+1e-6,'along the path');assert.ok(Math.abs(Math.abs(p.z-5)-G.bootSpread)<1e-6,'beside it');sides.add(Math.sign(p.z-5));assert.ok(Math.abs(p.y-0.006)<1e-9);}
 assert.equal(sides.size,2,'left and right');assert.ok(mesh.visible&&mesh.count===count);
 const born=mesh.geometry.attributes.printBorn.array;for(let k=0;k<count;k++)assert.ok(born[k]>0&&born[k]<=now/1000,'stamped with its birth time');
 // A jump (a belay, a respawn) breaks the trail rather than drawing a line of prints across it; so does lifting.
 prints.walk('ada',9,9,0,now);assert.equal(prints.count,count);prints.lift('ada');prints.walk('ada',9.5,9,0,now);assert.equal(prints.count,count);
 // The mech leaves its tread marks; the pool wraps, the oldest giving way; Low has none.
 for(let k=0;k<1000;k++)prints.walk('mech',3+((k*0.05)%8),11,1,now+k*10);assert.equal(prints.count,G.prints,'never past the pool');assert.ok([...mesh.geometry.attributes.printKind.array].some(v=>v===1));
 prints.setBudget(0);assert.equal(prints.count,0);assert.equal(mesh.visible,false);prints.walk('ada',1,1,0,now);prints.walk('ada',3,1,0,now);assert.equal(prints.count,0,'none on Low');
 prints.setBudget(G.prints);prints.walk('ada',1,1,0,now);prints.walk('ada',1.5,1,0,now);assert.ok(prints.count>0);prints.reset();assert.equal(prints.count,0);
});

// Footstep dust (physics pass): each print laid calls onStep with its middle and the heading, for the step's puff; a fresh print wears a
// short-lived scuff of lighter dust drawn in the same decal, so the pool and its one draw are unchanged.
test('each print laid reports the step for its puff, and a fresh print is ringed by a scuff that settles within scuffLife',()=>{
 const steps=[],scene=new T.Scene(),prints=createFootprints(scene,{onStep:(x,z,ax,az,kind,now)=>steps.push([x,z,ax,az,kind])});let now=1000;
 for(let k=0;k<=60;k++){prints.walk('ada',2+k*0.02,5,0,now);now+=20;}assert.equal(steps.length,prints.count,'one step per print');assert.ok(steps.length>=3);
 for(const [x,z,ax,az,kind] of steps){assert.ok(x>=2&&x<=3.3&&Math.abs(z-5)<G.bootSpread+1e-6);assert.ok(Math.abs(ax-1)<1e-6&&Math.abs(az)<1e-6);assert.equal(kind,0);}
 prints.lift('ada');prints.walk('ada',8,8,0,now);prints.walk('ada',8,8,0,now+100);assert.equal(steps.length,prints.count,'standing still lays no steps');
 prints.setBudget(0);const before=steps.length;prints.walk('ada',1,1,0,now);prints.walk('ada',3,1,0,now);assert.equal(steps.length,before,'no prints, no steps on Low');
 const mesh=scene.getObjectByName('Dust footprints'),shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader);
 assert.ok(shader.vertexShader.includes('printGrow')&&shader.vertexShader.includes('transformed.xz*=1.0+printGrow'),'the quad grows while the scuff lasts');assert.ok(shader.fragmentShader.includes('scuffA'),'and the scuff is drawn');
 assert.ok(!shader.vertexShader.includes('undefined')&&!shader.fragmentShader.includes('undefined')&&!shader.fragmentShader.includes('NaN'));assert.ok(G.scuffLife>0&&G.scuffLife<3&&G.scuffAlpha>0&&G.scuffAlpha<1);
});
