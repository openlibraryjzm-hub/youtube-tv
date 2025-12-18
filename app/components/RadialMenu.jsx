'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { gsap } from 'gsap'
import PerspectiveTransform from 'perspective-transform'

export default function RadialMenu({ onScrollRef, playlists = [] }) {
  const canvasRef = useRef(null)
  const canvasContainerRef = useRef(null)
  const scrollThrottleRef = useRef(null)
  const animationRefs = useRef({})
  const contentElementsRef = useRef([])
  const wrapperRef = useRef(null)
  const skipTextUpdateRef = useRef(false) // Skip text update when animation just completed
  
  const [containers, setContainers] = useState([])
  const [contentElements, setContentElements] = useState([])
  const [dictionary, setDictionary] = useState({})
  const [isAnimating, setIsAnimating] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(0) // Track which set of playlists is visible
  const scrollOffsetRef = useRef(0)
  const [hoveredElementIndex, setHoveredElementIndex] = useState(null) // Track which element is hovered
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const thumbnailImagesRef = useRef(new Map()) // Cache loaded thumbnail images
  
  // Draggable position state
  const [position, setPosition] = useState({ x: 0, y: -100 }) // Start higher up, partially off screen
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Keep refs in sync with state
  useEffect(() => {
    contentElementsRef.current = contentElements
  }, [contentElements])
  
  useEffect(() => {
    scrollOffsetRef.current = scrollOffset
  }, [scrollOffset])

  // Fixed canvas dimensions - match container size
  const canvasWidth = 1200
  const canvasHeight = 1000

  // Load config and dictionary on mount
  useEffect(() => {
    fetch('/dictionary.json')
      .then(res => res.json())
      .then(data => {
        const { description, unitSize, ...letters } = data
        setDictionary(letters)
      })
      .catch(err => console.error('Failed to load dictionary:', err))

    fetch('/radial-menu-config.json')
      .then(res => res.json())
      .then(data => {
        setContainers(data.containers || [])
        setIsInitialized(true)
      })
      .catch(err => console.error('Failed to load config:', err))
  }, [])

  // Initialize content elements when containers are loaded
  useEffect(() => {
    if (!isInitialized || containers.length === 0) return

    const normalContainers = containers.filter(c => c.teleportType === null)
    const topTeleportContainer = containers.find(c => c.teleportType === 'top')
    const bottomTeleportContainer = containers.find(c => c.teleportType === 'bottom')

    // Use playlists if provided, otherwise fall back to container names
    const hasPlaylists = playlists && playlists.length > 0
    const numVisibleContainers = normalContainers.length

    // If content elements already exist, only update their text (don't reset positions)
    // This prevents scroll from snapping back after animations
    // CRITICAL: Only update text when scrollOffset changes, NOT when other dependencies change
    if (contentElements.length > 0) {
      // Use a separate effect to update text based on scrollOffset only
      // This prevents position resets
      return
    }

    // Create content elements - map playlists to containers with scroll offset
    const newContentElements = normalContainers.map((container, index) => {
      let text, color
      
      if (hasPlaylists) {
        // Calculate which playlist should be in this container (with scroll offset)
        const playlistIndex = (scrollOffset + index) % playlists.length
        const playlist = playlists[playlistIndex < 0 ? playlists.length + playlistIndex : playlistIndex]
        text = playlist?.name || `Playlist ${playlistIndex + 1}`
        color = container.contentColor || container.color || '#1a1a1a'
      } else {
        // Fallback to container names
        text = container.name
        color = container.contentColor || container.color || '#1a1a1a'
      }

      return {
        id: `content-${container.id}`,
        containerId: container.id,
        text: text,
        color: color,
        points: [...container.points],
        opacity: 1,
        elementIndex: index, // Track element index for color/highlight logic
        playlistIndex: hasPlaylists ? (scrollOffset + index) % playlists.length : null
      }
    })

    // Create duplicates for wrap-around (REVERSED: topmost in bottom teleport, bottommost in top teleport)
    // For playlists: duplicates should be the NEXT/PREVIOUS playlists that will appear after wrap-around
    if (bottomTeleportContainer && normalContainers.length > 0) {
      if (hasPlaylists) {
        // BOTTOM teleport contains duplicate of CURRENT TOP element
        // When scrolling UP from top, this will fade in at the bottom
        const topPlaylistIndex = scrollOffset % playlists.length
        const topPlaylist = playlists[topPlaylistIndex]
        const topContentElement = newContentElements[0]
        if (topContentElement) {
        newContentElements.push({
          id: `teleport-bottom-${bottomTeleportContainer.id}`,
          containerId: bottomTeleportContainer.id,
          text: topPlaylist.name || `Playlist ${topPlaylistIndex + 1}`,
          color: topContentElement.color,
          points: [...bottomTeleportContainer.points],
          opacity: 0,
          elementIndex: null, // Teleport elements don't have a normal index
          playlistIndex: topPlaylistIndex
        })
        }
      } else {
        // Fallback to container name
        const topNormalContainer = normalContainers[0]
        const topContentElement = newContentElements.find(ce => ce.containerId === topNormalContainer.id)
        if (topContentElement) {
          newContentElements.push({
            id: `teleport-bottom-${bottomTeleportContainer.id}`,
            containerId: bottomTeleportContainer.id,
            text: topContentElement.text,
            color: topContentElement.color,
            points: [...bottomTeleportContainer.points],
            opacity: 0
          })
        }
      }
    }

    if (topTeleportContainer && normalContainers.length > 0) {
      if (hasPlaylists) {
        // TOP teleport contains duplicate of BOTTOMMOST playlist (will wrap to top when scrolling DOWN)
        // When scrolling DOWN from bottom, the bottommost playlist (scrollOffset + numVisibleContainers - 1) wraps to top
        const bottommostPlaylistIndex = (scrollOffset + numVisibleContainers - 1) % playlists.length
        const bottommostPlaylist = playlists[bottommostPlaylistIndex]
        const bottomContentElement = newContentElements[newContentElements.length - 1]
        if (bottomContentElement) {
        newContentElements.push({
          id: `teleport-top-${topTeleportContainer.id}`,
          containerId: topTeleportContainer.id,
          text: bottommostPlaylist.name || `Playlist ${bottommostPlaylistIndex + 1}`,
          color: bottomContentElement.color,
          points: [...topTeleportContainer.points],
          opacity: 0,
          elementIndex: null, // Teleport elements don't have a normal index
          playlistIndex: bottommostPlaylistIndex
        })
        }
      } else {
        // Fallback to container name
        const bottomNormalContainer = normalContainers[normalContainers.length - 1]
        const bottomContentElement = newContentElements.find(ce => ce.containerId === bottomNormalContainer.id)
        if (bottomContentElement) {
          newContentElements.push({
            id: `teleport-top-${topTeleportContainer.id}`,
            containerId: topTeleportContainer.id,
            text: bottomContentElement.text,
            color: bottomContentElement.color,
            points: [...topTeleportContainer.points],
            opacity: 0
          })
        }
      }
    }

    setContentElements(newContentElements)
  }, [isInitialized, containers, playlists])

  // Separate effect to update text when scrollOffset changes (without resetting positions)
  useEffect(() => {
    if (!isInitialized || containers.length === 0 || contentElements.length === 0 || isAnimating) return
    
    // Skip if animation just completed (animations update text themselves)
    if (skipTextUpdateRef.current) {
      skipTextUpdateRef.current = false
      return
    }

    const normalContainers = containers.filter(c => c.teleportType === null)
    const hasPlaylists = playlists && playlists.length > 0
    const numVisibleContainers = normalContainers.length

    setContentElements(prev => prev.map(ce => {
      const container = containers.find(c => c.id === ce.containerId)
      if (!container) return ce
      
      // Only update text for visible normal containers (not teleport containers)
      if (container.teleportType === null) {
        const containerIndex = normalContainers.findIndex(c => c.id === ce.containerId)
        if (containerIndex !== -1) {
          let newText = ce.text
          if (hasPlaylists) {
            const playlistIndex = (scrollOffset + containerIndex) % playlists.length
            const playlist = playlists[playlistIndex < 0 ? playlists.length + playlistIndex : playlistIndex]
            newText = playlist?.name || `Playlist ${playlistIndex + 1}`
          }
          return {
            ...ce,
            text: newText,
            playlistIndex: hasPlaylists ? (scrollOffset + containerIndex) % playlists.length : null
          }
        }
      } else {
        // Update teleport container text based on scrollOffset
        if (hasPlaylists) {
          let newText = ce.text
          if (container.teleportType === 'bottom') {
            // Bottom teleport: next playlist that will appear at bottom when scrolling up
            const playlistIndex = (scrollOffset + numVisibleContainers) % playlists.length
            const playlist = playlists[playlistIndex < 0 ? playlists.length + playlistIndex : playlistIndex]
            newText = playlist?.name || `Playlist ${playlistIndex + 1}`
          } else if (container.teleportType === 'top') {
            // Top teleport: previous playlist that will wrap to top when scrolling down
            const playlistIndex = (scrollOffset - 1 + playlists.length) % playlists.length
            const playlist = playlists[playlistIndex < 0 ? playlists.length + playlistIndex : playlistIndex]
            newText = playlist?.name || `Playlist ${playlistIndex + 1}`
          }
          return {
            ...ce,
            text: newText,
            playlistIndex: hasPlaylists ? (container.teleportType === 'bottom' ? (scrollOffset + numVisibleContainers) % playlists.length : (scrollOffset - 1 + playlists.length) % playlists.length) : null
          }
        }
      }
      return ce
    }))
  }, [scrollOffset, isInitialized, containers, playlists, contentElements.length, isAnimating])

  // Animate content element morph
  const animateContentMorph = useCallback((contentElementId, targetContainerId, duration = 1) => {
    return new Promise((resolve) => {
      // Use ref to get latest elements (avoids stale closure)
      const contentElement = contentElementsRef.current.find(ce => ce.id === contentElementId)
      const targetContainer = containers.find(c => c.id === targetContainerId)
      
      if (!contentElement || !targetContainer || contentElement.containerId === targetContainerId) {
        resolve()
        return
      }

      // Kill any existing animations
      if (animationRefs.current[contentElementId]) {
        animationRefs.current[contentElementId].forEach(tween => tween.kill())
      }
      animationRefs.current[contentElementId] = []

      const tweens = []
      contentElement.points.forEach((point, index) => {
        const targetPoint = targetContainer.points[index]
        const proxy = { x: point.x, y: point.y }
        
        const tween = gsap.to(proxy, {
          x: targetPoint.x,
          y: targetPoint.y,
          duration: duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            setContentElements(prev => prev.map(ce => {
              if (ce.id === contentElementId) {
                const newPoints = [...ce.points]
                newPoints[index] = { x: proxy.x, y: proxy.y }
                return { ...ce, points: newPoints }
              }
              return ce
            }))
          },
          onComplete: () => {
            setContentElements(prev => prev.map(ce => {
              if (ce.id === contentElementId) {
                const newPoints = [...ce.points]
                newPoints[index] = { x: targetPoint.x, y: targetPoint.y }
                return { ...ce, points: newPoints }
              }
              return ce
            }))
          }
        })
        tweens.push(tween)
      })

      animationRefs.current[contentElementId] = tweens

      let completedCount = 0
      const totalTweens = tweens.length
      if (totalTweens === 0) {
        resolve()
        return
      }

      tweens.forEach(tween => {
        const originalOnComplete = tween.vars.onComplete
        tween.eventCallback('onComplete', () => {
          if (originalOnComplete) originalOnComplete()
          completedCount++
          if (completedCount === totalTweens) {
            resolve()
          }
        })
      })
    })
  }, [containers])

  // Teleport content element
  const teleportContentElement = useCallback((contentElementId, targetContainerId) => {
    const targetContainer = containers.find(c => c.id === targetContainerId)
    if (!targetContainer) return
    
    setContentElements(prev => prev.map(ce => {
      if (ce.id === contentElementId) {
        return {
          ...ce,
          containerId: targetContainerId,
          points: [...targetContainer.points]
        }
      }
      return ce
    }))
  }, [containers])

  // Animate direction
  const animateDirection = useCallback((direction, scrollSpeed) => {
    if (isAnimating || !isInitialized) return

    const hasPlaylists = playlists && playlists.length > 0
    const normalContainers = containers.filter(c => c.teleportType === null)

    // Calculate duration based on scroll speed
    let duration = 1
    if (scrollSpeed !== undefined) {
      const maxSpeed = 100
      const minDuration = 0.2
      const maxDuration = 2
      const normalizedSpeed = Math.min(Math.abs(scrollSpeed), maxSpeed)
      duration = Math.max(minDuration, Math.min(maxDuration, maxDuration / (1 + normalizedSpeed / (maxSpeed * 0.5))))
    }

    const teleportKey = direction === 'up' ? 'aboveTeleportContainerId' : 'belowTeleportContainerId'
    const animations = []

    // Use ref to get latest elements (avoids stale closure)
    const currentElements = contentElementsRef.current

    currentElements.forEach(contentElement => {
      // Skip elements that are in teleport containers with opacity 0 (duplicates)
      if (contentElement.opacity === 0) {
        const container = containers.find(c => c.id === contentElement.containerId)
        if (container && container.teleportType !== null) {
          return // Skip invisible duplicates in teleport containers
        }
      }
      
      const currentContainer = containers.find(c => c.id === contentElement.containerId)
      if (!currentContainer) {
        return
      }

      // Check for teleport first
      const teleportTargetId = currentContainer[teleportKey]
      if (teleportTargetId) {
        const targetContainer = containers.find(c => c.id === teleportTargetId)
        if (targetContainer && targetContainer.teleportType === null) {
          teleportContentElement(contentElement.id, teleportTargetId)
          return
        }
      }

      // Use menu order
      const currentIndex = normalContainers.findIndex(c => c.id === contentElement.containerId)
      if (currentIndex === -1) return

      let targetIndex
      if (direction === 'up') {
        targetIndex = currentIndex === 0 ? normalContainers.length - 1 : currentIndex - 1
      } else {
        targetIndex = currentIndex === normalContainers.length - 1 ? 0 : currentIndex + 1
      }

      const targetContainerId = normalContainers[targetIndex].id
      const isWrapAround = (direction === 'up' && currentIndex === 0) || 
                          (direction === 'down' && currentIndex === normalContainers.length - 1)

      if (isWrapAround) {
        // Wrap-around animation
        const fadeOutTeleportType = direction === 'up' ? 'top' : 'bottom'
        const fadeOutTeleportContainer = containers.find(c => c.teleportType === fadeOutTeleportType)
        const fadeInTeleportType = direction === 'up' ? 'bottom' : 'top'
        const fadeInTeleportContainer = containers.find(c => c.teleportType === fadeInTeleportType)

        if (fadeOutTeleportContainer && fadeInTeleportContainer) {
          const duplicateElement = currentElements.find(ce => 
            ce.containerId === fadeInTeleportContainer.id && ce.opacity === 0
          )

          if (duplicateElement) {
            // Dual animation: fade out original, fade in duplicate
            const fadeOutAndMorph = animateContentMorph(contentElement.id, fadeOutTeleportContainer.id, duration).then(() => {
              setContentElements(prev => prev.map(ce => {
                if (ce.id === contentElement.id) {
                  return { ...ce, containerId: fadeOutTeleportContainer.id, opacity: 0 }
                }
                return ce
              }))
            })

            const fadeOutTween = gsap.to({}, {
              duration: duration,
              ease: 'power2.inOut',
              onUpdate: () => {
                setContentElements(prev => prev.map(ce => {
                  if (ce.id === contentElement.id) {
                    return { ...ce, opacity: Math.max(0, 1 - fadeOutTween.progress()) }
                  }
                  return ce
                }))
              }
            })

            const fadeInDelay = duration * 0.3
            const fadeInTween = gsap.to({}, {
              duration: duration - fadeInDelay,
              delay: fadeInDelay,
              ease: 'power2.inOut',
              onUpdate: () => {
                setContentElements(prev => prev.map(ce => {
                  if (ce.id === duplicateElement.id) {
                    const fadeInProgress = fadeInTween.progress()
                    const totalProgress = fadeInDelay + (fadeInProgress * (duration - fadeInDelay))
                    return { ...ce, opacity: Math.min(1, totalProgress / duration) }
                  }
                  return ce
                }))
              }
            })

            animations.push(
              Promise.all([
                fadeOutAndMorph,
                animateContentMorph(duplicateElement.id, targetContainerId, duration)
              ]).then(() => {
                // Update scroll offset when wrap-around completes (for playlist scrolling)
                // Scrolling DOWN: bottommost wraps to top (scrollOffset decrements)
                //   Example: 1,2,3,4,5,6,7 → 49,1,2,3,4,5,6 (offset 0 → 48)
                // Scrolling UP: topmost moves down, new appears at bottom (scrollOffset increments)
                //   Example: 1,2,3,4,5,6,7 → 2,3,4,5,6,7,8 (offset 0 → 1)
                let newScrollOffset = scrollOffsetRef.current
                if (hasPlaylists && playlists.length > normalContainers.length) {
                  if (direction === 'down') {
                    // Scrolled down from bottom - bottommost wraps to top
                    // scrollOffset decrements: 0 → 48 (for 49 playlists)
                    newScrollOffset = (scrollOffsetRef.current - 1 + playlists.length) % playlists.length
                  } else {
                    // Scrolled up from top - topmost moves down, new appears at bottom
                    // scrollOffset increments: 0 → 1
                    newScrollOffset = (scrollOffsetRef.current + 1) % playlists.length
                  }
                  // Update scrollOffset - skip text update effect since we already updated everything
                  skipTextUpdateRef.current = true
                  setScrollOffset(newScrollOffset)
                  scrollOffsetRef.current = newScrollOffset
                }
                
                // Single atomic update - match original implementation exactly
                setContentElements(prev => {
                  // CRITICAL: Remove the original element FIRST (before renaming duplicate)
                  // The original is now in the fade-out teleport container with opacity 0
                  let updated = prev.filter(ce => ce.id !== contentElement.id)
                  
                  // Now update duplicate's container, make it fully visible, and rename to original ID
                  // Also update its text if using playlists (since scrollOffset changed)
                  updated = updated.map(ce => {
                    if (ce.id === duplicateElement.id) {
                      let newText = ce.text
                      // If using playlists, update text based on new scrollOffset
                      if (hasPlaylists && playlists.length > 0) {
                        // This element is moving to targetContainerId
                        const targetIndex = normalContainers.findIndex(c => c.id === targetContainerId)
                        if (targetIndex !== -1) {
                          const playlistIndex = (newScrollOffset + targetIndex) % playlists.length
                          const playlist = playlists[playlistIndex]
                          newText = playlist.name || `Playlist ${playlistIndex + 1}`
                        }
                      }
                      return { ...ce, containerId: targetContainerId, opacity: 1, id: contentElement.id, text: newText }
                    }
                    return ce
                  })
                  
                  // Update ALL visible elements' text based on new scrollOffset
                  if (hasPlaylists && playlists.length > 0) {
                    updated = updated.map(ce => {
                      const container = containers.find(c => c.id === ce.containerId)
                      if (container && container.teleportType === null && ce.opacity === 1) {
                        const containerIndex = normalContainers.findIndex(c => c.id === ce.containerId)
                        if (containerIndex !== -1) {
                          const playlistIndex = (newScrollOffset + containerIndex) % playlists.length
                          const playlist = playlists[playlistIndex]
                          return { ...ce, text: playlist.name || `Playlist ${playlistIndex + 1}` }
                        }
                      }
                      return ce
                    })
                  }
                  
                  // Update duplicates in BOTH teleport containers to reflect current top/bottom elements
                  // REVERSED: topmost element goes in bottom teleport container, bottommost element goes in top teleport container
                  
                  // Find the current topmost and bottommost normal containers
                  const topNormalContainer = normalContainers[0]
                  const bottomNormalContainer = normalContainers[normalContainers.length - 1]
                  
                  // Find the elements currently in topmost and bottommost containers
                  const topElement = updated.find(ce => ce.containerId === topNormalContainer?.id && ce.opacity === 1)
                  const bottomElement = updated.find(ce => ce.containerId === bottomNormalContainer?.id && ce.opacity === 1)
                  
                  // Find top and bottom teleport containers
                  const topTeleportContainer = containers.find(c => c.teleportType === 'top')
                  const bottomTeleportContainer = containers.find(c => c.teleportType === 'bottom')
                  
                  // Remove old duplicates
                  updated = updated.filter(ce => {
                    const isTopDuplicate = ce.containerId === topTeleportContainer?.id && ce.opacity === 0
                    const isBottomDuplicate = ce.containerId === bottomTeleportContainer?.id && ce.opacity === 0
                    return !isTopDuplicate && !isBottomDuplicate
                  })
                  
                  // Create new duplicate in TOP teleport container
                  // This will be the BOTTOMMOST playlist that wraps to top when scrolling DOWN
                  // Note: scrollOffset has already been updated above, so use newScrollOffset
                  if (topTeleportContainer && bottomElement) {
                    let duplicateText = bottomElement.text
                    let duplicateColor = bottomElement.color
                    
                    // If using playlists, calculate the bottommost playlist after scrollOffset updates
                    // After scrolling DOWN, the new bottommost is at (newScrollOffset + numVisibleContainers - 1)
                    if (hasPlaylists && playlists.length > 0) {
                      const bottommostPlaylistIndex = (newScrollOffset + normalContainers.length - 1) % playlists.length
                      const bottommostPlaylist = playlists[bottommostPlaylistIndex]
                      duplicateText = bottommostPlaylist.name || `Playlist ${bottommostPlaylistIndex + 1}`
                    }
                    
                    updated.push({
                      id: `teleport-top-${topTeleportContainer.id}`,
                      containerId: topTeleportContainer.id,
                      text: duplicateText,
                      color: duplicateColor,
                      points: [...topTeleportContainer.points],
                      opacity: 0
                    })
                  }
                  
                  // Create new duplicate in BOTTOM teleport container
                  // This will be the TOPMOST playlist that appears at bottom when scrolling UP
                  // Note: scrollOffset has already been updated above, so use newScrollOffset
                  if (bottomTeleportContainer && topElement) {
                    let duplicateText = topElement.text
                    let duplicateColor = topElement.color
                    
                    // If using playlists, after scrolling UP, the new topmost is at newScrollOffset
                    // So the duplicate should be that playlist (for the next wrap-around when scrolling up)
                    if (hasPlaylists && playlists.length > 0) {
                      const topPlaylistIndex = newScrollOffset % playlists.length
                      const topPlaylist = playlists[topPlaylistIndex]
                      duplicateText = topPlaylist.name || `Playlist ${topPlaylistIndex + 1}`
                    }
                    
                    updated.push({
                      id: `teleport-bottom-${bottomTeleportContainer.id}`,
                      containerId: bottomTeleportContainer.id,
                      text: duplicateText,
                      color: duplicateColor,
                      points: [...bottomTeleportContainer.points],
                      opacity: 0
                    })
                  }
                  
                  return updated
                })
              })
            )
            return
          }
        }
        
        teleportContentElement(contentElement.id, targetContainerId)
        return
      }

      // Normal morph animation
      animations.push(
        animateContentMorph(contentElement.id, targetContainerId, duration).then(() => {
          setContentElements(prev => prev.map(ce => {
            if (ce.id === contentElement.id) {
              return { ...ce, containerId: targetContainerId }
            }
            return ce
          }))
        })
      )
    })

    setIsAnimating(true)
    Promise.all(animations).then(() => {
      setIsAnimating(false)
    }).catch(() => {
      setIsAnimating(false)
    })
  }, [containers, isAnimating, isInitialized, animateContentMorph, teleportContentElement, playlists])

  // Handle scroll wheel
  const handleWheel = useCallback((e) => {
    if (!isInitialized || isAnimating) return
    if (e && e.preventDefault) {
      e.preventDefault()
    }

    if (scrollThrottleRef.current !== null) return

    const deltaY = e.deltaY !== undefined ? e.deltaY : 0
    const direction = deltaY < 0 ? 'up' : 'down'
    const scrollSpeed = Math.abs(deltaY)

    animateDirection(direction, scrollSpeed)

    scrollThrottleRef.current = window.setTimeout(() => {
      scrollThrottleRef.current = null
    }, 100)
  }, [isInitialized, isAnimating, animateDirection])

  // Expose scroll handler via ref
  useEffect(() => {
    if (onScrollRef) {
      onScrollRef.current = handleWheel
    }
  }, [onScrollRef, handleWheel])

  // Add scroll wheel listener
  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    if (!canvasContainer) return

    canvasContainer.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvasContainer.removeEventListener('wheel', handleWheel)
      if (scrollThrottleRef.current !== null) {
        clearTimeout(scrollThrottleRef.current)
        scrollThrottleRef.current = null
      }
    }
  }, [handleWheel])

  // Handle mouse move for hover detection
  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    const canvas = canvasRef.current
    if (!canvasContainer || !canvas) return

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      
      setMousePos({ x, y })
      
      // Check which element is being hovered
      const normalContainers = containers.filter(c => c.teleportType === null)
      let hoveredIndex = null
      
      contentElements.forEach((contentElement) => {
        const container = containers.find(c => c.id === contentElement.containerId)
        if (!container || container.teleportType !== null) return
        if (contentElement.opacity === 0) return
        
        const containerIndex = normalContainers.findIndex(c => c.id === contentElement.containerId)
        if (containerIndex === -1) return
        
        // Check if point is inside the quadrilateral using point-in-polygon test
        const points = contentElement.points
        let inside = false
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const xi = points[i].x, yi = points[i].y
          const xj = points[j].x, yj = points[j].y
          const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
          if (intersect) inside = !inside
        }
        
        if (inside) {
          hoveredIndex = containerIndex
        }
      })
      
      setHoveredElementIndex(hoveredIndex)
    }

    const handleMouseLeave = () => {
      setHoveredElementIndex(null)
      setMousePos({ x: 0, y: 0 })
    }

    canvasContainer.addEventListener('mousemove', handleMouseMove)
    canvasContainer.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      canvasContainer.removeEventListener('mousemove', handleMouseMove)
      canvasContainer.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [contentElements, containers])

  // Draw transformed path
  const drawTransformedPath = useCallback((ctx, svgPath, sourceQuad, destQuad) => {
    const perspT = new PerspectiveTransform(sourceQuad, destQuad)
    
    const transformPoint = (x, y) => {
      const result = perspT.transform(x, y)
      if (Array.isArray(result) && result.length >= 2) {
        return [result[0], result[1]]
      }
      return [x, y]
    }

    // Helper to convert SVG arc to canvas arc points
    const arcToCanvas = (x1, y1, rx, ry, rotation, largeArc, sweep, x2, y2) => {
      const numSegments = 40
      const points = []
      
      const dx = (x1 - x2) / 2
      const dy = (y1 - y2) / 2
      const cosPhi = Math.cos(rotation * Math.PI / 180)
      const sinPhi = Math.sin(rotation * Math.PI / 180)
      const x1p = cosPhi * dx + sinPhi * dy
      const y1p = -sinPhi * dx + cosPhi * dy
      
      const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
      let rxScaled = rx
      let ryScaled = ry
      if (lambda > 1) {
        rxScaled = Math.sqrt(lambda) * rx
        ryScaled = Math.sqrt(lambda) * ry
      }
      
      const sign = largeArc === sweep ? -1 : 1
      const denom = (rxScaled * rxScaled) * (ryScaled * ryScaled) - (rxScaled * rxScaled) * (y1p * y1p) - (ryScaled * ryScaled) * (x1p * x1p)
      const s = sign * Math.sqrt(Math.max(0, denom) / ((rxScaled * rxScaled) * (y1p * y1p) + (ryScaled * ryScaled) * (x1p * x1p)))
      const cxp = s * rxScaled * y1p / ryScaled
      const cyp = s * -ryScaled * x1p / rxScaled
      
      const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
      const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2
      
      const ux = (x1p - cxp) / rxScaled
      const uy = (y1p - cyp) / ryScaled
      const vx = (-x1p - cxp) / rxScaled
      const vy = (-y1p - cyp) / ryScaled
      
      let startAngle = Math.atan2(uy, ux)
      let deltaAngle = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
      
      if (sweep === 0 && deltaAngle > 0) {
        deltaAngle -= 2 * Math.PI
      } else if (sweep === 1 && deltaAngle < 0) {
        deltaAngle += 2 * Math.PI
      }
      
      for (let i = 0; i <= numSegments; i++) {
        const angle = startAngle + (deltaAngle * i) / numSegments
        const x = cx + rxScaled * Math.cos(angle) * cosPhi - ryScaled * Math.sin(angle) * sinPhi
        const y = cy + rxScaled * Math.cos(angle) * sinPhi + ryScaled * Math.sin(angle) * cosPhi
        points.push([x, y])
      }
      
      return points
    }

    const commands = svgPath.match(/[MLZACQTHVmlzacthv][^MLZACQTHVmlzacthv]*/g) || []
    
    ctx.beginPath()
    
    let currentX = 0
    let currentY = 0
    let startX = 0
    let startY = 0
    let pathStarted = false
    
    for (const command of commands) {
      const type = command[0].toUpperCase()
      const isRelative = command[0] === command[0].toLowerCase()
      const coords = command.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number)
      
      if (type === 'M') {
        if (coords.length >= 2) {
          const x = isRelative ? currentX + coords[0] : coords[0]
          const y = isRelative ? currentY + coords[1] : coords[1]
          const [tx, ty] = transformPoint(x, y)
          currentX = x
          currentY = y
          startX = x
          startY = y
          if (pathStarted) {
            ctx.moveTo(tx, ty)
          } else {
            ctx.moveTo(tx, ty)
            pathStarted = true
          }
        }
      } else if (type === 'L') {
        for (let i = 0; i < coords.length; i += 2) {
          if (i + 1 < coords.length) {
            const x = isRelative ? currentX + coords[i] : coords[i]
            const y = isRelative ? currentY + coords[i + 1] : coords[i + 1]
            const [tx, ty] = transformPoint(x, y)
            currentX = x
            currentY = y
            ctx.lineTo(tx, ty)
          }
        }
      } else if (type === 'Z') {
        const [tx, ty] = transformPoint(startX, startY)
        ctx.lineTo(tx, ty)
        ctx.closePath()
      } else if (type === 'A') {
        if (coords.length >= 7) {
          const [rx, ry, rotation, largeArc, sweep, x, y] = coords
          const endX = isRelative ? currentX + x : x
          const endY = isRelative ? currentY + y : y
          
          const arcPoints = arcToCanvas(
            currentX, currentY,
            rx, ry,
            rotation,
            largeArc,
            sweep,
            endX, endY
          )
          
          for (let i = 1; i < arcPoints.length; i++) {
            const [px, py] = arcPoints[i]
            const [tx, ty] = transformPoint(px, py)
            ctx.lineTo(tx, ty)
          }
          
          currentX = endX
          currentY = endY
        }
      } else if (type === 'C') {
        if (coords.length >= 6) {
          const [x1, y1, x2, y2, x, y] = coords
          const cp1X = isRelative ? currentX + x1 : x1
          const cp1Y = isRelative ? currentY + y1 : y1
          const cp2X = isRelative ? currentX + x2 : x2
          const cp2Y = isRelative ? currentY + y2 : y2
          const endX = isRelative ? currentX + x : x
          const endY = isRelative ? currentY + y : y
          
          const [tx1, ty1] = transformPoint(cp1X, cp1Y)
          const [tx2, ty2] = transformPoint(cp2X, cp2Y)
          const [tx, ty] = transformPoint(endX, endY)
          
          ctx.bezierCurveTo(tx1, ty1, tx2, ty2, tx, ty)
          currentX = endX
          currentY = endY
        }
      } else if (type === 'H') {
        for (let i = 0; i < coords.length; i++) {
          const x = isRelative ? currentX + coords[i] : coords[i]
          const [tx, ty] = transformPoint(x, currentY)
          currentX = x
          ctx.lineTo(tx, ty)
        }
      } else if (type === 'V') {
        for (let i = 0; i < coords.length; i++) {
          const y = isRelative ? currentY + coords[i] : coords[i]
          const [tx, ty] = transformPoint(currentX, y)
          currentY = y
          ctx.lineTo(tx, ty)
        }
      }
    }
    
    try {
      ctx.fill('evenodd')
    } catch {
      ctx.fill()
    }
    ctx.stroke()
  }, [])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isInitialized) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set fixed canvas size
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    
    // Load thumbnail images for element 2
    const thumbnailImages = new Map()

    // DEBUG: Draw container outlines
    containers.forEach((container) => {
      if (!container.points || container.points.length < 4) return
      
      ctx.strokeStyle = container.teleportType === 'top' ? '#ff00ff' : 
                       container.teleportType === 'bottom' ? '#00ffff' : 
                       '#00ff00'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.5
      
      ctx.beginPath()
      ctx.moveTo(container.points[0].x, container.points[0].y)
      ctx.lineTo(container.points[1].x, container.points[1].y)
      ctx.lineTo(container.points[2].x, container.points[2].y)
      ctx.lineTo(container.points[3].x, container.points[3].y)
      ctx.closePath()
      ctx.stroke()
      
      // Draw container ID label
      const centerX = (container.points[0].x + container.points[1].x + container.points[2].x + container.points[3].x) / 4
      const centerY = (container.points[0].y + container.points[1].y + container.points[2].y + container.points[3].y) / 4
      
      ctx.fillStyle = ctx.strokeStyle
      ctx.font = '12px monospace'
      ctx.globalAlpha = 0.8
      ctx.fillText(container.id || 'no-id', centerX - 20, centerY)
      
      // Draw teleport type if applicable
      if (container.teleportType) {
        ctx.fillText(`[${container.teleportType}]`, centerX - 20, centerY + 15)
      }
    })
    
    ctx.globalAlpha = 1

    // Draw content elements
    contentElements.forEach((contentElement) => {
      const contentPoints = contentElement.points
      const elementOpacity = contentElement.opacity ?? 1

      // Skip invisible duplicates in teleport containers, but render visible elements even if opacity is low
      if (elementOpacity === 0) {
        const container = containers.find(c => c.id === contentElement.containerId)
        if (container && container.teleportType !== null) {
          return // Skip invisible duplicates
        }
        // Don't skip if it's a normal container (might be fading)
      }

      // DEBUG: Draw element outline to see where it actually is
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.moveTo(contentPoints[0].x, contentPoints[0].y)
      ctx.lineTo(contentPoints[1].x, contentPoints[1].y)
      ctx.lineTo(contentPoints[2].x, contentPoints[2].y)
      ctx.lineTo(contentPoints[3].x, contentPoints[3].y)
      ctx.closePath()
      ctx.stroke()
      
      // DEBUG: Draw element ID and container ID
      const centerX = (contentPoints[0].x + contentPoints[1].x + contentPoints[2].x + contentPoints[3].x) / 4
      const centerY = (contentPoints[0].y + contentPoints[1].y + contentPoints[2].y + contentPoints[3].y) / 4
      ctx.fillStyle = '#ffff00'
      ctx.font = '10px monospace'
      ctx.globalAlpha = 0.6
      ctx.fillText(`E:${contentElement.id.substring(0, 8)}`, centerX - 30, centerY - 10)
      ctx.fillText(`C:${contentElement.containerId?.substring(0, 8) || 'none'}`, centerX - 30, centerY + 5)
      ctx.fillText(`O:${elementOpacity.toFixed(2)}`, centerX - 30, centerY + 20)

      ctx.globalAlpha = elementOpacity

      // Determine text color: element 2 (index 1) is yellow, others are white (or yellow if hovered)
      const normalContainers = containers.filter(c => c.teleportType === null)
      const containerIndex = normalContainers.findIndex(c => c.id === contentElement.containerId)
      const isElement2 = containerIndex === 1 // Element 2 is at index 1 (0-indexed)
      const isHovered = hoveredElementIndex !== null && hoveredElementIndex === containerIndex
      
      // Text color: element 2 is always yellow, hovered elements are yellow, others are white
      const textColor = isElement2 || isHovered ? '#ffff00' : '#ffffff'

      // Draw perspective-warped text
      if (contentElement.text && contentElement.text.length > 0) {
        const textLetters = contentElement.text.toUpperCase().split('').filter(char => /[A-Z]/.test(char))
        if (textLetters.length > 0) {
          ctx.fillStyle = textColor
          ctx.strokeStyle = textColor
          ctx.lineWidth = 2

          const numLetters = textLetters.length

          for (let i = 0; i < numLetters; i++) {
            const t1 = i / numLetters
            const t2 = (i + 1) / numLetters

            // Interpolate top edge
            const topLeft = {
              x: contentPoints[0].x + (contentPoints[1].x - contentPoints[0].x) * t1,
              y: contentPoints[0].y + (contentPoints[1].y - contentPoints[0].y) * t1
            }
            const topRight = {
              x: contentPoints[0].x + (contentPoints[1].x - contentPoints[0].x) * t2,
              y: contentPoints[0].y + (contentPoints[1].y - contentPoints[0].y) * t2
            }

            // Interpolate bottom edge
            const bottomLeft = {
              x: contentPoints[3].x + (contentPoints[2].x - contentPoints[3].x) * t1,
              y: contentPoints[3].y + (contentPoints[2].y - contentPoints[3].y) * t1
            }
            const bottomRight = {
              x: contentPoints[3].x + (contentPoints[2].x - contentPoints[3].x) * t2,
              y: contentPoints[3].y + (contentPoints[2].y - contentPoints[3].y) * t2
            }

            const letterQuad = [
              topLeft.x, topLeft.y,
              topRight.x, topRight.y,
              bottomRight.x, bottomRight.y,
              bottomLeft.x, bottomLeft.y
            ]

            const sourceQuad = [0, 0, 100, 0, 100, 100, 0, 100]

            const letter = textLetters[i]
            if (dictionary[letter]) {
              const letterData = dictionary[letter]
              drawTransformedPath(ctx, letterData.svgPathD, sourceQuad, letterQuad)
            }
          }
        }
      }

      // Draw thumbnail for element 2 (index 1)
      if (isElement2 && contentElement.playlistIndex !== null && playlists[contentElement.playlistIndex]) {
        const playlist = playlists[contentElement.playlistIndex]
        const thumbnailSize = 80
        const thumbnailX = contentPoints[0].x - thumbnailSize - 20 // Left of element
        const thumbnailY = (contentPoints[0].y + contentPoints[3].y) / 2 - thumbnailSize / 2 // Vertically centered
        
        // Draw thumbnail background
        ctx.fillStyle = '#333333'
        ctx.fillRect(thumbnailX, thumbnailY, thumbnailSize, thumbnailSize)
        
        // Get or load thumbnail image
        let thumbnailUrl = null
        if (playlist.thumbnail) {
          thumbnailUrl = playlist.thumbnail
        } else if (playlist.representativeVideoId) {
          thumbnailUrl = `https://img.youtube.com/vi/${playlist.representativeVideoId}/mqdefault.jpg`
        }
        
        if (thumbnailUrl) {
          const cachedImg = thumbnailImagesRef.current.get(thumbnailUrl)
          if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
            // Draw cached image
            ctx.drawImage(cachedImg, thumbnailX, thumbnailY, thumbnailSize, thumbnailSize)
          } else if (!cachedImg) {
            // Load image and cache it
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              thumbnailImagesRef.current.set(thumbnailUrl, img)
              // Trigger canvas redraw
              const canvas = canvasRef.current
              if (canvas) {
                // Force re-render by updating a dummy state or calling draw again
                setContentElements(prev => [...prev])
              }
            }
            img.onerror = () => {
              // Draw placeholder on error
              thumbnailImagesRef.current.set(thumbnailUrl, null) // Mark as failed
            }
            img.src = thumbnailUrl
            thumbnailImagesRef.current.set(thumbnailUrl, img)
          }
        }
        
        // Draw placeholder if no image loaded
        const cachedImg = thumbnailUrl ? thumbnailImagesRef.current.get(thumbnailUrl) : null
        if (!cachedImg || !cachedImg.complete || cachedImg.naturalWidth === 0) {
          ctx.fillStyle = '#666666'
          ctx.fillRect(thumbnailX, thumbnailY, thumbnailSize, thumbnailSize)
          ctx.fillStyle = '#ffffff'
          ctx.font = '12px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('No Image', thumbnailX + thumbnailSize / 2, thumbnailY + thumbnailSize / 2)
        }
      }

      ctx.globalAlpha = 1
    })
  }, [contentElements, dictionary, isInitialized, drawTransformedPath, hoveredElementIndex, playlists, thumbnailImagesRef])

  // Handle dragging
  const handleMouseDown = useCallback((e) => {
    // Check if clicking on wrapper border (not canvas)
    const target = e.target
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    const borderWidth = 8 // Border hit area
    
    const isOnBorder = 
      clickX < borderWidth || 
      clickX > rect.width - borderWidth ||
      clickY < borderWidth || 
      clickY > rect.height - borderWidth
    
    // Also allow if clicking directly on wrapper element
    if (isOnBorder || target === wrapperRef.current) {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
      const parent = wrapperRef.current?.parentElement
      if (parent) {
        const parentRect = parent.getBoundingClientRect()
        setDragStart({
          x: e.clientX - parentRect.left - position.x,
          y: e.clientY - parentRect.top - position.y
        })
      }
    }
  }, [position])

  const handleMouseMove = useCallback((e) => {
    if (isDragging && wrapperRef.current) {
      const parent = wrapperRef.current.parentElement
      if (parent) {
        const parentRect = parent.getBoundingClientRect()
        const newX = e.clientX - parentRect.left - dragStart.x
        const newY = e.clientY - parentRect.top - dragStart.y
        setPosition({
          x: newX,
          y: newY
        })
      }
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (!isInitialized || containers.length === 0) {
    return null
  }

  return (
    <div
      ref={wrapperRef}
      className="absolute border-2 border-yellow-400 bg-yellow-400/10"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '100%',
        height: '100%',
        zIndex: 20,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div 
        ref={canvasContainerRef}
        className="w-full h-full relative pointer-events-auto"
        style={{ backgroundColor: '#000' }}
        onWheel={(e) => {
          // Forward scroll events to radial menu
          if (onScrollRef?.current) {
            onScrollRef.current(e.nativeEvent)
          }
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full pointer-events-auto"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  )
}
