# Benchmark: the model against published pro formas

Run date: 2026-10-22. Two answer keys: Peel 2021 (dollars) and Toronto 2019 (direction). Code: `src/verification/benchmarks.ts`. Test: `tests/engine/benchmarks.test.ts`. In the app: Verification → "Benchmark: published pro formas".

## The question

How close does the tool get to a development whose answer we already know?

Finished projects rarely publish their full financials. Municipal feasibility studies do: they publish every input and the result for each prototype site. That makes them a usable answer key.

## The answer key

**Source:** N. Barry Lyon Consultants (NBLC), *Inclusionary Zoning Evaluation*, for the Region of Peel, Mississauga, Brampton and Caledon, December 2021 (revised). It is published at [peelregion.ca](https://peelregion.ca/sites/default/files/2024-08/nblc-iz-feasibility-analysis-dec-2021.pdf).

**What the study publishes:**
- **Table 3:** for each of 16 sites, the acres, storeys, units and GFA.
- **Table 4:** for each site, unit size, parking ratios, condo price per ft², parking price, sales pace, rent per ft², parking rent and exit cap rate.
- **Table 5:** the shared assumptions.
  - Hard costs by height, parking, contingency, and soft costs at 14.5% + 1% + 2.5% of hard costs.
  - DCs by unit size, the 4% CBC, parkland and permit fees, property tax.
  - Commission, lender fee, a 75% loan at 4.5%, 2% inflation, and profit at 15% of revenue for condo.
- **Tables 6–8:** the stated residual land value for each site, condo and rental, current policy.

The benchmark covers the 15 apartment sites. It leaves out the Glen Erin stacked townhomes, which sell on a different basis.

## Method

1. **Rebuild each site:** each one is rebuilt as a project in the engine from the study's own inputs, as a user would enter them.
2. **Solve the land value the way the study defines it:**
   - **Condo:** the land price at which profit after financing equals 15% of revenue.
   - **Rental:** the land price at which the stabilized building, valued at the cap rate plus a profit spread, just covers every cost after financing.
3. **Where the study is silent, one assumption covers every site alike:**
   - underground parking at 375 ft² per stall;
   - 18 months before construction;
   - 20, 24, 30 or 36 months to build, by height;
   - HST included in prices and remitted net of the Ontario new-housing rebate;
   - deposits held in trust;
   - 6 months of interim occupancy;
   - rental lease-up at 20 units a month.

   None of these was tuned to fit.
4. **One fitted parameter:** the study does not publish its rental profit spread. Of 0%, 0.25%, 0.5%, 0.75% and 1% over the cap rate, 0.25% fits best, and it is the only fitted number in the benchmark.

## Results

A residual magnifies small differences. On a $170M project, missing by 1% of revenue moves the land value by $1.7M. Condo misses are therefore also shown as a share of revenue.

| Site | Condo: study | Condo: model | Miss | Miss (% of revenue) | Rental: study | Rental: model | Miss |
|---|---|---|---|---|---|---|---|
| Bolton | $1.76M | −$2.81M | −$4.57M | −12.8% | −$4.10M | −$7.84M | −$3.74M |
| Mount Pleasant | $6.16M | $2.24M | −$3.92M | −3.3% | −$7.22M | −$11.93M | −$4.71M |
| Gateway | $3.43M | −$1.49M | −$4.92M | −4.1% | −$9.94M | −$13.89M | −$3.95M |
| Downtown Brampton (high-rise) | $20.79M | $25.77M | +$4.98M | +1.6% | −$0.38M | $0.17M | +$0.55M |
| Downtown Brampton (mid-rise) | $6.17M | $5.37M | −$0.80M | −1.4% | −$0.15M | $0.29M | +$0.44M |
| Bramalea | $5.75M | −$2.39M | −$8.14M | −3.6% | −$14.32M | −$23.87M | −$9.55M |
| Uptown (Eglinton) | $15.79M | $12.69M | −$3.10M | −1.5% | $5.20M | $4.19M | −$1.01M |
| Mississauga City Centre | $32.88M | $27.78M | −$5.10M | −1.4% | $6.73M | $8.33M | +$1.60M |
| Fairview | $23.76M | $21.98M | −$1.78M | −0.8% | $3.74M | $4.07M | +$0.33M |
| Cooksville | $17.94M | $16.04M | −$1.90M | −1.1% | $3.31M | $2.96M | −$0.35M |
| Tomken | $7.88M | $2.55M | −$5.33M | −8.7% | $2.58M | −$1.12M | −$3.70M |
| Clarkson | $5.56M | −$5.15M | −$10.71M | −6.3% | $1.12M | −$5.82M | −$6.94M |
| Port Credit | $12.87M | $11.44M | −$1.43M | −1.8% | $3.63M | $4.91M | +$1.28M |
| Britannia | $3.40M | $2.63M | −$0.77M | −1.2% | −$3.57M | −$3.70M | −$0.13M |
| Dixie / Lakeview | $5.98M | $4.89M | −$1.09M | −1.3% | $1.20M | $1.61M | +$0.41M |

**Condo:** 9 of 15 sites land within 2% of revenue, and the median miss is 1.6% of revenue. 6 of 15 land values are within ±$2M.

**Rental, with the one fitted spread:** 9 of 15 sites land within ±$2M, and the median miss is $1.3M.

## What the misses say

- **Same sign, same sites.** The misses run in the same direction, at the same sites, for both tenures. They are Bolton, Mount Pleasant, Gateway, Bramalea, Tomken and Clarkson: lower-priced sites with lots of parking (Bolton carries 1.75 stalls per unit). The model costs those sites more than the study does, so parking cost is the gap.
- **Parking area per stall is the most sensitive unstated input.** At 300 ft² per stall instead of 375, the condo bias falls from −3.2% to −0.9% of revenue, and 9 of 15 condo land values land within ±$2M. The study publishes $152 per ft² but not the area per stall. Asking the authors would be worth it, but the benchmark keeps 375, because tuning to the answer would hide the question.
- **HST is the second largest.** Leaving HST out (prices quoted net of HST) or leaving out the rebate moves every site several points of revenue the wrong way. That confirms the study's prices include HST, net of the rebate.
- **Schedule and deposits barely matter at this level.** Moving pre-construction from 18 to 12 months shifts the result by about 0.5% of revenue.
- **Downtown Brampton high-rise** is the one site where the model comes out higher, by 1.6% of revenue. That is consistent with the 50% DC waiver being applied a little differently than the study did.

## Second answer key: Toronto 2019 (direction)

**Source:** NBLC, *City of Toronto Inclusionary Zoning Market Feasibility Analysis*, May 2019, Tables 1–4 ([toronto.ca](https://www.toronto.ca/wp-content/uploads/2019/05/90b6-Final-Draft-City-of-Toronto-IZ-Analysis-May-21-accessible.pdf)).

**What the study publishes:** inputs for 11 sites.
- **Each site:** site area, storeys, units, Section 37 per unit, unit size, sales pace, condo and parking prices, rents and parking ratio.
- **Shared assumptions:** hard costs by height (+10% Downtown and Yonge-Eglinton), parking, DCs, planning fees, property tax, a 75% loan at 5%, profit at 15% and a 4% cap rate.

**What it states as results:** only categories, not dollars. A site is "viable" when its land value without IZ is at least 10% above the stated value of the existing site, else "challenge". So this key tests direction: does the model reach the same verdict?

**Added assumptions:**
- the unit mix (40% two-bedroom or larger), which sets the DCs;
- parkland at 10% of land value;
- building permits at $18/m²;
- gross area taken from units at 83% net-to-gross, because some prototypes are one phase of a larger parcel (Golden Mile's site is 2.5 ha).

**The rental spread** is Peel's 0.25%, not refitted, so the rental half is out of sample.

**Result: 18 of 22 verdicts agree** (condo 9 of 11, rental 9 of 11).

| Disagrees | Study | Model | Why |
|---|---|---|---|
| Etobicoke Centre, condo | viable | challenge | $7.2M against a $7.9M threshold: just under the line |
| Golden Mile, condo | viable | challenge | $2.9M against $3.9M; the site is one phase of a 2.5 ha parcel, and the phase's share of land is not published |
| Etobicoke Centre, rental | challenge | viable | Rental method (below) |
| Yonge-Eglinton, rental | challenge | viable | Rental method (below) |

**The rental miss is systematic, not noise.** The 2019 study reports rental land values typically 31% below condo. With Peel's 2021 spread, the model's rental values come out higher than condo at most Toronto sites. So the 2019 study held rental to a higher return than the 2021 study did, and a single rental spread does not carry across studies or years. In practice the rental return target should be the user's own, and that is how the tool already treats it: the target is an input on Feasibility & stress.

## How to read this

- **What it shows:** where the inputs are stated, the tool reproduces a professional consultant's residual land model within a couple of percent of revenue (Peel), and reaches the same viable-or-challenge verdict in 18 of 22 cases (Toronto).
- **Where it misses:** the large misses trace to inputs the studies leave unstated, not to a formula: parking area per stall, and the return a rental must earn.
- **Its limits:** this is a comparison with other models, not with a built project's actual cost. The next answer keys, in order of value:
  1. Projects with public cost and yield, such as REIT development disclosures and CMHC-financed rentals. These test against actual results.
  2. A request to NBLC for the parking area per stall and the rental spread.
