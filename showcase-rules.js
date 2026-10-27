import {C} from './config.js';
import {hp} from './rules.js';

// Showcase: a late-game world for people with three minutes. The drill already bores deep with coolant and oil running,
// everyone carries the mining mech, and the fund can afford the World Breaker, so the visit goes dig, board, tune, vote, overdrive, core.
export function setupShowcase(room){const S=C.showcase,N=C.mapSize,set=(x,y,row)=>{const c=room.cells[y*N+x];c.row=row;c.hp=hp(row);c.damage={};};
 room.showcase=true;room.site=S.site[1]*N+S.site[0];room.drill={index:room.site};room.coolant=true;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)set(S.site[0]+dx,S.site[1]+dy,S.boreRow);
 for(const [x,y] of S.pumps){set(x,y,S.oilRow);const c=room.cells[y*N+x];c.oilSite=true;c.oilRow=S.oilRow;c.pumpBuilt=true;}
 for(const [x,y,row] of S.pits)set(x,y,row);
 room.fund=C.teamItems.worldBreaker.price*S.fundShare;room.deepest=Math.max(...room.cells.map(c=>c.row));}

export function equipShowcase(room,p){if(!room.showcase||p.showcaseReady)return;const S=C.showcase;p.showcaseReady=true;p.tool=C.tools.length-1;p.mobility=C.mobility.length-1;p.lighting=C.lighting.length;p.pods=S.pods;p.wallet=Math.max(p.wallet,S.wallet);}
