import { isPortfolio, type Node, type NodeResult } from '../engine/portfolio'

/** Path = child ids from the root, e.g. ['phase-1', 'block-a-condo']. */
export type NodePath = string[]

export function getNode(root: Node, path: NodePath): Node {
  let node = root
  for (const id of path) {
    if (!isPortfolio(node)) throw new Error(`No child "${id}" under project "${node.id}"`)
    const child = node.children.find((c) => c.node.id === id)
    if (!child) throw new Error(`No child "${id}" under "${node.id}"`)
    node = child.node
  }
  return node
}

export function getResult(root: NodeResult, path: NodePath): NodeResult {
  let result = root
  for (const id of path) {
    const child = result.children.find((c) => c.result.id === id)
    if (!child) throw new Error(`No result for "${id}"`)
    result = child.result
  }
  return result
}

export function updateNode(root: Node, path: NodePath, update: (node: Node) => Node): Node {
  if (!path.length) return update(root)
  if (!isPortfolio(root)) throw new Error('Path continues below a project')
  const [head, ...rest] = path
  return { ...root, children: root.children.map((c) => (c.node.id === head ? { ...c, node: updateNode(c.node, rest, update) } : c)) }
}

export interface TreeEntry { path: NodePath; name: string; depth: number; kind: 'project' | 'portfolio' }

export function flatten(root: Node, path: NodePath = [], depth = 0): TreeEntry[] {
  const entry: TreeEntry = { path, name: root.name, depth, kind: isPortfolio(root) ? 'portfolio' : 'project' }
  return isPortfolio(root) ? [entry, ...root.children.flatMap((c) => flatten(c.node, [...path, c.node.id], depth + 1))] : [entry]
}
