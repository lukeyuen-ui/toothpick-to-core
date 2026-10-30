import {touchInput} from './wording.js';
import {surfaceVisible,lightReach} from '../lighting-rules.js';
import {holdCapacity} from '../hauling-rules.js';
import {C} from '../config.js';import {depthAt,hp,gate} from '../rules.js';
// A hardcore explorer still holding the toothpick is pointed at the hub: each block takes hundreds of taps, and the starting wallet buys real tools.
const hardcoreStart=touch=>'Hardcore rock takes hundreds of toothpick taps a block. '+(touch?'Tap Hub at the habitat':'Press E at the hub')+' and spend your starting $'+C.hardcore.startWallet.toLocaleString('en-US')+' on tools first.';
const cellLabel=i=>String.fromCharCode('A'.charCodeAt(0)+i%C.mapSize)+(Math.floor(i/C.mapSize)+1);
// The first expedition, one card at a time: [title, hint, touch hint]. The first seven teach the explorer; the rest walk the team to the core:
// light, rods, oil, the pump, the drill site, coolant, the rig, a seat and the World Breaker. Team steps complete for everyone as soon as
// the team gets there, so a late joiner skips through what the crew has already done.
export const goals=[
 ['Dig 3 blocks','Click or Space digs the outlined cell.','Tap to dig the outlined cell.'],
 ['Bring your ore to the hub','Press H (Return to base): your explorer walks home and sells the hold.','Tap Return to base: your explorer walks home and sells the hold.'],
 ['Buy the Spoon','Press E at the hub. Supply has your next tool.','Tap Hub at the habitat. Supply has your next tool.'],
 ['Belay down into your hole','Four rows down a cell is out of reach from the top. Stand at its edge, press R, then dig its floor.','Four rows down a cell is out of reach from the top. Stand at its edge, tap Belay down, then dig its floor.'],
 ['Belay up when your hold is full','Press R to belay up, then H to return to base. You come up on the side you face: that is how you cross a hole.','Tap Belay up, then Return to base. You come up on the side you face: that is how you cross a hole.'],
 ['Find a surface glint and dig it','Buy a matching detector at the hub to see surface signs: silver, gold and diamonds pay a bonus.'],
 ['Chip in to the team fund','At the hub, Team has chip-in buttons. The fund buys the coolant, the plasma drill and the World Breaker.'],
 ['Light the way down','Past 10 rows the floor is too dark to dig. Supply sells lamps that light more rows.'],
 ['Buy dowsing rods and follow them','Supply sells rods. Red rods: no oil here. Green rods: oil under this spot, so dig there.'],
 ['Strike oil','Dig where the rods turn green. The pocket breaks open when you reach its row.'],
 ['Propose an oil pump','At the hub, open Team and propose the Oil pump. Everyone votes. Pumps run the plasma drill and pay the fund every second.'],
 ['Pick the drill site','Hand tools stop at the lower mantle. In Team, propose a drill site: your deepest shaft.'],
 ['Buy coolant','Nothing survives the magma without coolant. Propose it in Team and chip in.'],
 ['Place the plasma drill','Propose it in Team. The rig drops into the site shaft with its own conveyor.'],
 ['Board the drill','Walk up to the rig and press B. Keep your gauge green: green gauges bore faster.','Walk up to the rig and tap Board. Keep your gauge green: green gauges bore faster.'],
 ['Launch the World Breaker','At the magma, propose it from your seat or vote YES. Keep every gauge green to crack the core.']];
export const FLAGS=['blocks','delivery','spoon','shaft','belay','glint','chip','lamp','rods','oil','pump','site','coolant','drill','boarded','worldBreaker'];
// Showcase visits follow the arc in six steps, one per beat: the toothpick, the mech, the drill site, boarding, the console and the World Breaker.
// The step comes from the authority's state (team.arc and the rest), so the card always says what the director is waiting for; the copy changes
// inside a step as the beat moves on (the vote, then belaying up; the proposal, then the overdrive).
export const showcaseGoals=[['Tap the dirt','Your toothpick does 1 damage a tap.'],['Dig to the magma with the mech','Tap the ground beside you: the claws tear out a 3x3 and you drop in.'],['Vote YES on the drill site','Your crew wants the plasma drill in your shaft. Vote YES in the banner.'],['Board the plasma drill','Walk up to the rig and board. Your crew takes the other seats.'],['Keep your gauge green','Green gauges drill faster, and the bore ore fills the fund: the road to the World Breaker.'],['Launch the World Breaker','Propose it from your seat, or vote YES when a crewmate does.']];
// One damage a tap against every row down to the core, the inner core's armour included.
const TOOTHPICK_TAPS=Array.from({length:C.finalRow},(_,row)=>hp(row)).reduce((a,b)=>a+b,0);
const km=m=>m<C.view.km?Math.round(m)+' m':Math.round(m/C.view.km).toLocaleString('en-US')+' km';
export function inBore(state,me){const s=state.team.site;if(s==null||me.shaft==null)return false;return Math.max(Math.abs(me.shaft%C.mapSize-s%C.mapSize),Math.abs(Math.floor(me.shaft/C.mapSize)-Math.floor(s/C.mapSize)))<=1;}
export function showcaseStep(state,me){const t=state.team,arc=t.arc?.round===state.round?t.arc:{};if(t.won)return showcaseGoals.length;
 if(t.worldBreaker||t.vote?.item==='worldBreaker'||t.goal?.item==='worldBreaker'||arc.readyAt!=null)return 5;if(me.boarded)return 4;if(t.drill&&!inBore(state,me))return 3;
 if(t.site!=null||t.vote?.kind==='site'||(arc.beat&&arc.beat!=='dig'))return 2;return me.tool>0?1:0;}
const SEAT_HINTS={HEAT:['Tap VENT when the needle runs hot, but not too often.','Press Space or click VENT when the needle runs hot, but not too often.'],PRESSURE:['Hold the pad while pressure builds, and let go before it drops too far.','Hold Space while pressure builds, and let go before it drops too far.'],ALIGN:['Hold both pads, one thumb each, to pull the two axes together.','Hold A and D together to pull the two axes together.'],POWER:['Drag on the graph to keep the throttle inside the green band.','Hold W or S, or drag, to keep the throttle inside the green band.']};
// The card's words for a step right now: [title, hint].
export function showcaseCopy(index,state,me,touch){const t=state.team,[title,hint]=showcaseGoals[index]||['',''],click=touch?'Tap':'Click';
 if(index===0)return [title,me.taps>0?'Tap '+me.taps+': 1 damage. At this rate the core is about '+Math.round(TOOTHPICK_TAPS/C.view.million)+' million taps away.':click+' the dirt in front of you'+(touch?'.':', or press Space.')+' '+hint];
 if(index===1){if(me.shaft==null)return [title,click+' the ground beside you: the claws tear out a 3x3 and you drop in.'];const row=state.cells[me.shaft].row;return [title,row>=C.outerRow?'Magma, '+km(depthAt(row))+' down! Your crew is picking the drill site.':'Keep tapping the floor. '+km(depthAt(row))+' down, the magma starts at '+km(depthAt(C.outerRow))+'.'];}
 if(index===2){if(t.vote?.kind==='site')return [title,t.vote.index===me.shaft?hint:'Your crew wants the plasma drill in their deepest shaft. Vote YES in the banner.'];if(t.site!=null&&inBore(state,me))return ['Belay up: the rig is coming',(touch?'Tap Belay up.':'Press R or click Belay up.')+' Your crew winches you out in a few seconds anyway.'];return t.site!=null?['The rig is coming down','The plasma drill drops into the shaft in a moment.']:[title,'Your crew proposes the drill site again in a moment.'];}
 if(index===3)return [title,(touch?'Walk up to the rig and tap Board.':'Walk up to the rig and press B.')+' Your crew takes the other seats.'];
 if(index===4&&!me.boarded)return ['Board the plasma drill','Your seat is waiting. '+(touch?'Walk up to the rig and tap Board.':'Walk up to the rig and press B.')];
 if(index===4){const kind=t.console?.[me.id]?.kind,wb=t.catalog?.find(e=>e.item==='worldBreaker'),share=wb?.price?Math.min(99,Math.floor(t.fund/wb.price*100)):0;return [title,(SEAT_HINTS[kind]?.[touch?0:1]||'')+' '+hint+' Fund '+share+'%.'];}
 if(t.worldBreaker)return ['Overdrive! Keep your gauge green','Green needles crack the core faster. Watch the core open.'];
 if(t.vote?.item==='worldBreaker')return ['Vote YES on the World Breaker','Vote in the banner. Your crew is voting too.'];
 return [title,'The fund covers it. '+(touch?'Tap':'Click')+' "World Breaker ready" on the drill readout to propose it, or vote YES when a crewmate does.'];}
// The first-expedition card's words for a step: the hardcore opener replaces the first three hints while the toothpick is still in hand,
// and the pump step names the oil cell once someone has struck it.
export function stepCopy(index,state,me,touch){const [title,hint,touchHint]=goals[index];let text=touch&&touchHint||hint;
 if(state?.hardcore&&me?.tool===0&&index<3)text=hardcoreStart(touch);
 if(index===10){const oil=state?.cells.findIndex(c=>c.oilSite&&!c.pumpBuilt);if(oil>=0)text=text.replace('the Oil pump','the Oil pump at '+cellLabel(oil));}
 return [title,text];}
// Something that wants doing right now outranks the next lesson: a full hold, a floor too dark or too hard for your tools, oil nobody has
// pumped yet, a rig with nothing to burn. The card shows it until it is dealt with, then goes back to the step. [title, hint] or null.
export function urgentTip(state,me,touch){
 if(!state||!me||state.showcase||state.team?.won||me.boarded)return null;
 const t=state.team||{},cells=state.cells,row=me.shaft!=null?cells[me.shaft].row:null,up=touch?'Tap Belay up':'Belay up (R)';
 if(me.hold.units>=holdCapacity(me)&&!me.returning&&!me.belay)return me.shaft!=null?['Hold full: belay up',touch?'Tap Belay up, then Return to base to sell.':'Press R to belay up, then H to return to base and sell.']:['Hold full: sell it',touch?'Tap Return to base. Your hold sells at the hub.':'Press H to return to base. Your hold sells at the hub.'];
 if(row!=null&&!me.belay){
  if(row>lightReach(state,me,me.shaft))return ['Too dark to dig deeper',up+' and buy a lamp at the hub. Lamps light more rows.'];
  const stop=gate(me,row,{coolant:t.coolant,worldBreaker:t.worldBreaker,showcase:state.showcase});
  if(stop==='Needs a pickaxe')return ['Granite: needs a pickaxe',up+' and buy the Pickaxe at the hub, or dig somewhere softer.'];
  if(stop)return ['Hand tools stop here','The plasma drill digs on from here. At the hub, chip in and vote for a drill site, coolant and the drill.'];}
 const oil=cells.findIndex(c=>c.oilSite&&!c.pumpBuilt),want=item=>t.vote?.item===item||t.goal?.item===item;
 if(oil>=0&&!cells.some(c=>c.pumpBuilt)&&!want('pump'))return ['Oil at '+cellLabel(oil)+': propose a pump',(touch?'Tap Hub, open Team':'Go to the hub (E), open Team')+', propose the Oil pump at '+cellLabel(oil)+' and vote YES. Oil runs the plasma drill and pays the fund every second.'];
 if(t.drill&&!t.worldBreaker&&!cells.some(c=>c.pumpBuilt)&&oil<0)return ['The drill needs oil','Buy dowsing rods at the hub and dig where they turn green. Then propose a pump in Team.'];
 return null;}
export function initialGuide(){return {index:0,blocks:0,flags:{},skipped:false,lastPacket:null};}
function observeShowcase(record,state,me){record.mode='showcase';record.target=Math.max(record.target||0,showcaseStep(state,me));}
export function observeGuide(record,state,me,message,previous){if(state.showcase){observeShowcase(record,state,me,message);return;}if(record.skipped||record.index>=goals.length)return;const packet=state.code+':'+state.round+':'+state.tick;if(message.type==='diff'&&record.lastPacket!==packet){for(const e of message.broken||[])if(e.shares?.[me.id]>0){record.blocks++;if(previous?.cells?.[e.index]?.surfaceSign)record.flags.glint=true;}record.lastPacket=packet;}if(record.blocks>=3)record.flags.blocks=true;if(me.deliveredValue>0)record.flags.delivery=true;if(me.tool>=1)record.flags.spoon=true;if(me.shaft!=null&&state.cells[me.shaft].row>C.shafts.surfaceReachRows&&me.depth>=state.cells[me.shaft].row-C.damageEpsilon&&((message.cells||[]).some(c=>c.index===me.shaft&&c.damage?.[me.id]>0)||(message.broken||[]).some(e=>e.index===me.shaft&&e.shares?.[me.id]>0)))record.flags.shaft=true;if(previous?.me?.belay&&me.shaft==null)record.flags.belay=true;if(me.contributed>0)record.flags.chip=true;
 const t=state.team||{},f=record.flags,want=item=>t.vote?.item===item||t.goal?.item===item;if(me.lighting>=1)f.lamp=true;if(me.dowsing>=1)f.rods=true;if(state.cells.some(c=>c.oilSite))f.oil=true;if(state.cells.some(c=>c.pumpBuilt)||want('pump'))f.pump=true;if(t.site!=null||t.vote?.kind==='site')f.site=true;if(t.coolant||want('coolant'))f.coolant=true;if(t.drill||want('plasma'))f.drill=true;if(me.boarded)f.boarded=true;if(t.worldBreaker||want('worldBreaker'))f.worldBreaker=true;}
export function goalDone(record){if(record.mode==='showcase')return (record.target||0)>record.index;return !!record.flags[FLAGS[record.index]];}
export function coreProgress(state,now=state.serverNow){const total=state.cells.reduce((n,c)=>n+c.row,0),base=Math.min(C.coreMeter.maxBeforeFinale,state.deepest/C.finalRow*C.coreMeter.depthWeight+total/(C.finalRow*C.mapSize)*C.coreMeter.totalWeight);if(state.team.won)return 1;const wb=state.team.worldBreaker;return wb?base+(1-base)*Math.min(1,Math.max(0,wb.charge??(now-wb.startedAt)/C.team.worldBreakerMs)):base;}
// Tips off ('toothpick-tips' = 'off') hides the first-expedition card, the urgent tips, the coach line and the start hints for people who
// have played before; the lobby's TIPS setting turns them back on. The showcase keeps its own card either way: it is the guided run.
export function createGuide({document:doc=globalThis.document,storage=globalThis.localStorage,chime=()=>{},getRenderer=()=>null,touch=touchInput}){const narrow=globalThis.matchMedia?.('(max-width:600px)');const $=id=>doc.getElementById(id);const load=()=>{try{const data=JSON.parse(storage?.getItem('toothpick-guide')||'null');if(data&&Number.isInteger(data.index)&&data.index>=0&&data.index<=goals.length&&data.flags&&typeof data.flags==='object'&&data.mode!=='showcase')return {...initialGuide(),...data};}catch{}return initialGuide();};let record=load(),until=0,prior=null,stateRef=null,meRef=null,markerData=null,packetAt=0,lastSaved=null,tipsOn=true;try{tipsOn=storage?.getItem('toothpick-tips')!=='off';}catch{}
 function save(){if(record.mode==='showcase')return;const {lastPacket,...progress}=record,encoded=JSON.stringify(progress);if(encoded===lastSaved)return;lastSaved=encoded;try{storage?.setItem('toothpick-guide',encoded);}catch{}}
 function setTips(on){tipsOn=!!on;try{storage?.setItem('toothpick-tips',on?'on':'off');}catch{}render();}
 $('guide-skip').onclick=()=>{record.skipped=true;until=0;save();render();};
 $('guide-tips').onclick=()=>setTips(false);
 const HUB_STEPS=[1,2,6,7,8,10,11,12,13];
 function marker(){if(!stateRef||!meRef||!active())return null;const s=stateRef.team.site,drill=s!=null?{x:s%C.mapSize+0.5,y:Math.floor(s/C.mapSize)+0.5,label:'DRILL'}:null;if(record.mode==='showcase')return record.index===3?drill:null;if(HUB_STEPS.includes(record.index))return {x:C.mapSize/2,y:C.mapSize/2,label:'HUB'};if(record.index===14)return drill;if(record.index===5){let best=null;for(let i=0;i<stateRef.cells.length;i++)if(!stateRef.cells[i].row&&surfaceVisible(stateRef.cells[i].surfaceSign,meRef)){const x=i%C.mapSize+0.5,y=Math.floor(i/C.mapSize)+0.5,d=Math.hypot(x-meRef.x,y-meRef.y);if(!best||d<best.d)best={x,y,d,label:'ORE'};}return best;}return null;}
 const list=()=>record.mode==='showcase'?showcaseGoals:goals;
 function active(){return !record.skipped&&record.index<list().length;}
 function render(){const showcase=record.mode==='showcase',urgent=tipsOn&&!showcase?urgentTip(stateRef,meRef,touch()):null,steps=active()&&(showcase||tipsOn),show=!!stateRef&&!stateRef.team.won&&(steps||!!urgent),card=$('guide-card');card.hidden=!show;card.classList.toggle('urgent',!!urgent);$('guide-tips').hidden=showcase;$('guide-skip').hidden=!!urgent&&!steps;
  if(show){if(urgent){$('guide-count').textContent='HEADS UP';$('guide-goal').textContent=urgent[0];$('guide-hint').textContent=urgent[1];card.classList.remove('checked');$('coach').hidden=true;}
  else if(showcase){const [title,hint]=showcaseCopy(record.index,stateRef,meRef,touch());$('guide-count').textContent='SHOWCASE '+(record.index+1)+'/'+showcaseGoals.length;$('guide-goal').textContent=(until?'✓ ':'')+title;$('guide-hint').textContent=hint;card.classList.toggle('checked',!!until);$('coach').hidden=true;}
  else{const [title,hint]=stepCopy(record.index,stateRef,meRef,touch());$('guide-count').textContent='FIRST EXPEDITION '+(record.index+1)+'/'+goals.length;$('guide-goal').textContent=(until?'✓ ':'')+title;$('guide-hint').textContent=hint;card.classList.toggle('checked',!!until);$('coach').hidden=true;}}
  getRenderer()?.setGoalMarker?.(show&&!urgent?markerData:null);}
 function observe(state,me,message){if(state.showcase&&(record.mode!=='showcase'||record.round!==state.round)){record={...initialGuide(),mode:'showcase',round:state.round};until=0;}else if(!state.showcase&&record.mode==='showcase'){record=load();until=0;}stateRef=state;meRef=me;packetAt=performance.now();observeGuide(record,state,me,message,prior);save();markerData=marker();if(!until&&active()&&goalDone(record)){until=performance.now()+C.guide.checkMs;chime();save();}prior={me:{shaft:me.shaft,belay:me.belay},cells:state.cells.map(c=>({surfaceSign:c.surfaceSign}))};update(performance.now());}
 function update(now){if(until&&now>=until){record.index++;until=0;save();markerData=marker();if(active()&&goalDone(record)){until=now+C.guide.checkMs;chime();}}render();if(!stateRef)return;const progress=coreProgress(stateRef,stateRef.serverNow+now-packetAt);$('core-meter').hidden=false;$('core-fill').style.width=progress*100+'%';const cold=C.coreMeter.coldColor,hot=C.coreMeter.hotColor;$('core-fill').style.background='rgb('+Math.round(cold[0]+(hot[0]-cold[0])*progress)+','+Math.round(cold[1]+(hot[1]-cold[1])*progress)+','+Math.round(cold[2]+(hot[2]-cold[2])*progress)+')';$('core-meter-label').textContent=(touch()||narrow?.matches?'CORE ':'CORE TEMPERATURE · ')+Math.round(progress*100)+'%';const t=stateRef.team;$('core-next').textContent=t.won?'The planet is waking up':t.worldBreaker?'Overdrive: board the drill and keep every gauge green':!t.coolant?'Next: coolant at '+(depthAt(C.outerRow)/C.view.km).toLocaleString()+' km':!t.drill?'Next: plasma drill':'Next: World Breaker';}
 return {observe,update,setTips,get tips(){return tipsOn;},get active(){return active();},resetView(){prior=null;stateRef=null;markerData=null;$('core-meter').hidden=true;getRenderer()?.setGoalMarker?.(null);}};
}
