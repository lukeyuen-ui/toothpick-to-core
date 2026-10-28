import * as T from './vendor/three.module.js';import {holdCapacity} from '../hauling-rules.js';
import {C} from '../config.js';
const tv=C.toolVisual;
// ---- Model kit ----------------------------------------------------------------------------------------------------------------
// Bevelled boxes, lathed and swept solids, hoses, bolts, hazard stripes and decal quads, plus parts(): a builder that merges every
// static piece of a model per material, so richer models cost triangles rather than draw calls. Curved surfaces carry smooth normals;
// flat faces stay flat behind a small rounded bevel. Merged meshes get object-space box-projected UVs (for the procedural wear maps)
// and vertex colours: each part's paint colour, darkened by grime toward the ground and worn toward bare metal on bevelled edges.
const tri=(pos,nor,a,b,c,na,nb,nc)=>{const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],fx=uy*vz-uz*vy,fy=uz*vx-ux*vz,fz=ux*vy-uy*vx;if(fx*fx+fy*fy+fz*fz<1e-18)return;
 if(fx*(na[0]+nb[0]+nc[0])+fy*(na[1]+nb[1]+nc[1])+fz*(na[2]+nb[2]+nc[2])<0){const t=b;b=c;c=t;const u=nb;nb=nc;nc=u;}pos.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);nor.push(na[0],na[1],na[2],nb[0],nb[1],nb[2],nc[0],nc[1],nc[2]);};
const quad=(pos,nor,a,b,c,d,na,nb,nc,nd)=>{tri(pos,nor,a,b,c,na,nb,nc);tri(pos,nor,a,c,d,na,nc,nd);};
function geometry(pos,nor,uv){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;}
const kitCache=new Map(),cached=(key,make)=>{let g=kitCache.get(key);if(!g){g=make();kitCache.set(key,g);}return g;};
// A box with every edge rounded by r (s steps per bevel): flat faces, smooth bevels. Marked as bevelled for edge wear.
export function roundBox(w,h,d,r=Math.min(w,h,d)*0.2,s=1){return cached(['rb',w,h,d,r,s].join(),()=>{r=Math.max(1e-4,Math.min(r,w/2-1e-5,h/2-1e-5,d/2-1e-5));const n=2*s+1,g=new T.BoxGeometry(1,1,1,n,n,n).toNonIndexed(),p=g.attributes.position.array,q=g.attributes.normal.array,half=0.5/n,b=[w/2-r,h/2-r,d/2-r];g.deleteAttribute('uv');
 for(let i=0;i<p.length;i+=3){let l=0;for(let k=0;k<3;k++){const c=p[i+k];q[i+k]=c-Math.sign(c)*half;l+=q[i+k]*q[i+k];}l=Math.sqrt(l)||1;for(let k=0;k<3;k++){q[i+k]/=l;p[i+k]=b[k]*Math.sign(p[i+k])+q[i+k]*r;}}g.userData.bevel=true;return g;});}
// Turns a profile of [radius, y] points about the y axis, bottom to top. A third entry true marks a crease; the rest is smooth.
export function lathe(points,segments=24,phi0=0,phiLength=Math.PI*2){return cached(['la',JSON.stringify(points),segments,phi0,phiLength].join(),()=>{const pos=[],nor=[],M=points.length,edge=[];
 for(let j=0;j<M-1;j++){const dr=points[j+1][0]-points[j][0],dy=points[j+1][1]-points[j][1],l=Math.hypot(dr,dy)||1;edge.push([dy/l,-dr/l]);}
 const at=(j,e)=>{if(points[j][2]||j===0||j===M-1)return edge[e];const a=edge[j-1],b=edge[j],x=a[0]+b[0],y=a[1]+b[1],l=Math.hypot(x,y)||1;return [x/l,y/l];};
 for(let i=0;i<segments;i++){const a0=phi0+i/segments*phiLength,a1=phi0+(i+1)/segments*phiLength,s0=Math.sin(a0),c0=Math.cos(a0),s1=Math.sin(a1),c1=Math.cos(a1);
  for(let j=0;j<M-1;j++){const p=points[j],q=points[j+1],np=at(j,j),nq=at(j+1,j);quad(pos,nor,[p[0]*s0,p[1],p[0]*c0],[q[0]*s0,q[1],q[0]*c0],[q[0]*s1,q[1],q[0]*c1],[p[0]*s1,p[1],p[0]*c1],[np[0]*s0,np[1],np[0]*c0],[nq[0]*s0,nq[1],nq[0]*c0],[nq[0]*s1,nq[1],nq[0]*c1],[np[0]*s1,np[1],np[0]*c1]);}}
 return geometry(pos,nor);});}
// A cylinder along y with rounded rims (bevel b); caps flat, sides smooth.
export function roundCylinder(r,h,b=Math.min(r,h)*0.15,segments=20){const k=[];k.push([0,-h/2],[r-b,-h/2]);for(let i=1;i<4;i++){const a=-Math.PI/2+i/4*Math.PI/2;k.push([r-b+Math.cos(a)*b,-h/2+b+Math.sin(a)*b]);}k.push([r,-h/2+b],[r,h/2-b]);for(let i=1;i<4;i++){const a=i/4*Math.PI/2;k.push([r-b+Math.cos(a)*b,h/2-b+Math.sin(a)*b]);}k.push([r-b,h/2],[0,h/2]);return lathe(k,segments);}
// A rounded-rectangle path in the xz plane, counter-clockwise, as [x, z, nx, nz] points with exact outward normals.
export function roundRect(hx,hz,r,steps=6){const out=[];for(const [cx,cz,a0] of [[hx-r,hz-r,0],[-(hx-r),hz-r,Math.PI/2],[-(hx-r),-(hz-r),Math.PI],[hx-r,-(hz-r),Math.PI*1.5]])for(let k=0;k<=steps;k++){const a=a0+k/steps*Math.PI/2,c=Math.cos(a),s=Math.sin(a);out.push([cx+c*r,cz+s*r,c,s]);}return out;}
// A closed rounded-rectangle profile [out, up] centred on the path, counter-clockwise.
export function profileRect(w,h,r=Math.min(w,h)*0.25,steps=3){return roundRect(w/2,h/2,r,steps).map(p=>[p[0],p[1]]);}
export function profileCircle(r,n=10){return Array.from({length:n},(_,i)=>[Math.cos(i/n*Math.PI*2)*r,Math.sin(i/n*Math.PI*2)*r]);}
// Sweeps a closed profile ([out, up] points, a third entry true for a crease) along a horizontal path of [x, z(, nx, nz)] points.
// Paths without normals get mitred ones. Open paths are capped.
export function sweep(profile,path,closed=true){return cached(['sw',JSON.stringify(profile),JSON.stringify(path),closed].join(),()=>{const P=path.length,M=profile.length,frames=path.map((p,i)=>{if(p.length>=4)return [p[0],p[1],p[2],p[3],1];
  const a=path[closed?(i-1+P)%P:Math.max(0,i-1)],b=path[closed?(i+1)%P:Math.min(P-1,i+1)];let tx=b[0]-a[0],tz=b[1]-a[1];const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;let scale=1;if(closed||(i>0&&i<P-1)){const q=path[closed?(i-1+P)%P:i-1],sx=p[0]-q[0],sz=p[1]-q[1],sl=Math.hypot(sx,sz)||1;scale=1/Math.max(0.5,(sz/sl)*tz+(sx/sl)*tx);}return [p[0],p[1],tz,-tx,scale];});
 const edge=[];for(let j=0;j<M;j++){const a=profile[j],b=profile[(j+1)%M],du=b[0]-a[0],dv=b[1]-a[1],l=Math.hypot(du,dv)||1;edge.push([dv/l,-du/l]);}
 const vn=(j,e)=>{if(profile[j][2])return edge[e];const a=edge[(j-1+M)%M],b=edge[j],x=a[0]+b[0],y=a[1]+b[1],l=Math.hypot(x,y)||1;return [x/l,y/l];};
 const pt=(f,u,v)=>[f[0]+f[2]*u*f[4],v,f[1]+f[3]*u*f[4]],nm=(f,n)=>[f[2]*n[0],n[1],f[3]*n[0]],pos=[],nor=[],segs=closed?P:P-1;
 for(let j=0;j<M;j++){const a=profile[j],b=profile[(j+1)%M],na=vn(j,j),nb=vn((j+1)%M,j);for(let i=0;i<segs;i++){const f0=frames[i],f1=frames[(i+1)%P];quad(pos,nor,pt(f0,a[0],a[1]),pt(f0,b[0],b[1]),pt(f1,b[0],b[1]),pt(f1,a[0],a[1]),nm(f0,na),nm(f0,nb),nm(f1,nb),nm(f1,na));}}
 if(!closed)for(const [f,a,b] of [[frames[0],path[0],path[1]],[frames[P-1],path[P-1],path[P-2]]]){const dx=a[0]-b[0],dz=a[1]-b[1],l=Math.hypot(dx,dz)||1,t=[dx/l,0,dz/l],c=pt(f,0,0);for(let j=0;j<M;j++)tri(pos,nor,c,pt(f,profile[j][0],profile[j][1]),pt(f,profile[(j+1)%M][0],profile[(j+1)%M][1]),t,t,t);}
 return geometry(pos,nor);});}
// A hose or cable through 3D points, smooth (Catmull-Rom).
export function hose(points,r,tubular=24,radial=8){return cached(['ho',JSON.stringify(points),r,tubular,radial].join(),()=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2]))),tubular,r,radial,false));}
// A hex bolt head standing on y=0 with a chamfered top.
export function bolt(r=0.012,h=0.008){return lathe([[0,0],[r,0,true],[r,h*0.65,true],[r*0.78,h],[0,h]],6);}
// Slanted hazard stripes over a w by h face in the xy plane, facing +z: the stripe colour only, the face shows between them.
export function stripes(w,h,width=h*0.75,gap=width){return cached(['st',w,h,width,gap].join(),()=>{const pos=[],nor=[],n=[0,0,1],clip=(pts,keep,x)=>{const out=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],ia=keep(a[0]),ib=keep(b[0]);if(ia)out.push(a);if(ia!==ib){const t=(x-a[0])/(b[0]-a[0]);out.push([x,a[1]+(b[1]-a[1])*t]);}}return out;};
 for(let x=-w/2-h;x<w/2;x+=width+gap){const poly=clip(clip([[x,-h/2],[x+width,-h/2],[x+width+h,h/2],[x+h,h/2]],p=>p>=-w/2,-w/2),p=>p<=w/2,w/2);for(let k=1;k<poly.length-1;k++)tri(pos,nor,[poly[0][0],poly[0][1],0],[poly[k][0],poly[k][1],0],[poly[k+1][0],poly[k+1][1],0],n,n,n);}return geometry(pos,nor);});}
// A decal quad (w by h, facing +z) showing atlas rectangle uv=[u0,v0,u1,v1].
export function decalQuad(uv,w,h){return cached(['dq',uv.join(),w,h].join(),()=>{const g=new T.PlaneGeometry(w,h),a=g.attributes.uv;for(let i=0;i<a.count;i++)a.setXY(i,uv[0]+(uv[2]-uv[0])*a.getX(i),uv[1]+(uv[3]-uv[1])*a.getY(i));g.userData.decal=true;return g;});}
// A finish handle: the material plus the paint colour written into the merged mesh's vertex colours. Without the factory's finishes
// (unit tests) it falls back to a plain material in that colour.
export function finishOf(factory,kind,color,mine=false){if(factory.finish)return factory.finish(kind,color,mine);return {material:factory.mat(color),color:null};}
const _c=new T.Color(),_m4=new T.Matrix4(),_o3=new T.Object3D();
// Collects static parts per material and merges them: add(handle, geometry, x, y, z, rx, ry, rz, sx, sy, sz); build(parent, options).
export function parts(){const groups=new Map(),api={
 add(h,g,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx){_o3.position.set(x,y,z);_o3.rotation.set(rx,ry,rz);_o3.scale.set(sx,sy,sz);_o3.updateMatrix();return api.addMatrix(h,g,_o3.matrix);},
 addMatrix(h,g,matrix){const material=h.isMaterial?h:h.material,color=h.isMaterial?null:h.color;if(!groups.has(material))groups.set(material,[]);groups.get(material).push({g,m:matrix.clone(),color});return api;},
 get size(){return groups.size;},
 // ground and grime: how far toward the ground parts darken (object space y), uvScale: wear texture repeats per unit.
 build(parent,{shadows=true,receive=shadows,ground=0,grime=0.3,uvScale=1,name=null}={}){const meshes=[];for(const [material,list] of groups){const mesh=new T.Mesh(merged(list,{ground,grime,uvScale,decal:!!material.userData?.decal}),material);mesh.castShadow=shadows&&!material.userData?.decal;mesh.receiveShadow=receive;if(name)mesh.name=name;parent.add(mesh);meshes.push(mesh);}groups.clear();return meshes;}};
 return api;}
function merged(list,{ground,grime,uvScale,decal}){let count=0;for(const {g} of list)count+=g.index?g.index.count:g.attributes.position.count;
 const pos=new Float32Array(count*3),nor=new Float32Array(count*3),uv=new Float32Array(count*2),col=decal?null:new Float32Array(count*3),v=new T.Vector3(),n=new T.Vector3(),nm=new T.Matrix3(),tp=[new T.Vector3(),new T.Vector3(),new T.Vector3()];let o=0,part=0;
 for(const {g,m,color} of list){nm.getNormalMatrix(m);const p=g.attributes.position,q=g.attributes.normal,t=g.attributes.uv,idx=g.index,c=idx?idx.count:p.count,flip=m.determinant()<0,bevel=!!g.userData.bevel,shift=(part++*0.6180339)%1;
  const base=color?_c.copy(color):_c.setRGB(1,1,1);const br=base.r,bg=base.g,bb=base.b;
  for(let k=0;k<c;k+=3){for(let s=0;s<3;s++){const i=idx?idx.getX(k+s):k+s,w=o+(flip&&s?3-s:s);v.fromBufferAttribute(p,i).applyMatrix4(m);tp[s].copy(v);pos[w*3]=v.x;pos[w*3+1]=v.y;pos[w*3+2]=v.z;n.fromBufferAttribute(q,i);
    if(col){const e=bevel?Math.min(1,Math.max(0,(1-Math.max(Math.abs(n.x),Math.abs(n.y),Math.abs(n.z)))*3.2)):0,gy=Math.min(1,Math.max(0,(v.y-ground)/0.5)),dirt=1-grime*(1-gy*gy*(3-2*gy));col[w*3]=(br+(0.42-br)*e*0.32)*dirt;col[w*3+1]=(bg+(0.43-bg)*e*0.32)*dirt;col[w*3+2]=(bb+(0.44-bb)*e*0.32)*dirt*0.985;}
    n.applyMatrix3(nm).normalize();nor[w*3]=n.x;nor[w*3+1]=n.y;nor[w*3+2]=n.z;if(decal&&t){uv[w*2]=t.getX(i);uv[w*2+1]=t.getY(i);}}
   if(!decal){const ax=tp[1].clone().sub(tp[0]).cross(tp[2].clone().sub(tp[0])),fx=Math.abs(ax.x),fy=Math.abs(ax.y),fz=Math.abs(ax.z);for(let s=0;s<3;s++){const w=o+s,X=pos[w*3],Y=pos[w*3+1],Z=pos[w*3+2];let U,Vv;if(fx>=fy&&fx>=fz){U=Z;Vv=Y;}else if(fy>=fz){U=X;Vv=Z;}else{U=X;Vv=Y;}uv[w*2]=U*uvScale+shift;uv[w*2+1]=Vv*uvScale+shift*0.37;}}
   o+=3;}}
 const out=new T.BufferGeometry();out.setAttribute('position',new T.BufferAttribute(pos,3));out.setAttribute('normal',new T.BufferAttribute(nor,3));out.setAttribute('uv',new T.BufferAttribute(uv,2));if(col)out.setAttribute('color',new T.BufferAttribute(col,3));out.computeBoundingSphere();return out;}
// Explorer joints in body space: hips (the legs hang from them), neck (the helmet pivots on it), helmet centre and radius, and shoulders
// (the arms hang from them).
const HIP=0.45,NECK=0.78,HELMET=0.97,HELMET_RADIUS=0.22,SHOULDER=[0.23,0.73];
export function heldTool(factory,tier){const root=new T.Group(),spin=new T.Group();root.name=C.tools[tier].name+' held tool';const b=(c,x,y,z,px=0,py=0,pz=0)=>factory.box(root,c,x,y,z,px,py,pz),rod=(c,r,h,x,y,z)=>{const m=factory.cylinder(root,c,r,h,x,y,z);m.rotation.x=Math.PI/2;return m;};
 if(tier===0){rod('#c4aa75',0.006,0.23,0,0,-0.1);}
 if(tier===1){rod('#a7bcc4',0.008,0.17,0,0,-0.07);const bowl=new T.Mesh(new T.SphereGeometry(0.035,10,6),factory.mat('#c6d5d8'));bowl.scale.set(0.7,0.2,1.25);bowl.position.z=-0.18;root.add(bowl);}
 if(tier===2){rod('#bc5542',0.016,0.12,0,0,0);const blade=new T.Mesh(new T.ConeGeometry(0.055,0.15,3),factory.mat('#a4b3b7'));blade.rotation.x=-Math.PI/2;blade.scale.z=0.18;blade.position.z=-0.13;root.add(blade);}
 if(tier===3){rod('#9b8062',0.012,0.32,0,0,-0.07);b('#a1b0b5',0.10,0.012,0.12,0,0,-0.26);b('#c3c9c6',0.08,0.01,0.025,0,0,-0.32);}
 if(tier===4){// Crescent pickaxe: wooden haft, curved steel head in the swing plane, copper cap.
const steel=new T.MeshStandardMaterial({color:'#7d9bbd',metalness:0.3,roughness:0.35,emissive:'#1c2a3a',emissiveIntensity:0.6}),copper=new T.MeshStandardMaterial({color:'#d07a43',metalness:0.25,roughness:0.4,emissive:'#3a1c0c',emissiveIntensity:0.5});
const haft=new T.Mesh(new T.CylinderGeometry(0.011,0.015,0.34,8),factory.mat('#7b4b2c'));haft.rotation.x=Math.PI/2;haft.position.z=-0.09;root.add(haft);
const curve=new T.QuadraticBezierCurve3(new T.Vector3(0,0.12,-0.235),new T.Vector3(0,0,-0.29),new T.Vector3(0,-0.17,-0.215));root.add(new T.Mesh(new T.TubeGeometry(curve,14,0.016,6),steel));
for(const [at,dir] of [[curve.getPoint(0),curve.getTangent(0).negate()],[curve.getPoint(1),curve.getTangent(1)]]){const tip=new T.Mesh(new T.ConeGeometry(0.016,0.055,6),steel);tip.position.copy(at).addScaledVector(dir,0.027);tip.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);root.add(tip);}
const socket=new T.Mesh(new T.CylinderGeometry(0.022,0.022,0.05,8),steel);socket.rotation.x=Math.PI/2;socket.position.z=-0.262;root.add(socket);
for(const side of [-1,1]){const cap=new T.Mesh(new T.CylinderGeometry(0.018,0.018,0.012,10),copper);cap.rotation.z=Math.PI/2;cap.position.set(side*0.023,0,-0.262);root.add(cap);}
}
 if(tier===5){// Upright jackhammer along -z: T-handle, yellow motor body, neck, steel chisel bit.
const yellow=new T.MeshStandardMaterial({color:'#d9a92e',metalness:0.35,roughness:0.45}),dark=factory.mat('#2c3438'),steel=new T.MeshStandardMaterial({color:'#aebdc8',metalness:0.3,roughness:0.35,emissive:'#202a30',emissiveIntensity:0.5});
const along=(mesh,z)=>{mesh.rotation.x=Math.PI/2;mesh.position.z=z;root.add(mesh);return mesh;};
const bar=new T.Mesh(new T.CylinderGeometry(0.012,0.012,0.22,8),dark);bar.rotation.z=Math.PI/2;bar.position.z=0.13;root.add(bar);
for(const side of [-1,1]){const grip=new T.Mesh(new T.CylinderGeometry(0.018,0.018,0.06,8),dark);grip.rotation.z=Math.PI/2;grip.position.set(side*0.085,0,0.13);root.add(grip);}
along(new T.Mesh(new T.CylinderGeometry(0.014,0.014,0.06,8),dark),0.1);
along(new T.Mesh(new T.CylinderGeometry(0.052,0.058,0.15,12),yellow),0.02);
for(const z of [0.075,-0.035])along(new T.Mesh(new T.CylinderGeometry(0.06,0.06,0.014,12),dark),z);
along(new T.Mesh(new T.CylinderGeometry(0.024,0.03,0.06,10),dark),-0.085);
along(new T.Mesh(new T.CylinderGeometry(0.011,0.011,0.16,8),steel),-0.19);
const tip=new T.Mesh(new T.ConeGeometry(0.011,0.04,8),steel);tip.rotation.x=-Math.PI/2;tip.position.z=-0.29;root.add(tip);
b('#60dfcb',0.012,0.03,0.04,0.055,0,0.03);
}
 if(tier===6){rod('#a8433e',0.028,0.13,-0.022,0,-0.05);rod('#ad4d3d',0.028,0.13,0.026,0,-0.05);b('#3c4649',0.12,0.04,0.025,0,0,-0.05);const fuse=rod('#ddb85c',0.004,0.09,0,0.02,-0.16);}
 if(tier===7){// Tunnel borer: a heavy two-handed boring machine. Ribbed orange motor with hazard bands, glowing vents and pistons, and a wide toothed cutter head that spins.
const orange=new T.MeshStandardMaterial({color:'#e0802c',metalness:0.3,roughness:0.42,emissive:'#3a1a05',emissiveIntensity:0.4}),dark=factory.mat('#22292d'),yellow=factory.mat('#f2c230'),steel=new T.MeshStandardMaterial({color:'#c3ccd2',metalness:0.45,roughness:0.28,emissive:'#22292e',emissiveIntensity:0.5}),vent=new T.MeshBasicMaterial({color:'#ff9a3c'}),heat=new T.MeshBasicMaterial({color:'#ffb35c',transparent:true,opacity:0.85,blending:T.AdditiveBlending,depthWrite:false});
const along=(mesh,z,parent=root)=>{mesh.rotation.x=Math.PI/2;mesh.position.z=z;parent.add(mesh);return mesh;};
along(new T.Mesh(new T.CylinderGeometry(0.095,0.105,0.26,18),orange),0.02);
for(const z of [0.12,0.07,0.02,-0.03])along(new T.Mesh(new T.CylinderGeometry(0.108,0.108,0.012,18),dark),z);
for(const [z,c] of [[-0.075,yellow],[-0.092,dark]])along(new T.Mesh(new T.CylinderGeometry(0.104,0.104,0.017,18),c),z);
const pack=new T.Mesh(new T.BoxGeometry(0.15,0.11,0.1),dark);pack.position.set(0,0.02,0.19);root.add(pack);for(let k=0;k<3;k++){const v=new T.Mesh(new T.BoxGeometry(0.1,0.008,0.004),vent);v.position.set(0,0.0+k*0.022,0.242);root.add(v);}
const top=new T.Mesh(new T.BoxGeometry(0.03,0.03,0.2),dark);top.position.set(0,0.135,0.03);root.add(top);for(const z of [-0.06,0.12]){const post=new T.Mesh(new T.BoxGeometry(0.026,0.04,0.026),dark);post.position.set(0,0.11,z);root.add(post);}
const grip=new T.Mesh(new T.BoxGeometry(0.036,0.11,0.04),dark);grip.position.set(0,-0.12,0.1);root.add(grip);
for(const sx of [-1,1]){const piston=new T.Mesh(new T.CylinderGeometry(0.014,0.014,0.2,8),steel);piston.rotation.x=Math.PI/2;piston.position.set(sx*0.11,-0.03,-0.03);root.add(piston);const sleeve=new T.Mesh(new T.CylinderGeometry(0.02,0.02,0.09,8),dark);sleeve.rotation.x=Math.PI/2;sleeve.position.set(sx*0.11,-0.03,0.05);root.add(sleeve);}
along(new T.Mesh(new T.TorusGeometry(0.1,0.012,8,24),heat),-0.112).rotation.x=0;
along(new T.Mesh(new T.CylinderGeometry(0.19,0.19,0.03,26),steel),-0.13,spin);along(new T.Mesh(new T.CylinderGeometry(0.196,0.196,0.012,26),dark),-0.148,spin);
for(let k=0;k<3;k++){const a=k/3*Math.PI*2,arm=new T.Mesh(new T.BoxGeometry(0.034,0.18,0.022),yellow);arm.position.set(Math.cos(a)*0.09,Math.sin(a)*0.09,-0.154);arm.rotation.z=a-Math.PI/2;spin.add(arm);}
const cone=new T.Mesh(new T.ConeGeometry(0.06,0.12,14),steel);cone.rotation.x=-Math.PI/2;cone.position.z=-0.21;spin.add(cone);
for(let k=0;k<18;k++){const a=k/18*Math.PI*2,tooth=new T.Mesh(new T.ConeGeometry(0.016,0.045,6),steel);tooth.rotation.x=-Math.PI/2;tooth.position.set(Math.cos(a)*0.175,Math.sin(a)*0.175,-0.168);spin.add(tooth);}
for(let k=0;k<6;k++){const a=k/6*Math.PI*2,flute=new T.Mesh(new T.BoxGeometry(0.01,0.018,0.1),dark);flute.position.set(Math.cos(a)*0.033,Math.sin(a)*0.033,-0.2);flute.rotation.set(Math.sin(a)*0.45,-Math.cos(a)*0.45,a);spin.add(flute);}
root.add(spin);}
 if(tier===8){// Mining mech arms: graphite forearm plates with glowing trim, twin chrome pistons and a hose, arm lamps, and a three-finger
// claw on a wrist drum. Each arm and each finger is one merged piece per material; the fingers still open and close on their own.
const seg=n=>factory.seg?factory.seg(n):n,armor=finishOf(factory,'paint','#23292e'),edge=finishOf(factory,'paint','#3b434a'),chrome=finishOf(factory,'metal','#d3dde3'),iron=finishOf(factory,'metal','#5a6267'),hoseH=finishOf(factory,'rubber','#15181a'),trim=factory.mat('#f2c230',true),lamp=factory.mat('#ffe08a',true);
const arms=[];for(const side of [0,1]){const arm=new T.Group();arm.position.x=side?0.02:-tv.mechArmSpread;root.add(arm);const S=parts();
 S.add(armor,roundBox(0.11,0.11,0.27,0.025,2),0,0,-0.06);S.add(edge,roundBox(0.14,0.13,0.1,0.03,2),0,0,0.08);S.add(trim,roundBox(0.03,0.012,0.2,0.005),0,0.056,-0.06);
 for(const dx of [-0.035,0.035]){S.add(iron,roundCylinder(0.016,0.1,0.004,seg(10)),dx,0.064,0.01,Math.PI/2,0,0);S.add(chrome,roundCylinder(0.009,0.13,0.003,seg(8)),dx,0.064,-0.1,Math.PI/2,0,0);}
 S.add(hoseH,hose([[0.06,0.02,0.12],[0.075,0.0,0.0],[0.062,-0.03,-0.15]],0.009,seg(12),seg(5)));for(const lx of [-0.025,0.025])S.add(lamp,roundBox(0.022,0.014,0.01,0.004),lx,-0.035,-0.196);
 S.add(iron,roundCylinder(0.042,0.1,0.01,seg(14)),0,0,-0.198,0,0,Math.PI/2);S.build(arm,{shadows:false,grime:0.1,uvScale:4});
 const claw=new T.Group();claw.position.z=-0.2;arm.add(claw);const fingers=[];
 for(const [fx,fy] of [[-0.045,0.03],[0.045,0.03],[0,-0.05]]){const f=new T.Group();f.position.set(fx,fy,0);const Q=parts();
  Q.add(iron,roundCylinder(0.021,0.04,0.006,seg(10)),0,0,0,0,0,Math.PI/2);Q.add(edge,roundBox(0.033,0.033,0.1,0.01),0,0,-0.055);Q.add(iron,roundCylinder(0.018,0.037,0.005,seg(10)),0,0,-0.105,0,0,Math.PI/2);
  Q.add(chrome,lathe([[0,-0.075],[0.013,-0.025],[0.019,0,true],[0,0.004]],seg(8)),0,0,-0.115,Math.PI/2+(fy>0?-0.3:0.3),0,0);Q.build(f,{shadows:false,grime:0.05,uvScale:4});
  f.rotation.x=fy>0?-0.25:0.25;f.userData.open=f.rotation.x;claw.add(f);fingers.push(f);}
 arms.push({arm,fingers,side});}
root.userData.arms=arms;root.add(spin);}
 root.userData.tool=tier;return {root,spin,tier};}
// One stroke per dig: wind up, hit, recover. Returns -1 when raised, +1 at impact, 0 at rest.
export function strikeCurve(t){if(!(t>=0&&t<1))return 0;if(t<tv.impactAt*0.72)return -Math.sin(t/(tv.impactAt*0.72)*Math.PI/2);if(t<tv.impactAt){const k=(t-tv.impactAt*0.72)/(tv.impactAt*0.28);return -1+2*k*k;}return Math.cos((t-tv.impactAt)/(1-tv.impactAt)*Math.PI/2);}
// A new dig never cancels a stroke before it lands; after impact it starts the next stroke from half wind up. The jackhammer restarts every hit.
export function nextStrike(strikeAt,now,tier){const ms=tv.strikeMs[tier],t=(now-strikeAt)/ms;if(tier===5||!(t<1))return now;if(t<tv.impactAt)return strikeAt;return now-ms*tv.impactAt*0.36;}
export function animateTool(tool,now,strikeAt,reduced){const r=tool.root,t=(now-strikeAt)/tv.strikeMs[tool.tier],f=reduced?0:strikeCurve(t),up=Math.max(0,-f),down=Math.max(0,f);
r.rotation.set(0,0,0);r.position.set(0,0,0);
if(tool.tier===0){r.position.z=-0.07*down+0.03*up;}
else if(tool.tier===1){r.rotation.x=-f*0.7;r.position.z=-0.03*down;}
else if(tool.tier===2){r.rotation.x=-f*0.8;r.position.z=-0.05*down;}
else if(tool.tier===3){r.rotation.x=-f*0.55;r.position.z=-0.09*down+0.03*up;}
else if(tool.tier===4){r.rotation.order='ZYX';r.rotation.z=tv.handSwingRoll;r.rotation.y=tv.handSwingYaw;r.rotation.x=0.2-f*1.2;r.position.y=0.07*up-0.02*down;r.position.z=-0.07*down+0.04*up;r.position.x=-0.04*down;}
else if(tool.tier===5){r.rotation.x=-1.2;const active=!reduced&&t>=0&&t<1;r.position.y=active?-0.035*Math.abs(Math.sin(t*Math.PI*tv.hammerPulses)):0;r.rotation.z=active?Math.sin(now/14)*0.04:0;}
else if(tool.tier===6){r.rotation.x=-f*0.45;r.position.z=-0.08*down+0.03*up;}
else if(tool.tier===8){for(const a of r.userData.arms||[]){const g=reduced?0:strikeCurve(t-(a.side?tv.mechArmLag:0)),down=Math.max(0,g),up=Math.max(0,-g);a.arm.rotation.x=0.1-g*0.55;a.arm.position.z=-0.09*down+0.04*up;a.arm.position.y=0.04*up-0.03*down;for(const f of a.fingers)f.rotation.x=f.userData.open*(1-down*0.9);}}
else{const run=!reduced&&t>=0&&t<1.6;r.position.z=-0.05*down;if(tool.tier===7){r.rotation.y=0.36;r.rotation.x=-0.26;if(run){r.position.x=Math.sin(now/9)*0.004;r.position.y=Math.cos(now/7)*0.004;}}tool.spin.rotation.z=run?now/C.tapWindowMs*tv.spinRate:tool.spin.rotation.z;}
return f;}
// Drill seat pose, shared by renderer3d.js and test/crew-seat.test.js. A seated crewmate leans over the console from the hips and
// bows the helmet down the bore (visor to the glass floor, where the seat itself looks), legs out along the pad as before.
// k runs from 0 (standing) to 1 (seated) while they climb in. The name label rides over the front of the bowed helmet: seen from the
// surface, whose camera looks down from behind the crew, it then clears the helmet instead of hiding it.
export function seatPose(model,k=1){const K=C.three.cockpit,s=K.crewScale,lean=K.crewLean*k,bow=K.crewBow*k,hip=HIP*s;
 model.body.rotation.x=-lean;model.body.position.set(0,hip*(1-Math.cos(lean)),hip*Math.sin(lean));model.head.rotation.x=-bow;for(const leg of model.walk.legs)leg.rotation.x=K.crewLegs*k+lean;
 model.name.position.set(0,K.crewLabelY,-(NECK-HIP)*s*Math.sin(lean)-(HELMET-NECK)*s*Math.sin(lean+bow)-HELMET_RADIUS*s);}
// A seated crewmate's shoulder in the model's root space: the station sleeves run from the stick grips to here.
export function seatShoulder(side,target=new T.Vector3()){const K=C.three.cockpit,s=K.crewScale,up=(SHOULDER[1]-HIP)*s;return target.set(side*SHOULDER[0]*s,HIP*s+up*Math.cos(K.crewLean),-up*Math.sin(K.crewLean));}
// The explorer: a layered EVA suit (hard upper torso, folded soft joints, bearings at waist, shoulders and wrists, a chest control box
// with umbilicals, chunky gloves and boots, accent bands in the player's colour), a life-support pack with twin oxygen tanks, and a
// helmet with a neck ring, side pods, a gold reflective visor and its rim. Greys and darks are vertex tints on the suit's own two
// materials, so a suit stays a few draw calls. The mining mech adds a hydraulic exoskeleton over it: graphite armour plates with
// glowing trim, chrome pistons, hoses, joint drums, arm lamps and three-finger claws.
const ring=(r,t,n=6)=>{const p=profileCircle(t,n).map(([u,v])=>[r+u,v]);p.push(p[0]);return p;};
// White (or tinted) vertex colours for a geometry that has none, so the vertex-coloured finishes light it.
function painted(g,r=1,gr=1,b=1){const n=g.attributes.position.count,c=new Float32Array(n*3);for(let i=0;i<n;i++){c[i*3]=r;c[i*3+1]=gr;c[i*3+2]=b;}g.setAttribute('color',new T.BufferAttribute(c,3));return g;}
export function astronaut(factory,player,scene){const root=new T.Group(),body=new T.Group();root.add(body);root.position.set(player.x,0,player.y);root.name='Explorer '+player.nickname;
 const white='#e2e7e1',legs=[],arms=[],seg=factory.seg||(n=>n),pods=player.pods||0,uv=factory.decalUV;
 const fabric=finishOf(factory,'fabric',white,true),shell=finishOf(factory,'gloss',white,true),accent=finishOf(factory,'fabric',player.color,true),tint=(h,r,g,b)=>({material:h.material,color:new T.Color(r,g,b)});
 const grey=tint(fabric,0.56,0.58,0.61),glove=tint(fabric,0.46,0.48,0.51),boot=tint(fabric,0.3,0.31,0.33),sole=tint(fabric,0.16,0.16,0.17),packGrey=tint(shell,0.62,0.64,0.67),packDark=tint(shell,0.24,0.25,0.27),shellGrey=tint(shell,0.5,0.52,0.55);
 const P=parts(),A=parts();
 // Torso: hard upper torso, a folded soft waist on a bearing ring, shoulder bearings, the chest control box and its umbilicals.
 P.add(fabric,roundBox(0.36,0.2,0.26,0.085,2),0,0.665,0);
 P.add(fabric,lathe([[0,0.44],[0.118,0.44],[0.142,0.458],[0.151,0.488],[0.146,0.503],[0.155,0.522],[0.15,0.542],[0.157,0.562],[0.148,0.585],[0,0.59]],seg(14)),0,0,0,0,0,0,1,1,0.8);
 P.add(grey,lathe(ring(0.162,0.016),seg(14)),0,0.537,0,0,0,0,1,1,0.82);
 for(const s of [-1,1])P.add(grey,lathe(ring(0.07,0.013),seg(14)),s*0.19,0.71,0,0,0,Math.PI/2);
 P.add(boot,roundBox(0.2,0.1,0.06,0.02),0,0.65,-0.15);if(factory.decal)P.add(factory.decal,decalQuad(uv('panel'),0.17,0.074),0,0.65,-0.1815,0,Math.PI,0);
 for(const s of [-1,1])P.add(grey,hose([[s*0.08,0.62,-0.17],[s*0.17,0.6,-0.11],[s*0.205,0.6,0.01],[s*0.15,0.63,0.13]],0.014,seg(10),seg(5)));
 A.add(accent,roundBox(0.27,0.032,0.02,0.008),0,0.738,-0.128);
 // Mobility gear: exo struts down the legs, then hover thrusters under the pack.
 if(player.mobility>=1)for(const side of [-1,1]){P.add(grey,roundCylinder(0.012,0.3,0.004,seg(8)),side*0.165,0.39,0.02);for(const y of [0.27,0.5])P.add(grey,roundBox(0.04,0.03,0.04,0.008),side*0.165,y,0.02);}
 const thrust=parts();if(player.mobility>=2)for(const side of [-1,1]){P.add(packDark,lathe([[0.02,-0.09],[0.045,-0.085,true],[0.05,-0.02],[0.045,0.06],[0.035,0.075],[0,0.08]],seg(14)),side*0.1,0.53,0.27);thrust.add(factory.mat(player.mobility===3?'#7fd7ec':'#9de2c3',true),lathe([[0.022,-0.095],[0.044,-0.095],[0.044,-0.088],[0.022,-0.088]],seg(14)),side*0.1,0.53,0.27);}
 // Life-support pack: a grey shell with frame bands, twin oxygen tanks with valve caps and labels. Cargo pods enlarge it.
 const pack=new T.Group();pack.name='Life support pack';pack.position.set(0,0.635,0.2);body.add(pack);const K=parts();
 K.add(packGrey,roundBox(0.28,0.33,0.14,0.045),0,0,0);for(const y of [-0.15,0.15])K.add(packDark,roundBox(0.3,0.035,0.155,0.012),0,y,0);
 for(const s of [-1,1]){K.add(shell,lathe([[0,-0.14],[0.03,-0.137],[0.042,-0.125],[0.045,-0.11],[0.045,0.11],[0.042,0.125],[0.03,0.137],[0,0.14]],seg(12)),s*0.075,0,0.085);K.add(packDark,lathe([[0,0],[0.016,0,true],[0.016,0.024,true],[0.011,0.03],[0,0.03]],seg(10)),s*0.075,0.135,0.085);if(factory.decal)K.add(factory.decal,decalQuad(uv('o2'),0.05,0.02),s*0.075,0.02,0.1315);}
 K.build(pack,{ground:-0.17,grime:0.15,uvScale:7});pack.scale.set(1+pods*0.12,1+pods*0.12,1+pods*0.2);
 // Legs: thigh, knee and shin with fabric folds, an accent band at the knee, an ankle bearing, a chunky boot on a sole.
 for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*0.10,HIP,0);const L=parts(),La=parts();
  L.add(fabric,lathe([[0,-0.27],[0.064,-0.27],[0.068,-0.24],[0.07,-0.2],[0.074,-0.175],[0.08,-0.155],[0.08,-0.14],[0.075,-0.12],[0.076,-0.09],[0.072,-0.075],[0.077,-0.05],[0.078,-0.02],[0.074,0.01],[0.06,0.03],[0,0.035]],seg(12)));
  La.add(accent,lathe([[0.079,-0.02],[0.084,-0.015],[0.084,0.015],[0.079,0.02]],seg(12)),0,-0.148,0);L.add(grey,lathe(ring(0.068,0.011),seg(14)),0,-0.252,0);
  L.add(boot,roundBox(0.135,0.085,0.21,0.035),0,-0.302,-0.035);L.add(sole,roundBox(0.145,0.022,0.225,0.008),0,-0.343,-0.035);L.add(sole,roundBox(0.12,0.05,0.035,0.012),0,-0.315,-0.135);
  L.build(leg,{ground:-0.35,grime:0.3,uvScale:7});La.build(leg,{ground:-0.35,grime:0.1,uvScale:7});body.add(leg);legs.push(leg);
  // Arms: a folded sleeve with an elbow, an accent band, a wrist bearing and a chunky glove with its thumb.
  const arm=new T.Group();arm.position.set(side*SHOULDER[0],SHOULDER[1],0);const B=parts(),Ba=parts();
  B.add(fabric,lathe([[0,-0.215],[0.05,-0.215],[0.051,-0.19],[0.054,-0.16],[0.06,-0.135],[0.058,-0.12],[0.055,-0.1],[0.057,-0.08],[0.055,-0.06],[0.058,-0.02],[0.064,0.01],[0.06,0.035],[0,0.05]],seg(14)));
  Ba.add(accent,lathe([[0.056,-0.022],[0.06,-0.017],[0.06,0.017],[0.056,0.022]],seg(14)),0,-0.04,0);B.add(grey,lathe(ring(0.053,0.01),seg(12)),0,-0.205,0);
  B.add(glove,roundBox(0.08,0.085,0.07,0.03),0,-0.258,-0.004);B.add(glove,roundBox(0.03,0.052,0.03,0.013),side*0.03,-0.24,-0.04,0.45,0,-side*0.3);
  B.build(arm,{ground:-0.3,grime:0.12,uvScale:7});Ba.build(arm,{grime:0,uvScale:7});body.add(arm);arms.push(arm);}
 // Helmet on the neck pivot (a seated crewmate bows it): the shell, neck ring, side pods, a gold reflective visor with its rim, the lamp
 // housing and beacon in the player's colour, and the headlamp.
 const head=new T.Group();head.name='Explorer head';head.position.y=NECK;body.add(head);
 const helmet=new T.Mesh(painted(new T.SphereGeometry(HELMET_RADIUS,seg(28),seg(18))),shell.material);helmet.position.y=HELMET-NECK;helmet.castShadow=helmet.receiveShadow=true;head.add(helmet);
 const H=parts(),Ha=parts(),hc=HELMET-NECK,vr=HELMET_RADIUS+0.006,ph0=Math.PI*1.5-0.98,ph1=Math.PI*1.5+0.98,th0=0.78,th1=1.92,sp=(ph,th,r=vr)=>[-r*Math.cos(ph)*Math.sin(th),hc+r*Math.cos(th),r*Math.sin(ph)*Math.sin(th)];
 H.add(shellGrey,lathe([[0.118,-0.035],[0.152,-0.035,true],[0.156,-0.005],[0.15,0.02],[0.13,0.03],[0.118,0.03,true],[0.118,-0.035]],seg(16)),0,0,0);
 for(const s of [-1,1])H.add(shellGrey,roundCylinder(0.052,0.03,0.01,seg(12)),s*0.212,hc,0.01,0,0,Math.PI/2);
 {const rim=[];const n=seg(10);for(let k=0;k<=n;k++)rim.push(sp(ph0+(ph1-ph0)*k/n,th0,vr+0.004));for(let k=1;k<=n;k++)rim.push(sp(ph1,th0+(th1-th0)*k/n,vr+0.004));for(let k=1;k<=n;k++)rim.push(sp(ph1-(ph1-ph0)*k/n,th1,vr+0.004));for(let k=1;k<n;k++)rim.push(sp(ph0,th1-(th1-th0)*k/n,vr+0.004));rim.push(rim[0]);H.add(shellGrey,hose(rim,0.011,seg(40),seg(5)));}
 Ha.add(accent,roundBox(0.12,0.035,0.09,0.012),0,1.18-NECK,0);H.build(head,{grime:0.08,uvScale:7});Ha.build(head,{grime:0,uvScale:7});
 const visor=new T.Mesh(new T.SphereGeometry(vr,seg(14),seg(10),ph0,ph1-ph0,th0,th1-th0),new T.MeshStandardMaterial({color:'#c9a45c',metalness:0.95,roughness:0.12,emissive:'#6a5126',emissiveIntensity:0.32}));visor.position.y=hc;visor.name='Gold visor';head.add(visor);
 const beacon=new T.Mesh(roundBox(0.06,0.04,0.05,0.012),factory.mat(player.color,true));beacon.position.y=1.215-NECK;head.add(beacon);
 const lampMesh=new T.Mesh(roundBox(0.085,0.034,0.026,0.01),factory.mat('#f6efd7',true));lampMesh.position.set(0,1.142-NECK,-0.15);lampMesh.rotation.x=-0.75;head.add(lampMesh);
 P.build(body,{ground:0,grime:0.22,uvScale:7});A.build(body,{grime:0,uvScale:7});thrust.build(body,{shadows:false});
 const plain=body.children.length;if(player.tool===C.tools.length-1){// Mining mech: a black hydraulic exoskeleton with yellow trim, arm lamps and claws.
 const armor=finishOf(factory,'paint','#1f2428'),edge=finishOf(factory,'paint','#3a4248'),chrome=finishOf(factory,'metal','#d4dadd'),iron=finishOf(factory,'metal','#565e63'),hoseH=finishOf(factory,'rubber','#15181a'),trim=factory.mat('#f2c230',true),lamp=factory.mat('#ffd25a',true),M=parts(),G=parts();
 // Chest armour with a chamfered breastplate, glowing chevrons, a back pack with exhaust stacks and cooling fins.
 M.add(armor,roundBox(0.6,0.42,0.44,0.07),0,0.75,0.02);M.add(edge,roundBox(0.46,0.3,0.05,0.04),0,0.74,-0.205);G.add(trim,roundBox(0.22,0.045,0.02,0.01),0,0.82,-0.232);G.add(trim,roundBox(0.045,0.11,0.02,0.01),0,0.71,-0.232);
 for(const s of [-1,1]){M.add(iron,lathe([[0,-0.12],[0.05,-0.12,true],[0.05,0.1,true],[0.042,0.12],[0,0.12]],seg(14)),s*0.14,0.74,0.28);for(let k=0;k<4;k++)M.add(edge,roundBox(0.012,0.12,0.09,0.004),s*(0.2+k*0.02),0.74,0.27);}
 for(const side of [-1,1]){
  // Shoulder: a pauldron over a joint drum, a piston from the chest to the upper arm.
  M.add(armor,roundBox(0.25,0.21,0.33,0.06),side*0.42,0.94,0.02);G.add(trim,roundBox(0.02,0.06,0.2,0.006),side*0.548,0.96,0.02);M.add(iron,roundCylinder(0.085,0.08,0.015,seg(12)),side*0.34,0.82,0.02,0,0,Math.PI/2);
  M.add(armor,roundBox(0.17,0.22,0.2,0.045),side*0.45,0.67,-0.02);M.add(iron,roundCylinder(0.07,0.2,0.012,seg(14)),side*0.45,0.53,-0.02,0,0,Math.PI/2);M.add(armor,roundBox(0.18,0.22,0.22,0.045),side*0.45,0.42,-0.04);
  for(const dx of [-0.07,0.07]){M.add(iron,roundCylinder(0.016,0.14,0.004,seg(10)),side*0.45+dx,0.62,-0.13);M.add(chrome,roundCylinder(0.009,0.16,0.003,seg(8)),side*0.45+dx,0.49,-0.13);}
  M.add(hoseH,hose([[side*0.3,0.86,0.2],[side*0.5,0.8,0.13],[side*0.56,0.6,0.05],[side*0.54,0.42,-0.05]],0.016,seg(12),seg(6)));
  G.add(lamp,roundBox(0.07,0.06,0.03,0.012),side*0.45,0.38,-0.155);G.add(lamp,roundBox(0.07,0.06,0.03,0.012),side*0.45,0.47,-0.155);
  // Claw: three jointed fingers on a wrist drum under the forearm.
  M.add(iron,roundCylinder(0.05,0.12,0.012,seg(14)),side*0.45,0.3,-0.06,0,0,Math.PI/2);for(const [fx,fz,a] of [[-0.05,-0.12,0.35],[0.05,-0.12,0.35],[0,0.0,-0.35]]){M.add(edge,roundBox(0.035,0.11,0.04,0.01),side*0.45+fx,0.24,-0.06+fz*0.6,a,0,0);M.add(chrome,lathe([[0,-0.07],[0.014,-0.02],[0.02,0,true],[0,0.004]],seg(8)),side*0.45+fx,0.17,-0.06+fz,a*1.6,0,0);}
  // Legs: thigh and shin plates on a knee drum with a piston behind, boots with toe plates.
  M.add(armor,roundBox(0.19,0.21,0.24,0.045),side*0.15,0.35,0);M.add(iron,roundCylinder(0.07,0.2,0.012,seg(14)),side*0.15,0.235,0.0,0,0,Math.PI/2);M.add(armor,roundBox(0.19,0.17,0.23,0.045),side*0.15,0.13,-0.01);
  M.add(iron,roundCylinder(0.015,0.16,0.004,seg(10)),side*0.15,0.32,0.13);M.add(chrome,roundCylinder(0.009,0.14,0.003,seg(8)),side*0.15,0.18,0.13);G.add(trim,roundBox(0.2,0.03,0.02,0.006),side*0.15,0.3,-0.124);
  M.add(edge,roundBox(0.24,0.075,0.34,0.025),side*0.15,0.04,-0.03);M.add(iron,roundBox(0.2,0.04,0.08,0.015),side*0.15,0.06,-0.19);}
 M.build(body,{ground:0,grime:0.28,uvScale:2.5});G.build(body,{shadows:false});}
 const boom=new T.Group();boom.position.set(0,-0.22,0);const tool=heldTool(factory,player.tool);tool.root.visible=player.tool!==C.tools.length-1;tool.root.rotation.x=-0.15;boom.add(tool.root);arms[1].add(boom);let sled=null;if(pods>=3){const g=new T.Group();g.name='Owned cargo sled';factory.box(g,'#859796',0.36,0.07,0.56,0,0.08,0);for(const side of [-1,1])factory.box(g,'#465b61',0.035,0.10,0.62,side*0.18,0.04,0);const fill=factory.box(g,'#c7b88b',0.30,0.22,0.48,0,0.22,0);g.position.z=0.75;root.add(g);sled={root:g,fill};}
 const softFill=new T.PointLight(C.explorerPolish.fillColor,C.explorerPolish.fillIntensity,C.explorerPolish.fillDistance,2);softFill.name='Explorer soft fill';softFill.position.set(...C.explorerPolish.fillPosition);softFill.castShadow=false;root.add(softFill);
 body.traverse(mesh=>{if(!mesh.isMesh||!mesh.material?.color)return;const hex=mesh.material.color.getHexString(),suit=hex===new T.Color(white).getHexString(),stripe=hex===new T.Color(player.color).getHexString();if(suit||stripe){mesh.material=mesh.material.clone();mesh.material.emissive.copy(mesh.material.color);mesh.material.emissiveIntensity=suit?C.explorerPolish.suitEmission:C.explorerPolish.stripeEmission;}});
 const name=factory.label(player.nickname,player.color);name.position.y=C.three.roverNameHeight;root.add(name);body.scale.setScalar(C.three.roverScale);scene.add(root);
 return {root,body,head,sled,mech:body.children.slice(plain),podTier:pods,moving:[],walk:{legs,arms},boom,tool,name,beacon,tier:player.mobility,toolTier:player.tool,x:player.x,y:player.y,lastX:player.x,lastY:player.y,angle:0};}
// A rounded rod (a strut, a piston barrel or rod) from point a to point b.
const _ry=new T.Vector3(0,1,0),_rd=new T.Vector3(),_rq=new T.Quaternion(),_rm=new T.Matrix4(),_rp=new T.Vector3(),_rs=new T.Vector3(1,1,1);
export function rod(P,h,a,b,r,segments=10){_rd.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const len=_rd.length();_rq.setFromUnitVectors(_ry,_rd.divideScalar(len||1));_rp.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);return P.addMatrix(h,roundCylinder(r,len,Math.min(r*0.3,len*0.2),segments),_rm.compose(_rp,_rq,_rs));}
// The excavator: crawler tracks (belts with grousers round the idler, sprocket and rollers) under a slewing white house with an orange
// band, the cab with tinted glass and a beacon, the engine cover and exhaust, a counterweight with hazard tape, a hopper bin whose load
// rises with the hopper, and an orange two-piece boom with its hydraulic cylinders and hoses, the stick and a toothed bucket.
export function excavatorModel(factory,scene,m){const root=new T.Group(),rig=new T.Group();root.add(rig);root.name='Placed excavator '+m.id;const seg=n=>factory.seg?factory.seg(n):n,f=(k,c)=>finishOf(factory,k,c),P=parts(),dk=(name,w,h,x,y,z,ry=0,rx=0)=>{if(factory.decal)P.add(factory.decal,decalQuad(factory.decalUV(name),w,h),x,y,z,rx,ry,0);};
 const white=f('gloss','#eceee9'),orange=f('gloss','#e8802a'),graphite=f('paint','#33393d'),glass=f('gloss','#1b2a33'),steel=f('metal','#b8bfc2'),dark=f('metal','#4a5256'),rubber=f('rubber','#1a1c1e'),yellow=f('paint','#e0b021');
 // Undercarriage: per side a track frame, the belt with grousers, rollers, an idler and a sprocket; a carbody and the slew ring.
 const belt=sweep([[-0.03,-0.2],[0.03,-0.2],[0.03,0.2],[-0.03,0.2]],roundRect(0.19,1.15,0.19,seg(8))),grouser=new T.BoxGeometry(0.42,0.035,0.04),wheel=lathe([[0,-0.07],[0.13,-0.07,true],[0.15,-0.05],[0.15,0.05],[0.13,0.07,true],[0,0.07]],seg(16));
 const track=[];{const path=roundRect(0.19,1.15,0.19,seg(8));let acc=0;for(let i=0;i<path.length;i++){const a=path[i],b=path[(i+1)%path.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);while(acc<l){const t=acc/l;track.push([a[0]+(b[0]-a[0])*t+a[2]*0.045,a[1]+(b[1]-a[1])*t+a[3]*0.045,Math.atan2(a[3],a[2])]);acc+=0.115;}acc-=l;}}
 for(const side of [-1,1]){const x=side*1.03;P.add(rubber,belt,x,0.25,0,0,0,Math.PI/2);for(const [u,v,a] of track)P.add(rubber,grouser,x,0.25+u,v,a,0,0);
  P.add(graphite,roundBox(0.24,0.2,1.9,0.04),x,0.25,0);for(const z of [-0.96,0.96])P.add(dark,wheel,x,0.25,z,0,0,Math.PI/2,1.15,1.6,1.15);for(let n=0;n<5;n++)P.add(steel,wheel,x,0.18,-0.66+n*0.33,0,0,Math.PI/2,0.62,1.3,0.62);P.add(graphite,roundBox(0.3,0.05,0.5,0.015),x,0.43,0.4);}
 P.add(graphite,roundBox(1.7,0.22,1.0,0.05),0,0.32,0);P.add(dark,lathe([[0.5,-0.04],[0.62,-0.04,true],[0.62,0.04,true],[0.5,0.04,true],[0.5,-0.04]],seg(28)),0,0.46,0);
 // House: the deck with its orange band and markings, the counterweight, engine cover with exhaust, handrails.
 P.add(white,roundBox(2.3,0.26,2.2,0.06,2),0,0.6,0);for(const s of [-1,1])P.add(orange,roundBox(0.012,0.06,2.0,0.004),s*1.152,0.62,0);P.add(orange,roundBox(2.1,0.06,0.012,0.004),0,0.62,-1.102);
 dk('ex',1.1,0.18,1.157,0.62,0,Math.PI/2);dk('ex',1.1,0.18,-1.157,0.62,0,-Math.PI/2);dk('logo',0.24,0.24,0,0.62,-1.107,Math.PI);
 P.add(graphite,roundBox(2.1,0.36,0.3,0.08,2),0,0.91,0.95);dk('hazard',1.6,0.12,0,0.91,1.102);
 P.add(white,roundBox(0.9,0.34,0.7,0.06,2),-0.55,0.9,0.45);dk('vent',0.5,0.16,-0.55,1.072,0.45,0,-Math.PI/2);P.add(dark,lathe([[0,0],[0.045,0,true],[0.045,0.3],[0.05,0.31],[0.05,0.34,true],[0,0.34]],seg(12)),-0.25,1.02,0.65);
 {const rail=sweep(profileCircle(0.016,seg(8)),[[1.09,-0.95],[1.09,-0.1],[1.09,0.75]],false),post=roundCylinder(0.016,0.3,0.004,seg(8));P.add(yellow,rail,0,1.03,0);for(const z of [-0.95,-0.1,0.75])P.add(yellow,post,1.09,0.88,z);}
 // Cab: rounded shell, tinted windscreen and side windows with frames, roof beacon and mirror.
 P.add(white,roundBox(0.8,0.8,0.9,0.08,2),-0.62,1.13,-0.32);P.add(glass,roundBox(0.66,0.42,0.02,0.02),-0.62,1.2,-0.772);for(const s of [-1,1])P.add(glass,roundBox(0.02,0.36,0.6,0.02),-0.62+s*0.402,1.22,-0.36);P.add(graphite,roundBox(0.84,0.05,0.94,0.02),-0.62,1.55,-0.32);P.add(dark,roundBox(0.05,0.05,0.12,0.01),-0.2,1.3,-0.72);
 const glow=parts();glow.add(factory.mat('#ffb347',true),lathe([[0,0],[0.045,0],[0.05,0.03],[0.03,0.06],[0,0.065]],seg(12)),-0.4,1.575,-0.1);for(const side of [-1,1])glow.add(factory.mat('#f0e9bf',true),roundBox(0.16,0.08,0.04,0.015),side*0.84,0.72,-1.12);
 // Hopper bin: walls with an orange rim; its load (hopper) rises from the floor of the bin.
 for(const [w,d,x,z] of [[0.52,0.04,0,-0.24],[0.52,0.04,0,0.24],[0.04,0.52,-0.24,0],[0.04,0.52,0.24,0]])P.add(white,roundBox(w,0.48,d,0.012),0.68+x,0.98,0.5+z);P.add(orange,sweep(profileRect(0.05,0.03,0.008,2),roundRect(0.26,0.26,0.04,seg(4))),0.68,1.23,0.5);
 const hopper=parts().add(f('paint','#c9ae6d'),roundBox(0.44,0.46,0.44,0.03).clone().translate(0,0.23,0)).build(rig)[0];hopper.position.set(0.68,0.75,0.5);
 // Boom: two orange box sections, a lift cylinder from the deck, a stick cylinder on top, hoses along it; stick and bucket hang off it.
 const boom=new T.Group();boom.position.set(0.35,0.84,-0.35);const B=parts();
 B.add(orange,roundBox(0.18,0.2,0.82,0.04),0,0.275,-0.3,0.742,0,0);B.add(orange,roundBox(0.17,0.18,0.79,0.04),0,0.335,-0.925,-0.585,0,0);B.add(dark,roundCylinder(0.07,0.24,0.012,seg(14)),0,0.55,-0.6,0,0,Math.PI/2);B.add(dark,roundCylinder(0.06,0.22,0.012,seg(14)),0,0.1,-1.25,0,0,Math.PI/2);
 for(const s of [-1,1]){rod(B,graphite,[s*0.13,-0.12,0.22],[s*0.13,0.05,0.0],0.05,seg(12));rod(B,steel,[s*0.13,0.05,0.0],[s*0.13,0.18,-0.36],0.028,seg(10));}rod(B,graphite,[0,0.66,-0.55],[0,0.52,-0.88],0.045,seg(12));rod(B,steel,[0,0.52,-0.88],[0,0.36,-1.12],0.025,seg(10));
 for(const s of [-1,1])B.add(rubber,hose([[s*0.07,0.05,0.12],[s*0.08,0.42,-0.3],[s*0.08,0.62,-0.62],[s*0.07,0.3,-1.05],[s*0.06,0.14,-1.2]],0.014,seg(24),seg(6)));
 B.build(boom,{ground:-0.84,grime:0.15,uvScale:2});rig.add(boom);
 const stick=parts().add(orange,roundBox(0.12,1,0.12,0.02)).build(boom)[0];stick.position.set(0,0.07,-1.25);
 const bucket=new T.Group();bucket.position.set(0,0.07,-1.25);boom.add(bucket);const K=parts();
 K.add(graphite,roundBox(0.6,0.3,0.05,0.015),0,0.0,0.2);K.add(graphite,roundBox(0.6,0.05,0.42,0.015),0,-0.15,0);for(const s of [-1,1])K.add(graphite,roundBox(0.04,0.32,0.44,0.012),s*0.31,0,0);K.add(orange,roundBox(0.64,0.05,0.06,0.012),0,0.15,0.18);K.add(dark,roundCylinder(0.04,0.66,0.01,seg(12)),0,0.15,0.2,0,0,Math.PI/2);
 for(let n=0;n<5;n++)K.add(steel,lathe([[0,-0.07],[0.025,-0.02],[0.03,0,true],[0,0.004]],seg(8)),-0.24+n*0.12,-0.16,-0.22,Math.PI/2-0.4,0,0);K.build(bucket,{grime:0.4,uvScale:2.5});
 P.build(rig,{ground:0,grime:0.3,uvScale:1.8});glow.build(rig,{shadows:false});
 const hazard=new T.Group(),ring=new T.Mesh(new T.RingGeometry(2.0,2.1,64).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:'#e8b555',transparent:true,opacity:0.45,side:T.DoubleSide,depthWrite:false}));ring.position.y=0.035;hazard.add(ring);
 // Eight hazard beacons round the dig: one merged mesh; lights lists it once per beacon for the renderer's pulse.
 const L=parts(),beacon=lathe([[0,0],[0.04,0],[0.042,0.03],[0.03,0.06],[0,0.07]],seg(10));for(let i=0;i<8;i++){const a=i/8*Math.PI*2;L.add(factory.mat('#ffc069',true),beacon,Math.cos(a)*2.03,0.035,Math.sin(a)*2.03);}const lamp=L.build(hazard,{shadows:false})[0],lights=Array.from({length:8},()=>lamp);
 scene.add(root,hazard);return {root,rig,boom,stick,bucket,hopper,hazard,ring,lights};}
export function explorerGloves(factory){const root=new T.Group();root.name='Tool grip gloves';const E=C.explorerPolish,material=factory.mat('#dfe6df'),cuff=factory.mat('#758b8d'),fingerGeometry=new T.CapsuleGeometry(E.fingerRadius,E.fingerLength,2,4),thumbGeometry=new T.CapsuleGeometry(E.thumbRadius,E.thumbLength,2,5);for(const side of [-1,1]){const hand=new T.Group();hand.name=side<0?'Left grip glove':'Right grip glove';hand.position.set(side*E.gloveSpacing,-0.012,0.012);const palm=new T.Mesh(new T.BoxGeometry(...E.glovePalm),material);palm.name='Glove palm';hand.add(palm);const wrist=new T.Mesh(new T.BoxGeometry(...E.gloveCuff),cuff);wrist.position.y=-E.glovePalm[1]/2;hand.add(wrist);for(let i=0;i<4;i++){const finger=new T.Mesh(fingerGeometry,material);finger.name='Curled glove finger';finger.position.set((i-1.5)*E.fingerRadius*2,-0.001,-E.glovePalm[2]/2);finger.rotation.x=-0.9;hand.add(finger);}const thumb=new T.Mesh(thumbGeometry,material);thumb.name='Glove thumb';thumb.position.set(-side*E.glovePalm[0]/2,0,-0.003);thumb.rotation.z=side*0.8;hand.add(thumb);hand.rotation.z=side*-0.22;root.add(hand);}return root;}
