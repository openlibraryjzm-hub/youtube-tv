const Database = require('better-sqlite3');
const db = new Database('youtube-tv.db');

console.log('=== SQLite Database Analysis ===\n');

// Check database size and limits
const dbInfo = db.prepare('PRAGMA page_count').get();
const pageSize = db.prepare('PRAGMA page_size').get();
const totalSize = dbInfo.page_count * pageSize.page_size;

console.log(`📊 Database Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`📄 Page Count: ${dbInfo.page_count.toLocaleString()}`);
console.log(`📏 Page Size: ${pageSize.page_size} bytes\n`);

// Check table sizes
console.log('=== Table Statistics ===');
const tables = ['users', 'playlists'];
tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
  console.log(`${table}: ${count.count.toLocaleString()} rows`);
});

// Check largest playlists
console.log('\n=== Largest Playlists (by video count) ===');
const largest = db.prepare(`
  SELECT name, LENGTH(videos) as video_json_size, 
         (LENGTH(videos) - LENGTH(REPLACE(videos, ',', ''))) as estimated_video_count
  FROM playlists 
  WHERE user_id != 'default'
  ORDER BY LENGTH(videos) DESC 
  LIMIT 5
`).all();

largest.forEach(p => {
  console.log(`${p.name}: ~${Math.floor(p.estimated_video_count)} videos, ${(p.video_json_size / 1024).toFixed(1)} KB JSON`);
});

// Check WAL mode (Write-Ahead Logging for better concurrency)
const journalMode = db.prepare('PRAGMA journal_mode').get();
console.log(`\n📝 Journal Mode: ${journalMode.journal_mode}`);
if (journalMode.journal_mode !== 'wal') {
  console.log('   ⚠️  Consider enabling WAL mode for better concurrent access');
}

// SQLite limits
console.log('\n=== SQLite Limits ===');
console.log('Max Database Size: ~140 TB (practical limit)');
console.log('Max Rows per Table: ~2^64 (9.2 quintillion)');
console.log('Max String Length: 1 billion bytes');
console.log('Max Columns per Table: 2000');

db.close();















