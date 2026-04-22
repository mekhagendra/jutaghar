export const inMemoryNotificationQueue = [];

export const enqueueNotification = async (notification) => {
  const record = {
    ...notification,
    enqueuedAt: new Date().toISOString(),
  };
  inMemoryNotificationQueue.push(record);

  // Placeholder transport until external queue integration is added.
  console.log('[notification:queued]', JSON.stringify(record));
  return record;
};
