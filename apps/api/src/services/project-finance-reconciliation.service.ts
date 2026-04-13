type ImportedProjectRecord = {
  customer: string;
  address: string;
  contractDate: string;
};

type ExistingProjectRecord = {
  id: string;
  customer: string;
  address: string;
  contractDate: string;
};

type MatchType = 'CUSTOMER_ADDRESS' | 'CUSTOMER_CONTRACT_DATE' | 'NONE';
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

  let ambiguousResult: {
    status: MatchStatus;
    matchType: MatchType;
    projectId: string | null;
    candidates: ExistingProjectRecord[];
  } | null = null;
  const uniqueMatches: Array<{ type: Exclude<MatchType, 'NONE'>; candidate: ExistingProjectRecord }> = [];

  for (const matcher of matchers) {
    const candidates = projects.filter(matcher.predicate);
    if (candidates.length === 1) {
      uniqueMatches.push({ type: matcher.type, candidate: candidates[0] });
      continue;
    }

    if (candidates.length > 1) {
      ambiguousResult = {
        status: 'RECONCILIATION_REQUIRED',
        matchType: matcher.type,
        projectId: null,
        candidates,
      };
    }
  }

  if (ambiguousResult && uniqueMatches.length > 0) {
    return {
      status: 'RECONCILIATION_REQUIRED',
      matchType: ambiguousResult.matchType,
      projectId: null,
      candidates: [
        ...ambiguousResult.candidates,
        ...uniqueMatches.map((match) => match.candidate),
      ],
    };
  }

  if (uniqueMatches.length > 0) {
    const uniqueIds = new Set(uniqueMatches.map((match) => match.candidate.id));
    if (uniqueIds.size === 1) {
      return {
        status: 'MATCHED',
        matchType: uniqueMatches[0].type,
        projectId: uniqueMatches[0].candidate.id,
        candidates: [uniqueMatches[0].candidate],
      };
    }

    return {
      status: 'RECONCILIATION_REQUIRED',
      matchType: uniqueMatches[0].type,
      projectId: null,
      candidates: uniqueMatches.map((match) => match.candidate),
    };
  }

  if (ambiguousResult) {
    return ambiguousResult;
  }

  return {
    status: 'RECONCILIATION_REQUIRED',
    matchType: 'NONE',
    projectId: null,
    candidates: [],
  };
}
