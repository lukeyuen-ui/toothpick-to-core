import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../public/vendor/three.module.js';import {C} from '../config.js';import {astronaut} from '../public/explorer-models.js';
// The owner could not make out crewmates from the drill seat: they lay face down in mech armour, half sunk into the pads, and the seat
// could barely turn. Crewmates now sit upright at their stations (the pose renderer3d.js applies), so from the seat you can look round
// and level and see a suited figure, helmet at your eye height, between the glass floor and the roof.
const K=C.three.cockpit;
function factory(){const f={mat:color=>new T.MeshStandardMaterial({color}),label:()=>new T.Group()};f.box=(g,c,x,y,z,px=0,py=0,pz=0)=>{const m=new T.Mesh(new T.BoxGeometry(1,1,1),f.mat(c));m.scale.set(x,y,z);m.position.set(px,py,pz);g.add(m);return m;};f.cylinder=(g,c,r,h,x=0,y=0,z=0)=>{const m=new T.Mesh(new T.CylinderGeometry(1,1,1,8),f.mat(c));m.scale.set(r,h,r);m.position.set(x,y,z);g.add(m);return m;};return f;}
function visibleBox(root){root.updateMatrixWorld(true);const box=new T.Box3(),walk=o=>{if(!o.visible)return;if(o.isMesh){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}o.children.forEach(walk);};walk(root);return box;}
test('a crewmate in the drill sits upright out of the mech armour, helmet at eye height, between the glass floor and the roof',()=>{
 const m=astronaut(factory(),{nickname:'Ada',color:'#ffb85c',x:0,y:0,mobility:3,tool:C.tools.length-1,pods:0},new T.Scene());assert.ok(m.mech.length>0,'the mech armour can be set aside');
 m.root.position.set(0,K.crewY,K.crewZ);m.body.scale.setScalar(K.crewScale);m.body.rotation.x=K.crewRecline;for(const leg of m.walk.legs)leg.rotation.x=K.crewLegs;for(const arm of m.walk.arms)arm.visible=false;for(const piece of m.mech)piece.visible=false;m.name.visible=false;
 const box=visibleBox(m.root),helmet=m.body.children.find(c=>c.geometry?.type==='SphereGeometry'&&c.geometry.parameters.radius===0.22).getWorldPosition(new T.Vector3()),size=box.getSize(new T.Vector3());
 assert.ok(Math.abs(helmet.y-K.eye)<0.04,'helmet at eye height: '+helmet.y.toFixed(3));assert.ok(box.min.y>K.glassY,'above the glass floor: '+box.min.y.toFixed(3));assert.ok(box.max.y<K.roofY,'under the roof: '+box.max.y.toFixed(3));
 assert.ok(size.x<K.seatGap,'fits its seat: '+size.x.toFixed(3));assert.ok(size.y>0.3,'a figure you can read at arm\'s length: '+size.y.toFixed(3));assert.ok(K.crewY+K.crewLabelY<K.roofY,'name label under the roof');
 assert.ok(K.lookYaw>=2&&K.lookMaxPitch>0,'the seat turns far enough to see the next seats, at eye level');});
