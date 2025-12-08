import { getDatabase } from '../../../../lib/db';

// GET /api/user/[userId] - Get all user data
export async function GET(request, { params }) {
  try {
    const { userId } = params;
    const db = getDatabase();

    // Get user record
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
    
    // Get all playlists for this user
    const playlists = db.prepare('SELECT * FROM playlists WHERE user_id = ?').all(userId);
    
    // Get default playlists if user doesn't exist yet
    let defaultPlaylists = [];
    if (!user) {
      defaultPlaylists = db.prepare('SELECT * FROM playlists WHERE user_id = ?').all('default');
    }

    // Format playlists
    const formattedPlaylists = (playlists.length > 0 ? playlists : defaultPlaylists).map(p => ({
      id: p.playlist_id,
      name: p.name,
      videos: JSON.parse(p.videos || '[]'),
      groups: JSON.parse(p.groups || '{}'),
      starred: JSON.parse(p.starred || '[]'),
      category: p.category,
      description: p.description,
      thumbnail: p.thumbnail,
      isConvertedFromColoredFolder: p.is_converted_from_colored_folder === 1,
      representativeVideoId: p.representative_video_id
    }));

    // If user doesn't exist, create them with defaults
    if (!user) {
      // Load default data from default-channels.json
      const fs = require('fs');
      const path = require('path');
      
      // Try multiple paths for default-channels.json
      let defaultChannelsPath = null;
      const possiblePaths = [
        path.join(process.cwd(), 'default-channels.json'), // Development
        path.join(process.resourcesPath || '', 'default-channels.json'), // Packaged Electron
        path.join(process.resourcesPath || '', 'app', 'default-channels.json'), // Alternative packaged path
        path.join(__dirname, '../../../../default-channels.json'), // Relative to this file
      ];
      
      for (const possiblePath of possiblePaths) {
        if (possiblePath && fs.existsSync(possiblePath)) {
          defaultChannelsPath = possiblePath;
          break;
        }
      }
      
      let defaultData = {
        customColors: {},
        colorOrder: [],
        playlistTabs: [{ name: 'All', playlistIds: [] }],
        videoProgress: {}
      };

      if (defaultChannelsPath) {
        try {
          const fileData = JSON.parse(fs.readFileSync(defaultChannelsPath, 'utf8'));
          defaultData = {
            customColors: fileData.customColors || {},
            colorOrder: fileData.colorOrder || [],
            playlistTabs: fileData.playlistTabs || [{ name: 'All', playlistIds: [] }],
            videoProgress: fileData.videoProgress || {}
          };
        } catch (error) {
          console.error('Error loading default data:', error);
        }
      }

      // Create user with defaults
      db.prepare(`
        INSERT INTO users (user_id, custom_colors, color_order, playlist_tabs, video_progress)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        userId,
        JSON.stringify(defaultData.customColors),
        JSON.stringify(defaultData.colorOrder),
        JSON.stringify(defaultData.playlistTabs),
        JSON.stringify(defaultData.videoProgress)
      );

      // Copy default playlists to this user
      if (defaultPlaylists.length > 0) {
        const copyPlaylist = db.prepare(`
          INSERT INTO playlists (
            user_id, playlist_id, name, videos, groups, starred, is_default, can_delete,
            category, description, thumbnail, is_converted_from_colored_folder, representative_video_id
          )
          SELECT ?, playlist_id, name, videos, groups, starred, 1, 0,
                 category, description, thumbnail, is_converted_from_colored_folder, representative_video_id
          FROM playlists WHERE user_id = 'default' AND playlist_id = ?
        `);

        const copyTransaction = db.transaction((playlists) => {
          for (const playlist of playlists) {
            copyPlaylist.run(userId, playlist.playlist_id);
          }
        });

        copyTransaction(defaultPlaylists);
      }

      // Return newly created user data
      return Response.json({
        playlists: formattedPlaylists,
        playlistTabs: defaultData.playlistTabs,
        customColors: defaultData.customColors,
        colorOrder: defaultData.colorOrder,
        videoProgress: defaultData.videoProgress
      });
    }

    // Return existing user data
    return Response.json({
      playlists: formattedPlaylists,
      playlistTabs: JSON.parse(user.playlist_tabs || '[]'),
      customColors: JSON.parse(user.custom_colors || '{}'),
      colorOrder: JSON.parse(user.color_order || '[]'),
      videoProgress: JSON.parse(user.video_progress || '{}')
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    console.error('Stack:', error.stack);
    console.error('Database path:', process.env.DATABASE_PATH || 'not set');
    console.error('CWD:', process.cwd());
    console.error('Resources path:', process.resourcesPath || 'not set');
    return Response.json({ error: error.message, details: error.stack }, { status: 500 });
  }
}

// PUT /api/user/[userId] - Update user data (playlists, tabs, customColors)
export async function PUT(request, { params }) {
  try {
    const { userId } = params;
    const body = await request.json();
    const db = getDatabase();

    const { playlists, playlistTabs, customColors, colorOrder } = body;

    // Start transaction
    const updateTransaction = db.transaction(() => {
      // Update user record
      db.prepare(`
        INSERT INTO users (user_id, custom_colors, color_order, playlist_tabs, updated_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(user_id) DO UPDATE SET
          custom_colors = excluded.custom_colors,
          color_order = excluded.color_order,
          playlist_tabs = excluded.playlist_tabs,
          updated_at = strftime('%s', 'now')
      `).run(
        userId,
        JSON.stringify(customColors || {}),
        JSON.stringify(colorOrder || []),
        JSON.stringify(playlistTabs || [])
      );

      // Delete existing playlists for this user (except defaults if we want to keep them)
      // Actually, let's update/insert instead of delete to preserve data
      if (playlists && Array.isArray(playlists)) {
        const upsertPlaylist = db.prepare(`
          INSERT INTO playlists (
            user_id, playlist_id, name, videos, groups, starred, updated_at,
            category, description, thumbnail, is_converted_from_colored_folder, representative_video_id
          )
          VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'), ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, playlist_id) DO UPDATE SET
            name = excluded.name,
            videos = excluded.videos,
            groups = excluded.groups,
            starred = excluded.starred,
            updated_at = strftime('%s', 'now'),
            category = excluded.category,
            description = excluded.description,
            thumbnail = excluded.thumbnail,
            is_converted_from_colored_folder = excluded.is_converted_from_colored_folder,
            representative_video_id = excluded.representative_video_id
        `);

        for (const playlist of playlists) {
          // Convert video objects to IDs if needed
          const videoIds = (playlist.videos || []).map(v => typeof v === 'string' ? v : (v?.id || v));
          
          upsertPlaylist.run(
            userId,
            playlist.id,
            playlist.name,
            JSON.stringify(videoIds),
            JSON.stringify(playlist.groups || {}),
            JSON.stringify(playlist.starred || []),
            playlist.category || null,
            playlist.description || null,
            playlist.thumbnail || null,
            playlist.isConvertedFromColoredFolder ? 1 : 0,
            playlist.representativeVideoId || null
          );
        }
      }
    });

    updateTransaction();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating user data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

