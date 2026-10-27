import * as T from './vendor/three.module.js';
import {C} from '../config.js';
// The rescued planet. When the core restarts, trees, bushes, grass, flowers, pollen, butterflies and birds rise behind the green
// ripple. Each kind is a single InstancedMesh with hand-merged geometry, so the whole meadow costs about a dozen draw calls.
// layoutFlora is pure placement (no WebGL): plants stay off pits, the depot, the drill site, pumps, conveyors, excavators and crew.

export function rng(seed){let s=(seed>>>0)||1;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const shuffle=(list,r)=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
// Cells a plant may not stand on. Big plants also keep clear of the drill frame and of the crew standing on the surface.
export function blockedCells({N,cells,site,belts={},excavators=[],depot=[],players=[]}){
 const hard=new Set(),near=new Set(),add=(set,x,y)=>{if(x>=0&&y>=0&&x<N&&y<N)set.add(y*N+x);};
 cells.forEach((cell,i)=>{if(cell?.row>0||cell?.pumpBuilt)hard.add(i);});
 for(const [x,y] of depot)add(hard,x,y);for(const key of Object.keys(belts))hard.add(Number(key));
 for(const m of excavators){for(const i of m.cells||[])hard.add(i);if(Number.isFinite(m.cx))for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)add(hard,m.cx+dx,m.cy+dy);}
 if(site!=null){const sx=site%N,sy=Math.floor(site/N);for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)add(Math.max(Math.abs(dx),Math.abs(dy))<=2?hard:near,sx+dx,sy+dy);}
 for(const p of players){if(p.departed||!Number.isFinite(p.x))continue;const px=Math.floor(p.x),py=Math.floor(p.y);add(hard,px,py);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)add(near,px+dx,py+dy);}
 return {hard,near};
}
// Pure placement for every plant and animal. Inside the claim only free row 0 cells take plants; outside it, the dunes ring
// from `margin` to `beyond` cells past the boundary does. Lists are shuffled, so any prefix is an even thinning for lower quality.
export function layoutFlora({N=C.mapSize,cells,site=null,belts,excavators,depot=C.hauling.depotCells,players=[],seed=1,counts=C.flora.counts,beyond=C.flora.beyond,margin=C.flora.margin}){
 const r=rng(seed),{hard,near}=blockedCells({N,cells,site,belts,excavators,depot,players}),freeCells=[];for(let i=0;i<N*N;i++)if(!hard.has(i))freeCells.push(i);
 const outside=(x,z)=>Math.max(-x,x-N,-z,z-N),inClaim=(x,z)=>x>=0&&z>=0&&x<N&&z<N;
 const valid=(x,z,big)=>{if(inClaim(x,z)){const i=Math.floor(z)*N+Math.floor(x);return !hard.has(i)&&!(big&&near.has(i));}const o=outside(x,z);return o>=margin&&o<=beyond;};
 const claimPoint=(spread=0.4)=>{if(!freeCells.length)return null;const i=freeCells[Math.floor(r()*freeCells.length)];return [i%N+0.5+(r()*2-1)*spread,Math.floor(i/N)+0.5+(r()*2-1)*spread];};
 const ringPoint=()=>{for(let k=0;k<40;k++){const x=-beyond+r()*(N+2*beyond),z=-beyond+r()*(N+2*beyond),o=outside(x,z);if(o>=margin&&o<=beyond)return [x,z];}return null;};
 const point=(claimShare,spread)=>r()<claimShare?claimPoint(spread):ringPoint();
 const trees=[],bushes=[],grass=[],flowers=[],butterflies=[],birds=[],spaced=(list,x,z,gap)=>list.every(p=>Math.hypot(p.x-x,p.z-z)>=gap);
 for(let k=0;k<counts.trees*30&&trees.length<counts.trees;k++){const p=point(0.62,0.22);if(!p)continue;const [x,z]=p;if(!valid(x,z,true)||!spaced(trees,x,z,C.flora.treeGap))continue;const roll=r(),species=roll<0.45?0:roll<0.78?1:2;trees.push({x,z,species,size:C.flora.treeSize[0]+r()*(C.flora.treeSize[1]-C.flora.treeSize[0])*(inClaim(x,z)?0.85:1),rot:r()*Math.PI*2,delay:r()*0.9,blossom:species===0&&r()<C.flora.blossomShare,tint:r()});}
 for(let k=0;k<counts.bushes*30&&bushes.length<counts.bushes;k++){const p=point(0.6,0.38);if(!p)continue;const [x,z]=p;if(!valid(x,z,false)||!spaced(trees,x,z,0.5)||!spaced(bushes,x,z,0.42))continue;bushes.push({x,z,size:0.7+r()*0.7,rot:r()*Math.PI*2,delay:0.2+r()*0.7,tint:r()});}
 for(let k=0;k<counts.grass*4&&grass.length<counts.grass;k++){const p=point(0.58,0.45);if(!p)continue;const [x,z]=p;if(!valid(x,z,false))continue;grass.push({x,z,size:0.75+r()*0.7,rot:r()*Math.PI*2,delay:r()*0.5,tint:r()});}
 const colours=C.flora.flowerColors;let clusters=0;
 for(let k=0;k<counts.flowers*4&&flowers.length<counts.flowers;k++){const p=point(0.6,0.3);if(!p)continue;const [cx,cz]=p;if(!valid(cx,cz,false))continue;clusters++;const colour=colours[Math.floor(r()*colours.length)],n=6+Math.floor(r()*12);
  for(let j=0;j<n&&flowers.length<counts.flowers;j++){const a=r()*Math.PI*2,d=Math.sqrt(r())*0.42,x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;if(!valid(x,z,false))continue;flowers.push({x,z,size:0.75+r()*0.6,rot:r()*Math.PI*2,delay:0.5+r()*0.8,color:r()<0.82?colour:colours[Math.floor(r()*colours.length)]});}
  if(butterflies.length<counts.butterflies&&r()<0.5)butterflies.push({x:cx,z:cz,phase:r(),color:C.flora.butterflyColors[Math.floor(r()*C.flora.butterflyColors.length)]});}
 for(let i=0;i<counts.birds;i++)birds.push({radius:4+r()*9,height:6+r()*4,speed:(0.22+r()*0.2)*(r()<0.5?1:-1),phase:r()*Math.PI*2,offset:[(r()-0.5)*6,(r()-0.5)*6]});
 return {trees:shuffle(trees,r),bushes:shuffle(bushes,r),grass:shuffle(grass,r),flowers:shuffle(flowers,r),butterflies,birds,clusters};
}
// Growth with a small overshoot: 0 before the plant starts, then a quick rise past full size and a settle.
export function growth(t){if(t<=0)return 0;if(t>=1)return 1;const c1=1.2,c3=c1+1,u=t-1;return 1+c3*u*u*u+c1*u*u;}

// Geometry helpers: every part is non-indexed with position, normal and colour, so merging is plain concatenation.
const UP=new T.Vector3(0,1,0);
function plain(geo){const g=geo.index?geo.toNonIndexed():geo;for(const key of Object.keys(g.attributes))if(!['position','normal','color'].includes(key))g.deleteAttribute(key);return g;}
function paint(geo,fn){const p=geo.attributes.position,out=new Float32Array(p.count*3),c=new T.Color();for(let i=0;i<p.count;i++){fn(p.getX(i),p.getY(i),p.getZ(i),c);out[i*3]=c.r;out[i*3+1]=c.g;out[i*3+2]=c.b;}geo.setAttribute('color',new T.BufferAttribute(out,3));return geo;}
function merge(parts){let n=0;for(const g of parts)n+=g.attributes.position.count;const out={position:new Float32Array(n*3),normal:new Float32Array(n*3)};if(parts.every(g=>g.attributes.color))out.color=new Float32Array(n*3);let o=0;for(const g of parts){for(const key of Object.keys(out))out[key].set(g.attributes[key].array,o*3);o+=g.attributes.position.count;}const geo=new T.BufferGeometry();for(const key of Object.keys(out))geo.setAttribute(key,new T.BufferAttribute(out[key],3));geo.computeBoundingSphere();return geo;}
// Smooth normals across duplicated vertices of a non-indexed mesh (a small stand-in for mergeVertices plus computeVertexNormals).
function smooth(geo){const p=geo.attributes.position,n=geo.attributes.normal,sum=new Map(),key=i=>Math.round(p.getX(i)*1e4)+'|'+Math.round(p.getY(i)*1e4)+'|'+Math.round(p.getZ(i)*1e4),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),f=new T.Vector3();
 for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);f.subVectors(c,b).cross(a.sub(b));for(let k=0;k<3;k++){const id=key(i+k);if(!sum.has(id))sum.set(id,new T.Vector3());sum.get(id).add(f);}}
 for(let i=0;i<p.count;i++){const v=sum.get(key(i));v.lengthSq()?a.copy(v).normalize():a.set(0,1,0);n.setXYZ(i,a.x,a.y,a.z);}return geo;}
// A lumpy leaf mass: an icosphere pushed in and out by smooth noise, with averaged normals for a soft high-detail silhouette.
function blob(radius,detail,lump,seed,squash=1){const g=plain(new T.IcosahedronGeometry(1,detail)),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+lump*(Math.sin(x*3.1+seed)*Math.sin(y*2.7+seed*1.3)*Math.sin(z*3.3+seed*0.7)+0.45*Math.sin(x*6.1+y*5.3+seed*2.1)*Math.sin(z*5.9+seed));p.setXYZ(i,x*k*radius,y*k*radius*squash,z*k*radius);}return smooth(g);}
const place=(geo,x,y,z,rotY=0)=>geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(UP,rotY),new T.Vector3(1,1,1)));
// Canopies are painted in grey (dark underneath, light on top); the per-tree instance colour supplies the hue.
const shade=(lo,hi,bottom,top)=>(x,y,z,c)=>{const t=Math.min(1,Math.max(0,(y-bottom)/(top-bottom)));c.setScalar(lo+(hi-lo)*Math.pow(t,0.8));};
// Trees are authored one unit tall; TRUNK gives each species' trunk height and girth as a share of that unit.
export const TRUNK=[{height:0.48,girth:0.055},{height:0.26,girth:0.05},{height:0.66,girth:0.045}];
function roundCanopy(){const parts=[[0,0.66,0,0.3],[0.21,0.58,0.07,0.22],[-0.19,0.6,-0.1,0.23],[0.03,0.84,-0.03,0.22],[-0.06,0.55,0.21,0.2],[0.08,0.62,-0.22,0.19]].map(([x,y,z,rad],i)=>place(blob(rad,2,0.16,i*1.7+0.4),x,y,z));return paint(merge(parts),shade(0.42,1.15,0.35,1.05));}
function coneCanopy(){const parts=[[0.2,0.34,0.44],[0.38,0.27,0.38],[0.55,0.2,0.33],[0.71,0.13,0.29]].map(([y,rad,h],i)=>{const g=plain(new T.ConeGeometry(rad,h,16,1,false));g.translate(0,y+h/2,0);g.rotateY(i*0.7);return g;});return paint(merge(parts),shade(0.38,1.05,0.2,1.0));}
function umbrellaCanopy(){const parts=[[0,0.74,0,0.44,0.34],[0.14,0.82,0.06,0.3,0.42],[-0.16,0.79,-0.08,0.27,0.42],[0.02,0.87,-0.12,0.22,0.5]].map(([x,y,z,rad,sq],i)=>place(blob(rad,2,0.12,i*2.3+1.1,sq),x,y,z));return paint(merge(parts),shade(0.4,1.12,0.64,0.95));}
function trunkGeometry(){const g=plain(new T.CylinderGeometry(0.62,1,1,9,3,true));g.translate(0,0.5,0);const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),bend=Math.sin(y*2.6)*0.25;p.setX(i,p.getX(i)+bend);}return paint(smooth(g),(x,y,z,c)=>c.copy(new T.Color('#3a2919')).lerp(new T.Color('#6e4d33'),Math.min(1,y*1.4)));}
function bushGeometry(){const parts=[[0,0.16,0,0.2],[0.15,0.12,0.05,0.15],[-0.13,0.13,-0.06,0.16],[0.02,0.25,-0.04,0.14]].map(([x,y,z,rad],i)=>place(blob(rad,1,0.2,i*3.1+0.2,0.85),x,y,z));return paint(merge(parts),shade(0.4,1.1,0,0.38));}
// Grass tuft: thin blades with upward normals so they light like the meadow floor, dark at the root and bright at the tip.
function tuftGeometry(){const pos=[],r=rng(11);for(let b=0;b<7;b++){const a=b/7*Math.PI*2+r()*0.6,lean=0.18+r()*0.2,h=0.14+r()*0.13,w=0.016+r()*0.01,ox=Math.cos(a)*0.035,oz=Math.sin(a)*0.035,tx=ox+Math.cos(a)*lean*h,tz=oz+Math.sin(a)*lean*h,px=-Math.sin(a)*w,pz=Math.cos(a)*w;pos.push(ox-px,0,oz-pz,ox+px,0,oz+pz,tx,h,tz);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(pos.map((_,i)=>i%3===1?1:0),3));return paint(g,(x,y,z,c)=>c.copy(new T.Color('#2c5420')).lerp(new T.Color('#b4dc66'),Math.min(1,y/0.22)));}
// Flowers: a green stem with a leaf, and a separate five-petal blossom whose instance colour gives the petal hue.
function stemGeometry(){const w=0.006,pos=[-w,0,0,w,0,0,w,1,0,-w,0,0,w,1,0,-w,1,0,0,0.35,0,0.05,0.55,0.015,0.008,0.45,0];const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(pos.map((_,i)=>i%3===1?1:0),3));return paint(g,(x,y,z,c)=>c.copy(new T.Color('#2f5e22')).lerp(new T.Color('#6fa046'),y));}
function blossomGeometry(){const pos=[],petal=0.055,notch=0.02;for(let i=0;i<10;i++){const a0=i/10*Math.PI*2,a1=(i+1)/10*Math.PI*2,r0=i%2?notch:petal,r1=i%2?petal:notch;pos.push(0,0.004,0,Math.cos(a0)*r0,r0===petal?0.012:0.002,Math.sin(a0)*r0,Math.cos(a1)*r1,r1===petal?0.012:0.002,Math.sin(a1)*r1);}
 for(let i=0;i<6;i++){const a0=i/6*Math.PI*2,a1=(i+1)/6*Math.PI*2;pos.push(0,0.012,0,Math.cos(a0)*0.016,0.008,Math.sin(a0)*0.016,Math.cos(a1)*0.016,0.008,Math.sin(a1)*0.016);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(pos.map((_,i)=>i%3===1?1:0),3));return paint(g,(x,y,z,c)=>Math.hypot(x,z)<0.017&&y>0.007?c.setRGB(1,0.82,0.3):c.setScalar(1));}
function wingGeometry(points,root,tip){const pos=[];for(let i=1;i<points.length-1;i++)pos.push(0,0,0,...points[i],...points[i+1]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(pos.map((_,i)=>i%3===1?1:0),3));return paint(g,(x,y,z,c)=>c.setScalar(Math.hypot(x,z)<0.012?root:tip));}
const MOTE_VERT='attribute vec4 seed;uniform float time;uniform vec2 origin;uniform float radius;uniform float scale;uniform float size;uniform vec4 bounds;varying float vAlpha;'+
 'void main(){float t=time*0.22+seed.z*20.0;vec3 p=vec3(mix(bounds.x,bounds.z,seed.x),0.0,mix(bounds.y,bounds.w,seed.y));p.x+=sin(t*0.9+seed.w*6.0)*0.7;p.z+=cos(t*0.7+seed.z*5.0)*0.7;p.y=0.2+seed.w*1.9+sin(t*1.3+seed.x*9.0)*0.3;'+
 'float reach=1.0-smoothstep(radius-2.0,radius,distance(p.xz,origin));vAlpha=reach*(0.45+0.55*abs(sin(time*1.7+seed.z*30.0)));vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=min(24.0,size*scale*(0.6+seed.w*0.8)/max(0.2,-mv.z));gl_Position=projectionMatrix*mv;}';
const MOTE_FRAG='varying float vAlpha;void main(){float a=1.0-smoothstep(0.0,0.5,length(gl_PointCoord-0.5));gl_FragColor=vec4(vec3(1.0,0.9,0.62)*1.7,a*a*vAlpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
// Adds a little emission in the surface's own colour (vertex and instance colour), so small bright things keep their hue in shade.
function selfLit(material,amount){const before=material.onBeforeCompile;material.onBeforeCompile=shader=>{before?.call(material,shader);shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=diffuseColor.rgb*'+amount.toFixed(3)+';');};const key=material.customProgramCacheKey;material.customProgramCacheKey=()=>key.call(material)+'lit'+amount;return material;}
// Gentle wind: vertices sway in proportion to their height, phase-shifted by each instance's position. Off when motion is reduced.
function sway(material,amount,time){const before=material.onBeforeCompile;material.onBeforeCompile=shader=>{before?.call(material,shader);shader.uniforms.swayTime=time;shader.vertexShader='uniform float swayTime;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\n vec2 swayAt=vec2(instanceMatrix[3].x,instanceMatrix[3].z);\n#else\n vec2 swayAt=vec2(0.0);\n#endif\n float swayK=max(0.0,transformed.y)*'+amount.toFixed(4)+';transformed.x+=sin(swayTime*1.3+swayAt.x*0.8+swayAt.y*0.6)*swayK;transformed.z+=cos(swayTime*1.1+swayAt.x*0.5+swayAt.y*0.9)*swayK*0.7;');};const key=material.customProgramCacheKey;material.customProgramCacheKey=()=>key.call(material)+'sway'+amount;return material;}

export function createFlora(scene,{groundY=()=>0}={}){
 const F=C.flora,K=F.counts,root=new T.Group();root.name='Rescued planet flora';root.visible=false;scene.add(root);
 const time={value:0},mat=(extra={})=>new T.MeshStandardMaterial({vertexColors:true,roughness:0.82,metalness:0,...extra});
 const mesh=(name,geo,material,count,shadows=false)=>{const m=new T.InstancedMesh(geo,material,count);m.name=name;m.count=0;m.frustumCulled=false;m.castShadow=shadows;m.receiveShadow=shadows;for(let i=0;i<count;i++)m.setColorAt(i,WHITE);root.add(m);return m;};
 const WHITE=new T.Color(1,1,1);
 const trunks=mesh('Tree trunks',trunkGeometry(),mat({roughness:0.95}),K.trees,true);
 const canopies=[mesh('Round tree canopies',roundCanopy(),sway(mat(),0.035,time),K.trees,true),mesh('Conifer canopies',coneCanopy(),sway(mat(),0.025,time),K.trees,true),mesh('Umbrella tree canopies',umbrellaCanopy(),sway(mat(),0.03,time),K.trees,true)];
 const bushes=mesh('Bushes',bushGeometry(),sway(mat(),0.05,time),K.bushes,true);
 const grass=mesh('Grass tufts',tuftGeometry(),sway(selfLit(mat({side:T.DoubleSide,roughness:0.9}),F.grassGlow),0.22,time),K.grass);
 const stems=mesh('Flower stems',stemGeometry(),sway(mat({side:T.DoubleSide}),0.12,time),K.flowers),blossoms=mesh('Flower blossoms',blossomGeometry(),selfLit(mat({side:T.DoubleSide,roughness:0.6}),F.petalGlow),K.flowers);
 const butterflies=mesh('Butterflies',wingGeometry([[0,0,0],[0.045,0,-0.05],[0.085,0,-0.04],[0.092,0,-0.005],[0.062,0,0.035],[0.03,0,0.052],[0.006,0,0.03]],0.22,1),new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}),K.butterflies*2);
 const birds=mesh('Birds',wingGeometry([[0,0,0],[0.05,0,-0.035],[0.17,0,0.015],[0.08,0,0.04],[0.02,0,0.03]],0.6,1),new T.MeshBasicMaterial({vertexColors:true,color:'#2a3036',side:T.DoubleSide}),K.birds*2);
 const moteGeo=new T.BufferGeometry(),moteSeeds=new Float32Array(K.motes*4),mr=rng(5);for(let i=0;i<moteSeeds.length;i++)moteSeeds[i]=mr();moteGeo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(K.motes*3),3));moteGeo.setAttribute('seed',new T.Float32BufferAttribute(moteSeeds,4));
 const moteMat=new T.ShaderMaterial({uniforms:{time:{value:0},origin:{value:new T.Vector2()},radius:{value:-1},scale:{value:400},size:{value:F.moteSize},bounds:{value:new T.Vector4(-3,-3,C.mapSize+3,C.mapSize+3)}},vertexShader:MOTE_VERT,fragmentShader:MOTE_FRAG,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
 const motes=new T.Points(moteGeo,moteMat);motes.name='Pollen motes';motes.frustumCulled=false;root.add(motes);
 const m4=new T.Matrix4(),q=new T.Quaternion(),q2=new T.Quaternion(),pos=new T.Vector3(),scl=new T.Vector3(),colour=new T.Color(),Z=new T.Vector3(0,0,1);
 let layout=null,settled=false,density=1,key='';const shown={trees:0,bushes:0,grass:0,flowers:0,butterflies:0,birds:0};
 const hue=(list,t,out)=>out.copy(new T.Color(list[Math.floor(t*list.length)%list.length]));
 function build(state,origin){const N=C.mapSize;layout=layoutFlora({N,cells:state.cells,site:state.team.site,belts:state.belts,excavators:state.team.excavators,players:state.players,seed:(state.round||0)*7919+(state.team.site??0)*31+1});
  for(const list of [layout.trees,layout.bushes,layout.grass,layout.flowers])for(const p of list){p.y=groundY(p.x,p.z);p.arrive=Math.hypot(p.x-origin.x,p.z-origin.y);}
  for(const b of layout.butterflies){b.y=groundY(b.x,b.z);b.arrive=Math.hypot(b.x-origin.x,b.z-origin.y);}
  let n=[0,0,0];layout.trees.forEach(t=>{t.slot=n[t.species]++;hue(t.blossom?F.blossomColors:t.species===1?F.coniferColors:F.leafColors,t.tint,colour).multiplyScalar(0.85+0.3*((t.tint*7.3)%1));canopies[t.species].setColorAt(t.slot,colour);});
  layout.trees.forEach((t,i)=>trunks.setColorAt(i,WHITE));layout.bushes.forEach((b,i)=>bushes.setColorAt(i,hue(F.bushColors,b.tint,colour)));layout.grass.forEach((g,i)=>grass.setColorAt(i,colour.setScalar(0.8+0.4*g.tint)));
  layout.flowers.forEach((f,i)=>{blossoms.setColorAt(i,colour.set(f.color));stems.setColorAt(i,WHITE);});layout.butterflies.forEach((b,i)=>{colour.set(b.color);butterflies.setColorAt(i*2,colour);butterflies.setColorAt(i*2+1,colour);});
  for(const m of [trunks,...canopies,bushes,grass,stems,blossoms,butterflies,birds])if(m.instanceColor)m.instanceColor.needsUpdate=true;settled=false;key='';}
 function counts(){const L=layout;return {trees:Math.round(L.trees.length*density),bushes:Math.round(L.bushes.length*density),grass:Math.round(L.grass.length*density),flowers:Math.round(L.flowers.length*density),butterflies:Math.round(L.butterflies.length*Math.max(0.5,density)),birds:Math.round(L.birds.length*Math.max(0.5,density))};}
 function set(m,i,x,y,z,rot,sx,sy=sx,sz=sx){pos.set(x,y,z);q.setFromAxisAngle(UP,rot);scl.set(sx,sy,sz);m.setMatrixAt(i,m4.compose(pos,q,scl));}
 function grow(elapsed,speed,reduced){const c=counts(),L=layout,phase=(p,dur)=>reduced?1:(elapsed-p.arrive/speed-p.delay)/dur;let done=true;const g=(p,dur)=>{const t=phase(p,dur);if(t<1)done=false;return growth(t);};
  const slots=[0,0,0];for(let i=0;i<c.trees;i++){const t=L.trees[i],s=t.size*g(t,F.treeSeconds),k=TRUNK[t.species],y=t.y-0.03*t.size;set(trunks,i,t.x,y,t.z,t.rot,s*k.girth,s*k.height);set(canopies[t.species],slots[t.species]++,t.x,y,t.z,t.rot,s);}
  trunks.count=c.trees;canopies.forEach((m,k)=>m.count=slots[k]);
  for(let i=0;i<c.bushes;i++){const b=L.bushes[i],s=b.size*g(b,F.bushSeconds);set(bushes,i,b.x,b.y-0.02,b.z,b.rot,s);}bushes.count=c.bushes;
  for(let i=0;i<c.grass;i++){const p=L.grass[i],s=p.size*g(p,F.grassSeconds);set(grass,i,p.x,p.y,p.z,p.rot,s,s*1.1,s);}grass.count=c.grass;
  for(let i=0;i<c.flowers;i++){const f=L.flowers[i],s=f.size*g(f,F.flowerSeconds),h=F.stemHeight*f.size;set(stems,i,f.x,f.y,f.z,f.rot,s,s*h,s);set(blossoms,i,f.x,f.y+h*s,f.z,f.rot,s*F.blossomSize);}stems.count=blossoms.count=c.flowers;
  for(const m of [trunks,...canopies,bushes,grass,stems,blossoms])m.instanceMatrix.needsUpdate=true;return done;}
 function animals(now,elapsed,speed,reduced){const c=counts(),t=now/1000,L=layout;butterflies.count=reduced?0:c.butterflies*2;birds.count=reduced?0:c.birds*2;if(reduced)return;
  const wing=(m,i,x,y,z,yaw,flap,size)=>{for(let side=0;side<2;side++){pos.set(x,y,z);q.setFromAxisAngle(UP,yaw);q2.setFromAxisAngle(Z,side?-flap:flap);q.multiply(q2);scl.set(side?-size:size,size,size);m.setMatrixAt(i*2+side,m4.compose(pos,q,scl));}};
  const path=(b,u,out)=>out.set(b.x+Math.sin(u*0.55+b.phase*6)*0.9+Math.sin(u*1.3+b.phase)*0.15,b.y+0.32+Math.sin(u*1.9+b.phase*5)*0.13,b.z+Math.sin(u*0.42+b.phase*3)*0.8);const a=new T.Vector3(),b2=new T.Vector3();
  for(let i=0;i<c.butterflies;i++){const b=L.butterflies[i],u=t+b.phase*10,appear=Math.min(1,Math.max(0,(elapsed-b.arrive/speed-1.5)/1.2));path(b,u,a);path(b,u+0.05,b2);const flap=0.25+0.95*Math.abs(Math.sin(u*15+b.phase*20));wing(butterflies,i,a.x,a.y,a.z,Math.atan2(-(b2.x-a.x),-(b2.z-a.z)),flap,F.butterflySize*appear);}
  const N=C.mapSize,appearBirds=Math.min(1,Math.max(0,(elapsed-4)/3));for(let i=0;i<c.birds;i++){const b=L.birds[i],ang=b.phase+t*b.speed,x=N/2+b.offset[0]+Math.cos(ang)*b.radius,z=N/2+b.offset[1]+Math.sin(ang)*b.radius,y=b.height+Math.sin(t*0.7+b.phase)*0.4,glide=Math.sin(t*0.5+b.phase*3)>0.35,flap=glide?0.12:0.15+0.55*Math.sin(t*7+b.phase*5);
   wing(birds,i,x,y,z,Math.atan2(Math.sin(ang)*b.speed,-Math.cos(ang)*b.speed),flap,F.birdSize*appearBirds*(0.8+0.4*((i*7)%5)/5));}
  butterflies.instanceMatrix.needsUpdate=birds.instanceMatrix.needsUpdate=true;}
 return {root,
  // ready stays false until the flora shaders are compiled for the win's lighting, so the forest never stalls a frame on first sight.
  update(state,{won,reduced,elapsed,speed,origin,radius,now,pixelHeight,ready=true}){if(!won||state.team?.site==null){if(layout)this.reset();return;}if(!layout)build(state,origin);root.visible=!!ready;time.value=reduced?0:now/1000;
   const k=density+':'+reduced;if(!settled||k!==key){key=k;settled=grow(elapsed,Math.max(0.1,speed),reduced);}animals(now,elapsed,Math.max(0.1,speed),reduced);
   moteMat.uniforms.time.value=reduced?0:now/1000;moteMat.uniforms.origin.value.copy(origin);moteMat.uniforms.radius.value=radius;moteMat.uniforms.scale.value=(pixelHeight||800)/2;moteGeo.setDrawRange(0,Math.round(K.motes*density));},
  setDensity(value){density=Math.min(1,Math.max(0.1,value||1));settled=false;},
  get layout(){return layout;},
  reset(){layout=null;settled=false;key='';root.visible=false;for(const m of [trunks,...canopies,bushes,grass,stems,blossoms,butterflies,birds])m.count=0;}};
}
