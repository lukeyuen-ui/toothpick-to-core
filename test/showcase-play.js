import {C} from '../config.js';
import {createRoom,join,step} from '../rules.js';
import {fillBots,botCommands} from '../bot-rules.js';
import {setupShowcase,equipShowcase} from '../showcase-rules.js';
import {boreCells} from '../team-rules.js';

// Plays one showcase with a bot crew and one person, and records when each beat of the arc happened (seconds from the start).
// The person follows a policy:
//  follow  reads the guide like a first-time visitor: three seconds to start, three toothpick taps, a moment to take in the mech, then about three
//          mech taps a second into their own shaft, two seconds or so to vote, belay up and board, then plays the seat with a person's reaction
//          time and votes YES on the finale
//  eager   reacts faster, holds Space (eight taps a second) and proposes the World Breaker from the seat as soon as the fund covers it
//  stay    follows, but never belays up after the site vote (the crew has to winch them out)
//  passive never touches anything
const MECH=C.tools.length-1,READ={follow:{start:3000,mech:2500,vote:2000,belay:2000,board:2500},eager:{start:1500,mech:1000,vote:800,belay:600,board:1000}};
export function playShowcase({seed=7,level='normal',policy='follow',limit=C.showcase.limitSeconds,onTick=null}={}){
 const r=createRoom('SHOW',seed,false,0,true);r.botLevel=level;setupShowcase(r);const p=join(r,'h','Ana',0);p.publicId='a';equipShowcase(r,p,0);fillBots(r,0);
 const t={},mark=(key,now)=>{t[key]??=Math.round(now/100)/10;},x0=Math.floor(p.x),y0=Math.floor(p.y),side={x:x0-1,y:y0};
 const read=READ[policy]||READ.follow,B={nextTap:read.start,vote:null,belayAt:null,boardAt:null,seen:[],level:0.5,nextVent:0,proposed:false};
 const tapEvery=policy==='eager'?125:330,act=policy!=='passive';let now=0;
 for(;now<limit*C.tapWindowMs&&!r.won;now+=C.tickMs){if(now%C.bots.fillEveryMs<C.tickMs)fillBots(r,now);const cmds=botCommands(r,now),add=(type,extra={})=>cmds.push({player:p,message:{type,...extra},respond:()=>{}});
  if(act){
   // Votes: a moment to read the banner, then YES.
   if(r.vote&&r.vote.voters.includes(p.publicId)&&r.vote.ballots[p.publicId]===undefined){B.vote??=now+read.vote;if(now>=B.vote){add('vote',{yes:true});B.vote=null;}}else B.vote=null;
   const inBore=r.site!=null&&p.shaft!=null&&boreCells(r).includes(p.shaft);
   if(p.boarded)playSeat(r,p,B,now,add,policy);
   else if(r.site!=null&&inBore&&!p.belay){if(policy!=='stay'){B.belayAt??=now+read.belay;if(now>=B.belayAt)add('belay');}}
   else if(r.drill&&p.shaft==null&&!p.belay&&!p.boarding){B.boardAt??=now+read.board;if(now>=B.boardAt){add('board');B.boardAt=now+3000;}}
   else if(!r.drill&&r.site==null&&now>=B.nextTap&&!p.belay){
    // Toothpick and the first mech hole: the dirt beside you. In your shaft: its floor.
    const target=p.shaft!=null?{x:p.shaft%C.mapSize,y:Math.floor(p.shaft/C.mapSize)}:side;
    if(p.tool===MECH&&t.mech!=null&&now-t.mech*1000<read.mech){}else{add('tap',target);B.nextTap=now+(p.tool===MECH?tapEvery:400);}}
  }
  step(r,cmds,now);onTick?.(r,p,now);
  if(p.tool===MECH)mark('mech',now);if(p.shaft!=null&&p.tool===MECH)mark('dropped',now);if(r.vote?.kind==='site')mark('siteVote',now);if(r.site!=null)mark('site',now);
  if(r.drill)mark('rig',now);if(p.boarded)mark('boarded',now);if(r.arc?.readyAt!=null)mark('ready',now);if(r.vote?.item==='worldBreaker'||r.goal?.item==='worldBreaker')mark('breakerVote',now);if(r.worldBreaker)mark('breaker',now);
  if(t.siteVote!=null&&t.siteRow==null){const own=p.tour?.shaft;t.siteRow=own!=null?r.cells[own].row:0;}}
 if(r.won)mark('won',now);return {r,p,t,now};}

// A person at the console: they read the gauge about 300 ms late and play their own seat (HEAT, PRESSURE, ALIGN or POWER) the way the help text says.
function playSeat(r,p,B,now,add,policy){const g=r.console?.[p.publicId];B.seen.push(g?{...g}:null);if(B.seen.length>3)B.seen.shift();const s=B.seen[0];
 if(policy==='eager'&&!B.proposed&&!r.vote&&!r.goal&&!r.worldBreaker&&r.arc?.readyAt!=null){add('propose',{item:'worldBreaker'});B.proposed=true;}
 if(!g||!s||s.kind!==g.kind)return;
 if(g.kind==='HEAT'){if(s.v>0.58&&now>=B.nextVent){add('tune');B.nextVent=now+350;}}
 else if(g.kind==='PRESSURE'){if(!g.hold&&s.v>0.54)add('tune',{hold:true});else if(g.hold&&s.v<0.46)add('tune',{hold:false});}
 else if(g.kind==='ALIGN'){if(!g.hold)add('tune',{hold:true});}
 else{B.level+=(s.target-B.level)*0.5;add('tune',{level:Math.min(1,Math.max(0,B.level))});}}
