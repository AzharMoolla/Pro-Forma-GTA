# Benchmark: the model against published pro formas

Run date: 2026-10-22. Code: `src/verification/benchmarks.ts`. Test: `tests/engine/benchmarks.test.ts`. In the app: Verification → "Benchmark: published pro formas".

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

## How to read this

- **What it shows:** where the inputs are stated, the tool reproduces a professional consultant's residual land model within a couple of percent of revenue.
- **Where it misses:** the large misses trace to one input the study leaves unstated, not to a formula.
- **Its limits:** this is a comparison with another model, not with a built project's actual cost. The next answer keys, in order of value:
  1. Toronto's 2019 IZ study (NBLC). Its 11 prototypes publish inputs but give only "viable or challenge" results, so they test direction, not dollars.
  2. Projects with public cost and yield, such as REIT development disclosures and CMHC-financed rentals. These test against actual results.
  3. A request to NBLC for the parking area per stall and the rental spread.
