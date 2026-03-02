const CLAIM_TYPE_LABELS: Record<string, string> = {
  assertion: 'Assertion',
  principle: 'Principle',
  framework: 'Framework',
  recommendation: 'Recommendation',
  prediction: 'Prediction',
  definition: 'Definition',
  observation: 'Observation',
  other: 'Other',
};

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  quote: 'Quote',
  data: 'Data',
  example: 'Example',
  anecdote: 'Anecdote',
  citation: 'Citation',
  reasoning: 'Reasoning',
  other: 'Other',
};

const STANCE_LABELS: Record<string, string> = {
  supports: 'Supports',
  contradicts: 'Contradicts',
  qualifies: 'Qualifies',
};

const STRENGTH_LABELS: Record<string, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  developing: 'Developing',
  contested: 'Contested',
  unsupported: 'Unsupported',
};

const CONTRIBUTOR_ROLE_LABELS: Record<string, string> = {
  author: 'Author',
  speaker: 'Speaker',
  interviewer: 'Interviewer',
  interviewee: 'Interviewee',
  host: 'Host',
  panelist: 'Panelist',
  editor: 'Editor',
  other: 'Other',
};

const COMPOSITION_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

const SOURCE_STATUS_LABELS: Record<string, string> = {
  collected: 'Collected',
  distilling: 'Distilling',
  distilled: 'Distilled',
  decomposing: 'Decomposing',
  decomposed: 'Decomposed',
};

function labelFrom(map: Record<string, string>) {
  return (value: string): string => map[value] ?? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

export const claimTypeLabel = labelFrom(CLAIM_TYPE_LABELS);
export const evidenceTypeLabel = labelFrom(EVIDENCE_TYPE_LABELS);
export const stanceLabel = labelFrom(STANCE_LABELS);
export const strengthLabel = labelFrom(STRENGTH_LABELS);
export const confidenceLabel = labelFrom(CONFIDENCE_LABELS);
export const contributorRoleLabel = labelFrom(CONTRIBUTOR_ROLE_LABELS);
export const compositionStatusLabel = labelFrom(COMPOSITION_STATUS_LABELS);
export const sourceStatusLabel = labelFrom(SOURCE_STATUS_LABELS);
