/**
 * Unique identifier for the Solana Knowledge Agent.
 */
export const SOLANA_KNOWLEDGE_AGENT_ID = "solana-knowledge-agent" as const

/**
 * Human-readable label for UI or logs.
 */
export const SOLANA_KNOWLEDGE_AGENT_LABEL = "Solana Knowledge Agent"

/**
 * Metadata bundle for the Solana Knowledge Agent.
 */
export const SOLANA_KNOWLEDGE_AGENT_META = {
  id: SOLANA_KNOWLEDGE_AGENT_ID,
  label: SOLANA_KNOWLEDGE_AGENT_LABEL,
  description: "Provides authoritative answers about Solana protocols, tokens, and ecosystem",
  version: "1.0.0",
}
