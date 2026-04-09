export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  network?: string
  gasLimit?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  network?: string
  error?: string
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, network, gasLimit } =
      this.config
    try {
      const payload: Record<string, any> = { contractName, parameters }
      if (network) payload.network = network
      if (gasLimit) payload.gasLimit = gasLimit

      const res = await fetch(deployEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `HTTP ${res.status}: ${text}` }
      }

      const json = await res.json()
      return {
        success: true,
        address: json.contractAddress,
        transactionHash: json.txHash,
        network: json.network ?? network,
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
