const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('youtube-tv.db');

// Get your user ID (you can replace this with your actual ID)
const yourUserId = process.argv[2] || 'persistent_jxxbloeh9cpbq43n6dc29';

console.log(`📦 Exporting data from user: ${yourUserId}\n`);

// Get user record
const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(yourUserId);

if (!user) {
  console.error(`❌ User ${yourUserId} not found!`);
  process.exit(1);
}

// Get all playlists for this user
const playlists = db.prepare('SELECT * FROM playlists WHERE user_id = ?').all(yourUserId);

console.log(`✅ Found ${playlists.length} playlists\n`);

// Format playlists to match default-channels.json structure
const formattedPlaylists = playlists.map(p => ({
  id: p.playlist_id,
  name: p.name,
  videos: JSON.parse(p.videos || '[]'),
  groups: JSON.parse(p.groups || '{}'),
  starred: JSON.parse(p.starred || '[]'),
  category: p.category || null,
  description: p.description || null,
  thumbnail: p.thumbnail || null,
  isConvertedFromColoredFolder: p.is_converted_from_colored_folder === 1,
  representativeVideoId: p.representative_video_id || null
}));

// Build the template structure matching default-channels.json
const template = {
  customColors: JSON.parse(user.custom_colors || '{}'),
  colorOrder: JSON.parse(user.color_order || '[]'),
  playlistTabs: JSON.parse(user.playlist_tabs || '[{ "name": "All", "playlistIds": [] }]'),
  playlists: formattedPlaylists,
  videoProgress: JSON.parse(user.video_progress || '{}')
};

// Create backup of old template
const templatePath = path.join(process.cwd(), 'default-channels.json');
const backupPath = path.join(process.cwd(), `default-channels.backup.${Date.now()}.json`);

if (fs.existsSync(templatePath)) {
  console.log(`📋 Creating backup of old template...`);
  fs.copyFileSync(templatePath, backupPath);
  console.log(`✅ Backup created: ${backupPath}\n`);
}

// Write new template
console.log(`💾 Writing new template to default-channels.json...`);
fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));

console.log(`\n✅ Export complete!`);
console.log(`   - ${formattedPlaylists.length} playlists exported`);
console.log(`   - ${Object.keys(template.videoProgress).length} video progress entries`);
console.log(`   - ${template.playlistTabs.length} playlist tabs`);
console.log(`   - Custom colors: ${Object.keys(template.customColors).length}`);
console.log(`\n📁 New template saved to: ${templatePath}`);
console.log(`📁 Backup saved to: ${backupPath}`);

db.close();












