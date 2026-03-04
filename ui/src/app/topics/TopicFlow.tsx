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
import { TopicNode } from '@/lib/types';
import { countClaims, findInTree, buildPath } from '@/lib/treeUtils';
import f from './TopicFlow.module.scss';

/* ── Types ──────────────────────────────────────────────────────── */

interface NodeData {
  label: string;
  claimCount: number;
  hasChildren: boolean;
  childCount: number;
  isSelected: boolean;
  onSelect: () => void;
  [key: string]: unknown;
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
  topics: TopicNode[];
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
    type TierEntry = { node: TopicNode; parentId: number | null };
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
        const next: TopicNode[] = [];
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

    // Track each node's x-center so children can be positioned under their parent
    const nodeXCenter = new Map<number, number>();

    // First pass: compute each tier's visual width (with wrapping) for overall sizing
    const tierLayouts = tiers.map((tier) => {
      const cols = Math.min(tier.length, MAX_COLS);
      const rows = Math.ceil(tier.length / MAX_COLS);
      const width = cols * NODE_W + (cols - 1) * GAP_X;
      return { cols, rows, width };
    });
    const maxWidth = Math.max(...tierLayouts.map((l) => l.width));

    tiers.forEach((tier, tierIdx) => {
      const layout = tierLayouts[tierIdx];

      // Group entries by parent so each child cluster centers under its parent
      type Group = { parentId: number | null; entries: TierEntry[] };
      const groups: Group[] = [];
      for (const entry of tier) {
        const existing = groups.find((g) => g.parentId === entry.parentId);
        if (existing) existing.entries.push(entry);
        else groups.push({ parentId: entry.parentId, entries: [entry] });
      }

      for (const group of groups) {
        const parentCenterX =
          group.parentId != null
            ? (nodeXCenter.get(group.parentId) ?? maxWidth / 2)
            : maxWidth / 2;

        const groupCols = Math.min(group.entries.length, MAX_COLS);
        const groupWidth = groupCols * NODE_W + (groupCols - 1) * GAP_X;
        // Root tier (no parent): global center. Child tiers: center under parent.
        const groupOffsetX =
          group.parentId == null
            ? (maxWidth - layout.width) / 2
            : parentCenterX - groupWidth / 2;

        group.entries.forEach((entry, i) => {
          const { node, parentId } = entry;
          const col = i % MAX_COLS;
          const row = Math.floor(i / MAX_COLS);
          const x = groupOffsetX + col * (NODE_W + GAP_X);
          const y = cursorY + row * (NODE_H + GAP_Y);
          const isSelectedNode = selected?.id === node.id;

          nodeXCenter.set(node.id, x + NODE_W / 2);

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
              type: 'straight',
              style: { stroke: 'var(--text-muted)', strokeWidth: 1.5 },
            });
          }
        });
      }

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
