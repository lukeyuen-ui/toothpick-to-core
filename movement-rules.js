import {machineBlocks,machineAt} from './obstacles.js';
import {enterShaft} from './shaft-rules.js';
import {C} from './config.js';
const M=C.movement;
export function normalizeMove(dx,dy){if(typeof dx!=='number'||typeof dy!=='number'||!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)>1+M.inputTolerance)return null;const length=Math.hypot(dx,dy);return length>1?{dx:dx/length,dy:dy/length}:{dx,dy};}
export function liveMove(p,now){return p.move&&now-p.moveAt<=M.moveTimeoutMs&&(p.move.dx||p.move.dy);}
export function validPosition(x,y,room){const r=M.collisionRadius;if(x<r||y<r||x>C.mapSize-r||y>C.mapSize-r)return false;return !machineBlocks(room,x,y)&&!C.hauling.depotCells.some(([cx,cy])=>x>cx-r&&x<cx+1+r&&y>cy-r&&y<cy+1+r);}
// Nobody walks over a hole. A shaft (a cell dug past shafts.surfaceReachRows, so deeper than anyone digs from the surface) has an opening, the cell less
// its spoil lip (C.pits.inset), that is a wall to the explorer's disc (collisionRadius): they stop at the lip, the seam between two shafts is too narrow
// to cross, and Belay down is the only way in. Scrapes of a row or three stay walkable dents. pitPenetration reports the deepest overlap of the disc
// with a nearby opening and the way out of it: slide refuses steps that overlap more than the step before, so an explorer who is somehow over a
// shaft can always walk off it but never deeper, and settlePits nudges whoever stands beside a cell as it breaks through.
export function isShaft(cell){return cell?.row>C.shafts.surfaceReachRows;}
function pitPenetration(room,x,y){const r=M.collisionRadius,half=0.5-C.pits.inset,N=C.mapSize,cx0=Math.floor(x),cy0=Math.floor(y);let best=null;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=cx0+dx,cy=cy0+dy;if(cx<0||cy<0||cx>=N||cy>=N||!isShaft(room.cells[cy*N+cx]))continue;const ox=x-cx-0.5,oy=y-cy-0.5,px=Math.max(0,Math.abs(ox)-half),py=Math.max(0,Math.abs(oy)-half),d=Math.hypot(px,py);if(d>=r)continue;
  let depth,nx,ny;if(d>0){depth=r-d;nx=Math.sign(ox)*px/d;ny=Math.sign(oy)*py/d;}else{const ex=half+r-Math.abs(ox),ey=half+r-Math.abs(oy);if(ex<=ey){depth=ex;nx=ox>=0?1:-1;ny=0;}else{depth=ey;nx=0;ny=oy>=0?1:-1;}}
  if(!best||depth>best.depth)best={depth,nx,ny};}
 return best;}
export function overPit(room,x,y){return !!pitPenetration(room,x,y);}
export function settlePits(room,p){if(p.shaft!=null||p.boarded||p.boarding||p.belay||p.rimCell!=null)return;for(let i=0;i<4;i++){const hit=pitPenetration(room,p.x,p.y);if(!hit)return;const nx=p.x+hit.nx*(hit.depth+C.damageEpsilon),ny=p.y+hit.ny*(hit.depth+C.damageEpsilon);if(!validPosition(nx,ny,room))return;p.x=nx;p.y=ny;}}
function walkable(room,x,y,fromDepth){if(!validPosition(x,y,room))return false;const hit=pitPenetration(room,x,y);return !hit||(fromDepth>0&&hit.depth<fromDepth);}
export function slide(p,dx,dy,room){const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/M.substep)),sx=dx/steps,sy=dy/steps;for(let i=0;i<steps;i++){let fromDepth=pitPenetration(room,p.x,p.y)?.depth||0;const nx=Math.max(M.collisionRadius,Math.min(C.mapSize-M.collisionRadius,p.x+sx));if(walkable(room,nx,p.y,fromDepth))p.x=nx;fromDepth=pitPenetration(room,p.x,p.y)?.depth||0;const ny=Math.max(M.collisionRadius,Math.min(C.mapSize-M.collisionRadius,p.y+sy));if(walkable(room,p.x,ny,fromDepth))p.y=ny;}}
export function applyMove(room,p,message,now){const vector=normalizeMove(message.dx,message.dy);if(!vector)return false;if(p.belay)return true;if(p.shaft!=null){p.move=vector;p.moveAt=now;if(vector.dx||vector.dy){p.facing={...vector};p.target=null;p.lastActive=now;room.lastActivity=now;}return true;}p.move=vector;p.moveAt=now;if(vector.dx||vector.dy){p.facing={...vector};p.target=null;p.drive=null;p.drivePath=null;p.returning=false;p.boarded=false;p.boarding=false;p.lastActive=now;p.lastWorked=now;room.lastActivity=now;}return true;}
// Only the click autopilot needs routing. Direct control always slides, never teleports.
export function driveStep(p,dt,room){let target=p.drive;if(!target)return;if(!validPosition(target.x,target.y,room)){let best=null;for(const [cx,cy]of C.hauling.depotCells)for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const x=cx+dx+0.5,y=cy+dy+0.5;if(!validPosition(x,y,room)||overPit(room,x,y))continue;const d=Math.hypot(x-p.x,y-p.y);if(!best||d<best.d)best={x,y,d};}if(!best){p.drive=null;p.returning=false;return;}p.drive=target={x:best.x,y:best.y};}
 if(p.driveKey!==target){p.driveKey=target;p.drivePath=route(p.x,p.y,target.x,target.y,room,true);if(p.drivePath===null&&p.returning&&hopHome(p,target,room))return;}
 const point=p.drivePath?.[0]||target,dx=point.x-p.x,dy=point.y-p.y,length=Math.hypot(dx,dy),travel=(p.machineSpeed||C.mobility[p.mobility].speed)*dt;
 const beforeX=p.x,beforeY=p.y;if(length){p.facing={dx:dx/length,dy:dy/length};slide(p,dx/length*Math.min(travel,length),dy/length*Math.min(travel,length),room);}
 // A drive aimed into a hole (or otherwise blocked) stops at the rim instead of pushing forever.
 if(length>C.damageEpsilon&&Math.hypot(p.x-beforeX,p.y-beforeY)<C.damageEpsilon*0.01){p.drive=null;p.drivePath=null;p.returning=false;return;}
 if(Math.hypot(point.x-p.x,point.y-p.y)<C.damageEpsilon){if(p.drivePath?.length)p.drivePath.shift();else p.drive=null;}
 if(!validPosition(target.x,target.y,room)&&Math.hypot(dx,dy)<1){p.drive=null;p.drivePath=null;p.returning=false;}
}
// Return to base with the way home cut off by holes: drop into the neighbouring shaft that lies towards the depot and come up on its far
// side (the belay's look direction), then carry on driving; another band of shafts means another hop. Each hop has to bring the depot
// nearer, so the chain always ends, and the drill's bore and machine cells are never used as a way through.
function hopHome(p,target,room){const N=C.mapSize,bx=Math.floor(p.x),by=Math.floor(p.y),now=Math.hypot(p.x-target.x,p.y-target.y);if(p.hopFrom!=null&&now>p.hopFrom-0.1)return false;/* the last hop brought the depot no nearer: stop at this rim rather than bounce between two holes */let best=null;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=bx+dx,ny=by+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const i=ny*N+nx;if(!isShaft(room.cells[i])||(room.drill&&i===room.site)||machineAt(room,nx,ny))continue;const l=Math.hypot(dx,dy),ux=dx/l,uy=dy/l,d=Math.hypot(nx+0.5+ux-target.x,ny+0.5+uy-target.y);if(d>=now-0.25)continue;if(!best||d<best.d)best={i,ux,uy,d};}
 if(!best)return false;p.hopDir={dx:best.ux,dy:best.uy};p.hopFrom=now;p.drive=null;p.drivePath=null;enterShaft(room,p,best.i);if(p.shaft!==best.i){p.hopDir=null;return false;}return true;}
function route(x,y,tx,ty,room,avoidPits=false){const safe=(x,y)=>validPosition(x,y,room)&&(!avoidPits||!overPit(room,x,y));let clear=true;const span=Math.hypot(tx-x,ty-y),n=Math.ceil(span/M.substep);for(let i=1;i<=n;i++)if(!safe(x+(tx-x)*i/n,y+(ty-y)*i/n)){clear=false;break;}if(clear)return [];
 const start=Math.floor(y)*C.mapSize+Math.floor(x),goal=Math.floor(ty)*C.mapSize+Math.floor(tx),parents=new Map([[start,null]]),queue=[start];let end=null;
 for(let head=0;head<queue.length;head++){const at=queue[head],cx=at%C.mapSize,cy=Math.floor(at/C.mapSize);if(at===goal){end=at;break;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,id=ny*C.mapSize+nx;if(nx<0||ny<0||nx>=C.mapSize||ny>=C.mapSize||parents.has(id)||!safe(nx+0.5,ny+0.5))continue;parents.set(id,at);queue.push(id);}}
 if(end===null)return null;const points=[];while(end!==start){points.push({x:end%C.mapSize+0.5,y:Math.floor(end/C.mapSize)+0.5});end=parents.get(end);}points.reverse();return points;
}

