import { createContext, useContext, type Dispatch } from 'react'
import type { Node, NodeResult } from '../engine/portfolio'
import type { DemoProject } from './data'
import type { Action, State } from './store'
import type { CloudState } from './useCloud'

export interface Workspace {
  state: State
  dispatch: Dispatch<Action>
  demo: DemoProject
  draft: Node
  /** null when the draft is invalid; `error` explains why. */
  result: NodeResult | null
  error: string | null
  node: Node // selected node (by state.path)
  nodeResult: NodeResult | null
  cloud: CloudState
}

export const WorkspaceContext = createContext<Workspace | null>(null)

export function useWorkspace(): Workspace {
  const ws = useContext(WorkspaceContext)
  if (!ws) throw new Error('useWorkspace outside WorkspaceContext')
  return ws
}
