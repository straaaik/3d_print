// Хранилище IndexedDB для ведения большого объема STL файлов в браузере (вход в обход 5МБ лимита localStorage)

const DB_NAME = '3D_Labs_STL_Store';
const DB_VERSION = 1;
const STORE_NAME = 'stl_files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB недоступен в этом окружении'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/** Сохранить Base64 файл STL в IndexedDB */
export async function saveStlFile(id: string, fileData: string): Promise<void> {
  if (!id || !fileData) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(fileData, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Ошибка сохранения файла STL в IndexedDB:', err);
  }
}

/** Получить Base64 файл STL из IndexedDB */
export async function getStlFile(id: string): Promise<string | null> {
  if (!id) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Ошибка получения файла STL из IndexedDB:', err);
    return null;
  }
}

/** Удалить файл STL из IndexedDB */
export async function deleteStlFile(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Ошибка удаления файла STL из IndexedDB:', err);
  }
}
