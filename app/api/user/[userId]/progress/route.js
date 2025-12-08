import { getDatabase } from '../../../../../lib/db';

// PUT /api/user/[userId]/progress - Update video progress
export async function PUT(request, { params }) {
  try {
    const { userId } = params;
    const body = await request.json();
    const db = getDatabase();

    const { videoProgress } = body;

    if (!videoProgress || typeof videoProgress !== 'object') {
      return Response.json({ error: 'Invalid videoProgress data' }, { status: 400 });
    }

    // Get current video progress
    const user = db.prepare('SELECT video_progress FROM users WHERE user_id = ?').get(userId);
    let currentProgress = {};
    
    if (user && user.video_progress) {
      try {
        currentProgress = JSON.parse(user.video_progress);
      } catch (e) {
        currentProgress = {};
      }
    }

    // Merge new progress with existing
    const updatedProgress = { ...currentProgress, ...videoProgress };

    // Update user record
    db.prepare(`
      INSERT INTO users (user_id, video_progress, updated_at)
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(user_id) DO UPDATE SET
        video_progress = excluded.video_progress,
        updated_at = strftime('%s', 'now')
    `).run(userId, JSON.stringify(updatedProgress));

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating video progress:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}








