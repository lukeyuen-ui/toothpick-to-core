import {C} from './config.js';
export function machineAt(room,x,y,all=false){return room?.excavators?.find(m=>(all||m.active)&&Math.abs(x-m.cx)<=C.excavator.halfSize&&Math.abs(y-m.cy)<=C.excavator.halfSize);}
export function machineBlocks(room,x,y){const r=C.movement.collisionRadius;if(room?.worldBreaker&&Math.abs(x-(room.site%C.mapSize+0.5))<0.5+r&&Math.abs(y-(Math.floor(room.site/C.mapSize)+0.5))<0.5+r)return true;return room?.excavators?.some(m=>m.active&&x>m.cx-C.excavator.halfSize-r&&x<m.cx+C.excavator.halfSize+1+r&&y>m.cy-C.excavator.halfSize-r&&y<m.cy+C.excavator.halfSize+1+r);}
