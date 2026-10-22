import { useMemo } from 'react'
import { applyAssumptions, listAssumptions, offSet, OFF_KEY, type Assumption, type AssumptionGroup } from '../engine/assumptions'
import { getNode } from './tree'
import { runNode } from '../engine/portfolio'
import { REZONING_DEFAULTS } from '../scenario/rezoning'
import { Button, Card, Chip, TableWrap, td, th } from './components'
import { money, pct } from './format'
import { useWorkspace } from './workspace'

// Assumptions register: what the model assumes rather than being told, each with its value, basis and effect, and how
// much it moves profit on cost. Growth rates and rule-of-thumb costs can be switched off.

const GROUPS: Array<{ id: AssumptionGroup; title: string; about: string }> = [
  { id: 'growth', title: 'Growth over time', about: 'Rates the model applies every year. Off means today\'s figures throughout.' },
  { id: 'rule', title: 'Rule-of-thumb costs', about: 'Lines set as a percentage of other lines, allowances and contingencies rather than quotes. Off means excluded, shown as a choice, not as unknown.' },
  { id: 'convention', title: 'How the model calculates (always on)', about: 'Fixed methods. Listed so nobody has to guess them.' },
  { id: 'analysis', title: 'Analysis settings (outside the base case)', about: 'Used by the stress tests, simulation, HST and affordability views; they never change the base case.' },
]

const POC = 'profitOnCost'

export function Assumptions() {
  const { state, dispatch, draft } = useWorkspace()
  const project = state.projects[state.projectId]!
  const off = useMemo(() => offSet(project.attributes), [project.attributes])
  const list = useMemo(() => [
    ...listAssumptions(draft, off),
    { id: 'an-rezoning', group: 'analysis' as const, label: 'Rezoning (when you model one)', value: `${REZONING_DEFAULTS.months} months, ${money(REZONING_DEFAULTS.fee)} fee if none entered, ${money(REZONING_DEFAULTS.studies)} extra studies`, basis: 'Class D allowances for a Toronto ZBA; replace with your planner\'s estimate.', effect: 'Applied only when you choose "Model the rezoning".', toggle: false, on: true },
  ], [draft, off])

  // Effect of each switch on profit on cost at the selected level: flip it alone and re-run
  const impact = useMemo(() => {
    const at = (o: Set<string>) => {
      try { return getResultValue(applyAssumptions(draft, o), state.path) } catch { return null }
    }
    const now = at(off)
    const allOn = at(new Set())
    const each = new Map(list.filter((a) => a.toggle).map((a) => {
      const flipped = new Set(off)
      if (flipped.has(a.id)) flipped.delete(a.id)
      else flipped.add(a.id)
      const v = at(flipped)
      // Effect of the assumption being on: on − off
      return [a.id, v === null || now === null ? null : a.on ? now - v : v - now] as const
    }))
    return { now, allOn, each }
  }, [draft, off, list, state.path])

  const set = (id: string, on: boolean) => {
    const next = new Set(off)
    if (on) next.delete(id)
    else next.add(id)
    dispatch({ type: 'attribute', id: OFF_KEY, value: next.size ? JSON.stringify([...next].sort()) : null })
  }
  const verify = list.filter((a) => a.toVerify).length

  return (
    <div className="flex flex-col gap-4">
      <Card title="Assumptions register" actions={off.size ? <Button onClick={() => dispatch({ type: 'attribute', id: OFF_KEY, value: null })}>Turn all back on</Button> : undefined}>
        <p className="text-sm text-ink-soft">A pro forma's arithmetic is fixed, but its inputs are judgment: none of these buildings exist yet. Everything the model assumes rather than being told is listed here with its basis, and how much it moves profit on cost, so you can see what is carrying the result. Switch growth rates and rule-of-thumb costs off to see the deal without them. Switches are saved with the project and locked into scenarios.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          <li><Chip tone={off.size ? 'warn' : 'good'}>{off.size ? `${off.size} switched off` : 'All assumptions on'}</Chip></li>
          <li><Chip>Profit on cost {impact.now === null ? 'n/a' : pct(impact.now, 1)}{off.size && impact.allOn !== null ? ` (${pct(impact.allOn, 1)} with all on)` : ''}</Chip></li>
          {verify > 0 && <li><Chip tone="warn">{verify} placeholder{verify === 1 ? '' : 's'} marked to verify</Chip></li>}
        </ul>
      </Card>

      {GROUPS.map((g) => {
        const items = list.filter((a) => a.group === g.id)
        if (!items.length) return null
        return (
          <Card key={g.id} title={`${g.title} (${items.length})`}>
            <p className="mb-2 text-sm text-ink-soft">{g.about}</p>
            <TableWrap caption={g.title}>
              <thead><tr>{[...(g.id === 'growth' || g.id === 'rule' ? ['On'] : []), 'Assumption', 'Value', 'Basis and effect', ...(g.id === 'growth' || g.id === 'rule' ? ['Moves profit on cost'] : [])].map((h) => <th key={h} scope="col" className={h === 'Moves profit on cost' ? `${th} text-right` : th}>{h}</th>)}</tr></thead>
              <tbody>{items.map((a) => <Row key={a.id} a={a} effect={impact.each.get(a.id)} onToggle={set} />)}</tbody>
            </TableWrap>
          </Card>
        )
      })}
    </div>
  )
}

function getResultValue(model: ReturnType<typeof applyAssumptions>, path: string[]): number | null {
  const node = getNode(model, path)
  return runNode(node).metrics[POC]?.value ?? null
}

function Row({ a, effect, onToggle }: { a: Assumption; effect: number | null | undefined; onToggle: (id: string, on: boolean) => void }) {
  return (
    <tr className={a.on ? undefined : 'text-ink-mute'}>
      {a.toggle && (
        <td className={td}>
          <input type="checkbox" role="switch" aria-label={`${a.label}: ${a.on ? 'on' : 'off'}`} checked={a.on} onChange={(e) => onToggle(a.id, e.target.checked)} className="size-4 accent-[var(--accent)]" />
        </td>
      )}
      <td className={td}>
        <span className="font-medium">{a.label}</span>
        {a.toVerify && <> <Chip tone="warn">to verify</Chip></>}
        {!a.on && <> <Chip tone="warn">off</Chip></>}
      </td>
      <td className={`${td} num text-sm`}>{a.value}</td>
      <td className={`${td} text-xs text-ink-soft`}>{a.basis} <span className="text-ink-mute">{a.effect}</span></td>
      {a.toggle && <td className={`${td} num text-right whitespace-nowrap`}>{effect === null || effect === undefined ? 'n/a' : `${effect >= 0 ? '+' : '−'}${(Math.abs(effect) * 100).toFixed(1)} pts`}</td>}
    </tr>
  )
}
