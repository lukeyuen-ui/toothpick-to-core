// Render's free plan sleeps the server after 15 idle minutes, and the next visitor waits while it boots. While the instance
// is awake, this fetches its own public /health on a timer, so the proxy sees traffic and keeps it up. It cannot wake a
// sleeping instance (the timer sleeps with it); .github/workflows/keep-warm.yml is the poke from outside. A failed ping is
// ignored: it costs nothing, and the next one comes ten minutes later. Without a public URL nothing is scheduled, so local
// runs and tests never ping anything.
import {C} from './config.js';
export function startKeepWarm(base,{intervalMs=C.keepWarm.intervalMs,timeoutMs=C.keepWarm.timeoutMs,fetcher=globalThis.fetch,schedule=setInterval}={}){
 if(!base)return null;let target;try{target=new URL('/health',base).href;}catch{return null;}
 const ping=()=>{try{const out=fetcher(target,{signal:AbortSignal.timeout(timeoutMs)});if(out&&typeof out.catch==='function')out.catch(()=>{});}catch{}};
 const timer=schedule(ping,intervalMs);timer?.unref?.();return {target,timer};
}
