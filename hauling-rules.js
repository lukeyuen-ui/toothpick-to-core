import {creditOwner} from './economy-rules.js';
import {C} from './config.js';
import {creditFund,markActive} from './team-rules.js';
const H=C.hauling;
export function isDepot(x,y){return H.depotCells.some(([dx,dy])=>dx===x&&dy===y);}
export function home(x,y){return H.depotCells.some(([dx,dy])=>Math.max(Math.abs(dx-Math.floor(x)),Math.abs(dy-Math.floor(y)))<=H.depotRadius);}
export function depotTarget(x,y){return H.depotCells.reduce((best,cell)=>{const distance=Math.abs(cell[0]-Math.floor(x))+Math.abs(cell[1]-Math.floor(y));return !best||distance<best.distance?{cell,distance}:best;},null).cell;}
export function holdCapacity(p){return C.mobility[p.mobility].hold+(C.cargoPods[(p.pods||0)-1]?.hold||0);}
export function privateToast(room,p,text){room.privateToasts??={};(room.privateToasts[p.publicId]??=[]).push({type:'toast',text});}
export function addPile(room,index,lot){if(room.belts[index]&&!lot.beltEntry){lot={...lot,ownerId:room.belts[index].ownerId||lot.ownerId,beltEntry:true};}const pile=room.piles[index]??={value:0,units:0,lots:[]};pile.value+=lot.value;pile.units++;pile.lots.push(lot);pile.lots.sort((a,b)=>a.order-b.order);}
function putInHold(p,lot){p.hold.lots.push(lot);p.hold.value+=lot.value;p.hold.units++;}
function fullNotice(room,p){if(p.hold.units>=holdCapacity(p)&&!p.holdFullNotified){p.holdFullNotified=true;privateToast(room,p,p.shaft!=null?'Hold full. Belay up.':'Hold full');}else if(p.hold.units<holdCapacity(p))p.holdFullNotified=false;}
export function shaftHoist(room,index){return room.cells[index]?.row>0&&room.belts[index]&&room.conveyorLines.some(line=>line.source===index);}
export function hoistCargo(room,p,index,value){if(!p.connected||p.departed||p.shaft!==index||!shaftHoist(room,index))return false;addPile(room,index,{value,order:++room.cargoSequence,ownerId:p.publicId,beltEntry:true,viaHoist:true});p.firstCargo=true;return true;}
export function addCargo(room,p,index,value){const lot={value,order:++room.cargoSequence};if(p.departed){addPile(room,index,lot);return true;}if(room.showcase){p.wallet+=value;p.lifetime+=value;p.earned+=value;p.deliveredValue+=value;p.deliveredAt=++room.achievement;p.firstCargo=true;return false;}p.firstCargo=true;if(p.hold.units<holdCapacity(p)){putInHold(p,lot);fullNotice(room,p);return false;}const roverIndex=Math.floor(p.y)*C.mapSize+Math.floor(p.x);addPile(room,Object.hasOwn(room.belts,roverIndex)?roverIndex:index,lot);fullNotice(room,p);return true;}
export function pickup(room,p,index){const pile=room.piles[index];if(!pile)return;while(pile.lots.length&&p.hold.units<holdCapacity(p)){const next=pile.lots.findIndex(l=>!l.ownerId&&!l.beltEntry);if(next<0)break;const lot=pile.lots.splice(next,1)[0];putInHold(p,lot);pile.units--;pile.value-=lot.value;p.firstCargo=true;}if(!pile.units)delete room.piles[index];fullNotice(room,p);}
export function deliver(room,p){if(!p.hold.units)return;const value=p.hold.value;p.wallet+=value;p.lifetime+=value;p.earned+=value;p.deliveredValue+=value;p.deliveredAt=++room.achievement;p.hold={value:0,units:0,lots:[]};p.holdFullNotified=false;
 const event=room.deliveries.find(e=>e.playerId===p.publicId);if(event){event.value+=value;event.x=p.x;event.y=p.y;}else room.deliveries.push({playerId:p.publicId,value,x:p.x,y:p.y});
 if(p.returning){p.drive=null;p.returning=false;}
}
export function returnHome(room,p,now){markActive(room,p,now);p.target=null;p.boarding=false;p.boarded=false;if(home(p.x,p.y)){deliver(room,p);return;}const [x,y]=depotTarget(p.x,p.y);p.returning=true;p.drive={x:x+0.5,y:y+0.5};}
// Exact grid traversal, including every cell entered by a fast rover. No physics engine.
export function crossedCells(x0,y0,x1,y1){let x=Math.floor(x0),y=Math.floor(y0);const endX=Math.floor(x1),endY=Math.floor(y1),dx=x1-x0,dy=y1-y0,sx=Math.sign(dx),sy=Math.sign(dy),result=[[x,y]];let tx=dx?((sx>0?x+1:x)-x0)/dx:Infinity,ty=dy?((sy>0?y+1:y)-y0)/dy:Infinity;const stepx=dx?Math.abs(1/dx):Infinity,stepy=dy?Math.abs(1/dy):Infinity;
 const maxSteps=Math.abs(endX-x)+Math.abs(endY-y)+1;let steps=0;while((x!==endX||y!==endY)&&steps++<maxSteps){if(y===endY||x!==endX&&tx<ty){x+=sx;tx+=stepx;}else if(x===endX||ty<tx){y+=sy;ty+=stepy;}else{x+=sx;y+=sy;tx+=stepx;ty+=stepy;}result.push([x,y]);}return result;}
export function haulAlong(room,p,x0=p.x,y0=p.y){if(p.shaft!=null||p.belay)return;for(const [x,y]of crossedCells(x0,y0,p.x,p.y)){if(!room.cells[y*C.mapSize+x]?.row)pickup(room,p,y*C.mapSize+x);if(home(x+0.5,y+0.5)){deliver(room,p);if(p.returning){p.drive=null;p.returning=false;}}}fullNotice(room,p);}
export function conveyorPath(source){const x0=source%C.mapSize,y0=Math.floor(source/C.mapSize),[endX,endY]=depotTarget(x0,y0);let x=x0,y=y0;const path=[source];while(x!==endX){x+=Math.sign(endX-x);path.push(y*C.mapSize+x);}while(y!==endY){y+=Math.sign(endY-y);path.push(y*C.mapSize+x);}return path;}
export function conveyorQuote(room,index,p){const path=conveyorPath(index),newCells=path.filter(i=>!Object.hasOwn(room.belts,i)).length,discountCells=p&&!p.beltsBuilt?Math.min(H.firstBeltDiscountCells,newCells):0;return {path,newCells,discountCells,price:(newCells-discountCells+discountCells*H.firstBeltDiscount)*H.conveyorCostPerCell};}
export function buildConveyor(room,goal){const path=goal.path;let count=0;path.forEach((index,i)=>{if(!Object.hasOwn(room.belts,index)){room.belts[index]={next:path[i+1]??null,...(goal.ownerId?{ownerId:goal.ownerId}:{})};count++;}});room.conveyorLines.push({source:goal.index,path,length:path.length,ownerId:goal.ownerId});room.announcements.push({type:'conveyor',count});}
export function runConveyors(room,dt){room.beltProgress+=dt*H.conveyorSpeed;if(room.beltProgress<1)return;room.beltProgress%=1;
 const moves=[];for(const [key,pile]of Object.entries(room.piles)){const belt=room.belts[key];if(!belt)continue;const index=Number(key);for(let i=0;i<pile.lots.length;i++)if(!pile.lots[i].beltEntry)pile.lots[i]={...pile.lots[i],ownerId:belt.ownerId||pile.lots[i].ownerId,beltEntry:true};moves.push({index,next:belt.next,pile});}
 for(const move of moves)delete room.piles[move.index];
 for(const {index,next,pile}of moves){const target=next??index;if(isDepot(target%C.mapSize,Math.floor(target/C.mapSize))){for(const lot of pile.lots)if(lot.ownerId)creditOwner(room,lot.ownerId,lot.value,'belt');else creditFund(room,lot.value);}else for(const lot of pile.lots)addPile(room,target,lot);}
}
export function publicPiles(room){return Object.fromEntries(Object.entries(room.piles).map(([index,pile])=>[index,{value:pile.value,units:pile.units}]));}
