import * as T from './vendor/three.module.js';
import {C} from '/config.js';

// The planet's core: a cracked violet stone shell around a blazing energy heart.
// It glows at the bottom of the bore during the World Breaker countdown, then rises and splits open when the core restarts.
// Opening fires shockwave rings across the surface and streams embers up a soft pillar of light.
// Custom shaders write linear HDR colour and finish with three's tone mapping and colour space chunks, so they match the rest
// of the scene whether the frame goes through the glow composite or straight to the canvas.
const OUTPUT='\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
const BEAM_VERT='varying vec2 vUv;varying float vFacing;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.0);vFacing=abs(dot(normalize(normalMatrix*normal),normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}';
const BEAM_FRAG='uniform vec3 color;uniform float opacity;uniform float softness;uniform float fadeFrom;varying vec2 vUv;varying float vFacing;void main(){float edge=pow(vFacing,softness);float fade=smoothstep(0.0,0.05,vUv.y)*(1.0-smoothstep(fadeFrom,1.0,vUv.y));gl_FragColor=vec4(color,opacity*edge*fade);'+OUTPUT;
const RING_FRAG='uniform vec3 color;uniform float opacity;uniform float width;varying vec2 vUv;void main(){float d=length(vUv*2.0-1.0);float ring=smoothstep(1.0-width,1.0-width*0.3,d)*(1.0-smoothstep(0.96,1.0,d));gl_FragColor=vec4(color,opacity*ring);'+OUTPUT;
const EMBER_VERT='attribute vec4 seed;uniform float age;uniform float time;uniform vec3 origin;uniform float top;uniform float scale;uniform float size;uniform float intensity;varying float vAlpha;varying vec3 vColor;'+
 'void main(){float life=3.0+seed.x*3.5;float t=age-seed.y*life;float k=fract(max(t,0.0)/life);float h=mix(origin.y,top,k*(0.5+0.5*seed.w));'+
 'float a=seed.z*6.2832+time*(0.35+seed.x*0.5)+k*4.0;float r=(0.12+0.8*seed.w*k+0.35*k*k)*(0.7+0.3*sin(time*1.7+seed.y*40.0));'+
 'vec3 p=vec3(origin.x+cos(a)*r,h,origin.z+sin(a)*r);p.x+=sin(h*1.7+time*1.3+seed.y*9.0)*0.2*k;p.z+=cos(h*1.3+time*1.1+seed.x*7.0)*0.2*k;'+
 'vAlpha=step(0.0,t)*intensity*smoothstep(0.0,0.05,k)*(1.0-smoothstep(0.5,1.0,k));vColor=mix(vec3(1.0,0.38,0.86),vec3(1.0,0.78,0.42),seed.x)*(1.4+2.2*(1.0-k));'+
 'vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=min(48.0,size*scale*(0.45+seed.w)/max(0.2,-mv.z));gl_Position=projectionMatrix*mv;}';
const EMBER_FRAG='varying float vAlpha;varying vec3 vColor;void main(){float a=1.0-smoothstep(0.0,0.5,length(gl_PointCoord-0.5));gl_FragColor=vec4(vColor,a*a*vAlpha);'+OUTPUT;
export function createCore(scene,assets){
 const K=C.core,root=new T.Group();root.name='Planet core';root.visible=false;scene.add(root);
 const spin=new T.Group();root.add(spin);
 // The heart's palette is authored in display colours; pow(2.2) brings it to linear light so the HDR boost blooms.
 const heartMat=new T.ShaderMaterial({uniforms:{time:{value:0},heat:{value:0}},vertexShader:'varying vec3 vPos;varying vec3 vN;void main(){vPos=position;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform float time;uniform float heat;varying vec3 vPos;varying vec3 vN;float h(vec3 p){return sin(p.x*7.0+time*1.3)*sin(p.y*9.0-time*1.1)*sin(p.z*8.0+time*0.7);}void main(){float n=0.5+0.35*h(vPos*2.0)+0.25*h(vPos*4.3+3.0);float rim=pow(1.0-abs(vN.z),2.0);vec3 c=mix(vec3(0.45,0.25,0.95),vec3(1.0,0.32,0.82),clamp(n,0.0,1.0));c=mix(c,vec3(1.0,0.94,1.0),smoothstep(0.78,1.05,n+heat*0.15));c=pow(clamp(c,0.0,1.0),vec3(2.2))+rim*vec3(1.0,0.4,1.0)*(0.5+heat);gl_FragColor=vec4(c*(1.25+heat*2.2),1.0);'+OUTPUT});
 const heart=new T.Mesh(new T.SphereGeometry(K.heartRadius,48,32),heartMat);spin.add(heart);
 // Shell: an icosphere broken into shards around evenly spread directions, each with glowing crack edges.
 const shell=new T.IcosahedronGeometry(K.shellRadius,2).toNonIndexed(),pos=shell.attributes.position,dirs=[],shards=[];
 for(let i=0;i<K.shards;i++){const y=1-2*(i+0.5)/K.shards,r=Math.sqrt(1-y*y),a=i*2.399963;dirs.push(new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}
 const groups=dirs.map(()=>[]),v=new T.Vector3();
 for(let t=0;t<pos.count;t+=3){v.set(0,0,0);for(let k=0;k<3;k++)v.add(new T.Vector3().fromBufferAttribute(pos,t+k));v.normalize();let best=0,bd=-2;dirs.forEach((d,i)=>{const s=d.dot(v);if(s>bd){bd=s;best=i;}});for(let k=0;k<3;k++)groups[best].push(pos.getX(t+k),pos.getY(t+k),pos.getZ(t+k));}
 const rock=new T.MeshStandardMaterial({color:'#33263f',roughness:0.85,metalness:0.1,emissive:'#5b2f8c',emissiveIntensity:K.shellGlow,flatShading:true,side:T.DoubleSide}),crack=new T.LineBasicMaterial({color:new T.Color('#f0d4ff').multiplyScalar(K.crackGlow),transparent:true,opacity:0.9,blending:T.AdditiveBlending,depthWrite:false});
 groups.forEach((g,i)=>{if(!g.length)return;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(g,3));geo.computeVertexNormals();const shard=new T.Group(),mesh=new T.Mesh(geo,rock);shard.add(mesh,new T.LineSegments(new T.EdgesGeometry(geo,1),crack));shard.userData.dir=dirs[i];shard.userData.tumble=new T.Vector3(Math.sin(i*1.7),Math.cos(i*2.3),Math.sin(i*0.9)).multiplyScalar(0.6);spin.add(shard);shards.push(shard);});
 const halo=new T.Sprite(new T.SpriteMaterial({map:assets.softDust,color:new T.Color('#ff7ae0').multiplyScalar(K.haloGlow),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,fog:false}));root.add(halo);
 // The core's light hangs in the scene, not in root: root stays hidden until the World Breaker starts, and a light appearing changes the
 // scene's light count, which makes every lit material compile a new shader in that frame. It stays dark until the core shows.
 const light=new T.PointLight('#ff6be6',0,K.lightRange,2);light.name='Core light';scene.add(light);
 const rays=new T.Group();root.add(rays);const rayMat=new T.MeshBasicMaterial({color:'#ffc4f4',transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
 for(let i=0;i<K.rays;i++){const ray=new T.Mesh(new T.PlaneGeometry(0.06,K.rayLength),rayMat);ray.position.y=K.rayLength/2;const arm=new T.Group();arm.rotation.set(Math.sin(i*2.1)*1.2,i/K.rays*Math.PI*2,Math.cos(i*1.3)*1.2);arm.add(ray);rays.add(arm);}
 // The light pillar: a bright inner column and a wide faint cone, both fading at their silhouettes so they read as volumes of light.
 const beamMaterial=(color,softness,fadeFrom)=>new T.ShaderMaterial({uniforms:{color:{value:new T.Color(color)},opacity:{value:0},softness:{value:softness},fadeFrom:{value:fadeFrom}},vertexShader:BEAM_VERT,fragmentShader:BEAM_FRAG,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
 const beamMat=beamMaterial('#ffd6f7',1.2,0.5),beam=new T.Mesh(new T.CylinderGeometry(0.32,0.62,1,32,1,true),beamMat);beam.name='Core light pillar';beam.frustumCulled=false;scene.add(beam);
 const coneMat=beamMaterial('#ffb8ec',2.2,0.3),cone=new T.Mesh(new T.CylinderGeometry(K.coneTop,K.coneBottom,1,40,1,true),coneMat);cone.name='Core light cone';cone.frustumCulled=false;scene.add(cone);
 const debris=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#3b2d48',roughness:0.9,emissive:'#4a2670',emissiveIntensity:0.4,flatShading:true}),K.debris),dummy=new T.Object3D();root.add(debris);
 // Embers ride the pillar from the core to the sky. Positions come from per-ember seeds in the vertex shader, so they cost no CPU work.
 const emberGeo=new T.BufferGeometry(),seeds=new Float32Array(K.embers*4);for(let i=0;i<K.embers;i++){const r=k=>{const x=Math.sin((i+1)*(12.9898+k*7.13)+k*78.233)*43758.5453;return x-Math.floor(x);};seeds.set([r(1),r(2),r(3),r(4)],i*4);}
 emberGeo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(K.embers*3),3));emberGeo.setAttribute('seed',new T.Float32BufferAttribute(seeds,4));
 const emberMat=new T.ShaderMaterial({uniforms:{age:{value:0},time:{value:0},origin:{value:new T.Vector3()},top:{value:K.beamTop},scale:{value:400},size:{value:K.emberSize},intensity:{value:0}},vertexShader:EMBER_VERT,fragmentShader:EMBER_FRAG,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
 const embers=new T.Points(emberGeo,emberMat);embers.name='Core embers';embers.frustumCulled=false;embers.visible=false;scene.add(embers);
 // Shockwave rings race across the surface the moment the shell splits.
 const ringGeo=new T.PlaneGeometry(2,2).rotateX(-Math.PI/2),rings=Array.from({length:K.openRings},(_,i)=>{const m=new T.Mesh(ringGeo,new T.ShaderMaterial({uniforms:{color:{value:new T.Color(i%2?'#ffc8f0':'#ffffff').multiplyScalar(K.ringGlow)},opacity:{value:0},width:{value:0.3}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:RING_FRAG,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));m.name='Core shockwave';m.frustumCulled=false;m.visible=false;scene.add(m);return m;});
 const camPos=new T.Vector3();let seenAt=null,emberRange=K.embers;const ease=t=>1-Math.pow(1-Math.min(1,Math.max(0,t)),3);
 function update(state,serverNow,now,floorY,reduced,view={}){const team=state.team,site=team?.site,wb=team?.worldBreaker,won=!!team?.won;
  if(!won)seenAt=null;root.visible=site!=null&&(won||!!wb);if(!root.visible){beam.visible=cone.visible=embers.visible=false;for(const r of rings)r.visible=false;light.intensity=0;return null;}
  const x=site%C.mapSize+0.5,z=Math.floor(site/C.mapSize)+0.5,clock=reduced?0:now/1000;heartMat.uniforms.time.value=clock;
  let y,scale,open,glow,heat,s=0;
  if(!won){const t=Math.min(1,Math.max(0,wb.charge??(serverNow-wb.startedAt)/Math.max(1,wb.endsAt-wb.startedAt)));y=floorY-K.embed;scale=K.boreScale*(1+(reduced?0:0.04*Math.sin(clock*(3+9*t))));open=0;glow=0.35+0.55*t;heat=t*0.5;}
  else{seenAt??=serverNow;s=(serverNow-Math.max(team.wonAt??serverNow,seenAt))/1000;y=floorY-K.embed;scale=K.boreScale*(1+0.15*ease(s/K.openSeconds));open=ease((s-K.openAt)/K.openSeconds);glow=0.9+0.1*open;heat=0.5+0.5*open;}
  root.position.set(x,y,z);light.position.set(x,y,z);root.scale.setScalar(scale);spin.rotation.y=reduced?0:clock*0.25;heartMat.uniforms.heat.value=heat;
  for(const shard of shards){const d=shard.userData.dir;shard.position.copy(d).multiplyScalar(open*K.openDistance);shard.rotation.set(shard.userData.tumble.x*open,shard.userData.tumble.y*open,shard.userData.tumble.z*open);}
  // Fade the sprite halo and the pillar walls when the camera flies close, so the bore orbit is not washed out to white.
  const camera=view.camera;if(camera)camPos.setFromMatrixPosition(camera.matrixWorld);const near=camera?Math.min(1,Math.max(0,(camPos.distanceTo(root.position)-1.2)/3.5)):1,axis=camera?Math.min(1,Math.max(0,(Math.hypot(camPos.x-x,camPos.z-z)-0.5)/2.5)):1;
  const top=K.beamTop,bottom=y,flicker=reduced?1:0.85+0.15*Math.sin(clock*6);beam.visible=cone.visible=won&&open>0;
  beam.scale.set(1,Math.max(0.01,top-bottom),1);beam.position.set(x,(top+bottom)/2,z);cone.scale.copy(beam.scale);cone.position.copy(beam.position);
  beamMat.uniforms.opacity.value=K.beamOpacity*open*flicker*(0.3+0.7*axis);coneMat.uniforms.opacity.value=K.coneOpacity*open*(0.4+0.6*axis);
  halo.material.opacity=glow*0.85*(0.2+0.8*near);halo.scale.setScalar(K.haloSize*(0.7+0.5*open));light.intensity=K.lightIntensity*glow*(1+0.4*open);rayMat.opacity=0.55*open*(0.35+0.65*near);rays.rotation.y=reduced?0:clock*0.4;
  for(let i=0;i<K.debris;i++){const a=i*2.399963+clock*(0.15+0.05*(i%3)),r=K.shellRadius*(1.6+0.9*((i*37)%10)/10)*(0.4+0.6*open),h=Math.sin(i*1.9+clock*0.5)*0.5;dummy.position.set(Math.cos(a)*r,h,Math.sin(a)*r);dummy.rotation.set(i,clock*0.7+i,0);dummy.scale.setScalar(0.03+0.05*((i*13)%7)/7);dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix);}
  debris.instanceMatrix.needsUpdate=true;debris.visible=won;
  const since=s-K.openAt;embers.visible=won&&since>0;if(embers.visible){const U=emberMat.uniforms;U.age.value=reduced?8:since;U.time.value=reduced?0:now/1000;U.origin.value.set(x,y,z);U.scale.value=(view.pixelHeight||800)/2;U.intensity.value=Math.min(1,since/0.6);const count=Math.max(1,Math.floor(K.embers*(view.embers??1)));if(count!==emberRange){emberRange=count;emberGeo.setDrawRange(0,count);}}
  rings.forEach((ring,i)=>{const t=(since-i*K.ringStagger)/K.ringSeconds;ring.visible=won&&!reduced&&t>=0&&t<1;if(!ring.visible)return;const radius=0.6+K.ringReach*(1-Math.pow(1-t,2.2));ring.position.set(x,0.06+i*0.01,z);ring.scale.setScalar(radius);ring.material.uniforms.width.value=Math.min(0.8,K.ringWidth/radius);ring.material.uniforms.opacity.value=Math.pow(1-t,1.4);});
  return {x,y,z,won,open,s};}
 return {root,update,revealStart:()=>seenAt,beam,cone,embers};
}
