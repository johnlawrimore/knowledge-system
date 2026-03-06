'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { claimTypeLabel } from '@/lib/enumLabels';
import { sourceTypeLabel } from '@/lib/sourceTypes';
import type { SourceGraphData, SourceGraphClaim } from '@/lib/types';
import f from './SourceContentGraph.module.scss';

/* ── Props ───────────────────────────────────────────────────────── */

export interface SourceContentGraphProps {
  sourceId: number;
  sourceTitle: string;
  sourceType: string;
  data: SourceGraphData;
}

/* ── Node data types ─────────────────────────────────────────────── */

interface SourceFocalData { title: string; sourceType: string; [k: string]: unknown }
interface TopicData { name: string; topicId: number; [k: string]: unknown }
interface ClaimData {
  claimId: number; statement: string; claimType: string; isKey: boolean;
  confidence: string | null; score: number | null;
  entitySummary: string;
  [k: string]: unknown;
}
interface EntityData { content: string; entityType: string; category: string; [k: string]: unknown }

/* ── Layout constants ────────────────────────────────────────────── */

const SOURCE_W = 320;   // 20rem
const TOPIC_W  = 160;   // rough avg, variable
const CLAIM_W  = 224;   // 14rem
const ENTITY_W = 176;   // 11rem

const TIER_GAP     = 120;  // vertical gap between tiers
const TOPIC_GAP    = 40;   // horizontal gap between topic columns
const CLAIM_GAP_Y  = 16;   // vertical gap between claims in a column
const ENTITY_GAP_X = 12;   // horizontal gap between entity nodes
const ENTITY_GAP_Y = 80;   // vertical gap from claim to entities

const CLAIM_H      = 100;  // approximate claim node height
const ENTITY_H     = 60;   // approximate entity node height

/* ── Color config ────────────────────────────────────────────────── */

const COLORS = {
  source:   'var(--accent-green)',
  topic:    'var(--accent-purple)',
  keyClaim: 'var(--accent-amber)',
  claim:    'var(--border-subtle)',
  evidence: 'var(--accent-cyan)',
  device:   'var(--accent-pink)',
  context:  'var(--accent-orange)',
  method:   'var(--accent-green)',
};

const ENTITY_LABEL: Record<string, string> = {
  evidence: 'Ev',
  devices: 'Dev',
  contexts: 'Ctx',
  methods: 'Mtd',
};

/* ── Helpers ─────────────────────────────────────────────────────── */

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '\u2026' : s;
}

function entitySummary(c: SourceGraphClaim): string {
  const parts: string[] = [];
  if (c.evidence?.length) parts.push(`${c.evidence.length} ev`);
  if (c.devices?.length) parts.push(`${c.devices.length} dev`);
  if (c.contexts?.length) parts.push(`${c.contexts.length} ctx`);
  if (c.methods?.length) parts.push(`${c.methods.length} mtd`);
  return parts.join(' \u00B7 ');
}

/* ── Node renderers ──────────────────────────────────────────────── */

function SourceFocalRenderer({ data }: NodeProps) {
  const d = data as SourceFocalData;
  return (
    <div className={f.sourceFocalNode}>
      <Handle id="b" type="source" position={Position.Bottom} className={f.handle} />
      <div className={f.nodeHead}>
        <span className={f.typeBadge}>{sourceTypeLabel(d.sourceType)}</span>
      </div>
      <div className={f.focalTitle}>{trunc(d.title, 120)}</div>
    </div>
  );
}

function TopicRenderer({ data }: NodeProps) {
  const d = data as TopicData;
  return (
    <div className={f.topicNode}>
      <Handle id="t" type="target" position={Position.Top} className={f.handle} />
      <Handle id="b" type="source" position={Position.Bottom} className={f.handle} />
      <span className={f.topicLabel}>{trunc(d.name, 28)}</span>
    </div>
  );
}

function ClaimRenderer({ data }: NodeProps) {
  const d = data as ClaimData;
  const cls = d.isKey ? f.keyClaimNode : f.claimNode;
  return (
    <div className={cls}>
      <Handle id="t" type="target" position={Position.Top} className={f.handle} />
      <Handle id="b" type="source" position={Position.Bottom} className={f.handle} />
      <div className={f.nodeHead}>
        <div className={f.nodeHeadLeft}>
          {d.isKey && <span className={f.keyBadge}>Key</span>}
          <span className={f.typeBadge}>{claimTypeLabel(d.claimType)}</span>
        </div>
        <span className={f.idLabel}>#{d.claimId}</span>
      </div>
      <div className={f.nodeText}>{trunc(d.statement, 100)}</div>
      <div className={f.entityMeta}>
        {d.confidence && <ConfidenceBadge confidence={d.confidence} score={d.score} />}
        {d.entitySummary && <span className={f.entityCount}>{d.entitySummary}</span>}
      </div>
    </div>
  );
}

function EntityRenderer({ data }: NodeProps) {
  const d = data as EntityData;
  const catColor = d.category === 'evidence' ? COLORS.evidence
    : d.category === 'devices' ? COLORS.device
    : d.category === 'contexts' ? COLORS.context
    : COLORS.method;
  return (
    <div className={f.entityNode} style={{ borderColor: catColor }}>
      <Handle id="t" type="target" position={Position.Top} className={f.handle} />
      <div className={f.nodeHead}>
        <span className={f.typeBadge}>{ENTITY_LABEL[d.category] || d.category}</span>
        <span className={f.typeBadge}>{d.entityType}</span>
      </div>
      <div className={f.entityText}>{trunc(d.content, 70)}</div>
    </div>
  );
}

const nodeTypes = {
  sourceFocal: SourceFocalRenderer,
  topic: TopicRenderer,
  claim: ClaimRenderer,
  entity: EntityRenderer,
};

/* ── Main component ──────────────────────────────────────────────── */

export default function SourceContentGraph({
  sourceTitle,
  sourceType,
  data,
}: SourceContentGraphProps) {
  const router = useRouter();

  const handleNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    if (node.type === 'claim') {
      const d = node.data as ClaimData;
      router.push(`/claims/${d.claimId}`);
    }
    if (node.type === 'topic') {
      const d = node.data as TopicData;
      router.push(`/claims?topic=${d.topicId}`);
    }
  }, [router]);

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];

    // ── Organize claims under topics
    // Each claim assigned to its first topic; claims with no topic go under "General"
    const topicMap = new Map(data.topics.map((t) => [t.id, t.name]));
    interface TopicColumn {
      topicId: number | null;
      name: string;
      claims: SourceGraphClaim[];
    }
    const columnMap = new Map<number | null, TopicColumn>();

    for (const claim of data.claims) {
      const tids = claim.topic_ids || [];
      const tid = tids.length > 0 ? tids[0] : null;
      if (!columnMap.has(tid)) {
        columnMap.set(tid, {
          topicId: tid,
          name: tid !== null ? (topicMap.get(tid) || 'Unknown') : 'General',
          claims: [],
        });
      }
      columnMap.get(tid)!.claims.push(claim);
    }

    const columns = [...columnMap.values()];

    // ── Calculate column widths
    // Each column's width is based on the widest tier within it
    // Tier 3 (entities): each claim may have entities fanning out horizontally
    function claimEntityWidth(c: SourceGraphClaim): number {
      const entityCount = (c.evidence?.length || 0) + (c.devices?.length || 0) + (c.contexts?.length || 0) + (c.methods?.length || 0);
      if (entityCount === 0) return CLAIM_W;
      return Math.max(CLAIM_W, entityCount * (ENTITY_W + ENTITY_GAP_X) - ENTITY_GAP_X);
    }

    function columnWidth(col: TopicColumn): number {
      if (col.claims.length === 0) return TOPIC_W;
      const maxEntityRow = Math.max(...col.claims.map(claimEntityWidth));
      return Math.max(TOPIC_W, CLAIM_W, maxEntityRow);
    }

    const colWidths = columns.map(columnWidth);
    const totalWidth = colWidths.reduce((s, w) => s + w, 0) + (columns.length - 1) * TOPIC_GAP;

    // ── Tier 0: Source focal
    const sourceX = -SOURCE_W / 2;
    const sourceY = 0;
    ns.push({
      id: 'source',
      type: 'sourceFocal',
      position: { x: sourceX, y: sourceY },
      data: { title: sourceTitle, sourceType } as SourceFocalData,
      draggable: false,
    });

    // ── Tier 1: Topics
    const topicY = sourceY + TIER_GAP;
    let colX = -totalWidth / 2;

    columns.forEach((col, ci) => {
      const cw = colWidths[ci];
      const topicCenterX = colX + cw / 2;
      const topicId = col.topicId !== null ? `topic-${col.topicId}` : 'topic-general';

      ns.push({
        id: topicId,
        type: 'topic',
        position: { x: topicCenterX - TOPIC_W / 2, y: topicY },
        data: { name: col.name, topicId: col.topicId ?? 0 } as TopicData,
        draggable: false,
      });

      // Source → topic edge
      es.push({
        id: `e-s-${topicId}`,
        source: 'source', sourceHandle: 'b',
        target: topicId, targetHandle: 't',
        type: 'smoothstep',
        style: { stroke: COLORS.topic, strokeWidth: 1.5 },
      });

      // ── Tier 2: Claims within this column
      const claimY0 = topicY + TIER_GAP;
      let claimY = claimY0;

      for (const claim of col.claims) {
        const claimNodeId = `claim-${claim.id}`;
        const claimCenterX = topicCenterX;

        ns.push({
          id: claimNodeId,
          type: 'claim',
          position: { x: claimCenterX - CLAIM_W / 2, y: claimY },
          data: {
            claimId: claim.id,
            statement: claim.statement,
            claimType: claim.claim_type,
            isKey: claim.is_key,
            confidence: claim.computed_confidence,
            score: claim.score,
            entitySummary: entitySummary(claim),
          } as ClaimData,
          draggable: false,
        });

        // Topic → claim edge
        es.push({
          id: `e-${topicId}-${claimNodeId}`,
          source: topicId, sourceHandle: 'b',
          target: claimNodeId, targetHandle: 't',
          type: 'smoothstep',
          style: {
            stroke: claim.is_key ? COLORS.keyClaim : 'var(--border-default)',
            strokeWidth: claim.is_key ? 1.5 : 1,
          },
        });

        // ── Tier 3: Entities under this claim
        const allEntities: { id: number; content: string; type: string; category: string }[] = [];
        for (const e of (claim.evidence || [])) allEntities.push({ ...e, category: 'evidence' });
        for (const d of (claim.devices || [])) allEntities.push({ ...d, category: 'devices' });
        for (const c of (claim.contexts || [])) allEntities.push({ ...c, category: 'contexts' });
        for (const m of (claim.methods || [])) allEntities.push({ ...m, category: 'methods' });

        if (allEntities.length > 0) {
          const entityRowWidth = allEntities.length * (ENTITY_W + ENTITY_GAP_X) - ENTITY_GAP_X;
          const entityStartX = claimCenterX - entityRowWidth / 2;
          const entityY = claimY + CLAIM_H + ENTITY_GAP_Y;

          allEntities.forEach((ent, ei) => {
            const entId = `ent-${ent.category}-${ent.id}`;
            const entX = entityStartX + ei * (ENTITY_W + ENTITY_GAP_X);

            ns.push({
              id: entId,
              type: 'entity',
              position: { x: entX, y: entityY },
              data: {
                content: ent.content,
                entityType: ent.type,
                category: ent.category,
              } as EntityData,
              draggable: false,
            });

            const catColor = ent.category === 'evidence' ? COLORS.evidence
              : ent.category === 'devices' ? COLORS.device
              : ent.category === 'contexts' ? COLORS.context
              : COLORS.method;

            es.push({
              id: `e-${claimNodeId}-${entId}`,
              source: claimNodeId, sourceHandle: 'b',
              target: entId, targetHandle: 't',
              type: 'smoothstep',
              style: { stroke: catColor, strokeWidth: 1, strokeDasharray: '4 3' },
            });
          });

          claimY = entityY + ENTITY_H + CLAIM_GAP_Y;
        } else {
          claimY += CLAIM_H + CLAIM_GAP_Y;
        }
      }

      colX += cw + TOPIC_GAP;
    });

    return { nodes: ns, edges: es };
  }, [sourceTitle, sourceType, data]);

  // Legend
  const hasEntities = data.claims.some(
    (c) => (c.evidence?.length || 0) + (c.devices?.length || 0) + (c.contexts?.length || 0) + (c.methods?.length || 0) > 0
  );
  const hasKey = data.claims.some((c) => c.is_key);

  return (
    <div className={f.wrapper}>
      <div className={f.flowContainer}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          onNodeClick={handleNodeClick}
          minZoom={0.1}
          maxZoom={2}
        />
      </div>
      <div className={f.legend}>
        <div className={f.legendItem}>
          <div className={f.legendSwatch} style={{ borderColor: COLORS.source, background: 'transparent' }} />
          <span className={f.legendLabel}>Source</span>
        </div>
        <div className={f.legendItem}>
          <div className={f.legendSwatch} style={{ borderColor: COLORS.topic, background: 'transparent' }} />
          <span className={f.legendLabel}>Topic</span>
        </div>
        {hasKey && (
          <div className={f.legendItem}>
            <div className={f.legendSwatch} style={{ borderColor: COLORS.keyClaim, background: 'transparent' }} />
            <span className={f.legendLabel}>Key Claim</span>
          </div>
        )}
        {hasEntities && (
          <>
            <div className={f.legendItem}>
              <div className={f.legendSwatch} style={{ borderColor: COLORS.evidence, background: 'transparent' }} />
              <span className={f.legendLabel}>Evidence</span>
            </div>
            <div className={f.legendItem}>
              <div className={f.legendSwatch} style={{ borderColor: COLORS.device, background: 'transparent' }} />
              <span className={f.legendLabel}>Device</span>
            </div>
            <div className={f.legendItem}>
              <div className={f.legendSwatch} style={{ borderColor: COLORS.context, background: 'transparent' }} />
              <span className={f.legendLabel}>Context</span>
            </div>
            <div className={f.legendItem}>
              <div className={f.legendSwatch} style={{ borderColor: COLORS.method, background: 'transparent' }} />
              <span className={f.legendLabel}>Method</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
