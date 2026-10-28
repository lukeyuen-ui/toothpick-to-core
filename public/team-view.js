import {C} from '/config.js';
import {depthAt} from '/rules.js';
import {fundEta as eta} from '/formatters.js';
const $=id=>document.getElementById(id);
let endingSeen=null;
export function createTeamView(send,money,onPick){
 const rows=new Map();let picking=null;
 const full=value=>'$'+Math.round(value).toLocaleString();

 function tab(team){$('equipment-panel').hidden=team;$('team-panel').hidden=!team;$('equipment-tab').setAttribute('aria-selected',String(!team));$('team-tab').setAttribute('aria-selected',String(team));}
 $('equipment-tab').onclick=()=>tab(false);$('team-tab').onclick=()=>tab(true);
 document.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>send({type:'chip',amount:b.dataset.chip}));
 $('site-picker').onclick=()=>{picking=picking==='site'?null:'site';onPick(picking);$('site-picker').textContent=picking?'Tap a cell to propose. Tap here to cancel.':'Pick drill site';};
 $('drill-board').onclick=()=>send({type:'board'});$('vote-yes').onclick=()=>send({type:'vote',yes:true});$('vote-no').onclick=()=>send({type:'vote',yes:false});$('vote-cancel').onclick=()=>send({type:'cancelVote'});$('dig-again').onclick=()=>send({type:'reset'});
 function render(state,me,now){const t=state.team;if(!t)return;
  $('personal-income').textContent='My income: '+money(me.income)+' / sec';$('fund-value').textContent=money(t.fund);$('fund-income').textContent=money(t.fundIncome)+' / sec';
  document.querySelectorAll('[data-chip]').forEach(b=>b.disabled=me.wallet<=0||t.won);
  $('goal-box').hidden=!t.goal;if(t.goal){$('goal-title').textContent='Saving for '+t.goal.name;$('goal-detail').textContent=full(t.goal.price)+' · '+t.goal.multiplier.toFixed(C.view.debugDigits)+'x team price · '+money(t.fund)+' saved';$('goal-progress').max=t.goal.price;$('goal-progress').value=Math.min(t.fund,t.goal.price);$('goal-eta').textContent=eta(t.goal.price,t.fund,t.fundIncome);}
  const siteLock=Math.max(0,Math.ceil(((t.locks?.site||0)-now)/C.tapWindowMs));$('site-picker').disabled=!!t.drill||!!t.vote||siteLock>0||t.won;if(!picking)$('site-picker').textContent=t.drill?'Drill site is fixed':t.vote?'Vote in progress':siteLock?'Site vote locked '+siteLock+' sec':'Pick drill site';
  const oil=t.oil||{},site=t.site===null?'not selected':String.fromCharCode('A'.charCodeAt(0)+t.site%C.mapSize)+(Math.floor(t.site/C.mapSize)+1);
  $('drill-detail').textContent=`Site ${site} · Crew ${oil.crew||0} of ${C.maxPlayers} · Speed ${(oil.speed||0).toFixed(C.view.decimalPlaces)}x. Oil ${(oil.production||0).toFixed(C.view.decimalPlaces)} produced / ${(oil.burn||0).toFixed(C.view.decimalPlaces)} burned / ${(oil.sold??Math.max(0,(oil.production||0)-(oil.burn||0))).toFixed(C.view.decimalPlaces)} sold per sec${oil.demand>oil.burn?' (demand '+oil.demand.toFixed(C.view.decimalPlaces)+')':''}.${oil.blocked?' '+oil.blocked+'.':''}${oil.income>0?' Bore ore earns '+money(oil.income*60)+' per minute, half to the fund and half to the crew.':' Bore ore pays by itself: half to the fund, half to the crew aboard.'}${t.worldBreaker?' World Breaker running: '+Math.max(0,Math.ceil((t.worldBreaker.endsAt-now)/C.tapWindowMs))+' sec.':''}`;
  $('drill-board').hidden=!t.drill;$('drill-board').textContent=me.boarded?'Leave drill':me.boarding?'Walking to drill. Tap to cancel.':'Board drill';$('drill-board').disabled=t.won;
  const keys=new Set();for(const entry of t.catalog||[]){keys.add(entry.key);let row=rows.get(entry.key);if(!row){const container=document.createElement('div'),info=document.createElement('div'),name=document.createElement('b'),price=document.createElement('small'),detail=document.createElement('small'),button=document.createElement('button');container.className='team-row';price.className='full-price';info.append(name,price,detail);container.append(info,button);$('team-items').append(container);row={container,name,price,detail,button};rows.set(entry.key,row);button.onclick=()=>send({type:'propose',item:entry.item,index:entry.index});}
   const remaining=Math.max(0,Math.ceil(((t.locks?.[entry.key]||0)-now)/C.tapWindowMs)),goal=t.goal?.key===entry.key,price=goal?t.goal.price:entry.price;
   row.name.textContent=entry.name;row.price.textContent=entry.item==='worldBreaker'?full(price):money(price);row.detail.textContent=entry.built?'Pumping '+C.team.pumpBarrelsPerSecond+' barrel per sec':entry.item==='worldBreaker'?eta(price,t.fund,t.fundIncome)+(entry.requirement?' · '+entry.requirement:''):(entry.item==='plasma'?'Runs on oil from your pumps. ':'')+(entry.requirement|| (goal?'Current saving goal':'Team purchase'));
   row.button.hidden=!!entry.built;row.button.textContent=t.vote?'Vote in progress':remaining?'Locked '+remaining+' sec':goal?'Saving':'Propose';row.button.disabled=!!t.vote||!!entry.requirement||remaining>0||goal||t.won;
  }
  for(const [key,row]of rows)if(!keys.has(key)){row.container.remove();rows.delete(key);}$('pump-note').hidden=(t.catalog||[]).some(e=>e.item==='pump');
  const vote=t.vote;$('vote-banner').hidden=!vote;if(vote){const ballots=Object.values(vote.ballots),yes=ballots.filter(Boolean).length,no=ballots.filter(v=>v===false).length;$('vote-title').textContent=vote.proposerName+' proposes '+vote.name+(vote.kind!=='site'?' ('+full(vote.price)+')':'');$('vote-detail').textContent=`Yes ${yes} · No ${no} · ${Math.max(0,Math.ceil((vote.endsAt-now)/C.tapWindowMs))} sec left · ${vote.multiplier.toFixed(C.view.debugDigits)}x team price${vote.voters.includes(me.id)?'':' · Not eligible for this vote. Dig to join future votes.'}`;$('vote-yes').disabled=$('vote-no').disabled=!vote.voters.includes(me.id);$('vote-cancel').hidden=vote.proposerId!==me.id;}
 }
 function consumePick(){picking=null;onPick(null);$('site-picker').textContent='Pick drill site';}
 function reset(){consumePick();$('ending').hidden=true;tab(false);}
 function ending(state,now){const t=state.team;if(!t?.won){endingSeen=null;$('ending').hidden=true;return;}endingSeen??=now;if(now-Math.max(t.wonAt??now,endingSeen)<C.team.endingDelayMs){$('ending').hidden=true;return;}$('ending').hidden=false;$('end-time').textContent='Time to core: '+Math.floor(t.stats.timeToCore/C.team.etaMinuteSeconds)+' min '+Math.floor(t.stats.timeToCore%C.team.etaMinuteSeconds)+' sec';const list=$('end-awards');if(list.dataset.round===String(state.round))return;list.dataset.round=String(state.round);list.replaceChildren();for(const [label,key,format]of [['Deepest digger','deepestDigger',v=>{const m=depthAt(v+1);return m<C.view.km?Math.round(m)+' m':(m/C.view.km).toFixed(C.view.decimalPlaces)+' km';}],['Top contributor','topContributor',money],['Best find','bestFind',money],['Most time in the drill','mostTimeInDrill',v=>Math.floor(v)+' sec'],['Top hauler','topHauler',money]]){const dt=document.createElement('dt'),dd=document.createElement('dd'),award=t.stats[key];dt.textContent=label;dd.textContent=award?award.nickname+' · '+format(award.value):'No qualifying player';list.append(dt,dd);}}
 return {render,consumePick,reset,ending,tab};
}
