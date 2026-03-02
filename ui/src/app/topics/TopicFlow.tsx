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
    const children = selected ? selected.children : topics;

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    const cols = Math.min(children.length || 1, MAX_COLS);
    const rowWidth = cols * NODE_W + (cols - 1) * GAP_X;

    if (selected) {
      flowNodes.push({
        id: `t-${selected.id}`,
        type: 'topic',
        position: { x: Math.max(rowWidth - NODE_W, 0) / 2, y: 0 },
        data: {
          label: selected.name,
          claimCount: countClaims(selected),
          hasChildren: selected.children.length > 0,
          childCount: selected.children.length,
          isSelected: true,
          onSelect: () => {},
        },
        draggable: false,
      });
    }

    const baseY = selected ? NODE_H + GAP_Y : 0;

    children.forEach((child, i) => {
      const col = i % MAX_COLS;
      const row = Math.floor(i / MAX_COLS);

      flowNodes.push({
        id: `t-${child.id}`,
        type: 'topic',
        position: {
          x: col * (NODE_W + GAP_X),
          y: baseY + row * (NODE_H + GAP_Y),
        },
        data: {
          label: child.name,
          claimCount: countClaims(child),
          hasChildren: child.children.length > 0,
          childCount: child.children.length,
          isSelected: false,
          onSelect: () => onSelect(child.id),
        },
        draggable: false,
      });

      if (selected) {
        flowEdges.push({
          id: `e-${selected.id}-${child.id}`,
          source: `t-${selected.id}`,
          target: `t-${child.id}`,
          type: 'smoothstep',
          style: { stroke: 'var(--text-muted)', strokeWidth: 1.5 },
        });
      }
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
