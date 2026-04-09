export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
  canHandleCrossChain?: boolean
  canSuggestLearningResources?: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
  allowMultiQuery?: boolean
  strictMode?: boolean
}

/**
 * Capabilities specific to Solana knowledge agents.
 */
export const SOLANA_AGENT_CAPABILITIES: AgentCapabilities = {
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
  canHandleCrossChain: false,
  canSuggestLearningResources: true,
}

/**
 * Behavior flags for Solana knowledge agents.
 */
export const SOLANA_AGENT_FLAGS: AgentFlags = {
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
  allowMultiQuery: false,
  strictMode: true,
}

/**
 * Utility to quickly check if an agent has a given capability.
 */
export function hasCapability(agent: AgentCapabilities, key: keyof AgentCapabilities): boolean {
  return Boolean(agent[key])
}

/**
 * Utility to enforce flags during execution.
 */
export function enforceFlags(flags: AgentFlags, query: string): boolean {
  if (flags.requiresExactInvocation && !query.trim()) return false
  return true
}
