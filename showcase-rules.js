import {C} from './config.js';
import {hp,cellPayout} from './rules.js';
import {teamAction,boreCells} from './team-rules.js';
import {enterShaft,startBelay,rimArrival} from './shaft-rules.js';
import {privateToast,isDepot,conveyorQuote,buildConveyor} from './hauling-rules.js';
import {incomeMultiplier} from './economy-rules.js';

// Showcase: the whole title in about three minutes, carried by a bot crew. Everyone starts at the hub with the toothpick, a crewmate throws them the
// mining mech, they dig their own 3 by 3 shaft toward the magma, the crew votes that shaft as the drill site and the rig drops into it, everyone boards and
// plays a console seat while the bore ore fills the fund, the crew votes the World Breaker and the overdrive opens the core. room.arc.beat walks
// dig, site, rig, board, console, breaker. Every beat also moves on by itself, so a visitor who never touches anything still reaches the core.
const N=C.mapSize,MECH=C.tools.length-1;
const people=room=>room.players.filter(p=>!p.bot&&!p.departed&&p.connected);
const crew=room=>room.players.filter(p=>p.bot&&!p.departed);
const say=(room,who,text)=>room.announcements.push({type:'crew',nickname:who?.nickname||'Crew',text});
const go=(arc,beat,now)=>{arc.beat=beat;arc.at=now;};
export const breakerPrice=room=>C.teamItems.worldBreaker.price*Math.sqrt(room.players.length);

// A fresh claim: coolant is already paid for and two oil pumps already run, so the visit is about digging, the drill, the console and the finale.
// Ore pays base rates (no quick multiplier), so the wallet stays small next to the World Breaker the drill has to earn.
// Both wells are bottomless (oilLeft null): the three-minute showcase must never starve the drill.
export function setupShowcase(room){const S=C.showcase;room.showcase=true;if(!C.bots.levels[room.botLevel])room.botLevel=S.botLevel;
 Object.assign(room,{quick:false,coolant:true,site:null,drill:null,drillScale:1});
 for(const [x,y] of S.pumps){const i=y*N+x;Object.assign(room.cells[i],{row:S.oilRow,hp:hp(S.oilRow),damage:{},oilSite:true,oilRow:S.oilRow,pumpBuilt:true,oilLeft:null});room.dirty.add(i);}
 room.arc={beat:'dig',at:room.now,round:room.round};room.deepest=Math.max(...room.cells.map(c=>c.row));}

// People arrive with the toothpick (the bots, and anyone joining after the dig, carry the mech). Lights reach the core so no shaft goes dark.
// A visitor starts spawnOut cells further out than their seat, so the 3 by 3 the mech carves around them never runs into the hub.
export function equipShowcase(room,p,now=room.now){if(!room.showcase||p.showcaseReady)return;const S=C.showcase;p.showcaseReady=true;p.mobility=S.mobility;p.lighting=C.lighting.length;p.taps=0;
 p.tool=p.bot||(room.arc&&room.arc.beat!=='dig')?MECH:0;p.tour={joinedAt:now,...(p.tool?{mechAt:now}:{})};
 if(!p.tool&&p.shaft==null&&!p.boarded){const dx=p.x-N/2,dy=p.y-N/2,d=Math.hypot(dx,dy)||1;p.x+=dx/d*S.spawnOut;p.y+=dy/d*S.spawnOut;}}

export function runShowcase(room,now){if(!room.showcase||room.won)return;
 if(room.arc?.round!==room.round){restart(room,now);return;}
 const arc=room.arc,humans=people(room),bots=crew(room),lead=humans[0],voice=bots[0]||lead;
 for(const q of [...bots,...humans])q.lastActive=now;// everyone counts as active: every visitor may vote, and the bot crew's ballots carry each vote
 for(const b of bots)if(b.shaft!=null&&b.target&&room.cells[b.shaft].row>=crewCap(room,b))b.target=null;// the mech digs on by itself: stop a crew pit at its depth
 for(const p of humans){p.tour??={joinedAt:now};if(p.tool===0)toothpick(room,p,now,voice);else if(arc.beat==='dig')dropIn(room,p);if(arc.beat==='dig'&&p.shaft!=null&&!p.belay)p.tour.shaft=p.shaft;if(p.shaft!=null)layBelt(room,p,voice);}
 // Once the World Breaker runs, the bore stops paying: the overdrive is about the core, not about the fund.
 if(room.worldBreaker&&arc.beat!=='breaker'){go(arc,'breaker',now);room.drillScale=0;}
 else if(room.drill&&['dig','site','rig'].includes(arc.beat))go(arc,'board',now);
 else if(room.site!=null&&['dig','site'].includes(arc.beat)){go(arc,'rig',now);const owner=humans.find(p=>p.tour.shaft===room.site);say(room,voice,owner?owner.nickname+"'s shaft it is. Belay up, the rig is coming down!":'Our crew shaft it is. The rig is coming down!');}
 if(arc.beat==='dig')dig(room,arc,lead,voice,now);
 else if(arc.beat==='site'){if(!room.vote&&(room.locks.site||0)<=now)propose(room,arc,voice,arc.site,now);}
 else if(arc.beat==='rig')rig(room,arc,voice,now);
 else if(arc.beat==='board'){if(lead?.boarded||now-arc.at>=C.showcase.boardCapMs)go(arc,'console',now);}
 else if(arc.beat==='console')consoleBeat(room,arc,voice,now);
 if(room.drill)walkAboard(room,arc,humans,bots,voice,now);
 // The readout's income line shows what the bore earns at the current speed: it climbs with depth and with green gauges instead of jumping as rows break.
 if(room.drill&&room.oil){const bore=boreCells(room);room.oil.rate=bore.length*cellPayout(room.cells[room.site])*incomeMultiplier(room)*C.team.drillYield*(room.drillScale??1)*(room.oil.speed||0)/C.team.drillSecondsPerBlock;}}

// Any shaft a person digs gets a conveyor from its mouth to the hub, laid by the crew at no charge the moment they are down it, and said
// once: with a line at the shaft the hoist lifts everything they dig onto the belt (rules.js hoists a showcase digger's ore at their own
// shaft), so their ore rides home on its own and the hold stays empty. One belt per shaft; the drill site keeps its rig clear.
function layBelt(room,p,voice){const i=p.shaft;if(i==null||i===room.site||room.conveyorLines.some(l=>l.source===i))return;const quote=conveyorQuote(room,i,p);buildConveyor(room,{index:i,...quote,ownerId:p.publicId});p.beltsBuilt=(p.beltsBuilt||0)+1;
 say(room,voice,p.tour.belted?'Belt laid to your new shaft too, '+p.nickname+'.':"Belt's on your shaft, "+p.nickname+'. The hoist lifts your ore onto it and it rides home to the hub on its own.');p.tour.belted=true;}

// Beat 1: three taps with the toothpick (or a short wait) and the nearest crewmate throws over the mech.
function toothpick(room,p,now,voice){const S=C.showcase,t=p.tour;if((p.taps||0)>=S.toothpickTaps)t.tappedAt??=now;
 if(!(t.tappedAt!=null&&now-t.tappedAt>=S.throwDelayMs)&&now-t.joinedAt<S.toothpickMs)return;
 p.tool=MECH;p.autoElapsed=0;p.target=null;t.mechAt=now;say(room,voice,'Nobody digs to the core with a toothpick, '+p.nickname+'. Catch!');
 privateToast(room,p,'Mining mech equipped. Its claws tear out a 3x3 with every hit.');}

// Beat 2: a mech hole right beside you already cuts the cell under you (rules.js drops you in). A first hole further off but within reach swallows
// you too, so either way you are digging your own 3 by 3 shaft at once, and the mech keeps digging its floor as you go down.
function dropIn(room,p){const S=C.showcase,t=p.target;if(p.shaft!=null||p.belay||p.boarded||p.boarding||!t)return;const i=t.y*N+t.x;
 if(!room.broken.has(i)||!room.cells[i].row||Math.max(Math.abs(Math.floor(p.x)-t.x),Math.abs(Math.floor(p.y)-t.y))>S.dropReach)return;
 enterShaft(room,p,i);if(p.shaft===i){p.depth=room.cells[i].row;p.target={x:t.x,y:t.y};}if(p.shaft===i&&!p.tour.dropped){p.tour.dropped=true;privateToast(room,p,'In you go. Keep tapping the floor and dig down to the magma.');}}

// The dig ends when the first person's shaft reaches the magma, when they stop digging after digMs, or at digCapMs. The bots then propose that shaft,
// or their own deepest crew shaft when the person never dug.
function dig(room,arc,lead,voice,now){const S=C.showcase,mechAt=lead?.tour?.mechAt;if(mechAt==null)return;
 const own=lead.shaft??lead.tour.shaft,floor=own!=null?room.cells[own].row:0,since=now-mechAt,digging=own!=null&&now-(lead.lastWorked??-Infinity)<S.diggingMs;
 if(floor>=S.siteRow)arc.deepAt??=now;if(since>=S.crewDeepMs&&!digging)arc.crewDeep=true;// a visitor who is not digging: a bot digs the drill a shaft
 if(room.vote||!(arc.deepAt!=null?now-arc.deepAt>=S.siteDelayMs:since>=S.digCapMs||(since>=S.digMs&&!digging)))return;
 let site=own!=null&&floor>=S.minSiteRow?own:deepest(room);if(room.cells[site].row<S.minSiteRow)site=fallback(room);
 propose(room,arc,voice,site,now);}
// How deep a bot's crew pit goes: shallow, unless it is the last bot and the visitor is not digging, when it goes down to the magma for the drill.
export function crewCap(room,p){const S=C.showcase;return room.arc?.crewDeep&&crew(room).at(-1)===p?S.siteRow:S.crewRow;}
function deepest(room){let best=0;for(let i=0;i<room.cells.length;i++){const c=room.cells[i];if(!isDepot(i%N,Math.floor(i/N))&&!c.oilSite&&c.row>room.cells[best].row)best=i;}return best;}
// Only when nothing was dug at all (no bots, nobody digging): open a crew shaft so the drill still has somewhere to go.
function fallback(room){const S=C.showcase,[x,y]=S.fallback;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const i=(y+dy)*N+x+dx,c=room.cells[i];if(c.row<S.fallbackRow){Object.assign(c,{row:S.fallbackRow,hp:hp(S.fallbackRow),damage:{}});room.dirty.add(i);}}room.deepest=Math.max(room.deepest,S.fallbackRow);return y*N+x;}
// Beat 3: a crewmate radios the proposal from wherever they are; the vote banner does the rest.
function propose(room,arc,voice,site,now){if(!voice||site==null)return;arc.site=site;teamAction(room,voice,{type:'proposeSite',x:site%N,y:Math.floor(site/N)},now);if(room.vote?.kind==='site'||room.site!=null)go(arc,'site',now);}

// The rig waits until nobody hangs in its 3 by 3. People get haulMs to belay up themselves; then the crew winches them (and any bot) to the rim.
function rig(room,arc,voice,now){const S=C.showcase,bore=boreCells(room),inside=room.players.filter(q=>!q.departed&&!q.boarded&&q.shaft!=null&&bore.includes(q.shaft));
 for(const q of inside){if(!q.connected){rimArrival(room,q);q.belay=null;continue;}if(!q.belay&&(q.bot||now-arc.at>=S.haulMs)){startBelay(room,q,now);if(!q.bot)privateToast(room,q,'Your crew winches you up. The rig is coming down.');}}
 if(inside.some(q=>q.shaft!=null))return;
 // The drill comes paid for. Its bore ore is scaled so a row at this floor pays rowShare of the World Breaker; deeper rows pay more, as ore does.
 room.drill={index:room.site};room.coolant=true;const site=room.cells[room.site];
 room.drillScale=breakerPrice(room)*S.rowShare/(bore.length*Math.max(cellPayout(site),C.damageEpsilon)*incomeMultiplier(room)*C.team.drillYield);
 go(arc,'board',now);arc.rigAt=now;say(room,voice,'The plasma drill is in. Climb aboard and take a seat!');}

// Beat 4: the bots climb in by themselves; the console beat starts once the first person is aboard (or after boardCapMs). From the moment the rig
// is in until the core, anyone who has sent nothing for idleBoardMs (since the rig, or since they joined) is walked over and lifted in.
function walkAboard(room,arc,humans,bots,voice,now){const S=C.showcase;
 for(const p of humans){if(p.boarded||p.boarding||p.belay||now-Math.max(arc.rigAt??now,p.tour.joinedAt??now,p.inputAt??-Infinity)<S.idleBoardMs)continue;
  if(p.shaft!=null){startBelay(room,p,now);continue;}
  teamAction(room,p,{type:'board'},now);if(!p.tour.walked){p.tour.walked=true;say(room,bots.at(-1)||voice,'Climb in, '+p.nickname+'. We saved you a seat.');}}}

// Beats 5 and 6: the console runs while the bore ore fills the fund. Once it covers the World Breaker the crew says so, and proposes it a little later
// unless someone already has.
function consoleBeat(room,arc,voice,now){const S=C.showcase;
 if(room.fund>=breakerPrice(room)&&arc.readyAt==null){arc.readyAt=now;say(room,voice,'The fund covers the World Breaker! Propose it from your seat, or vote YES when I do.');}
 if(arc.readyAt==null||room.vote||room.goal?.item==='worldBreaker'||now-arc.readyAt<S.proposeDelayMs||now-arc.at<S.consoleMinMs||(room.locks.worldBreaker||0)>now)return;
 teamAction(room,voice,{type:'propose',item:'worldBreaker'},now);}

// Dig again: the reset planet becomes a fresh showcase and everyone goes back to the toothpick.
function restart(room,now){setupShowcase(room);room.arc.at=now;for(const p of room.players){p.showcaseReady=false;p.tour=null;equipShowcase(room,p,now);}}
