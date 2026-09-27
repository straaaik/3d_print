'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { createWorkshop, type Workshop } from './model';
import { parseRemoteWorkshop, readCache, readRemoteWorkshop, resolveWorkshopConflict, validRevision, writeCache, type RemoteWorkshop, type WorkshopCache } from './persistence';

export function useWorkshop(userId: string) {
  const [layout,setLayout] = useState<Workshop | null>(null);
  const [status,setStatus] = useState('Загрузка планировки…');
  const [busy,setBusy] = useState(false);
  const [conflict,setConflict] = useState(false);
  const cache = useRef<WorkshopCache | null>(null);
  const candidate = useRef<RemoteWorkshop | null>(null);
  const saving = useRef(false);
  const generation = useRef(0);
  const account = useRef(userId);
  useLayoutEffect(()=>{account.current=userId;},[userId]);
  function persist(value: WorkshopCache) {
    try { return writeCache(localStorage,userId,value); } catch { return false; }
  }
  function localStatus(prefix: string) {
    return cache.current && persist(cache.current) ? `${prefix} · локальная копия сохранена` : `${prefix} · кэш недоступен, изменения только в памяти`;
  }
  useEffect(()=>{
    const gen=++generation.current;
    let local: WorkshopCache | null = null;
    try { local=readCache(localStorage,userId); } catch { /* Storage can be disabled. */ }
    candidate.current=null; saving.current=false;
    cache.current=local ?? {layout:createWorkshop(),revision:null,dirty:true};
    const baseline=cache.current;
    queueMicrotask(()=>{
      if(gen!==generation.current || account.current!==userId) return;
      setConflict(false); setBusy(false); setLayout(baseline.layout);
      setStatus(local?.dirty?'Есть локальные изменения':'Локальная планировка');
    });
    if (!/^[\da-f-]{36}$/i.test(userId)) return ()=>{generation.current=gen+1;};
    void (async()=>{
      try {
        const {data,error,legacy}=await readRemoteWorkshop(name=>createClient().rpc(name));
        if (gen!==generation.current || account.current!==userId) return;
        if (error) { setStatus(localStatus(error.code==='PGRST202'?'Для облачной синхронизации требуется обновление БД':'Облако недоступно')); return; }
        const remote=parseRemoteWorkshop(data);
        const current=cache.current!;
        if (current!==baseline || local?.dirty) {
          if (current.revision!==remote.revision) {
            candidate.current=remote; setConflict(true); setStatus(localStatus('Конфликт версий · выберите копию'));
          }
          return;
        }
        if (remote.layout) {
          cache.current={layout:remote.layout,revision:remote.revision,dirty:remote.migrated===true};
          setLayout(remote.layout);
          setStatus(legacy?localStatus('Для облачной синхронизации требуется обновление БД'):remote.migrated?localStatus('Комнаты соединены · ожидает синхронизации'):(persist(cache.current)?'Сохранено в облаке':'Сохранено в облаке · локальный кэш недоступен'));
        } else if (current.revision!==null) {
          candidate.current=remote; setConflict(true); setStatus(localStatus('Облачная копия отсутствует · выберите копию'));
        }
      } catch { if(gen===generation.current && account.current===userId) setStatus(localStatus('Облако недоступно')); }
    })();
    return ()=>{generation.current=gen+1;};
    // Each request belongs to this account generation; helpers capture that account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[userId]);
  function change(next: Workshop) {
    if (!cache.current) return;
    cache.current={...cache.current,layout:next,dirty:true}; setLayout(next);
    setStatus(localStatus(candidate.current?'Конфликт версий · выберите копию':'Ожидает синхронизации'));
  }
  async function save() {
    if (!cache.current || saving.current || candidate.current) return;
    const snapshot=cache.current, gen=generation.current;
    if (!/^[\da-f-]{36}$/i.test(userId)) { setStatus(localStatus('Демонстрационный аккаунт')); return; }
    saving.current=true; setBusy(true);
    try {
      // The versioned RPC is required even for an empty layout. Never fall back
      // to legacy saves, which can acknowledge while silently stripping labels.
      const {data,error}=await createClient().rpc('save_workshop_spatial',{payload:snapshot.layout,expected_revision:snapshot.revision});
      if(gen!==generation.current || account.current!==userId) return;
      if(error) {
        if (error.code==='40001' || error.message.toUpperCase().includes('WORKSHOP_REVISION_CONFLICT')) {
          const remoteResult=await readRemoteWorkshop(name=>createClient().rpc(name));
          if(gen!==generation.current || account.current!==userId) return;
          if(remoteResult.error) { setStatus(localStatus('Конфликт версий · не удалось загрузить облачную копию')); return; }
          candidate.current=parseRemoteWorkshop(remoteResult.data); setConflict(true);
          setStatus(localStatus('Конфликт версий · выберите копию'));
        } else setStatus(localStatus(error.code==='PGRST202'?'Для облачной синхронизации требуется обновление БД':'Не удалось сохранить в облако'));
        return;
      }
      if (!validRevision(data)) throw new Error('INVALID_WORKSHOP_REVISION');
      const unchanged=cache.current===snapshot;
      cache.current={...cache.current!,revision:data,dirty:!unchanged};
      const cached=persist(cache.current);
      setStatus(unchanged?(cached?'Сохранено в облаке':'Сохранено в облаке · локальный кэш недоступен'):(cached?'Новые изменения сохранены локально':'Новые изменения только в памяти · кэш недоступен'));
    } catch { if(gen===generation.current && account.current===userId) setStatus(localStatus('Не удалось сохранить в облако')); }
    finally { if(gen===generation.current && account.current===userId) { saving.current=false; setBusy(false); } }
  }
  async function resolveConflict(choice: 'local' | 'cloud') {
    if (!cache.current || !candidate.current || saving.current) return;
    cache.current=resolveWorkshopConflict(cache.current,candidate.current,choice);
    candidate.current=null; setConflict(false); setLayout(cache.current.layout);
    const cached=persist(cache.current);
    setStatus(choice==='local'
      ? (cached?'Выбрана локальная копия · нажмите «Сохранить»':'Выбрана локальная копия · кэш недоступен, нажмите «Сохранить»')
      : (cached?'Выбрана облачная копия':'Выбрана облачная копия · локальный кэш недоступен'));
  }
  return {layout,change,save,status,busy,conflict,resolveConflict};
}
