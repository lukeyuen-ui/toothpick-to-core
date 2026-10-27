import {machineBlocks} from './obstacles.js';
import {C} from './config.js';
const M=C.movement;
export function normalizeMove(dx,dy){if(typeof dx!=='number'||typeof dy!=='number'||!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)>1+M.inputTolerance)return null;const length=Math.hypot(dx,dy);return length>1?{dx:dx/length,dy:dy/length}:{dx,dy};}
export function liveMove(p,now){return p.move&&now-p.moveAt<=M.moveTimeoutMs&&(p.move.dx||p.move.dy);}
export function validPosition(x,y,room){const r=M.collisionRadius;if(x<r||y<r||x>C.mapSize-r||y>C.mapSize-r)return false;return !machineBlocks(room,x,y)&&!C.hauling.depotCells.some(([cx,cy])=>x>cx-r&&x<cx+1+r&&y>cy-r&&y<cy+1+r);}
export function slide(p,dx,dy,room){const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/M.substep)),sx=dx/steps,sy=dy/steps;for(let i=0;i<steps;i++){const nx=Math.max(M.collisionRadius,Math.min(C.mapSize-M.collisionRadius,p.x+sx));if(validPosition(nx,p.y,room))p.x=nx;const ny=Math.max(M.collisionRadius,Math.min(C.mapSize-M.collisionRadius,p.y+sy));if(validPosition(p.x,ny,room))p.y=ny;}}
export function applyMove(room,p,message,now){const vector=normalizeMove(message.dx,message.dy);if(!vector)return false;if(p.shaft!=null||p.belay)return true;p.move=vector;p.moveAt=now;if(vector.dx||vector.dy){p.facing={...vector};p.target=null;p.drive=null;p.drivePath=null;p.returning=false;p.boarded=false;p.boarding=false;p.lastActive=now;p.lastWorked=now;room.lastActivity=now;}return true;}
// Only the click autopilot needs routing. Direct control always slides, never teleports.
export function driveStep(p,dt,room){let target=p.drive;if(!target)return;if(!validPosition(target.x,target.y,room)){let best=null;for(const [cx,cy]of C.hauling.depotCells)for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const x=cx+dx+0.5,y=cy+dy+0.5;if(!validPosition(x,y,room))continue;const d=Math.hypot(x-p.x,y-p.y);if(!best||d<best.d)best={x,y,d};}if(!best){p.drive=null;return;}p.drive=target={x:best.x,y:best.y};}
 if(p.driveKey!==target){p.driveKey=target;p.drivePath=route(p.x,p.y,target.x,target.y,room,!!p.returning);}
 const point=p.drivePath?.[0]||target,dx=point.x-p.x,dy=point.y-p.y,length=Math.hypot(dx,dy),travel=(p.machineSpeed||C.mobility[p.mobility].speed)*dt;
 if(length){p.facing={dx:dx/length,dy:dy/length};slide(p,dx/length*Math.min(travel,length),dy/length*Math.min(travel,length),room);}
 if(Math.hypot(point.x-p.x,point.y-p.y)<C.damageEpsilon){if(p.drivePath?.length)p.drivePath.shift();else p.drive=null;}
 if(!validPosition(target.x,target.y,room)&&Math.hypot(dx,dy)<1){p.drive=null;p.drivePath=null;}
}
function route(x,y,tx,ty,room,avoidPits=false){const safe=(x,y)=>validPosition(x,y,room)&&(!avoidPits||!room.cells[Math.floor(y)*C.mapSize+Math.floor(x)]?.row);let clear=true;const span=Math.hypot(tx-x,ty-y),n=Math.ceil(span/M.substep);for(let i=1;i<=n;i++)if(!safe(x+(tx-x)*i/n,y+(ty-y)*i/n)){clear=false;break;}if(clear)return null;
 const start=Math.floor(y)*C.mapSize+Math.floor(x),goal=Math.floor(ty)*C.mapSize+Math.floor(tx),parents=new Map([[start,null]]),queue=[start];let end=null;
 for(let head=0;head<queue.length;head++){const at=queue[head],cx=at%C.mapSize,cy=Math.floor(at/C.mapSize);if(at===goal){end=at;break;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,id=ny*C.mapSize+nx;if(nx<0||ny<0||nx>=C.mapSize||ny>=C.mapSize||parents.has(id)||!safe(nx+0.5,ny+0.5))continue;parents.set(id,at);queue.push(id);}}
 if(end===null)return avoidPits?rimRoute(x,y,tx,ty,room):null;const points=[];while(end!==start){points.push({x:end%C.mapSize+0.5,y:Math.floor(end/C.mapSize)+0.5});end=parents.get(end);}points.reverse();return points;
}

// The grid seams connect the solid rims even when every neighboring cell is dug.
function rimRoute(x,y,tx,ty,room){const limit=C.mapSize-1,sx=Math.max(1,Math.min(limit,Math.round(x))),sy=Math.max(1,Math.min(limit,Math.round(y))),start=sy*C.mapSize+sx;let gx=1,gy=1,nearest=Infinity;for(let ny=1;ny<=limit;ny++)for(let nx=1;nx<=limit;nx++){const distance=Math.hypot(nx-tx,ny-ty);if(validPosition(nx,ny,room)&&distance<nearest){nearest=distance;gx=nx;gy=ny;}}const goal=gy*C.mapSize+gx,parents=new Map([[start,null]]),queue=[start];let end=null;for(let h=0;h<queue.length;h++){const at=queue[h];if(at===goal){end=at;break;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=at%C.mapSize+dx,ny=Math.floor(at/C.mapSize)+dy,id=ny*C.mapSize+nx;if(nx<1||ny<1||nx>limit||ny>limit||parents.has(id)||!validPosition(nx,ny,room))continue;parents.set(id,at);queue.push(id);}}if(end==null)return null;const points=[];while(end!==start){points.push({x:end%C.mapSize,y:Math.floor(end/C.mapSize)});end=parents.get(end);}points.push({x:sx,y:sy});points.reverse();return points;}
