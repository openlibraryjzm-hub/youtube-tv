export async function saveVideoProgress(userId, videoProgress) {
    try {
      const response = await fetch('/api/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, videoProgress })
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to save progress:', error);
      return { error: error.message };
    }
  }