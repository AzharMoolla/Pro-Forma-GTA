# Agent Project Playbook

**Purpose:** Reusable instructions for Claude Code, Codex, Cursor, Copilot, Gemini CLI, and other coding agents working on public-facing projects.

**Last verified:** 2026-10-06  
**Primary operating context:** Canada-first, with U.S./UK/EU checks when a product is publicly accessible there.

> This file is an engineering and launch checklist, not legal advice. Do not claim a product is "legally compliant" merely because this checklist passes. If a project handles regulated data, children, biometrics, health/financial information, high-risk AI, or has meaningful legal exposure, flag it for qualified legal review.

---

## 1. Instructions to every coding agent

When this file is present in a repository:

1. **Read it before implementing or shipping public-facing features.**
2. **Do not overwrite existing `CLAUDE.md`, `AGENTS.md`, `.claude/`, `.agents/`, Cursor rules, or other agent instructions.** Merge carefully or add a pointer to this file.
3. Prefer **project-scoped** configuration over global configuration.
4. You are authorized to add an approved dependency to the current project when it is clearly useful and non-destructive. **Ask first** before:
   - installing system/global software;
   - enabling executable lifecycle hooks you have not inspected;
   - connecting an external account or provider;
   - adding a paid service;
   - sending private project data to a third party;
   - changing DNS, billing, production infrastructure, or production secrets.
5. Before adding a package/plugin, verify the **official repository/package identity, license, maintenance status, install scripts/hooks, data handling, and compatibility** with the current stack.
6. Never put API keys, service-role keys, tokens, passwords, private certificates, or database credentials in client code or Git.
7. Do not silently add analytics, advertising pixels, fingerprinting, session replay, or marketing automation.
8. Do not generate fake testimonials, fake customer logos, fake usage numbers, fake certifications, or unsupported legal/security/AI claims.
9. Do not deploy placeholder Terms, Privacy, Cookie, DMCA, refund, or consent text that does not match the real product.
10. At the end of a meaningful feature or launch task, run the **Pre-Launch Gate** in Section 7 and report failures explicitly.

### Recommended repository pointer

If the project already has an `AGENTS.md` or `CLAUDE.md`, add a short line such as:

```md
Before public-facing implementation or release work, read and follow `AGENT_PROJECT_PLAYBOOK.md`.
```

---

## 2. Approved agent/developer tools and references

These are **optional tools**, not mandatory dependencies. Do not install all of them blindly.

### 2.1 Ponytail — code restraint / token discipline

**Official repository:** https://github.com/DietrichGebert/ponytail

Use when the agent is overengineering, producing unnecessary abstraction, or wasting tokens/code. Ponytail's core philosophy is to prefer the simplest solution that works while preserving security, accessibility, validation at trust boundaries, and data-loss protection.

**Claude Code:** send these as two separate commands:

```text
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```

**Codex:**

```bash
codex plugin marketplace add DietrichGebert/ponytail
codex plugin add ponytail@ponytail
```

Then review/trust the plugin hooks before using them. Ponytail includes Node-based lifecycle hooks; inspect them before activation.

**Agent rule:** use Ponytail to reduce unnecessary code, **not** to cut accessibility, security, tests at critical boundaries, data validation, or error handling.

---

### 2.2 OmniRoute — multi-provider AI gateway/routing

**Official repository:** https://github.com/diegosouzapw/OmniRoute  
**Claude Code configuration:** https://github.com/diegosouzapw/OmniRoute/blob/release/v3.8.52/docs/guides/CLAUDE-CODE-CONFIGURATION.md

Use when a project intentionally needs model/provider routing, fallbacks, cost-aware routing, or multiple AI backends.

**Typical install:**

```bash
npm install -g omniroute
omniroute
```

or use the current official quick-start instructions from the repository.

**Agent rules:**

- Treat OmniRoute as infrastructure that handles provider credentials and model traffic.
- Never commit its credentials or access tokens.
- Do not expose a local gateway/dashboard to the public internet without authentication and an explicit deployment design.
- Do not silently reroute private data to a different model/provider.
- Record which providers may receive project/user data.
- Ask before adding a new external provider or paid API.

---

### 2.3 Graphify — codebase knowledge graph

**Official repository:** https://github.com/Graphify-Labs/graphify

Graphify can turn code/docs/configs into a queryable graph for agent navigation.

**Recommended project workflow:**

```bash
uv tool install graphifyy
graphify install --project
graphify .
```

For Codex project setup:

```bash
graphify install --project --platform codex
```

**Agent rules:**

- Prefer the project-scoped install.
- Code parsing can be local, but non-code material may be processed using a configured model/provider depending on how Graphify is run. Check its current privacy documentation before indexing sensitive documents.
- Respect `.gitignore` and use `.graphifyignore` for secrets, private exports, generated binaries, large media, or material that should not be indexed.
- Keep the graph updated when architecture changes.

---

### 2.4 Agent Skills — portable agent capability format

**Official specification/site:** https://agentskills.io/  
**Official specification repository:** https://github.com/agentskills/agentskills

Agent Skills are a standardized way to package repeatable procedures in folders centered on a `SKILL.md` file, optionally with scripts, references, templates, and assets.

Use Agent Skills for repeatable project procedures such as:

- accessibility audit;
- launch compliance audit;
- security review;
- release checklist;
- UI review;
- test generation;
- data migration checks;
- deployment verification.

**Agent rule:** a skill can contain executable scripts. Review bundled scripts and permissions before enabling third-party skills. Prefer version-controlled, project-scoped skills for project-specific behavior.

---

### 2.5 Lenis — smooth scrolling

**Official site:** https://lenis.dev/  
**Official repository/docs:** https://github.com/darkroomengineering/lenis

Use only when smooth scrolling materially improves the experience. It is not a default dependency for every marketing site.

**Install:**

```bash
npm i lenis
```

**Agent rules:**

- Preserve keyboard navigation, anchor links, focus behavior, native scrolling expectations, and touch usability.
- Test low-power/mobile devices.
- Respect `prefers-reduced-motion` and avoid forcing motion on users who request less animation.
- Do not add smooth scrolling merely to make a site feel "premium."

---

### 2.6 Basement Studio Lab — interaction inspiration only

**Reference:** https://basement.studio/lab

Use as inspiration for interaction, WebGL, motion, and high-concept landing-page ideas. It is **not** a drop-in plugin or permission to copy protected design/assets/code.

**Agent rule:** study the interaction principle, then implement an original version appropriate to the product, performance budget, accessibility requirements, and brand.

---

## 3. Design rules: avoid the generic "AI/vibecoded" look

The following patterns are not individually forbidden. The problem is using them as automatic defaults until unrelated products all look the same.

### Never default to these without a product-specific reason

- harsh or decorative gradients;
- purple-on-black SaaS styling;
- rainbow accents;
- floating radial orbs;
- dot-grid backgrounds;
- sparkle icons;
- excessive drop shadows;
- glass/liquid-glass panels everywhere;
- neon or generic pastel palettes;
- the same soft rounded rectangle on every component;
- three equal feature cards simply because there are three columns available;
- a bento grid with no information-architecture reason;
- decorative terminal windows on non-technical products;
- checkmark lists as the only way to explain value;
- exactly three pricing tiers by habit;
- animated arrows used as filler;
- hover animation on every element;
- generic Inter/Geist/Space Grotesk typography without considering the brand;
- emojis used as substitute icons;
- generic colored-left-border callouts everywhere;
- formula copy such as "It's not X, it's Y" repeated across sections;
- abstract feature claims with no product demonstration.

### Hard prohibitions

- **No fake testimonials.**
- **No fake logos/customers/partners.**
- **No fake metrics, security badges, awards, reviews, or compliance claims.**
- **No fabricated screenshots presented as a working product.** Clearly label concepts/mockups when they are concepts/mockups.

### Preferred design behavior

1. Start from the product's actual workflow, content, audience, and brand.
2. Show the real product early: live UI, real screenshots, demo video, interactive example, or truthful prototype.
3. Build a small intentional design system: typography, spacing, surfaces, motion, icon language, and states.
4. Use hierarchy and whitespace before adding decoration.
5. Use skeleton loaders only when there is genuinely asynchronous content and they improve perceived continuity; otherwise use appropriate progress/empty states.
6. Animation must have a purpose: spatial continuity, feedback, hierarchy, storytelling, or delight. It must not block use.
7. Test mobile, keyboard, reduced motion, zoom, and low-performance devices.

---

## 4. Legal/privacy/compliance engineering baseline

### 4.1 Terms of Service / Terms of Use

Create a real Terms page before launch when the product has accounts, subscriptions, payments, user-generated content, uploads, community features, AI outputs, marketplace behavior, or meaningful service obligations.

A Terms page should be product-specific and normally address, as applicable:

- who operates the service and how to contact them;
- eligibility/account rules;
- acceptable use and prohibited behavior;
- ownership of the service and intellectual property;
- ownership/licensing of user content;
- user responsibility for uploaded content and required rights/permissions;
- AI-generated or automated outputs and their limitations, where relevant;
- payments, billing, trials, renewals, cancellation, and refunds if applicable;
- service changes, suspension, and termination;
- copyright/DMCA process when relevant;
- disclaimers and limitation of liability appropriate to the actual business;
- dispute/govening-law language selected by the owner/legal counsel;
- effective/last-updated date.

**Do not:**

- copy another company's Terms;
- invent an address/company entity;
- claim rights the product does not need;
- promise security, uptime, refunds, deletion periods, or service levels the system cannot actually deliver;
- deploy a generic AI template without owner review.

---

### 4.2 Privacy Policy

If the product collects, receives, stores, logs, profiles, or shares personal information, create a Privacy Policy that matches the actual data flow.

Maintain a simple **data inventory** with at least:

- data category;
- source;
- purpose;
- storage location;
- processors/subprocessors;
- retention/deletion rule;
- whether it is sensitive;
- whether it crosses borders;
- user-facing control/choice.

The Privacy Policy should address the actual product's:

- account/profile information;
- logs, IP/device data, diagnostics;
- cookies/tracking;
- uploads and user-generated content;
- payments (usually handled by a payment processor rather than storing card details yourself);
- AI/model providers and what content may be sent to them;
- analytics/advertising providers;
- retention and deletion;
- security practices stated carefully and truthfully;
- privacy rights/request method;
- minors/children policy;
- international/cross-border processing;
- contact information and update date.

**Canada privacy reference (PIPEDA):**  
https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/

**Meaningful consent reference:**  
https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_consent/

---

### 4.3 Cookies, Meta Pixel, analytics, session replay, and tracking

Treat non-essential tracking as a feature with a consent state, not as code that automatically executes on page load.

**Implementation rule:**

```text
page loads
  -> essential functionality only
  -> determine consent state
  -> user makes/has a valid choice
  -> initialize only the allowed analytics/advertising categories
```

For jurisdictions that require prior consent for non-essential cookies (notably UK/EU contexts), **do not fire Meta Pixel, advertising cookies, or other non-essential trackers before consent**.

**UK ICO cookie guidance:**  
https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/

**Canada OPC behavioural advertising guidance:**  
https://www.priv.gc.ca/en/privacy-topics/technology/online-privacy-tracking-cookies/tracking-and-ads/gl_ba_1112/

**Agent rules:**

- classify each tracker: essential / analytics / preferences / advertising;
- make reject/decline reasonably accessible where required;
- remember the user's choice;
- provide a way to change the choice later;
- do not use dark patterns to force acceptance;
- document each third party and purpose;
- do not enable device fingerprinting casually.

---

### 4.4 Marketing email/text — Canada (CASL)

For Canadian commercial electronic messages, build around CASL rather than assuming U.S.-style opt-out alone is enough.

Default engineering requirements:

- have a valid basis for consent (express or a valid form of implied consent);
- keep evidence/records of the consent relied on;
- include required sender identification/contact information;
- include a working unsubscribe mechanism;
- process unsubscribe requests promptly and within the legally required period;
- do not automatically turn account creation, waitlist entry, or a transactional email into blanket marketing consent.

**CRTC CASL overview/guidance:**  
https://crtc.gc.ca/eng/internet/anti/reg.htm  
https://crtc.gc.ca/eng/com500/guide.htm

The CRTC states that commercial electronic messages generally require consent, identification information, and an unsubscribe mechanism; unsubscribe requests must be respected within 10 business days.

---

### 4.5 Marketing email — United States (CAN-SPAM)

For U.S. commercial email, ensure truthful header/from information and subject lines, required identification/address information, a clear opt-out mechanism, and timely processing of opt-outs.

**FTC CAN-SPAM guide:**  
https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business

**Agent rule:** do not remove unsubscribe controls from marketing email just because the recipient has an account or subscription.

---

### 4.6 User uploads, copyright, and DMCA

If users can upload, host, share, embed, link, publish, or distribute content, perform a copyright/UGC review before launch.

For a service seeking U.S. DMCA Section 512 safe-harbor protection, relevant measures may include:

- designate/register a DMCA agent with the U.S. Copyright Office;
- publish the designated agent contact information;
- provide a valid notice-and-takedown process;
- support counter-notices;
- act expeditiously on valid notices;
- maintain and reasonably implement a repeat-infringer policy;
- make the UGC/copyright rules clear in Terms/community rules.

**U.S. Copyright Office Section 512 resources:**  
https://www.copyright.gov/512/

**DMCA designated agent directory/registration:**  
https://www.copyright.gov/dmca-directory/

**Agent rule:** do not represent a DMCA registration as an automatic shield from all copyright liability. It is part of a conditional safe-harbor framework.

---

### 4.7 Accessibility

Target **WCAG 2.2 AA** for public web products unless a stricter project requirement applies.

**WCAG 2.2:**  
https://www.w3.org/TR/WCAG22/

**U.S. DOJ web accessibility guidance:**  
https://www.ada.gov/resources/web-guidance/

Minimum engineering expectations:

- semantic HTML first;
- meaningful alt text for informative images; empty alt for purely decorative images;
- keyboard access to all interactive functions;
- visible focus states;
- correct labels/instructions/errors for forms;
- sufficient text/UI contrast;
- no information conveyed only by color;
- headings in a logical hierarchy;
- captions/transcripts for meaningful audio/video where appropriate;
- zoom/reflow/responsive behavior;
- reduced-motion support;
- screen-reader-friendly status/error updates;
- accessible dialogs, menus, tabs, and custom controls;
- automated accessibility checks plus manual keyboard/screen-reader spot checks.

**Do not:** install an "AI accessibility overlay" and claim the site is therefore compliant. Accessibility must be implemented in the product itself and tested. The FTC's accessiBe action is a useful warning about unsupported accessibility claims:  
https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-approves-final-order-requiring-accessibe-pay-1-million

---

### 4.8 Children, teens, and age gates

Do **not** add a universal age gate merely because an influencer says every site needs one. Determine the audience and data practices first.

For U.S. COPPA, child-directed services and certain general-audience services with actual knowledge that they collect personal information from children under 13 have specific obligations. The FTC explicitly explains that general-audience operators are not universally required to ask every visitor's age.

**FTC COPPA FAQ:**  
https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions

**Agent rules:**

- if the product is intended for children or likely to collect data from children, stop and request a dedicated child-privacy design/legal review;
- do not use behavioural advertising/tracking on child-focused experiences by default;
- do not collect date of birth unless needed;
- if age screening is required, implement it neutrally rather than encouraging users to lie;
- make deletion/parental-control workflows real when the applicable rule requires them.

---

### 4.9 Biometrics / Face ID / face geometry

Distinguish **device-local authentication** (for example, letting the operating system confirm a Face ID/passkey authentication) from **your product collecting or deriving biometric identifiers**.

Do not collect face geometry, fingerprints, voiceprints, or biometric templates unless the feature genuinely requires them and a dedicated privacy/legal review has occurred.

Illinois BIPA is a major example: it covers identifiers including scans of face geometry and requires specific written notice/purpose/term disclosures and a written release before collection, plus retention/destruction requirements.

**Illinois BIPA Section 15:**  
https://www.ilga.gov/legislation/ilcs/fulltext?DocName=074000140K15

**BIPA definitions:**  
https://www.ilga.gov/legislation/ilcs/fulltext?DocName=074000140K10

**Agent rule:** prefer platform authentication APIs where the app receives only an authentication result and not biometric templates.

---

### 4.10 AI features and AI marketing claims

There is no universal rule that every website must have a generic "AI policy" or keep a mystical "proof of AI" file. The important engineering rule is that **claims about AI capabilities must be truthful and substantiated**, and privacy/security disclosures must match what the system actually sends to models.

For every material AI feature, document:

- what model/provider is used;
- what user/project data is transmitted;
- whether data may be retained or used by the provider under the chosen account/API terms;
- whether outputs are stored;
- known limitations/failure modes;
- whether a human-review step is required for high-impact use;
- the evidence supporting important marketing claims.

**Do not claim** the AI is a lawyer, doctor, financial professional, compliance guarantee, accessibility guarantee, or equivalent substitute for a regulated professional unless the claim has been specifically reviewed and is actually supportable.

**FTC DoNotPay case:**  
https://www.ftc.gov/legal-library/browse/cases-proceedings/donotpay

**FTC accessiBe case:**  
https://www.ftc.gov/legal-library/browse/cases-proceedings/2223156-accessibe-inc

---

### 4.11 Security and encryption

There is no universal "$799 unencrypted data" rule. The correct approach is risk-based security appropriate to the data and product.

Baseline engineering requirements:

- HTTPS/TLS in transit;
- encryption at rest where supported/appropriate, especially for sensitive data and backups;
- strong password hashing (never reversible encryption for user passwords);
- secrets in environment/secret management, never in public client bundles or Git;
- least-privilege database/service roles;
- server-side authorization on every protected action;
- validation at trust boundaries;
- rate limiting/abuse controls where relevant;
- CSRF/XSS/SQL injection and dependency-security protections appropriate to the stack;
- sensitive-data redaction in logs/errors/analytics;
- secure password reset/session handling;
- backups and restoration testing for important data;
- deletion/retention mechanisms that actually work;
- dependency and secret scanning in CI when practical.

**OWASP Top 10:**  
https://owasp.org/www-project-top-ten/

**OWASP ASVS:**  
https://owasp.org/www-project-application-security-verification-standard/

---

## 5. Required implementation patterns

### 5.1 Consent-aware tracking loader

Do not initialize optional trackers from the global app bootstrap. Put them behind a consent manager/module.

Pseudocode:

```ts
const consent = await getConsentState();

if (consent.analytics) {
  await loadAnalytics();
}

if (consent.advertising) {
  await loadAdvertisingPixels();
}
```

Also support revocation/changes without requiring a new account.

---

### 5.2 Marketing consent record

If collecting marketing consent, store enough evidence to support the actual legal basis used by the product, for example:

```text
subscriber_id
channel (email/sms/etc.)
consent_type / legal_basis
consent_text_version
source/form
consented_at
jurisdiction/context if needed
withdrawn_at
```

Do not store more personal data than is needed merely to prove consent.

---

### 5.3 Third-party service registry

Maintain a simple project file such as `docs/THIRD_PARTIES.md` containing:

```text
Service | Purpose | Data sent | Region | User-facing disclosure | Can be disabled? | Owner
```

Include analytics, payment providers, email/SMS, AI providers, error tracking, CDN/storage, authentication, ad pixels, session replay, and other processors.

---

### 5.4 Legal-page release guard

For public production builds, add a checklist or CI/release check that catches obvious failures such as:

- missing `/privacy` when personal data is collected;
- missing `/terms` when the service needs contractual/user rules;
- `TODO`, `[COMPANY NAME]`, fake address, placeholder email, or sample policy text in legal pages;
- a cookie banner that visually exists but does not actually block restricted trackers;
- marketing forms with pre-checked consent;
- unsubscribe links that are dead or require login;
- accessibility widgets used as a substitute for accessible implementation.

Do not make the build gate pretend to provide legal certification. It is a failure-prevention mechanism.

---

## 6. Project-specific escalation triggers

Stop and tell the project owner that specialist review is needed before release when the feature involves any of the following:

- health/medical records or diagnosis/treatment decisions;
- banking, lending, investing, credit scoring, or financial-account data;
- government identity documents or Social Security/SIN data;
- precise location tracking;
- biometric identification/verification beyond device-local platform auth;
- children-focused products or known users under applicable child-privacy thresholds;
- employment, housing, education, insurance, or other high-impact automated decisions;
- marketplace money movement or custody of funds;
- copyrighted user uploads at meaningful scale;
- adult content, gambling, regulated goods, or other age-restricted categories;
- a claim that the service is legally/medically/financially compliant or replaces a licensed professional;
- large-scale scraping, automated outreach, or data brokerage;
- security-sensitive authentication/cryptography built from scratch.

---

## 7. Pre-Launch Gate — run before public production release

An agent should be able to answer each item **PASS / NOT APPLICABLE / BLOCKED** and explain every BLOCKED item.

### Product truthfulness

- [ ] Real product behavior matches landing-page claims.
- [ ] No fake testimonial/logo/customer/metric/award/certification.
- [ ] AI claims have evidence and limitations are not hidden.
- [ ] Concept/mockup material is not presented as shipped functionality.

### Legal/privacy

- [ ] Terms page exists if the product needs one and matches actual behavior.
- [ ] Privacy Policy exists if personal information is processed and matches actual data flows.
- [ ] Cookie/tracking disclosure and consent behavior match the trackers actually loaded.
- [ ] Marketing consent/identification/unsubscribe flow is appropriate to target jurisdictions.
- [ ] UGC/copyright/DMCA workflow is addressed if users can publish or host content.
- [ ] Child/minor handling has been reviewed if relevant.
- [ ] Biometric handling has been reviewed if relevant.
- [ ] Refund/subscription/cancellation language matches billing behavior.
- [ ] Legal pages contain no placeholders or fabricated entity/contact information.

### Security/data

- [ ] No secrets in client bundle, source control, logs, or screenshots.
- [ ] Protected actions enforce server-side authorization.
- [ ] Sensitive traffic uses TLS.
- [ ] Passwords are properly hashed.
- [ ] Personal/sensitive data retention and deletion are defined.
- [ ] Third-party processors are inventoried.
- [ ] Backups/recovery are appropriate for important data.
- [ ] Basic OWASP-style security review completed.

### Accessibility/UX

- [ ] Keyboard-only navigation works.
- [ ] Focus is visible and logical.
- [ ] Informative images have useful alt text.
- [ ] Forms have labels and accessible validation/error messages.
- [ ] Contrast is acceptable.
- [ ] Reduced motion is respected.
- [ ] Dialogs/menus/custom controls have appropriate semantics.
- [ ] Mobile, zoom/reflow, and loading/error/empty states have been tested.
- [ ] Automated accessibility checks completed plus manual spot checks.

### Design quality

- [ ] UI is based on the product/brand, not a generic AI landing-page template.
- [ ] Real product/demo is visible where appropriate.
- [ ] Animation/decorative effects have a purpose and acceptable performance.
- [ ] No gratuitous bento/three-card/purple-gradient/glass/orb/dot-grid pattern stacking.
- [ ] Typography/iconography are intentional rather than defaults chosen by the agent.

### Tool/dependency hygiene

- [ ] New dependencies are actually needed.
- [ ] Official package/repository identity verified.
- [ ] Licenses are acceptable.
- [ ] Lockfile reviewed/updated intentionally.
- [ ] Executable plugin hooks/scripts were reviewed before trust/enablement.
- [ ] External AI/data providers are documented and approved.

---

## 8. Fast decision tree for agents

```text
Is this public-facing?
  NO -> still follow security and dependency hygiene.
  YES
    -> Does it collect personal data?
       YES -> privacy + data inventory + security + deletion/retention.
    -> Does it load analytics/ads/session replay?
       YES -> consent/tracking review before initialization.
    -> Does it send marketing email/text?
       YES -> CASL/CAN-SPAM review as applicable + working unsubscribe.
    -> Does it host user content/uploads/links?
       YES -> copyright/UGC/DMCA review.
    -> Could children use it / is it child-directed?
       YES -> child-privacy review before collecting data/tracking.
    -> Does it collect biometrics?
       YES -> STOP and escalate before implementation/release.
    -> Does it use AI on user data or make strong AI claims?
       YES -> provider/data-flow documentation + claim substantiation.
    -> Does it have accounts/payments/subscriptions/community rules?
       YES -> product-specific Terms.
    -> Always -> accessibility + security + truthful design + pre-launch gate.
```

---

## 9. Source/reference index

### Agent/dev tools

- Ponytail: https://github.com/DietrichGebert/ponytail
- OmniRoute: https://github.com/diegosouzapw/OmniRoute
- OmniRoute Claude Code guide: https://github.com/diegosouzapw/OmniRoute/blob/release/v3.8.52/docs/guides/CLAUDE-CODE-CONFIGURATION.md
- Graphify: https://github.com/Graphify-Labs/graphify
- Agent Skills: https://agentskills.io/
- Agent Skills GitHub: https://github.com/agentskills/agentskills
- Lenis: https://lenis.dev/
- Lenis GitHub: https://github.com/darkroomengineering/lenis
- Basement Studio Lab: https://basement.studio/lab

### Canada

- CRTC CASL Act/regulations/guidance: https://crtc.gc.ca/eng/internet/anti/reg.htm
- CRTC implied-consent guide: https://crtc.gc.ca/eng/com500/guide.htm
- CRTC CASL FAQ: https://crtc.gc.ca/eng/com500/faq500.htm
- OPC PIPEDA overview: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/
- OPC PIPEDA consent principle: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_consent/
- OPC online behavioural advertising: https://www.priv.gc.ca/en/privacy-topics/technology/online-privacy-tracking-cookies/tracking-and-ads/gl_ba_1112/

### United States

- FTC CAN-SPAM guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- FTC COPPA FAQ: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- U.S. Copyright Office Section 512: https://www.copyright.gov/512/
- DMCA Agent Directory: https://www.copyright.gov/dmca-directory/
- DOJ web accessibility guidance: https://www.ada.gov/resources/web-guidance/
- Illinois BIPA collection/retention rules: https://www.ilga.gov/legislation/ilcs/fulltext?DocName=074000140K15
- Illinois BIPA definitions: https://www.ilga.gov/legislation/ilcs/fulltext?DocName=074000140K10
- FTC DoNotPay AI claims case: https://www.ftc.gov/legal-library/browse/cases-proceedings/donotpay
- FTC accessiBe AI/accessibility claims case: https://www.ftc.gov/legal-library/browse/cases-proceedings/2223156-accessibe-inc

### Accessibility/security/UK cookies

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- UK ICO cookie guidance: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/

---

## 10. Final instruction to the agent

Do not treat compliance as a footer-writing task and do not treat design quality as a component-library task. **Make the implementation, data flows, user controls, copy, legal pages, and actual product behavior agree with one another.**

When uncertain, make the safest reversible engineering choice, document the uncertainty, and ask the project owner rather than inventing a legal conclusion or silently introducing a third-party dependency.
