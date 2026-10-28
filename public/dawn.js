import * as T from './vendor/three.module.js';
import {C} from '../config.js';
// The sky. At night the dome is a navy gradient, darkest overhead, with a faint band of stars across it (C.look.night); in the
// finale it warms into a dawn, then finishes as a clear blue day with soft clouds; fog, hemisphere light, sun colour and glow,
// stars and the small moon follow the same blend. blend(0) is the untouched night, which is how a new expedition starts.
// The dome draws at the far plane (z = w), so a camera near the claim's edge never sees it clipped away to the background.
const SKY_VERT='varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position.z=gl_Position.w;}';
const SKY_FRAG='uniform vec3 nightZenith;uniform vec3 nightHorizon;uniform vec3 band;uniform vec3 bandNormal;uniform float bandWidth;uniform vec3 zenith;uniform vec3 horizon;uniform vec3 below;uniform vec3 sunDir;uniform vec3 sunGlow;uniform float day;varying vec3 vDir;'+
 'void main(){vec3 d=normalize(vDir);float h=d.y;vec3 sky=mix(horizon,zenith,pow(smoothstep(-0.02,0.42,h),0.6));sky=mix(below,sky,smoothstep(-0.2,0.015,h));'+
 'float s=max(dot(d,sunDir),0.0);sky+=sunGlow*(pow(s,8.0)*0.2+pow(s,48.0)*0.6);'+
 'float lane=dot(d,bandNormal)/bandWidth,clump=0.55+0.45*sin(d.x*13.0+sin(d.z*9.0)*2.0)*sin(d.y*11.0-d.z*6.0);'+
 'vec3 night=mix(nightHorizon,nightZenith,smoothstep(-0.03,0.6,h))+band*exp(-lane*lane)*clump*smoothstep(-0.04,0.3,h);'+
 'gl_FragColor=vec4(mix(night,sky,day),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
export function skyMaterial(night){return new T.ShaderMaterial({uniforms:{nightZenith:{value:new T.Color(night.zenith)},nightHorizon:{value:new T.Color(night.horizon)},band:{value:new T.Color(night.band)},bandNormal:{value:new T.Vector3(...night.bandNormal).normalize()},bandWidth:{value:night.bandWidth},zenith:{value:new T.Color()},horizon:{value:new T.Color()},below:{value:new T.Color()},sunDir:{value:new T.Vector3(0,1,0)},sunGlow:{value:new T.Color()},day:{value:0}},vertexShader:SKY_VERT,fragmentShader:SKY_FRAG,side:T.BackSide,depthWrite:false});}
// Reflections: a small prefiltered map (PMREM) baked once from a gradient sky over a plain ground, a soft glow toward the sun,
// so metal, glass and visors reflect a dark sky over pale regolith (or, in the finale's day, blue sky over meadow). The ground
// half is what makes chrome read as chrome here. Returns the render target, or null where the renderer cannot bake (tests).
const ENV_FRAG='uniform vec3 zenith;uniform vec3 horizon;uniform vec3 ground;uniform vec3 glow;uniform vec3 sunDir;varying vec3 vDir;'+
 'void main(){vec3 d=normalize(vDir);float h=d.y;vec3 c=mix(horizon,zenith,smoothstep(0.0,0.7,h));c=mix(ground,c,smoothstep(-0.06,0.03,h));'+
 'c+=glow*pow(max(dot(d,sunDir),0.0),6.0)*0.6*smoothstep(-0.1,0.1,h);gl_FragColor=vec4(c,1.0);}';
export function bakeEnvironment(gl,palette,sunDir,size=64){
 if(!gl?.capabilities?.isWebGL2||typeof gl.setRenderTarget!=='function'||typeof T.PMREMGenerator!=='function')return null;
 const pmrem=new T.PMREMGenerator(gl),scene=new T.Scene(),material=new T.ShaderMaterial({uniforms:{zenith:{value:new T.Color(palette.zenith)},horizon:{value:new T.Color(palette.horizon)},ground:{value:new T.Color(palette.ground)},glow:{value:new T.Color(palette.glow)},sunDir:{value:sunDir.clone()}},vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:ENV_FRAG,side:T.BackSide,depthWrite:false,depthTest:false}),dome=new T.Mesh(new T.SphereGeometry(10,32,16),material);
 scene.add(dome);let target=null;try{target=pmrem.fromScene(scene,0,0.1,100,{size});}catch(error){console.warn('Toothpick 3D: reflections unavailable.',error);}
 dome.geometry.dispose();material.dispose();pmrem.dispose();return target;}
function cloudTexture(){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d');let seed=7;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0;i<22;i++){const x=40+r()*176,y=58+r()*34-Math.abs(x-128)*0.12,rad=18+r()*30*(1-Math.abs(x-128)/150),g=c.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,'rgba(255,255,255,0.55)');g.addColorStop(0.55,'rgba(255,255,255,0.28)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,256,128);}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;}
// The direction toward the sun from the claim's centre (three.sun, which visual.sunPosition sits on): the light and its shadows,
// the sky's glow and the baked reflections all share it.
export function sunDirection(center){return new T.Vector3(...C.three.sun).sub(center).normalize();}
export function createDawn(scene,{sky,skyLight,sun,sunHalo,sunDisk,stars,moon,center}){
 const D=C.dawn,L=C.look,col=hex=>new T.Color(hex),palette=key=>({zenith:col(D[key].zenith),horizon:col(D[key].horizon),below:col(D[key].below),sunGlow:col(D[key].sunGlow),fog:col(D[key].fog),hemiSky:col(D[key].hemiSky),hemiGround:col(D[key].hemiGround),sun:col(D[key].sun),halo:col(D[key].halo)});
 const night={fog:scene.fog.color.clone(),fogNear:scene.fog.near,fogFar:scene.fog.far,background:scene.background.clone(),hemiSky:skyLight.color.clone(),hemiGround:skyLight.groundColor.clone(),sun:sun.color.clone(),halo:sunHalo.material.color.clone(),disk:sunDisk.material.color.clone(),moon:moon.material.color.clone(),haloOpacity:sunHalo.material.opacity,haloScale:sunHalo.scale.x,stars:stars.material.opacity};
 const dawn=palette('dawn'),day=palette('day'),mixed={},U=sky.material.uniforms,sunDir=sunDirection(center);U.sunDir.value.copy(sunDir);
 // A few soft clouds on a slow carousel around the claim.
 const clouds=new T.Group();clouds.name='Day clouds';clouds.position.copy(center);clouds.visible=false;scene.add(clouds);const cloudMat=new T.SpriteMaterial({map:cloudTexture(),color:'#ffffff',transparent:true,opacity:0,depthWrite:false,fog:false});
 for(let i=0;i<D.clouds;i++){const a=i/D.clouds*Math.PI*2+Math.sin(i*2.3)*0.35,dist=D.cloudDistance*(0.85+0.15*Math.sin(i*1.7)),cloud=new T.Sprite(cloudMat);cloud.position.set(Math.sin(a)*dist,D.cloudHeight*(0.75+0.45*((i*37)%10)/10),Math.cos(a)*dist);cloud.scale.set(D.cloudSize*(0.8+0.5*((i*13)%7)/7),D.cloudSize*0.38,1);clouds.add(cloud);}
 const lerp3=(a,b,t,out)=>out.copy(a).lerp(b,t);
 let current=-1;const state={ambientScale:1,sunScale:1,day:0};
 // b runs 0 to 1: the first half fades night into dawn, the second half turns dawn into day.
 function blend(b,now=0,reduced=false){b=Math.min(1,Math.max(0,b||0));clouds.rotation.y=reduced?0:now/1000*D.cloudDrift;if(b===current)return state;current=b;
  const amount=Math.min(1,b*2),t=Math.max(0,b*2-1);for(const k of Object.keys(dawn))mixed[k]=lerp3(dawn[k],day[k],t,mixed[k]||new T.Color());
  U.day.value=amount;U.zenith.value.copy(mixed.zenith);U.horizon.value.copy(mixed.horizon);U.below.value.copy(mixed.below);U.sunGlow.value.copy(mixed.sunGlow);
  scene.fog.color.copy(night.fog).lerp(mixed.fog,amount);scene.background.copy(night.background).lerp(mixed.fog,amount);scene.fog.near=night.fogNear+(D.fogNear-night.fogNear)*amount;scene.fog.far=night.fogFar+(D.fogFar-night.fogFar)*amount;
  skyLight.color.copy(night.hemiSky).lerp(mixed.hemiSky,amount);skyLight.groundColor.copy(night.hemiGround).lerp(mixed.hemiGround,amount);sun.color.copy(night.sun).lerp(mixed.sun,amount);
  sunHalo.material.color.copy(night.halo).lerp(mixed.halo,amount);sunHalo.material.opacity=night.haloOpacity+(D.haloOpacity-night.haloOpacity)*amount;sunHalo.scale.setScalar(night.haloScale*(1+(D.haloScale-1)*amount));
  sunDisk.material.color.copy(night.disk).lerp(col(D.disk),amount);moon.material.color.copy(night.moon).lerp(col(D.moon),amount);stars.material.opacity=night.stars*(1-Math.min(1,b/0.55));
  clouds.visible=b>0.35;cloudMat.opacity=D.cloudOpacity*Math.min(1,Math.max(0,(b-0.35)/0.5));state.ambientScale=1+(D.ambient/L.sky.intensity-1)*amount;state.sunScale=1+(D.sunIntensity/L.sun.intensity-1)*amount;state.day=amount;return state;}
 blend(0);
 return {blend,state,clouds,reset(){current=-1;blend(0);}};
}
