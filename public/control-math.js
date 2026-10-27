// Camera-relative input only; the authority validates and applies the resulting vector.
export function worldMove(strafe,forward,yaw){const length=Math.hypot(strafe,forward);if(length>1){strafe/=length;forward/=length;}return {dx:strafe*Math.cos(yaw)+forward*Math.sin(yaw),dy:strafe*Math.sin(yaw)-forward*Math.cos(yaw)};}
// KeyboardEvent.key is absent on some synthetic/embedded input paths.
export function commandKey(event){const key=typeof event.key==='string'?event.key:'';if(key&&key!=='Unidentified'&&key!=='Process')return /^Key[A-Z]$/.test(key)?key.slice(3).toLowerCase():key.length===1?key.toLowerCase():key;const code=typeof event.code==='string'?event.code:'';return /^Key[A-Z]$/.test(code)?code.slice(3).toLowerCase():code;}

export function arrowYaw(left,right,seconds,degreesPerSecond){return (Number(right)-Number(left))*Math.max(0,seconds)*degreesPerSecond*Math.PI/180;}
export function dragLook(yaw,pitch,dx,dy,sensitivity,minPitch,maxPitch){return {yaw:yaw+dx*sensitivity,pitch:Math.max(minPitch,Math.min(maxPitch,pitch-dy*sensitivity))};}
