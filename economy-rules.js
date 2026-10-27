import {C} from './config.js';
export function soloPlayer(room){const players=room.players.filter(p=>p.connected&&!p.departed);return players.length===1?players[0]:null;}
export function personalFunds(room,p){return p.wallet+(soloPlayer(room)===p?room.fund:0);}
export function spendPersonal(room,p,cost){if(personalFunds(room,p)+C.damageEpsilon<cost)return false;const wallet=Math.min(p.wallet,cost);p.wallet-=wallet;room.fund-=cost-wallet;return true;}
export function machineWorkers(room,now=room.now){return room.players.filter(p=>p.connected&&!p.departed&&now-(p.lastWorked??-Infinity)<=C.team.activeMs);}
// All machine output is credited exactly once, without holds or ground piles.
export function creditMachine(room,value,source){if(!(value>0))return;const players=machineWorkers(room),share=players.length?value*C.team.machinePersonalFraction/players.length:0;room.fund+=value-share*players.length;room.fundEarned+=value-share*players.length;for(const p of players){p.wallet+=share;p.lifetime+=share;p.earned+=share;const event=room.machineShares.find(e=>e.playerId===p.publicId&&e.source===source);if(event)event.value+=share;else room.machineShares.push({playerId:p.publicId,source,value:share,x:p.x,y:p.y});}}

export function creditOwner(room,ownerId,value,source='belt'){const p=room.players.find(p=>p.publicId===ownerId);if(!p||p.departed){room.fund+=value;room.fundEarned+=value;return;}p.wallet+=value;p.lifetime+=value;p.earned+=value;if(source==='belt')p.beltEarned=(p.beltEarned||0)+value;const e=room.machineShares.find(e=>e.playerId===ownerId&&e.source===source);if(e)e.value+=value;else room.machineShares.push({playerId:ownerId,source,value,x:C.mapSize/2,y:C.mapSize/2});}

export function incomeMultiplier(room){return (room.fast?C.fastMultiplier:1)*(room.quick?C.quickValueMultiplier:1);}
