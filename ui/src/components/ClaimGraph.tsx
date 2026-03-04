'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { claimTypeLabel, linkTypeLabel } from '@/lib/enumLabels';
import { GraphClaim, GraphLink } from '@/lib/types';
import f from './ClaimGraph.module.scss';

export interface ClaimGraphProps {
  focalId: number;
  focalStatement: string;
  focalType: string;
  focalConfidence?: string | null;
  focalScore?: number | null;
  parent?: GraphClaim | null;
  children: GraphClaim[];
  links: GraphLink[];
}

/* ── Internal node data types ───────────────────────────────────── */

interface ClaimNodeData {
  claimId: number;
  statement: string;
  claimType: string;
  role: 'focal' | 'parent' | 'child' | 'leaf';
  onNavigate: (id: number) => void;
  [key: string]: unknown;
}

interface HubNodeData {
  relType: string;
  label: string;
  stroke: string;
  labelColor: string;
  [key: string]: unknown;
}

/* ── Edge config ────────────────────────────────────────────────── */

const EC: Record<string, {
  stroke: string;
  width: number;
  dash?: string;
  labelColor: string;
  arrow: boolean;
}> = {
  parent:        { stroke: 'var(--accent-purple)', width: 2,   labelColor: 'var(--accent-purple)', arrow: true },
  child:         { stroke: 'var(--accent-indigo)', width: 1.5, dash: '5 3',  labelColor: 'var(--accent-indigo)', arrow: true },
  contradicts:   { stroke: 'var(--accent-red)',    width: 2,   dash: '6 3',  labelColor: 'var(--accent-red)',    arrow: false },
  refines:       { stroke: 'var(--accent-amber)',  width: 1.5,               labelColor: 'var(--accent-amber)',  arrow: true },
  generalizes:   { stroke: 'var(--accent-cyan)',   width: 1.5,               labelColor: 'var(--accent-cyan)',   arrow: true },
  depends_on:    { stroke: 'var(--text-muted)',    width: 1.5, dash: '4 3',  labelColor: 'var(--text-secondary)',arrow: true },
  enables:       { stroke: 'var(--accent-green)',  width: 2,                 labelColor: 'var(--accent-green)',  arrow: true },
  tensions_with: { stroke: 'var(--accent-orange)', width: 1.5, dash: '7 4', labelColor: 'var(--accent-orange)', arrow: false },
  other:         { stroke: 'var(--text-placeholder)', width: 1, dash: '3 3',labelColor: 'var(--text-muted)',    arrow: false },
};

function edgeStyle(type: string) {
  const ec = EC[type] ?? EC.other;
  return {
    stroke: ec.stroke,
    strokeWidth: ec.width,
    ...(ec.dash ? { strokeDasharray: ec.dash } : {}),
  };
}

/* ── Layout constants ───────────────────────────────────────────── */

const FOCAL_W   = 272; // 17rem
const HIER_W    = 208; // 13rem
const HUB_W     = 128; // 8rem
const HUB_H     = 32;
const LEAF_W    = 192; // 12rem
const LEAF_H    = 110; // approximate height for stagger math
const LEAF_STEP = 150; // vertical step between sibling leaves
const HUB_GAP   = 16;  // vertical gap between hub slots

const FOCAL_X   = 0;
const FOCAL_Y   = 0;
const PARENT_X  = (FOCAL_W - HIER_W) / 2;  // center parent over focal
const PARENT_Y  = -266;
const CHILD_Y   = 280;
const CHILD_GAP = 252;

const RIGHT_HUB_X  = FOCAL_W + 72;                  // 344
const RIGHT_LEAF_X = RIGHT_HUB_X + HUB_W + 52;      // 524
const LEFT_HUB_X   = -(72 + HUB_W);                  // -200
const LEFT_LEAF_X  = LEFT_HUB_X - 52 - LEAF_W;      // -444

/* ── Node renderers ─────────────────────────────────────────────── */

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function FocalNodeRenderer({ data }: NodeProps) {
  const d = data as ClaimNodeData;
  return (
    <div className={f.focalNode}>
      <Handle id="t" type="target" position={Position.Top}    className={f.handle} />
      <Handle id="l" type="target" position={Position.Left}   className={f.handle} />
      <div className={f.nodeHead}>
        <span className={f.typeBadge}>{claimTypeLabel(d.claimType)}</span>
        <span className={f.claimIdLabel}>#{d.claimId}</span>
      </div>
      <div className={f.focalText}>{trunc(d.statement, 160)}</div>
      <Handle id="b" type="source" position={Position.Bottom} className={f.handle} />
      <Handle id="r" type="source" position={Position.Right}  className={f.handle} />
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  parent: 'Parent',
  child:  'Child',
};

const ROLE_CLASS: Record<string, string> = {
  parent: f.parentNode,
  child:  f.childNode,
  leaf:   f.leafNode,
};

function ClaimNodeRenderer({ data }: NodeProps) {
  const d = data as ClaimNodeData;
  const cls = ROLE_CLASS[d.role] ?? f.leafNode;
  const roleLabel = ROLE_LABEL[d.role];

  return (
    <div className={cls}>
      <Handle id="t" type="target" position={Position.Top}    className={f.handle} />
      <Handle id="l" type="target" position={Position.Left}   className={f.handle} />
      <div className={f.nodeHead}>
        <div className={f.nodeHeadLeft}>
          {roleLabel && (
            <span className={`${f.roleBadge} ${d.role === 'parent' ? f.roleBadgeParent : f.roleBadgeChild}`}>
              {roleLabel}
            </span>
          )}
          <span className={f.typeBadge}>{claimTypeLabel(d.claimType)}</span>
        </div>
        <span className={f.claimIdLabel}>#{d.claimId}</span>
      </div>
      <div className={f.nodeText}>{trunc(d.statement, 90)}</div>
      <Handle id="b" type="source" position={Position.Bottom} className={f.handle} />
      <Handle id="r" type="source" position={Position.Right}  className={f.handle} />
    </div>
  );
}

function HubNodeRenderer({ data }: NodeProps) {
  const d = data as HubNodeData;
  return (
    <div className={f.hubNode} style={{ borderColor: d.stroke }}>
      <Handle id="l" type="target" position={Position.Left}  className={f.handle} />
      <span className={f.hubLabel} style={{ color: d.labelColor }}>{d.label}</span>
      <Handle id="r" type="source" position={Position.Right} className={f.handle} />
    </div>
  );
}

const nodeTypes = {
  focal: FocalNodeRenderer,
  claim: ClaimNodeRenderer,
  hub:   HubNodeRenderer,
};

/* ── Graph builder ──────────────────────────────────────────────── */

export default function ClaimGraph({
  focalId, focalStatement, focalType,
  parent, children, links,
}: ClaimGraphProps) {
  const router = useRouter();
  const go = useCallback((id: number) => router.push(`/claims/${id}`), [router]);

  const handleNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    if (node.type === 'hub') return;
    const d = node.data as ClaimNodeData;
    if (d.claimId) go(d.claimId);
  }, [go]);

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];

    // ── Focal
    ns.push({
      id: 'focal',
      type: 'focal',
      position: { x: FOCAL_X, y: FOCAL_Y },
      data: { claimId: focalId, statement: focalStatement, claimType: focalType, role: 'focal', onNavigate: go } as ClaimNodeData,
      draggable: false,
    });

    // ── Parent
    if (parent) {
      ns.push({
        id: 'parent',
        type: 'claim',
        position: { x: PARENT_X, y: PARENT_Y },
        data: { claimId: parent.id, statement: parent.statement, claimType: parent.claim_type, role: 'parent', onNavigate: go } as ClaimNodeData,
        draggable: false,
      });
      const ec = EC.parent;
      es.push({
        id: 'e-parent',
        source: 'parent', sourceHandle: 'b',
        target: 'focal',  targetHandle: 't',
        type: 'straight',
        style: edgeStyle('parent'),
        markerEnd: { type: MarkerType.ArrowClosed, color: ec.stroke, width: 14, height: 14 },
      });
    }

    // ── Children
    children.forEach((c, i) => {
      const x = FOCAL_X + FOCAL_W / 2 - HIER_W / 2 + (i - (children.length - 1) / 2) * CHILD_GAP;
      const id = `child-${c.id}`;
      ns.push({
        id,
        type: 'claim',
        position: { x, y: CHILD_Y },
        data: { claimId: c.id, statement: c.statement, claimType: c.claim_type, role: 'child', onNavigate: go } as ClaimNodeData,
        draggable: false,
      });
      const ec = EC.child;
      es.push({
        id: `e-child-${c.id}`,
        source: 'focal', sourceHandle: 'b',
        target: id,      targetHandle: 't',
        type: 'straight',
        style: edgeStyle('child'),
        markerEnd: { type: MarkerType.ArrowClosed, color: ec.stroke, width: 12, height: 12 },
      });
    });

    // ── Lateral relationships — grouped by type, deduplicating parent/children
    const excludeIds = new Set<number>([
      ...(parent ? [parent.id] : []),
      ...children.map((c) => c.id),
    ]);

    const byType: Record<string, GraphLink[]> = {};
    for (const r of links) {
      if (excludeIds.has(r.related_claim_id)) continue; // skip already-shown claims
      (byType[r.link_type] ??= []).push(r);
    }

    // Split by direction: outgoing → right side, incoming → left side
    const rightTypes: string[] = [];
    const leftTypes:  string[] = [];
    for (const [relType, rels] of Object.entries(byType)) {
      if (rels[0].direction === 'outgoing') rightTypes.push(relType);
      else                                  leftTypes.push(relType);
    }

    function hubSlotH(relType: string): number {
      const n = byType[relType].length;
      return Math.max(HUB_H + 40, n * LEAF_STEP);
    }

    function placeHubs(types: string[], hubX: number, leafX: number, isRight: boolean) {
      if (types.length === 0) return;
      const totalH = types.reduce((sum, t) => sum + hubSlotH(t) + HUB_GAP, -HUB_GAP);
      let slotTop = -totalH / 2;

      for (const relType of types) {
        const slot = hubSlotH(relType);
        const hubCenterY = slotTop + slot / 2;
        const ec = EC[relType] ?? EC.other;
        const hubId = `hub-${relType}`;

        // Hub node
        ns.push({
          id: hubId,
          type: 'hub',
          position: { x: hubX, y: hubCenterY - HUB_H / 2 },
          data: {
            relType,
            label: linkTypeLabel(relType),
            stroke: ec.stroke,
            labelColor: ec.labelColor,
          } as HubNodeData,
          draggable: false,
        });

        // Focal ↔ hub edge (colored, typed)
        es.push({
          id: `e-fh-${relType}`,
          source: isRight ? 'focal'  : hubId,
          target: isRight ? hubId   : 'focal',
          sourceHandle: isRight ? 'r' : 'r',
          targetHandle: isRight ? 'l' : 'l',
          type: 'straight',
          style: edgeStyle(relType),
          ...(ec.arrow
            ? { markerEnd: { type: MarkerType.ArrowClosed, color: ec.stroke, width: 12, height: 12 } }
            : {}),
        });

        // Leaf nodes + hub ↔ leaf edges (light, neutral)
        const rels = byType[relType];
        rels.forEach((r, i) => {
          const leafCenterY = hubCenterY + (i - (rels.length - 1) / 2) * LEAF_STEP;
          const leafId = `leaf-${r.id}`;
          ns.push({
            id: leafId,
            type: 'claim',
            position: { x: leafX, y: leafCenterY - LEAF_H / 2 },
            data: {
              claimId: r.related_claim_id,
              statement: r.related_statement,
              claimType: r.related_claim_type ?? 'assertion',
              role: 'leaf',
              onNavigate: go,
            } as ClaimNodeData,
            draggable: false,
          });

          es.push({
            id: `e-hl-${r.id}`,
            source: isRight ? hubId   : leafId,
            target: isRight ? leafId  : hubId,
            sourceHandle: isRight ? 'r' : 'r',
            targetHandle: isRight ? 'l' : 'l',
            type: 'straight',
            style: { stroke: 'var(--border-subtle)', strokeWidth: 1 },
          });
        });

        slotTop += slot + HUB_GAP;
      }
    }

    placeHubs(rightTypes, RIGHT_HUB_X, RIGHT_LEAF_X, true);
    placeHubs(leftTypes,  LEFT_HUB_X,  LEFT_LEAF_X,  false);

    return { nodes: ns, edges: es };
  }, [focalId, focalStatement, focalType, parent, children, links, go]);

  // Legend: deduplicated list in use
  const legendTypes = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    if (parent) { seen.add('parent'); out.push('parent'); }
    if (children.length > 0) { seen.add('child'); out.push('child'); }
    const excludeIds = new Set([...(parent ? [parent.id] : []), ...children.map((c) => c.id)]);
    for (const r of links) {
      if (excludeIds.has(r.related_claim_id)) continue;
      if (!seen.has(r.link_type)) { seen.add(r.link_type); out.push(r.link_type); }
    }
    return out;
  }, [parent, children, links]);

  return (
    <div className={f.wrapper}>
      <div className={f.flowContainer}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          onNodeClick={handleNodeClick}
          minZoom={0.2}
          maxZoom={2}
        />
      </div>
      <div className={f.legend}>
        {legendTypes.map((type) => {
          const ec = EC[type] ?? EC.other;
          const label =
            type === 'parent' ? 'Parent claim' :
            type === 'child'  ? 'Child claim'  :
            linkTypeLabel(type);
          return (
            <div key={type} className={f.legendItem}>
              <svg width="28" height="10" aria-hidden>
                <line
                  x1="2" y1="5" x2={ec.arrow ? '22' : '26'} y2="5"
                  stroke={ec.stroke}
                  strokeWidth={Math.min(ec.width, 2)}
                  strokeDasharray={ec.dash}
                />
                {ec.arrow && (
                  <polygon points="20,2 26,5 20,8" fill={ec.stroke} />
                )}
              </svg>
              <span className={f.legendLabel} style={{ color: ec.labelColor }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
