// A flawless drill crew for rule tests: each seat answers only to its own control, so this plays every seat the right way.
// HEAT vents just past centre, PRESSURE feathers the valve on the centre line, ALIGN grips both pads, POWER sits the throttle on the target.
export const operate=r=>r.players.filter(p=>p.boarded&&r.console?.[p.publicId]).flatMap(p=>{const g=r.console[p.publicId],tune=(extra={})=>[{player:p,message:{type:'tune',...extra}}];
 if(g.kind==='HEAT')return g.v-0.5>0.04?tune():[];if(g.kind==='PRESSURE')return tune({hold:g.v>0.5});if(g.kind==='ALIGN')return tune({hold:true});return tune({level:Math.min(1,Math.max(0,g.target))});});
