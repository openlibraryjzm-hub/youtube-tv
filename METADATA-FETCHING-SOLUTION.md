# Video Metadata Fetching Solution

## Overview
This document explains how video metadata (title, author, views, channel ID, published year) is fetched and stored PERMANENTLY in the database for ~20,000 videos.

## CRITICAL: Permanent Storage (Like Thumbnails)
- **ONE-TIME FETCH:** Metadata is fetched once per video, stored in database FOREVER
- **NEVER AUTO-REFETCHED:** We do NOT automatically update metadata. User is OK with outdated info.
- **PERMANENT STORAGE:** Just like YouTube thumbnail CDN URLs - fetch once, use forever
- **Database Storage:** All metadata stored in SQLite `video_metadata` table (hard text in database)

## Cost Analysis

### YouTube Data API v3 Quota
- **API Call:** `videos.list` (part=snippet,statistics)
- **Cost per call:** 1 quota unit
- **Videos per call:** Up to 50 (maxResults=50)
- **Total videos:** ~20,000
- **Total API calls needed:** 400 (20,000 ÷ 50)
- **Total quota cost:** 400 units
- **Free tier daily limit:** 10,000 units/day
- **Result:** ✅ Can fetch all metadata in ONE DAY for FREE

### After Initial Fetch
- **Cost:** ZERO (just like thumbnails)
- **Storage:** SQLite database (local, permanent)
- **Usage:** Check database first, only fetch if missing

## Implementation

### Database Schema
```sql
CREATE TABLE video_metadata (
    video_id TEXT PRIMARY KEY,
    title TEXT,
    author TEXT,
    view_count TEXT,
    channel_id TEXT,
    published_year TEXT,
    duration INTEGER DEFAULT 1,
    fetched_at INTEGER,
    updated_at INTEGER
);
```

### Tauri Commands
1. **`get_video_metadata_batch(video_ids: Vec<String>)`** - Batch lookup from database
2. **`save_video_metadata_batch(metadata: Vec<Value>)`** - Batch save to database
3. **`save_video_metadata(...)`** - Single video save (for individual updates)

### Frontend Flow
1. **Check Database First:** Query `get_video_metadata_batch` for all video IDs
2. **Identify Missing:** Compare with video IDs that need metadata
3. **Fetch in Batches:** YouTube API (50 videos per call)
4. **Save to Database:** `save_video_metadata_batch` (transactional)
5. **Use Metadata:** Display title, author, views from database

### Batch Processing
- Process videos in batches of 50 (YouTube API limit)
- Use transactions for database writes (performance)
- Show progress for large batches (20,000 videos)
- Handle errors gracefully (skip failed videos, continue)

## Benefits
1. **One-Time Cost:** Fetch once per video, use forever (just like thumbnails)
2. **Permanent Storage:** Hard text in database - never deleted, never auto-refetched
3. **Fast Lookups:** SQLite indexed queries (milliseconds)
4. **No API Quota Waste:** Only fetch what's missing (per playlist)
5. **Persistent:** Survives app restarts, reinstalls, updates
6. **User Preference:** User is OK with outdated info - just want it there
7. **Scalable:** Can handle 100,000+ videos

## Usage Example (Per Playlist)
```javascript
// This happens in fetchAllVideos when loading a playlist

// 1. Get metadata from database (PERMANENT STORAGE - never auto-refetched)
const invoke = await getInvoke();
const cachedMetadata = await invoke('get_video_metadata_batch', { 
  videoIds: playlistVideoIds // All video IDs in current playlist
});

// 2. Find missing videos (only fetch what's not in database)
const missingIds = playlistVideoIds.filter(id => !cachedMetadata[id]);

// 3. Fetch missing from YouTube API (batches of 50) - ONE-TIME FETCH PER VIDEO
if (missingIds.length > 0) {
  const metadataToSave = [];
  
  for (let i = 0; i < missingIds.length; i += 50) {
    const batch = missingIds.slice(i, i + 50);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch.join(',')}&key=${apiKey}`
    );
    const data = await response.json();
    
    // Prepare metadata for database
    data.items.forEach(item => {
      metadataToSave.push({
        videoId: item.id,
        title: item.snippet.title,
        author: item.snippet.channelTitle,
        viewCount: item.statistics.viewCount,
        channelId: item.snippet.channelId,
        publishedYear: new Date(item.snippet.publishedAt).getFullYear().toString(),
        duration: parseISO8601Duration(item.contentDetails.duration)
      });
    });
  }
  
  // 4. Save to database PERMANENTLY (ONE-TIME STORAGE - NEVER AUTO-REFETCHED)
  if (metadataToSave.length > 0) {
    await invoke('save_video_metadata_batch', { metadata: metadataToSave });
    console.log(`💾 Saved ${metadataToSave.length} video metadata entries to database (PERMANENT)`);
  }
}

// 5. Use metadata from database (or just fetched) - this is what gets displayed
const videosWithMetadata = playlistVideos.map(video => ({
  ...video,
  title: cachedMetadata[video.id]?.title || video.title,
  author: cachedMetadata[video.id]?.author || '',
  viewCount: cachedMetadata[video.id]?.viewCount || '0',
  // ... etc
}));
```

## Implementation Status
✅ **COMPLETE:**
1. ✅ Database schema created (`video_metadata` table)
2. ✅ Tauri commands implemented (get/save batch)
3. ✅ Frontend updated to fetch per playlist
4. ✅ Permanent storage (never auto-refetched)
5. ✅ Per-playlist fetching (not all at once)

**Next:** Display metadata in video grid UI (title, author, views)
