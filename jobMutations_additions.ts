// ─── ADD THESE TWO MUTATIONS TO convex/jobMutations.ts ───────────────────────
// Place them at the end of the file, before the closing

// Creates a job record only — no Convex action scheduled.
// PDF processing happens in the Next.js route (audit/start) directly.
export const createJobAndProcess = mutation({
  args: {
    claimId: v.string(),
    hospitalFileName: v.string(),
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

    // Insert a placeholder jobFile record (no storageId — bytes stay in Next.js)
    await ctx.db.insert("jobFiles", {
      jobId,
      file: args.hospitalFileName,
      status: "pending",
      fileName: args.hospitalFileName,
      fileType: "hospitalBill",
    });

    return jobId;
  },
});

// Saves the AI processing result into Convex after processing in Next.js route.
export const completeJobWithResult = mutation({
  args: {
    jobId: v.id("processJob"),
    analysis: v.any(),           // ExtractionResult object
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
    const { jobId, analysis, ...updates } = args;

    // Save the result in jobResults table
    await ctx.db.insert("jobResults", {
      jobId,
      filePath: "",
      analysis,
      usage: {},
      processingTimeMs: 0,
    });

    // Update job status
    await ctx.db.patch(jobId, {
      ...updates,
      isComplete: true,
      completed: 1,
    });

    return { success: true };
  },
});
