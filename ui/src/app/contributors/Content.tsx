'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import InlineEdit from '@/components/InlineEdit';
import SourceTypeBadge from '@/components/SourceTypeBadge';
import TierBadge from '@/components/TierBadge';
import EvalSection, { DimensionGrid } from '@/components/EvalSection';
import { stanceLabel, strengthTierLabel } from '@/lib/enumLabels';
import { formatDate } from '@/lib/formatDate';
import { pageIcon } from '@/lib/pageIcons';
import { IconExternalLink } from '@tabler/icons-react';
import s from '../shared.module.scss';

const ContributorsIcon = pageIcon('contributors');
import ps from './page.module.scss';

interface ContributorListItem {
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

interface Position {
  claim_id: number;
  statement: string;
  stance: string;
  strength: number | null;
  evidence_content: string;
  source_title: string;
}

interface Contributions {
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

interface ContributorDetail {
  id: number;
  name: string;
  affiliation: string | null;
  role: string | null;
  bio: string | null;
  avatar: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  tier: number | null;
  expertise: number | null;
  authority: number | null;
  reach: number | null;
  reputation: number | null;
  score_notes: string | null;
  evaluated_at: string | null;
  contributions: Contributions | null;
  sources: {
    id: number;
    title: string;
    source_type: string;
    url: string | null;
    published_date: string | null;
    status: string;
    contributor_role: string;
  }[];
  positions: Position[];
}

function groupByStance(positions: Position[]): Record<string, Position[]> {
  const groups: Record<string, Position[]> = {};
  for (const p of positions) {
    const key = p.stance || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return groups;
}

const STANCE_ORDER = ['supporting', 'contradicting', 'qualifying', 'other'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
}

export default function ContributorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contributors, setContributors] = useState<ContributorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ContributorDetail | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const selectedId = searchParams.get('id');
  const search = searchParams.get('search') || '';

  const setFilter = useCallback(
    (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set(key, val);
      else params.delete(key);
      router.push(`/contributors?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    setLoading(true);
    fetch('/api/contributors')
      .then((r) => r.json())
      .then((d) => setContributors(d.contributors || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    fetch(`/api/contributors/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(console.error);
  }, [selectedId]);

  const patchContributor = async (field: string, value: string) => {
    if (!selectedId) return;
    await fetch(`/api/contributors/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    const r = await fetch(`/api/contributors/${selectedId}`);
    setDetail(await r.json());
  };

  const filtered = search
    ? contributors.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.affiliation || '').toLowerCase().includes(search.toLowerCase())
    )
    : contributors;

  const stanceGroups = detail ? groupByStance(detail.positions) : {};

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><ContributorsIcon size={32} stroke={2} className={s.pageIcon} />Contributors</h1>
      </div>

      <div className={s.filters}>
        <input
          className={s.searchInput}
          type="text"
          placeholder="Search contributors..."
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
      </div>

      {loading ? (
        <div className={s.loading}>Loading contributors...</div>
      ) : (
        <div className={s.splitLayout}>
          <div className={s.listPanel}>
            {filtered.length === 0 ? (
              <div className={s.empty}>No contributors found</div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  className={String(c.id) === selectedId ? s.listItemActive : s.listItem}
                  onClick={() => setFilter('id', String(c.id))}
                >
                  <div className={ps.listItemRow}>
                    {c.avatar ? (
                      <img src={c.avatar} alt="" className={ps.avatar} />
                    ) : (
                      <span className={ps.avatarPlaceholder}>
                        {getInitials(c.name)}
                      </span>
                    )}
                    <div className={ps.listItemContent}>
                      <div className={s.listItemTitle}>{c.name}</div>
                      <div className={s.listItemMeta}>
                        {c.affiliation || 'No affiliation'}
                        {' · '}
                        {c.claim_count} claim{c.claim_count !== 1 ? 's' : ''}
                        {' · '}
                        {c.source_count} source{c.source_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={s.detailPanel}>
            {!detail ? (
              <div className={s.emptyDetail}>Select a contributor to view details</div>
            ) : (
              <>
                <div className={ps.contributorHeader}>
                  <button
                    className={ps.avatarButton}
                    onClick={() => setAvatarModalOpen(true)}
                    title="Edit avatar"
                  >
                    {detail.avatar ? (
                      <img src={detail.avatar} alt="" className={ps.avatar} />
                    ) : (
                      <span className={ps.avatarPlaceholder}>
                        {getInitials(detail.name)}
                      </span>
                    )}
                  </button>
                  <div className={ps.headerInfo}>
                    <div className={ps.headerName}>{detail.name}</div>
                    <div className={ps.headerMeta}>
                      {detail.affiliation || 'No affiliation'}
                      {detail.role && <> &middot; {detail.role}</>}
                    </div>
                    <TierBadge tier={detail.tier} />
                  </div>
                </div>

                {avatarModalOpen && (
                  <div className={ps.modalOverlay} onClick={() => setAvatarModalOpen(false)}>
                    <div className={ps.modal} onClick={(e) => e.stopPropagation()}>
                      <div className={ps.modalHeader}>
                        <span>Avatar URL</span>
                        <button className={ps.modalClose} onClick={() => setAvatarModalOpen(false)}>
                          &times;
                        </button>
                      </div>
                      {detail.avatar && (
                        <img src={detail.avatar} alt="" className={ps.modalPreview} />
                      )}
                      <InlineEdit
                        value={detail.avatar}
                        onSave={async (v) => { await patchContributor('avatar', v); setAvatarModalOpen(false); }}
                        placeholder="Paste avatar image URL..."
                      />
                    </div>
                  </div>
                )}

                <div className={s.detailSection}>
                  <InlineEdit
                    value={detail.bio}
                    onSave={(v) => patchContributor('bio', v)}
                    multiline
                    placeholder="Add bio..."
                  />
                </div>

                <div className={ps.fieldGrid}>
                  <div className={s.detailSection}>
                    <div className={s.detailLabel}>Affiliation</div>
                    <InlineEdit
                      value={detail.affiliation}
                      onSave={(v) => patchContributor('affiliation', v)}
                      placeholder="Add affiliation..."
                    />
                  </div>

                  <div className={s.detailSection}>
                    <div className={s.detailLabel}>Role</div>
                    <InlineEdit
                      value={detail.role}
                      onSave={(v) => patchContributor('role', v)}
                      placeholder="Add role..."
                    />
                  </div>

                  <div className={s.detailSection}>
                    <div className={s.detailLabel}>Website</div>
                    <div className={ps.urlRow}>
                      <InlineEdit
                        value={detail.website}
                        onSave={(v) => patchContributor('website', v)}
                        placeholder="Add website..."
                      />
                      {detail.website && (
                        <a
                          href={detail.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={ps.launchBtn}
                          title="Open in new tab"
                        >
                          <IconExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {detail.tier != null && (
                  <EvalSection
                    label="Contributor Evaluation"
                    evaluatedAt={detail.evaluated_at}
                    notes={detail.score_notes}
                  >
                    <DimensionGrid
                      dimensions={{
                        Expertise: detail.expertise,
                        Authority: detail.authority,
                        Reach: detail.reach,
                        Reputation: detail.reputation,
                      }}
                      columns={4}
                    />
                  </EvalSection>
                )}

                <hr className={s.divider} />

                <div className={s.detailSection}>
                  <div className={s.detailLabel}>Sources ({detail.sources.length})</div>
                  {detail.sources.length === 0 ? (
                    <div className={s.detailValue}>No sources linked</div>
                  ) : (
                    <div className={s.claimList}>
                      {detail.sources.map((src) => (
                        <Link key={src.id} href={`/sources?id=${src.id}`} className={ps.sourceRow}>
                          <div className={ps.sourceTitle}>{src.title}</div>
                          <div className={ps.sourceMeta}>
                            <SourceTypeBadge type={src.source_type} size={13} />
                            {src.published_date && (
                              <><span>&middot;</span><span>{formatDate(src.published_date)}</span></>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <hr className={s.divider} />

                <div className={s.detailSection}>
                  <div className={s.detailLabel}>
                    Positions ({detail.positions.length})
                  </div>
                  {detail.positions.length === 0 ? (
                    <div className={s.detailValue}>No positions recorded</div>
                  ) : (
                    STANCE_ORDER.filter((stance) => stanceGroups[stance]).map((stance) => (
                      <div key={stance}>
                        <div className={s.detailLabel}>{stanceLabel(stance)}</div>
                        <div className={s.claimList}>
                          {stanceGroups[stance].map((p, i) => (
                            <Link
                              key={`${p.claim_id}-${i}`}
                              href={`/claims/${p.claim_id}`}
                              className={s.claimRow}
                            >
                              <span className={s.claimScore}>
                                #{p.claim_id}{p.strength != null ? ` · ${strengthTierLabel(String(p.strength))}` : ''}
                              </span>
                              {' '}
                              <span className={s.claimStatement}>
                                {p.statement}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
