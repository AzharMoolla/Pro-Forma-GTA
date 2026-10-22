import { indigenousContext } from '../location/indigenous'
import { Card } from './components'

/** Treaty, treaty partners and who to speak with, for a site. */
export function IndigenousCard({ treaty, municipality }: { treaty: string | null; municipality: string | null }) {
  const c = indigenousContext(treaty, municipality)
  return (
    <Card title="Indigenous context: treaty and territory">
      {!c.treaties.length ? (
        <p className="text-sm text-ink-soft">Locate the site on the map to see the historic treaty area it falls in and the Nations to speak with.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3 text-sm">
            {c.treaties.map((t) => (
              <section key={t.treaty}>
                <h3 className="font-semibold">{t.treaty}</h3>
                <p className="text-ink-soft">{t.summary}</p>
                {t.nations.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {t.nations.map((n) => <li key={n.name}><a className="text-accent underline" href={n.url} target="_blank" rel="noreferrer">{n.name}</a> <span className="text-xs text-ink-soft">{n.why}</span></li>)}
                  </ul>
                )}
              </section>
            ))}
            {c.acknowledgement && <p className="rounded border border-line bg-sunken p-2 text-xs text-ink-soft">{c.acknowledgement} <span className="text-ink-mute">(City of Toronto land acknowledgement)</span></p>}
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <h3 className="font-semibold">Who to speak with</h3>
            <ul className="flex flex-col gap-1">
              {c.contacts.map((n) => <li key={n.name}><a className="text-accent underline" href={n.url} target="_blank" rel="noreferrer">{n.name}</a> <span className="text-xs text-ink-soft">{n.why}</span></li>)}
            </ul>
            <ul className="mt-1 list-disc pl-5 text-xs text-ink-soft">{c.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            <p className="text-xs text-ink-mute">Treaty areas: Indigenous Services Canada, Historic Treaties (Open Government Licence – Canada).</p>
          </div>
        </div>
      )}
    </Card>
  )
}
