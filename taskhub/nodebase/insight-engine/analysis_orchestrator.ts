;(async () => {
  // === Environment (overrides allowed) ===
  const SOL_RPC = process.env.SOLANA_RPC_URL || "https://solana.rpc"
  const DEX_API = process.env.DEX_API_URL || "https://dex.api"
  const MINT = process.env.TOKEN_MINT || "MintPubkeyHere"
  const MARKET = process.env.MARKET_PUBKEY || "MarketPubkeyHere"

  // === Utilities ===
  const time = async (label, fn) => {
    const start = Date.now()
    try {
      const result = await fn()
      return { label, ms: Date.now() - start, result }
    } catch (error) {
      return { label, ms: Date.now() - start, error }
    }
  }

  const numberOrZero = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

  try {
    // 1) Analyze activity
    const activityAnalyzer = new TokenActivityAnalyzer(SOL_RPC)
    const activityRun = await time("activity", () =>
      activityAnalyzer.analyzeActivity(MINT, 20)
    )
    if (activityRun.error) throw activityRun.error
    const records = Array.isArray(activityRun.result) ? activityRun.result : []

    // 2) Analyze depth
    const depthAnalyzer = new TokenDepthAnalyzer(DEX_API, MARKET)
    const depthRun = await time("depth", () => depthAnalyzer.analyze(30))
    if (depthRun.error) throw depthRun.error
    const depthMetrics = depthRun.result

    // 3) Detect patterns
    const volumes = records.map((r) => numberOrZero(r.amount))
    const patterns =
      volumes.length >= 5 ? detectVolumePatterns(volumes, 5, 100) : []

    // 4) Execute a custom task
    const engine = new ExecutionEngine()
    engine.register("report", async (params) => {
      const list = Array.isArray(params.records) ? params.records : []
      const totalVolume = list.reduce(
        (acc, r) => acc + numberOrZero(r.amount),
        0
      )
      return {
        records: list.length,
        totalVolume,
        avgVolume: list.length ? totalVolume / list.length : 0,
      }
    })
    engine.enqueue("task1", "report", { records })
    const taskResults = await engine.runAll()

    // 5) Sign the results
    const signer = new SigningEngine()
    const payloadObj = {
      meta: {
        mint: MINT,
        market: MARKET,
        generatedAt: new Date().toISOString(),
        versions: { pipeline: "1.0.0" },
        timings: { activityMs: activityRun.ms, depthMs: depthRun.ms },
      },
      depthMetrics,
      patterns,
      taskResults,
    }
    const payload = JSON.stringify(payloadObj)
    const signature = await signer.sign(payload)
    const signatureValid = await signer.verify(payload, signature)

    if (!signatureValid) {
      throw new Error("Signature verification failed")
    }

    // 6) Structured output
    const summary = {
      recordsCount: records.length,
      volumeSamples: volumes.length,
      hasPatterns: patterns.length > 0,
      signatureValid,
    }

    console.log(
      JSON.stringify(
        { summary, payload: payloadObj, signature },
        null,
        2
      )
    )
  } catch (err) {
    console.error(`Pipeline error: ${err?.message || String(err)}`)
    process.exitCode = 1
  }
})()
