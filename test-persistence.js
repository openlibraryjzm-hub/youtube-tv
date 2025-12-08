// Quick test to verify data persistence
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'youtube-tv.db');
console.log('🔍 Testing persistence in database:', dbPath);
console.log('');

const db = new Database(dbPath, { readonly: true });

// Check all users
const users = db.prepare('SELECT user_id, datetime(updated_at, \'unixepoch\', \'localtime\') as updated FROM users WHERE user_id != ?').all('default');

console.log('📊 Users in database:');
users.forEach(user => {
  const playlists = db.prepare('SELECT COUNT(*) as count FROM playlists WHERE user_id = ?').get(user.user_id);
  const userData = db.prepare('SELECT custom_colors, color_order, playlist_tabs FROM users WHERE user_id = ?').get(user.user_id);
  
  console.log(`\n  👤 ${user.user_id}`);
  console.log(`     Last updated: ${user.updated}`);
  console.log(`     Playlists: ${playlists.count}`);
  
  if (userData.custom_colors) {
    const colors = JSON.parse(userData.custom_colors);
    console.log(`     Custom colors: ${Object.keys(colors).length} colors`);
  }
  
  if (userData.color_order) {
    const colorOrder = JSON.parse(userData.color_order);
    console.log(`     Color order: ${colorOrder.length} items`);
  }
  
  if (userData.playlist_tabs) {
    const tabs = JSON.parse(userData.playlist_tabs);
    console.log(`     Playlist tabs: ${tabs.length} tabs`);
  }
});

// Show recent playlist updates
console.log('\n📝 Recent playlist updates (last 5):');
const recent = db.prepare(`
  SELECT user_id, playlist_id, name, datetime(updated_at, 'unixepoch', 'localtime') as updated 
  FROM playlists 
  WHERE user_id != ? 
  ORDER BY updated_at DESC 
  LIMIT 5
`).all('default');

recent.forEach(p => {
  console.log(`  - ${p.name} (${p.playlist_id}) - Updated: ${p.updated}`);
});

db.close();
console.log('\n✅ Database check complete!');

