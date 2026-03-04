/**
 * Generic tree-traversal utilities for any node type that has
 * an `id`, `children` array, and a numeric `claim_count` field.
 */

interface TreeNode {
  id: number;
  claim_count?: number;
  children: TreeNode[];
}

/**
 * Recursively count claims for a node and all its descendants.
 * Sums `node.claim_count` down through the entire subtree.
 */
export function countClaims<T extends TreeNode>(node: T): number {
  let total = node.claim_count ?? 0;
  for (const child of node.children) total += countClaims(child as T);
  return total;
}

/**
 * Recursively search a forest (array of trees) for a node with the given id.
 * Returns the matching node or null if not found.
 */
export function findInTree<T extends { id: number; children: T[] }>(
  nodes: T[],
  id: number,
): T | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findInTree(n.children, id);
    if (found) return found;
  }
  return null;
}

/**
 * Build an array representing the path from the root to the node
 * with `targetId`. Returns an empty array if the target is not found.
 */
export function buildPath<T extends { id: number; children: T[] }>(
  nodes: T[],
  targetId: number,
): T[] {
  for (const n of nodes) {
    if (n.id === targetId) return [n];
    const sub = buildPath(n.children, targetId);
    if (sub.length > 0) return [n, ...sub];
  }
  return [];
}
