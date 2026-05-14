// ─── ADD THESE TO convex/jobMutations.ts ────────────────────────────────────

// Creates job record only (no action scheduled) — processing done in Next.js route
export const createJobAndProcess = mutation({
  args: {
    claimId: v.string(),
    hospitalFileName: v.string(),
    spectraFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("processJob", {
      claimId: args.claimId,
      status: "pending",
      files: [],
      logs: [],
      completed: 0,
      successCount: 0,
      errorCount: 0,
      totalCost: 0,
      totalTokens: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      isComplete: false,
      fileName: args.hospitalFileName,
      spectraFields: args.spectraFields,
    });
    return jobId;
  },
});

// Saves the completed processing result from Next.js route into Convex
export const completeJobWithResult = mutation({
  args: {
    jobId: v.id("processJob"),
    result: v.string(),   // JSON stringified ExtractionResult
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      isComplete: true,
      completed: 1,
      successCount: 1,
      result: args.result,
    });
  },
});
