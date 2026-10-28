import * as T from './vendor/three.module.js';
import {C} from '../config.js';
// Dig feedback for the 3D view. A hit flings a few chunks of the struck stratum out of the cell; a break flings more, bigger and faster
// ones. Chunks fall under gravity, bounce on whatever ground is under them (the rim, the new floor; a wall turns them back), come to rest,
// then shrink and sink into the dirt. A soft puff of dust in the stratum's colour swells over the cell and hangs there a moment.
// Each effect is one pooled InstancedMesh drawn only up to its live count, so it costs one draw call however much is flying, and none
// when nothing is. Pool sizes, the chunk rate, chunks per burst and the camera kick follow the graphics preset (quality.js); the renderer
// skips all of it under reduced motion. Budgets, colours, the physics step and the kick curve are plain functions for the node tests.
const D=C.digFx,lerp=([a,b],t)=>a+(b-a)*t;

// Pools, spawn rate (chunks per second), the share of each burst's chunks and whether the camera may kick, for one preset's settings.
export function digBudget(settings={}){
 const debris=Math.max(0,settings.debris??1),puffs=Math.max(0,settings.puffs??1);
 return {chunks:Math.round(D.chunks*Math.min(1,debris)),puffs:Math.round(D.puffs*Math.min(1,puffs)),rate:D.chunkRate*debris,perBurst:Math.min(1,debris*1.5),kick:!!settings.kick};
}

const STRATA=[];{let end=0;for(const layer of C.layers){end+=layer.rows;STRATA.push([end,layer.color]);}}
// The colour of the stratum a row belongs to: the same bands the shaft walls show.
export function stratumColor(row){for(const [end,color] of STRATA)if(row<end)return color;return STRATA[STRATA.length-1][1];}

// Chunks are rationed by a token bucket, so a mech tearing out nine cells a tick sprays steadily instead of recycling chunks in mid air.
// Bursts released together share what the bucket holds evenly: each gets an equal cut, and what a small burst leaves goes to the rest.
// Fills got for the first count requests and returns it; allocates nothing when got is passed in.
export function shareChunks(requests,tokens,count=requests.length,got=new Int32Array(count)){
 let left=Math.max(0,Math.floor(tokens)),open=0;for(let i=0;i<count;i++){got[i]=0;if(requests[i]>0)open++;}
 while(left>0&&open>0){const each=Math.max(1,Math.floor(left/open));for(let i=0;i<count&&left>0;i++){const k=Math.min(each,requests[i]-got[i],left);if(k>0){got[i]+=k;left-=k;}}open=0;for(let i=0;i<count;i++)if(requests[i]>got[i])open++;}
 return got;
}

const CHUNK_KEYS=['x','y','z','vx','vy','vz','r','age','life','angle','spin','ax','ay','az','cr','cg','cb','bounces','rest'];
const PUFF_KEYS=['x','y','z','vx','vy','vz','age','life','s0','s1','alpha','roll','turn','cr','cg','cb'];
export function createPool(capacity,keys=CHUNK_KEYS){const pool={capacity,limit:capacity,count:0,victim:0,keys};for(const key of keys)pool[key]=new Float32Array(capacity);return pool;}
// A free slot. When the pool is full a chunk pool hands over its slots in turn (recycle); a puff pool just declines.
export function takeSlot(pool,recycle=true){if(pool.limit<=0)return -1;if(pool.count<pool.limit)return pool.count++;if(!recycle||!pool.count)return -1;pool.victim=(pool.victim+1)%pool.count;return pool.victim;}
function dropSlot(pool,i){const last=--pool.count;if(i!==last)for(const key of pool.keys)pool[key][i]=pool[key][last];}

// Moves every live chunk on by dt seconds. groundAt(x,z) is the ground height under a point. A chunk coming down onto ground bounces,
// losing most of its speed, and rests after a few bounces; one that runs sideways into ground higher than itself has met a wall and
// turns back. A resting chunk falls again when the ground under it is dug away. One that comes to rest on a spoil heap (heapAt, the
// mounds' height at a point) settles into it within heapSettle seconds. Chunks past their life are removed.
export function stepChunks(pool,dt,groundAt,heapAt=null){
 for(let i=pool.count-1;i>=0;i--){
  pool.age[i]+=dt;if(pool.age[i]>=pool.life[i]){dropSlot(pool,i);continue;}
  const r=pool.r[i]*0.6;
  if(pool.rest[i]){if(groundAt(pool.x[i],pool.z[i])<pool.y[i]-r-0.01)pool.rest[i]=0;else continue;}
  const ox=pool.x[i],oy=pool.y[i],oz=pool.z[i];pool.vy[i]-=D.gravity*dt;
  let x=ox+pool.vx[i]*dt,y=oy+pool.vy[i]*dt,z=oz+pool.vz[i]*dt,g=groundAt(x,z);
  if(oy-r<g-0.002){x=ox;z=oz;pool.vx[i]*=-D.wall;pool.vz[i]*=-D.wall;g=groundAt(x,z);}
  if(y-r<=g){y=g+r;if(pool.vy[i]<0){pool.bounces[i]++;const up=-pool.vy[i]*D.bounce;if(up<D.restSpeed||pool.bounces[i]>=D.maxBounces){pool.vx[i]=pool.vy[i]=pool.vz[i]=0;pool.rest[i]=1;if(heapAt&&heapAt(x,z)>0.004)pool.life[i]=Math.min(pool.life[i],pool.age[i]+D.heapSettle);}else{pool.vy[i]=up;pool.vx[i]*=D.friction;pool.vz[i]*=D.friction;pool.spin[i]*=0.6;}}}
  pool.x[i]=x;pool.y[i]=y;pool.z[i]=z;pool.angle[i]+=pool.spin[i]*dt;
 }
}
// A chunk keeps its size until the last settle fraction of its life, then shrinks smoothly to nothing as it sinks into the dirt.
export function chunkScale(age,life){const k=(life-age)/(life*D.settle);return k>=1?1:k<=0?0:k*k*(3-2*k);}
// A puff swells fast then slowly, fades in over its first eighth and thins away over the rest.
export function puffShape(age,life,s0,s1,alpha,out={size:0,alpha:0}){const t=Math.min(1,Math.max(0,age/life));out.size=s0+(s1-s0)*(1-Math.pow(1-t,3));out.alpha=alpha*Math.min(1,t/0.12)*Math.pow(1-t,1.6);return out;}

// The camera kick in screen pixels, `since` ms after a kick of px: a quick push that eases back within kickMs, never more than px.
export function kickOffset(px,since){if(!(px>0)||!(since>=0)||since>=D.kickMs)return 0;const t=since/D.kickMs;return t<0.2?px*Math.sin(t/0.2*Math.PI/2):px*Math.pow((1-t)/0.8,2);}
// The drill's rumble: a smooth wander of at most px pixels on each axis.
export function rumbleOffset(px,now,out={x:0,y:0}){const t=now/1000;out.x=px*(0.62*Math.sin(t*37.1)+0.38*Math.sin(t*23.3+1.7));out.y=px*(0.6*Math.sin(t*29.7+0.4)+0.4*Math.sin(t*41.9+2.3));return out;}
// The rotation (radians) that moves the middle of a perspective view of this vertical field of view and height by px pixels.
export function kickAngle(px,fovDegrees,heightPx){return Math.atan(px*2*Math.tan(fovDegrees*Math.PI/360)/Math.max(1,heightPx));}

// A lumpy little rock: an icosahedron with every corner pushed in or out a fixed amount, flat shaded.
function rockGeometry(){const g=new T.IcosahedronGeometry(1,0),p=g.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const h=Math.sin(v.x*12.9898+v.y*78.233+v.z*37.719)*43758.5453,k=0.72+0.5*(h-Math.floor(h));p.setXYZ(i,v.x*k,v.y*k*0.8,v.z*k);}g.computeVertexNormals();return g;}

export function createDigFx(scene,{puffMap=null}={}){
 const color=new T.Color(),tint=new T.Color(),grey=new T.Color(C.three.dust),pale=new T.Color('#d8d4cc');
 const chunks=createPool(D.chunks),puffs=createPool(D.puffs,PUFF_KEYS),lastBurst=new Map(),lastPuff=new Map();
 // Bursts wait in a fixed pool until they are due; nothing here allocates once the effect is built.
 const pending=Array.from({length:D.pendingMax},()=>({at:0,x:0,y:0,z:0,n:0,row:0,heavy:false,shade:1,away:false,ax:0,az:0,key:-1,puff:true,color:null})),asks=new Int32Array(D.pendingMax),got=new Int32Array(D.pendingMax);let waiting=0;
 let budget=digBudget({}),tokens=D.chunks/3,tokenAt=null,kickAt=-Infinity,kickSize=0;
 const chunkMaterial=new T.MeshStandardMaterial({color:0xffffff,roughness:0.95,metalness:0,flatShading:true,emissive:0xffffff,emissiveIntensity:D.emissive});
 // The faint self-light takes each chunk's own colour, so chunks stay readable in shadow without glowing.
 chunkMaterial.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance*=vColor.rgb;\n#endif');};chunkMaterial.customProgramCacheKey=()=>'dig-chunk';
 const chunkMesh=new T.InstancedMesh(rockGeometry(),chunkMaterial,D.chunks);chunkMesh.name='Dig debris chunks';chunkMesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(D.chunks*3),3);
 const puffGeometry=new T.PlaneGeometry(1,1),puffAlpha=new T.InstancedBufferAttribute(new Float32Array(D.puffs),1);puffGeometry.setAttribute('puffAlpha',puffAlpha);
 const puffMaterial=new T.MeshBasicMaterial({map:puffMap,color:0xffffff,transparent:true,depthWrite:false});
 puffMaterial.onBeforeCompile=s=>{s.vertexShader='attribute float puffAlpha;varying float vPuffAlpha;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vPuffAlpha=puffAlpha;');s.fragmentShader='varying float vPuffAlpha;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a*=vPuffAlpha;');};puffMaterial.customProgramCacheKey=()=>'dig-puff';
 const puffMesh=new T.InstancedMesh(puffGeometry,puffMaterial,D.puffs);puffMesh.name='Dig dust puffs';puffMesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(D.puffs*3),3);
 for(const mesh of [chunkMesh,puffMesh]){mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=false;scene.add(mesh);}
 const cooled=(map,key,now,ms)=>{if(key==null||key<0)return true;const t=map.get(key);if(t!==undefined&&now-t<ms)return false;map.set(key,now);return true;};
 function refill(now){if(tokenAt!==null)tokens=Math.min(Math.max(1,budget.chunks/3),tokens+Math.max(0,now-tokenAt)/1000*budget.rate);tokenAt=now;}
 // n chunks from a point in the stratum's colour (the surface mixes in grey regolith and every stratum some darker rock), flung up and
 // out, and pushed away from the camera when it stands close. heavy is a break: bigger, faster, longer lived chunks.
 function fling(b,n){
  const {x,y,z,row,heavy,shade}=b;color.set(b.color||stratumColor(row));const ax=b.away?x-b.ax:0,az=b.away?z-b.az:0,ad=Math.hypot(ax,az),push=b.away&&ad>1e-3&&ad<D.cameraClear?2*(1-ad/D.cameraClear):0;
  for(let k=0;k<n;k++){const i=takeSlot(chunks);if(i<0)return;const a=Math.random()*Math.PI*2,speed=lerp(D.spread,Math.random())*(heavy?1.2:1);let dx=Math.cos(a),dz=Math.sin(a);
   if(push){dx+=ax/ad*push;dz+=az/ad*push;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;}
   const r=lerp(D.chunkSize,Math.pow(Math.random(),1.5))*(heavy?D.breakSize:1),out=Math.random()*0.08;
   chunks.x[i]=x+dx*out;chunks.y[i]=y+r*0.6;chunks.z[i]=z+dz*out;chunks.vx[i]=dx*speed;chunks.vz[i]=dz*speed;chunks.vy[i]=lerp(heavy?D.breakSpeed:D.hitSpeed,Math.random());
   chunks.r[i]=r;chunks.age[i]=0;chunks.life[i]=lerp(D.chunkLife,Math.random())+(heavy?0.25:0);chunks.angle[i]=Math.random()*Math.PI*2;chunks.spin[i]=(Math.random()-0.5)*2*D.spin;
   const u=Math.random()*2-1,t=Math.random()*Math.PI*2,s=Math.sqrt(1-u*u);chunks.ax[i]=s*Math.cos(t);chunks.ay[i]=u;chunks.az[i]=s*Math.sin(t);chunks.bounces[i]=chunks.rest[i]=0;
   tint.copy(!row&&!b.color&&Math.random()<D.surfaceGrey?grey:color).multiplyScalar((Math.random()<D.darkRock?0.62:1)*(0.85+Math.random()*0.27)*shade);chunks.cr[i]=tint.r;chunks.cg[i]=tint.g;chunks.cb[i]=tint.b;}
 }
 // A dust puff over a point, in the stratum's colour paled toward fine dust and darkened like the floor at that depth.
 function puff(b){
  const i=takeSlot(puffs,false);if(i<0)return;const {x,y,z,row,heavy,shade}=b,[s0,s1]=heavy?D.breakPuff:D.hitPuff;
  tint.set(b.color||stratumColor(row));if(!row&&!b.color)tint.lerp(grey,D.surfaceGrey);tint.lerp(pale,D.dustLighten).multiplyScalar(shade*D.puffBrightness);
  puffs.x[i]=x+(Math.random()-0.5)*0.1;puffs.y[i]=y+s0*0.45;puffs.z[i]=z+(Math.random()-0.5)*0.1;puffs.vx[i]=(Math.random()-0.5)*0.12;puffs.vz[i]=(Math.random()-0.5)*0.12;puffs.vy[i]=D.puffRise*(heavy?1:0.6);
  puffs.age[i]=0;puffs.life[i]=(heavy?D.breakPuffLife:D.hitPuffLife)*(0.85+0.3*Math.random());puffs.s0[i]=s0;puffs.s1[i]=s1*(0.85+0.3*Math.random());puffs.alpha[i]=heavy?D.puffAlpha[1]:D.puffAlpha[0];
  puffs.roll[i]=Math.random()*Math.PI*2;puffs.turn[i]=(Math.random()-0.5)*0.6;puffs.cr[i]=tint.r;puffs.cg[i]=tint.g;puffs.cb[i]=tint.b;
 }
 // A burst waits until it is due, then shares the chunk bucket with the others released that frame and adds its puff. Options (copied, so
 // callers can reuse one object): row (the stratum), heavy (a break), count (chunks wanted before the preset's share), shade (floor
 // darkening at that depth), away (the camera position, to fling clear of it), key (the cell, for the per-cell cooldowns), puff (false
 // to skip the puff), colorHex (instead of the stratum colour), at (when to release it, to land with a tool's strike).
 function queue(x,y,z,o={},now=performance.now()){if(waiting>=pending.length||!cooled(lastBurst,o.key,now,D.cellCooldownMs))return false;const b=pending[waiting++];
  b.at=o.at??now;b.x=x;b.y=y;b.z=z;b.row=o.row||0;b.heavy=!!o.heavy;b.shade=o.shade??1;b.away=!!o.away;b.ax=o.away?.x||0;b.az=o.away?.z||0;b.key=o.key??-1;b.puff=o.puff!==false;b.color=o.colorHex||null;
  b.n=Math.max(1,Math.round((o.count??(o.heavy?D.breakChunks:D.hitChunks))*budget.perBurst));return true;}
 function flush(now=performance.now()){if(!waiting)return;let due=0;for(let i=0;i<waiting;i++)if(pending[i].at<=now){const b=pending[i];pending[i]=pending[due];pending[due++]=b;}if(!due)return;refill(now);
  for(let i=0;i<due;i++)asks[i]=pending[i].n;shareChunks(asks,tokens,due,got);
  for(let i=0;i<due;i++){const b=pending[i];tokens-=got[i];if(got[i])fling(b,got[i]);if(budget.puffs&&b.puff&&cooled(lastPuff,b.key,now,D.puffCooldownMs))puff(b);}
  for(let i=due;i<waiting;i++){const b=pending[i-due];pending[i-due]=pending[i];pending[i]=b;}waiting-=due;}
 const m=new T.Matrix4(),q=new T.Quaternion(),roll=new T.Quaternion(),axis=new T.Vector3(),at=new T.Vector3(),size=new T.Vector3(),facing=new T.Vector3(0,0,1),look={size:0,alpha:0};
 function upload(attribute,count,width){attribute.clearUpdateRanges();attribute.addUpdateRange(0,count*width);attribute.needsUpdate=true;}
 // Releases due bursts, steps both pools and writes the live instances. Puffs turn to face the camera and thin out close to it, so dust
 // you stand in does not fog the view, and chunks passing right by the lens shrink away instead of filling it.
 function update(dt,camera,groundAt,now=performance.now(),heapAt=null){
  flush(now);if(chunks.count)stepChunks(chunks,dt,groundAt,heapAt);
  const cm=chunkMesh.instanceMatrix.array,cc=chunkMesh.instanceColor.array;
  const cam=camera.position,[c0,c1]=D.chunkClear;for(let i=0;i<chunks.count;i++){const d=Math.hypot(chunks.x[i]-cam.x,chunks.y[i]-cam.y,chunks.z[i]-cam.z),near=d>=c1?1:d<=c0?0:(d-c0)/(c1-c0),s=chunks.r[i]*chunkScale(chunks.age[i],chunks.life[i])*near*near*(3-2*near);q.setFromAxisAngle(axis.set(chunks.ax[i],chunks.ay[i],chunks.az[i]),chunks.angle[i]);m.compose(at.set(chunks.x[i],chunks.y[i]-(chunks.r[i]-s)*0.8,chunks.z[i]),q,size.set(s,s,s));m.toArray(cm,i*16);cc[i*3]=chunks.cr[i];cc[i*3+1]=chunks.cg[i];cc[i*3+2]=chunks.cb[i];}
  chunkMesh.count=chunks.count;chunkMesh.visible=chunks.count>0;if(chunks.count){upload(chunkMesh.instanceMatrix,chunks.count,16);upload(chunkMesh.instanceColor,chunks.count,3);}
  const drag=Math.exp(-dt*1.5),lift=Math.exp(-dt*0.8);
  for(let i=puffs.count-1;i>=0;i--){puffs.age[i]+=dt;if(puffs.age[i]>=puffs.life[i]){dropSlot(puffs,i);continue;}puffs.vx[i]*=drag;puffs.vz[i]*=drag;puffs.vy[i]*=lift;puffs.x[i]+=puffs.vx[i]*dt;puffs.y[i]+=puffs.vy[i]*dt;puffs.z[i]+=puffs.vz[i]*dt;puffs.roll[i]+=puffs.turn[i]*dt;}
  const pm=puffMesh.instanceMatrix.array,pc=puffMesh.instanceColor.array,pa=puffAlpha.array;
  for(let i=0;i<puffs.count;i++){puffShape(puffs.age[i],puffs.life[i],puffs.s0[i],puffs.s1[i],puffs.alpha[i],look);q.copy(camera.quaternion).multiply(roll.setFromAxisAngle(facing,puffs.roll[i]));m.compose(at.set(puffs.x[i],puffs.y[i],puffs.z[i]),q,size.set(look.size,look.size,1));m.toArray(pm,i*16);const d=Math.hypot(puffs.x[i]-camera.position.x,puffs.y[i]-camera.position.y,puffs.z[i]-camera.position.z),clear=Math.min(1,Math.max(0,(d-D.puffClear[0])/(D.puffClear[1]-D.puffClear[0])));pa[i]=look.alpha*clear*clear*(3-2*clear);pc[i*3]=puffs.cr[i];pc[i*3+1]=puffs.cg[i];pc[i*3+2]=puffs.cb[i];}
  puffMesh.count=puffs.count;puffMesh.visible=puffs.count>0;if(puffs.count){upload(puffMesh.instanceMatrix,puffs.count,16);upload(puffMesh.instanceColor,puffs.count,3);upload(puffAlpha,puffs.count,1);}
 }
 return {queue,flush,update,
  burst(x,y,z,options={},now=performance.now()){const queued=queue(x,y,z,options,now);flush(now);return queued;},
  // Whether a burst for this cell is still waiting (to land with a strike).
  pendingFor(key){for(let i=0;i<waiting;i++)if(pending[i].key===key)return true;return false;},
  // A kick of px pixels; a smaller kick never cuts a bigger one short.
  kick(px,now=performance.now()){if(budget.kick&&px>=kickOffset(kickSize,now-kickAt)){kickAt=now;kickSize=px;}},
  kickNow(now=performance.now()){return budget.kick?kickOffset(kickSize,now-kickAt):0;},
  setBudget(next){budget=next;chunks.limit=Math.min(D.chunks,next.chunks);puffs.limit=Math.min(D.puffs,next.puffs);chunks.count=Math.min(chunks.count,chunks.limit);puffs.count=Math.min(puffs.count,puffs.limit);tokens=Math.min(tokens,Math.max(1,next.chunks/3));if(!next.kick)kickSize=0;},
  reset(){chunks.count=puffs.count=0;waiting=0;lastBurst.clear();lastPuff.clear();kickSize=0;kickAt=-Infinity;for(const mesh of [chunkMesh,puffMesh]){mesh.count=0;mesh.visible=false;}},
  get budget(){return budget;},chunks,puffs,meshes:[chunkMesh,puffMesh]};
}
