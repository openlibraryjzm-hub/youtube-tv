import { getDatabase } from '../../../../lib/db';

// Allow dynamic rendering in dev mode, static in production
export const dynamic = 'force-dynamic';

// GET /api/user/[userId] - Get user data
export async function GET(request, { params }) {
  try {
    const { userId } = params;
    const db = getDatabase();

    // Get user record
    const user = db.prepare(
      'SELECT custom_colors, color_order, playlist_tabs, video_progress FROM users WHERE user_id = ?'
    ).get(userId);

    let customColors = {};
    let colorOrder = [];
    let playlistTabs = [];
    let videoProgress = {};

    if (user) {
      try {
        customColors = user.custom_colors ? JSON.parse(user.custom_colors) : {};
        colorOrder = user.color_order ? JSON.parse(user.color_order) : [];
        playlistTabs = user.playlist_tabs ? JSON.parse(user.playlist_tabs) : [];
        videoProgress = user.video_progress ? JSON.parse(user.video_progress) : {};
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    } else {
      // User doesn't exist - copy from default template
      const defaultUser = db.prepare(
        'SELECT custom_colors, color_order, playlist_tabs, video_progress FROM users WHERE user_id = ?'
      ).get('default');

      if (defaultUser) {
        try {
          customColors = defaultUser.custom_colors ? JSON.parse(defaultUser.custom_colors) : {};
          colorOrder = defaultUser.color_order ? JSON.parse(defaultUser.color_order) : [];
          playlistTabs = defaultUser.playlist_tabs ? JSON.parse(defaultUser.playlist_tabs) : [];
          videoProgress = defaultUser.video_progress ? JSON.parse(defaultUser.video_progress) : {};
        } catch (e) {
          console.error('Error parsing default user data:', e);
        }

        // Create user record from default template
        db.prepare(`
          INSERT INTO users (user_id, custom_colors, color_order, playlist_tabs, video_progress, updated_at)
          VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        `).run(
          userId,
          defaultUser.custom_colors || '{}',
          defaultUser.color_order || '[]',
          defaultUser.playlist_tabs || '[]',
          defaultUser.video_progress || '{}'
        );

        // Copy default playlists to this user
        const copied = db.prepare(`
          INSERT INTO playlists (
            user_id, playlist_id, name, videos, groups, starred, is_default, can_delete,
            category, description, thumbnail, is_converted_from_colored_folder, representative_video_id
          )
          SELECT ?, playlist_id, name, videos, groups, starred, 0, 1,
                 category, description, thumbnail, is_converted_from_colored_folder, representative_video_id
          FROM playlists WHERE user_id = 'default'
        `).run(userId);

        console.log(`✅ Copied ${copied.changes} default playlists to user ${userId}`);
      }
    }

    // Get playlists for this user
    const playlists = db.prepare(`
      SELECT playlist_id as id, name, videos, groups, starred, category, description,
             thumbnail, is_converted_from_colored_folder, representative_video_id
      FROM playlists WHERE user_id = ?
    `).all(userId).map(row => {
      let videos = [];
      let groups = {};
      let starred = [];

      try {
        videos = row.videos ? JSON.parse(row.videos) : [];
        groups = row.groups ? JSON.parse(row.groups) : {};
        starred = row.starred ? JSON.parse(row.starred) : [];
      } catch (e) {
        console.error('Error parsing playlist data:', e);
      }

      return {
        id: row.id,
        name: row.name,
        videos,
        groups,
        starred,
        category: row.category,
        description: row.description,
        thumbnail: row.thumbnail,
        isConvertedFromColoredFolder: row.is_converted_from_colored_folder === 1,
        representativeVideoId: row.representative_video_id,
      };
    });

    return Response.json({
      playlists,
      playlistTabs,
      customColors,
      colorOrder,
      videoProgress,
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/user/[userId] - Save user data
export async function PUT(request, { params }) {
  try {
    const { userId } = params;
    const body = await request.json();
    const db = getDatabase();

    const { playlists, playlistTabs, customColors, colorOrder, videoProgress } = body;

    // Start transaction
    const transaction = db.transaction(() => {
      // Upsert user record
      db.prepare(`
        INSERT INTO users (user_id, custom_colors, color_order, playlist_tabs, video_progress, updated_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(user_id) DO UPDATE SET
          custom_colors = excluded.custom_colors,
          color_order = excluded.color_order,
          playlist_tabs = excluded.playlist_tabs,
          video_progress = excluded.video_progress,
          updated_at = strftime('%s', 'now')
      `).run(
        userId,
        JSON.stringify(customColors || {}),
        JSON.stringify(colorOrder || []),
        JSON.stringify(playlistTabs || []),
        JSON.stringify(videoProgress || {})
      );

      // Delete existing playlists for this user
      db.prepare('DELETE FROM playlists WHERE user_id = ?').run(userId);

      // Insert playlists
      const insertPlaylist = db.prepare(`
        INSERT INTO playlists (
          user_id, playlist_id, name, videos, groups, starred, is_default, can_delete,
          category, description, thumbnail, is_converted_from_colored_folder, representative_video_id
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?)
      `);

      for (const playlist of playlists || []) {
        insertPlaylist.run(
          userId,
          playlist.id,
          playlist.name,
          JSON.stringify(playlist.videos || []),
          JSON.stringify(playlist.groups || {}),
          JSON.stringify(playlist.starred || []),
          playlist.category || null,
          playlist.description || null,
          playlist.thumbnail || null,
          playlist.isConvertedFromColoredFolder ? 1 : 0,
          playlist.representativeVideoId || null
        );
      }
    });

    transaction();

    // Verify save
    const playlistCount = db.prepare(
      'SELECT COUNT(*) as count FROM playlists WHERE user_id = ?'
    ).get(userId).count;

    if (playlistCount !== (playlists || []).length) {
      console.warn(`⚠️ Playlist count mismatch: expected ${playlists?.length || 0}, got ${playlistCount}`);
    }

    return Response.json({ success: true, playlistCount });
  } catch (error) {
    console.error('Error saving user data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}


