// Graphics quality for the 3D view: three presets, the lobby or URL choice, and the automatic step-down.
// Pure data and decisions (no DOM, no WebGL) so the rules can be unit tested.
export const QUALITY_LEVELS=['high','balanced','low'];
export const GRAPHICS_CHOICES=['auto',...QUALITY_LEVELS];
export const GRAPHICS_KEY='toothpick-graphics';
// three.js r186 removed PCFSoftShadowMap (it warns and falls back to PCF), so soft shadows are a 3 by 3 tent of PCF taps (renderer3d.js)
// spread shadowSoftness texels apart. shadowScale multiplies the base shadow map size (2048 on desktops, 1024 on touch screens). A 4096
// map at high was measured at about 10 ms more GPU time per frame at 2360x1372, so high keeps 2048 and spends its budget on the softer
// filter instead; balanced halves the map for harder, cheaper shadows.
// flora and embers scale the finale's instance counts. debris and puffs scale the dig feedback pools (dig-fx.js); kick allows the camera
// kick of a pixel or two; gravel scales the loose stones scattered round dug cells. Low keeps a small chunk pool and nothing else, so it
// adds almost no work. env lets metal, glass and visors reflect the baked sky (scene.environment): one more texture read per lit
// pixel, so low goes without it and keeps today's cost.
export const QUALITY={
 high:{pixelRatio:2,shadows:true,shadowSoftness:1.6,shadowScale:1,env:true,bloom:true,particles:1,flora:1,embers:1,debris:1,puffs:1,kick:true,gravel:1},
 balanced:{pixelRatio:1.5,shadows:true,shadowSoftness:0.6,shadowScale:0.5,env:true,bloom:true,particles:1,flora:0.7,embers:0.7,debris:0.6,puffs:0.6,kick:true,gravel:0.6},
 low:{pixelRatio:1,shadows:false,shadowSoftness:1,shadowScale:1,env:false,bloom:false,particles:0.5,flora:0.4,embers:0.4,debris:0.2,puffs:0,kick:false,gravel:0}
};
const valid=value=>GRAPHICS_CHOICES.includes(value);
// The URL (?gfx=) wins over the saved lobby choice; anything unknown means auto, which starts at high and steps down when slow.
export function pickQuality({saved,param,touch=false,dpr=1}={}){
 const choice=valid(param)?param:valid(saved)?saved:'auto',auto=choice==='auto',level=auto?'high':choice;
 return {choice,auto,level,settings:qualitySettings(level,{touch,dpr})};
}
// Concrete numbers for one level on this device.
export function qualitySettings(level,{touch=false,dpr=1,maxPixelRatio=2,desktopShadow=2048,phoneShadow=1024}={}){
 const preset=QUALITY[level]||QUALITY.high,ratio=Number.isFinite(dpr)&&dpr>0?dpr:1;
 return {...preset,level:QUALITY[level]?level:'high',pixelRatio:Math.min(ratio,preset.pixelRatio,maxPixelRatio),shadowMapSize:(touch?phoneShadow:desktopShadow)*preset.shadowScale};
}
export function stepDown(level){const i=QUALITY_LEVELS.indexOf(level);return QUALITY_LEVELS[Math.min(QUALITY_LEVELS.length-1,Math.max(0,i)+1)];}
// Auto lowers one level per measured window that falls below the floor; a fixed choice never changes.
export function nextQuality({auto,level,fps,floor}){return auto&&level!=='low'&&Number.isFinite(fps)&&fps>0&&fps<floor?stepDown(level):level;}
// Sustained frame rate over fixed windows, read from the median frame time so that compile hitches and garbage collection pauses
// do not count. Gaps longer than stallMs (a backgrounded tab, a long compile) are left out entirely, and a window that was mostly
// stalled gives no verdict, so a one-off hitch never costs a quality level.
export function createFpsWindow({windowMs=5000,stallMs=250}={}){
 let start=0,last=0,stalled=0,gaps=[];
 return {frame(now){if(!start){start=last=now;stalled=0;gaps=[];return null;}const gap=now-last;last=now;if(gap>stallMs)stalled+=gap;else gaps.push(gap);const span=now-start;if(span<windowMs)return null;const active=span-stalled,list=gaps;start=now;stalled=0;gaps=[];if(active<windowMs/2||!list.length)return null;list.sort((a,b)=>a-b);const median=list[Math.floor(list.length/2)];return median>0?1000/median:null;},reset(){start=0;}};
}
