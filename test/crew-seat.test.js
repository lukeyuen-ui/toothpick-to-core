import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../public/vendor/three.module.js';import {C} from '../config.js';import {astronaut,seatPose,seatShoulder} from '../public/explorer-models.js';
// The owner could not make out crewmates from the drill seat: they lay face down in mech armour, half sunk into the pads, and the seat
// could barely turn. Then they sat bolt upright, a helmet staring sideways at you at eye height, while your own seat looks almost straight
// down the bore. Now (the owner: "seats FACING down") they sit hunched over their consoles, helmets bowed down the bore the way your seat
// looks, hands on the sticks, legs out along the pad; seatPose is the pose renderer3d.js applies.
const K=C.three.cockpit;
function factory(){const f={mat:color=>new T.MeshStandardMaterial({color}),label:()=>new T.Group()};f.box=(g,c,x,y,z,px=0,py=0,pz=0)=>{const m=new T.Mesh(new T.BoxGeometry(1,1,1),f.mat(c));m.scale.set(x,y,z);m.position.set(px,py,pz);g.add(m);return m;};f.cylinder=(g,c,r,h,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.CylinderGeometry(1,1,1,8),f.mat(c));m.scale.set(r,h,r);m.position.set(x,y,z);g.add(m);return m;};return f;}
function visibleBox(root){root.updateMatrixWorld(true);const box=new T.Box3(),walk=o=>{if(!o.visible)return;if(o.isMesh){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}o.children.forEach(walk);};walk(root);return box;}
// Seated the way the renderer seats them: out of the mech armour and off the sled, arms hidden (the station sleeves stand in for them).
function seated(player,k=1){const m=astronaut(factory(),{nickname:'Ada',color:'#ffb85c',x:0,y:0,...player},new T.Scene());m.root.position.set(0,K.crewY,K.crewZ);m.body.scale.setScalar(K.crewScale);seatPose(m,k);
 for(const arm of m.walk.arms)arm.visible=false;for(const piece of m.mech)piece.visible=false;if(m.sled)m.sled.root.visible=false;m.name.visible=false;m.root.updateMatrixWorld(true);return m;}
const helmetOf=m=>m.head.children.find(c=>c.geometry?.type==='SphereGeometry'&&c.geometry.parameters.radius===0.22);
test('a crewmate in the drill hunches over the console, helmet bowed down the bore, inside the glass and under the roof',()=>{
 for(const player of [{mobility:3,tool:C.tools.length-1,pods:0},{mobility:3,tool:C.tools.length-1,pods:3},{mobility:0,tool:0,pods:0}]){const m=seated(player);if(player.tool)assert.ok(m.mech.length>0,'the mech armour can be set aside');
  const box=visibleBox(m.root),size=box.getSize(new T.Vector3()),helmet=helmetOf(m),at=helmet.getWorldPosition(new T.Vector3()),visor=new T.Vector3(0,0,-1).applyQuaternion(helmet.getWorldQuaternion(new T.Quaternion())),pitch=Math.asin(visor.y);
  // Looks where your own seat looks: the visor points down the bore, within a few degrees of the seat's view.
  assert.ok(Math.abs(pitch-K.boardPitch)<0.1,'visor down the bore like the seat: '+pitch.toFixed(2));
  // Hunched forward: the helmet hangs out ahead of the hips, over the console, a little below your own eye.
  assert.ok(at.z<K.crewZ-0.1,'helmet out over the console: '+at.z.toFixed(3));assert.ok(at.y<K.eye&&at.y>K.eye-0.15,'helmet just below your eye: '+at.y.toFixed(3));
  assert.ok(box.min.y>K.glassY,'above the glass floor: '+box.min.y.toFixed(3));assert.ok(box.max.y<K.roofY,'under the roof: '+box.max.y.toFixed(3));assert.ok(box.min.z>-K.podHalfZ&&box.max.z<K.podHalfZ,'inside the glass, front to back: '+box.min.z.toFixed(3)+' to '+box.max.z.toFixed(3));
  // Hunched, a crewmate stands lower but reaches further forward, so the size you read from the next seat is the side silhouette
  // corner to corner: 0.45 to 0.49 hunched (the upright seat measured 0.47 to 0.52), never the sunk-in blob of the face-down pose.
  assert.ok(size.x<K.seatGap,'fits its seat: '+size.x.toFixed(3));assert.ok(Math.hypot(size.y,size.z)>0.44,'a figure you can read at arm\'s length: '+Math.hypot(size.y,size.z).toFixed(3));
  // Hands on the grips: the station sleeves end exactly at the figure's shoulders.
  m.walk.arms.forEach((arm,i)=>{const shoulder=arm.getWorldPosition(new T.Vector3()),sleeve=seatShoulder(i?1:-1).add(m.root.position);assert.ok(sleeve.distanceTo(shoulder)<1e-6,'sleeve meets the shoulder: '+sleeve.distanceTo(shoulder));});
  // The name label rides over the front of the bowed helmet (so from the surface, looking down from behind the crew, it clears the
  // helmet), above the whole figure and under the seat's roof beam (0.04 deep, centred on roofY).
  const label=m.name.getWorldPosition(new T.Vector3()),half=K.crewLabel*C.three.nameHeight/C.three.nameWidth/2;assert.ok(Math.abs(label.z-(at.z-0.22*K.crewScale))<1e-6,'label over the front of the helmet: '+label.z.toFixed(3));
  assert.ok(label.y-half>box.max.y,'label clears the figure: '+(label.y-half).toFixed(3)+' over '+box.max.y.toFixed(3));assert.ok(label.y+half<K.roofY-0.02,'label under the roof beam: '+(label.y+half).toFixed(3));}
 // Climbing in starts from the standing pose, so the lean and the bow grow as the figure settles.
 const standing=seated({mobility:0,tool:0,pods:0},0);assert.ok(standing.body.rotation.x===0&&standing.head.rotation.x===0&&standing.body.position.length()===0&&standing.walk.legs.every(leg=>leg.rotation.x===0),'k 0 is the standing pose');
 assert.ok(K.lookYaw>=2&&K.lookMaxPitch>0,'the seat turns far enough to see the next seats, at eye level');});
