import * as T from './vendor/three.module.js';
import {C} from '/config.js';

// The planet's core: a cracked violet stone shell around a blazing energy heart.
// It glows at the bottom of the bore during the World Breaker countdown, then rises and splits open when the core restarts.
export function createCore(scene,assets){
 const K=C.core,root=new T.Group();root.name='Planet core';root.visible=false;scene.add(root);
 const spin=new T.Group();root.add(spin);
 const heartMat=new T.ShaderMaterial({uniforms:{time:{value:0},heat:{value:0}},vertexShader:'varying vec3 vPos;varying vec3 vN;void main(){vPos=position;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform float time;uniform float heat;varying vec3 vPos;varying vec3 vN;float h(vec3 p){return sin(p.x*7.0+time*1.3)*sin(p.y*9.0-time*1.1)*sin(p.z*8.0+time*0.7);}void main(){float n=0.5+0.35*h(vPos*2.0)+0.25*h(vPos*4.3+3.0);float rim=pow(1.0-abs(vN.z),2.0);vec3 c=mix(vec3(0.45,0.25,0.95),vec3(1.0,0.32,0.82),clamp(n,0.0,1.0));c=mix(c,vec3(1.0,0.94,1.0),smoothstep(0.78,1.05,n+heat*0.15));c+=rim*vec3(1.0,0.55,1.0)*(0.6+heat);gl_FragColor=vec4(c*(1.1+heat*0.6),1.0);}'});
 const heart=new T.Mesh(new T.SphereGeometry(K.heartRadius,48,32),heartMat);spin.add(heart);
 // Shell: an icosphere broken into shards around evenly spread directions, each with glowing crack edges.
 const shell=new T.IcosahedronGeometry(K.shellRadius,2).toNonIndexed(),pos=shell.attributes.position,dirs=[],shards=[];
 for(let i=0;i<K.shards;i++){const y=1-2*(i+0.5)/K.shards,r=Math.sqrt(1-y*y),a=i*2.399963;dirs.push(new T.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}
 const groups=dirs.map(()=>[]),v=new T.Vector3();
 for(let t=0;t<pos.count;t+=3){v.set(0,0,0);for(let k=0;k<3;k++)v.add(new T.Vector3().fromBufferAttribute(pos,t+k));v.normalize();let best=0,bd=-2;dirs.forEach((d,i)=>{const s=d.dot(v);if(s>bd){bd=s;best=i;}});for(let k=0;k<3;k++)groups[best].push(pos.getX(t+k),pos.getY(t+k),pos.getZ(t+k));}
 const rock=new T.MeshStandardMaterial({color:'#33263f',roughness:0.85,metalness:0.1,emissive:'#5b2f8c',emissiveIntensity:0.35,flatShading:true,side:T.DoubleSide}),crack=new T.LineBasicMaterial({color:'#f0d4ff',transparent:true,opacity:0.9,blending:T.AdditiveBlending,depthWrite:false});
 groups.forEach((g,i)=>{if(!g.length)return;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(g,3));geo.computeVertexNormals();const shard=new T.Group(),mesh=new T.Mesh(geo,rock);shard.add(mesh,new T.LineSegments(new T.EdgesGeometry(geo,1),crack));shard.userData.dir=dirs[i];shard.userData.tumble=new T.Vector3(Math.sin(i*1.7),Math.cos(i*2.3),Math.sin(i*0.9)).multiplyScalar(0.6);spin.add(shard);shards.push(shard);});
 const halo=new T.Sprite(new T.SpriteMaterial({map:assets.softDust,color:'#ff7ae0',transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,fog:false}));root.add(halo);
 const light=new T.PointLight('#ff6be6',0,K.lightRange,2);root.add(light);
 const rays=new T.Group();root.add(rays);const rayMat=new T.MeshBasicMaterial({color:'#ffc4f4',transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
 for(let i=0;i<K.rays;i++){const ray=new T.Mesh(new T.PlaneGeometry(0.06,K.rayLength),rayMat);ray.position.y=K.rayLength/2;const arm=new T.Group();arm.rotation.set(Math.sin(i*2.1)*1.2,i/K.rays*Math.PI*2,Math.cos(i*1.3)*1.2);arm.add(ray);rays.add(arm);}
 const beamMat=new T.MeshBasicMaterial({color:'#ffd6f7',transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:false}),beam=new T.Mesh(new T.CylinderGeometry(0.32,0.62,1,20,1,true),beamMat);beam.name='Core light pillar';scene.add(beam);
 const debris=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#3b2d48',roughness:0.9,emissive:'#4a2670',emissiveIntensity:0.4,flatShading:true}),K.debris),dummy=new T.Object3D();root.add(debris);
 let seenAt=null;const ease=t=>1-Math.pow(1-Math.min(1,Math.max(0,t)),3);
 function update(state,serverNow,now,floorY,reduced){const team=state.team,site=team?.site,wb=team?.worldBreaker,won=!!team?.won;
  if(!won)seenAt=null;root.visible=site!=null&&(won||!!wb);if(!root.visible){beam.visible=false;return null;}
  const x=site%C.mapSize+0.5,z=Math.floor(site/C.mapSize)+0.5,clock=reduced?0:now/1000;heartMat.uniforms.time.value=clock;
  let y,scale,open,glow,heat;
  if(!won){const t=Math.min(1,Math.max(0,wb.charge??(serverNow-wb.startedAt)/Math.max(1,wb.endsAt-wb.startedAt)));y=floorY-K.embed;scale=K.boreScale*(1+(reduced?0:0.04*Math.sin(clock*(3+9*t))));open=0;glow=0.35+0.55*t;heat=t*0.5;}
  else{seenAt??=serverNow;const s=(serverNow-Math.max(team.wonAt??serverNow,seenAt))/1000;y=floorY-K.embed;scale=K.boreScale*(1+0.15*ease(s/K.openSeconds));open=ease((s-K.openAt)/K.openSeconds);glow=0.9+0.1*open;heat=0.5+0.5*open;}
  root.position.set(x,y,z);root.scale.setScalar(scale);spin.rotation.y=reduced?0:clock*0.25;heartMat.uniforms.heat.value=heat;
  for(const shard of shards){const d=shard.userData.dir;shard.position.copy(d).multiplyScalar(open*K.openDistance);shard.rotation.set(shard.userData.tumble.x*open,shard.userData.tumble.y*open,shard.userData.tumble.z*open);}
  const top=K.beamTop,bottom=y;beam.visible=won&&open>0;beam.scale.set(1,Math.max(0.01,top-bottom),1);beam.position.set(x,(top+bottom)/2,z);beamMat.opacity=0.55*open*(reduced?1:0.85+0.15*Math.sin(clock*6));
  halo.material.opacity=glow*0.85;halo.scale.setScalar(K.haloSize*(0.7+0.5*open));light.intensity=K.lightIntensity*glow;rayMat.opacity=0.55*open;rays.rotation.y=reduced?0:clock*0.4;
  for(let i=0;i<K.debris;i++){const a=i*2.399963+clock*(0.15+0.05*(i%3)),r=K.shellRadius*(1.6+0.9*((i*37)%10)/10)*(0.4+0.6*open),h=Math.sin(i*1.9+clock*0.5)*0.5;dummy.position.set(Math.cos(a)*r,h,Math.sin(a)*r);dummy.rotation.set(i,clock*0.7+i,0);dummy.scale.setScalar(0.03+0.05*((i*13)%7)/7);dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix);}
  debris.instanceMatrix.needsUpdate=true;debris.visible=won;
  return {x,y,z,won};}
 return {root,update,revealStart:()=>seenAt,beam};
}
