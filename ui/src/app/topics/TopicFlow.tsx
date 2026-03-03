'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import f from './TopicFlow.module.scss';

/* ── Types ──────────────────────────────────────────────────────── */

interface TopicTree {
  id: number;
  name: string;
  claim_count: number;
  evidence_count: number;
  source_count: number;
  avg_claim_score: number | null;
  children: TopicTree[];
  parent_topic_id: number | null;
}

interface NodeData {
  label: string;
  claimCount: number;
  hasChildren: boolean;
  childCount: number;
  isSelected: boolean;
  onSelect: () => void;
  [key: string]: unknown;
}

/* ── Helpers ────────────────────────────────────────────────────── */

function countClaims(node: TopicTree): number {
  let total = node.claim_count;
  for (const child of node.children) total += countClaims(child);
  return total;
}

function findInTree(nodes: TopicTree[], id: number): TopicTree | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findInTree(n.children, id);
    if (found) return found;
  }
  return null;
}

function buildPath(nodes: TopicTree[], targetId: number): TopicTree[] {
  for (const n of nodes) {
    if (n.id === targetId) return [n];
    const sub = buildPath(n.children, targetId);
    if (sub.length > 0) return [n, ...sub];
  }
  return [];
}

/* ── Custom node ────────────────────────────────────────────────── */

function TopicNodeRenderer({ data }: NodeProps) {
  const d = data as NodeData;
  return (
    <div className={d.isSelected ? f.nodeSelected : f.node} onClick={d.onSelect}>
      <Handle type="target" position={Position.Top} className={f.handle} />
      <div className={f.nodeName}>{d.label}</div>
      <div className={f.nodeMeta}>{d.claimCount} claims</div>
      {d.hasChildren && !d.isSelected && (
        <div className={f.nodeExpand}>{d.childCount} subtopics</div>
      )}
      <Handle type="source" position={Position.Bottom} className={f.handle} />
    </div>
  );
}

const nodeTypes = { topic: TopicNodeRenderer };

/* ── Layout constants ───────────────────────────────────────────── */

const NODE_W = 176;
const NODE_H = 56;
const GAP_X = 32;
const GAP_Y = 64;
const MAX_COLS = 4;

/* ── Component ──────────────────────────────────────────────────── */

export default function TopicFlow({
  topics,
  selectedId,
  onSelect,
}: {
  topics: TopicTree[];
  selectedId: string | null;
  onSelect: (id: number | null) => void;
}) {
  const path = useMemo(
    () => (selectedId ? buildPath(topics, Number(selectedId)) : []),
    [topics, selectedId]
  );

  const { nodes, edges } = useMemo(() => {
    const selected = selectedId ? findInTree(topics, Number(selectedId)) : null;

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Collect tiers: each tier is an array of { node, parentId }
    type TierEntry = { node: TopicTree; parentId: number | null };
    const tiers: TierEntry[][] = [];

    if (selected) {
      tiers.push([{ node: selected, parentId: null }]);
      let current = selected.children;
      let parentIds = [selected.id];
      while (current.length > 0) {
        const tier: TierEntry[] = current.map((c) => ({
          node: c,
          parentId: parentIds.find((pid) => {
            const p = findInTree(topics, pid);
            return p?.children.some((ch) => ch.id === c.id);
          }) ?? null,
        }));
        tiers.push(tier);
        const nextParentIds: number[] = [];
        const next: TopicTree[] = [];
        for (const c of current) {
          if (c.children.length > 0) {
            nextParentIds.push(c.id);
            next.push(...c.children);
          }
        }
        current = next;
        parentIds = nextParentIds;
      }
    } else {
      // No selection — show roots and their children
      tiers.push(topics.map((t) => ({ node: t, parentId: null })));
      const tier2: TierEntry[] = [];
      for (const t of topics) {
        for (const c of t.children) {
          tier2.push({ node: c, parentId: t.id });
        }
      }
      if (tier2.length > 0) tiers.push(tier2);
    }

    // Layout each tier, wrapping into rows of MAX_COLS
    let cursorY = 0;

    // First pass: compute each tier's visual width (with wrapping) for centering
    const tierLayouts = tiers.map((tier) => {
      const cols = Math.min(tier.length, MAX_COLS);
      const rows = Math.ceil(tier.length / MAX_COLS);
      const width = cols * NODE_W + (cols - 1) * GAP_X;
      return { cols, rows, width };
    });
    const maxWidth = Math.max(...tierLayouts.map((l) => l.width));

    tiers.forEach((tier, tierIdx) => {
      const layout = tierLayouts[tierIdx];
      const offsetX = (maxWidth - layout.width) / 2;

      tier.forEach((entry, i) => {
        const { node, parentId } = entry;
        const col = i % MAX_COLS;
        const row = Math.floor(i / MAX_COLS);
        const x = offsetX + col * (NODE_W + GAP_X);
        const y = cursorY + row * (NODE_H + GAP_Y);
        const isSelectedNode = selected?.id === node.id;

        flowNodes.push({
          id: `t-${node.id}`,
          type: 'topic',
          position: { x, y },
          data: {
            label: node.name,
            claimCount: countClaims(node),
            hasChildren: node.children.length > 0,
            childCount: node.children.length,
            isSelected: isSelectedNode,
            onSelect: isSelectedNode ? () => {} : () => onSelect(node.id),
          },
          draggable: false,
        });

        if (parentId != null) {
          flowEdges.push({
            id: `e-${parentId}-${node.id}`,
            source: `t-${parentId}`,
            target: `t-${node.id}`,
            type: 'smoothstep',
            style: { stroke: 'var(--text-muted)', strokeWidth: 1.5 },
          });
        }
      });

      cursorY += layout.rows * (NODE_H + GAP_Y);
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [topics, selectedId, onSelect]);

  return (
    <div>
      {selectedId && path.length > 0 && (
        <div className={f.breadcrumbs}>
          <span className={f.crumb} onClick={() => onSelect(null)}>
            All Topics
          </span>
          {path.map((p, i) => (
            <span key={p.id} className={f.crumbGroup}>
              <span className={f.crumbSep}>&#8250;</span>
              {i < path.length - 1 ? (
                <span className={f.crumb} onClick={() => onSelect(p.id)}>
                  {p.name}
                </span>
              ) : (
                <span className={f.crumbCurrent}>{p.name}</span>
              )}
            </span>
          ))}
        </div>
      )}

      <div className={f.flowContainer}>
        <ReactFlow
          key={selectedId ?? 'root'}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
        </ReactFlow>
      </div>
    </div>
  );
}
