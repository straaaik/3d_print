import { createWorkshop, parseWorkshop, type Workshop } from './model';

export interface WorkshopCache { layout: Workshop; revision: number | null; dirty: boolean }
export interface RemoteWorkshop { layout: Workshop | null; revision: number | null; migrated?: boolean }
interface WorkshopReadResult { data: unknown; error: {code?:string;message?:string} | null }
export async function readRemoteWorkshop(read: (name:'get_workshop_spatial'|'get_workshop')=>PromiseLike<WorkshopReadResult>):Promise<WorkshopReadResult & {legacy:boolean}> {
  const current=await read('get_workshop_spatial');
  // Older servers can still supply the saved layout. Writes always require the
  // spatial RPC so they can never silently drop attachments or room labels.
  if(current.error?.code==='PGRST202') return {...await read('get_workshop'),legacy:true};
  return {...current,legacy:false};
}
export const validRevision = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
export function parseRemoteWorkshop(value: unknown): RemoteWorkshop {
  if (value === null) return { layout: null, revision: null };
  if (!value || typeof value !== 'object' || !('revision' in value) || !validRevision(value.revision) || !('layout' in value)) throw new Error('INVALID_WORKSHOP_RESPONSE');
  const layout = parseWorkshop(JSON.stringify(value.layout));
  if (!layout) throw new Error('INVALID_WORKSHOP_RESPONSE');
  return { layout, revision: value.revision, ...(JSON.stringify(layout)!==JSON.stringify(value.layout)?{migrated:true}:{}) };
}
export function resolveWorkshopConflict(local: WorkshopCache, remote: RemoteWorkshop, choice: 'local' | 'cloud'): WorkshopCache {
  return choice === 'local'
    ? { ...local, revision: remote.revision, dirty: true }
    : { layout: remote.layout ?? createWorkshop(), revision: remote.revision, dirty: remote.layout === null || remote.migrated === true };
}
export function cacheKey(userId: string) { return `3d_workshop_v1::user:${userId}`; }
export function readCache(storage: Pick<Storage,'getItem'>, userId: string): WorkshopCache | null {
  try {
    const parsed = JSON.parse(storage.getItem(cacheKey(userId)) ?? 'null');
    if (!parsed || !(parsed.revision===null || validRevision(parsed.revision))) return null;
    const layout = parseWorkshop(JSON.stringify(parsed.layout));
    return layout ? {layout, revision:parsed.revision, dirty:parsed.dirty===true || JSON.stringify(layout)!==JSON.stringify(parsed.layout)} : null;
  } catch { return null; }
}
export function writeCache(storage: Pick<Storage,'setItem'>, userId: string, value: WorkshopCache): boolean {
  try { storage.setItem(cacheKey(userId),JSON.stringify(value)); return true; } catch { return false; }
}
