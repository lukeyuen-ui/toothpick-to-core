import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';
import {revealAll,createGlow} from '../public/glow.js';
import {createDigFx} from '../public/dig-fx.js';

// The start-up warm draw (glow.js revealAll, renderer3d.js warmUp): one render in which everything in the scene draws once, so the GPU
// builds every pipeline at start-up instead of at the first mech hit, and afterwards every pool is empty and hidden again.
function scene(){
 const s=new T.Scene(),fx=createDigFx(s),box=new T.BoxGeometry(1,1,1),mat=new T.MeshStandardMaterial();
 const sun=new T.DirectionalLight();s.add(sun);
 const rig=new T.Group();rig.name='Hidden rig';rig.visible=false;const rigLight=new T.PointLight();rigLight.name='Rig light';rig.add(rigLight);const part=new T.Mesh(box,mat);part.name='Rig part';rig.add(part);s.add(rig);
 const heaps=new T.InstancedMesh(box,mat,8);heaps.name='Heaps';heaps.count=0;heaps.visible=false;s.add(heaps);
 const rubble=new T.InstancedMesh(box,mat,8);rubble.name='Rubble';rubble.count=5;s.add(rubble);
 const far=new T.Mesh(box,mat);far.name='Culled';far.position.set(0,0,-1e4);s.add(far);
 const points=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(new Float32Array(9),3)),new T.PointsMaterial());points.name='Motes';points.geometry.setDrawRange(0,0);points.visible=false;s.add(points);
 const rope=new T.Line(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(new Float32Array(9),3)),new T.LineBasicMaterial());rope.name='Rope';rope.visible=false;s.add(rope);
 const label=new T.Sprite(new T.SpriteMaterial());label.name='Label';label.visible=false;rig.add(label);
 return {s,fx};
}
const drawable=o=>(o.isMesh||o.isPoints||o.isLine||o.isSprite)&&!!o.material;
const state=root=>{const out=[];root.traverse(o=>out.push([o.name||o.type,o.visible,o.frustumCulled,o.count,o.geometry?.drawRange?.count]));return out;};
const liveLights=root=>{const out=[];root.traverseVisible(o=>{if(o.isLight)out.push(o.name||o.type);});return out;};

test('revealAll draws everything once, keeps the lights, and puts every pool back empty',()=>{
 const {s,fx}=scene(),before=state(s),lights=liveLights(s);
 const restore=revealAll(s),seen=new Set();s.traverseVisible(o=>{if(drawable(o))seen.add(o);});
 s.traverse(o=>{if(!drawable(o))return;assert.ok(seen.has(o),'shown: '+(o.name||o.type));assert.equal(o.frustumCulled,false,'not culled: '+o.name);
  if(o.isInstancedMesh)assert.equal(o.count,1,'one instance: '+o.name);else if(o.geometry?.drawRange)assert.ok(o.geometry.drawRange.count>0,'something to draw: '+o.name);});
 assert.deepEqual(liveLights(s),lights,'the same lights, so the light count and every program stay the same');
 restore();
 assert.deepEqual(state(s),before,'every visible flag, cull flag, count and draw range is back');
 for(const mesh of fx.meshes){assert.equal(mesh.count,0,mesh.name);assert.equal(mesh.visible,false,mesh.name);}
 assert.equal(fx.points.geometry.drawRange.count,0);assert.equal(fx.points.visible,false);
 assert.equal(fx.chunks.count+fx.puffs.count+fx.grains.count,0,'no particle was spawned');
});

test('the warm draw renders once over the revealed scene and restores it even when the render throws',()=>{
 const {s}=scene(),before=state(s),camera=new T.PerspectiveCamera();let calls=0,shownPools=0;
 const gl={render(scene){calls++;scene.traverseVisible(o=>{if(o.isInstancedMesh&&o.count===1&&/^Dig /.test(o.name))shownPools++;});}};
 const glow=createGlow(gl);assert.equal(glow.active,false,'no WebGL2 here: the plain path renders straight to the canvas');
 glow.warmDraw(s,camera);assert.equal(calls,1);assert.equal(shownPools,2,'the debris and dust pools drew one instance each');assert.deepEqual(state(s),before);
 gl.render=()=>{throw new Error('lost context');};assert.throws(()=>glow.warmDraw(s,camera),/lost context/);assert.deepEqual(state(s),before,'restored after a failed render too');
});
