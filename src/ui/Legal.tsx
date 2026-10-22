import type { ReactNode } from 'react'
import { Card } from './components'

/** The privacy contact, once the operator confirms one. Until then the policy says so instead of inventing one. */
export const PRIVACY_CONTACT: string | null = null
export const LEGAL_EFFECTIVE = '2026-10-22'

const H = ({ children }: { children: ReactNode }) => <h3 className="mt-4 text-base font-semibold">{children}</h3>
const contact = PRIVACY_CONTACT
  ? <>email <a className="text-accent underline" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a></>
  : <>the contact address that will be published here before accounts open to the public (until then, delete your account and data yourself from Account settings, which works today)</>

export function PrivacyPolicy() {
  return (
    <Card title="Privacy policy">
      <div className="max-w-3xl text-sm leading-relaxed text-ink-soft">
        <p>Effective {LEGAL_EFFECTIVE}. PlanGTA (plangta.ca) is a planning and development pro forma tool for the Greater Toronto Area. This policy explains what it collects, why, where it goes, and what you can do about it. It follows the principles of Canada's Personal Information Protection and Electronic Documents Act (PIPEDA).</p>

        <H>Without an account</H>
        <p>Everything you enter stays in your browser (local storage and the browser's own database for receipt files). Nothing is sent to us. Clearing your browser data removes it.</p>

        <H>With an account: what we collect</H>
        <ul className="list-disc pl-5">
          <li><strong>Account:</strong> your email address and a password (stored only as a hash by our database provider).</li>
          <li><strong>Your work:</strong> project names, model inputs, project and site variables, locked scenarios, tracker statuses, amounts and notes, and receipt files you upload.</li>
          <li><strong>Technical:</strong> our hosting and database providers keep standard request logs (IP address, time, browser) to run and secure the service.</li>
        </ul>
        <p>We do not collect anything else: no analytics, advertising, tracking pixels or third-party cookies. The sign-in session is kept in your browser's local storage. Address searches on the map run against data we host, not a third-party geocoder.</p>

        <H>Why</H>
        <p>Only to provide the service: to save and load your projects across devices, keep the history of your scenarios and tracker, and send account emails (confirmation, password reset, email change). We do not sell, rent or share your information, and we do not use it to train AI models.</p>

        <H>Where it goes</H>
        <ul className="list-disc pl-5">
          <li><strong>Supabase</strong> (database, sign-in and file storage), in its Canada Central region (ca-central-1). Your rows are protected so that only your account can read them.</li>
          <li><strong>Cloudflare</strong> serves the website and the map data from its global network. Your project data goes from your browser to Supabase directly and does not pass through Cloudflare.</li>
          <li><strong>Email delivery</strong> for account emails, through our database provider's email service or a sending provider we configure.</li>
        </ul>
        <p>These providers process data on our behalf under their own security and privacy terms. Some may process technical logs outside Canada.</p>

        <H>How long we keep it</H>
        <p>Until you delete it. Deleting a project or your account removes it from our database immediately, including locked scenarios, tracker history and receipt files. Copies can remain in our providers' backups for a limited period before they are overwritten. Request logs are kept by our providers for their standard periods.</p>

        <H>Your choices and rights</H>
        <ul className="list-disc pl-5">
          <li><strong>See and take your data:</strong> Account settings → Download all my data (one JSON file), or export any project as a project file.</li>
          <li><strong>Correct it:</strong> edit anything in the app, or change your email in Account settings.</li>
          <li><strong>Delete it:</strong> delete a project from the Projects menu, or your whole account from Account settings.</li>
          <li><strong>Ask us anything or complain:</strong> {contact}. You can also contact the Office of the Privacy Commissioner of Canada.</li>
        </ul>

        <H>Security</H>
        <p>Connections are encrypted (HTTPS). Database rules restrict every row to its owner, locked scenarios are tamper-evident (hashed) and append-only, and permanent deletion runs only on our server after checking your own sign-in. No system is perfectly secure; if a breach affecting your information happens, we will notify you and the Privacy Commissioner as the law requires.</p>

        <H>Children</H>
        <p>PlanGTA is for professional and educational use and is not directed at children under 16.</p>

        <H>Changes</H>
        <p>If this policy changes, the effective date above changes, and material changes are shown in the app before they apply.</p>
      </div>
    </Card>
  )
}

export function Terms() {
  return (
    <Card title="Terms of use">
      <div className="max-w-3xl text-sm leading-relaxed text-ink-soft">
        <p>Effective {LEGAL_EFFECTIVE}. By using PlanGTA you agree to these terms.</p>
        <H>Not advice</H>
        <p>PlanGTA is a screening and modelling tool. Nothing in it is financial, tax, lending, legal, appraisal or planning advice, or a zoning opinion. Map results are screening data from public sources: a missing match is not clearance, and parcels, amendments, legacy by-laws and tribunal decisions are not resolved. Confirm everything with the operative documents and qualified professionals before relying on it.</p>
        <H>Demo data</H>
        <p>Demo projects and templates use synthetic figures for illustration. They are not market evidence.</p>
        <H>Your content</H>
        <p>What you enter and upload stays yours. You give us permission to store and process it only to provide the service to you. Only upload what you have the right to upload.</p>
        <H>Acceptable use</H>
        <p>Don't misuse the service: no attempts to access other accounts, overload or probe the service, or scrape it in bulk.</p>
        <H>Data and licences</H>
        <p>Map and policy data come from public bodies under their open licences (including the Open Government Licence – Ontario and – Toronto) and are credited in exports. Linked documents remain the property of their publishers.</p>
        <H>No warranty; limits</H>
        <p>The service is provided as is, without warranties, and may change or be unavailable. To the extent the law allows, we are not liable for losses from relying on its outputs. You can stop using it and delete your data at any time.</p>
        <H>Law</H>
        <p>These terms are governed by the laws of Ontario and of Canada applicable there.</p>
      </div>
    </Card>
  )
}
