'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import InlineEdit from '@/components/InlineEdit';
import Tabs from '@/components/Tabs';
import { claimTypeLabel, abstractionLevelLabel, assumedExpertiseLabel } from '@/lib/enumLabels';
import type { ClaimDetail } from '@/lib/types';
import ClaimAbout from './tabs/ClaimAbout';
import ClaimEvidenceTab from './tabs/ClaimEvidenceTab';
import ClaimRelationshipsTab from './tabs/ClaimRelationshipsTab';
import ClaimEntitiesTab from './tabs/ClaimEntitiesTab';
import s from './page.module.scss';

type Tab = 'connections' | 'evidence' | 'devices' | 'contexts' | 'methods';

export default function ClaimDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('connections');

  const load = useCallback(() => {
    fetch(`/api/claims/${id}`)
      .then((r) => r.json())
      .then(setClaim)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const patchClaim = async (field: string, value: string) => {
    await fetch(`/api/claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    load();
  };

  const removeTopic = async (topicId: number) => {
    await fetch(`/api/claims/${id}/topics/${topicId}`, { method: 'DELETE' });
    load();
  };

  const removeTheme = async (themeId: number) => {
    await fetch(`/api/claims/${id}/themes/${themeId}`, { method: 'DELETE' });
    load();
  };

  const removeTag = async (tag: string) => {
    await fetch(`/api/claims/${id}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className={s.loading}>Loading claim...</div>;
  if (!claim) return <div className={s.empty}>Claim not found</div>;

  const connectionsCount =
    (claim.parent_claim ? 1 : 0) + claim.children.length + claim.links.length;

  const tabs: { key: string; label: string; count: number }[] = [
    { key: 'connections', label: 'Relationships', count: connectionsCount },
    { key: 'evidence', label: 'Evidence', count: claim.evidence.length },
    { key: 'devices', label: 'Rhetorical Devices', count: claim.devices.length },
    { key: 'contexts', label: 'Contexts', count: claim.contexts.length },
    { key: 'methods', label: 'Application', count: claim.methods.length },
  ].filter((t) => t.count > 0);

  const activeTab = tabs.find((t) => t.key === tab) ? tab : (tabs[0]?.key as Tab);

  return (
    <div className={s.page}>
      {/* ── Hero: just the claim identity ──────────────────────────── */}
      <button onClick={() => router.back()} className={s.backLink}>
        &larr; Back
      </button>

      <div className={s.claimHeader}>
        <span className={s.claimId}>CLAIM #{claim.id}</span>
      </div>

      <div className={s.classificationBox}>
        <div className={s.classificationItem}>
          <span className={s.classificationLabel}>Claim Type</span>
          <span className={s.classificationValue}>{claimTypeLabel(claim.claim_type)}</span>
        </div>
        {claim.abstraction_level && (
          <div className={s.classificationItem}>
            <span className={s.classificationLabel}>Abstraction</span>
            <span className={s.classificationValue}>{abstractionLevelLabel(claim.abstraction_level)}</span>
          </div>
        )}
        {claim.assumed_expertise && (
          <div className={s.classificationItem}>
            <span className={s.classificationLabel}>Expertise</span>
            <span className={s.classificationValue}>{assumedExpertiseLabel(claim.assumed_expertise)}</span>
          </div>
        )}
        <span className={s.classificationSpacer} />
        <ConfidenceBadge confidence={claim.computed_confidence} score={claim.score} />
      </div>

      <blockquote className={s.statementBox}>
        <InlineEdit
          value={claim.statement}
          onSave={(v) => patchClaim('statement', v)}
          multiline
          placeholder="Claim statement..."
        />
      </blockquote>

      <ClaimAbout
        claim={claim}
        patchClaim={patchClaim}
        onRemoveTopic={removeTopic}
        onRemoveTheme={removeTheme}
        onRemoveTag={removeTag}
      />

      {/* ── Tab bar ────────────────────────────────────────────────── */}
      <Tabs tabs={tabs} active={activeTab} onChange={(key) => setTab(key as Tab)} />

      {/* ── Tab content ────────────────────────────────────────────── */}
      <div className={s.tabContent}>
        {activeTab === 'connections' && (
          <ClaimRelationshipsTab claim={claim} />
        )}

        {activeTab === 'evidence' && (
          <ClaimEvidenceTab evidence={claim.evidence} reasonings={claim.reasonings} />
        )}

        {(activeTab === 'devices' || activeTab === 'contexts' || activeTab === 'methods') && (
          <ClaimEntitiesTab
            entityType={activeTab}
            devices={claim.devices}
            contexts={claim.contexts}
            methods={claim.methods}
          />
        )}
      </div>
    </div>
  );
}
