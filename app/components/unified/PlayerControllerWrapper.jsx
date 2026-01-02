'use client'

/**
 * PlayerControllerWrapper
 * 
 * Wraps the PlayerController component and connects it to the real YouTube TV app data.
 * This adapter maps placeholder data to real playlist/video data from the main app.
 */

import { useMemo } from 'react'
import PlayerController from './PlayerController'

export default function PlayerControllerWrapper({
  // Real data from main app
  playlists = [],
  currentPlaylistIndex = 0,
  currentVideoIndex = 0,
  playlistTabs = [],
  activePlaylistTab = 0,
  currentVideoId = null,
  currentVideoTitle = '',
  videoAuthorName = '',
  videoViewCount = null,
  videoPublishedYear = null,
  
  // Navigation handlers from main app
  onPlaylistChange = () => {},
  onVideoChange = () => {},
  onTabChange = () => {},
  onGridToggle = () => {},
  onSearchToggle = () => {},
  onHistoryToggle = () => {},
  onShuffle = () => {},
  onFilterChange = () => {},
  
  // Other handlers
  onQuadrantModeToggle = () => {},
}) {
  // Map real playlists to PlayerController format
  const mappedPlaylists = useMemo(() => {
    return playlists.map(playlist => ({
      title: playlist.name || 'Untitled Playlist',
      image: playlist.thumbnail || playlist.representativeVideoId 
        ? `https://img.youtube.com/vi/${playlist.representativeVideoId || playlist.videos?.[0]?.id || ''}/hqdefault.jpg`
        : 'https://picsum.photos/seed/playlist/800/600'
    }))
  }, [playlists])

  // Map real videos to PlayerController format
  const mappedVideos = useMemo(() => {
    const currentPlaylist = playlists[currentPlaylistIndex] || { videos: [] }
    return (currentPlaylist.videos || []).map(video => ({
      title: video.title || 'Untitled Video',
      author: videoAuthorName || 'Unknown',
      viewers: videoViewCount ? formatViews(videoViewCount) : '0',
      verified: false // Could be enhanced with channel verification
    }))
  }, [playlists, currentPlaylistIndex, videoAuthorName, videoViewCount])

  // Helper to format view count
  const formatViews = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  // For now, PlayerController uses its own internal state
  // We'll need to modify PlayerController to accept props and use them
  // This wrapper is a starting point - PlayerController will need refactoring
  
  return (
    <PlayerController 
      // TODO: PlayerController needs to be refactored to accept these props
      // For now, it uses internal placeholder data
      // We'll need to modify PlayerController.jsx to use props instead of hardcoded data
    />
  )
}


