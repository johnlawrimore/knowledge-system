'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { pageIcon } from '@/lib/pageIcons';
import s from '../shared.module.scss';

const TopicsIcon = pageIcon('topics');

interface TopicNode {
  id: number;
  name: string;
  description: string | null;
  parent_topic_id: number | null;
  claim_count: number;
  evidence_count: number;
  source_count: number;
  avg_claim_score: number | null;
  children: TopicNode[];
}

interface ClaimRow {
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

interface TopicDetail {
  id: number;
  name: string;
  description: string | null;
  parent_topic_id: number | null;
  claims: ClaimRow[];
  strongest: ClaimRow[];
  weakest: ClaimRow[];
}

function countAllClaims(node: TopicNode): number {
  let total = node.claim_count;
  for (const child of node.children) {
    total += countAllClaims(child);
  }
  return total;
}

function TreeNode({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: TopicNode;
  selectedId: string | null;
  onSelect: (id: number) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isActive = String(node.id) === selectedId;

  return (
    <div>
      <div
        className={isActive ? s.treeItemActive : s.treeItem}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren && (
          <span
            className={s.treeToggle}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? '\u25BE' : '\u25B8'}
          </span>
        )}
        {!hasChildren && <span className={s.treeToggle}>&nbsp;</span>}
        {node.name}
        <span className={s.treeCount}>({countAllClaims(node)})</span>
      </div>
      {hasChildren && expanded && (
        <div className={s.treeChildren}>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimSection({ title, claims }: { title: string; claims: ClaimRow[] }) {
  if (claims.length === 0) return null;
  return (
    <div className={s.detailSection}>
      <div className={s.detailLabel}>{title}</div>
      <div className={s.claimList}>
        {claims.map((c) => (
          <Link key={c.id} href={`/claims/${c.id}`} className={s.claimRow}>
            <span className={s.claimScore}>
              <ConfidenceBadge confidence={c.computed_confidence} score={c.score} />
            </span>{' '}
            <span className={s.claimStatement}>{c.statement}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function TopicsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TopicDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedId = searchParams.get('id');

  const selectTopic = useCallback(
    (id: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('id', String(id));
      router.push(`/topics?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    setLoading(true);
    fetch('/api/topics')
      .then((r) => r.json())
      .then((d) => setTopics(d.topics || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/topics/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(console.error)
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  // Compute aggregate stats from the flat topic list for the selected topic
  function findNode(nodes: TopicNode[], id: number): TopicNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const selectedNode = selectedId ? findNode(topics, Number(selectedId)) : null;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}><TopicsIcon size={32} stroke={2} className={s.pageIcon} />Topics</h1>
      </div>

      {loading ? (
        <div className={s.loading}>Loading topics...</div>
      ) : (
        <div className={s.splitLayout}>
          <div className={s.listPanel}>
            {topics.length === 0 ? (
              <div className={s.empty}>No topics found</div>
            ) : (
              <div className={s.tree}>
                {topics.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    selectedId={selectedId}
                    onSelect={selectTopic}
                  />
                ))}
              </div>
            )}
          </div>

          <div className={s.detailPanel}>
            {detailLoading ? (
              <div className={s.loading}>Loading topic...</div>
            ) : !detail ? (
              <div className={s.emptyDetail}>Select a topic to view details</div>
            ) : (
              <>
                <div className={s.detailTitle}>{detail.name}</div>

                {detail.description && (
                  <div className={s.detailSection}>
                    <div className={s.detailValue}>{detail.description}</div>
                  </div>
                )}

                <div className={s.detailSection}>
                  <div className={s.detailLabel}>Statistics</div>
                  <div className={s.detailValue}>
                    {detail.claims.length} claims
                    {selectedNode && <> &middot; {selectedNode.source_count} sources</>}
                    {selectedNode?.avg_claim_score != null && (
                      <> &middot; avg score: {Number(selectedNode.avg_claim_score).toFixed(1)}</>
                    )}
                  </div>
                </div>

                <hr className={s.divider} />

                <ClaimSection title="Strongest Claims" claims={detail.strongest} />
                <ClaimSection title="Weakest Claims" claims={detail.weakest} />

                {detail.claims.length > 0 && (
                  <>
                    <hr className={s.divider} />
                    <div className={s.detailSection}>
                      <div className={s.detailLabel}>All Claims ({detail.claims.length})</div>
                      <div className={s.claimList}>
                        {detail.claims.map((c) => (
                          <Link key={c.id} href={`/claims/${c.id}`} className={s.claimRow}>
                            <span className={s.claimScore}>
                              <ConfidenceBadge confidence={c.computed_confidence} score={c.score} />
                            </span>{' '}
                            <span className={s.claimStatement}>{c.statement}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
