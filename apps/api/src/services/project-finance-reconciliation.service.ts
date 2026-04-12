type ImportedProjectRecord = {
  legacyId: string | null;
  customer: string;
  address: string;
  contractDate: string;
};

type ExistingProjectRecord = {
  id: string;
  legacyId: string | null;
  customer: string;
  address: string;
  contractDate: string;
};

type MatchType = 'LEGACY_ID' | 'CUSTOMER_ADDRESS' | 'CUSTOMER_CONTRACT_DATE' | 'NONE';
type MatchStatus = 'MATCHED' | 'RECONCILIATION_REQUIRED';

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function matchImportedProject(
  incoming: ImportedProjectRecord,
  projects: ExistingProjectRecord[],
): {
  status: MatchStatus;
  matchType: MatchType;
  projectId: string | null;
  candidates: ExistingProjectRecord[];
} {
  const matchers: Array<{
    type: Exclude<MatchType, 'NONE'>;
    predicate: (candidate: ExistingProjectRecord) => boolean;
  }> = [
    {
      type: 'LEGACY_ID',
      predicate: (candidate) =>
        Boolean(incoming.legacyId) &&
        normalize(candidate.legacyId) === normalize(incoming.legacyId),
    },
    {
      type: 'CUSTOMER_ADDRESS',
      predicate: (candidate) =>
        normalize(candidate.customer) === normalize(incoming.customer) &&
        normalize(candidate.address) === normalize(incoming.address),
    },
    {
      type: 'CUSTOMER_CONTRACT_DATE',
      predicate: (candidate) =>
        normalize(candidate.customer) === normalize(incoming.customer) &&
        normalize(candidate.contractDate) === normalize(incoming.contractDate),
    },
  ];

  for (const matcher of matchers) {
    const candidates = projects.filter(matcher.predicate);
    if (candidates.length === 1) {
      return {
        status: 'MATCHED',
        matchType: matcher.type,
        projectId: candidates[0].id,
        candidates,
      };
    }

    if (candidates.length > 1) {
      return {
        status: 'RECONCILIATION_REQUIRED',
        matchType: matcher.type,
        projectId: null,
        candidates,
      };
    }
  }

  return {
    status: 'RECONCILIATION_REQUIRED',
    matchType: 'NONE',
    projectId: null,
    candidates: [],
  };
}
