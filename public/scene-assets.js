import {astronaut,parts,roundBox,lathe,roundCylinder,roundRect,profileRect,profileCircle,sweep,hose,bolt,stripes,decalQuad} from './explorer-models.js';
import * as T from './vendor/three.module.js';
import {C} from '/config.js';
const V=C.three;
export function canvasTexture(w,h,paint){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');paint(ctx,w,h);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;}
export function textures(){
 const regolith=canvasTexture(V.textureSize,V.textureSize,(c,w,h)=>{c.fillStyle=V.dust;c.fillRect(0,0,w,h);for(let i=0;i<w*h;i++){c.fillStyle=i%2?'#d6d7d822':'#2b303321';c.fillRect(Math.random()*w,Math.random()*h,1,1);}for(let i=0;i<700;i++){c.fillStyle='#333b3d30';c.beginPath();c.arc(Math.random()*w,Math.random()*h,0.3+Math.random()*1.5,0,Math.PI*2);c.fill();}});regolith.wrapS=regolith.wrapT=T.RepeatWrapping;regolith.anisotropy=4;
 const size=C.visual.normalSize,heights=new Float32Array(size*size),normalData=new Uint8Array(size*size*4);for(const octave of C.visual.bumpOctaves)for(let blob=0;blob<octave.count;blob++){const cx=Math.random()*size,cy=Math.random()*size,r=octave.radius*(0.6+Math.random()*0.8),amp=(Math.random()-0.5)*octave.amplitude;for(let dy=-Math.ceil(r);dy<=r;dy++)for(let dx=-Math.ceil(r);dx<=r;dx++){const d=(dx*dx+dy*dy)/(r*r);if(d>1)continue;const x=(Math.floor(cx+dx)%size+size)%size,y=(Math.floor(cy+dy)%size+size)%size;heights[y*size+x]+=amp*Math.exp(-4*d)*(1-d)*(1-d);}}const height=(x,y)=>heights[((y+size)%size)*size+(x+size)%size];for(let y=0;y<size;y++)for(let x=0;x<size;x++){const nx=(height(x-1,y)-height(x+1,y))*C.visual.normalSlope*C.visual.bumpGradient,ny=(height(x,y-1)-height(x,y+1))*C.visual.normalSlope*C.visual.bumpGradient,length=Math.hypot(nx,ny,1),at=(y*size+x)*4;normalData[at]=(nx/length*0.5+0.5)*255;normalData[at+1]=(ny/length*0.5+0.5)*255;normalData[at+2]=(1/length*0.5+0.5)*255;normalData[at+3]=255;}const normal=new T.DataTexture(normalData,size,size,T.RGBAFormat);normal.wrapS=normal.wrapT=T.RepeatWrapping;normal.magFilter=T.LinearFilter;normal.minFilter=T.LinearMipmapLinearFilter;normal.generateMipmaps=true;normal.needsUpdate=true;regolith.minFilter=T.LinearMipmapLinearFilter;regolith.generateMipmaps=true;
 const softDust=canvasTexture(64,64,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#ffffffc0');g.addColorStop(0.35,'#ffffff55');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,w,h);});
 const sunDisk=canvasTexture(64,64,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#ffffff';c.beginPath();c.arc(w/2,h/2,w*0.48,0,Math.PI*2);c.fill();});
 const crater=canvasTexture(256,256,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#d6d8d750');g.addColorStop(0.46,'#b7babb38');g.addColorStop(0.66,'#343c4266');g.addColorStop(0.79,'#535c6155');g.addColorStop(1,'#535c6100');c.fillStyle=g;c.fillRect(0,0,w,h);});
 const solar=canvasTexture(256,256,(c,w,h)=>{c.fillStyle='#101b30';c.fillRect(0,0,w,h);c.strokeStyle='#6f8eae';c.lineWidth=2;for(let i=0;i<=8;i++){c.beginPath();c.moveTo(i*w/8,0);c.lineTo(i*w/8,h);c.moveTo(0,i*h/8);c.lineTo(w,i*h/8);c.stroke();}});
 const veinSign=canvasTexture(128,128,(c,w,h)=>{c.strokeStyle='#16191966';c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(15,95);c.lineTo(45,68);c.lineTo(67,72);c.lineTo(107,28);c.stroke();c.strokeStyle='#e6dbb388';c.lineWidth=2;c.stroke();for(let i=0;i<10;i++){c.fillStyle='#f7e6b9aa';c.fillRect(20+i*9,80-i*4,2,2);}});
 const seep=canvasTexture(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,6,64,64,56);g.addColorStop(0,'#101c20dd');g.addColorStop(0.6,'#162026bb');g.addColorStop(1,'#15252b00');c.fillStyle=g;c.fillRect(0,0,w,h);c.strokeStyle='#789e9d44';c.lineWidth=2;c.beginPath();c.ellipse(64,65,30,19,-0.4,0,Math.PI*2);c.stroke();});
 const planet=canvasTexture(1024,512,(c,w,h)=>{c.fillStyle='#c8c0a3';c.fillRect(0,0,w,h);for(let y=0;y<h;y++){const tone=0.5+0.5*Math.sin(y*0.08+Math.sin(y*0.023));c.fillStyle=`rgba(126,111,90,${0.05+tone*0.22})`;c.fillRect(0,y,w,1);}for(let i=0;i<80;i++){c.fillStyle='#eee5cd22';c.beginPath();c.ellipse(Math.random()*w,Math.random()*h,70,3+Math.random()*10,0,0,Math.PI*2);c.fill();}});
 const strata=canvasTexture(V.textureSize,V.strataHeight,(c,w,h)=>{let row=0;for(const l of C.layers){const from=row/C.finalRow*h;row+=l.rows;c.fillStyle=l.color;c.fillRect(0,from,w,row/C.finalRow*h-from+1);}for(let y=0;y<h;y++){c.fillStyle=y%7===0?'#08090655':'#ffffff0b';c.fillRect(0,y,w,1);for(let n=0;n<3;n++){c.fillStyle='#00000022';c.fillRect(Math.random()*w,y,Math.random()*8,1);}}for(let row=10;row<C.finalRow;row+=10){c.fillStyle='#090b0dcc';c.fillRect(0,row/C.finalRow*h,w,3);}c.strokeStyle='#15191ab0';c.lineWidth=1;for(let i=0;i<100;i++){const x=Math.random()*w,y=Math.random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+7,y+4);c.lineTo(x+3,y+9);c.lineTo(x+12,y+17);c.stroke();}});
 // Cracks that grow out from the middle of a cell as it takes damage. Alpha is the crack; red is how far along its ray it lies (0 at the
 // centre, 1 at the tips), so the floor shader draws only the part the cell's damage has reached. Wandering rays, each with a side branch.
 const cracks=canvasTexture(V.textureSize,V.textureSize,(c,w,h)=>{c.clearRect(0,0,w,h);c.lineCap=c.lineJoin='round';let seed=7;const rnd=()=>{seed=(Math.imul(seed^(seed>>>15),2246822519)+0x9e3779b9)>>>0;return seed/4294967296;};
  const ray=(x,y,a,length,t0,t1,width,branch)=>{const steps=8;for(let s=1;s<=steps;s++){a+=(rnd()-0.5)*0.7;const nx=x+Math.cos(a)*length/steps,ny=y+Math.sin(a)*length/steps,t=t0+(t1-t0)*s/steps,v=Math.round(255*(t0+(t1-t0)*(s-0.5)/steps));c.strokeStyle=`rgba(${v},${v},${v},0.92)`;c.lineWidth=Math.max(1.5,width*(1-0.6*s/steps));c.beginPath();c.moveTo(x,y);c.lineTo(nx,ny);c.stroke();if(branch&&s===3)ray(nx,ny,a+(rnd()<0.5?-1:1)*(0.55+rnd()*0.5),length*0.45,t,Math.min(1,t+0.4),width*0.55,false);x=nx;y=ny;}};
  for(let k=0;k<6;k++)ray(w/2,h/2,k/6*Math.PI*2+rnd()*0.7,w*(0.3+rnd()*0.14),0,1,w*0.024,true);});cracks.colorSpace=T.NoColorSpace;
 // A lumpy dust cloud for dig puffs: soft blobs clustered round the middle, fading to nothing well inside the edge.
 const puff=canvasTexture(128,128,(c,w,h)=>{c.clearRect(0,0,w,h);for(let i=0;i<9;i++){const a=i*2.4,r=i?w*(0.1+0.06*(i%3)):0,x=w/2+Math.cos(a)*r,y=h/2+Math.sin(a)*r*0.8,s=w*(i?0.2+0.04*(i%2):0.28),g=c.createRadialGradient(x,y,0,x,y,s);g.addColorStop(0,'#ffffff50');g.addColorStop(0.55,'#ffffff24');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,w,h);}});
 const stripes=canvasTexture(V.textureSize,V.textureSize,(c,w,h)=>{c.fillStyle='#b5ad63';c.fillRect(0,0,w,h);c.strokeStyle='#303b39';c.lineWidth=w/8;for(let x=-w;x<w*2;x+=w/4){c.beginPath();c.moveTo(x,0);c.lineTo(x-w,h);c.stroke();}});stripes.wrapS=stripes.wrapT=T.RepeatWrapping;stripes.repeat.set(4,1);
 const belt=canvasTexture(V.textureSize,V.textureSize,(c,w,h)=>{c.fillStyle='#424d4d';c.fillRect(0,0,w,h);c.strokeStyle='#b0b9a0';c.lineWidth=6;for(let y=-h;y<h*2;y+=h/3){c.beginPath();c.moveTo(w/4,y+h/5);c.lineTo(w/2,y);c.lineTo(w*3/4,y+h/5);c.stroke();}});belt.wrapS=belt.wrapT=T.RepeatWrapping;
 const trackCanvas=document.createElement('canvas');trackCanvas.width=trackCanvas.height=V.trackSize;const tracks=new T.CanvasTexture(trackCanvas);tracks.colorSpace=T.SRGBColorSpace;
 return {veinSign,seep,dust:regolith,regolith,normal,softDust,puff,sunDisk,crater,solar,planet,strata,cracks,stripes,belt,tracks,trackCanvas};
}
// ---- Surface finishes ---------------------------------------------------------------------------------------------------------
// Tileable wear textures generated in code (no image files): a dust and grime albedo, packed roughness (green) and metalness (blue)
// for painted and for bare metal, and detail normal maps for scratches and dents and for fabric weave. The finishes (paint, gloss,
// metal, rubber, fabric) all use the same map set and vertex colours, so they share one shader program; the decal material adds a
// second. A hidden warm-up mesh per material keeps them all in the start-up shader warm-up, so a rig bought mid-game compiles
// nothing new. Low quality builds the textures at half size.
const hashAt=(x,y,seed)=>{let h=Math.imul((x|0)^Math.imul(y|0,0x27d4eb2d)^Math.imul(seed,0x165667b1),0x9e3779b1);h^=h>>>15;h=Math.imul(h,0x85ebca77);h^=h>>>13;h=Math.imul(h,0xc2b2ae3d);return ((h^h>>>16)>>>0)/4294967296;};
// Tileable value noise over an n by n texture with `period` cells, smoothly interpolated, in [0, 1].
// px and py set the cell counts across and down, so a noise can be stretched into streaks and still tile.
function noise(n,period,seed,py=period){const out=new Float32Array(n*n),px=period,cx=n/px,cy=n/py;for(let y=0;y<n;y++){const fy=y/cy,j=Math.floor(fy),ty=fy-j,sy=ty*ty*(3-2*ty),j0=j%py,j1=(j+1)%py;for(let x=0;x<n;x++){const fx=x/cx,i=Math.floor(fx),tx=fx-i,sx=tx*tx*(3-2*tx),i0=i%px,i1=(i+1)%px;
 const a=hashAt(i0,j0,seed),b=hashAt(i1,j0,seed),c=hashAt(i0,j1,seed),d=hashAt(i1,j1,seed);out[y*n+x]=a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;}}return out;}
function fbm(n,periods,seed){const out=new Float32Array(n*n);let total=0,amp=1;for(const p of periods){const layer=noise(n,p,seed+p);for(let i=0;i<out.length;i++)out[i]+=layer[i]*amp;total+=amp;amp*=0.5;}for(let i=0;i<out.length;i++)out[i]/=total;return out;}
// Thin wrapping scratches, mostly along a few working directions, as a 0 to 1 coverage buffer.
function scratches(n,count,seed){const out=new Float32Array(n*n);let s=seed;const r=()=>{s=(Math.imul(s^s>>>15,2246822519)+0x9e3779b9)>>>0;return s/4294967296;};
 for(let k=0;k<count;k++){let x=r()*n,y=r()*n;const a=(r()<0.6?Math.round(r()*3)*Math.PI/4:r()*Math.PI)+(r()-0.5)*0.25,len=(0.04+r()*r()*0.3)*n,strength=0.35+r()*0.65,dx=Math.cos(a)*0.5,dy=Math.sin(a)*0.5;
  for(let t=0;t<len*2;t++){x+=dx+(r()-0.5)*0.08;y+=dy+(r()-0.5)*0.08;const ix=((Math.round(x)%n)+n)%n,iy=((Math.round(y)%n)+n)%n,fade=Math.sin(Math.PI*t/(len*2));out[iy*n+ix]=Math.max(out[iy*n+ix],strength*fade);}}return out;}
function dataTexture(n,data,srgb){const t=new T.DataTexture(data,n,n,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;if(srgb)t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;}
function normalTexture(n,height,strength){const d=new Uint8Array(n*n*4),h=(x,y)=>height[((y+n)%n)*n+(x+n)%n];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const nx=(h(x-1,y)-h(x+1,y))*strength,ny=(h(x,y-1)-h(x,y+1))*strength,l=Math.hypot(nx,ny,1),i=(y*n+x)*4;d[i]=(nx/l*0.5+0.5)*255;d[i+1]=(ny/l*0.5+0.5)*255;d[i+2]=(1/l*0.5+0.5)*255;d[i+3]=255;}return dataTexture(n,d,false);}
export function wearTextures(n=256){const clamp=v=>v<0?0:v>1?1:v,smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
 const blotch=fbm(n,[3,6,12],11),fine=fbm(n,[16,32,64],23),streakX=noise(n,64,31,2),streakY=fbm(n,[2,4],37),chips=fbm(n,[8,16],41),cut=scratches(n,Math.round(n*0.16),53),hair=scratches(n,Math.round(n*0.5),59),brushed=noise(n,4,61,128),dents=fbm(n,[4,8],67);
 const albedo=new Uint8Array(n*n*4),paint=new Uint8Array(n*n*4),metal=new Uint8Array(n*n*4),relief=new Float32Array(n*n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,o=i*4,dirt=smooth(0.5,0.88,blotch[i])*0.13,streak=smooth(0.64,0.95,streakX[i])*(0.35+0.65*streakY[i])*0.06,speck=hashAt(x,y,71)>0.988?0.04:0,scratch=Math.max(cut[i]*0.7,hair[i]*0.35);
  // Dust collects in blotches and runs down in streaks (box-projected uv keeps v vertical on walls); a faint warm cast.
  const v=clamp(0.97-dirt-streak-speck+(fine[i]-0.5)*0.035);albedo[o]=v*255;albedo[o+1]=v*0.986*255;albedo[o+2]=v*0.958*255;albedo[o+3]=255;
  // Paint: mid roughness that roughens with dust, chipped and scratched through to shiny bare metal.
  const chip=smooth(0.87,0.91,chips[i])*0.7,bare=Math.max(scratch,chip);paint[o]=255;paint[o+1]=clamp(0.5+(fine[i]-0.5)*0.26+dirt*0.9-bare*0.16)*255;paint[o+2]=clamp(0.04+bare*0.55)*255;paint[o+3]=255;
  // Bare metal: brushed along u, polished where scratched, dulled under dust.
  metal[o]=255;metal[o+1]=clamp(0.33+(brushed[i]-0.5)*0.16+(fine[i]-0.5)*0.14+dirt*0.8-scratch*0.15)*255;metal[o+2]=clamp(0.95-dirt*1.4)*255;metal[o+3]=255;
  relief[i]=-scratch*0.4-chip*0.3+(dents[i]-0.5)*0.55+(fine[i]-0.5)*0.1;}
 const weave=new Float32Array(n*n),fold=fbm(n,[2,4,8],79);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const a=Math.sin(x*Math.PI/4),b=Math.sin(y*Math.PI/4),c=Math.sin(x*Math.PI/8),d=Math.sin(y*Math.PI/8);weave[y*n+x]=(a*d+b*c)*0.5+(fold[y*n+x]-0.5)*1.1;}
 return {albedo:dataTexture(n,albedo,true),paint:dataTexture(n,paint,false),metal:dataTexture(n,metal,false),detail:normalTexture(n,relief,n/170),fabric:normalTexture(n,weave,n/230)};}
// The decal atlas: stencilled names, warnings, plates and gauge faces painted on a transparent canvas. Rects are [x, y, w, h] on
// a 1024 by 512 sheet; uvFor() turns one into texture coordinates.
const DECALS={hazard:[0,0,512,64],warn:[512,0,128,128],volt:[640,0,128,128],logo:[768,0,128,128],gauge:[896,0,128,128],rig:[0,64,512,64],crew:[0,128,256,64],hatch:[256,128,256,64],nostep:[0,192,192,48],o2:[192,192,128,48],n2:[320,192,128,48],serial:[448,192,192,48],hab:[512,128,384,64],airlock:[640,192,256,48],ex:[0,240,384,64],oil:[384,240,256,64],lift:[640,240,192,64],num1:[832,240,64,64],num2:[896,240,64,64],num3:[960,240,64,64],num4:[832,304,64,64],vent:[0,304,256,96],arrow:[896,304,64,64],tpk:[256,304,256,64],press:[512,304,320,64],orange:[960,304,64,64],panel:[0,400,256,112],dial:[256,400,128,112],keypad:[384,400,128,112]};
export function decalUV(name){const r=DECALS[name];return r?[r[0]/1024,1-(r[1]+r[3])/512,(r[0]+r[2])/1024,1-r[1]/512]:[0,0,0,0];}
function paintDecals(c,w,h){const s=w/1024;c.clearRect(0,0,w,h);c.save();c.scale(s,s);c.lineJoin='round';
 const box=(r,fill)=>{c.fillStyle=fill;c.fillRect(r[0],r[1],r[2],r[3]);},text=(r,str,size,color,{font='700',align='center',inset=0}={})=>{c.font=`${font} ${size}px system-ui,Arial,sans-serif`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(str,align==='center'?r[0]+r[2]/2:r[0]+inset,r[1]+r[3]/2+1,r[2]-8);};
 const D=DECALS;
 // Yellow and black hazard tape.
 {const r=D.hazard;box(r,'#e8b21c');c.fillStyle='#16181a';for(let x=-64;x<r[2]+64;x+=64){c.beginPath();c.moveTo(r[0]+x,r[1]+r[3]);c.lineTo(r[0]+x+32,r[1]+r[3]);c.lineTo(r[0]+x+32+r[3],r[1]);c.lineTo(r[0]+x+r[3],r[1]);c.closePath();c.fill();}}
 const triangle=(r,draw)=>{const cx=r[0]+r[2]/2,top=r[1]+10,bot=r[1]+r[3]-10,half=(bot-top)/Math.sqrt(3);c.beginPath();c.moveTo(cx,top);c.lineTo(cx+half,bot);c.lineTo(cx-half,bot);c.closePath();c.fillStyle='#f0b51e';c.fill();c.lineWidth=7;c.strokeStyle='#16181a';c.stroke();c.fillStyle='#16181a';draw(cx,top,bot);};
 triangle(D.warn,(cx,top,bot)=>{c.fillRect(cx-5,top+34,10,40);c.fillRect(cx-5,bot-26,10,10);});
 triangle(D.volt,(cx,top,bot)=>{c.beginPath();c.moveTo(cx+6,top+30);c.lineTo(cx-14,top+66);c.lineTo(cx,top+66);c.lineTo(cx-8,bot-12);c.lineTo(cx+16,top+56);c.lineTo(cx+2,top+56);c.closePath();c.fill();});
 // Company roundel: an orange ring round a pick.
 {const r=D.logo,cx=r[0]+64,cy=r[1]+64;c.fillStyle='#f3f1ea';c.beginPath();c.arc(cx,cy,60,0,Math.PI*2);c.fill();c.lineWidth=12;c.strokeStyle='#e5702a';c.beginPath();c.arc(cx,cy,46,0,Math.PI*2);c.stroke();c.strokeStyle='#23282c';c.lineWidth=8;c.beginPath();c.moveTo(cx-24,cy+24);c.lineTo(cx+20,cy-20);c.stroke();c.beginPath();c.moveTo(cx-6,cy-30);c.quadraticCurveTo(cx+18,cy-26,cx+30,cy-4);c.stroke();}
 // Gauge face: ticks, a green and a red band, needle and cap.
 const gauge=(r,needle)=>{const cx=r[0]+r[2]/2,cy=r[1]+r[3]/2,R=Math.min(r[2],r[3])/2-6;c.fillStyle='#f4f2ea';c.beginPath();c.arc(cx,cy,R,0,Math.PI*2);c.fill();c.lineWidth=5;c.strokeStyle='#2a2f33';c.stroke();c.lineWidth=7;c.strokeStyle='#58b947';c.beginPath();c.arc(cx,cy,R-14,Math.PI*0.85,Math.PI*1.6);c.stroke();c.strokeStyle='#d8432e';c.beginPath();c.arc(cx,cy,R-14,Math.PI*1.85,Math.PI*2.15);c.stroke();c.strokeStyle='#2a2f33';c.lineWidth=2;for(let k=0;k<=10;k++){const a=Math.PI*0.75+k/10*Math.PI*1.5;c.beginPath();c.moveTo(cx+Math.cos(a)*(R-6),cy+Math.sin(a)*(R-6));c.lineTo(cx+Math.cos(a)*(R-(k%5?14:20)),cy+Math.sin(a)*(R-(k%5?14:20)));c.stroke();}c.lineWidth=4;c.strokeStyle='#c22d1f';c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(needle)*(R-18),cy+Math.sin(needle)*(R-18));c.stroke();c.fillStyle='#2a2f33';c.beginPath();c.arc(cx,cy,6,0,Math.PI*2);c.fill();};
 gauge(D.gauge,Math.PI*1.25);gauge(D.dial,Math.PI*0.55);
 text(D.rig,'TPK-01   PLASMA DRILL',46,'#2a3034');c.fillStyle='#e5702a';c.fillRect(D.rig[0]+40,D.rig[1]+56,D.rig[2]-80,5);text(D.crew,'CREW 4 MAX',36,'#f2f2ec');text(D.hatch,'HATCH  ▶ PULL',34,'#e5702a');text(D.nostep,'NO STEP',30,'#23282c');
 box(D.o2,'#3f9b52');text(D.o2,'O2',32,'#ffffff');box(D.n2,'#2f6fb4');text(D.n2,'N2',32,'#ffffff');
 {const r=D.serial;box(r,'#d9d9d2');text([r[0],r[1],120,r[3]],'SN 0451-K',22,'#23282c',{font:'600',align:'left',inset:8});c.fillStyle='#23282c';for(let k=0;k<26;k++){const bw=1+((k*37)%3);c.fillRect(r[0]+120+k*2.6,r[1]+8,bw,r[3]-16);}}
 text(D.hab,'HAB-1   PRESSURIZED',38,'#2c6190');text(D.airlock,'◀ AIRLOCK ▶',30,'#23282c');text(D.ex,'EX-200   SWING RADIUS',36,'#23282c');text(D.oil,'OIL WELL   PSI',34,'#23282c');text(D.lift,'⚓ LIFT POINT',30,'#23282c');
 ['01','02','03','04'].forEach((n,k)=>text(D['num'+(k+1)],n,40,'#f2f2ec'));
 // Louvred vent: dark slots in a frame.
 {const r=D.vent;box(r,'#2a3034');c.fillStyle='#0d1012';for(let k=0;k<6;k++)c.fillRect(r[0]+12,r[1]+10+k*14,r[2]-24,8);c.fillStyle='#4a5358';for(let k=0;k<6;k++)c.fillRect(r[0]+12,r[1]+18+k*14,r[2]-24,2);}
 {const r=D.arrow;c.fillStyle='#e5702a';c.beginPath();c.moveTo(r[0]+8,r[1]+12);c.lineTo(r[0]+40,r[1]+32);c.lineTo(r[0]+8,r[1]+52);c.lineTo(r[0]+20,r[1]+32);c.closePath();c.fill();}
 text(D.tpk,'TOOTHPICK MINING CO',30,'#e5702a');text(D.press,'⚠ PRESSURE VESSEL',32,'#d8432e');box(D.orange,'#e5702a');
 // Control panel: a screen, buttons and a key switch.
 {const r=D.panel;box(r,'#2a3034');c.fillStyle='#0b1a1f';c.fillRect(r[0]+10,r[1]+10,140,64);c.fillStyle='#4fd17f';c.fillRect(r[0]+18,r[1]+20,90,6);c.fillRect(r[0]+18,r[1]+34,60,6);c.fillStyle='#80d8ff';c.fillRect(r[0]+18,r[1]+48,110,6);
  const colors=['#d8432e','#e8b21c','#58b947','#2f6fb4'];colors.forEach((col,k)=>{c.fillStyle=col;c.beginPath();c.arc(r[0]+176+(k%2)*34,r[1]+26+Math.floor(k/2)*34,11,0,Math.PI*2);c.fill();});c.fillStyle='#c9ced0';c.fillRect(r[0]+10,r[1]+84,236,16);c.fillStyle='#23282c';for(let k=0;k<9;k++)c.fillRect(r[0]+16+k*26,r[1]+88,16,8);}
 {const r=D.keypad;box(r,'#2a3034');c.fillStyle='#d9d9d2';for(let k=0;k<12;k++)c.fillRect(r[0]+14+(k%3)*34,r[1]+10+Math.floor(k/3)*24,26,18);}
 c.restore();}
export function createLook(scene,{low=false}={}){const n=low?128:256,tex=wearTextures(n),kinds={
  paint:{orm:tex.paint,normal:tex.detail,rough:1,metal:1,ns:0.2},gloss:{orm:tex.paint,normal:tex.detail,rough:0.55,metal:1,ns:0.14},metal:{orm:tex.metal,normal:tex.detail,rough:1,metal:1,ns:0.32},
  rubber:{orm:tex.paint,normal:tex.detail,rough:1.6,metal:0,ns:0.6},fabric:{orm:tex.paint,normal:tex.fabric,rough:1.7,metal:0,ns:0.35}};
 const make=(kind,color='#ffffff')=>{const k=kinds[kind]||kinds.paint;const m=new T.MeshStandardMaterial({color,vertexColors:true,map:tex.albedo,roughnessMap:k.orm,metalnessMap:k.orm,roughness:k.rough,metalness:k.metal,normalMap:k.normal,normalScale:new T.Vector2(k.ns,k.ns)});m.name='Finish '+kind;return m;};
 const shared=new Map(),own=new Map(),handles=new Map();
 // finish(kind, colour) paints the colour into vertex colours on a shared material; finish(kind, colour, true) gives the colour its own
 // material (white vertex colours), for models that recolour or tint their materials at run time.
 function finish(kind,color='#ffffff',mine=false){const key=kind+color+mine;if(handles.has(key))return handles.get(key);let h;
  if(mine){if(!own.has(kind+color))own.set(kind+color,make(kind,color));h={material:own.get(kind+color),color:null};}
  else{if(!shared.has(kind))shared.set(kind,make(kind));h={material:shared.get(kind),color:new T.Color(color)};}handles.set(key,h);return h;}
 const atlas=canvasTexture(low?512:1024,low?256:512,paintDecals);atlas.anisotropy=4;
 const decalMaterial=new T.MeshStandardMaterial({map:atlas,alphaTest:0.45,roughness:0.6,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});decalMaterial.name='Decals';decalMaterial.userData.decal=true;
 const decal={material:decalMaterial,color:null};
 // Cockpit glass: the floor and the canopy share it.
 const glass=new T.MeshStandardMaterial({color:'#a6e6ff',transparent:true,opacity:0.1,roughness:0.05,metalness:0.3,depthWrite:false});glass.name='Cockpit glass';
 // Warm-up: one hidden mesh per material (and an instanced one for instanced finishes) so the start-up compile covers them.
 const warm=new T.Group();warm.name='Finish warm-up';const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0.01,0,0,0,0.01,0],3));g.setAttribute('normal',new T.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1],2));g.setAttribute('color',new T.Float32BufferAttribute([1,1,1,1,1,1,1,1,1],3));
 const warmUp=material=>{const m=new T.Mesh(g,material);m.visible=false;m.castShadow=m.receiveShadow=true;warm.add(m);};for(const kind of Object.keys(kinds))warmUp(finish(kind).material);warmUp(decalMaterial);warmUp(glass);
 {const inst=new T.InstancedMesh(g,finish('metal').material,1);inst.visible=false;inst.castShadow=inst.receiveShadow=true;warm.add(inst);}
 scene.add(warm);
 return {finish,decal,decalUV,glass,textures:tex,atlas,warm,low
  // Materials made after start-up (own colours) share the warmed program: same maps, vertex colours and defines.
  };}
export function mergeStatic(meshes,material){let count=0;const geometries=meshes.map(m=>{m.updateMatrix();const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone());g.applyMatrix4(m.matrix);count+=g.attributes.position.count;return g;});const geometry=new T.BufferGeometry();for(const key of ['position','normal','uv']){const size=key==='uv'?2:3,array=new Float32Array(count*size);let offset=0;for(const g of geometries){array.set(g.attributes[key].array,offset);offset+=g.attributes[key].array.length;}geometry.setAttribute(key,new T.BufferAttribute(array,size));}for(const g of geometries)g.dispose();return new T.Mesh(geometry,material);}
export function makeFactory(scene,assets,{low=false}={}){
 // Finishes, decals and glass (createLook), and seg(): curve segment counts, cut on low quality.
 const look=createLook(scene,{low}),finish=look.finish,decal=look.decal,glass=look.glass,seg=n=>Math.max(4,Math.round(n*(low?0.55:1)));
 const materials=new Map(),geometries={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,8),sphere:new T.IcosahedronGeometry(1,0),plane:new T.PlaneGeometry(1,1)};
 function mat(color,emissive=false){const key=color+emissive;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:0.83,metalness:0.1,emissive:emissive?color:0,emissiveIntensity:emissive?1.7:0}));return materials.get(key);}
 function mesh(g,parent,color,sx,sy,sz,x,y,z,glow=false){const m=new T.Mesh(geometries[g],mat(color,glow));m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function box(parent,color,sx,sy,sz,x=0,y=0,z=0,glow=false){return mesh('box',parent,color,sx,sy,sz,x,y,z,glow);}
 function cylinder(parent,color,r,height,x,y,z,glow=false){return mesh('cylinder',parent,color,r,height,r,x,y,z,glow);}
 function label(text,color='#edf3da',width=1.5,plain=false){const tex=canvasTexture(V.nameWidth,V.nameHeight,(c,w,h)=>{if(!plain){c.fillStyle='#11201ddd';c.fillRect(0,0,w,h);}c.font='bold 28px system-ui';c.textAlign='center';c.textBaseline='middle';if(plain){c.lineJoin='round';c.lineWidth=7;c.strokeStyle='#0b1210d9';c.strokeText(text,w/2,h/2,w-12);}c.fillStyle=color;c.fillText(text,w/2,h/2,w-12);});const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthWrite:false}));sprite.scale.set(width,width*V.nameHeight/V.nameWidth,1);return sprite;}
 function rover(player){return astronaut({box,cylinder,mat,label,geometries,finish,decal,decalUV,low,seg},player,scene);}
 function depot(){const root=new T.Group();root.name='Rounded habitat';root.position.set(C.mapSize/2,0,C.mapSize/2);const pieces=[];function part(color,sx,sy,sz,x,y,z,glow=false){const m=box(root,color,sx,sy,sz,x,y,z,glow);pieces.push(m);return m;}function shaped(geometry,material,x,y,z){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);pieces.push(m);return m;}
  part('#535c60',2.03,0.08,2.03,0,0.04,0);
  for(const z of [-0.39,0.39]){const shell=new T.CapsuleGeometry(0.28,0.91,8,24);shell.rotateZ(Math.PI/2);shaped(shell,mat('#eef0ef'),0,0.53,z);for(const x of [-0.38,0.38]){const trim=new T.CylinderGeometry(0.285,0.285,0.045,24);trim.rotateZ(Math.PI/2);shaped(trim,mat('#2c6190'),x,0.53,z);}for(const x of [-0.24,0.24]){const side=z>0?1:-1;const rim=new T.TorusGeometry(0.10,0.016,6,20);shaped(rim,mat('#647d8a'),x,0.55,z+side*0.278);const window=new T.CircleGeometry(0.083,24);const glow=shaped(window,mat('#ffd5a0',true),x,0.55,z+side*0.287);if(side<0)glow.rotation.y=Math.PI;}}
  const connector=new T.CylinderGeometry(0.14,0.14,0.78,20);connector.rotateX(Math.PI/2);shaped(connector,mat('#cbd4d8'),0.16,0.51,0);
  // Four legs keep the round shells clear of the pad.
  for(const x of [-0.56,0.56])for(const z of [-0.62,0.62]){shaped(new T.CylinderGeometry(0.03,0.045,0.24,8),mat('#c5cccf'),x,0.21,z);shaped(new T.CylinderGeometry(0.095,0.095,0.025,12),mat('#69777b'),x,0.105,z);}
  const airlock=new T.CapsuleGeometry(0.14,0.17,6,16);const door=shaped(airlock,mat('#e8ecec'),0,0.39,0.70);door.scale.z=0.27;shaped(new T.CircleGeometry(0.105,24),mat('#334b5b'),0,0.43,0.744);part('#1b3542',0.20,0.14,0.018,0,0.32,0.746);part('#c8f1f2',0.045,0.025,0.02,0.05,0.35,0.76,true);const ramp=part('#a4b0b4',0.36,0.035,0.38,0,0.15,0.84);ramp.rotation.x=0.38;
  part('#c9d0cf',0.24,0.29,0.32,-0.76,0.27,0.52);part('#26373e',0.25,0.045,0.27,-0.76,0.43,0.52);
  // Solar cells sit to one side rather than covering the curved habitat roof.
  const solarMaterial=new T.MeshStandardMaterial({map:assets.solar,roughness:0.42,metalness:0.45});const panel=shaped(new T.BoxGeometry(0.27,0.025,1.18),solarMaterial,-0.84,0.40,-0.12);panel.rotation.z=-0.30;for(const z of [-0.54,0.30])part('#7e8b90',0.025,0.28,0.025,-0.83,0.25,z);
  const hubTexture=canvasTexture(256,96,(c,w,h)=>{c.fillStyle='#183951';c.fillRect(0,0,w,h);c.fillStyle='#f5f5df';c.font='bold 68px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('HUB',w/2,h/2);});const sign=shaped(new T.PlaneGeometry(0.56,0.21),new T.MeshBasicMaterial({map:hubTexture}),0.49,0.091,0.82);sign.rotation.x=-Math.PI/2;
  part('#cbd3d6',0.035,1.25,0.035,0.70,0.72,-0.72);part('#e4d7a0',0.25,0.15,0.015,0.82,1.10,-0.72);const red=shaped(new T.SphereGeometry(0.045,8,6),mat('#f23932',true).clone(),0.70,1.37,-0.72);
  const groups=new Map();for(const p of pieces){if(p===red)continue;const key=p.material;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}for(const [material,list]of groups){const combined=mergeStatic(list,material);combined.castShadow=combined.receiveShadow=true;root.add(combined);for(const m of list)root.remove(m);}
  const edgeMaterial=new T.MeshStandardMaterial({map:assets.stripes,roughness:0.9});for(const z of [-0.96,0.96]){const edge=new T.Mesh(geometries.box,edgeMaterial);edge.scale.set(1.9,0.015,0.08);edge.position.set(0,0.09,z);root.add(edge);}
  const dish=new T.Group();dish.position.set(0.28,0.90,-0.39);cylinder(dish,'#9aafb8',0.025,0.28,0,0,0);const bowl=new T.Mesh(new T.SphereGeometry(0.20,16,8,0,Math.PI*2,0,Math.PI/2),mat('#d9e1e3'));bowl.rotation.z=0.5;bowl.position.y=0.13;dish.add(bowl);root.add(dish);dish.userData.mast=red;
  const padLight=new T.SpotLight('#edf2ff',C.visual.padSpotIntensity,C.visual.padSpotRange,C.visual.padSpotAngle,0.65,1);padLight.position.set(0,1.7,0.45);padLight.target.position.set(0,0,0.55);root.add(padLight,padLight.target);scene.add(root);return dish;
 }
 function pump(index){const root=new T.Group();root.position.set(index%C.mapSize+0.5,0,Math.floor(index/C.mapSize)+0.5);const puddle=new T.Mesh(new T.CircleGeometry(0.45,20),mat('#121e23'));puddle.rotation.x=-Math.PI/2;puddle.position.y=0.014;root.add(puddle);box(root,'#536264',0.55,0.10,0.45,0,0.1,0);box(root,'#b5b9a0',0.08,0.75,0.08,0,0.5,0);const beam=new T.Group();beam.position.y=0.86;box(beam,'#c3b991',0.12,0.12,0.85);box(beam,'#526064',0.22,0.29,0.18,0,-0.08,-0.4);root.add(beam);scene.add(root);return {root,beam};}
 // ---- Plasma drill rig ----------------------------------------------------------------------------------------------------------
 // A drilling headframe over the 3 by 3 bore: bolted girders on foot pads, columns spliced with bolted flanges, a braced crown with a
 // walkway and handrail, the crown block and four sheaves the pod hangs from, a drawworks winch on the ground paying out the fast
 // line, and hydraulic hoses run up a column from the power unit. The pod is a pressure hull: a ribbed tub round a bolted glass
 // floor, a glazed canopy on posts with a hatch in the roof, work lights, and the plasma cutter turning underneath with its emitter,
 // lens and heat fins. Static pieces merge per material, so the whole rig is a handful of draw calls.
 function drill(index){const root=new T.Group();root.name='Plasma drill rig';root.position.set(index%C.mapSize+0.5,0,Math.floor(index/C.mapSize)+0.5);
 const D=C.three.cockpit,R=D.frameHalf,top=D.crownY,G=D.glassY,PX=D.podHalfX,PZ=D.podHalfZ,RY=D.roofY,CR=D.cutterRadius,f=finish,step=low?2:1;
 const white=f('paint','#d8dbd8'),graphite=f('paint','#373e43'),orange=f('gloss','#e2692a'),yellow=f('paint','#e0b021'),steel=f('metal','#b3babd'),dark=f('metal','#4b5358'),rubber=f('rubber','#1b1e21'),rope=f('metal','#8a9295'),lampLens=mat('#fff1cf',true),beacon=mat('#ff3b2f',true);
 const B=bolt(0.014,0.01),along=(path,gap,fn)=>{let acc=gap/2;for(let i=0;i<path.length;i++){const a=path[i],b=path[(i+1)%path.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);while(acc<l){const t=acc/l,nx=a[2]+(b[2]-a[2])*t,nz=a[3]+(b[3]-a[3])*t,nl=Math.hypot(nx,nz)||1;fn(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,nx/nl,nz/nl);acc+=gap;}acc-=l;}};
 const F=parts(),fd=(name,w,h,x,y,z,ry=0,rx=0)=>F.add(decal,decalQuad(decalUV(name),w,h),x,y,z,rx,ry,0),line=(P,h,a,b,r)=>P.add(h,hose([a,b],r,1,seg(6)));
 // Base: girders on bolted foot pads, hazard tape down their outer faces.
 for(const s of [-1,1]){F.add(graphite,roundBox(2*R+0.2,0.18,0.18,0.025),0,0.09,s*R);F.add(graphite,roundBox(0.18,0.18,2*R-0.18,0.025),s*R,0.09,0);for(const t of [-0.78,0.78]){fd('hazard',1.0,0.08,t,0.1,s*(R+0.091),s>0?0:Math.PI);fd('hazard',1.0,0.08,s*(R+0.091),0.1,t,s*Math.PI/2);}}
 for(const x of [-R,R])for(const z of [-R,R]){F.add(dark,roundBox(0.44,0.03,0.44,0.008),x,0.015,z);for(const [bx,bz] of [[-0.17,-0.17],[0.17,-0.17],[-0.17,0.17],[0.17,0.17]])F.add(steel,B,x+bx,0.03,z+bz);
  // Columns in two sections: base flanges bolted to the girders, a bolted splice at mid height, warning plates outboard.
  F.add(steel,roundBox(0.26,0.025,0.26,0.006),x,0.192,z);F.add(white,roundBox(0.13,1.05,0.13,0.02),x,0.205+0.525,z);F.add(white,roundBox(0.13,top-1.26,0.13,0.02),x,1.26+(top-1.26)/2,z);
  for(const y of [1.236,1.262])F.add(steel,roundBox(0.22,0.024,0.22,0.006),x,y,z);for(const [bx,bz] of [[-0.1,-0.1],[0.1,-0.1],[-0.1,0.1],[0.1,0.1]]){F.add(steel,B,x+bx,0.205,z+bz);F.add(steel,B,x+bx*0.85,1.274,z+bz*0.85);}
  fd('warn',0.12,0.12,x+Math.sign(x)*0.066,0.78,z,Math.sign(x)*Math.PI/2);}
 // Crown: the top frame, knee braces in every corner, a girt and X-bracing in the lower bay of the back and side faces (the near face
 // stays open so the bore can be seen), cross beams under the crown block and sheave beams over the pod's corners.
 for(const s of [-1,1]){F.add(white,roundBox(2*R+0.14,0.14,0.14,0.022),0,top,s*R);F.add(white,roundBox(0.14,0.14,2*R-0.14,0.022),s*R,top,0);}
 for(const x of [-1,1])for(const z of [-1,1]){F.add(white,roundBox(0.06,0.74,0.06,0.012),x*(R-0.26),top-0.26,z*R,0,0,x*Math.PI/4);F.add(white,roundBox(0.06,0.74,0.06,0.012),x*R,top-0.26,z*(R-0.26),-z*Math.PI/4,0,0);}
 {const span=2*R-0.14,bay=1.03,diag=Math.hypot(span,bay),ang=Math.atan2(bay,span),girt=roundBox(span,0.08,0.08,0.015),brace=roundBox(diag,0.05,0.05,0.01);
  F.add(white,girt,0,1.25,-R);for(const s of [-1,1])F.add(white,girt,s*R,1.25,0,0,Math.PI/2,0);
  for(const k of [-1,1]){F.add(white,brace,0,0.215+bay/2,-R-0.035*k,0,0,k*ang);for(const s of [-1,1])F.add(white,brace,s*R+0.035*k,0.215+bay/2,0,0,Math.PI/2,k*ang);}}
 F.add(white,roundBox(2*R-0.14,0.11,0.12,0.02),0,top,0);F.add(white,roundBox(0.12,0.1,2*R-0.14,0.02),0,top-0.003,0);for(const s of [-1,1])F.add(white,roundBox(0.1,0.1,2*R-0.14,0.018),s*(PX-0.03),top-0.012,0);
 // Walkway grating on the crown beams and a two-rail handrail round it.
 for(const s of [-1,1]){F.add(graphite,roundBox(2*R+0.5,0.025,0.32,0.006),0,top+0.083,s*(R+0.06));F.add(graphite,roundBox(0.32,0.025,2*R-0.14,0.006),s*(R+0.06),top+0.083,0);}
 {const rail=sweep(profileCircle(0.014,seg(8)),roundRect(R+0.2,R+0.2,0.12,seg(4))),post=roundCylinder(0.014,0.34,0.004,seg(8));F.add(yellow,rail,0,top+0.43,0);F.add(yellow,rail,0,top+0.27,0);
  for(const s of [-1,1])for(const t of [-1,-0.5,0,0.5,1]){F.add(yellow,post,t*(R+0.06),top+0.265,s*(R+0.2));if(Math.abs(t)<1)F.add(yellow,post,s*(R+0.2),top+0.265,t*(R+0.06));}}
 // Crown block with two big sheaves and an aviation beacon; four sheaves hang over the pod's corners, ropes run in to the block.
 F.add(orange,roundBox(0.44,0.2,0.34,0.035),0,top+0.155,0);F.add(dark,roundBox(0.48,0.03,0.38,0.008),0,top+0.07,0);
 const sheave=lathe([[0,-0.018],[0.05,-0.018,true],[0.06,-0.012],[0.05,-0.003],[0.05,0.003],[0.06,0.012],[0.05,0.018,true],[0,0.018]],seg(18));
 for(const x of [-0.09,0.09]){F.add(dark,sheave,x,top+0.27,0,0,0,Math.PI/2,1.9,1.4,1.9);F.add(steel,roundCylinder(0.02,0.4,0.005,seg(10)),x,top+0.27,0,0,0,Math.PI/2);}
 F.add(steel,roundCylinder(0.012,0.22,0.003,seg(8)),0,top+0.36,0);const beam=parts();beam.add(beacon,lathe([[0,0],[0.03,0],[0.032,0.02],[0.02,0.045],[0,0.05]],seg(12)),0,top+0.47,0);
 fd('lift',0.3,0.1,0,top+0.155,0.171);fd('logo',0.14,0.14,0.221,top+0.155,0,Math.PI/2);fd('logo',0.14,0.14,-0.221,top+0.155,0,-Math.PI/2);
 for(const sx of [-1,1])for(const sz of [-1,1]){const cx=sx*(PX-0.08),cz=sz*(PZ-0.03);F.add(dark,sheave,cx,top-0.11,cz,Math.PI/2,0,0);for(const d of [-0.028,0.028])F.add(dark,roundBox(0.15,0.15,0.008,0.004),cx,top-0.09,cz+d);line(F,rope,[cx-sx*0.0,top-0.06,cz],[sx*0.16,top+0.2,sz*0.1],0.008);}
 // Front and back beams carry the rig's name.
 fd('rig',1.5,0.12,0,top,R+0.0715);fd('rig',1.5,0.12,0,top,-R-0.0715,Math.PI);
 // Drawworks on the ground outside the -x girder: skid, pillow-block stands, the orange drum wound with rope, motor and gearbox; the
 // fast line climbs from the drum to the crown block.
 {const wx=-R-0.4;F.add(graphite,roundBox(0.52,0.06,1.02,0.012),wx,0.03,0);for(const z of [-0.36,0.36])F.add(graphite,roundBox(0.16,0.26,0.08,0.015),wx,0.19,z);
  F.add(orange,lathe([[0,-0.3],[0.18,-0.3,true],[0.18,-0.27,true],[0.12,-0.26,true],[0.12,0.26,true],[0.18,0.27,true],[0.18,0.3,true],[0,0.3]],seg(26)),wx,0.34,0,Math.PI/2,0,0);
  F.add(rope,lathe([[0.12,-0.255],[0.142,-0.25],[0.145,0],[0.142,0.25],[0.12,0.255]],seg(26)),wx,0.34,0,Math.PI/2,0,0);
  F.add(white,roundCylinder(0.12,0.3,0.03,seg(20)),wx,0.34,0.5,Math.PI/2,0,0);F.add(graphite,roundBox(0.3,0.26,0.16,0.03),wx,0.3,-0.48);fd('logo',0.16,0.16,wx+0.151,0.32,-0.48,Math.PI/2);fd('volt',0.1,0.1,wx,0.34,0.651);
  line(F,rope,[wx,0.48,0],[-0.22,top+0.13,0],0.011);}
 // Hydraulic power unit at the back corner, two hoses clipped up the column to the crown block.
 {const hx=-R-0.34,hz=-R+0.5;F.add(white,roundBox(0.36,0.42,0.3,0.03),hx,0.21,hz);F.add(graphite,roundBox(0.38,0.04,0.32,0.01),hx,0.44,hz);fd('gauge',0.12,0.12,hx+0.181,0.29,hz,Math.PI/2);fd('vent',0.22,0.08,hx+0.181,0.12,hz,Math.PI/2);
  for(const o of [-0.022,0.022]){F.add(rubber,hose([[hx+0.05,0.44,hz+o],[hx+0.12,0.58,hz-0.12+o],[-R-0.09,0.75,-R+0.1+o],[-R-0.09,1.6,-R+0.1+o],[-R-0.085,top-0.15,-R+0.12+o],[-R+0.15,top+0.12,-R+0.25+o],[-0.6,top+0.13,-0.6+o],[-0.23,top+0.12,-0.12+o]],0.012,seg(48),seg(6)));}
  for(const y of [0.9,1.35,1.8])F.add(dark,roundBox(0.05,0.03,0.09,0.008),-R-0.09,y,-R+0.1);}
 // Work lights under the crown corners.
 const lamps=parts();for(const x of [-1,1])for(const z of [-1,1]){F.add(graphite,roundBox(0.12,0.06,0.1,0.015),x*(R-0.14),top-0.11,z*(R-0.14));lamps.add(lampLens,roundBox(0.09,0.012,0.07,0.004),x*(R-0.14),top-0.143,z*(R-0.14));}
 F.build(root,{ground:0,grime:0.3,uvScale:1.6});lamps.build(root,{shadows:false});beam.build(root,{shadows:false});
 // ---- Pod: lowered on cables as the bore deepens. Its local zero sits on the dig face. Up to four crew sit in it side by side,
 // facing down the bore through the glass floor, each at a station with a dashboard, a gauge screen and two control sticks.
 const capsule=new T.Group();capsule.name='Drill cockpit';root.add(capsule);
 const P=parts(),pd=(name,w,h,x,y,z,ry=0,rx=0)=>P.add(decal,decalQuad(decalUV(name),w,h),x,y,z,rx,ry,0),hull=f('paint','#e7e9e5'),hullDark=f('paint','#2f363a');
 // The tub: a rolled-rim pressure wall round the glass, stiffening ribs, an orange band.
 const tubPath=roundRect(PX+0.05,PZ+0.05,0.22,seg(6));
 P.add(hull,sweep([[0.045,-0.045],[0.045,0.255],[0.036,0.288],[0.013,0.304],[-0.014,0.3],[-0.034,0.28],[-0.034,0.02,true],[-0.066,0,true],[-0.066,-0.045,true],[-0.03,-0.072],[0.02,-0.072]].map(([u,v,c])=>[u,G+v,c]),tubPath));
 P.add(orange,sweep([[0.044,G+0.13],[0.051,G+0.13],[0.051,G+0.19],[0.044,G+0.19]],tubPath));
 {const rib=roundBox(0.024,0.3,0.032,0.007);along(tubPath,0.25*step,(x,z,nx,nz)=>P.add(hull,rib,x+nx*0.058,G+0.105,z+nz*0.058,0,Math.atan2(nx,nz),0));}
 // Glass floor in a bolted clamp ring.
 const ringPath=roundRect(PX-0.02,PZ-0.02,0.19,seg(6));P.add(dark,sweep(profileRect(0.05,0.022,0.008,2),ringPath),0,G+0.006,0);along(ringPath,0.11*step,(x,z)=>P.add(steel,bolt(0.011,0.008),x,G+0.017,z));
 const plate=(hx,hz,r,y)=>{const s=new T.Shape(),k=roundRect(hx,hz,r,seg(6));k.forEach((p,i)=>i?s.lineTo(p[0],-p[1]):s.moveTo(p[0],-p[1]));const g=new T.ShapeGeometry(s);g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;};
 const glassFloor=new T.Mesh(plate(PX-0.03,PZ-0.03,0.19,0),glass);glassFloor.name='Cockpit glass floor';glassFloor.position.y=G;capsule.add(glassFloor);
 // Canopy: posts on the tub, a roof ring, a beam over each seat, a hatch plate between the middle seats, glass all round.
 {const post=roundCylinder(0.026,RY-G-0.29,0.006,seg(10)),py=(RY+G+0.29)/2,c=0.2*(1-Math.SQRT1_2);for(const sx of [-1,1])for(const sz of [-1,1])P.add(hull,post,sx*(PX-c),py,sz*(PZ-c));for(const x of [-0.44,0,0.44])for(const sz of [-1,1])P.add(hull,post,x,py,sz*PZ,0,0,0,0.85,1,0.85);
  P.add(hull,sweep(profileRect(0.05,0.05,0.014,2),roundRect(PX,PZ,0.2,seg(6))),0,RY,0);
  const roofGlass=new T.Mesh(plate(PX-0.02,PZ-0.02,0.19,RY+0.026),glass);roofGlass.name='Cockpit canopy roof';capsule.add(roofGlass);
  const band=new T.Mesh(sweep([[-0.002,G+0.3],[0.002,G+0.3],[0.002,RY-0.02],[-0.002,RY-0.02]],roundRect(PX,PZ,0.2,seg(6))),glass);band.name='Cockpit canopy glass';capsule.add(band);
  for(const x of [-0.19,0.19])P.add(hullDark,roundBox(0.07,0.035,0.04,0.008),x,RY,0);P.add(hullDark,roundBox(0.32,0.022,0.34,0.008),0,RY+0.03,0);
  P.add(dark,lathe([[0.09,0],[0.118,0,true],[0.118,0.03],[0.108,0.04],[0.09,0.04,true]],seg(20)),0,RY+0.041,0);P.add(hull,lathe([[0,0.03],[0.1,0.028],[0.108,0.032,true],[0.1,0.042],[0,0.045]],seg(20)),0,RY+0.03,0);
  P.add(steel,lathe(profileCircle(0.006,6).map(([u,v])=>[0.05+u,0.07+v]).concat([[0.056,0.07]]),seg(16)),0,RY+0.03,0);for(const a of [0,2.1,4.2])P.add(steel,roundBox(0.1,0.006,0.008,0.002),Math.cos(a)*0.025,RY+0.1,Math.sin(a)*0.025,0,-a,0);
  P.add(hullDark,roundBox(0.06,0.03,0.05,0.008),-0.13,RY+0.06,0);pd('hatch',0.2,0.045,0,RY+0.0425,0.148,0,-Math.PI/2);}
 // Work lights on the canopy corners.
 const podLamps=parts();for(const sx of [-1,1])for(const sz of [-1,1]){const x=sx*(PX-0.06),z=sz*(PZ-0.06);P.add(hullDark,roundBox(0.075,0.04,0.075,0.012),x,RY+0.045,z);podLamps.add(lampLens,lathe([[0,0],[0.026,0],[0.03,0.012],[0,0.016]],seg(10)),x,RY+0.064,z);}
 // Names and numbers on the hull.
 pd('crew',0.36,0.09,0,G+0.24,PZ+0.096);pd('tpk',0.62,0.075,0,G+0.065,-(PZ+0.096),Math.PI);for(const s of [-1,1]){pd('press',0.42,0.085,s*(PX+0.096),G+0.065,0,s*Math.PI/2);pd('logo',0.11,0.11,s*(PX+0.096),G+0.24,0,s*Math.PI/2);}
 // Bearing housing and drive shaft down to the cutter.
 P.add(dark,lathe([[0,-0.06],[0.16,-0.06,true],[0.16,-0.025],[0.13,0.008],[0,0.008]],seg(22)),0,G-0.02,0);P.add(steel,roundCylinder(0.058,G-0.08-D.cutterY,0.01,seg(14)),0,(G-0.08+D.cutterY)/2,0);for(const y of [D.cutterY+0.07,G-0.11])P.add(dark,roundCylinder(0.085,0.03,0.008,seg(14)),0,y,0);
 for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4;P.add(rubber,hose([[Math.cos(a)*0.12,G-0.06,Math.sin(a)*0.12],[Math.cos(a)*0.1,G-0.16,Math.sin(a)*0.1],[Math.cos(a)*0.075,D.cutterY+0.12,Math.sin(a)*0.075]],0.009,seg(10),seg(5)));}
 const cabin=new T.PointLight('#ffe6c2',D.cabinLight,D.cabinRange,2);cabin.name='Drill cabin light';cabin.position.set(0,D.roofY-0.06,D.bodyZ+0.3);capsule.add(cabin);
 // Cutter head: a toothed cutting ring on six arms round the plasma emitter. Its spokes turning are how the crew see the drill working.
 const cutter=new T.Group();cutter.name='Plasma cutter head';cutter.position.y=D.cutterY;capsule.add(cutter);const K=parts(),lens=mat('#bdf3ff',true);
 K.add(dark,lathe([[CR-0.07,-0.05],[CR+0.06,-0.05,true],[CR+0.075,-0.035],[CR+0.075,0.035],[CR+0.06,0.05,true],[CR-0.07,0.05,true],[CR-0.085,0.035],[CR-0.085,-0.035],[CR-0.07,-0.05]],seg(72)));
 const tooth=lathe([[0,-0.115],[0.028,-0.03],[0.036,-0.012,true],[0.036,0.012,true],[0,0.012]],seg(8)),flat=stripes(CR-0.36,0.05,0.035,0.035).clone().rotateX(-Math.PI/2);
 for(let i=0;i<30;i++){const a=i/30*Math.PI*2;K.add(steel,tooth,Math.cos(a)*CR,-0.05,Math.sin(a)*CR);}
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2,c=Math.cos(a),s=Math.sin(a),mid=(CR+0.2)/2,len=CR-0.2;K.add(graphite,roundBox(len,0.09,0.11,0.02),c*mid,0,-s*mid,0,a,0);K.add(graphite,roundBox(len-0.08,0.02,0.064,0.006),c*(mid+0.02),0.054,-s*(mid+0.02),0,a,0);K.add(yellow,flat,c*(mid+0.03),0.0645,-s*(mid+0.03),0,a,0);
  for(const r of [0.34,0.53,0.72])K.add(steel,tooth,c*r,-0.05,-s*r);}
 // Plasma emitter: a turned housing ringed with heat fins, a trim ring, and the glowing lens the core lance fires from.
 K.add(dark,lathe([[0,-0.075],[0.07,-0.075],[0.1,-0.06],[0.16,-0.035],[0.22,-0.012],[0.27,0.02],[0.28,0.06,true],[0.28,0.1,true],[0.245,0.13],[0,0.13]],seg(28)));
 {const fin=roundBox(0.11,0.1,0.012,0.004);for(let i=0;i<12;i++){const a=(i+0.5)/12*Math.PI*2;K.add(steel,fin,Math.cos(a)*0.33,0.045,-Math.sin(a)*0.33,0,a,0);}}
 K.add(yellow,lathe([[0.235,0.128],[0.29,0.128,true],[0.29,0.148,true],[0.235,0.148,true],[0.235,0.128]],seg(28)));K.add(dark,lathe([[0.04,-0.11],[0.07,-0.11,true],[0.075,-0.07],[0.04,-0.07,true],[0.04,-0.11]],seg(16)));K.add(lens,lathe([[0,-0.11],[0.03,-0.105],[0.045,-0.09],[0.05,-0.075]],seg(16)));
 // Plasma jets: nozzles between the spokes and in the hub fire bolts of plasma into the rock face; they turn with the cutter.
 const jets=[],jetGroup=new T.Group();jetGroup.name='Plasma jets';cutter.add(jetGroup);const jetMat=new T.MeshBasicMaterial({color:'#c4f4ff',transparent:true,opacity:0.85,blending:T.AdditiveBlending,depthWrite:false}),boltMat=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0.95,blending:T.AdditiveBlending,depthWrite:false}),hitMat=new T.MeshBasicMaterial({color:'#6fd2ff',transparent:true,opacity:0.75,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),jetGeo=new T.CylinderGeometry(0.016,0.04,1,10,1,true).translate(0,-0.5,0),boltGeo=new T.SphereGeometry(0.03,10,8),hitGeo=new T.CircleGeometry(0.15,20).rotateX(-Math.PI/2),face=-D.cutterY+0.012,downAxis=new T.Vector3(0,-1,0);
 const nozzle=lathe([[0.016,-0.03],[0.03,-0.03,true],[0.036,-0.006],[0.03,0.02],[0.02,0.03],[0.016,0.03]],seg(10));
 const addJet=(from,to,core)=>{const dir=to.clone().sub(from),len=dir.length(),m=new T.Mesh(jetGeo,jetMat);m.position.copy(from);m.quaternion.setFromUnitVectors(downAxis,dir.normalize());m.scale.set(core?1.8:1,len,core?1.8:1);if(!core)K.add(dark,nozzle,from.x,from.y+0.02,from.z);const bolt=new T.Mesh(boltGeo,boltMat),hit=new T.Mesh(hitGeo,hitMat);hit.position.copy(to);jetGroup.add(m,bolt,hit);jets.push({mesh:m,bolt,hit,from,to,to0:to.clone(),core,len,toY:to.y,phase:jets.length*0.37%1});};
 for(let i=0;i<6;i++){const a=(i+0.5)/6*Math.PI*2;addJet(new T.Vector3(Math.cos(a)*CR*0.78,-0.07,Math.sin(a)*CR*0.78),new T.Vector3(Math.cos(a)*CR*0.4,face,Math.sin(a)*CR*0.4),false);}addJet(new T.Vector3(0,-0.13,0),new T.Vector3(0,face,0),true);
 K.build(cutter,{ground:-0.2,grime:0.2,uvScale:2.5});
 const plasma=new T.Group();plasma.name='Plasma glow';capsule.add(plasma);const plasmaMat=new T.MeshBasicMaterial({color:'#7fd0ff',transparent:true,opacity:0.85,blending:T.AdditiveBlending,depthWrite:false});
 const ringGlow=new T.Mesh(new T.TorusGeometry(CR,0.05,6,56).rotateX(Math.PI/2),plasmaMat);ringGlow.position.y=D.cutterY-0.16;plasma.add(ringGlow);const disc=new T.Mesh(new T.CircleGeometry(0.3,24).rotateX(-Math.PI/2),plasmaMat);disc.position.y=D.cutterY-0.14;plasma.add(disc);
 const glow=new T.PointLight('#7cc8ff',D.plasmaLight,D.plasmaRange,2);glow.name='Drill plasma light';glow.position.y=0.12;plasma.add(glow);
 // Crew stations. Seat order fills the middle first, so a crew of two sit side by side in the centre.
 const view=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(new T.Vector3(),new T.Vector3(0,Math.sin(D.boardPitch),-Math.cos(D.boardPitch)),new T.Vector3(0,1,0)));
 const seats=[],pads=[],seatSpots=[],consoles=[],stations=[],glove=mat('#e4e9e3'),suit=mat('#e9ece6'),cushion=f('fabric','#2a3438'),padGeo=roundBox(0.2,0.05,0.62,0.02),seatGeo=roundBox(0.05,0.012,0.6,0.005),lightGeo=roundBox(0.014,0.01,0.008,0.002);
 const hand=side=>{const k=parts(),fingerGeo=new T.CapsuleGeometry(0.0072,0.022,3,6);k.add(glove,fingerGeo,side*0.006,0,0.014,0,0,0,2.6,1.9,1.9);for(let n=0;n<4;n++)k.add(glove,fingerGeo,side*0.002,0.019-n*0.0125,-0.016,0,0,Math.PI/2);k.add(glove,fingerGeo,-side*0.004,0.03,-0.002,-0.6,0,0);return k;};
 for(let k=0;k<4;k++){const sx=([1,2,0,3][k]-1.5)*D.seatGap;seatSpots.push({x:sx,z:D.bodyZ});
  const pad=parts().add(cushion,padGeo).build(capsule)[0];pad.position.set(sx,D.bodyY-0.1,D.bodyZ+0.12);pads.push(pad);const seat=new T.Mesh(seatGeo,mat('#243d40'));seat.position.set(sx,D.bodyY-0.07,D.bodyZ+0.12);seat.castShadow=seat.receiveShadow=true;capsule.add(seat);seats.push(seat);
  // Seat frame: legs from the glass ring to the pad, a back post up to the roof beam, the roof beam itself.
  for(const dx of [-0.07,0.07])for(const dz of [-0.12,0.32])P.add(steel,roundCylinder(0.011,D.bodyY-0.125-G,0.003,seg(8)),sx+dx,(D.bodyY-0.125+G)/2,D.bodyZ+dz);
  P.add(steel,roundCylinder(0.016,RY-D.bodyY,0.004,seg(10)),sx,(RY+D.bodyY)/2,D.bodyZ+0.3);P.add(hull,roundBox(0.042,0.042,2*PZ-0.02,0.01),sx,RY,0);pd('num'+(k+1),0.075,0.075,sx,G+0.235,PZ+0.0965);
  // A station is authored in the seated crew member's view space: x right, y up the screen, -z into the view.
  const g=new T.Group();g.name='Crew station';g.position.set(sx,D.eye,D.eyeZ);g.quaternion.copy(view);capsule.add(g);const dash=new T.Group();g.add(dash);
  const S=parts();S.add(graphite,roundBox(D.seatGap,0.17,0.03,0.008),0,-0.2,-0.385);S.add(yellow,roundBox(D.seatGap,0.008,0.032,0.003),0,-0.113,-0.383);S.add(dark,roundBox(0.2,0.115,0.035,0.008),0,-0.172,-0.372);S.build(dash,{shadows:false});
  const L=parts();for(let r=0;r<3;r++)for(let c=0;c<3;c++){const col=['#4fd17f','#e6b84a','#ff5d5d','#80d8ff'][(c+r*3+k)%4];for(const side of [-1,1])L.add(mat(col,true),lightGeo,side*(0.125+c*0.03),-0.145-r*0.026,-0.368);}const lights=L.build(dash,{shadows:false});
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=144;const screenTexture=new T.CanvasTexture(canvas);screenTexture.colorSpace=T.SRGBColorSpace;const screen=new T.Mesh(new T.PlaneGeometry(0.18,0.101),new T.MeshBasicMaterial({map:screenTexture,toneMapped:false}));screen.name='Gauge screen';screen.position.set(0,-0.172,-0.353);dash.add(screen);
  const status=box(dash,'#80d8ff',0.22,0.01,0.01,0,-0.106,-0.37,true);consoles.push(status);parts().add(graphite,roundBox(D.seatGap,0.012,0.09,0.004),0,-0.222,-0.31).build(g,{shadows:false});
  const sticks=[],sleeves=[],bands=[],cuffs=[];for(const side of [-1,1]){const pivot=new T.Group();pivot.position.set(side*0.13,-0.215,-0.3);pivot.rotation.x=D.stickBase;g.add(pivot);
   parts().add(rubber,lathe([[0,0],[0.024,0,true],[0.024,0.008],[0.012,0.016],[0,0.016]],seg(12)),0,-0.002,0).add(steel,roundCylinder(0.008,0.09,0.002,seg(8)),0,0.05,0).add(rubber,roundCylinder(0.015,0.055,0.006,seg(10)),0,0.1,0).build(pivot,{shadows:false});
   const button=cylinder(pivot,'#f2c230',0.008,0.01,0,0.13,-0.004,true);
   const handGroup=new T.Group();handGroup.position.set(0,0.1,0);pivot.add(handGroup);hand(side).build(handGroup,{shadows:false});const cuff=new T.Mesh(geometries.cylinder,mat('#2f6f8f'));cuff.scale.set(0.026,0.022,0.026);cuff.position.set(side*0.006,-0.032,0.022);cuff.rotation.x=0.9;handGroup.add(cuff);cuffs.push(cuff);
   const sleeve=new T.Mesh(geometries.cylinder,suit);sleeve.scale.set(0.028,0.1,0.028);g.add(sleeve);sleeves.push(sleeve);const band=new T.Mesh(geometries.cylinder,mat('#2f6f8f'));band.scale.set(0.03,0.018,0.03);g.add(band);bands.push(band);sticks.push({pivot,hand:handGroup,button,side});}
  stations.push({group:g,dash,sticks,sleeves,bands,cuffs,lights,screen:{canvas,ctx:canvas.getContext('2d'),texture:screenTexture,key:''},tunedAt:-Infinity});}
 P.build(capsule,{ground:G-0.08,grime:0.2,uvScale:2.5});podLamps.build(capsule,{shadows:false});
 const cables=[];for(const x of [-PX+0.03,PX-0.03])for(const z of [-PZ+0.03,PZ-0.03])cables.push(cylinder(root,'#9aa6a8',0.012,1,x,top/2,z));
 scene.add(root);return {root,capsule,cables,bit:cutter,cutter,plasma,jets,jetGroup,seats,pads,seatSpots,consoles,stations,cabin,plasmaLight:glow};}
 return {box,cylinder,mesh,label,rover,depot,pump,drill,mat,geometries,finish,decal,decalUV,low,seg,look};
}
