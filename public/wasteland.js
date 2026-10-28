import * as T from './vendor/three.module.js';
import {C} from '../config.js';
import {parts} from './explorer-models.js';
// The wasteland round the claim (C.wasteland): charred dead trees, broken concrete slabs and wall stubs with rusted rebar, a leaning and a
// toppled power pylon, rusted barrels (some tipped), radiation signs on posts just outside the boundary near the beacons, and dark rubble.
// Everything stands in the terrain ring, never on a claim cell and never in the ring's fading outer edge, so it can never block the hub,
// the beacons, the conveyor lines or the drill. Placement is a pure, seeded function (the same for every player); the models are merged
// per material like the factory's parts, so the whole ring costs two draws on High and Balanced (rough and painted finishes, both warmed
// at start-up) and one on Low, which builds half the props from lighter pieces in the rough finish alone and casts no shadows.
const N=C.mapSize;
// How far a point lies outside the claim, by the same measure the terrain ring's fade uses: zero or less on the claim.
export const outsideClaim=(x,z)=>Math.max(-x,x-N,-z,z-N);
export const fadeStart=()=>C.three.terrainWidth-2;
function rng(seed){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^(s>>>15),s|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
// The beacons stand on the boundary every three.beaconSpacing cells (renderer3d.js); a sign stands a little outside, beside one.
export function beaconSpots(){const out=[];for(let side=0;side<4;side++)for(let along=0;along<N;along+=C.three.beaconSpacing)out.push(side===0?[along,0]:side===1?[N,along]:side===2?[N-along,N]:[0,N-along]);return out;}
// How many of each kind a preset builds: low takes the first share of every list, so its ruins are a subset of high's.
export function wastelandCounts(level='high'){const W=C.wasteland,k=level==='low'?W.lowScale:1,out={};for(const [kind,n] of Object.entries(W.counts))out[kind]=Math.max(n?1:0,Math.round(n*k));return out;}
// The full layout: per kind a list of props with a position, a footprint (circles [x, z, r] on the ground) and their own seed.
export function wastelandLayout(seed=C.wasteland.seed){
 const W=C.wasteland,r=rng(seed),reach=fadeStart()-W.edge,placed=[],out={pylons:[],signs:[],slabs:[],barrels:[],trees:[],rubble:[]};
 const craters=C.visual.largeCraters.filter(([x,z])=>outsideClaim(x,z)>0);
 const fits=foot=>foot.every(([x,z,rad])=>{const d=outsideClaim(x,z);if(d-rad<W.gap||d+rad>reach)return false;if(craters.some(([cx,cz,cr])=>Math.hypot(x-cx,z-cz)<cr*1.2+rad))return false;return placed.every(([px,pz,pr])=>Math.hypot(x-px,z-pz)>=rad+pr+0.06);});
 const take=(list,item)=>{list.push(item);placed.push(...item.foot);return item;};
 // A random spot in the ring between gap and reach of the claim, optionally near a centre.
 const spot=(rad,near=null,spread=1.6)=>{for(let tries=0;tries<400;tries++){let x,z;if(near){const a=r()*Math.PI*2,d=0.4+r()*spread;x=near[0]+Math.cos(a)*d;z=near[1]+Math.sin(a)*d;}else{const side=Math.floor(r()*4),along=-reach+r()*(N+2*reach),dist=W.gap+rad+r()*(reach-W.gap-2*rad);[x,z]=side===0?[along,-dist]:side===1?[N+dist,along]:side===2?[along,N+dist]:[-dist,along];}if(fits([[x,z,rad]]))return [x,z];}return null;};
 // Pylons first, along two sides (they are long): one leaning out from the claim, one toppled along the boundary.
 for(let i=0;i<W.counts.pylons;i++){const side=[0,3,1,2][i%4],toppled=i%2===1,height=W.pylonHeight[0]+r()*(W.pylonHeight[1]-W.pylonHeight[0]);
  for(let tries=0;tries<200;tries++){const along=2+r()*(N-4),dist=toppled?3.2+r()*0.9:2.3+r()*0.6,[nx,nz]=side===0?[0,-1]:side===1?[1,0]:side===2?[0,1]:[-1,0],tx=-nz,tz=nx,[bx,bz]=side===0?[along,-dist]:side===1?[N+dist,along]:side===2?[N-along,N+dist]:[-dist,N-along];
   const lean=toppled?Math.PI/2:W.pylonLean[0]+r()*(W.pylonLean[1]-W.pylonLean[0]),dir=toppled?(r()<0.5?1:-1):1,foot=[];
   if(toppled){for(let s=0;s<=height;s+=0.5)foot.push([bx+tx*s*dir,bz+tz*s*dir,0.5]);}
   else{const top=height*Math.sin(lean);for(let s=0;s<=1.0001;s+=0.25)foot.push([bx+nx*top*s,bz+nz*top*s,0.5]);const ax=bx+nx*top*0.97,az=bz+nz*top*0.97;foot.push([ax+tx*W.pylonArm,az+tz*W.pylonArm,0.2],[ax-tx*W.pylonArm,az-tz*W.pylonArm,0.2]);}
   if(fits(foot)){take(out.pylons,{x:bx,z:bz,side,toppled,height,lean,nx,nz,tx:tx*dir,tz:tz*dir,seed:Math.floor(r()*1e9),foot});break;}}}
 // Radiation signs: just outside the boundary beside a beacon, facing the claim; one per side in turn, starting with the north.
 for(let i=0;i<W.counts.signs;i++){const side=[0,3,1,2][i%4],along=C.three.beaconSpacing*(1+(i+Math.floor(i/4))%2),step=W.signBeside,away=W.signOut,[bx,bz]=side===0?[along,0]:side===1?[N,along]:side===2?[N-along,N]:[0,N-along];
  const [x,z]=side===0?[bx+step,-away]:side===1?[N+away,bz+step]:side===2?[bx-step,N+away]:[-away,bz-step];take(out.signs,{x,z,side,face:[0,-Math.PI/2,Math.PI,Math.PI/2][side],tilt:(r()-0.5)*0.16,seed:Math.floor(r()*1e9),foot:[[x,z,0.16]]});}
 // Ruins: a few clusters of slabs and wall stubs, then barrels in small groups, groves and lone dead trees, and rubble everywhere.
 const ruins=[];for(let k=0;k<W.ruinClusters;k++){const c=spot(1.2);if(c)ruins.push(c);}
 for(let i=0;i<W.counts.slabs;i++){const wall=i%3===0,rad=wall?0.62:0.72,at=spot(rad,ruins.length&&i<W.counts.slabs*0.7?ruins[i%ruins.length]:null);if(!at)continue;take(out.slabs,{x:at[0],z:at[1],wall,rot:r()*Math.PI,size:0.75+r()*0.5,seed:Math.floor(r()*1e9),foot:[[at[0],at[1],rad]]});}
 const groups=[];for(let i=0;i<W.counts.barrels;i++){if(i%3===0){const c=spot(0.5);if(c)groups.push(c);}const at=spot(0.24,groups.length?groups[groups.length-1]:null,0.5);if(!at)continue;take(out.barrels,{x:at[0],z:at[1],tipped:r()<0.35,rot:r()*Math.PI*2,tone:Math.floor(r()*3),seed:Math.floor(r()*1e9),foot:[[at[0],at[1],0.24]]});}
 const groves=[];for(let k=0;k<W.groves;k++){const c=spot(0.4);if(c)groves.push(c);}
 for(let i=0;i<W.counts.trees;i++){const at=spot(0.32,groves.length&&i%3!==2?groves[i%groves.length]:null,1.4);if(!at)continue;take(out.trees,{x:at[0],z:at[1],height:W.treeHeight[0]+r()*(W.treeHeight[1]-W.treeHeight[0]),rot:r()*Math.PI*2,lean:(r()-0.5)*0.24,seed:Math.floor(r()*1e9),foot:[[at[0],at[1],0.32]]});}
 for(let i=0;i<W.counts.rubble;i++){const size=W.rubbleSize[0]+r()*r()*(W.rubbleSize[1]-W.rubbleSize[0]),at=spot(size,ruins.length&&i%2===0?ruins[i%ruins.length]:null,1.8);if(!at)continue;take(out.rubble,{x:at[0],z:at[1],size,rot:r()*Math.PI*2,tone:Math.floor(r()*W.rubbleTones.length),seed:Math.floor(r()*1e9),foot:[[at[0],at[1],size]]});}
 return out;}
// The radiation trefoil as flat geometry facing +z (a hub and three blades, one pointing down), so the signs need no texture.
function trefoil(r0=0.05,r1=0.17,hub=0.035){const pos=[],at=(r,deg)=>[Math.cos(deg*Math.PI/180)*r,Math.sin(deg*Math.PI/180)*r,0];
 for(let k=0;k<6;k++)pos.push(0,0,0,...at(hub,k*60),...at(hub,k*60+60));
 for(const c of [270,30,150])for(let k=0;k<3;k++){const a0=c-30+k*20,a1=a0+20;pos.push(...at(r0,a0),...at(r1,a0),...at(r1,a1),...at(r0,a0),...at(r1,a1),...at(r0,a1));}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;}
// Builds the ruins of one preset into the scene: merged meshes per finish (the factory's rough and painted ones, compiled by the start-up
// warm-up). groundY gives the ring's height. Low builds the first half of every list from lighter pieces (three- and four-sided limbs and
// struts, no rebar, rims, braces or twigs) in the rough finish alone, and casts no shadows.
export function createWasteland(scene,factory,{level='high',groundY=()=>0,shadows=true}={}){
 const W=C.wasteland,lite=level==='low',full=wastelandLayout(),counts=wastelandCounts(level),L={};for(const kind of Object.keys(full))L[kind]=full[kind].slice(0,counts[kind]);
 const P=parts(),root=new T.Group();root.name='Wasteland ruins';
 const rough=c=>factory.finish('rubber',c),painted=lite?rough:c=>factory.finish('paint',c);
 const up=new T.Vector3(0,1,0),q=new T.Quaternion(),e=new T.Euler(),m=new T.Matrix4(),w=new T.Matrix4(),a=new T.Vector3(),b=new T.Vector3(),d=new T.Vector3(),s=new T.Vector3();
 const box=new T.BoxGeometry(1,1,1),strutBox=(lite?new T.CylinderGeometry(0.7,0.7,1,3,1,true):new T.BoxGeometry(1,1,1)).translate(0,0.5,0),trunk=(lite?new T.CylinderGeometry(0.55,1,1,4,1,true):new T.CylinderGeometry(0.55,1,1,6,1)).translate(0,0.5,0),limb=new T.CylinderGeometry(0.4,1,1,lite?3:5,1,true).translate(0,0.5,0),drum=new T.CylinderGeometry(1,1,1,lite?6:12,1),rock=lite?new T.TetrahedronGeometry(1,0):new T.IcosahedronGeometry(1,0),sign=trefoil();
 // A piece g from point A to point B, t thick, under the matrix base (or the world).
 const strut=(h,g,A,B,t,base=null)=>{d.subVectors(B,A);const len=d.length();if(len<1e-4)return;q.setFromUnitVectors(up,d.divideScalar(len));m.compose(A,q,s.set(t,len,t));if(base)m.premultiply(base);P.addMatrix(h,g,m);};
 const place=(h,g,x,y,z,rx,ry,rz,sx,sy,sz,base=null)=>{m.compose(a.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz,'YXZ')),s.set(sx,sy,sz));if(base)m.premultiply(base);P.addMatrix(h,g,m);};
 for(const t of L.trees){const r=rng(t.seed),y=groundY(t.x,t.z)-0.08,char=rough(W.treeColors[t.seed%W.treeColors.length]),girth=0.045+0.017*t.height;
  a.set(t.x,y,t.z);b.set(Math.sin(t.lean)*Math.cos(t.rot),Math.cos(t.lean),Math.sin(t.lean)*Math.sin(t.rot)).multiplyScalar(t.height+0.08).add(a);const top=b.clone(),base=a.clone();strut(char,trunk,base,top,girth);
  const extra=Math.floor(r()*3),branches=lite?3:3+extra;for(let k=0;k<branches;k++){const along=0.42+0.48*(k+r()*0.6)/branches,from=base.clone().lerp(top,along),az=t.rot+k*2.4+r()*0.8,rise=0.45+r()*0.6,len=(0.2+0.22*r())*t.height*(1.15-along*0.5),dir=new T.Vector3(Math.cos(az)*Math.cos(rise),Math.sin(rise),Math.sin(az)*Math.cos(rise)),to=from.clone().addScaledVector(dir,len);strut(char,limb,from,to,girth*0.42*(1.2-along*0.6));
   if(!lite&&r()<0.6){const at=from.clone().lerp(to,0.55+r()*0.25),az2=az+(r()<0.5?-1:1)*(0.6+r()*0.5),rise2=rise+0.3,len2=len*(0.35+r()*0.25);strut(char,limb,at,at.clone().add(new T.Vector3(Math.cos(az2)*Math.cos(rise2),Math.sin(rise2),Math.sin(az2)*Math.cos(rise2)).multiplyScalar(len2)),girth*0.22);}}}
 for(const p of L.slabs){const r=rng(p.seed),y=groundY(p.x,p.z),stone=rough(W.concrete[p.seed%W.concrete.length]),rust=rough(W.rebar),k=p.size;
  if(p.wall){const width=0.75*k+0.35,height=0.45+r()*0.5;place(stone,box,p.x,y+height/2-0.1,p.z,0,p.rot,(r()-0.5)*0.1,width,height,0.17);
   place(stone,box,p.x+Math.cos(p.rot)*width*0.27,y+height-0.1+height*0.18,p.z-Math.sin(p.rot)*width*0.27,0,p.rot,0,width*0.42,height*0.36,0.17);
   if(!lite)for(let j=0;j<4;j++){const off=(j/3-0.5)*width*0.8,bx=p.x+Math.cos(p.rot)*off,bz=p.z-Math.sin(p.rot)*off,bh=y+height-0.1+(j===0?height*0.36:0);strut(rust,strutBox,a.set(bx,bh-0.05,bz),b.set(bx+(r()-0.5)*0.12,bh+0.18+r()*0.28,bz+(r()-0.5)*0.12),0.016);}}
  else{const width=0.95*k+0.3,depth=0.55*k+0.25,thick=0.14+r()*0.06,tilt=(r()-0.3)*0.5;place(stone,box,p.x,y+0.02,p.z,tilt,p.rot,(r()-0.5)*0.35,width,thick,depth);
   if(!lite)for(let j=0;j<3;j++){const off=(j/2-0.5)*width*0.7,bx=p.x+Math.cos(p.rot)*off,bz=p.z-Math.sin(p.rot)*off;strut(rust,strutBox,a.set(bx,y+0.04,bz),b.set(bx+Math.sin(p.rot)*(0.2+r()*0.25),y+0.12+r()*0.3,bz+Math.cos(p.rot)*(0.2+r()*0.25)),0.014);}}}
 for(const p of L.barrels){const y=groundY(p.x,p.z),paint=painted(W.barrels[p.tone%W.barrels.length]),rim=painted(W.barrelRim);
  w.compose(a.set(p.x,p.tipped?y+0.15:y+0.23,p.z),q.setFromEuler(e.set(p.tipped?Math.PI/2:0,p.rot,p.tipped?0.2:0,'YXZ')),s.set(1,1,1));
  place(paint,drum,0,0,0,0,0,0,0.17,0.5,0.17,w);if(!lite)for(const yy of [-0.13,0.13])place(rim,drum,0,yy,0,0,0,0,0.178,0.028,0.178,w);}
 for(const p of L.signs){const y=groundY(p.x,p.z),post=painted(W.signPost);w.compose(a.set(p.x,y,p.z),q.setFromEuler(e.set(0,p.face,p.tilt)),s.set(1,1,1));
  place(post,strutBox,0,-0.2,-0.035,0,0,0,0.045,1.15,0.045,w);place(rough(W.signPlate),box,0,0.86,-0.012,0,0,0,0.44,0.44,0.02,w);place(rough(W.signMark),sign,0,0.86,0.008,0,0,0,1,1,1,w);}
 for(const p of L.pylons){const r=rng(p.seed),y=groundY(p.x,p.z),steel=painted(W.pylon),H=p.height,b0=0.42,b1=0.1,levels=5,leg=(i,yy,out)=>{const k=b0+(b1-b0)*yy/H;return out.set(i&1?k:-k,yy,i&2?k:-k);};
  // The tower's own frame: up its axis, arms along x, faces along z. Leaning: tipped outward about the boundary's direction. Toppled: lying along it.
  if(p.toppled){const yAxis=new T.Vector3(p.tx,0,p.tz),xAxis=new T.Vector3(0,1,0),zAxis=new T.Vector3().crossVectors(xAxis,yAxis);w.makeBasis(xAxis,yAxis,zAxis).setPosition(p.x,y+b0*0.55,p.z);}
  else{const yAxis=new T.Vector3(p.nx*Math.sin(p.lean),Math.cos(p.lean),p.nz*Math.sin(p.lean)),xAxis=new T.Vector3(p.tx,0,p.tz),zAxis=new T.Vector3().crossVectors(xAxis,yAxis);w.makeBasis(xAxis,yAxis,zAxis).setPosition(p.x,y-0.15,p.z);}
  const A=new T.Vector3(),B=new T.Vector3(),faces=[[0,1],[1,3],[3,2],[2,0]];
  for(let i=0;i<4;i++)strut(steel,strutBox,leg(i,0,A),leg(i,H*0.985,B),0.04,w);
  for(let l=0;l<levels;l++){const y0=H*l/levels,y1=H*(l+1)/levels;for(const [i,j] of faces){if(!lite){strut(steel,strutBox,leg(i,y0,A),leg(j,y1,B),0.018,w);strut(steel,strutBox,leg(j,y0,A),leg(i,y1,B),0.018,w);}strut(steel,strutBox,leg(i,y1,A),leg(j,y1,B),0.022,w);}}
  for(const [yy,half] of [[H*0.86,W.pylonArm],[H*0.7,W.pylonArm*0.72]]){strut(steel,strutBox,A.set(-half,yy,0),B.set(half,yy,0),0.05,w);if(!lite)for(const sx of [-1,1])strut(steel,strutBox,A.set(sx*half*0.92,yy,0),B.set(sx*half*0.92,yy-0.22-r()*0.08,0),0.03,w);}}
 for(const p of L.rubble){const r=rng(p.seed),y=groundY(p.x,p.z),k=p.size;place(rough(W.rubbleTones[p.tone]),rock,p.x,y+k*0.12,p.z,r()*3,p.rot,r()*3,k,k*(0.45+r()*0.3),k*(0.7+r()*0.3));}
 const meshes=P.build(root,{shadows,receive:true,ground:-0.8,grime:0.12,uvScale:2.2,name:'Wasteland ruins'});
 for(const g of [box,strutBox,trunk,limb,drum,rock,sign])g.dispose();
 scene.add(root);return {root,meshes,layout:L};}
