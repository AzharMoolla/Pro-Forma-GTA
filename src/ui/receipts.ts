// Receipt files, stored in this browser's IndexedDB until accounts and cloud storage arrive (Milestone C2).
// Metadata (name, size, SHA-256) lives in the tracker state; the bytes live here, keyed by receipt id.

const DB = 'gta-proforma-receipts'
const STORE = 'files'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB unavailable'))
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Receipt storage failed'))
  })
}

export const putReceipt = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id))
export const getReceipt = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>)
export const deleteReceipt = (id: string) => tx('readwrite', (s) => s.delete(id))

export async function sha256File(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
