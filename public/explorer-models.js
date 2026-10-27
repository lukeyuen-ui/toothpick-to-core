import * as T from './vendor/three.module.js';import {holdCapacity} from '../hauling-rules.js';
import {C} from '../config.js';
const tv=C.toolVisual;
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
 if(tier===7){// Tunnel borer: orange motor body with grips, spinning fluted cutter cone and rim teeth.
const orange=new T.MeshStandardMaterial({color:'#e0802c',metalness:0.25,roughness:0.45,emissive:'#3a1a05',emissiveIntensity:0.4}),dark=factory.mat('#2c3438'),steel=new T.MeshStandardMaterial({color:'#b9c6cf',metalness:0.3,roughness:0.3,emissive:'#22292e',emissiveIntensity:0.5});
const along=(mesh,z,parent=root)=>{mesh.rotation.x=Math.PI/2;mesh.position.z=z;parent.add(mesh);return mesh;};
along(new T.Mesh(new T.CylinderGeometry(0.062,0.07,0.17,14),orange),0.0);
for(const z of [0.06,-0.05])along(new T.Mesh(new T.CylinderGeometry(0.074,0.074,0.016,14),dark),z);
along(new T.Mesh(new T.CylinderGeometry(0.035,0.04,0.07,10),dark),0.115);
const grip=new T.Mesh(new T.BoxGeometry(0.03,0.09,0.035),dark);grip.position.set(0,-0.07,0.08);root.add(grip);
const side=new T.Mesh(new T.CylinderGeometry(0.012,0.012,0.16,8),dark);side.rotation.z=Math.PI/2;side.position.set(-0.09,0.02,-0.01);root.add(side);
along(new T.Mesh(new T.CylinderGeometry(0.075,0.075,0.02,16),steel),-0.095,spin);
const cone=new T.Mesh(new T.ConeGeometry(0.072,0.13,16),steel);cone.rotation.x=-Math.PI/2;cone.position.z=-0.17;spin.add(cone);
for(let k=0;k<6;k++){const a=k/6*Math.PI*2;const flute=new T.Mesh(new T.BoxGeometry(0.012,0.02,0.12),dark);flute.position.set(Math.cos(a)*0.04,Math.sin(a)*0.04,-0.165);flute.rotation.set(Math.sin(a)*0.5,-Math.cos(a)*0.5,a);spin.add(flute);}
for(let k=0;k<10;k++){const a=k/10*Math.PI*2;const tooth=new T.Mesh(new T.BoxGeometry(0.016,0.016,0.03),steel);tooth.position.set(Math.cos(a)*0.074,Math.sin(a)*0.074,-0.112);spin.add(tooth);}
root.add(spin);}
 if(tier===8){// Mining mech: two hydraulic arms with three-finger claws that rake the dirt.
const plate=new T.MeshStandardMaterial({color:'#d8b23a',metalness:0.3,roughness:0.45,emissive:'#3a2a05',emissiveIntensity:0.35}),dark=factory.mat('#2a3236'),steel=new T.MeshStandardMaterial({color:'#d3dde3',metalness:0.25,roughness:0.3,emissive:'#3a444a',emissiveIntensity:0.6});
const arms=[];for(const side of [0,1]){const arm=new T.Group();arm.position.x=side?0.02:-tv.mechArmSpread;root.add(arm);
 const fore=new T.Mesh(new T.BoxGeometry(0.085,0.085,0.24),plate);fore.position.z=-0.06;arm.add(fore);
 const piston=new T.Mesh(new T.CylinderGeometry(0.014,0.014,0.2,8),steel);piston.rotation.x=Math.PI/2;piston.position.set(0,0.06,-0.05);arm.add(piston);
 const wrist=new T.Mesh(new T.SphereGeometry(0.045,10,8),dark);wrist.position.z=-0.19;arm.add(wrist);
 const claw=new T.Group();claw.position.z=-0.2;arm.add(claw);const fingers=[];
 for(const [fx,fy] of [[-0.045,0.03],[0.045,0.03],[0,-0.05]]){const f=new T.Group();f.position.set(fx,fy,0);const seg=new T.Mesh(new T.BoxGeometry(0.034,0.034,0.15),steel);seg.position.z=-0.075;f.add(seg);const tip=new T.Mesh(new T.ConeGeometry(0.02,0.06,6),steel);tip.rotation.x=-Math.PI/2;tip.position.z=-0.18;f.add(tip);f.rotation.x=fy>0?-0.25:0.25;f.userData.open=f.rotation.x;claw.add(f);fingers.push(f);}
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
else if(tool.tier===4){r.rotation.order='YXZ';r.rotation.y=tv.handSwingYaw;r.rotation.x=0.15-f*1.25;r.rotation.z=-f*0.25;r.position.y=0.07*up-0.02*down;r.position.z=-0.07*down+0.04*up;}
else if(tool.tier===5){r.rotation.x=-1.2;const active=!reduced&&t>=0&&t<1;r.position.y=active?-0.035*Math.abs(Math.sin(t*Math.PI*tv.hammerPulses)):0;r.rotation.z=active?Math.sin(now/14)*0.04:0;}
else if(tool.tier===6){r.rotation.x=-f*0.45;r.position.z=-0.08*down+0.03*up;}
else if(tool.tier===8){for(const a of r.userData.arms||[]){const g=reduced?0:strikeCurve(t-(a.side?tv.mechArmLag:0)),down=Math.max(0,g),up=Math.max(0,-g);a.arm.rotation.x=0.1-g*0.55;a.arm.position.z=-0.09*down+0.04*up;a.arm.position.y=0.04*up-0.03*down;for(const f of a.fingers)f.rotation.x=f.userData.open*(1-down*0.9);}}
else{r.position.z=-0.05*down;tool.spin.rotation.z=reduced||!(t>=0&&t<1.6)?tool.spin.rotation.z:now/C.tapWindowMs*tv.spinRate;}
return f;}
export function astronaut(factory,player,scene){const root=new T.Group(),body=new T.Group();root.add(body);root.position.set(player.x,0,player.y);root.name='Explorer '+player.nickname;const white='#e2e7e1',dark='#42525a',legs=[],arms=[];factory.box(body,white,0.32,0.31,0.22,0,0.61,0);const backpack=factory.box(body,dark,0.24,0.30,0.16,0,0.62,0.18);backpack.scale.multiply(new T.Vector3(1+(player.pods||0)*0.12,1+(player.pods||0)*0.12,1+(player.pods||0)*0.20));factory.box(body,player.color,0.23,0.04,0.02,0,0.65,-0.12);for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*0.10,0.45,0);factory.cylinder(leg,white,0.075,0.26,0,-0.13,0);factory.box(leg,dark,0.14,0.09,0.23,0,-0.31,-0.04);body.add(leg);legs.push(leg);const arm=new T.Group();arm.position.set(side*0.23,0.73,0);factory.cylinder(arm,white,0.055,0.24,0,-0.12,0);factory.cylinder(arm,player.color,0.057,0.05,0,-0.04,0);const glove=new T.Mesh(new T.SphereGeometry(0.06,8,6),factory.mat(white));glove.position.y=-0.25;arm.add(glove);body.add(arm);arms.push(arm);}
 const helmet=new T.Mesh(new T.SphereGeometry(0.22,16,12),factory.mat(white));helmet.position.y=0.97;body.add(helmet);const visor=new T.Mesh(new T.SphereGeometry(0.18,16,12),new T.MeshStandardMaterial({color:'#bda36a',metalness:0.92,roughness:0.13,emissive:'#68532a',emissiveIntensity:0.28}));visor.scale.set(1,0.65,0.35);visor.position.set(0,0.98,-0.18);body.add(visor);factory.box(body,player.color,0.12,0.035,0.09,0,1.18,0);const beacon=factory.box(body,player.color,0.06,0.04,0.05,0,1.215,0,true);factory.box(body,'#f6efd7',0.09,0.04,0.025,0,1.08,-0.19,true);
 if(player.mobility>=1)for(const side of [-1,1])factory.box(body,'#8c9d9e',0.025,0.30,0.025,side*0.16,0.39,0.02);if(player.mobility>=2)for(const side of [-1,1]){factory.cylinder(body,dark,0.045,0.15,side*0.10,0.56,0.27);factory.cylinder(body,player.mobility===3?'#7fd7ec':'#9de2c3',0.03,0.055,side*0.10,0.46,0.27,true);}if(player.tool===C.tools.length-1){for(const side of [-1,1]){factory.box(body,'#829798',0.04,0.64,0.06,side*0.28,0.47,0.11);factory.box(body,'#c4d3ca',0.18,0.12,0.12,side*0.28,0.76,0);}factory.box(body,'#6b8083',0.43,0.055,0.29,0,0.43,0);}
 const boom=new T.Group();boom.position.set(0,-0.22,0);const tool=heldTool(factory,player.tool);tool.root.rotation.x=-0.15;boom.add(tool.root);arms[1].add(boom);let sled=null;if((player.pods||0)>=3){const g=new T.Group();g.name='Owned cargo sled';factory.box(g,'#859796',0.36,0.07,0.56,0,0.08,0);for(const side of [-1,1])factory.box(g,'#465b61',0.035,0.10,0.62,side*0.18,0.04,0);const fill=factory.box(g,'#c7b88b',0.30,0.22,0.48,0,0.22,0);g.position.z=0.75;root.add(g);sled={root:g,fill};}const softFill=new T.PointLight(C.explorerPolish.fillColor,C.explorerPolish.fillIntensity,C.explorerPolish.fillDistance,2);softFill.name='Explorer soft fill';softFill.position.set(...C.explorerPolish.fillPosition);softFill.castShadow=false;root.add(softFill);body.traverse(mesh=>{if(!mesh.isMesh||!mesh.material?.color)return;const hex=mesh.material.color.getHexString(),suit=hex===new T.Color(white).getHexString(),stripe=hex===new T.Color(player.color).getHexString();if(suit||stripe){mesh.material=mesh.material.clone();mesh.material.emissive.copy(mesh.material.color);mesh.material.emissiveIntensity=suit?C.explorerPolish.suitEmission:C.explorerPolish.stripeEmission;}});const name=factory.label(player.nickname,player.color);name.position.y=C.three.roverNameHeight;root.add(name);body.scale.setScalar(C.three.roverScale);scene.add(root);return {root,body,sled,podTier:player.pods||0,moving:[],walk:{legs,arms},boom,tool,name,beacon,tier:player.mobility,toolTier:player.tool,x:player.x,y:player.y,lastX:player.x,lastY:player.y,angle:0};}
export function excavatorModel(factory,scene,m){const root=new T.Group(),rig=new T.Group();root.add(rig);root.name='Placed excavator '+m.id;for(const side of [-1,1]){factory.box(rig,'#35484c',0.42,0.38,2.45,side*1.03,0.25,0);for(let n=0;n<6;n++)factory.cylinder(rig,'#8e9d91',0.16,0.17,side*1.03,0.22,-1+n*0.4);}factory.box(rig,'#d3d5bd',2.3,0.28,2.2,0,0.53,0);factory.box(rig,'#edeede',0.8,0.8,0.9,-0.62,1.02,-0.32);factory.box(rig,'#5c8998',0.67,0.36,0.025,-0.62,1.15,-0.79);factory.box(rig,'#e0d8a9',0.45,0.25,0.45,0.68,0.82,0.55);const hopper=factory.box(rig,'#e2c378',0.48,0.55,0.45,0.69,1.09,0.55);const boom=new T.Group();boom.position.set(0.35,0.84,-0.35);factory.box(boom,'#b8c5bb',0.18,0.18,1.35,0,0.35,-0.5);const stick=factory.box(boom,'#8d9b91',0.1,1,0.1,0,0.07,-1.25);const bucket=factory.box(boom,'#738b8c',0.65,0.35,0.48,0,0.07,-1.25);rig.add(boom);for(const side of [-1,1])factory.box(rig,'#f0e9bf',0.16,0.08,0.04,side*0.84,0.72,-1.14,true);const hazard=new T.Group(),ring=new T.Mesh(new T.RingGeometry(2.0,2.1,64).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:'#e8b555',transparent:true,opacity:0.45,side:T.DoubleSide,depthWrite:false}));ring.position.y=0.035;hazard.add(ring);const lights=[];for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const l=factory.box(hazard,'#ffc069',0.06,0.07,0.06,Math.cos(a)*2.03,0.07,Math.sin(a)*2.03,true);lights.push(l);}scene.add(root,hazard);return {root,rig,boom,stick,bucket,hopper,hazard,ring,lights};}

export function explorerGloves(factory){const root=new T.Group();root.name='Tool grip gloves';const E=C.explorerPolish,material=factory.mat('#dfe6df'),cuff=factory.mat('#758b8d'),fingerGeometry=new T.CapsuleGeometry(E.fingerRadius,E.fingerLength,2,4),thumbGeometry=new T.CapsuleGeometry(E.thumbRadius,E.thumbLength,2,5);for(const side of [-1,1]){const hand=new T.Group();hand.name=side<0?'Left grip glove':'Right grip glove';hand.position.set(side*E.gloveSpacing,-0.012,0.012);const palm=new T.Mesh(new T.BoxGeometry(...E.glovePalm),material);palm.name='Glove palm';hand.add(palm);const wrist=new T.Mesh(new T.BoxGeometry(...E.gloveCuff),cuff);wrist.position.y=-E.glovePalm[1]/2;hand.add(wrist);for(let i=0;i<4;i++){const finger=new T.Mesh(fingerGeometry,material);finger.name='Curled glove finger';finger.position.set((i-1.5)*E.fingerRadius*2,-0.001,-E.glovePalm[2]/2);finger.rotation.x=-0.9;hand.add(finger);}const thumb=new T.Mesh(thumbGeometry,material);thumb.name='Glove thumb';thumb.position.set(-side*E.glovePalm[0]/2,0,-0.003);thumb.rotation.z=side*0.8;hand.add(thumb);hand.rotation.z=side*-0.22;root.add(hand);}return root;}
