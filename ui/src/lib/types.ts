// =============================================================================
// Centralized Domain Types
// =============================================================================
// Canonical type definitions extracted from component files across the UI.
// Component-specific Props interfaces remain in their respective component files.
// =============================================================================

// -----------------------------------------------------------------------------
// Shared / Cross-Domain
// -----------------------------------------------------------------------------

/**
 * Flat representation of a hierarchical option for multi-select dropdowns
 * and tree-flattening utilities.
 * Merged from: MultiSelectDropdown.tsx, ClaimsList.tsx
 */
export interface FlatOption {
  id: number;
  name: string;
  depth: number;
  childIds: number[];
  parentId: number | null;
}

// -----------------------------------------------------------------------------
// Topics
// -----------------------------------------------------------------------------

/**
 * Recursive topic tree node used across the topic tree sidebar, TopicFlow
 * graph, and ClaimsList topic filter.
 * Merged from: topics/Content.tsx (TopicNode), TopicFlow.tsx (TopicTree),
 *              ClaimsList.tsx (TopicNode)
 * Fields present only in some versions are marked optional.
 */
export interface TopicNode {
  id: number;
  name: string;
  parent_topic_id?: number | null;
  claim_count?: number;
  evidence_count?: number;
  source_count?: number;
  avg_claim_score?: number | null;
  description?: string | null;
  children: TopicNode[];
}

/**
 * Row-level claim data shown in topic detail views and tag detail views.
 * From: topics/Content.tsx, tags/Content.tsx
 */
export interface ClaimRow {
  id: number;
  statement: string;
  claim_type: string;
  computed_confidence: string;
  score: number;
  supporting_sources: number;
  contradicting_sources: number;
  supporting_evidence: number;
  contradicting_evidence: number;
}

/**
 * Full topic detail returned by /api/topics/:id.
 * From: topics/Content.tsx
 */
export interface TopicDetail {
  id: number;
  name: string;
  description: string | null;
  parent_topic_id: number | null;
  parent_name: string | null;
  claims: ClaimRow[];
  strongest: ClaimRow[];
  source_count: number;
  avg_claim_score: number | null;
}

// -----------------------------------------------------------------------------
// Claims
// -----------------------------------------------------------------------------

/**
 * Evidence record linked to a claim.
 * From: claims/[id]/page.tsx
 */
export interface Evidence {
  id: number;
  content: string;
  evidence_type: string;
  verbatim_quote: string | null;
  stance: string;
  strength: number | null;
  strength_notes: string | null;
  source_id: number;
  source_title: string;
  source_type: string;
  credibility: number | null;
  contributors: string;
  abstraction_level: string | null;
  assumed_expertise: string | null;
}

/**
 * Claim-to-claim link.
 * From: claims/[id]/page.tsx
 */
export interface ClaimLink {
  id: number;
  related_claim_id: number;
  related_statement: string;
  related_claim_type: string;
  related_confidence: string | null;
  related_score: number | null;
  link_type: string;
  direction: string;
}

/**
 * Shared source reference used by SourceLinkList component.
 */
export interface SourceLinkItem {
  id: number;
  title: string;
  source_type: string;
  publication: string | null;
  main_contributor: string | null;
  published_date: string | null;
}

/**
 * Source reference on a claim.
 * From: claims/[id]/page.tsx
 */
export interface ClaimSource extends SourceLinkItem {
  is_key?: boolean;
  confidence?: string;
  conviction?: string;
}

/**
 * Rhetorical device linked to a claim.
 * From: claims/[id]/page.tsx
 */
export interface Device {
  id: number;
  content: string;
  device_type: string;
  effectiveness_note: string | null;
  source_id: number;
  source_title: string;
  contributors: string | null;
}

/**
 * Boundary condition / context linked to a claim.
 * From: claims/[id]/page.tsx
 */
export interface Context {
  id: number;
  content: string;
  context_type: string;
  source_id: number;
  source_title: string;
  contributors: string | null;
}

/**
 * Application method linked to a claim.
 * From: claims/[id]/page.tsx
 */
export interface Method {
  id: number;
  content: string;
  method_type: string;
  source_id: number;
  source_title: string;
  contributors: string | null;
  abstraction_level: string | null;
  assumed_expertise: string | null;
}

/**
 * Reasoning that links a piece of evidence to a claim.
 * From: claims/[id]/page.tsx
 */
export interface Reasoning {
  id: number;
  content: string;
  reasoning_type: string;
  evidence_id: number;
  claim_id: number;
  source_id: number;
  source_title: string;
}

/**
 * Evaluation results stored as JSON on a claim.
 * From: claims/[id]/page.tsx
 */
export interface ClaimEvaluation {
  validity?: Record<string, number | string>;
  substance?: Record<string, number | string>;
  evaluated_at?: string;
}

/**
 * Compact child/parent claim representation (used for hierarchy display).
 * From: claims/[id]/page.tsx
 */
export interface ChildClaim {
  id: number;
  statement: string;
  claim_type: string;
  computed_confidence: string;
  score: number;
}

/**
 * Full claim detail returned by /api/claims/:id.
 * From: claims/[id]/page.tsx
 */
export interface ClaimDetail {
  id: number;
  statement: string;
  claim_type: string;
  abstraction_level: string | null;
  assumed_expertise: string | null;
  parent_claim_id: number | null;
  parent_claim: ChildClaim | null;
  children: ChildClaim[];
  reviewer_notes: string | null;
  decomposition_notes: string | null;
  evaluation_results: ClaimEvaluation | null;
  created_at: string;
  updated_at: string;
  computed_confidence: string;
  score: number;
  supporting_sources: number;
  contradicting_sources: number;
  topics: { id: number; name: string }[];
  themes: { id: number; name: string }[];
  tags: string[];
  sources: ClaimSource[];
  evidence: Evidence[];
  devices: Device[];
  contexts: Context[];
  methods: Method[];
  reasonings: Reasoning[];
  links: ClaimLink[];
}

/**
 * Rich claim list item used in ClaimsList component.
 * From: ClaimsList.tsx
 */
export interface Claim {
  id: number;
  statement: string;
  claim_type: string;
  parent_claim_id: number | null;
  computed_confidence: string;
  score: number;
  supporting_sources: number;
  contradicting_sources: number;
  supporting_evidence: number;
  contradicting_evidence: number;
  qualifying_evidence: number;
  topics: string[];
  themes: string[];
  tags: string[];
  device_count: number;
  context_count: number;
  method_count: number;
  reasoning_count: number;
  child_count: number;
  is_key?: boolean;
}

/**
 * Minimal claim shape for the relationship graph.
 * From: ClaimGraph.tsx
 */
export interface GraphClaim {
  id: number;
  statement: string;
  claim_type: string;
  computed_confidence?: string | null;
  score?: number | null;
}

/**
 * Link data shaped for the claim graph component.
 * From: ClaimGraph.tsx
 */
export interface GraphLink {
  id: number;
  related_claim_id: number;
  related_statement: string;
  related_claim_type?: string | null;
  related_confidence?: string | null;
  related_score?: number | null;
  link_type: string;
  direction: string;
}

// -----------------------------------------------------------------------------
// Sources
// -----------------------------------------------------------------------------

/**
 * Source list item for the sources sidebar.
 * From: sources/Content.tsx
 */
export interface SourceListItem {
  id: number;
  title: string;
  source_type: string;
  format: string;
  publication: string | null;
  word_count: number;
  status: string;
  date_collected: string;
  main_contributor: string | null;
}

/**
 * Evaluation results stored as JSON on a source.
 * From: sources/Content.tsx
 */
export interface SourceEvaluation {
  quality?: Record<string, number | string>;
  rigor?: Record<string, number | string>;
  grade?: string;
  grade_notes?: string;
  evaluated_at?: string;
}

/**
 * Full source detail returned by /api/sources/:id.
 * From: sources/Content.tsx
 */
export interface SourceDetail {
  id: number;
  title: string;
  source_type: string;
  format: string;
  url: string | null;
  publication: string | null;
  published_date: string | null;
  word_count: number;
  status: string;
  created_at: string;
  summary: string | null;
  evaluation_results: SourceEvaluation | null;
  content_preview: string;
  original: string;
  content_has_more: boolean;
  distillation: string | null;
  contributors: {
    id: number;
    name: string;
    affiliation: string;
    avatar: string | null;
    contributor_role: string;
  }[];
  compositions: {
    count: number;
    items: { id: number; title: string; status: string }[];
  };
  curation_rule: {
    filter_id: number;
    name: string;
    version_id: number;
    version: number;
    content_filter: string;
    preferred_terminology: string | null;
    description: string | null;
  } | null;
  evidence: {
    total: number;
    byStance: Record<string, number>;
  };
  claims_count: number;
  key_claims: { id: number; statement: string; claim_type: string }[];
}

/**
 * Graph data for the source content explorer tab.
 * Returned by /api/sources/:id/graph
 * Hierarchical: Source → Topics → Claims → Entities
 */
export interface SourceGraphEntity {
  id: number;
  content: string;
  type: string;
}

export interface SourceGraphClaim {
  id: number;
  statement: string;
  claim_type: string;
  is_key: boolean;
  computed_confidence: string | null;
  score: number | null;
  topic_ids: number[];
  evidence: SourceGraphEntity[];
  devices: SourceGraphEntity[];
  contexts: SourceGraphEntity[];
  methods: SourceGraphEntity[];
}

export interface SourceGraphData {
  topics: { id: number; name: string }[];
  claims: SourceGraphClaim[];
}

// -----------------------------------------------------------------------------
// Contributors
// -----------------------------------------------------------------------------

/**
 * Contributor list item for the contributors sidebar.
 * From: contributors/Content.tsx
 */
export interface ContributorListItem {
  id: number;
  name: string;
  affiliation: string | null;
  role: string | null;
  avatar: string | null;
  source_count: number;
  claim_count: number;
  evidence_count: number;
  tier: number | null;
}

/**
 * A contributor's stance/position on a claim via evidence.
 * From: contributors/Content.tsx
 */
export interface Position {
  claim_id: number;
  statement: string;
  stance: string;
  strength: number | null;
  evidence_content: string;
  source_title: string;
  is_key?: boolean;
}

/**
 * Aggregate contribution statistics for a contributor.
 * From: contributors/Content.tsx
 */
export interface Contributions {
  source_count: number;
  evidence_count: number;
  claim_count: number;
  strong_evidence: number;
  moderate_evidence: number;
  weak_evidence: number;
  supporting_count: number;
  contradicting_count: number;
  qualifying_count: number;
}

/**
 * Full contributor detail returned by /api/contributors/:id.
 * From: contributors/Content.tsx
 */
export interface ContributorDetail {
  id: number;
  name: string;
  affiliation: string | null;
  role: string | null;
  bio: string | null;
  avatar: string | null;
  website: string | null;
  created_at: string;
  tier: number | null;
  expertise: number | null;
  authority: number | null;
  reach: number | null;
  reputation: number | null;
  expertise_notes: string | null;
  authority_notes: string | null;
  reach_notes: string | null;
  reputation_notes: string | null;
  evaluated_at: string | null;
  contributions: Contributions | null;
  sources: (SourceLinkItem & {
    url: string | null;
    status: string;
    contributor_role: string;
  })[];
  positions: Position[];
}

// -----------------------------------------------------------------------------
// Filters
// -----------------------------------------------------------------------------

/**
 * Content filter list item for the filters sidebar.
 * From: filters/Content.tsx
 */
export interface FilterListItem {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  current_version: number;
  sources_applied: number;
}

/**
 * A single immutable version of a curation rule.
 * From: filters/Content.tsx
 */
export interface FilterVersion {
  version_id: number;
  version: number;
  content_filter: string;
  preferred_terminology: string | null;
  version_created_at: string;
}

/**
 * Full filter detail returned by /api/filters/:id.
 * From: filters/Content.tsx
 */
export interface FilterDetail {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  versions: FilterVersion[];
}

// -----------------------------------------------------------------------------
// Tags
// -----------------------------------------------------------------------------

/**
 * Tag summary with associated claim count.
 * From: tags/Content.tsx
 */
export interface TagItem {
  tag: string;
  claim_count: number;
}

/**
 * Grouping of tags by prefix for display.
 * From: tags/Content.tsx
 */
export interface TagGroup {
  prefix: string;
  tags: TagItem[];
}

// -----------------------------------------------------------------------------
// Compositions
// -----------------------------------------------------------------------------

/**
 * Composition list item for the compositions sidebar.
 * From: compositions/Content.tsx
 */
export interface CompositionListItem {
  id: number;
  title: string;
  word_count: number;
  status: string;
  created_at: string;
}

/**
 * Source reference within a composition.
 * From: compositions/Content.tsx
 */
export interface CompositionSource extends SourceLinkItem {
  url: string | null;
  word_count: number;
  status: string;
  contribution_note: string | null;
}

/**
 * Evaluation results stored as JSON on a composition.
 * From: compositions/Content.tsx
 */
export interface CompositionEvaluation {
  quality?: number | null;
  completeness?: number | null;
  voice_consistency?: number | null;
  decomposition_readiness?: number | null;
  evaluation_notes?: string | null;
  evaluated_at?: string;
}

/**
 * Full composition detail returned by /api/compositions/:id.
 * From: compositions/Content.tsx
 */
export interface CompositionDetail {
  id: number;
  title: string;
  content: string;
  word_count: number;
  evaluation_results: CompositionEvaluation | null;
  status: string;
  created_at: string;
  updated_at: string;
  sources: CompositionSource[];
  claim_count: number;
}

// -----------------------------------------------------------------------------
// Dashboard
// -----------------------------------------------------------------------------

/**
 * Full dashboard payload returned by /api/dashboard.
 * From: page.tsx (root dashboard)
 */
export interface DashboardData {
  counts: {
    sources: number;
    claims: number;
    contributors: number;
  };
  distributions: {
    claimConfidence: Record<string, number>;
    sourceGrades: Record<string, number>;
    contributorTiers: Record<string, number>;
  };
  evalAverages: {
    claimValidity: Record<string, number | null>;
    claimSubstance: Record<string, number | null>;
    sourceQuality: Record<string, number | null>;
    sourceRigor: Record<string, number | null>;
  };
  topicCoverage: {
    topic_id: number;
    topic_name: string;
    claim_count: number;
    avg_claim_score: number;
  }[];
  themeStrength: {
    theme_id: number;
    theme_name: string;
    thesis: string;
    claim_count: number;
    topics_spanned: number;
    avg_claim_score: number;
    well_supported_claims: number;
    contested_claims: number;
  }[];
  topContributors: {
    id: number;
    name: string;
    affiliation: string | null;
    avatar: string | null;
    tier: number | null;
    claim_count: number;
    source_count: number;
  }[];
  thinClaims: {
    ref_id: string;
    display_text: string;
    computed_confidence: string;
    score: number;
    supporting_sources: number;
    contradicting_sources: number;
  }[];
  thinClaimsTotal: number;
}
