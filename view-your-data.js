const Database = require('better-sqlite3');
const db = new Database('youtube-tv.db');

// Get your user ID (you can replace this with your actual ID)
const yourUserId = process.argv[2] || 'persistent_jxxbloeh9cpbq43n6dc29';

console.log(`=== YOUR DATA (User: ${yourUserId}) ===\n`);

// Get your user record
const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(yourUserId);
if (user) {
  console.log('User Settings:');
  console.log(`- Custom Colors: ${user.custom_colors ? 'Yes' : 'No'}`);
  console.log(`- Color Order: ${user.color_order ? JSON.parse(user.color_order).length + ' colors' : 'None'}`);
  console.log(`- Playlist Tabs: ${user.playlist_tabs ? JSON.parse(user.playlist_tabs).length + ' tabs' : 'None'}`);
  console.log(`- Video Progress: ${user.video_progress ? Object.keys(JSON.parse(user.video_progress)).length + ' videos' : 'None'}`);
  console.log(`- Last Updated: ${new Date(user.updated_at * 1000).toLocaleString()}\n`);
} else {
  console.log('User not found!\n');
}

// Get your playlists
const playlists = db.prepare('SELECT playlist_id, name, videos, groups, updated_at FROM playlists WHERE user_id = ? ORDER BY updated_at DESC').all(yourUserId);

console.log(`=== YOUR PLAYLISTS (${playlists.length} total) ===\n`);

playlists.forEach((p, i) => {
  const videos = JSON.parse(p.videos || '[]');
  const groups = JSON.parse(p.groups || '{}');
  const groupCounts = Object.entries(groups).map(([color, group]) => {
    const videoCount = Array.isArray(group.videos) ? group.videos.length : 0;
    return `${color}:${videoCount}`;
  }).join(', ');
  
  const lastUpdate = new Date(p.updated_at * 1000).toLocaleString();
  
  console.log(`${i + 1}. ${p.name}`);
  console.log(`   ID: ${p.playlist_id}`);
  console.log(`   Videos: ${videos.length}`);
  console.log(`   Groups: [${groupCounts || 'none'}]`);
  console.log(`   Last Updated: ${lastUpdate}\n`);
});

// Show a sample playlist's data
if (playlists.length > 0) {
  const sample = playlists[0];
  const sampleVideos = JSON.parse(sample.videos || '[]');
  const sampleGroups = JSON.parse(sample.groups || '{}');
  
  console.log(`=== SAMPLE: "${sample.name}" DETAILS ===\n`);
  console.log(`First 5 video IDs: ${sampleVideos.slice(0, 5).map(v => typeof v === 'string' ? v : v.id).join(', ')}`);
  console.log(`\nColored folders:`);
  Object.entries(sampleGroups).forEach(([color, group]) => {
    if (Array.isArray(group.videos) && group.videos.length > 0) {
      console.log(`  ${color}: ${group.videos.length} videos (${group.name || color})`);
      console.log(`    First 3 IDs: ${group.videos.slice(0, 3).join(', ')}`);
    }
  });
}

db.close();











