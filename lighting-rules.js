import {C} from './config.js';
export const darkMessage='Too dark to dig. A better light at the hub reaches deeper.';
export function personalLightRows(p){return p.lighting>=C.lighting.length?C.finalRow:C.lighting[(p.lighting||0)-1]?.rows??C.shafts.daylightRows;}
export function lightReach(room,p,index=p.shaft){if(p.isTeam)return C.finalRow;const cell=room.cells[index];if(cell?.shaftLights)return C.finalRow;let reach=personalLightRows(p);if(index!=null)for(const other of room.players)if(other.connected&&!other.departed&&!other.belay&&other.shaft===index&&other.depth+C.damageEpsilon>=cell.row)reach=Math.max(reach,personalLightRows(other));return reach;}
export function surfaceVisible(type,p){return !!(type==='oil'?p.dowsing:type==='diamond'?p.diamond:type==='gold'||type==='silver'?p.metal:0);}
export function detectorMask(p){return [p.metal>0,p.diamond>0,p.dowsing>0].map(Number).join('');}
