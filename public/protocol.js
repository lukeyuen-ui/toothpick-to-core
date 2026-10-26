// Merge authoritative wire patches. This module makes no game decisions.
export function mergeSnapshot(state,message){
 if(message.type==='full')return {...message,cells:message.cells.map(c=>({...c})),players:message.players.map(p=>({...p})),team:{...message.team},piles:{...message.piles},belts:{...message.belts},hints:{...message.hints}};
 const cells=state.cells;for(const cell of message.cells||[])cells[cell.index]=cell;
 const players=state.players.map(p=>({...p}));for(const patch of message.players||[]){const index=players.findIndex(p=>p.id===patch.id);if(index<0)players.push(patch);else Object.assign(players[index],patch);}
 const hints={...state.hints};for(const [key,value]of Object.entries(message.hintChanges||{})){if(value===null)delete hints[key];else hints[key]=value;}
 const piles={...state.piles},belts={...state.belts};for(const [field,target]of [['pileChanges',piles],['beltChanges',belts]])for(const [key,value]of Object.entries(message[field]||{})){if(value===null)delete target[key];else target[key]=value;}
 return {...state,...message,cells,players,hints,piles,belts,team:{...state.team,...message.team}};
}
