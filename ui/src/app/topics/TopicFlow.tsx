'use client';

import { useMemo, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TopicNode } from '@/lib/types';
import { countClaims, buildPath } from '@/lib/treeUtils';
import f from './TopicFlow.module.scss';

/* ── Types ──────────────────────────────────────────────────────── */

interface NodeData {
  label: string;
  claimCount: number;
  hasChildren: boolean;
  childCount: number;
  isSelected: boolean;
  [key: string]: unknown;
}

/* ── Custom node ────────────────────────────────────────────────── */

function TopicNodeRenderer({ data }: NodeProps) {
  const d = data as NodeData;
  return (
    <div className={d.isSelected ? f.nodeSelected : f.node}>
      <Handle type="target" position={Position.Top} className={f.handle} />
      <div className={f.nodeName}>{d.label}</div>
      <div className={f.nodeMeta}>{d.claimCount} claims</div>
      {d.hasChildren && (
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

/* ── Collect subtree node IDs (for fitView targeting) ──────────── */

function collectSubtreeIds(node: TopicNode): string[] {
  const ids = [`t-${node.id}`];
  for (const c of node.children) ids.push(...collectSubtreeIds(c));
  return ids;
}

/* ── Inner component (needs ReactFlow context) ─────────────────── */

function TopicFlowInner({
  topics,
  selectedId,
  onSelect,
}: {
  topics: TopicNode[];
  selectedId: string | null;
  onSelect: (id: number | null) => void;
}) {
  const { fitView } = useReactFlow();

  const path = useMemo(
    () => (selectedId ? buildPath(topics, Number(selectedId)) : []),
    [topics, selectedId]
  );

  const { nodes, edges, fitNodeIds } = useMemo(() => {
    const numSelected = selectedId ? Number(selectedId) : null;

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Always render the full tree
    type TierEntry = { node: TopicNode; parentId: number | null };
    const tiers: TierEntry[][] = [];

    // Build all tiers from the full tree
    tiers.push(topics.map((t) => ({ node: t, parentId: null })));
    let currentLevel = topics;
    while (currentLevel.length > 0) {
      const nextTier: TierEntry[] = [];
      for (const parent of currentLevel) {
        for (const child of parent.children) {
          nextTier.push({ node: child, parentId: parent.id });
        }
      }
      if (nextTier.length === 0) break;
      tiers.push(nextTier);
      currentLevel = nextTier.map((e) => e.node);
    }

    // Layout each tier
    let cursorY = 0;
    const nodeXCenter = new Map<number, number>();

    const tierLayouts = tiers.map((tier) => {
      const cols = Math.min(tier.length, MAX_COLS);
      const rows = Math.ceil(tier.length / MAX_COLS);
      const width = cols * NODE_W + (cols - 1) * GAP_X;
      return { cols, rows, width };
    });
    const maxWidth = Math.max(...tierLayouts.map((l) => l.width));

    tiers.forEach((tier, tierIdx) => {
      const layout = tierLayouts[tierIdx];

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
          const isSelectedNode = numSelected === node.id;

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

    // Determine which nodes to zoom into
    let zoomIds: string[] | undefined;
    if (numSelected) {
      const selectedNode = topics
        .flatMap(function flatten(n: TopicNode): TopicNode[] {
          return [n, ...n.children.flatMap(flatten)];
        })
        .find((n) => n.id === numSelected);
      if (selectedNode) {
        zoomIds = collectSubtreeIds(selectedNode);
        // Also include the parent so the selected node has upward context
        const parentEntry = path.length >= 2 ? path[path.length - 2] : null;
        if (parentEntry) zoomIds.push(`t-${parentEntry.id}`);
      }
    }

    return { nodes: flowNodes, edges: flowEdges, fitNodeIds: zoomIds };
  }, [topics, selectedId, path]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const topicId = Number(node.id.replace('t-', ''));
      onSelect(topicId === Number(selectedId) ? null : topicId);
    },
    [onSelect, selectedId]
  );

  const zoomToSelection = useCallback(() => {
    if (fitNodeIds && fitNodeIds.length > 0) {
      fitView({ nodes: fitNodeIds.map((id) => ({ id })), padding: 0.4, duration: 300 });
    } else {
      fitView({ padding: 0.3, duration: 300 });
    }
  }, [fitView, fitNodeIds]);

  useEffect(() => {
    // Small delay to let ReactFlow finish layout before zooming
    const timer = setTimeout(zoomToSelection, 50);
    return () => clearTimeout(timer);
  }, [zoomToSelection]);

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
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.2}
          maxZoom={2}
        >
        </ReactFlow>
      </div>
    </div>
  );
}

/* ── Wrapper (provides ReactFlow context) ──────────────────────── */

export default function TopicFlow(props: {
  topics: TopicNode[];
  selectedId: string | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <ReactFlowProvider>
      <TopicFlowInner {...props} />
    </ReactFlowProvider>
  );
}
