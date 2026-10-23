# Question audit: each question asked once

Audit date: 2026-10-22. Code: `src/ui/modelFacts.ts`; tests: `tests/engine/modelFacts.test.ts`.

**Before:** Site & program listed all 202 project variables, in Simple mode as well. Many of them repeated a figure the pro forma already asks for elsewhere, so the two answers could disagree. For example, units appeared there and again in the unit mix, and construction months there and again in Finance. Some were read by nothing at all.

## What changed

| Kind | Count | Now |
|---|---|---|
| Read from the pro forma | 18 (with the parking stall count) | Shown read-only, marked "from the pro forma", with where to change them. Cost triggers use the model's figure, so a typed duplicate can't disagree. |
| Asked on another page | 16 market and land questions, plus the 18 census figures | Removed from this list. Market rents, prices, cap rates and land price are asked in Revenue & operations and Cost & budget; census figures in People & affordability. |
| Real questions | 168 (including the required rental spread, which is asked on Feasibility & stress) | Full detail: grouped as before. Simple: the 12 below. |

**Read from the pro forma:**
- **Program:** storeys, residential units, tenure, retail, office and industrial area, above- and below-grade GCA, by-law GFA, site area.
- **Schedule and finance:** construction months, cost escalation, construction rate, loan-to-cost, refinance, discount rate.
- **Phasing:** the number of phases, taken from the phasing plan.

**Simple mode asks 12 questions.** They are the ones that switch the most costs, and the site map answers most of them:
- municipality;
- existing building, existing rental units;
- contamination;
- heritage, regulated area, floodplain;
- within 60 m of TTC infrastructure;
- zoning by-law amendment, site plan;
- affordable share;
- below-grade parking levels.

The parking stall count now comes from the parking line in Cost & budget (stalls × area per stall × $/ft²), so it is no longer asked here.

The rest stay unknown, and Sources & audit lists them as "to confirm". People & affordability in Simple asks only the incomes the 30% test runs on.

**Other doubled controls removed:**
- The Development tracker had its own "Plan changes" card for adding or removing a building, which repeated the phasing plan. Both actions now live in the phasing plan: "Add one like it" on each building row, and "Add a building like this one" for a single building.
- The streetscape notes no longer repeat heritage, holding, regulated area or FSI. Those show once, as policy pills.

## Where each kind of information is entered

| Information | Page |
|---|---|
| Site facts and policy (most filled in by the map) | Site map → Site & program |
| Phases and their start months | Site & program (phasing plan) |
| Unit mix, rents, prices, commercial terms | Revenue & operations |
| Cost lines, with each line's evidence type: quote, contract, schedule, benchmark, invoice, estimate | Cost & budget (click a line) |
| Construction timing and loan terms | Finance & ledger |
| Census figures | People & affordability |
| Invoices and receipts | Development tracker |
