import * as T from './vendor/three.module.js';
import {C} from '../config.js';
// The surface ground's large-scale look, baked into one small texture over the claim and the dunes ring round it. The ground shaders read
// it with a single texture fetch, so it adds no draw calls. Red is a broad brightness mottle with darker patches of fine dust, pale wind
// streaks and ejecta round the big craters; green is ground worn by traffic (a ring round the hub, strips along conveyor lines, faint
// paths from the hub to the drill and the pumps); blue shifts the grey a touch warmer or cooler; alpha sets the strength of the regolith
// bumps (rough rocky ground against smooth dust). Everything is seeded, so every player sees the same ground. Only the worn channel
// changes in play, when belts, pumps or the drill site change, and that rebuild is throttled.
const G=C.ground,N=C.mapSize;
export const GROUND_SPAN=N+2*G.margin,GROUND_SIZE=Math.round(GROUND_SPAN*G.texels);
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);},byte=v=>Math.round(255*Math.min(1,Math.max(0,v)));
function hash(ix,iz,seed){let h=(Math.imul(ix|0,374761393)+Math.imul(iz|0,668265263)+Math.imul(seed|0,1274126177))|0;h=Math.imul(h^(h>>>13),1103515245);return ((h^(h>>>16))>>>0)/4294967296;}
// Smooth value noise in 0..1.
export function valueNoise(x,z,seed){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz),a=hash(ix,iz,seed),b=hash(ix+1,iz,seed),c=hash(ix,iz+1,seed),d=hash(ix+1,iz+1,seed);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;}
function random(seed){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^(s>>>15),s|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
// The world coordinate at the middle of texel i, and the (fractional) texel at a world coordinate. The same on both axes.
export const texelWorld=i=>(i+0.5)/G.texels-G.margin,worldTexel=x=>(x+G.margin)*G.texels-0.5;
// What the shaders make of a texel: brightness factor, warm (1) or cool (0) grey, worn amount and bump strength.
export const decodeGround=(data,k)=>({albedo:0.6+0.8*data[k]/255,worn:data[k+1]/255,warmth:data[k+2]/255,bumps:G.normalRange[0]+(G.normalRange[1]-G.normalRange[0])*data[k+3]/255});

// Bakes the mottle, warmth and bumps, and the hub's worn ring into green.
export function bakeGround(seed=G.seed){
 const S=GROUND_SIZE,data=new Uint8Array(S*S*4),hub=new Uint8Array(S*S),rnd=random(seed);
 const patches=Array.from({length:G.patches},()=>({x:-1+rnd()*(N+2),z:-1+rnd()*(N+2),r:G.patchRadius[0]+rnd()*(G.patchRadius[1]-G.patchRadius[0]),e:0.55+rnd()*0.6,a:rnd()*Math.PI}));
 const drifts=Array.from({length:G.drifts},()=>({x:-3+rnd()*(N+6),z:-3+rnd()*(N+6),len:1.6+rnd()*2.6,w:0.35+rnd()*0.4,a:rnd()*Math.PI}));
 for(let j=0;j<S;j++){const z=texelWorld(j);for(let i=0;i<S;i++){const x=texelWorld(i),k=(j*S+i)*4;
  let tone=0;for(let o=0;o<G.albedo.length;o++)tone+=G.albedo[o]*(2*valueNoise(x/G.albedoScales[o],z/G.albedoScales[o],seed+o*31)-1);
  const wobble=0.3*(valueNoise(x*1.4,z*1.4,seed+97)-0.5);
  let dust=0;for(const p of patches){const dx=x-p.x,dz=z-p.z;if(dx*dx+dz*dz>p.r*p.r*2.2)continue;const c=Math.cos(p.a),s=Math.sin(p.a);dust=Math.max(dust,1-smooth(0.45,1,Math.hypot((dx*c+dz*s)/p.r,(dz*c-dx*s)/(p.r*p.e))+wobble));}
  let drift=0;for(const d of drifts){const dx=x-d.x,dz=z-d.z;if(dx*dx+dz*dz>d.len*d.len*1.1)continue;const c=Math.cos(d.a),s=Math.sin(d.a);drift=Math.max(drift,(1-smooth(0.3,1,Math.abs((dx*c+dz*s)/d.len)))*(1-smooth(0.2,1,Math.abs((dz*c-dx*s)/d.w)+wobble*0.5)));}
  let ejecta=0;for(const [cx,cz,r] of C.visual.largeCraters){const d=Math.hypot(x-cx,z-cz)/r;if(d<0.8||d>2.8)continue;const a=Math.atan2(z-cz,x-cx),rays=0.55+0.45*Math.cos(a*7+cx*1.3)*Math.cos(a*3-cz*0.7);ejecta=Math.max(ejecta,smooth(0.8,1.05,d)*(1-smooth(1.1,2.8,d))*rays);}
  const albedo=1+tone-G.patchDark*dust+G.driftLight*drift+G.ejecta*ejecta,bumps=(1-0.55*dust)*(1-0.45*drift)*(0.8+0.5*valueNoise(x/1.7,z/1.7,seed+53)),warmth=0.5+0.9*(valueNoise(x/4.3,z/4.3,seed+71)-0.5)+0.25*dust-0.2*ejecta;
  data[k]=byte((albedo-0.6)/0.8);data[k+2]=byte(warmth);data[k+3]=byte((bumps-G.normalRange[0])/(G.normalRange[1]-G.normalRange[0]));
  const hx=Math.abs(x-G.hub[0]),hz=Math.abs(z-G.hub[1]);if(hx>G.hubRing[1]+0.3||hz>G.hubRing[1]+0.3)continue;const ring=Math.pow(hx**4+hz**4,0.25)+0.35*(valueNoise(x*1.1,z*1.1,seed+11)-0.5);
  data[k+1]=hub[j*S+i]=byte(G.hubWear*smooth(G.hubRing[0]-0.2,G.hubRing[0]+0.15,ring)*(1-smooth(G.hubRing[1]-0.9,G.hubRing[1],ring))*(0.7+0.3*valueNoise(x*2.3,z*2.3,seed+13)));}}
 return {size:S,data,hub};
}
// The strips worn by traffic: one along every conveyor segment (a belt cell to its next cell) and a faint path from the hub to the drill
// site and to each pump, as [ax, az, bx, bz, width, wear].
export function wearStrips({belts={},site=null,pumps=[]}={}){
 const strips=[],[hx,hz]=G.hub;
 for(const key in belts){const i=Number(key),next=belts[key]?.next,x=i%N+0.5,z=Math.floor(i/N)+0.5;strips.push([x,z,next==null?x:next%N+0.5,next==null?z-0.5:Math.floor(next/N)+0.5,G.beltWidth,G.beltWear]);}
 if(site!=null)strips.push([hx,hz,site%N+0.5,Math.floor(site/N)+0.5,G.pathWidth,G.pathWear]);
 for(const i of pumps)strips.push([hx,hz,i%N+0.5,Math.floor(i/N)+0.5,G.pathWidth*0.8,G.pathWear*0.8]);
 return strips;
}
// Rewrites the worn (green) channel: the hub's ring, then each strip, keeping the strongest wear where they cross.
export function wearGround(baked,strips){
 const {size:S,data,hub}=baked;for(let t=0;t<S*S;t++)data[t*4+1]=hub[t];
 for(const [ax,az,bx,bz,w,wear] of strips){const dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz||1,i0=Math.max(0,Math.floor(worldTexel(Math.min(ax,bx)-w))),i1=Math.min(S-1,Math.ceil(worldTexel(Math.max(ax,bx)+w))),j0=Math.max(0,Math.floor(worldTexel(Math.min(az,bz)-w))),j1=Math.min(S-1,Math.ceil(worldTexel(Math.max(az,bz)+w)));
  for(let j=j0;j<=j1;j++){const z=texelWorld(j);for(let i=i0;i<=i1;i++){const x=texelWorld(i),t=Math.min(1,Math.max(0,((x-ax)*dx+(z-az)*dz)/len2)),d=Math.hypot(x-ax-dx*t,z-az-dz*t)+0.12*(valueNoise(x*2.1,z*2.1,G.seed+5)-0.5),v=byte(wear*(1-smooth(w*0.35,w,d))),k=(j*S+i)*4+1;if(v>data[k])data[k]=v;}}}
 return baked;
}
// A cheap signature of everything the worn channel depends on, read without allocating.
export function wearSignature(state){let sig=state?.team?.site??-1,n=0;const belts=state?.belts||{};for(const key in belts){n++;sig=(sig*31+Number(key)*7+(belts[key]?.next??-1)+3)%1000000007;}const cells=state?.cells||[];for(let i=0;i<cells.length;i++)if(cells[i]?.pumpBuilt)sig=(sig*17+i+1)%1000000007;return sig*1000+n;}

// The texture and its upkeep. update(state, now) rebuilds the worn channel when the signature changes, at most once per rebakeMs.
export function createGroundDetail(){
 const baked=bakeGround(),texture=new T.DataTexture(baked.data,baked.size,baked.size,T.RGBAFormat);texture.colorSpace=T.NoColorSpace;texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
 let signature=null,wanted=null,builtAt=-Infinity;
 return {texture,baked,
  update(state,now=performance.now()){const next=wearSignature(state);if(next!==signature)wanted=next;if(wanted===null||now-builtAt<G.rebakeMs)return false;signature=wanted;wanted=null;builtAt=now;
   const pumps=[];for(let i=0;i<(state?.cells?.length||0);i++)if(state.cells[i]?.pumpBuilt)pumps.push(i);wearGround(baked,wearStrips({belts:state?.belts,site:state?.team?.site??null,pumps}));texture.needsUpdate=true;return true;},
  reset(){signature=wanted=null;builtAt=-Infinity;wearGround(baked,[]);texture.needsUpdate=true;}};
}
// Dirt detail for pit-geometry.js and the renderer, seeded so every player sees the same dirt: three tiling textures with their relief
// as a normal (red, green). grit is
// clumpy loose dirt (lumps of tileable value noise with fine grains), its height in blue; pebbles are round stones, a shade of their
// own in blue and their mask in alpha; dust (dustLayer) is the plain's top layer, fine grain pocked with small shallow dimples that have a soft
// raised rim, its height in blue. Dug floors, lips and mounds read grit, walls pebbles, the plain dust, at their own scales; mipmaps
// let them fade out smoothly with distance.
export function dirtFields(size=256,seed=17){const S=size,lumps=new Float32Array(S*S),stones=new Float32Array(S*S),mask=new Float32Array(S*S),shade=new Float32Array(S*S),dust=new Float32Array(S*S);let s=seed>>>0;const rnd=()=>{s=(Math.imul(s^(s>>>15),2246822519)+0x9e3779b9)>>>0;return s/4294967296;};
 for(const [cells,amp] of [[8,1],[16,0.55],[32,0.3],[64,0.16]]){const grid=Float32Array.from({length:cells*cells},rnd),step=S/cells;for(let y=0;y<S;y++){const gy=y/step,iy=Math.floor(gy),fy=gy-iy,v=fy*fy*(3-2*fy),r0=(iy%cells)*cells,r1=((iy+1)%cells)*cells;for(let x=0;x<S;x++){const gx=x/step,ix=Math.floor(gx),fx=gx-ix,u=fx*fx*(3-2*fx),c0=ix%cells,c1=(ix+1)%cells;lumps[y*S+x]+=amp*step*0.22*((grid[r0+c0]*(1-u)+grid[r0+c1]*u)*(1-v)+(grid[r1+c0]*(1-u)+grid[r1+c1]*u)*v);}}}
 const stamp=(field,cx,cy,r,amp,pebble,tone)=>{const R=Math.ceil(r),x0=Math.floor(cx),y0=Math.floor(cy);for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){const d2=(dx*dx+dy*dy)/(r*r);if(d2>=1)continue;const i=((y0+dy+S)%S)*S+(x0+dx+S)%S,v=amp*r*Math.sqrt(1-d2);if(pebble){if(v>field[i]){field[i]=v;shade[i]=tone;}mask[i]=Math.max(mask[i],Math.min(1,(1-d2)*3));}else field[i]+=v;}};
 for(let i=0;i<Math.round(S*S/22);i++)stamp(lumps,rnd()*S,rnd()*S,0.8+rnd()*1.3,(rnd()-0.35)*0.8,false);
 // Stones: irregular, flat topped with bevelled edges, each its own shade; the higher one wins where two overlap.
 for(let n=0;n<Math.round(S*S/220);n++){const cx=rnd()*S,cy=rnd()*S,r=1.6+rnd()*rnd()*5.5,e=0.6+rnd()*0.4,a=rnd()*Math.PI,p1=rnd()*6.3,p2=rnd()*6.3,tone=rnd(),amp=0.45+rnd()*0.5,R=Math.ceil(r)+1,ca=Math.cos(a),sa=Math.sin(a),x0=Math.floor(cx),y0=Math.floor(cy);
  for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){const u=dx*ca+dy*sa,v=(dy*ca-dx*sa)/e,th=Math.atan2(v,u),d=Math.hypot(u,v)/r/(1+0.16*Math.sin(3*th+p1)+0.08*Math.sin(5*th+p2));if(d>=1)continue;const i=((y0+dy+S)%S)*S+(x0+dx+S)%S,height=amp*r*Math.min(1,(1-d)*2.2);if(height>stones[i]){stones[i]=height;shade[i]=tone;}mask[i]=Math.max(mask[i],Math.min(1,(1-d)*4));}}
 const pack=(h,blue,alpha)=>{let lo=Infinity,hi=-Infinity;for(const v of h){lo=Math.min(lo,v);hi=Math.max(hi,v);}const data=new Uint8Array(S*S*4),at=(x,y)=>h[((y+S)%S)*S+(x+S)%S];
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const nx=(at(x-1,y)-at(x+1,y))*0.35,ny=(at(x,y-1)-at(x,y+1))*0.35,l=Math.hypot(nx,ny,1),k=(y*S+x)*4;data[k]=Math.round((nx/l*0.5+0.5)*255);data[k+1]=Math.round((ny/l*0.5+0.5)*255);data[k+2]=Math.round((blue?blue[y*S+x]:(h[y*S+x]-lo)/(hi-lo||1))*255);data[k+3]=Math.round((alpha?alpha[y*S+x]:1)*255);}return data;};
 // Dust: grains, then dimples (a bowl a quarter as deep as it is wide, ringed by a low soft rim), the smaller ones the more common.
 for(let i=0;i<Math.round(S*S/12);i++)stamp(dust,rnd()*S,rnd()*S,0.6+rnd()*0.9,(rnd()-0.4)*0.5,false);
 for(let n=0;n<Math.round(S*S/1400);n++){const cx=rnd()*S,cy=rnd()*S,r=3+Math.pow(rnd(),2.2)*10,R=Math.ceil(r*1.7),x0=Math.floor(cx),y0=Math.floor(cy);for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){const d=Math.hypot(dx+x0-cx,dy+y0-cy)/r;if(d>=1.7)continue;dust[((y0+dy+S)%S)*S+(x0+dx+S)%S]+=r*(d<1?-0.25*(1-d*d):0)+r*0.09*Math.exp(-(((d-1)/0.32)**2));}}
 return {size:S,grit:pack(lumps),pebbles:pack(stones,shade,mask),dust:pack(dust)};}
export function createDirtTextures(){const {size,grit,pebbles,dust}=dirtFields(),make=data=>{const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.colorSpace=T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};return {grit:make(grit),pebbles:make(pebbles),dustLayer:make(dust)};}
