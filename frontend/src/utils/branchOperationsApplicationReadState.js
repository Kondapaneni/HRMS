export const getBranchOperationsReceivedAt = (application) => {
  const timeline = application?.stage_history || application?.form_data?.timeline || [];
  if (!Array.isArray(timeline)) return null;

  const transferEvents = timeline.filter((event) => {
    const stage = String(event?.stage || event?.title || '').trim().toLowerCase();
    return stage.includes('branch operations');
  });
  const latestTransfer = transferEvents[transferEvents.length - 1];
  const receivedAt = latestTransfer?.timestamp || latestTransfer?.created_at || null;

  return receivedAt && !Number.isNaN(new Date(receivedAt).getTime()) ? receivedAt : null;
};

export const isNewBranchOperationsApplication = (application) => Boolean(application?.is_new);
