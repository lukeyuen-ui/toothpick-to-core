import test from 'node:test';
import assert from 'node:assert/strict';
import {QUALITY,QUALITY_LEVELS,GRAPHICS_CHOICES,pickQuality,qualitySettings,stepDown,nextQuality,createFpsWindow} from '../public/quality.js';

test('presets: high, balanced and low get cheaper in every dimension',()=>{
 assert.deepEqual(QUALITY_LEVELS,['high','balanced','low']);
 assert.deepEqual(GRAPHICS_CHOICES,['auto','high','balanced','low']);
 assert.deepEqual([QUALITY.high.pixelRatio,QUALITY.balanced.pixelRatio,QUALITY.low.pixelRatio],[2,1.5,1]);
 assert.equal(QUALITY.high.bloom,true);assert.equal(QUALITY.balanced.bloom,true);assert.equal(QUALITY.low.bloom,false);
 assert.equal(QUALITY.high.shadows,true);assert.equal(QUALITY.balanced.shadows,true);assert.equal(QUALITY.low.shadows,false);
 assert.equal(QUALITY.high.particles,1);assert.equal(QUALITY.balanced.particles,1);assert.equal(QUALITY.low.particles,0.5);
 assert.ok(QUALITY.high.shadowSoftness>QUALITY.balanced.shadowSoftness,'high filters shadows wider');
 for(const key of ['flora','embers','debris','puffs'])assert.ok(QUALITY.high[key]>QUALITY.balanced[key]&&QUALITY.balanced[key]>QUALITY.low[key],key);
 assert.deepEqual([QUALITY.high.kick,QUALITY.balanced.kick,QUALITY.low.kick],[true,true,false],'no camera kick on low');
 assert.equal(QUALITY.low.puffs,0,'low throws no dust puffs');
 assert.deepEqual([QUALITY.high.env,QUALITY.balanced.env,QUALITY.low.env],[true,true,false],'low skips the reflection map and keeps its old cost');
});

test('pickQuality: the URL beats the saved choice, unknown values mean auto, and auto starts at high',()=>{
 assert.deepEqual((({choice,auto,level})=>({choice,auto,level}))(pickQuality({})),{choice:'auto',auto:true,level:'high'});
 assert.equal(pickQuality({saved:'balanced'}).level,'balanced');assert.equal(pickQuality({saved:'balanced'}).auto,false);
 assert.equal(pickQuality({saved:'low',param:'high'}).level,'high');
 assert.equal(pickQuality({saved:'low',param:'ultra'}).level,'low','a bad URL value falls back to the saved choice');
 assert.equal(pickQuality({saved:'auto',param:null}).auto,true);
 assert.equal(pickQuality({saved:'nonsense'}).choice,'auto');
 assert.equal(pickQuality({param:'auto',saved:'low'}).auto,true);
});

test('settings: pixel ratio never exceeds the device or the level cap; touch screens keep smaller shadow maps',()=>{
 assert.equal(pickQuality({dpr:3}).settings.pixelRatio,2);
 assert.equal(pickQuality({dpr:1}).settings.pixelRatio,1);
 assert.equal(pickQuality({saved:'balanced',dpr:3}).settings.pixelRatio,1.5);
 assert.equal(pickQuality({saved:'low',dpr:3}).settings.pixelRatio,1);
 assert.equal(qualitySettings('high',{dpr:NaN}).pixelRatio,1);
 assert.equal(qualitySettings('high').shadowMapSize,2048);assert.equal(qualitySettings('high',{touch:true}).shadowMapSize,1024);
 assert.equal(qualitySettings('balanced').shadowMapSize,1024,'balanced halves the map for harder, cheaper shadows');assert.equal(qualitySettings('balanced',{touch:true}).shadowMapSize,512);
 assert.equal(qualitySettings('nope').level,'high');
});

test('auto steps down one level per slow window, in order, and stops at low; fixed choices never move',()=>{
 assert.equal(stepDown('high'),'balanced');assert.equal(stepDown('balanced'),'low');assert.equal(stepDown('low'),'low');
 let level='high';const seen=[level];for(let i=0;i<4;i++){level=nextQuality({auto:true,level,fps:30,floor:45});seen.push(level);}
 assert.deepEqual(seen,['high','balanced','low','low','low']);
 assert.equal(nextQuality({auto:true,level:'high',fps:58,floor:45}),'high','fast enough stays');
 assert.equal(nextQuality({auto:false,level:'high',fps:10,floor:45}),'high','a fixed choice stays');
 assert.equal(nextQuality({auto:true,level:'high',fps:null,floor:45}),'high','no verdict stays');
 assert.equal(nextQuality({auto:true,level:'high',fps:0,floor:45}),'high');
});

test('fps windows read the median frame, ignore long stalls such as shader compiles, and give no verdict when mostly stalled',()=>{
 const w=createFpsWindow({windowMs:1000,stallMs:500});let now=0,result=null;w.frame(now);
 now+=900;assert.equal(w.frame(now),null,'a 900 ms compile hitch is a stall');
 for(let i=0;i<60&&result===null;i++){now+=16;result=w.frame(now);}
 assert.equal(result,null,'the window was mostly stalled');
 for(let i=0;i<100&&result===null;i++){now+=16;result=w.frame(now);}
 assert.ok(result>55&&result<70,'steady 16 ms frames read about 62 fps, got '+result);
 const slow=createFpsWindow({windowMs:1000});let t=0,fps=null;slow.frame(t);for(let i=0;i<40&&fps===null;i++){t+=40;fps=slow.frame(t);}
 assert.ok(fps>20&&fps<30,'40 ms frames read 25 fps, got '+fps);
 const bumpy=createFpsWindow({windowMs:1000});let b=0,read=null;bumpy.frame(b);for(let i=0;i<200&&read===null;i++){b+=i%10===9?200:16;read=bumpy.frame(b);}
 assert.ok(read>55,'200 ms hitches every tenth frame do not drag a 60 fps window down, got '+read);
 slow.reset();assert.equal(slow.frame(t+5000),null,'reset starts a fresh window');
});
