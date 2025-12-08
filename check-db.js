const Database = require('better-sqlite3');
const db = new Database('youtube-tv.db');

console.log('=== USER DATA ===');
const users = db.prepare('SELECT user_id, updated_at FROM users').all();
users.forEach(u => {
  const date = new Date(u.updated_at * 1000);
  console.log(`User: ${u.user_id}, Updated: ${date.toLocaleString()}`);
});

console.log('\n=== PLAYLIST COUNTS BY USER ===');
const counts = db.prepare('SELECT user_id, COUNT(*) as count FROM playlists GROUP BY user_id').all();
counts.forEach(c => console.log(`User: ${c.user_id}, Playlists: ${c.count}`));

console.log('\n=== YOUR PLAYLISTS (first 10) ===');
const yourPlaylists = db.prepare("SELECT playlist_id, name FROM playlists WHERE user_id != 'default' LIMIT 10").all();
yourPlaylists.forEach(p => console.log(`- ${p.name} (${p.playlist_id})`));

console.log('\n=== RECENT CHANGES ===');
const recent = db.prepare("SELECT playlist_id, name, updated_at FROM playlists WHERE user_id != 'default' ORDER BY updated_at DESC LIMIT 5").all();
recent.forEach(p => {
  const date = new Date(p.updated_at * 1000);
  console.log(`- ${p.name} updated at ${date.toLocaleString()}`);
});

db.close();

