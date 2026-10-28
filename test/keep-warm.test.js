import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {C} from '../config.js';
import {startKeepWarm} from '../keep-warm.js';
test('keep-warm pings its own /health on the interval, swallows failures, and stays quiet without a public URL',async t=>{
 t.mock.timers.enable({apis:['setInterval']});
 const calls=[],fetcher=(url,opts)=>{calls.push([url,opts?.signal instanceof AbortSignal]);return Promise.reject(new Error('offline'));};
 const started=startKeepWarm('https://example.onrender.com',{fetcher});
 assert.equal(started.target,'https://example.onrender.com/health');assert.equal(calls.length,0,'no ping at start');
 t.mock.timers.tick(C.keepWarm.intervalMs);assert.equal(calls.length,1);assert.deepEqual(calls[0],['https://example.onrender.com/health',true]);
 t.mock.timers.tick(C.keepWarm.intervalMs*2);assert.equal(calls.length,3);
 await Promise.resolve();await Promise.resolve(); // the rejected pings must settle without surfacing
 assert.equal(startKeepWarm(undefined,{fetcher}),null);assert.equal(startKeepWarm('',{fetcher}),null);assert.equal(startKeepWarm('not a url',{fetcher}),null);
 assert.equal(calls.length,3,'nothing scheduled without a url');
 assert.ok(C.keepWarm.intervalMs<15*60*1000,'pings more often than the 15 minute idle limit');assert.ok(C.keepWarm.timeoutMs<C.keepWarm.intervalMs);
 const server=await readFile(new URL('../server.js',import.meta.url),'utf8');
 assert.match(server,/startKeepWarm\(process\.env\.KEEP_WARM_URL\|\|process\.env\.RENDER_EXTERNAL_URL\)/,'the live server wires the ping from its public URL only');
});
