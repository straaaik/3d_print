import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkshop } from '../src/features/workshop/model';
import { cacheKey, parseRemoteWorkshop, readCache, resolveWorkshopConflict, writeCache } from '../src/features/workshop/persistence';

test('workshop cache isolates users and rejects invalid revision tokens', () => {
  const entries=new Map<string,string>();
  const storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{entries.set(key,value);}};
  const layout=createWorkshop();
  writeCache(storage,'alice',{layout,revision:3,dirty:true});
  assert.equal(readCache(storage,'bob'),null);
  assert.deepEqual(readCache(storage,'alice'),{layout,revision:3,dirty:true});
  for(const revision of [-1,0,1.5,Number.MAX_SAFE_INTEGER+1,'3']) {
    entries.set(cacheKey('alice'),JSON.stringify({layout,revision,dirty:true}));
    assert.equal(readCache(storage,'alice'),null);
  }
  entries.set(cacheKey('alice'),JSON.stringify({layout,revision:null,dirty:true}));
  assert.equal(readCache(storage,'alice')?.revision,null);
});
test('choosing local preserves edits and adopts fetched CAS revision without marking saved', () => {
  const local={layout:createWorkshop(),revision:2,dirty:true};
  const remote={layout:createWorkshop(),revision:4};
  const next=resolveWorkshopConflict(local,remote,'local');
  assert.equal(next.layout,local.layout);
  assert.equal(next.revision,4);
  assert.equal(next.dirty,true);
  assert.equal(local.revision,2);
});
test('choosing cloud replaces local only through explicit resolution', () => {
  const local={layout:createWorkshop(),revision:2,dirty:true};
  const remote=parseRemoteWorkshop({layout:createWorkshop(),revision:5});
  assert.equal(local.revision,2);
  const next=resolveWorkshopConflict(local,remote,'cloud');
  assert.equal(next.layout,remote.layout);
  assert.equal(next.revision,5);
  assert.equal(next.dirty,false);
});
test('missing cloud snapshot supports initial CAS and malformed responses are rejected', () => {
  const local={layout:createWorkshop(),revision:2,dirty:true};
  const remote=parseRemoteWorkshop(null);
  assert.equal(resolveWorkshopConflict(local,remote,'local').revision,null);
  const cloud=resolveWorkshopConflict(local,remote,'cloud');
  assert.equal(cloud.revision,null);
  assert.equal(cloud.dirty,true);
  for(const value of [undefined,{}, {layout:local.layout,revision:0}, {layout:{},revision:1}]) assert.throws(()=>parseRemoteWorkshop(value));
});
test('storage failures are observable and corrupt caches cannot escape parsing', () => {
  const layout=createWorkshop();
  assert.equal(writeCache({setItem:()=>{throw new Error('quota');}},'alice',{layout,revision:null,dirty:true}),false);
  assert.equal(readCache({getItem:()=>{throw new Error('disabled');}},'alice'),null);
  assert.equal(readCache({getItem:()=>'{broken'},'alice'),null);
});

test('legacy disconnected rooms migrate on load and remain dirty until saved', () => {
  const layout=createWorkshop();
  layout.rooms.push({...layout.rooms[0],id:'legacy-room-two',name:'Second'});
  const remote=parseRemoteWorkshop({layout,revision:3});
  assert.equal(remote.migrated,true);
  assert.deepEqual(remote.layout?.rooms[1].attachment,{roomId:layout.rooms[0].id,side:'east'});
  const cached=readCache({getItem:()=>JSON.stringify({layout,revision:3,dirty:false})},'alice');
  assert.equal(cached?.dirty,true);
  assert.deepEqual(cached?.layout,remote.layout);
  assert.equal(resolveWorkshopConflict({layout,revision:1,dirty:true},remote,'cloud').dirty,true);
});

test('spatial metadata survives cached and cloud round trips', () => {
  const layout=createWorkshop();
  layout.rooms[0].labels=[{id:'label',text:'Printers',color:'#abcdef',surface:'north',u:0.5,v:0.7,size:0.4,rotation:15}];
  layout.rooms.push({...layout.rooms[0],id:'adjacent',name:'Second',labels:[],attachment:{roomId:layout.rooms[0].id,side:'east'}});
  const remote=parseRemoteWorkshop({layout,revision:3});
  assert.deepEqual(remote.layout,layout);
  const cached=readCache({getItem:()=>JSON.stringify({layout,revision:3,dirty:true})},'alice');
  assert.deepEqual(cached,{layout,revision:3,dirty:true});
});

import { readRemoteWorkshop } from '../src/features/workshop/persistence';

test('missing spatial read RPC loads existing legacy cloud layout without a legacy save', async()=>{
  const calls:string[]=[];
  const cloud={revision:7,layout:createWorkshop()};
  const result=await readRemoteWorkshop(async name=>{
    calls.push(name);
    return name==='get_workshop_spatial'?{data:null,error:{code:'PGRST202'}}:{data:cloud,error:null};
  });
  assert.deepEqual(result,{data:cloud,error:null,legacy:true});
  assert.deepEqual(parseRemoteWorkshop(result.data).layout,cloud.layout);
  assert.deepEqual(calls,['get_workshop_spatial','get_workshop']);
});

test('spatial read does not hide auth errors or fall back on successful empty cloud responses',async()=>{
  for(const response of [{data:null,error:{code:'42501'}},{data:null,error:null}]){
    const calls:string[]=[];
    const result=await readRemoteWorkshop(async name=>{calls.push(name);return response;});
    assert.deepEqual(result,{...response,legacy:false});
    assert.deepEqual(calls,['get_workshop_spatial']);
  }
});
