import { describe, expect, it } from 'vitest'
import { toSnapshot, toTracker } from '../../src/cloud/cloud'
import { canonical, sha256 } from '../../src/scenario/snapshot'

describe('cloud mapping', () => {
  it('hash agrees with Postgres digest(convert_to(canonical, UTF8), sha256), incl. non-ASCII', async () => {
    // value returned by the live database on 2026-10-21 for this exact input
    const text = canonical({ rate: 0.065, name: 'Café × test' })
    expect(text).toBe('{"name":"Café × test","rate":0.065}')
    expect(await sha256(text)).toBe('f9496a63163a78d67ad3a42e2dd38c70ae8c7747069f9808d453db18354af098')
  })

  it('scenario rows become frozen, locked snapshots', () => {
    const s = toSnapshot({ client_id: '2-abcd1234', parent_client_id: '1-ffff0000', label: 'Base', note: 'why', input: { id: 'x' } as never, input_hash: 'a'.repeat(64), engine_version: '0.2.0', convention_version: '0.2', created_at: '2026-10-21T00:00:00Z' })
    expect(s).toMatchObject({ id: '2-abcd1234', parentId: '1-ffff0000', locked: true, inputHash: 'a'.repeat(64) })
    expect(Object.isFrozen(s)).toBe(true)
  })

  it('task and receipt rows rebuild the tracker, numeric actuals parsed', () => {
    const t = toTracker(
      [{ task_key: '|land-price', status: 'done', actual: '52000.00', notes: 'paid', updated_at: 'now' }],
      [
        { id: 'r1', task_key: '|land-price', storage_path: 'u/p/r1/a.pdf', file_name: 'a.pdf', mime_type: 'application/pdf', size_bytes: 10, sha256: 'b'.repeat(64), uploaded_at: 'now' },
        { id: 'r2', task_key: '|survey', storage_path: 'u/p/r2/b.pdf', file_name: 'b.pdf', mime_type: 'application/pdf', size_bytes: 20, sha256: 'c'.repeat(64), uploaded_at: 'now' },
      ],
    )
    expect(t['|land-price']).toMatchObject({ status: 'done', actual: 52_000, notes: 'paid' })
    expect(t['|land-price']!.receipts[0]!.storagePath).toBe('u/p/r1/a.pdf')
    expect(t['|survey']).toMatchObject({ status: 'in-progress', actual: null })
  })
})
