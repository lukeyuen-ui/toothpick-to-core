import * as T from './vendor/three.module.js';
import {C} from '../config.js';
// Visual masks only. The authoritative map, rows, reach and collision remain cells.
// Dug cells that share a side open into one hole. The edge is inset only where it meets solid ground and every corner is rounded: outer
// corners by C.pits.corner, and inner corners (where an undug cell pokes in between two arms of a hole) by their own smaller fillet,
// C.pits.innerCorner, which runs on through the neighbouring cells, so an undug diagonal is a gentle rounded bulge, not a wedge. Joined floors within C.pits.blendRows rows of each other slope into one floor; deeper neighbours meet at a
// step wall exactly as tall as the difference. Walls, steps and the rim lip are fixed pieces that the vertex shader fits to the rows texture,
// so digging only rewrites one texel per cell, and the spoil texture and rim rocks are rebuilt only when a cell is first broken.
// Dirt, not cuts: the top of each wall rounds over into the lip, the wall below leans into the hole and ripples, and dug floors heave a
// little, all from noise of the world position (so neighbouring cells meet without a seam) and scaled by the preset's shape (0 keeps
// the original straight cut). The preset also picks how many rows and segments the wall, lip and floor pieces have (C.dirt).
const P=C.pits,N=C.mapSize,V=C.three,DUST=new T.Color(C.three.dust).toArray(),M=P.inset,E=0.5-M,R=Math.min(P.corner,E),K=P.rimTexels,S=N*K,g=v=>Number(v).toFixed(5),
 // Inner fillet: radius RI (kept where the arc fits the three dug cells around the corner), its centre sits RI-M past the grid point, and
 // the arc crosses each shared side at BE, leaving the side at angle ALPHA from the corner's diagonal frame (CA, SA its cosine and sine).
 RI=Math.max(0.01,Math.min(P.innerCorner,M/(1-Math.SQRT1_2)-0.01,0.5+M-0.01)),CA=Math.max(0,(RI-M)/RI),SA=Math.sqrt(1-CA*CA),ALPHA=Math.acos(CA),BE=E+RI*(1-SA),LINE=Math.min(0.5,0.5+M-RI),SUN=[V.sun[0]-N/2,V.sun[2]-N/2].map((v,_,a)=>v/Math.hypot(...a));
export const pitNoise=(x,z)=>0.6*Math.sin(x*7.3+z*3.1)*Math.sin(z*6.7-x*2.3)+0.4*Math.sin(x*17-z*13+1.7);
// Wall ripple (-1 to 1) at a world point, how far a wall leans there (0.1 to 1 of C.pits.lean) and the floor heave (-1 to 1). The
// shaders below compute the same.
export const pitRipple=(x,y,z)=>0.6*Math.sin(x*5.3+y*2.9-z*3.7+1.3)*Math.sin(-x*2.1+y*4.7+z*6.1+0.7)+0.4*Math.sin(x*9.7-y*6.3+z*8.9+2.9);
export const pitLean=(x,z)=>0.55+0.45*Math.sin(x*1.37+Math.sin(z*0.91)*2)*Math.sin(z*1.13-x*0.37);
export const pitHeave=(x,z)=>0.5*Math.sin(x*6.3+z*2.1+0.5)+0.3*Math.sin(-x*2.7+z*7.9+1.9)+0.2*Math.sin(x*13.1-z*11.3+0.3);
// How far the wall stands from the opening's edge at an edge point (x, z) and height y, along the edge's outward normal (negative is
// into the hole), for a preset shape of 0 to 1: round over the rim, then lean and ripple below it. The wall shader does the same.
export function wallOffset(x,z,y,shape=1,top=P.lift){const rb=P.rimRound*shape;if(y>=top-rb){if(rb<=0)return 0;const c=Math.min(1,Math.max(0,1-(top-y)/rb));return -rb*Math.sqrt(1-c*c);}
 const d=top-rb-y,k=d/P.leanDepth,L=P.lean*shape*pitLean(x,z),t=Math.min(1,d/P.rippleFade),A=P.ripple*shape*t*t*(3-2*t);return -rb-L*(1-(1+k)*Math.exp(-k))+A*pitRipple(x,y,z);}
// The lip's height a fraction u of the way out from the wall top (height H) to the ground (G): a straight slope at shape 0, a rounded
// shoulder at shape 1 (level at both ends). And a dug floor's heave at a point lx, lz from the centre of cell (cx, cz): nothing at the
// tile's edges. The lip and floor shaders do the same.
export function lipHeight(u,shape=1,H=P.lift,G=0.004){const c=1-u*u*(3-2*u);return (H+(G-H)*u)*(1-shape)+(G+(H-G)*c)*shape;}
export function floorHeave(cx,cz,lx,lz,shape=1){const e=q=>{const t=Math.min(1,Math.max(0,(Math.abs(q)-0.32)/0.18));return 1-t*t*(3-2*t);};return P.floorRipple*shape*e(lx)*e(lz)*pitHeave(cx+0.5+lx,cz+0.5+lz);}
// The rows of a wall piece (k: under 1 is a fraction of the way round the rounded rim, 1 and up is k-1 units under it, 99 the
// bottom) and of a lip piece (0 at the wall to 1 at the ground), and the segments of a straight run, for one preset's layout.
export function pieceRows(kind,layout=C.dirt.low){if(kind==='lip'){const n=Math.max(2,layout.lipRows|0);return Array.from({length:n},(_,i)=>i/(n-1));}if(kind==='step')return [0,1];const arc=Math.max(0,layout.arcRows|0);return [...(arc?[...Array.from({length:arc},(_,i)=>i/arc),1]:[0]),...(layout.wallDepths||[]).map(d=>1+d),99];}
// Signed distance to the hole edge at a world point, negative inside the opening (before the edge noise). rowAt(x,z) reads a cell's row.
// An inner corner: solid ground is the quarter plane with its point at (ax,az) reaching toward (sx,sz), its point rounded by RI.
const inner=(qx,qz,ax,az,sx,sz)=>{const u=sx*(qx-ax)-RI,v=sz*(qz-az)-RI;return RI-(u>0&&v>0?-Math.min(u,v):Math.hypot(Math.max(-u,0),Math.max(-v,0)));};
export function pitSdf(rowAt,x,z){const cx=Math.floor(x),cz=Math.floor(z),dug=(a,b)=>rowAt(a,b)>=P.mergeRow;if(!dug(cx,cz))return 1;const lx=x-cx-0.5,lz=z-cz-0.5,sx=lx<0?-1:1,sz=lz<0?-1:1,qx=Math.abs(lx),qz=Math.abs(lz),X=dug(cx+sx,cz),Z=dug(cx,cz+sz),D=dug(cx+sx,cz+sz);if(X&&Z)return D?-1:inner(qx,qz,E,E,1,1);if(X)return D?inner(qx,qz,0.5+M,E,-1,1):qz-E;if(Z)return D?inner(qx,qz,E,0.5+M,1,-1):qx-E;const dx=qx-(E-R),dz=qz-(E-R);return Math.hypot(Math.max(dx,0),Math.max(dz,0))+Math.min(Math.max(dx,dz),0)-R;}
// The edge inside one quadrant of a dug cell, in a frame where a points at the side neighbour X and b at Z: a straight run along b=E over
// [a0,a1], one along a=E over [b0,b1], the rounded outer corner, and the part of an inner fillet that crosses this quadrant (its centre f
// and angle range th). The shaders below use the same rules.
const span=(a,b)=>b>a+1e-9?[a,b]:null;
export function edgePieces(X,Z,D){const fillet=X&&Z&&!D?{f:[E+RI,E+RI],th:[1.5*Math.PI-ALPHA,Math.PI+ALPHA]}:X&&!Z&&D?{f:[0.5+M-RI,E+RI],th:[-Math.PI/2,-ALPHA]}:!X&&Z&&D?{f:[E+RI,0.5+M-RI],th:[Math.PI/2+ALPHA,Math.PI]}:null;
 return {alongB:!Z?span(0,X?(D?LINE:0.5):E-R):X&&!D?span(E+RI,0.5):null,alongA:!X?span(0,Z?(D?LINE:0.5):E-R):Z&&!D?span(E+RI,0.5):null,corner:!X&&!Z&&R>0,inner:fillet&&fillet.th[1]>fillet.th[0]+1e-9?fillet:null};}
const common=`uniform sampler2D pitRows;uniform sampler2D pitRim;uniform sampler2D pitGrit;uniform sampler2D pitPebbles;uniform sampler2D pitDust;uniform float pitShape;uniform float pitDetail;uniform float pitHeap;uniform float pitRegolith;varying vec3 pitWorld;
float pitRipple(vec3 p,out vec3 g){vec3 k1=vec3(5.3,2.9,-3.7),k2=vec3(-2.1,4.7,6.1),k3=vec3(9.7,-6.3,8.9);float a1=dot(p,k1)+1.3,a2=dot(p,k2)+0.7,a3=dot(p,k3)+2.9,s1=sin(a1),s2=sin(a2);g=0.6*(cos(a1)*s2*k1+s1*cos(a2)*k2)+0.4*cos(a3)*k3;return 0.6*s1*s2+0.4*sin(a3);}
float pitLeanAt(vec2 p){return 0.55+0.45*sin(p.x*1.37+sin(p.y*0.91)*2.0)*sin(p.y*1.13-p.x*0.37);}
float pitHeave(vec2 p,out vec2 g){float a1=p.x*6.3+p.y*2.1+0.5,a2=-p.x*2.7+p.y*7.9+1.9,a3=p.x*13.1-p.y*11.3+0.3;g=0.5*cos(a1)*vec2(6.3,2.1)+0.3*cos(a2)*vec2(-2.7,7.9)+0.2*cos(a3)*vec2(13.1,-11.3);return 0.5*sin(a1)+0.3*sin(a2)+0.2*sin(a3);}
float rowAt(vec2 cell){if(cell.x<0.0||cell.y<0.0||cell.x>=${g(N)}||cell.y>=${g(N)})return 0.0;return floor(texture2D(pitRows,(cell+0.5)/${g(N)}).r*255.0+0.5);}
bool dugAt(vec2 cell){return rowAt(cell)>=${g(P.mergeRow)};}
float visualDepth(float row){return ${g(V.depthMax)}*(1.0-exp(-row/${g(V.depthScale)}));}
float pitNoise(vec2 p){return 0.6*sin(p.x*7.3+p.y*3.1)*sin(p.y*6.7-p.x*2.3)+0.4*sin(p.x*17.0-p.y*13.0+1.7);}
float pitInner(vec2 q,vec2 a,vec2 s){float u=s.x*(q.x-a.x)-${g(RI)},v=s.y*(q.y-a.y)-${g(RI)};return ${g(RI)}-(u>0.0&&v>0.0?-min(u,v):length(max(vec2(-u,-v),0.0)));}
float pitSdf(vec2 at){vec2 c=floor(at),l=at-c-0.5,s=vec2(l.x<0.0?-1.0:1.0,l.y<0.0?-1.0:1.0),q=abs(l);if(!dugAt(c))return 1.0;bool X=dugAt(c+vec2(s.x,0.0)),Z=dugAt(c+vec2(0.0,s.y)),D=dugAt(c+s);if(X&&Z)return D?-1.0:pitInner(q,vec2(${g(E)}),vec2(1.0));if(X)return D?pitInner(q,vec2(${g(0.5+M)},${g(E)}),vec2(-1.0,1.0)):q.y-${g(E)};if(Z)return D?pitInner(q,vec2(${g(E)},${g(0.5+M)}),vec2(1.0,-1.0)):q.x-${g(E)};vec2 d=q-vec2(${g(E-R)});return length(max(d,0.0))+min(max(d.x,d.y),0.0)-${g(R)};}
float pitEdge(vec2 at){return pitSdf(at)-${g(P.edgeNoise)}*pitNoise(at);}`;
// Floor heights: a cell's centre sits at its own depth; a side shared with a joined neighbour (both dug, rows within blendRows) sits halfway;
// a corner takes the average of every cell joined to this one around it, so all cells that meet without a step agree on it exactly.
const blend=`bool pitJoin(float a,float b){return a>=${g(P.mergeRow)}&&b>=${g(P.mergeRow)}&&abs(a-b)<=${g(P.blendRows)};}
float pitCorner(vec2 c,vec2 s){float r0=rowAt(c),rx=rowAt(c+vec2(s.x,0.0)),rz=rowAt(c+vec2(0.0,s.y)),rd=rowAt(c+s);bool x=pitJoin(r0,rx),z=pitJoin(r0,rz),d=(x&&pitJoin(rx,rd))||(z&&pitJoin(rz,rd));x=x||(d&&pitJoin(rd,rx));z=z||(d&&pitJoin(rd,rz));float sum=visualDepth(r0),n=1.0;if(x){sum+=visualDepth(rx);n+=1.0;}if(z){sum+=visualDepth(rz);n+=1.0;}if(d){sum+=visualDepth(rd);n+=1.0;}return sum/n;}
float pitSide(vec2 c,vec2 dir){float r0=rowAt(c),r1=rowAt(c+dir);return pitJoin(r0,r1)?0.5*(visualDepth(r0)+visualDepth(r1)):visualDepth(r0);}
float pitAlong(vec2 c,vec2 dir,vec2 along,float u){float mid=pitSide(c,dir);return u==0.0?mid:mix(mid,pitCorner(c,dir+along*sign(u)),abs(u));}
// Between them the floor runs bilinear across each quadrant (dh: its slope), so a finer tile meets its neighbours on the same edge heights.
float pitFloorAt(vec2 c,vec2 l,out vec2 dh){vec2 s=vec2(l.x<0.0?-1.0:1.0,l.y<0.0?-1.0:1.0),u=min(abs(l)*2.0,1.0);float h0=visualDepth(rowAt(c)),hx=pitSide(c,vec2(s.x,0.0)),hz=pitSide(c,vec2(0.0,s.y)),hd=pitCorner(c,s);dh=vec2(mix(hx-h0,hd-hz,u.y)*2.0*s.x,mix(hz-h0,hd-hx,u.x)*2.0*s.y);return mix(mix(h0,hx,u.x),mix(hz,hd,u.x),u.y);}`;
// A dug floor heaves by up to floorRipple, easing to nothing at the tile's edges so joined floors and step faces still meet exactly;
// its normal follows the blend and the heave.
const floorBuild=`float pitLift;vec3 pitFloorNormal;
void pitFloorBuild(){vec2 pc=floor((modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xz),l=position.xz,dh;float row=rowAt(pc),h=pitFloorAt(pc,l,dh);
 if(row>=${g(P.mergeRow)}&&pitShape>0.0){vec2 hg,q=abs(l),t=clamp((q-0.32)/0.18,0.0,1.0),e=1.0-t*t*(3.0-2.0*t),de=-sign(l)*6.0*t*(1.0-t)/0.18;float r=pitHeave(pc+0.5+l,hg),A=${g(P.floorRipple)}*pitShape;h-=A*e.x*e.y*r;dh-=A*(e.x*e.y*hg+r*vec2(de.x*e.y,e.x*de.y));}
 pitLift=visualDepth(row)-h;pitFloorNormal=pitShape>0.0?normalize(vec3(dh.x,1.0,dh.y)):vec3(0.0,1.0,0.0);}`;
// Instanced pieces: the instance sits at a cell centre, turned so local x and z point at two neighbours (a quadrant, or a shared side).
const frame=`attribute vec3 pitPart;vec3 pitPos;vec3 pitNormal;vec2 pitUv;
void pitFrame(out vec2 o,out vec2 ax,out vec2 az){mat4 m=modelMatrix*instanceMatrix;o=(m*vec4(0.0,0.0,0.0,1.0)).xz;ax=floor((m*vec4(1.0,0.0,0.0,0.0)).xz+0.5);az=floor((m*vec4(0.0,0.0,1.0,0.0)).xz+0.5);}
vec2 pitPiece(vec2 cell,vec2 ax,vec2 az,float piece,float t,out vec2 n,out float w){bool X=dugAt(cell+ax),Z=dugAt(cell+az),D=dugAt(cell+ax+az);w=dugAt(cell)?1.0:0.0;if(piece<0.5){n=vec2(0.0,1.0);float a0=0.0,a1=0.0;if(!Z)a1=X?(D?${g(LINE)}:0.5):${g(E-R)};else if(X&&!D){a0=${g(E+RI)};a1=0.5;}if(a1<=a0)w=0.0;return vec2(mix(a0,a1,t),${g(E)});}if(piece<1.5){n=vec2(1.0,0.0);float b0=0.0,b1=0.0;if(!X)b1=Z?(D?${g(LINE)}:0.5):${g(E-R)};else if(Z&&!D){b0=${g(E+RI)};b1=0.5;}if(b1<=b0)w=0.0;return vec2(${g(E)},mix(b0,b1,t));}if(piece<2.5){float th=t*1.5707963;n=vec2(cos(th),sin(th));if(X||Z||${g(R)}<=0.0)w=0.0;return vec2(${g(E-R)})+${g(R)}*n;}
 vec2 f=vec2(0.0);float th0=0.0,th1=0.0;if(X&&Z&&!D){f=vec2(${g(E+RI)});th0=${g(1.5*Math.PI-ALPHA)};th1=${g(Math.PI+ALPHA)};}else if(X&&!Z&&D){f=vec2(${g(0.5+M-RI)},${g(E+RI)});th0=-1.5707963;th1=${g(-ALPHA)};}else if(!X&&Z&&D){f=vec2(${g(E+RI)},${g(0.5+M-RI)});th0=${g(Math.PI/2+ALPHA)};th1=3.1415927;}if(th1<=th0+0.00001)w=0.0;float th=mix(th0,th1,t);vec2 dir=vec2(cos(th),sin(th));n=-dir;return f+${g(RI)}*dir;}
// Spoil from the rows dug in this cell (up to heapRows), drawn halfway to a joined neighbour's at their shared side so lips and wall
// tops run on without a step, scaled by the preset's heaps. ab is the edge point in the instance frame.
float pitSpoil(vec2 cell,vec2 ax,vec2 az,vec2 ab){float a=min(rowAt(cell)/${g(P.heapRows)},1.0),s=a;if(dugAt(cell+ax))s+=0.5*smoothstep(0.25,0.5,ab.x)*(min(rowAt(cell+ax)/${g(P.heapRows)},1.0)-a);if(dugAt(cell+az))s+=0.5*smoothstep(0.25,0.5,ab.y)*(min(rowAt(cell+az)/${g(P.heapRows)},1.0)-a);return pitHeap*sqrt(max(s,0.0));}`;
const build={
 // Edge walls run from the lip down past the floor (the floor hides the rest), one quadrant per instance. Rows under k=1 turn round
 // the rounded rim (from level with the lip to straight down); the rest stand k-1 under it, leaning in and rippling, to the bottom.
 // A piece this quadrant does not use collapses to a point straight away, skipping the rest.
 wall:`float pitSun;varying vec2 pitFace;void pitBuild(){vec2 o,ax,az,n;float w;pitFrame(o,ax,az);vec2 cell=floor(o),ab=pitPiece(cell,ax,az,pitPart.x,pitPart.y,n,w),at=o+ab.x*ax+ab.y*az,nw=n.x*ax+n.y*az;
 if(w<0.5){pitPos=vec3(0.0);pitNormal=vec3(0.0,1.0,0.0);pitUv=vec2(0.0);pitSun=0.0;pitFace=vec2(1.0,0.0);return;}
 float bottom=visualDepth(rowAt(cell)+2.0)+0.02+${g(P.floorRipple)}*pitShape,rb=${g(P.rimRound)}*pitShape,top=${g(P.lift)}+${g(P.heapLift)}*pitSpoil(cell,ax,az,ab),k=pitPart.z,y,off;vec3 nr=vec3(-nw.x,0.0,-nw.y);
 if(k<1.0){float a=k*1.5707963;off=-rb*sin(a);y=top-rb*(1.0-cos(a));if(rb>0.0001)nr=vec3(-nw.x*sin(a),cos(a),-nw.y*sin(a));}
 else{y=k>=99.0?-bottom:max(top-rb-(k-1.0),-bottom);float d=max(0.0,top-rb-y),x=d/${g(P.leanDepth)},e=exp(-x),L=${g(P.lean)}*pitShape*pitLeanAt(at),f=clamp(d/${g(P.rippleFade)},0.0,1.0),A=${g(P.ripple)}*pitShape*f*f*(3.0-2.0*f);vec3 gr;float r=pitRipple(vec3(at.x,y,at.y),gr);vec2 t=vec2(-nw.y,nw.x);float fs=A*dot(gr.xz,t);
  off=-rb-L*(1.0-(1.0+x)*e)+A*r;nr=vec3(-nw.x+fs*t.x,L*x*e/${g(P.leanDepth)}+A*gr.y,-nw.y+fs*t.y);}
 ab+=n*(${g(P.edgeNoise)}*pitNoise(at)+off);pitPos=w*vec3(ab.x,y,ab.y);pitNormal=normalize(vec3(dot(nr.xz,ax),nr.y,dot(nr.xz,az)));
 pitUv=vec2(1.0-abs(fract((at.x+at.y)*0.25)*2.0-1.0),clamp((y+bottom)/(top+bottom),0.0,1.0));pitSun=clamp(dot(-nw,vec2(${g(SUN[0])},${g(SUN[1])})),0.0,1.0);pitFace=abs(nw);}`,
 // A low berm of loose spoil just outside the edge, from the wall top down to the ground: a straight slope at shape 0, a rounded
 // shoulder (level where it meets the rounded rim, easing out onto the ground) at shape 1.
 lip:`varying float pitLipT;void pitBuild(){vec2 o,ax,az,n;float w;pitFrame(o,ax,az);vec2 cell=floor(o),ab=pitPiece(cell,ax,az,pitPart.x,pitPart.y,n,w),at=o+ab.x*ax+ab.y*az;
 if(w<0.5){pitPos=vec3(0.0);pitNormal=vec3(0.0,1.0,0.0);pitUv=vec2(0.0);pitLipT=0.0;return;}
 float sp=pitSpoil(cell,ax,az,ab),u=pitPart.z,W=pitPart.x>2.5?min(${g(Math.min(P.lipWidth,0.8*RI))}+${g(P.heapWidth)}*sp,${g(0.8*RI)}):${g(P.lipWidth)}+${g(P.heapWidth)}*sp,H=${g(P.lift)}+${g(P.heapLift)}*sp,G=0.004,c=1.0-u*u*(3.0-2.0*u),s=mix((H-G+0.004)/W,(H-G)*6.0*u*(1.0-u)/W,pitShape);
 ab+=n*(${g(P.edgeNoise)}*pitNoise(at)+W*u);pitPos=w*vec3(ab.x,mix(mix(H,G,u),G+(H-G)*c,pitShape),ab.y);pitNormal=normalize(vec3(n.x*s,1.0,n.y*s));pitUv=o+ab.x*ax+ab.y*az;pitLipT=u;}`,
 // The face between this cell and its +x neighbour (in the instance frame) where their floors do not blend: from the higher floor to the lower.
 step:`varying vec2 pitFace;void pitBuild(){vec2 o,ax,az;pitFrame(o,ax,az);pitFace=abs(ax);vec2 cell=floor(o),next=cell+ax;float u=pitPart.x,w=dugAt(cell)&&dugAt(next)?1.0:0.0,a=0.5,b=0.5*u;if(u!=0.0){bool p0=dugAt(cell+az*u),p1=dugAt(next+az*u);if(!(p0&&p1)){float e=p0||p1?${g(BE)}:${g(E)},s=p0||p1?${g(SA)}:1.0,noise=${g(P.edgeNoise)}*pitNoise(o+0.5*ax+az*u*e);b=u*(e+s*noise);if(p0!=p1)a+=(p0?1.0:-1.0)*${g(CA)}*noise;}}float k=2.0*b,d0=pitAlong(cell,ax,az,k),d1=pitAlong(next,-ax,az,k),y=-mix(min(d0,d1),max(d0,d1),pitPart.z);pitPos=w*vec3(a,y,b);pitNormal=vec3(1.0,0.0,0.0);pitUv=vec2(b+o.x+o.y,1.0-(-${g(V.depthScale)}*log(max(0.001,1.0+y/${g(V.depthMax)})))/${g(C.finalRow)});}`
};
// Columns of (piece, t, row) with the winding that faces the open hole (walls, steps) or the sky (lip). Rows come from pieceRows;
// straight runs take the layout's segments, the round pieces a quarter of C.pits.segments.
export function pieceGeometry(kind,layout=C.dirt.low){const part=[],pos=[],index=[],rows=pieceRows(kind,layout),NR=rows.length,arc=Math.max(2,P.segments/4),straight=Math.max(1,layout.segments|0),pieces=kind==='step'?[[0,2]]:[[0,straight],[1,straight],[2,arc],[3,arc]];
 for(const [piece,segments] of pieces){const base=part.length/3;for(let j=0;j<=segments;j++){const t=j/segments;for(const z of rows){part.push(kind==='step'?t*2-1:piece,kind==='step'?0:t,z);const th=t*Math.PI/2,a=kind==='step'?0.5:piece===0?t*0.5:piece===1?E:piece===2?E-R+R*Math.cos(th):E+RI-RI*Math.sin(th),b=kind==='step'?t-0.5:piece===0?E:piece===1?t*0.5:piece===2?E-R+R*Math.sin(th):E+RI-RI*Math.cos(th);pos.push(a,-Math.min(1,z),b);}}
  for(let j=0;j<segments;j++)for(let r=0;r+1<NR;r++){const top0=base+j*NR+r,bot0=top0+1,top1=top0+NR,bot1=top1+1,leftward=piece===0||piece===3;if(kind==='lip')index.push(...(leftward?[bot0,bot1,top1,bot0,top1,top0]:[top0,top1,bot1,top0,bot1,bot0]));else if(leftward||kind==='step')index.push(bot0,top0,top1,bot0,top1,bot1);else index.push(bot0,bot1,top1,bot0,top1,top0);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('pitPart',new T.Float32BufferAttribute(part,3));geometry.setIndex(index);return geometry;}
const hash=n=>{let h=Math.imul(n^0x9e3779b9,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return (h>>>0)/4294967296;};
export function createPits(){
 // The preset's look, shared by every pit shader as uniforms so a preset change never recompiles one: shape (rims, lean, ripple,
 // heave), detail (pebbles, sediment, clods) and the dirt textures they read (scene-assets.js).
 const look={pitShape:{value:0},pitDetail:{value:0},pitHeap:{value:0},pitRegolith:{value:0},pitGrit:{value:null},pitPebbles:{value:null},pitDust:{value:null}},layouts=new Map();let layout=C.dirt.low;
 const data=new Uint8Array(N*N*4),texture=new T.DataTexture(data,N,N,T.RGBAFormat);texture.magFilter=texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 // Loose spoil around every edge: 1 at the edge fading to 0 over C.pits.spoil, read with linear filtering by the ground shaders.
 const rimData=new Uint8Array(S*S*4),rim=new T.DataTexture(rimData,S,S,T.RGBAFormat);rim.magFilter=rim.minFilter=T.LinearFilter;rim.generateMipmaps=false;rim.needsUpdate=true;
 const rowAt=(x,z)=>x<0||z<0||x>=N||z>=N?0:data[(z*N+x)*4],open=new Uint8Array(S*S),changed=new Set();let all=true,rockList=[],gravel=1,gravelFrom=0,rocksStale=false,rockLift=new Float32Array(0),rockMeta=[],rocksVersion=0,liftsStale=false;
 // Spoil heaps. A dug cell's spoil is its rows dug as a share of heapRows, rooted and scaled by the preset's heaps: it raises and widens
 // the lip round the cell's edge (the shaders read rows) and piles into a mound on the side of the hole away from the hub, on solid
 // ground clear of every opening, of the middles of other undug cells and of anything the renderer marks blocked, with a smaller lump
 // beside it where that fits. heaps holds x, z, radius, height and turn of the mound and then of the lump for each cell (radius 0:
 // none), and over lists for each cell the cells whose mounds lie on it, so one dig re-places only its own mound, its neighbours' and
 // any lying over it.
 const heaps=new Float32Array(N*N*10),OVER=12,over=new Int16Array(N*N*OVER),overCount=new Uint8Array(N*N),heapStale=new Set(),heapChanged=new Set();let heapScale=0,blocked=()=>false,heapsLive=0;
 const spoil=i=>heapScale*Math.sqrt(Math.min(1,rowAt(i%N,Math.floor(i/N))/P.heapRows)),[HX,HZ]=C.ground.hub;
 function unregister(i){const k=i*10;if(!(heaps[k+2]>0))return;heapsLive--;for(let c=0;c<N*N;c++){const n=overCount[c];for(let m=0;m<n;m++)if(over[c*OVER+m]===i){over[c*OVER+m]=over[c*OVER+n-1];overCount[c]=n-1;break;}}heaps.fill(0,k,k+10);}
 function register(i,x,z,r){for(let oz=Math.max(0,Math.floor(z-r));oz<=Math.min(N-1,Math.floor(z+r));oz++)for(let ox=Math.max(0,Math.floor(x-r));ox<=Math.min(N-1,Math.floor(x+r));ox++){const c=oz*N+ox;let seen=false;for(let m=0;m<overCount[c];m++)seen||=over[c*OVER+m]===i;if(!seen&&overCount[c]<OVER)over[c*OVER+overCount[c]++]=i;}}
 function fits(i,x,z,r){if(x-r<0.05||z-r<0.05||x+r>N-0.05||z+r>N-0.05)return false;for(let j=0;j<=8;j++){const a=j*Math.PI/4,px=j<8?x+Math.cos(a)*r*0.92:x,pz=j<8?z+Math.sin(a)*r*0.92:z,c=Math.floor(pz)*N+Math.floor(px);if(pitSdf(rowAt,px,pz)<0.02||blocked(c))return false;}
  for(let cz=Math.floor(z)-1;cz<=Math.floor(z)+1;cz++)for(let cx=Math.floor(x)-1;cx<=Math.floor(x)+1;cx++){if(cx<0||cz<0||cx>=N||cz>=N||cz*N+cx===i||rowAt(cx,cz)>=P.mergeRow)continue;if(Math.hypot(x-cx-0.5,z-cz-0.5)<r*0.8+P.heapGap)return false;}return true;}
 function placeHeap(i){unregister(i);heapChanged.add(i);const cx=i%N,cz=Math.floor(i/N),row=rowAt(cx,cz);if(row<P.mergeRow||heapScale<=0)return;const A=Math.min(1,row/P.heapRows),r=P.heapRadius[0]+(P.heapRadius[1]-P.heapRadius[0])*Math.pow(A,0.75),h=P.heapHeight*heapScale*Math.pow(A,0.75),dx=cx+0.5-HX,dz=cz+0.5-HZ,base=(Math.abs(dx)+Math.abs(dz)>0.01?Math.atan2(dz,dx):Math.PI/2)+(hash(i*3+1)-0.5)*0.5;
  for(const turn of [0,0.45,-0.45,0.9,-0.9,1.35,-1.35])for(let t=E+r*0.7;t<=P.heapReach;t+=0.08){const x=cx+0.5+Math.cos(base+turn)*t,z=cz+0.5+Math.sin(base+turn)*t;if(!fits(i,x,z,r))continue;
   const k=i*10;heaps[k]=x;heaps[k+1]=z;heaps[k+2]=r;heaps[k+3]=h;heaps[k+4]=hash(i*7+3)*Math.PI*2;heapsLive++;register(i,x,z,r);
   // The lump sits to one side of the mound, a little further from the hole.
   const r2=r*P.heapLump,side=hash(i*5+2)<0.5?-1:1,a=base+turn+side*1.1,x2=x+Math.cos(a)*r*0.75,z2=z+Math.sin(a)*r*0.75;if(fits(i,x2,z2,r2)){heaps[k+5]=x2;heaps[k+6]=z2;heaps[k+7]=r2;heaps[k+8]=h*0.72;heaps[k+9]=hash(i*11+5)*Math.PI*2;register(i,x2,z2,r2);}return;}}
 // Height of the mounds at a point (their dome profile, the highest where two overlap).
 function heapAt(x,z){if(x<0||z<0||x>=N||z>=N)return 0;const c=Math.floor(z)*N+Math.floor(x),n=overCount[c];let top=0;for(let m=0;m<n;m++)for(let k=over[c*OVER+m]*10,e=k+10;k<e;k+=5){if(!(heaps[k+2]>0))continue;const d2=((x-heaps[k])**2+(z-heaps[k+1])**2)/(heaps[k+2]*heaps[k+2]);if(d2<1)top=Math.max(top,heaps[k+3]*Math.pow(1-d2,1.5));}return top;}
 // The lip's top over a point push beyond the edge of cell i (0 past the lip), and the height of the ground a rock rests on there.
 function lipTop(i,push){if(look.pitShape.value<=0&&heapScale<=0)return 0;const sp=spoil(i),W=P.lipWidth+P.heapWidth*sp;return push<W?lipHeight(Math.max(0,push)/W,look.pitShape.value,P.lift+P.heapLift*sp):0;}
 function settleHeaps(){if(!heapStale.size)return false;for(const i of heapStale)placeHeap(i);heapStale.clear();liftsStale=true;return true;}
 // Rocks scattered on the spoil just outside each edge piece: [x, z, size] triples, the same every time for the same holes, inner fillets included. Then finer
 // gravel, thrown further out and thinning with distance, scaled by the graphics preset's gravel level (none on low).
 function rimRocks(){const out=[],fine=[],outMeta=[],fineMeta=[],max=N*N*P.rubblePerCell*3,maxFine=N*N*P.gravelPerCell*3*Math.min(1,gravel);for(let i=0;i<N*N;i++){const cx=i%N,cz=Math.floor(i/N);if(rowAt(cx,cz)<P.mergeRow)continue;for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){const X=rowAt(cx+sx,cz)>=P.mergeRow,Z=rowAt(cx,cz+sz)>=P.mergeRow,D=rowAt(cx+sx,cz+sz)>=P.mergeRow,pieces=edgePieces(X,Z,D),runs=[];if(pieces.alongB)runs.push([pieces.alongB[1]-pieces.alongB[0],h=>[pieces.alongB[0]+(pieces.alongB[1]-pieces.alongB[0])*h,E,0,1]]);if(pieces.alongA)runs.push([pieces.alongA[1]-pieces.alongA[0],h=>[E,pieces.alongA[0]+(pieces.alongA[1]-pieces.alongA[0])*h,1,0]]);if(pieces.corner)runs.push([R*Math.PI/2,h=>[E-R+R*Math.cos(h*Math.PI/2),E-R+R*Math.sin(h*Math.PI/2),Math.cos(h*Math.PI/2),Math.sin(h*Math.PI/2)]]);if(pieces.inner){const {f,th}=pieces.inner;runs.push([RI*(th[1]-th[0]),h=>{const t=th[0]+(th[1]-th[0])*h;return [f[0]+RI*Math.cos(t),f[1]+RI*Math.sin(t),-Math.cos(t),-Math.sin(t)];}]);}
  runs.forEach(([length,at],r)=>{const count=Math.round(length*P.rubbleDensity);for(let n=0;n<count&&out.length<max;n++){const seed=((i*4+(sx+1)+(sz+1)/2)*4+r)*16+n,[a,b,na,nb]=at((n+hash(seed))/count),x0=cx+0.5+sx*a,z0=cz+0.5+sz*b,push=P.edgeNoise*pitNoise(x0,z0)+P.lipWidth*0.6+hash(seed+7)*(P.spoil*0.75-P.lipWidth*0.6),x=x0+sx*na*push,z=z0+sz*nb*push;if(x<0.05||z<0.05||x>N-0.05||z>N-0.05||pitSdf(rowAt,x,z)<0.03)continue;out.push(x,z,P.rubbleSize*(0.45+hash(seed+13)*0.9));outMeta.push(i,push-P.edgeNoise*pitNoise(x0,z0));}
   const grit=Math.round(length*P.gravelDensity*gravel);for(let n=0;n<grit&&fine.length<maxFine;n++){const seed=(((i*4+(sx+1)+(sz+1)/2)*4+r)*64+n)*7+5,[a,b,na,nb]=at((n+hash(seed))/grit),x0=cx+0.5+sx*a,z0=cz+0.5+sz*b,push=P.edgeNoise*pitNoise(x0,z0)+P.lipWidth*0.4+Math.pow(hash(seed+3),1.7)*P.gravelReach,x=x0+sx*na*push+(hash(seed+5)-0.5)*0.06,z=z0+sz*nb*push+(hash(seed+9)-0.5)*0.06;if(x<0.05||z<0.05||x>N-0.05||z>N-0.05||pitSdf(rowAt,x,z)<0.02)continue;fine.push(x,z,P.gravelSize*(0.5+hash(seed+11)));fineMeta.push(i,push-P.edgeNoise*pitNoise(x0,z0));}});}}gravelFrom=out.length;rockMeta=outMeta.concat(fineMeta);return out.concat(fine);}
 // Only cells within one of a newly broken cell can change shape, and only texels within the band of those can change shade.
 function refresh(){if(!all&&!changed.size)return;const reach=Math.ceil(P.spoil*K),boxes=all?[[0,0,N-1,N-1]]:[...changed].map(i=>[i%N-1,Math.floor(i/N)-1,i%N+1,Math.floor(i/N)+1]),span=(a,b,m)=>[Math.max(0,a*K-m),Math.min(S,(b+1)*K+m)];all=false;changed.clear();
  for(const [ax,az,bx,bz] of boxes){const [i0,i1]=span(ax,bx,0),[j0,j1]=span(az,bz,0);for(let j=j0;j<j1;j++)for(let i=i0;i<i1;i++)open[j*S+i]=pitSdf(rowAt,(i+0.5)/K,(j+0.5)/K)<0?1:0;}
  for(const [ax,az,bx,bz] of boxes){const [i0,i1]=span(ax,bx,reach),[j0,j1]=span(az,bz,reach);for(let j=j0;j<j1;j++)for(let i=i0;i<i1;i++){let best=open[j*S+i]?0:Infinity;for(let dj=-reach;dj<=reach&&best;dj++)for(let di=-reach;di<=reach;di++){const x=i+di,y=j+dj;if(x>=0&&y>=0&&x<S&&y<S&&open[y*S+x])best=Math.min(best,Math.hypot(di,dj));}const t=Math.max(0,best-0.5)/K/P.spoil;rimData[(j*S+i)*4]=t<1?Math.round(255*(1-t*t*(3-2*t))):0;}}
  rim.needsUpdate=true;rockList=rimRocks();rocksStale=false;liftRocks();}
 // Rocks rest on the lip and the mounds: their lift over the ground, kept beside the list (one per rock), and a version that changes
 // whenever the list or the lifts do.
 function liftRocks(){const count=rockList.length/3;if(rockLift.length<count)rockLift=new Float32Array(Math.max(count,rockLift.length*2));for(let k=0;k<count;k++)rockLift[k]=Math.max(lipTop(rockMeta[k*2],rockMeta[k*2+1]),heapAt(rockList[k*3],rockList[k*3+1]));rocksVersion++;liftsStale=false;}
 function decorate(material,kind){const before=material.onBeforeCompile;material.onBeforeCompile=shader=>{before?.(shader);shader.uniforms.pitRows={value:texture};shader.uniforms.pitRim={value:rim};Object.assign(shader.uniforms,look);const pieces=kind==='wall'||kind==='step'||kind==='lip';
  shader.vertexShader=common+'\n'+(kind==='floor'||kind==='step'?blend+'\n':'')+(kind==='floor'?floorBuild+'\n':'')+(pieces?frame+'\n'+build[kind]+'\n#define position pitPos\n#define normal pitNormal\n#define uv pitUv\n':'')+shader.vertexShader;
  if(pieces)shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {\n pitBuild();').replace('wallSunward=sunward;','wallSunward=pitSun;');
  if(kind==='floor')shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {\n pitFloorBuild();').replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n objectNormal=pitFloorNormal;');
  // Dirt, not boards: the strata lines wander a little and the wall face is clumpy.
  if(kind==='step')shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replaceAll('vMapUv','(vMapUv-vec2(0.0,'+g(P.strataWobble/C.finalRow)+'*(sin((pitWorld.x+pitWorld.z)*2.1)+0.5*sin((pitWorld.x-pitWorld.z)*4.7+1.3))))'));
  if(kind==='wall')shader.fragmentShader=shader.fragmentShader.replace('vec2 strataUv=vec2(vMapUv.x,1.0-actualRow/','vec2 strataUv=vec2(vMapUv.x,1.0-(actualRow+'+g(P.strataWobble)+'*(sin((pitWorld.x+pitWorld.z)*2.1)+0.5*sin((pitWorld.x-pitWorld.z)*4.7+1.3)))/');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+(kind==='floor'?'transformed.y+=pitLift;':'')+'\n#ifdef USE_INSTANCING\n pitWorld=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;\n#else\n pitWorld=(modelMatrix*vec4(transformed,1.0)).xyz;\n#endif\n');
  shader.fragmentShader=(kind==='lip'?'varying float pitLipT;\n':kind==='wall'||kind==='step'?'varying vec2 pitFace;\n':'')+common+'\n'+shader.fragmentShader;
  // Spoil: the ground near an edge turns to looser, warmer, clumpier dirt; dug floors darken toward their walls.
  const spoil=`float spoil=texture2D(pitRim,pitWorld.xz/${g(N)}).r;diffuseColor.rgb*=mix(vec3(1.0),vec3(${P.spoilTint.map(g).join(',')}),spoil)*(1.0+${g(P.spoilClumps)}*spoil*pitNoise(pitWorld.xz*2.7));`;
  const mask={sky:'if(pitEdge(pitWorld.xz)>0.0)discard;',cap:'float pitE=pitEdge(pitWorld.xz);if(pitE<0.0)discard;',floor:`bool pitDug=rowAt(floor(pitWorld.xz))>0.5;float pitE=pitDug?pitEdge(pitWorld.xz):-1.0;if(pitE>${g(P.floorBias)})discard;`}[kind]||'';
  const tint={cap:spoil,floor:`if(pitDug)diffuseColor.rgb*=mix(${g(P.floorShade)},1.0,smoothstep(0.0,0.32,-pitE));else{${spoil}}`,wall:`diffuseColor.rgb*=1.0+${g(P.wallClumps)}*pitNoise(vec2(pitWorld.x+pitWorld.z,pitWorld.y*1.7)*3.0);`,step:`diffuseColor.rgb*=1.0+${g(P.wallClumps)}*pitNoise(vec2(pitWorld.x+pitWorld.z,pitWorld.y*1.7)*3.0);`,lip:`diffuseColor.rgb*=vec3(${P.spoilTint.map(g).join(',')})*mix(${g(P.lipShade)},1.0,smoothstep(0.0,0.6,pitLipT))*(1.0+${g(P.spoilClumps)}*pitNoise(pitWorld.xz*2.7));`}[kind]||'';
  // Pebbles and fine sediment bands in walls and step faces, clods in dug floors (scene-assets.js dirt textures, scaled by the preset's
  // detail): colour here, relief once the normal map is applied, as a tilt in world space so it never depends on how the wall's own
  // texture runs. Walls blend the two side-on projections of the pebbles by which way the face looks (pitFace).
  const face=kind==='wall'||kind==='step',detail=face?`vec4 pitPeb=vec4(0.5,0.5,0.5,0.0);vec3 pitTan=vec3(1.0,0.0,0.0);if(pitDetail>0.0){vec2 fw=pitFace*pitFace;fw*=fw;fw/=max(0.0001,fw.x+fw.y);pitPeb=texture2D(pitPebbles,pitWorld.zy*${g(P.pebbleScale)})*fw.x+texture2D(pitPebbles,pitWorld.xy*${g(P.pebbleScale)})*fw.y;pitTan=normalize(vec3(fw.y,0.0,fw.x));
   vec3 stone=mix(vec3(dot(diffuseColor.rgb,vec3(0.3333))),diffuseColor.rgb,0.35)*(0.5+0.95*pitPeb.b);diffuseColor.rgb=mix(diffuseColor.rgb,stone,smoothstep(0.3,0.8,pitPeb.a)*${g(P.pebbles)}*pitDetail)*(1.0-1.2*pitPeb.a*(1.0-pitPeb.a)*pitDetail);
   float sf=pitWorld.y*${g(P.sedimentFreq)}+1.7*pitNoise(pitWorld.xz*2.3+pitWorld.y*0.5);diffuseColor.rgb*=1.0+${g(P.sediment)}*pitDetail*clamp(1.0-fwidth(sf)*0.6,0.0,1.0)*(0.6*sin(sf)+0.4*sin(sf*2.7+1.3));
   ${kind==='wall'?`diffuseColor.rgb=mix(diffuseColor.rgb,vec3(${DUST.map(g).join(',')})*(0.9+0.2*pitPeb.b),${g(P.dustCap)}*pitDetail*smoothstep(${g(-P.dustCapDepth)},0.0,pitWorld.y+0.3*${g(P.dustCapDepth)}*pitNoise(pitWorld.xz*4.1)));`:''}}`
   :kind==='floor'?`vec4 pitGr=vec4(0.5,0.5,0.5,0.0);if(pitDug&&pitDetail>0.0){pitGr=texture2D(pitGrit,pitWorld.xz*${g(P.clodScale)});diffuseColor.rgb*=1.0+${g(P.clodTone)}*pitDetail*(pitGr.b-0.5);}`:'',
   bump=face?`if(pitDetail>0.0){vec2 pn=(pitPeb.xy*2.0-1.0)*${g(P.pebbleNormal)}*pitDetail;normal=normalize(normal+(viewMatrix*vec4(pitTan*pn.x+vec3(0.0,pn.y,0.0),0.0)).xyz);}`
   :kind==='floor'?`if(pitDug&&pitDetail>0.0){vec2 cn=(pitGr.xy*2.0-1.0)*${g(P.clodNormal)}*pitDetail;normal=normalize(normal+(viewMatrix*vec4(cn.x,0.0,cn.y,0.0)).xyz);}`
   :kind==='lip'?`if(pitDetail>0.0){vec4 lc=texture2D(pitGrit,pitWorld.xz*${g(P.clodScale)});vec2 cn=(lc.xy*2.0-1.0)*${g(P.clodNormal)}*pitDetail;normal=normalize(normal+(viewMatrix*vec4(cn.x,0.0,cn.y,0.0)).xyz);diffuseColor.rgb*=1.0+${g(P.clodTone)}*pitDetail*(lc.b-0.5);}`:'';
  // The plain's top layer of dust (caps and undug floors, where the ground shader has set its bump strength groundN): grain and small
  // dimples from the dust texture, looked up a touch off along the view where the bumps are strong (parallax, High only), smoothed on the churned
  // spoil round holes and mostly gone under the finale's meadow; a tilt of the normal, a little light and shade, and roughness that
  // follows them.
  const GD=C.ground,meadow=shader.fragmentShader.includes('uniform float winRadius')?'*(0.2+0.8*smoothstep(winRadius-0.8,winRadius,distance(pitWorld.xz,winOrigin)))':'',regolith=(kind==='cap'||kind==='floor')&&shader.fragmentShader.includes('float groundN')?`if(pitRegolith>0.0${kind==='floor'?'&&!pitDug':''}){vec3 eye=normalize(cameraPosition-pitWorld);float k=pitRegolith*groundN*(1.0-${g(GD.dustSpoil)}*texture2D(pitRim,pitWorld.xz/${g(N)}).r)${meadow};vec2 du=(pitWorld.xz+0.21*vec2(sin(pitWorld.z*0.73+1.7),sin(pitWorld.x*0.61)))*${g(GD.dustScale)};if(pitRegolith>0.75)du+=eye.xz/max(eye.y,0.3)*(texture2D(pitDust,du).b-0.5)*${g(GD.dustDepth*GD.dustScale)}*k;vec4 rd=texture2D(pitDust,du);vec2 rn=(rd.xy*2.0-1.0)*${g(GD.dustNormal)}*k;normal=normalize(normal+(viewMatrix*vec4(rn.x,0.0,rn.y,0.0)).xyz);diffuseColor.rgb*=1.0+${g(GD.dustTone)}*k*(rd.b-0.6);roughnessFactor=clamp(roughnessFactor*(0.9+0.12*rd.b),0.0,1.0);}`:'';
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+mask).replace('#include <color_fragment>','#include <color_fragment>\n'+tint+detail);
  if(bump||regolith)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps).replace('normal = normalize( tbn * mapN );','normal = normalize( tbn * mapN );\n'+bump+regolith);};material.customProgramCacheKey=()=>kind+'-joined-pits';}
 return {texture,rim,update(index,row){const r=Math.min(255,row),was=data[index*4],opened=(was>=P.mergeRow)!==(r>=P.mergeRow);if(opened)changed.add(index);data[index*4]=r;texture.needsUpdate=true;
   if(opened){const cx=index%N,cz=Math.floor(index/N);for(let z=Math.max(0,cz-1);z<=Math.min(N-1,cz+1);z++)for(let x=Math.max(0,cx-1);x<=Math.min(N-1,cx+1);x++)heapStale.add(z*N+x);for(let m=0;m<overCount[index];m++)heapStale.add(over[index*OVER+m]);}
   else if(Math.min(was,P.heapRows)!==Math.min(r,P.heapRows))heapStale.add(index);},
  reset(){data.fill(0);texture.needsUpdate=true;all=true;for(let i=0;i<N*N;i++)if(heaps[i*10+2]>0)heapChanged.add(i);heaps.fill(0);overCount.fill(0);heapStale.clear();heapsLive=0;},refresh,rocks(){refresh();settleHeaps();if(rocksStale){rockList=rimRocks();rocksStale=false;liftRocks();}else if(liftsStale)liftRocks();return rockList;},
  // Each rock's lift onto the lip or a mound (rocks()[k*3] is rock k), and a number that changes whenever the rocks or their lifts do.
  rockLift(k){return rockLift[k]||0;},get rocksVersion(){return rocksVersion;},
  // Spoil mounds: for each cell whose mound changed since the last call, fn(key, x, z, radius, height, turn, cell) for its mound (key
  // cell*2) and its lump (key cell*2+1), radius 0 for none;
  // the height of the mounds at a point; how many mounds there are; and which cells they must keep off (blocked(i), from the renderer).
  heapChanges(fn){settleHeaps();for(const i of heapChanged)for(let j=0;j<2;j++){const k=i*10+j*5;fn(i*2+j,heaps[k],heaps[k+1],heaps[k+2],heaps[k+3],heaps[k+4],i);}const n=heapChanged.size;heapChanged.clear();return n;},
  heapAt,get heapCount(){return heapsLive;},
  // How churned the ground is at a point: the spoil band, 1 at an opening's edge fading to 0 C.pits.spoil away from it.
  spoilAt(x,z){const i=Math.floor(x*K),j=Math.floor(z*K);return i<0||j<0||i>=S||j>=S?0:rimData[(j*S+i)*4]/255;},setBlocked(fn){blocked=fn||(()=>false);for(let i=0;i<N*N;i++)if(rowAt(i%N,Math.floor(i/N))>=P.mergeRow)heapStale.add(i);},
  // How far the target ring over a cell must float to clear its lip and any mound under it.
  ringLift(i){const cx=i%N,cz=Math.floor(i/N);let lift=rowAt(cx,cz)>=P.mergeRow?lipTop(i,P.targetRadius-E):0;for(let j=0;j<8;j++){const a=j*Math.PI/4;lift=Math.max(lift,heapAt(cx+0.5+Math.cos(a)*P.targetGlowRadius,cz+0.5+Math.sin(a)*P.targetGlowRadius));}return lift;},
  // Where gravel starts in the rocks list (an index into it, a multiple of 3), and the preset's gravel level (0 to 1).
  gravelFrom(){return gravelFrom;},setGravel(level){const next=Math.max(0,Math.min(1,level||0));if(next!==gravel){gravel=next;rocksStale=true;}},decorate,wall:pieceGeometry('wall'),lip:pieceGeometry('lip'),step:pieceGeometry('step'),
  // A preset's look (C.dirt): sets the shared uniforms and returns its layout. geometry(kind) is the wall or lip piece for that
  // layout (built once per layout); the original pieces above are Low's.
  setLook(level){layout=C.dirt[level]||C.dirt.low;look.pitShape.value=layout.shape;look.pitDetail.value=layout.detail;look.pitHeap.value=layout.heaps;look.pitRegolith.value=layout.regolith;if(heapScale!==layout.heaps){heapScale=layout.heaps;for(let i=0;i<N*N;i++)if(rowAt(i%N,Math.floor(i/N))>=P.mergeRow||heaps[i*10+2]>0)heapStale.add(i);}liftsStale=true;return layout;},setDirt({grit=null,pebbles=null,dustLayer=null}={}){look.pitGrit.value=grit;look.pitPebbles.value=pebbles;look.pitDust.value=dustLayer;},
  geometry(kind,level){const l=C.dirt[level]||layout,key=kind+':'+(C.dirt[level]?level:JSON.stringify(l));if(!layouts.has(key))layouts.set(key,l===C.dirt.low?(kind==='wall'?this.wall:kind==='lip'?this.lip:this.step):pieceGeometry(kind,l));return layouts.get(key);},
  get layout(){return layout;},get look(){return look;},
  // How far the wall stands out from the edge at an edge point and height, for the current preset, and how far from a cell's
  // centre (cx, cz) toward a solid side (dx, dz) its wall stands at height y, edge noise included (lamps hang on it).
  wallOffset(x,z,y){return wallOffset(x,z,y,look.pitShape.value);},
  wallReach(cx,cz,dx,dz,y){const x=cx+dx*E,z=cz+dz*E,i=Math.floor(cz)*N+Math.floor(cx);return E+P.edgeNoise*pitNoise(x,z)+wallOffset(x,z,y,look.pitShape.value,P.lift+P.heapLift*(i>=0&&i<N*N?spoil(i):0));}};
}
