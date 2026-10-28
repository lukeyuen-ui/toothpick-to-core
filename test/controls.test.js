import test from 'node:test';import assert from 'node:assert/strict';import {worldMove,arrowYaw,dragLook,cabShake,swayStep}from '../public/control-math.js';import {C}from '../config.js';import {createRoom,join,step}from '../rules.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('camera-relative forward and strafing rotate with yaw and preserve analog movement',()=>{for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5,0.37]){const forward=worldMove(0,1,yaw),side=worldMove(1,0,yaw);near(forward.dx,Math.sin(yaw));near(forward.dy,-Math.cos(yaw));near(side.dx,Math.cos(yaw));near(side.dy,Math.sin(yaw));near(forward.dx*side.dx+forward.dy*side.dy,0);const diagonal=worldMove(1,1,yaw);near(Math.hypot(diagonal.dx,diagonal.dy),1);near(Math.hypot(...Object.values(worldMove(0.2,0.3,yaw))),Math.hypot(0.2,0.3));}});
test('authority applies analog magnitude at every mobility speed',()=>{for(let tier=0;tier<C.mobility.length;tier++){const r=createRoom('TEST',42,false,0),p=join(r,'t','T',0);p.x=p.y=4.5;p.mobility=tier;step(r,[{player:p,message:{type:'move',dx:0.3,dy:0.4}}],100);near(p.x,4.5+0.3*C.mobility[tier].speed*C.tickSeconds);near(p.y,4.5+0.4*C.mobility[tier].speed*C.tickSeconds);}});

test('arrow keys turn smoothly at 90 degrees per second without strafing',()=>{near(arrowYaw(false,true,1,C.cab.arrowTurnDegreesPerSecond),Math.PI/2);near(arrowYaw(true,false,0.5,90),-Math.PI/4);near(arrowYaw(true,true,1,90),0);near(arrowYaw(false,false,1,90),0);let yaw=0;for(let i=0;i<60;i++)yaw+=arrowYaw(false,true,1/60,90);near(yaw,Math.PI/2);const forward=worldMove(0,1,yaw);near(forward.dx,1);near(forward.dy,0);});
test('desktop drag and pointer lock use identical look math with pitch clamping',()=>{const sensitivity=C.cab.lookSensitivity,a=dragLook(0,-0.4,120,60,sensitivity,C.cab.minPitch,C.cab.maxPitch);near(a.yaw,0.3);near(a.pitch,-0.55);const b=dragLook(a.yaw,a.pitch,-120,-60,sensitivity,C.cab.minPitch,C.cab.maxPitch);near(b.yaw,0);near(b.pitch,-0.4);assert.equal(dragLook(0,0,0,10000,sensitivity,-1.5,0.3).pitch,-1.5);assert.equal(dragLook(0,0,0,-10000,sensitivity,-1.5,0.3).pitch,0.3);});
// Luke asked whether the seat should shake when his gauge goes red, or whether that would fight the World Breaker overdrive shake. It does,
// but small and different: a fine buzz a third of the overdrive's size, scaled by how deep the needle sits, and the larger shake wins.
test('the drill seat shakes for the overdrive or a red gauge, the larger and never the sum, and not at all for reduced motion',()=>{const K=C.three.cockpit,peak=s=>s?Math.max(...s.map(Math.abs)):0;
 near(K.redRumble*3,K.overdriveShake);assert.equal(cabShake(false,0,false,1,K),null,'calm seat');assert.equal(cabShake(true,1,true,1,K),null,'reduced motion: no overdrive shake');assert.equal(cabShake(false,1,true,1,K),null,'reduced motion: no rumble');
 let deep=0,half=0;for(let i=0;i<240;i++){const t=i/997;deep=Math.max(deep,peak(cabShake(false,1,false,t,K)));half=Math.max(half,peak(cabShake(false,0.5,false,t,K)));}
 assert.ok(deep>K.redRumble*0.45&&deep<=K.redRumble/2+1e-12,'a red gauge buzzes up to a third of the overdrive reach: '+deep);near(half,deep/2);
 const dice=()=>{let k=0;return ()=>[0.9,0.05,0.7][k++%3];};assert.deepEqual(cabShake(true,1,false,0.3,K,dice()),cabShake(true,0,false,0.3,K,dice()),'in the overdrive a red gauge adds nothing');
 for(let i=0;i<240;i++)assert.ok(peak(cabShake(true,1,false,i/997,K))<=K.overdriveShake/2,'never past the overdrive on its own');});

// Rope and cable sway (physics pass): a slow damped spring that swings after a kick and settles, at any frame rate.
test('a kicked rope swings back and forth at its own slow rate and settles, the same at 30 and 144 frames a second',()=>{
 const K=C.cab;const run=fps=>{const s={x:0,z:0,vx:K.ropeDrop,vz:0};let crossings=0,last=0,peak=0;for(let t=0;t<6;t+=1/fps){swayStep(s,1/fps,K.ropeHz,K.ropeDamping);peak=Math.max(peak,Math.abs(s.x));if(t<2.5&&Math.sign(s.x)!==Math.sign(last)&&last!==0)crossings++;last=s.x;}return {s,crossings,peak};};
 const slow=run(30),fast=run(144);for(const r of [slow,fast]){assert.ok(r.crossings>=2&&r.crossings<=5,'a slow pendulum: '+r.crossings+' swings in 2.5 s');assert.ok(r.peak>0.02&&r.peak<K.ropeMax*1.5,'a few centimetres: '+r.peak);assert.ok(Math.hypot(r.s.x,r.s.z)<r.peak*0.2,'settled after six seconds');}
 assert.ok(Math.abs(slow.peak-fast.peak)<0.01,'frame rate does not change the swing');
 const still={x:0,z:0,vx:0,vz:0};swayStep(still,0.05,K.ropeHz,K.ropeDamping);assert.deepEqual([still.x,still.z],[0,0],'nothing moves it, nothing moves');
 const big={x:0,z:0,vx:0,vz:0};swayStep(big,10,K.ropeHz,K.ropeDamping);assert.ok([big.x,big.z,big.vx,big.vz].every(Number.isFinite));
 assert.ok(C.cab.ropePoints>=4,'a rope bends through a few points');
});

// Capsule vibration (physics pass): aboard the drill the capsule hums with its load in the same buzz the red zone raises; never two rumbles.
test('the capsule hums with the drill load, the red zone raises the same buzz, the overdrive rattle replaces it, and reduced motion stills it',()=>{
 const K=C.three.cockpit,peak=v=>v?Math.max(...v.map(Math.abs)):0;let hum=0,red=0,both=0;const out=[0,0,0];
 for(let i=0;i<400;i++){const t=i/997;hum=Math.max(hum,peak(cabShake(false,0,false,t,K,Math.random,1)));red=Math.max(red,peak(cabShake(false,1,false,t,K,Math.random,0)));both=Math.max(both,peak(cabShake(false,1,false,t,K,Math.random,1,out)));}
 assert.ok(hum>0&&hum<=K.redRumble*K.loadRumble*0.5+1e-9,'a low hum at full load: '+hum);assert.ok(red>hum,'the red zone raises it');assert.ok(Math.abs(both-red)<1e-9,'one buzz at the larger, never the sum');
 assert.equal(cabShake(false,0,false,1,K,Math.random,0),null,'an idle drill is still');assert.equal(cabShake(false,0,true,1,K,Math.random,1),null,'reduced motion: no hum');
 assert.equal(cabShake(false,0,false,0.3,K,Math.random,1,out),out,'fills the array it is given');const od=cabShake(true,0,false,1,K,()=>1,1);assert.ok(Math.abs(od[0]-K.overdriveShake*0.5)<1e-9,'the overdrive rattle takes over');
});
