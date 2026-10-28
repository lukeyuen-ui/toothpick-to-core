// Camera-relative input only; the authority validates and applies the resulting vector.
export function worldMove(strafe,forward,yaw){const length=Math.hypot(strafe,forward);if(length>1){strafe/=length;forward/=length;}return {dx:strafe*Math.cos(yaw)+forward*Math.sin(yaw),dy:strafe*Math.sin(yaw)-forward*Math.cos(yaw)};}
// KeyboardEvent.key is absent on some synthetic/embedded input paths.
export function commandKey(event){const key=typeof event.key==='string'?event.key:'';if(key&&key!=='Unidentified'&&key!=='Process')return /^Key[A-Z]$/.test(key)?key.slice(3).toLowerCase():key.length===1?key.toLowerCase():key;const code=typeof event.code==='string'?event.code:'';return /^Key[A-Z]$/.test(code)?code.slice(3).toLowerCase():code;}

export function arrowYaw(left,right,seconds,degreesPerSecond){return (Number(right)-Number(left))*Math.max(0,seconds)*degreesPerSecond*Math.PI/180;}
export function dragLook(yaw,pitch,dx,dy,sensitivity,minPitch,maxPitch){return {yaw:yaw+dx*sensitivity,pitch:Math.max(minPitch,Math.min(maxPitch,pitch-dy*sensitivity))};}
// Drill seat camera shake as an [x,y,z] offset, or null. The World Breaker overdrive rattles the cab at random (overdriveShake);
// your own gauge in the red adds a fine fast buzz up to redRumble as the needle sinks (red 0 to 1). Only the larger of the two shows,
// never their sum, and reduced motion shows neither.
export function cabShake(overdrive,red,reduced,seconds,K,random=Math.random){const od=overdrive?K.overdriveShake:0,rr=K.redRumble*Math.min(1,Math.max(0,red||0));if(reduced||!(od>0||rr>0))return null;
 if(od>=rr)return [(random()-0.5)*od,(random()-0.5)*od,(random()-0.5)*od];const t=seconds*Math.PI*2*K.redRumbleHz;return [Math.sin(t*1.37)*rr*0.25,Math.sin(t)*rr*0.5,0];}
