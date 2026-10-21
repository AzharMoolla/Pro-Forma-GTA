/** SPECIFICATION SKETCH — not an implemented financial engine. */
export type ProvenanceKind =
  | 'user_assumption'
  | 'market_benchmark'
  | 'verified_external_fact'
  | 'regulatory_rule'
  | 'derived_calculation';

export type ValidationStatus = 'verified' | 'unverified' | 'stale' | 'inapplicable' | 'requires_review';

export interface SourcePin {
  sourceId: string;
  documentOrObservationId: string;
  sourceUrl: string;
  effectiveDate?: string; // ISO-8601
  observedDate?: string;
  verifiedAt?: string;
  contentHash?: string;
  reviewStatus: ValidationStatus;
}

export interface SmartField<TValue> {
  id: string;
  value: TValue;
  unit: string;
  origin: ProvenanceKind;
  asOfDate?: string;
  status: ValidationStatus;
  sources: SourcePin[];
  formulaId?: string;
  dependencyIds?: string[];
  overriddenFrom?: TValue;
  notes?: string;
}

export interface ScenarioSnapshot {
  scenarioId: string;
  projectId: string;
  recordedAt: string;
  engineVersion: string;
  modelConventionVersion: string;
  sourcePins: SourcePin[];
  assumptionsHash: string;
  snapshotHash: string;
  approvedOrLocked: boolean;
}

export interface MetricTrace {
  metricId: string;
  value: number | null;
  unit: string;
  formulaId: string;
  dependencies: string[];
  scenarioSnapshotId: string;
  warnings: string[];
  sources: SourcePin[];
}

export type PolicyProgramState = 'open' | 'paused' | 'closed' | 'historical' | 'unknown';
export type FundingAwardState = 'potential' | 'applied' | 'conditional' | 'approved' | 'received' | 'rejected';

export interface ProgramCandidate {
  programId: string;
  state: PolicyProgramState;
  awardStatus: FundingAwardState;
  isEligibilityConfirmed: boolean;
  conditionsOutstanding: string[];
  expectedCashflowAmount: number | null;
  expectedCashflowDate: string | null;
  sourcePins: SourcePin[];
}
