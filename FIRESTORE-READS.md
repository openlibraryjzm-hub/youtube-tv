# Firestore Reads Optimization Guide

**Last Updated:** 2025-01-06  
**Status:** Critical - Read optimization implemented

## Overview

This document explains which parts of the application require Firestore reads and which are optional, helping to minimize costs and stay within daily limits.

## Required Firestore Reads (Essential)

### 1. Main User Document (`onSnapshot`)
- **Location:** `app/page.jsx` ~line 980
- **Reads:** 1 per page load + 1 per document update
- **Purpose:** Load playlists, tabs, video progress, custom colors
- **Required:** ✅ YES - Core functionality depends on this
- **Optimization:** Uses `onSnapshot` (real-time listener) - this is the most efficient approach

### 2. History Subcollection (`onSnapshot`)
- **Location:** `app/page.jsx` ~line 1605
- **Reads:** 1 per page load + 1 per history update (limited to 100 items)
- **Purpose:** Resume video playback, track watch history
- **Required:** ✅ YES - Resume functionality depends on this
- **Optimization:** Uses `onSnapshot` with `limit(100)` - only loads last 100 entries

## Optional Firestore Reads (Now Disabled on Load)

### 3. Video Metadata Subcollection (`getDocs` / `getDoc`)
- **Location:** 
  - ~~`app/page.jsx` ~line 1446~~ (REMOVED - was causing 10-15k reads on refresh)
  - `app/page.jsx` ~line 2124 (lazy load when video is played)
  - `app/page.jsx` ~line 3124 (bulk add - only when fetching new playlists)
- **Reads:** 
  - ~~Thousands on page load~~ (REMOVED)
  - 1 per video when actually viewed (lazy)
  - Batched during bulk add (only for new videos)
- **Purpose:** Video titles, author, views, year, duration
- **Required:** ❌ NO - Thumbnails and playback work without this
- **Optimization:** 
  - ✅ **Metadata cache now uses localStorage** - persists across refreshes
  - ✅ **No Firestore reads on page load** - only checks localStorage cache
  - ✅ **Lazy loading** - only fetches when video is actually played
  - ✅ **In-memory cache** - prevents duplicate reads in same session

## Read Optimization Strategy

### Before Optimization
- **On Refresh:** 10,000-15,000 reads (checking metadata for all videos)
- **Per Session:** 20,000+ reads (repeated checks)

### After Optimization
- **On Refresh:** ~2 reads (main document + history only)
- **Per Session:** ~2-10 reads (only when viewing new videos)
- **Metadata Cache:** Stored in localStorage (survives refreshes, no reads needed)

## How It Works Now

1. **Page Load:**
   - Load main user document (1 read)
   - Load history subcollection (1 read)
   - Load metadata cache from localStorage (0 reads)
   - **Total: 2 reads**

2. **Video Playback:**
   - Check in-memory cache first (0 reads)
   - If not found, check localStorage (0 reads)
   - If still not found, fetch from Firestore (1 read, lazy)
   - **Total: 0-1 reads per new video**

3. **Bulk Add:**
   - Check in-memory cache first (0 reads)
   - Only query Firestore for videos not in cache (batched, 30 per query)
   - **Total: Minimal reads, only for truly new videos**

## localStorage Cache

- **Key:** `youtube-tv-metadata-cache`
- **Size Limit:** 10MB (roughly 50k videos)
- **Auto-trim:** If exceeds 10MB, keeps most recent 40k entries
- **Persistence:** Survives page refreshes, browser restarts
- **Update:** Debounced (saves 5 seconds after last change)

## Critical Rules

1. **NEVER query Firestore metadata on page load** - Use localStorage cache only
2. **ALWAYS check in-memory cache first** - Before localStorage, before Firestore
3. **Lazy load metadata** - Only fetch when video is actually viewed
4. **Persist to localStorage** - After fetching from Firestore, save to localStorage

## Monitoring

Watch for these patterns that indicate excessive reads:
- Read spikes on page refresh (should be ~2 reads)
- Repeated reads for same video IDs (should be cached)
- Reads during idle time (should only happen on user action)

## Related Documentation

- [PATTERNS.md#16](./PATTERNS.md#16) - API Call Minimization Pattern
- [GOTCHAS.md#11](./GOTCHAS.md#11) - Excessive API Usage Gotcha
- [DATA-FLOW.md](./DATA-FLOW.md) - Data flow diagrams
