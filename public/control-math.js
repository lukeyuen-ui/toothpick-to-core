// Camera-relative input only; the authority validates and applies the resulting vector.
export function worldMove(strafe,forward,yaw){const length=Math.hypot(strafe,forward);if(length>1){strafe/=length;forward/=length;}return {dx:strafe*Math.cos(yaw)+forward*Math.sin(yaw),dy:strafe*Math.sin(yaw)-forward*Math.cos(yaw)};}
// KeyboardEvent.key is absent on some synthetic/embedded input paths.
export function commandKey(event){const key=typeof event.key==='string'?event.key:'';if(key&&key!=='Unidentified'&&key!=='Process')return /^Key[A-Z]$/.test(key)?key.slice(3).toLowerCase():key.length===1?key.toLowerCase():key;const code=typeof event.code==='string'?event.code:'';return /^Key[A-Z]$/.test(code)?code.slice(3).toLowerCase():code;}

export function arrowYaw(left,right,seconds,degreesPerSecond){return (Number(right)-Number(left))*Math.max(0,seconds)*degreesPerSecond*Math.PI/180;}
export function dragLook(yaw,pitch,dx,dy,sensitivity,minPitch,maxPitch){return {yaw:yaw+dx*sensitivity,pitch:Math.max(minPitch,Math.min(maxPitch,pitch-dy*sensitivity))};}
// Drill seat camera shake as an [x,y,z] offset, or null. The World Breaker overdrive rattles the cab at random (overdriveShake);
// otherwise the capsule hums with a fine fast buzz: loadRumble of redRumble at full drill load (load 0 to 1), rising to redRumble as
// your own gauge's needle sinks into the red (red 0 to 1), one buzz at the larger of the two. Only the larger of the rattle and the
// buzz shows, never their sum, and reduced motion shows neither. Pass out (an array of three) to have it filled instead of a new one.
const unit=v=>Math.min(1,Math.max(0,v||0));
export function cabShake(overdrive,red,reduced,seconds,K,random=Math.random,load=0,out=null){const od=overdrive?K.overdriveShake:0,rr=K.redRumble*Math.max(unit(red),(K.loadRumble??0)*unit(load));if(reduced||!(od>0||rr>0))return null;const o=out||[0,0,0];
 if(od>=rr){o[0]=(random()-0.5)*od;o[1]=(random()-0.5)*od;o[2]=(random()-0.5)*od;return o;}const t=seconds*Math.PI*2*K.redRumbleHz;o[0]=Math.sin(t*1.37)*rr*0.25;o[1]=Math.sin(t)*rr*0.5;o[2]=0;return o;}
// One step of a slow damped spring for swaying ropes, cables and hanging loads: s.x, s.z is an offset and s.vx, s.vz its velocity, pulled
// back at hz with damping ratio zeta (below 1 it swings and settles within a few periods). Taken in steps of at most 20 ms, so it stays
// stable at any frame time the renderer allows. Returns s; allocates nothing.
export function swayStep(s,dt,hz,zeta){const w=2*Math.PI*hz,k=w*w,c=2*zeta*w;for(let left=Math.max(0,dt||0);left>1e-6;){const h=Math.min(left,0.02);s.vx+=(-k*s.x-c*s.vx)*h;s.vz+=(-k*s.z-c*s.vz)*h;s.x+=s.vx*h;s.z+=s.vz*h;left-=h;}return s;}
