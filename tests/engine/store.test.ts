import { describe, expect, it } from 'vitest'
import { reducer, initialState } from '../../src/ui/store'

describe('workspace store: account isolation', () => {
  it('switching account or signing out drops the previous account\'s projects', () => {
    let s = reducer(initialState(), { type: 'account', userId: 'user-a' })
    const id = s.projectId
    s = reducer(s, { type: 'hydrate', projectId: id, draft: { ...s.projects[id]!.draft, name: 'A private draft' }, attributes: { secret: 'a' }, draftParentId: null, scenarios: [], tracker: {} })
    expect(s.projects[id]!.draft.name).toBe('A private draft')
    const b = reducer(s, { type: 'account', userId: 'user-b' })
    expect(b.account).toBe('user-b')
    expect(b.projects[id]!.draft.name).not.toBe('A private draft')
    expect(b.projects[id]!.attributes.secret).toBeUndefined()
    const guest = reducer(s, { type: 'account', userId: null })
    expect(guest.projects[id]!.attributes.secret).toBeUndefined()
    expect(reducer(b, { type: 'account', userId: 'user-b' })).toBe(b) // same account: no reset
  })
})
