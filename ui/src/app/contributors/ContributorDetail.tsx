'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ContributorDetail as ContributorDetailType, Position } from '@/lib/types';
import Avatar from '@/components/Avatar';
import InlineEdit from '@/components/InlineEdit';
import SourceTypeBadge from '@/components/SourceTypeBadge';
import TierBadge from '@/components/TierBadge';
import MetaLine from '@/components/MetaLine';
import DetailSection from '@/components/DetailSection';
import EvalSection, { DimensionGrid } from '@/components/EvalSection';
import { stanceLabel, strengthTierLabel } from '@/lib/enumLabels';
import { formatDate } from '@/lib/formatDate';
import { IconExternalLink } from '@tabler/icons-react';
import s from '../shared.module.scss';
import ps from './page.module.scss';

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

interface ContributorDetailProps {
  detail: ContributorDetailType;
  onPatch: (field: string, value: string) => Promise<void>;
  onAvatarClick: () => void;
}

export default function ContributorDetailView({
  detail,
  onPatch,
  onAvatarClick,
}: ContributorDetailProps) {
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const stanceGroups = groupByStance(detail.positions);

  return (
    <>
      <div className={ps.contributorHeader}>
        <button
          className={ps.avatarButton}
          onClick={() => setAvatarModalOpen(true)}
          title="Edit avatar"
        >
          <Avatar name={detail.name} url={detail.avatar} size={96} />
        </button>
        <div className={ps.headerInfo}>
          <div className={ps.headerName}>{detail.name}</div>
          <MetaLine className={ps.headerMeta}>
            <span>{detail.affiliation || 'No affiliation'}</span>
            {detail.role && <span>{detail.role}</span>}
          </MetaLine>
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
              onSave={async (v) => { await onPatch('avatar', v); setAvatarModalOpen(false); }}
              placeholder="Paste avatar image URL..."
            />
          </div>
        </div>
      )}

      <div className={s.detailSection}>
        <InlineEdit
          value={detail.bio}
          onSave={(v) => onPatch('bio', v)}
          multiline
          placeholder="Add bio..."
        />
      </div>

      <div className={ps.fieldGrid}>
        <DetailSection label="Affiliation">
          <InlineEdit
            value={detail.affiliation}
            onSave={(v) => onPatch('affiliation', v)}
            placeholder="Add affiliation..."
          />
        </DetailSection>

        <DetailSection label="Role">
          <InlineEdit
            value={detail.role}
            onSave={(v) => onPatch('role', v)}
            placeholder="Add role..."
          />
        </DetailSection>

        <DetailSection label="Website">
          <div className={ps.urlRow}>
            <InlineEdit
              value={detail.website}
              onSave={(v) => onPatch('website', v)}
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
        </DetailSection>
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

      <DetailSection label="Sources" count={detail.sources.length}>
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
      </DetailSection>

      <hr className={s.divider} />

      <DetailSection label="Positions" count={detail.positions.length}>
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
      </DetailSection>
    </>
  );
}
