'use client';

import { useState } from 'react';
import { TopicNode } from '@/lib/types';
import { countClaims } from '@/lib/treeUtils';
import s from '../shared.module.scss';

function TreeNode({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: TopicNode;
  selectedId: number | null;
  onSelect: (id: number) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isActive = node.id === selectedId;

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
        <span className={s.treeCount}>({countClaims(node)})</span>
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

export default function TopicTree({
  topics,
  selectedId,
  onSelect,
}: {
  topics: TopicNode[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div className={s.tree}>
      {topics.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
