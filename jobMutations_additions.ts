// ─── ADD THESE TWO MUTATIONS TO convex/jobMutations.ts ───────────────────────

// Creates a job with file records (for PDF viewer) but does NOT schedule
// the Convex action. PDF processing happens in the Next.js route instead.
export const createJobAndProcess = mutation({
  args: {
    claimId: v.string(),
    hospitalStorageId: v.id("_storage"),
    hospitalFileName: v.string(),
    tariffStorageId: v.optional(v.id("_storage")),
    tariffFileName: v.optional(v.string()),
    spectraFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("processJob", {
      status: "idle",
      completed: 0,
      total: 1,
      successCount: 0,
      errorCount: 0,
      totalCost: 0,
      totalTokens: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      isComplete: false,
      claimId: args.claimId,
      spectraFields: args.spectraFields,
    });

    // Insert hospital bill file record (with storageId for PDF viewer)
    await ctx.db.insert("jobFiles", {
      jobId,
      file: args.hospitalFileName,
      status: "pending",
      storageId: args.hospitalStorageId,
      fileName: args.hospitalFileName,
      fileType: "hospitalBill",
    });

    // Insert tariff file record if provided
    if (args.tariffStorageId && args.tariffFileName) {
      await ctx.db.insert("jobFiles", {
        jobId,
        file: args.tariffFileName,
        status: "pending",
        storageId: args.tariffStorageId,
        fileName: args.tariffFileName,
        fileType: "tariff",
      });
    }

    // NOTE: No ctx.scheduler.runAfter() — processing is done in Next.js route
    return jobId;
  },
});

// Saves the AI processing result from Next.js route into Convex.
// Inserts into jobResults table (same as addJobResult) so the UI reads it correctly.
export const completeJobWithResult = mutation({
  args: {
    jobId: v.id("processJob"),
    analysis: v.union(v.any(), v.null()),
    filePath: v.optional(v.string()),
    usage: v.optional(v.any()),
    processingTimeMs: v.optional(v.number()),
    cost: v.optional(v.number()),
    status: v.string(),
    successCount: v.optional(v.number()),
    errorCount: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    totalPromptTokens: v.optional(v.number()),
    totalCompletionTokens: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { jobId, analysis, filePath, usage, processingTimeMs, cost, status, error, ...jobUpdates } = args;

    // Save result in jobResults table — same as addJobResult so UI reads it
    if (analysis !== null && analysis !== undefined) {
      await ctx.db.insert("jobResults", {
        jobId,
        filePath: filePath || "",
        analysis,
        usage: usage || {},
        processingTimeMs: processingTimeMs || 0,
        processingTime: processingTimeMs ? `${(processingTimeMs / 1000).toFixed(1)}s` : undefined,
        cost: cost || 0,
      });
    }

    // Update job status
    const patch: Record<string, any> = {
      status,
      isComplete: true,
      completed: 1,
    };
    if (jobUpdates.successCount !== undefined) patch.successCount = jobUpdates.successCount;
    if (jobUpdates.errorCount !== undefined) patch.errorCount = jobUpdates.errorCount;
    if (jobUpdates.totalCost !== undefined) patch.totalCost = jobUpdates.totalCost;
    if (jobUpdates.totalTokens !== undefined) patch.totalTokens = jobUpdates.totalTokens;
    if (jobUpdates.totalPromptTokens !== undefined) patch.totalPromptTokens = jobUpdates.totalPromptTokens;
    if (jobUpdates.totalCompletionTokens !== undefined) patch.totalCompletionTokens = jobUpdates.totalCompletionTokens;
    if (error !== undefined) patch.error = error;

    await ctx.db.patch(jobId, patch);

    return { success: true };
  },
});

// ─── ADD THESE TO convex/processing.ts (or wherever getJobById lives) ────────

// Get job results for a given job
export const getJobResults = query({
  args: { jobId: v.id("processJob") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobResults")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .collect();
  },
});

// Update the analysis field of a specific jobResult (used by tariff matching)
export const updateJobResultAnalysis = mutation({
  args: {
    jobResultId: v.id("jobResults"),
    analysis: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobResultId, {
      analysis: args.analysis,
    });
    return { success: true };
  },
});
