// ═══════════════════════════════════════════════════════════════════════════════
// ADD THESE TO convex/processing.ts (where getJobById already lives)
// Make sure 'query' and 'mutation' are already imported at the top of that file
// ═══════════════════════════════════════════════════════════════════════════════

export const getJobResults = query({
  args: { jobId: v.id("processJob") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobResults")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .collect();
  },
});

export const updateJobResultAnalysis = mutation({
  args: {
    jobResultId: v.id("jobResults"),
    analysis: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobResultId, { analysis: args.analysis });
    return { success: true };
  },
});
