import * as T from './vendor/three.module.js';
import {C} from '../config.js';
// Dig feedback for the 3D view. A hit flings a few chunks of the struck stratum out of the cell; a break flings more, bigger and faster
// ones. Chunks fall under gravity, bounce on whatever ground is under them (the rim, the new floor; a wall turns them back), come to rest,
// then shrink and sink into the dirt. A soft puff of dust in the stratum's colour swells over the cell and hangs there a moment.
// Each effect is one pooled InstancedMesh drawn only up to its live count, so it costs one draw call however much is flying, and none
// when nothing is. Pool sizes, the chunk rate, chunks per burst and the camera kick follow the graphics preset (quality.js); the renderer
// skips all of it under reduced motion. Budgets, colours, the physics step and the kick curve are plain functions for the node tests.
// A break also loosens rocks from the walls above the new floor (rockfall): they share the chunk pool and its one draw, rattle down the
// wall as it leans in, bounce on the floor and sink into the rubble.
const D=C.digFx,LD=C.pits.leanDepth,V3=C.three,lerp=([a,b],t)=>a+(b-a)*t;
// The row whose depth a point below the surface sits at (the inverse of the renderer's depth curve), for the colour of a wall there.
export const rowAtDepth=d=>d<=0?0:d>=V3.depthMax?1e9:-V3.depthScale*Math.log(1-d/V3.depthMax);

// Pools, spawn rate (chunks per second), the share of each burst's chunks and whether the camera may kick, for one preset's settings;
// grains is the crumble pool, scaled by that preset's trickle (C.dirt; none unless the preset is known); rocks that preset's share of
// the rock fall (none on Low), with its bucket's rate and size.
export function digBudget(settings={},dirt=C.dirt?.[settings.level]){
 const debris=Math.max(0,settings.debris??1),puffs=Math.max(0,settings.puffs??1),trickle=Math.max(0,Math.min(1,dirt?.trickle??0)),rocks=Math.max(0,Math.min(1,dirt?.rocks??0));
 return {chunks:Math.round(D.chunks*Math.min(1,debris)),puffs:Math.round(D.puffs*Math.min(1,puffs)),rate:D.chunkRate*debris,perBurst:Math.min(1,debris*1.5),kick:!!settings.kick,grains:Math.round(D.grains*trickle),rocks,fallRate:D.fallRate*rocks,fallBurst:Math.round(D.fallBurst*rocks)};
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

// A rock shed by a wall keeps that wall: a point on its face (wx, wz), the way into it (nx, nz; both 0 for a flung chunk), the height
// it starts to lean in below (wy), how far it leans in at its foot (wl) and how far it had leaned where the rock set off (wo). A pebble
// rolling over the lip has roll still to go of rollAll, from height y0 to y1 at the edge.
const CHUNK_KEYS=['x','y','z','vx','vy','vz','r','age','life','angle','spin','ax','ay','az','cr','cg','cb','bounces','rest','wx','wz','nx','nz','wy','wl','wo','roll','rollAll','y0','y1'];
const PUFF_KEYS=['x','y','z','vx','vy','vz','age','life','s0','s1','alpha','roll','turn','cr','cg','cb'];
const GRAIN_KEYS=['x','y','z','vx','vy','vz','age','life','floor','size','alpha','cr','cg','cb'];
export function createPool(capacity,keys=CHUNK_KEYS){const pool={capacity,limit:capacity,count:0,victim:0,keys};for(const key of keys)pool[key]=new Float32Array(capacity);return pool;}
// A free slot. When the pool is full a chunk pool hands over its slots in turn (recycle); a puff pool just declines.
export function takeSlot(pool,recycle=true){if(pool.limit<=0)return -1;if(pool.count<pool.limit)return pool.count++;if(!recycle||!pool.count)return -1;pool.victim=(pool.victim+1)%pool.count;return pool.victim;}
function dropSlot(pool,i){const last=--pool.count;if(i!==last)for(const key of pool.keys)pool[key][i]=pool[key][last];}

// Moves every live chunk on by dt seconds. groundAt(x,z) is the ground height under a point. A chunk coming down onto ground bounces,
// losing most of its speed, and rests after a few bounces; one that runs sideways into ground higher than itself has met a wall and
// turns back. A resting chunk falls again when the ground under it is dug away. One that comes to rest on a spoil heap (heapAt, the
// mounds' height at a point) settles into it within heapSettle seconds. Chunks past their life are removed. A chunk whose age is still
// below zero waits (a rock about to come loose). A rock with a wall never passes its face: the face leans in below the rim as the
// pit's walls do, so a falling rock meets it and is knocked off it, losing speed; one still rolling over the lip follows it to the edge.
export function stepChunks(pool,dt,groundAt,heapAt=null){
 for(let i=pool.count-1;i>=0;i--){
  pool.age[i]+=dt;if(pool.age[i]>=pool.life[i]){dropSlot(pool,i);continue;}if(pool.age[i]<0)continue;
  const r=pool.r[i]*0.6;
  if(pool.roll[i]>0){rollOn(pool,i,dt);continue;}
  if(pool.rest[i]){if(groundAt(pool.x[i],pool.z[i])<pool.y[i]-r-0.01)pool.rest[i]=0;else continue;}
  const ox=pool.x[i],oy=pool.y[i],oz=pool.z[i];pool.vy[i]-=D.gravity*dt;
  let x=ox+pool.vx[i]*dt,y=oy+pool.vy[i]*dt,z=oz+pool.vz[i]*dt;
  if(pool.nx[i]||pool.nz[i]){const nx=pool.nx[i],nz=pool.nz[i],d=Math.max(0,pool.wy[i]-y)/LD,e=Math.exp(-d),s=(x-pool.wx[i])*nx+(z-pool.wz[i])*nz+pool.wl[i]*(1-(1+d)*e)-pool.wo[i]+r;
   if(s>0){x-=s*nx;z-=s*nz;const vn=pool.vx[i]*nx+pool.vz[i]*nz-Math.min(0,pool.vy[i])*pool.wl[i]*d*e/LD;if(vn>0){const j=(1+D.wall)*vn;pool.vx[i]-=j*nx;pool.vz[i]-=j*nz;pool.vy[i]*=D.fallScrape;pool.spin[i]=-pool.spin[i]*0.7;}}}
  let g=groundAt(x,z);
  if(oy-r<g-0.002){x=ox;z=oz;pool.vx[i]*=-D.wall;pool.vz[i]*=-D.wall;g=groundAt(x,z);}
  if(y-r<=g){y=g+r;if(pool.vy[i]<0){pool.bounces[i]++;const up=-pool.vy[i]*D.bounce;if(up<D.restSpeed||pool.bounces[i]>=D.maxBounces){pool.vx[i]=pool.vy[i]=pool.vz[i]=0;pool.rest[i]=1;if(heapAt&&heapAt(x,z)>0.004)pool.life[i]=Math.min(pool.life[i],pool.age[i]+D.heapSettle);}else{pool.vy[i]=up;pool.vx[i]*=D.friction;pool.vz[i]*=D.friction;pool.spin[i]*=0.6;}}}
  pool.x[i]=x;pool.y[i]=y;pool.z[i]=z;pool.angle[i]+=pool.spin[i]*dt;
 }
}
// A pebble still on the lip rolls straight on toward the edge at its own speed, its height following the lip (y0 where it set off, y1
// at the edge) and turning about its axis as it goes; past the edge it flies free and falls in.
function rollOn(pool,i,dt){const v=Math.hypot(pool.vx[i],pool.vz[i])||1e-6,d=Math.min(pool.roll[i],v*dt);pool.x[i]+=pool.vx[i]/v*d;pool.z[i]+=pool.vz[i]/v*d;pool.roll[i]-=d;pool.y[i]=pool.y1[i]+(pool.y0[i]-pool.y1[i])*pool.roll[i]/Math.max(1e-6,pool.rollAll[i]);pool.angle[i]+=pool.spin[i]*dt;}
// Moves the crumble's grains on by dt. A grain waits while its age is below zero (a trickle runs out over a moment), then falls at
// grainGravity, drifting off the wall; on reaching its floor it stops and fades out quickly. Grains past their life are removed.
export function stepGrains(pool,dt){
 for(let i=pool.count-1;i>=0;i--){
  pool.age[i]+=dt;if(pool.age[i]>=pool.life[i]){dropSlot(pool,i);continue;}if(pool.age[i]<0)continue;
  pool.vy[i]-=D.grainGravity*dt;pool.x[i]+=pool.vx[i]*dt;pool.y[i]+=pool.vy[i]*dt;pool.z[i]+=pool.vz[i]*dt;
  if(pool.y[i]<=pool.floor[i]){pool.y[i]=pool.floor[i];pool.vx[i]=pool.vy[i]=pool.vz[i]=0;pool.life[i]=Math.min(pool.life[i],pool.age[i]+D.grainFade);}
 }
}
// A grain's opacity: in over its first 50 ms, out over the last grainFade seconds of its life.
export function grainAlpha(age,life,alpha){if(age<0||age>=life)return 0;return alpha*Math.min(1,age/0.05)*Math.min(1,(life-age)/D.grainFade);}
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
 const chunks=createPool(D.chunks),puffs=createPool(D.puffs,PUFF_KEYS),grains=createPool(D.grains,GRAIN_KEYS),lastBurst=new Map(),lastPuff=new Map(),lastCrumble=new Map();
 // Bursts wait in a fixed pool until they are due; nothing here allocates once the effect is built.
 const pending=Array.from({length:D.pendingMax},()=>({at:0,x:0,y:0,z:0,n:0,row:0,heavy:false,shade:1,away:false,ax:0,az:0,key:-1,puff:true,color:null})),asks=new Int32Array(D.pendingMax),got=new Int32Array(D.pendingMax);let waiting=0;
 let budget=digBudget({}),tokens=D.chunks/3,tokenAt=null,kickAt=-Infinity,kickSize=0,rockTokens=0,rockAt=null;const lastFall=new Map(),lastFallHit=new Map(),spot={x:0,z:0,wx:0,wz:0,top:0,lean:0},sideWeight=new Float32Array(4);
 const chunkMaterial=new T.MeshStandardMaterial({color:0xffffff,roughness:0.95,metalness:0,flatShading:true,emissive:0xffffff,emissiveIntensity:D.emissive});
 // The faint self-light takes each chunk's own colour, so chunks stay readable in shadow without glowing.
 chunkMaterial.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance*=vColor.rgb;\n#endif');};chunkMaterial.customProgramCacheKey=()=>'dig-chunk';
 const chunkMesh=new T.InstancedMesh(rockGeometry(),chunkMaterial,D.chunks);chunkMesh.name='Dig debris chunks';chunkMesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(D.chunks*3),3);
 const puffGeometry=new T.PlaneGeometry(1,1),puffAlpha=new T.InstancedBufferAttribute(new Float32Array(D.puffs),1);puffGeometry.setAttribute('puffAlpha',puffAlpha);
 const puffMaterial=new T.MeshBasicMaterial({map:puffMap,color:0xffffff,transparent:true,depthWrite:false});
 puffMaterial.onBeforeCompile=s=>{s.vertexShader='attribute float puffAlpha;varying float vPuffAlpha;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vPuffAlpha=puffAlpha;');s.fragmentShader='varying float vPuffAlpha;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a*=vPuffAlpha;');};puffMaterial.customProgramCacheKey=()=>'dig-puff';
 const puffMesh=new T.InstancedMesh(puffGeometry,puffMaterial,D.puffs);puffMesh.name='Dig dust puffs';puffMesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(D.puffs*3),3);
 for(const mesh of [chunkMesh,puffMesh]){mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=false;scene.add(mesh);}
 // The crumble: one Points cloud of round grains, each with its own colour, opacity and size, drawn up to the live count. A grain is a
 // firm little dot; a clot of the sheet (a negative size) a soft one. No texture: the disc is drawn in the shader.
 const grainGeometry=new T.BufferGeometry(),grainPos=new T.BufferAttribute(new Float32Array(D.grains*3),3),grainColor=new T.BufferAttribute(new Float32Array(D.grains*4),4),grainSize=new T.BufferAttribute(new Float32Array(D.grains),1);
 for(const a of [grainPos,grainColor,grainSize])a.setUsage(T.DynamicDrawUsage);grainGeometry.setAttribute('position',grainPos);grainGeometry.setAttribute('color',grainColor);grainGeometry.setAttribute('grainSize',grainSize);grainGeometry.setDrawRange(0,0);
 const grainMaterial=new T.PointsMaterial({size:1,sizeAttenuation:true,vertexColors:true,transparent:true,depthWrite:false});
 grainMaterial.onBeforeCompile=s=>{s.vertexShader='attribute float grainSize;varying float grainSoft;\n'+s.vertexShader.replace('gl_PointSize = size;','gl_PointSize = size * abs(grainSize);grainSoft = grainSize < 0.0 ? 0.05 : 0.6;');s.fragmentShader='varying float grainSoft;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a *= 1.0 - smoothstep(grainSoft, 1.0, length(gl_PointCoord * 2.0 - 1.0));');};grainMaterial.customProgramCacheKey=()=>'dig-grain';
 const grainPoints=new T.Points(grainGeometry,grainMaterial);grainPoints.name='Dig crumble grains';grainPoints.frustumCulled=false;grainPoints.visible=false;scene.add(grainPoints);
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
   const u=Math.random()*2-1,t=Math.random()*Math.PI*2,s=Math.sqrt(1-u*u);chunks.ax[i]=s*Math.cos(t);chunks.ay[i]=u;chunks.az[i]=s*Math.sin(t);chunks.bounces[i]=chunks.rest[i]=0;chunks.nx[i]=chunks.nz[i]=chunks.roll[i]=0;
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
 // The crumble when a cell breaks (x, z its middle): a trickle down each wall on solid ground (sides: 1 +x, 2 -x, 4 +z, 8 -z) from the
 // rim (rim: its height) or crumbleSpan above the new floor (floor), and in a shallow hole a sheet of soft clots from one rim, in the stratum's colour
 // darkened like the floor (row, shade, colorHex), starting at `at` (ms). At most once per crumbleCooldownMs a cell (key), so a mech
 // breaking nine cells a tick throws a few thin trickles, never a cloud; grains decline when the pool is full.
 function crumble(x,z,o={},now=performance.now()){if(!budget.grains||!o.sides||!cooled(lastCrumble,o.key,now,D.crumbleCooldownMs))return false;
  color.set(o.colorHex||stratumColor(o.row||0));const shade=o.shade??1,floor=o.floor??0,rim=o.rim??0.03,top=Math.max(floor+0.05,Math.min(rim,floor+D.crumbleSpan)),wait=Math.max(0,((o.at??now)-now)/1000),reach=o.reach??0.3;let sheetSide=-1;
  for(let side=0;side<4;side++){if(!(o.sides&(1<<side)))continue;if(sheetSide<0||Math.random()<0.5)sheetSide=side;const nx=side===0?1:side===1?-1:0,nz=side===2?1:side===3?-1:0,along=(Math.random()-0.5)*0.5;
   for(let k=0;k<D.crumbleGrains;k++)grain(x+nx*reach-nz*(along+(Math.random()-0.5)*0.05),top-Math.random()*0.04,z+nz*reach+nx*(along+(Math.random()-0.5)*0.05),-nx,-nz,floor,wait+k*0.035+Math.random()*0.02,lerp(D.grainSize,Math.random()),D.grainAlpha,shade*D.grainTone*(0.75+Math.random()*0.4),0.04+Math.random()*0.12,0);}
  if(sheetSide>=0&&rim-floor<=D.sheetDepth){const nx=sheetSide===0?1:sheetSide===1?-1:0,nz=sheetSide===2?1:sheetSide===3?-1:0;for(let k=0;k<D.crumbleSheet;k++){const along=(k/(D.crumbleSheet-1)-0.5)*0.5;grain(x+nx*(reach+0.04)-nz*along,rim,z+nz*(reach+0.04)+nx*along,-nx,-nz,floor,wait+Math.random()*0.08,-lerp(D.sheetSize,Math.random()),D.sheetAlpha,shade*D.grainTone*1.25,0.1+Math.random()*0.15,D.dustLighten);}}
  return true;}
 // Rock fall: when a cell breaks, and now and then on a heavy tool's strike (hit), rocks the size that tool breaks loose (scale times
 // fallSize) come away from the walls above the new floor: from the sides with solid ground (sides as for the crumble), at heights up
 // to fallSpan above the floor (floor) and under the rim (rim), one after another from `at` (ms), count of them before the preset's
 // share. wall(nx, nz, along, y, r, out) finds the wall there: out.x, out.z the rock's middle against it, out.wx, out.wz its face,
 // out.top where it starts to lean in and out.lean how far it leans at its foot (false: no room, skip the rock); without it the wall
 // stands upright reach from the middle. A rock keeps to its wall as it falls (stepChunks), takes the colour of the stratum at the
 // height it left (row, shade as for chunks) and settles into the floor like any chunk. Each cell sheds once per fallCooldownMs
 // (fallHitCooldownMs for a strike's rock), from a bucket of fallRate rocks a second; rocks decline when the pool is full. The walls that
 // face the camera (eyeX, eyeZ: where it stands) get most of them, the near wall that hides its own rocks fallBackWall's share.
 function rockfall(x,z,o={},now=performance.now()){if(!budget.rocks||!o.sides||!cooled(o.hit?lastFallHit:lastFall,o.key,now,o.hit?D.fallHitCooldownMs:D.fallCooldownMs))return 0;
  rockTokens=rockAt===null?budget.fallBurst:Math.min(budget.fallBurst,rockTokens+Math.max(0,now-rockAt)/1000*budget.fallRate);rockAt=now;
  const want=Math.min(Math.floor(rockTokens),Math.max(1,Math.round((o.count??2)*budget.rocks))),shade=o.shade??1,floor=o.floor??0,rim=o.rim??0.03,scale=o.scale??1,wait=Math.max(0,((o.at??now)-now)/1000),reach=o.reach??0.3;
  let total=0,made=0;for(let s=0;s<4;s++){sideWeight[s]=0;if(!(o.sides&(1<<s)))continue;const nx=s===0?1:s===1?-1:0,nz=s===2?1:s===3?-1:0,ex=x-(o.eyeX??x),ez=z-(o.eyeZ??z),d=Math.hypot(ex,ez);sideWeight[s]=D.fallBackWall+(d>1e-3?Math.max(0,(nx*ex+nz*ez)/d):0);total+=sideWeight[s];}
  for(let k=0;k<want;k++){let pick=Math.random()*total,side=0;for(;side<3;side++){if(pick<sideWeight[side])break;pick-=sideWeight[side];}if(!sideWeight[side])continue;
   const nx=side===0?1:side===1?-1:0,nz=side===2?1:side===3?-1:0,along=(Math.random()-0.5)*2*D.fallAlong,r=lerp(D.fallSize,Math.pow(Math.random(),1.4))*scale,low=floor+r+0.01,high=Math.max(low,Math.min(rim-r,floor+D.fallSpan)),y=low+(high-low)*(0.3+0.7*Math.random());
   spot.wx=x+nx*reach-nz*along;spot.wz=z+nz*reach+nx*along;spot.x=spot.wx-nx*r;spot.z=spot.wz-nz*r;spot.top=rim;spot.lean=0;if(o.wall&&!o.wall(nx,nz,along,y,r,spot))continue;
   const i=takeSlot(chunks,false);if(i<0)break;const out=lerp(D.fallOut,Math.random()),slide=(Math.random()-0.5)*0.12;
   chunks.x[i]=spot.x;chunks.y[i]=y;chunks.z[i]=spot.z;chunks.vx[i]=-nx*out-nz*slide;chunks.vz[i]=-nz*out+nx*slide;chunks.vy[i]=Math.random()*D.fallPop;chunks.r[i]=r;
   chunks.age[i]=-(wait+made*D.fallStagger+Math.random()*D.fallStagger);chunks.life[i]=lerp(D.fallLife,Math.random());chunks.angle[i]=Math.random()*Math.PI*2;chunks.spin[i]=(Math.random()-0.5)*2*D.fallSpin;
   const u=Math.random()*2-1,t=Math.random()*Math.PI*2,s=Math.sqrt(1-u*u);chunks.ax[i]=s*Math.cos(t);chunks.ay[i]=u;chunks.az[i]=s*Math.sin(t);chunks.bounces[i]=chunks.rest[i]=chunks.roll[i]=0;
   chunks.wx[i]=spot.wx;chunks.wz[i]=spot.wz;chunks.nx[i]=nx;chunks.nz[i]=nz;chunks.wy[i]=spot.top;chunks.wl[i]=spot.lean;{const d=Math.max(0,spot.top-y)/LD;chunks.wo[i]=spot.lean*(1-(1+d)*Math.exp(-d));}
   const row=rowAtDepth(-y);color.set(stratumColor(row));tint.copy(!row&&Math.random()<D.surfaceGrey?grey:color).multiplyScalar((Math.random()<D.darkRock?0.62:1)*(0.85+Math.random()*0.27)*shade*D.fallTone);chunks.cr[i]=tint.r;chunks.cg[i]=tint.g;chunks.cb[i]=tint.b;made++;}
  rockTokens-=made;return made;}
 function grain(x,y,z,dx,dz,floor,delay,size,alpha,shade,speed,dusty){const i=takeSlot(grains,false);if(i<0)return;grains.x[i]=x;grains.y[i]=y;grains.z[i]=z;grains.vx[i]=dx*speed+(Math.random()-0.5)*0.05;grains.vz[i]=dz*speed+(Math.random()-0.5)*0.05;grains.vy[i]=-Math.random()*0.25;
  grains.age[i]=-delay;grains.life[i]=lerp(D.grainLife,Math.random());grains.floor[i]=floor;grains.size[i]=size;grains.alpha[i]=alpha;tint.copy(color).lerp(grey,dusty).multiplyScalar(Math.min(1.2,shade));grains.cr[i]=tint.r;grains.cg[i]=tint.g;grains.cb[i]=tint.b;}
 function update(dt,camera,groundAt,now=performance.now(),heapAt=null){
  flush(now);if(chunks.count)stepChunks(chunks,dt,groundAt,heapAt);
  const cm=chunkMesh.instanceMatrix.array,cc=chunkMesh.instanceColor.array;
  const cam=camera.position,[c0,c1]=D.chunkClear;for(let i=0;i<chunks.count;i++){const d=Math.hypot(chunks.x[i]-cam.x,chunks.y[i]-cam.y,chunks.z[i]-cam.z),near=d>=c1?1:d<=c0?0:(d-c0)/(c1-c0),s=chunks.age[i]<0?0:chunks.r[i]*chunkScale(chunks.age[i],chunks.life[i])*near*near*(3-2*near);q.setFromAxisAngle(axis.set(chunks.ax[i],chunks.ay[i],chunks.az[i]),chunks.angle[i]);m.compose(at.set(chunks.x[i],chunks.y[i]-(chunks.r[i]-s)*0.8,chunks.z[i]),q,size.set(s,s,s));m.toArray(cm,i*16);cc[i*3]=chunks.cr[i];cc[i*3+1]=chunks.cg[i];cc[i*3+2]=chunks.cb[i];}
  chunkMesh.count=chunks.count;chunkMesh.visible=chunks.count>0;if(chunks.count){upload(chunkMesh.instanceMatrix,chunks.count,16);upload(chunkMesh.instanceColor,chunks.count,3);}
  const drag=Math.exp(-dt*1.5),lift=Math.exp(-dt*0.8);
  for(let i=puffs.count-1;i>=0;i--){puffs.age[i]+=dt;if(puffs.age[i]>=puffs.life[i]){dropSlot(puffs,i);continue;}puffs.vx[i]*=drag;puffs.vz[i]*=drag;puffs.vy[i]*=lift;puffs.x[i]+=puffs.vx[i]*dt;puffs.y[i]+=puffs.vy[i]*dt;puffs.z[i]+=puffs.vz[i]*dt;puffs.roll[i]+=puffs.turn[i]*dt;}
  const pm=puffMesh.instanceMatrix.array,pc=puffMesh.instanceColor.array,pa=puffAlpha.array;
  for(let i=0;i<puffs.count;i++){puffShape(puffs.age[i],puffs.life[i],puffs.s0[i],puffs.s1[i],puffs.alpha[i],look);q.copy(camera.quaternion).multiply(roll.setFromAxisAngle(facing,puffs.roll[i]));m.compose(at.set(puffs.x[i],puffs.y[i],puffs.z[i]),q,size.set(look.size,look.size,1));m.toArray(pm,i*16);const d=Math.hypot(puffs.x[i]-camera.position.x,puffs.y[i]-camera.position.y,puffs.z[i]-camera.position.z),clear=Math.min(1,Math.max(0,(d-D.puffClear[0])/(D.puffClear[1]-D.puffClear[0])));pa[i]=look.alpha*clear*clear*(3-2*clear);pc[i*3]=puffs.cr[i];pc[i*3+1]=puffs.cg[i];pc[i*3+2]=puffs.cb[i];}
  puffMesh.count=puffs.count;puffMesh.visible=puffs.count>0;if(puffs.count){upload(puffMesh.instanceMatrix,puffs.count,16);upload(puffMesh.instanceColor,puffs.count,3);upload(puffAlpha,puffs.count,1);}
  if(grains.count)stepGrains(grains,dt);const gp=grainPos.array,gc=grainColor.array,gs=grainSize.array,g0=D.grainClear[0],g1=D.grainClear[1];
  for(let i=0;i<grains.count;i++){gp[i*3]=grains.x[i];gp[i*3+1]=grains.y[i];gp[i*3+2]=grains.z[i];const d=Math.hypot(grains.x[i]-cam.x,grains.y[i]-cam.y,grains.z[i]-cam.z),near=d>=g1?1:d<=g0?0:(d-g0)/(g1-g0);gc[i*4]=grains.cr[i];gc[i*4+1]=grains.cg[i];gc[i*4+2]=grains.cb[i];gc[i*4+3]=grainAlpha(grains.age[i],grains.life[i],grains.alpha[i])*near*near*(3-2*near);gs[i]=grains.size[i];}
  grainGeometry.setDrawRange(0,grains.count);grainPoints.visible=grains.count>0;if(grains.count){upload(grainPos,grains.count,3);upload(grainColor,grains.count,4);upload(grainSize,grains.count,1);}
 }
 return {queue,flush,update,
  burst(x,y,z,options={},now=performance.now()){const queued=queue(x,y,z,options,now);flush(now);return queued;},
  // Whether a burst for this cell is still waiting (to land with a strike).
  pendingFor(key){for(let i=0;i<waiting;i++)if(pending[i].key===key)return true;return false;},
  // A kick of px pixels; a smaller kick never cuts a bigger one short.
  kick(px,now=performance.now()){if(budget.kick&&px>=kickOffset(kickSize,now-kickAt)){kickAt=now;kickSize=px;}},
  kickNow(now=performance.now()){return budget.kick?kickOffset(kickSize,now-kickAt):0;},
  setBudget(next){budget=next;rockTokens=Math.min(rockTokens,next.fallBurst||0);chunks.limit=Math.min(D.chunks,next.chunks);puffs.limit=Math.min(D.puffs,next.puffs);grains.limit=Math.min(D.grains,next.grains||0);chunks.count=Math.min(chunks.count,chunks.limit);puffs.count=Math.min(puffs.count,puffs.limit);grains.count=Math.min(grains.count,grains.limit);tokens=Math.min(tokens,Math.max(1,next.chunks/3));if(!next.kick)kickSize=0;},
  reset(){chunks.count=puffs.count=grains.count=0;waiting=0;lastBurst.clear();lastPuff.clear();lastCrumble.clear();lastFall.clear();lastFallHit.clear();rockTokens=0;rockAt=null;kickSize=0;kickAt=-Infinity;for(const mesh of [chunkMesh,puffMesh]){mesh.count=0;mesh.visible=false;}grainGeometry.setDrawRange(0,0);grainPoints.visible=false;},
  crumble,rockfall,get budget(){return budget;},chunks,puffs,grains,meshes:[chunkMesh,puffMesh],points:grainPoints};

}
