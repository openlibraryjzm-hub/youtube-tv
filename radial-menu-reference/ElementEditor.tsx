'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { gsap } from 'gsap'
import PerspectiveTransform from 'perspective-transform'

interface Point {
  x: number
  y: number
}

interface Container {
  id: string
  name: string
  points: Point[]
  color: string
  contentColor: string // Color for the content element that will be created in this container
  aboveContainerId: string | null // Which container is above this one
  belowContainerId: string | null // Which container is below this one
  aboveTeleportContainerId: string | null // Which container to teleport to when going up (instant, no morph)
  belowTeleportContainerId: string | null // Which container to teleport to when going down (instant, no morph)
  teleportType: 'top' | 'bottom' | null // Special container type for wrap-around animations
}

interface ContentElement {
  id: string
  containerId: string // Which container this content is currently in
  text: string // Text to display (will be warped with perspective)
  color: string
  points: Point[] // Will match container's points
  opacity: number // Opacity for fade in/out effects (0-1)
}

interface LetterData {
  guidePoints: {
    TL: [number, number]
    TR: [number, number]
    BR: [number, number]
    BL: [number, number]
    Center: [number, number]
  }
  svgPathD: string
}

export default function ElementEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [containers, setContainers] = useState<Container[]>([
    {
      id: 'container-1',
      name: 'Container 1',
      points: [
        { x: 200, y: 200 },
        { x: 800, y: 200 },
        { x: 800, y: 600 },
        { x: 200, y: 600 },
      ],
      color: '#1a1a1a',
      contentColor: '#1a1a1a', // Default content color same as container color
      aboveContainerId: null,
      belowContainerId: null,
      aboveTeleportContainerId: null,
      belowTeleportContainerId: null,
      teleportType: null
    }
  ])
  const [contentElements, setContentElements] = useState<ContentElement[]>([])
  const [isAnimateMode, setIsAnimateMode] = useState(false)
  const [selectedContainerId, setSelectedContainerId] = useState<string>('container-1')
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null)
  const [imagePosition, setImagePosition] = useState<Point>({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 1200, height: 1000 })
  const [isResizingImage, setIsResizingImage] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null)
  const [hoveredResizeHandle, setHoveredResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null)
  const [defaultColor, setDefaultColor] = useState<string>('#1a1a1a')
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRefs = useRef<Record<string, gsap.core.Tween[]>>({})
  const [draggedContainerId, setDraggedContainerId] = useState<string | null>(null)
  const [dragOverContainerId, setDragOverContainerId] = useState<string | null>(null)
  const [viewportBox, setViewportBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isDraggingViewport, setIsDraggingViewport] = useState(false)
  const [viewportDragStart, setViewportDragStart] = useState<Point | null>(null)
  const [isResizingViewport, setIsResizingViewport] = useState(false)
  const [viewportResizeHandle, setViewportResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null)
  const [hoveredViewportHandle, setHoveredViewportHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const scrollThrottleRef = useRef<number | null>(null)
  const dictionaryFileInputRef = useRef<HTMLInputElement>(null)
  const [dictionary, setDictionary] = useState<Record<string, LetterData>>({})

  const canvasWidth = 1200
  const canvasHeight = 1000

  // Load dictionary on mount
  useEffect(() => {
    fetch('/dictionary.json')
      .then(res => res.json())
      .then(data => {
        // Remove description and unitSize from the dictionary
        const { description, unitSize, ...letters } = data
        setDictionary(letters)
      })
      .catch(err => {
        console.error('Failed to load dictionary:', err)
      })
  }, [])

  // Get selected container
  const selectedContainer = containers.find(c => c.id === selectedContainerId) || containers[0]
  const points = selectedContainer.points

  // Calculate center point
  const getCenter = useCallback((containerPoints: Point[]) => {
    const avgX = containerPoints.reduce((sum, p) => sum + p.x, 0) / containerPoints.length
    const avgY = containerPoints.reduce((sum, p) => sum + p.y, 0) / containerPoints.length
    return { x: avgX, y: avgY }
  }, [])

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  // Check if point is near mouse
  const getPointAt = useCallback((x: number, y: number, containerPoints: Point[], threshold = 10) => {
    for (let i = 0; i < containerPoints.length; i++) {
      const dx = containerPoints[i].x - x
      const dy = containerPoints[i].y - y
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        return i
      }
    }
    return null
  }, [])

  // Check if point is in viewport box
  const isPointInViewportBox = useCallback((x: number, y: number, box: { x: number; y: number; width: number; height: number }) => {
    return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
  }, [])

  // Get viewport resize handle at point
  const getViewportResizeHandleAt = useCallback((x: number, y: number, box: { x: number; y: number; width: number; height: number }) => {
    const handleSize = 10
    const handles = [
      { x: box.x, y: box.y, type: 'nw' as const },
      { x: box.x + box.width, y: box.y, type: 'ne' as const },
      { x: box.x, y: box.y + box.height, type: 'sw' as const },
      { x: box.x + box.width, y: box.y + box.height, type: 'se' as const },
    ]
    
    for (const handle of handles) {
      const dx = handle.x - x
      const dy = handle.y - y
      if (Math.sqrt(dx * dx + dy * dy) < handleSize) {
        return handle.type
      }
    }
    return null
  }, [])

  // Check if mouse is on image resize handle
  const getResizeHandleAt = useCallback((x: number, y: number) => {
    const threshold = 10
    const { width, height } = imageSize
    const { x: imgX, y: imgY } = imagePosition

    // Check corners
    if (Math.abs(x - (imgX + width)) < threshold && Math.abs(y - (imgY + height)) < threshold) {
      return 'se' // Southeast
    }
    if (Math.abs(x - imgX) < threshold && Math.abs(y - (imgY + height)) < threshold) {
      return 'sw' // Southwest
    }
    if (Math.abs(x - (imgX + width)) < threshold && Math.abs(y - imgY) < threshold) {
      return 'ne' // Northeast
    }
    if (Math.abs(x - imgX) < threshold && Math.abs(y - imgY) < threshold) {
      return 'nw' // Northwest
    }
    return null
  }, [imagePosition, imageSize])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    
    // Check for viewport box resize handle (only in edit mode)
    if (!isAnimateMode && viewportBox) {
      const viewportHandle = getViewportResizeHandleAt(pos.x, pos.y, viewportBox)
      if (viewportHandle) {
        setIsResizingViewport(true)
        setViewportResizeHandle(viewportHandle)
        return
      }
      
      // Check if clicking inside viewport box to drag it
      if (isPointInViewportBox(pos.x, pos.y, viewportBox)) {
        setIsDraggingViewport(true)
        setViewportDragStart({ x: pos.x - viewportBox.x, y: pos.y - viewportBox.y })
        return
      }
    }
    
    // Check for image resize handle
    const handle = getResizeHandleAt(pos.x, pos.y)
    if (handle && uploadedImage) {
      setIsResizingImage(true)
      setResizeHandle(handle)
      return
    }
    
    // Check for vertex point on selected container (only if not in animate mode)
    if (!isAnimateMode) {
      const index = getPointAt(pos.x, pos.y, points)
      if (index !== null) {
        setDraggingIndex(index)
      }
    }
  }, [getMousePos, getPointAt, getResizeHandleAt, getViewportResizeHandleAt, isPointInViewportBox, uploadedImage, points, isAnimateMode, viewportBox])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    
    // Handle viewport box resizing
    if (isResizingViewport && viewportResizeHandle && viewportBox) {
      const { x: boxX, y: boxY, width: oldWidth, height: oldHeight } = viewportBox
      let newX = boxX
      let newY = boxY
      let newWidth = oldWidth
      let newHeight = oldHeight
      
      switch (viewportResizeHandle) {
        case 'se': // Southeast - resize from top-left
          newWidth = Math.max(50, pos.x - boxX)
          newHeight = Math.max(50, pos.y - boxY)
          break
        case 'sw': // Southwest - resize from top-right
          newWidth = Math.max(50, (boxX + oldWidth) - pos.x)
          newHeight = Math.max(50, pos.y - boxY)
          newX = pos.x
          break
        case 'ne': // Northeast - resize from bottom-left
          newWidth = Math.max(50, pos.x - boxX)
          newHeight = Math.max(50, (boxY + oldHeight) - pos.y)
          newY = pos.y
          break
        case 'nw': // Northwest - resize from bottom-right
          newWidth = Math.max(50, (boxX + oldWidth) - pos.x)
          newHeight = Math.max(50, (boxY + oldHeight) - pos.y)
          newX = pos.x
          newY = pos.y
          break
      }
      
      // Constrain to canvas bounds
      newX = Math.max(0, Math.min(newX, canvasWidth - newWidth))
      newY = Math.max(0, Math.min(newY, canvasHeight - newHeight))
      newWidth = Math.min(newWidth, canvasWidth - newX)
      newHeight = Math.min(newHeight, canvasHeight - newY)
      
      setViewportBox({ x: newX, y: newY, width: newWidth, height: newHeight })
      return
    }
    
    // Handle viewport box dragging
    if (isDraggingViewport && viewportDragStart && viewportBox) {
      const newX = Math.max(0, Math.min(canvasWidth - viewportBox.width, pos.x - viewportDragStart.x))
      const newY = Math.max(0, Math.min(canvasHeight - viewportBox.height, pos.y - viewportDragStart.y))
      setViewportBox({ ...viewportBox, x: newX, y: newY })
      return
    }
    
    if (isResizingImage && resizeHandle && uploadedImage) {
      const { x: imgX, y: imgY } = imagePosition
      const { width: oldWidth, height: oldHeight } = imageSize
      const aspectRatio = uploadedImage.width / uploadedImage.height
      
      let newWidth = oldWidth
      let newHeight = oldHeight
      let newX = imgX
      let newY = imgY
      
      switch (resizeHandle) {
        case 'se': // Southeast - resize from top-left
          newWidth = Math.max(50, pos.x - imgX)
          newHeight = newWidth / aspectRatio
          break
        case 'sw': // Southwest - resize from top-right
          newWidth = Math.max(50, (imgX + oldWidth) - pos.x)
          newHeight = newWidth / aspectRatio
          newX = pos.x
          break
        case 'ne': // Northeast - resize from bottom-left
          newWidth = Math.max(50, pos.x - imgX)
          newHeight = newWidth / aspectRatio
          newY = (imgY + oldHeight) - newHeight
          break
        case 'nw': // Northwest - resize from bottom-right
          newWidth = Math.max(50, (imgX + oldWidth) - pos.x)
          newHeight = newWidth / aspectRatio
          newX = pos.x
          newY = (imgY + oldHeight) - newHeight
          break
      }
      
      // Constrain to canvas bounds
      newX = Math.max(0, Math.min(newX, canvasWidth - newWidth))
      newY = Math.max(0, Math.min(newY, canvasHeight - newHeight))
      
      setImageSize({ width: newWidth, height: newHeight })
      setImagePosition({ x: newX, y: newY })
      return
    }
    
    if (draggingIndex !== null && !isAnimateMode) {
      setContainers(prev => prev.map(container => {
        if (container.id !== selectedContainerId) return container
        const newPoints = [...container.points]
        newPoints[draggingIndex] = {
          x: Math.max(0, Math.min(canvasWidth, pos.x)),
          y: Math.max(0, Math.min(canvasHeight, pos.y))
        }
        return { ...container, points: newPoints }
      }))
      // Update content element points if in animate mode
      if (isAnimateMode) {
        setContentElements(prev => prev.map(ce => {
          if (ce.containerId !== selectedContainerId) return ce
          const container = containers.find(c => c.id === selectedContainerId)
          if (container) {
            return { ...ce, points: [...container.points] }
          }
          return ce
        }))
      }
    } else {
      // Check for hover
      if (!isAnimateMode) {
        const index = getPointAt(pos.x, pos.y, points)
        setHoveredIndex(index)
        
        // Check for viewport box resize handle hover
        if (viewportBox) {
          const viewportHandle = getViewportResizeHandleAt(pos.x, pos.y, viewportBox)
          setHoveredViewportHandle(viewportHandle)
        }
      }
      
      // Check for image resize handle hover
      const handle = getResizeHandleAt(pos.x, pos.y)
      setHoveredResizeHandle(handle)
    }
  }, [getMousePos, isResizingImage, isResizingViewport, isDraggingViewport, resizeHandle, viewportResizeHandle, viewportDragStart, viewportBox, uploadedImage, imagePosition, imageSize, draggingIndex, selectedContainerId, getPointAt, getResizeHandleAt, getViewportResizeHandleAt, points, isAnimateMode, containers])

  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null)
    setIsResizingImage(false)
    setResizeHandle(null)
    setIsDraggingViewport(false)
    setViewportDragStart(null)
    setIsResizingViewport(false)
    setViewportResizeHandle(null)
  }, [])

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        setUploadedImage(img)
        // Set initial size to fit canvas while maintaining aspect ratio
        const aspectRatio = img.width / img.height
        let width = canvasWidth
        let height = canvasWidth / aspectRatio
        if (height > canvasHeight) {
          height = canvasHeight
          width = canvasHeight * aspectRatio
        }
        setImageSize({ width, height })
        setImagePosition({ x: (canvasWidth - width) / 2, y: (canvasHeight - height) / 2 })
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  // Handle dictionary upload
  const handleDictionaryUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const data = JSON.parse(text)
        
        // Extract letter data (skip description and unitSize if present)
        const { description, unitSize, ...letters } = data
        
        // Validate that it looks like a dictionary
        if (typeof letters !== 'object' || Object.keys(letters).length === 0) {
          alert('Invalid dictionary format. The file should contain letter definitions.')
          return
        }
        
        // Replace the dictionary
        setDictionary(letters)
        
        // Reset file input
        if (dictionaryFileInputRef.current) {
          dictionaryFileInputRef.current.value = ''
        }
        
        alert(`Successfully loaded dictionary with ${Object.keys(letters).length} letters!`)
      } catch (error) {
        console.error('Failed to parse dictionary:', error)
        alert('Failed to parse dictionary file. Please make sure it is valid JSON.')
      }
    }
    reader.onerror = () => {
      alert('Failed to read dictionary file.')
    }
    reader.readAsText(file)
  }, [])

  // Add new container
  const addContainer = useCallback(() => {
    const newId = `container-${Date.now()}`
    const newContainer: Container = {
      id: newId,
      name: `Container ${containers.length + 1}`,
      points: [
        { x: 300, y: 300 },
        { x: 700, y: 300 },
        { x: 700, y: 500 },
        { x: 300, y: 500 },
      ],
      color: defaultColor,
      contentColor: defaultColor,
      aboveContainerId: null,
      belowContainerId: null,
      aboveTeleportContainerId: null,
      belowTeleportContainerId: null,
      teleportType: null
    }
    setContainers(prev => [...prev, newContainer])
    setSelectedContainerId(newId)
  }, [containers.length, defaultColor])

  // Enter animate mode - create content elements for each container
  const enterAnimateMode = useCallback(() => {
    // Filter out teleport containers to get normal containers
    const normalContainers = containers.filter(container => container.teleportType === null)
    
    // Create content elements for normal containers
    const newContentElements: ContentElement[] = normalContainers.map(container => ({
      id: `content-${container.id}`,
      containerId: container.id,
      text: container.name.replace('Container', 'Item'),
      color: container.contentColor, // Use the container's contentColor
      points: [...container.points], // Copy container's points
      opacity: 1 // Start fully visible
    }))
    
    // Find top and bottom teleport containers
    const topTeleportContainer = containers.find(c => c.teleportType === 'top')
    const bottomTeleportContainer = containers.find(c => c.teleportType === 'bottom')
    
    // Create duplicates in teleport containers (invisible, ready for wrap-around)
    // REVERSED: topmost element goes in bottom teleport container, bottommost element goes in top teleport container
    if (bottomTeleportContainer && normalContainers.length > 0) {
      // Get the topmost normal container (first in menu order) - duplicate goes in BOTTOM teleport container
      const topNormalContainer = normalContainers[0]
      const topContentElement = newContentElements.find(ce => ce.containerId === topNormalContainer.id)
      if (topContentElement) {
        newContentElements.push({
          id: `teleport-bottom-${bottomTeleportContainer.id}`,
          containerId: bottomTeleportContainer.id,
          text: topContentElement.text,
          color: topContentElement.color,
          points: [...bottomTeleportContainer.points], // Start in teleport container
          opacity: 0 // Start invisible
        })
      }
    }
    
    if (topTeleportContainer && normalContainers.length > 0) {
      // Get the bottommost normal container (last in menu order) - duplicate goes in TOP teleport container
      const bottomNormalContainer = normalContainers[normalContainers.length - 1]
      const bottomContentElement = newContentElements.find(ce => ce.containerId === bottomNormalContainer.id)
      if (bottomContentElement) {
        newContentElements.push({
          id: `teleport-top-${topTeleportContainer.id}`,
          containerId: topTeleportContainer.id,
          text: bottomContentElement.text,
          color: bottomContentElement.color,
          points: [...topTeleportContainer.points], // Start in teleport container
          opacity: 0 // Start invisible
        })
      }
    }
    
    setContentElements(newContentElements)
    setIsAnimateMode(true)
    
    // Select the first normal container so text input appears
    if (normalContainers.length > 0 && !selectedContainerId) {
      setSelectedContainerId(normalContainers[0].id)
    } else if (normalContainers.length > 0) {
      // Make sure selected container is a normal container (not a teleport container)
      const selectedIsNormal = normalContainers.some(c => c.id === selectedContainerId)
      if (!selectedIsNormal) {
        setSelectedContainerId(normalContainers[0].id)
      }
    }
  }, [containers, selectedContainerId])


  // Exit animate mode
  const exitAnimateMode = useCallback(() => {
    setContentElements([])
    setIsAnimateMode(false)
  }, [])

  // Remove container
  const removeContainer = useCallback((containerId: string) => {
    setContainers(prev => {
      const filtered = prev.filter(c => c.id !== containerId)
      if (filtered.length > 0 && selectedContainerId === containerId) {
        setSelectedContainerId(filtered[0].id)
      }
      return filtered
    })
    // Also remove associated content element if in animate mode
    if (isAnimateMode) {
      setContentElements(prev => prev.filter(ce => ce.containerId !== containerId))
    }
  }, [selectedContainerId, isAnimateMode])

  // Update container name
  const updateContainerName = useCallback((containerId: string, name: string) => {
    setContainers(prev => prev.map(container => 
      container.id === containerId ? { ...container, name } : container
    ))
    // Update content element text if in animate mode
    if (isAnimateMode) {
      setContentElements(prev => prev.map(ce => 
        ce.containerId === containerId ? { ...ce, text: name.replace('Container', 'Item') } : ce
      ))
    }
  }, [isAnimateMode])

  // Update container color
  const updateContainerColor = useCallback((containerId: string, color: string) => {
    setContainers(prev => prev.map(container => 
      container.id === containerId ? { ...container, color } : container
    ))
    // Update content element color if in animate mode
    if (isAnimateMode) {
      setContentElements(prev => prev.map(ce => 
        ce.containerId === containerId ? { ...ce, color } : ce
      ))
    }
  }, [isAnimateMode])

  // Update container content color (color for the content element)
  const updateContainerContentColor = useCallback((containerId: string, contentColor: string) => {
    setContainers(prev => prev.map(container => 
      container.id === containerId ? { ...container, contentColor } : container
    ))
    // Update content element color if in animate mode
    if (isAnimateMode) {
      setContentElements(prev => prev.map(ce => 
        ce.containerId === containerId ? { ...ce, color: contentColor } : ce
      ))
    }
  }, [isAnimateMode])

  // Update content element text
  const updateContentElementText = useCallback((contentElementId: string, text: string) => {
    setContentElements(prev => prev.map(ce => 
      ce.id === contentElementId ? { ...ce, text } : ce
    ))
  }, [])

  // Update container's above/below relationships
  const updateContainerRelationship = useCallback((containerId: string, field: 'aboveContainerId' | 'belowContainerId', targetContainerId: string | null) => {
    setContainers(prev => prev.map(container => 
      container.id === containerId ? { ...container, [field]: targetContainerId } : container
    ))
  }, [])

  // Update container's teleport relationships
  const updateContainerTeleport = useCallback((containerId: string, field: 'aboveTeleportContainerId' | 'belowTeleportContainerId', targetContainerId: string | null) => {
    setContainers(prev => prev.map(container => 
      container.id === containerId ? { ...container, [field]: targetContainerId } : container
    ))
  }, [])

  // Update container's teleport type
  const updateContainerTeleportType = useCallback((containerId: string, teleportType: 'top' | 'bottom' | null) => {
    setContainers(prev => prev.map(container => 
      container.id === containerId ? { ...container, teleportType } : container
    ))
  }, [])

  // Reorder containers (move container to new index)
  const reorderContainers = useCallback((containerId: string, newIndex: number) => {
    setContainers(prev => {
      const containerIndex = prev.findIndex(c => c.id === containerId)
      if (containerIndex === -1 || containerIndex === newIndex) return prev
      
      const newContainers = [...prev]
      const [movedContainer] = newContainers.splice(containerIndex, 1)
      newContainers.splice(newIndex, 0, movedContainer)
      
      return newContainers
    })
  }, [])

  // Handle drag start for container reordering
  const handleContainerDragStart = useCallback((e: React.DragEvent, containerId: string) => {
    if (isAnimateMode || isAnimating) {
      e.preventDefault()
      return
    }
    setDraggedContainerId(containerId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', containerId)
  }, [isAnimateMode, isAnimating])

  // Handle drag over for container reordering
  const handleContainerDragOver = useCallback((e: React.DragEvent, containerId: string) => {
    if (isAnimateMode || isAnimating || !draggedContainerId) {
      e.preventDefault()
      return
    }
    if (draggedContainerId !== containerId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverContainerId(containerId)
    }
  }, [isAnimateMode, isAnimating, draggedContainerId])

  // Handle drop for container reordering
  const handleContainerDrop = useCallback((e: React.DragEvent, targetContainerId: string) => {
    e.preventDefault()
    if (!draggedContainerId || draggedContainerId === targetContainerId || isAnimateMode || isAnimating) {
      setDraggedContainerId(null)
      setDragOverContainerId(null)
      return
    }

    const targetIndex = containers.findIndex(c => c.id === targetContainerId)
    if (targetIndex === -1) {
      setDraggedContainerId(null)
      setDragOverContainerId(null)
      return
    }

    reorderContainers(draggedContainerId, targetIndex)
    setDraggedContainerId(null)
    setDragOverContainerId(null)
  }, [draggedContainerId, containers, isAnimateMode, isAnimating, reorderContainers])

  // Handle drag end
  const handleContainerDragEnd = useCallback(() => {
    setDraggedContainerId(null)
    setDragOverContainerId(null)
  }, [])

  // Animate content element to morph into target container's shape
  const animateContentMorph = useCallback((contentElementId: string, targetContainerId: string, duration: number = 1): Promise<void> => {
    return new Promise((resolve) => {
      const contentElement = contentElements.find(ce => ce.id === contentElementId)
      const targetContainer = containers.find(c => c.id === targetContainerId)
      
      if (!contentElement || !targetContainer || contentElement.containerId === targetContainerId) {
        resolve()
        return
      }
      
      // Kill any existing animations for this element
      if (animationRefs.current[contentElementId]) {
        animationRefs.current[contentElementId].forEach(tween => tween.kill())
      }
      animationRefs.current[contentElementId] = []

      // Animate each point from source to target
      const tweens: gsap.core.Tween[] = []
      
      contentElement.points.forEach((point, index) => {
        const targetPoint = targetContainer.points[index]
        
        // Create a proxy object for GSAP to animate
        const proxy = { x: point.x, y: point.y }
        
        // Animate the proxy
        const tween = gsap.to(proxy, {
          x: targetPoint.x,
          y: targetPoint.y,
          duration: duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            // Update the content element points during animation
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
            // Ensure final position is exact
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
      
      // Wait for all animations to complete
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
  }, [contentElements, containers])

  // Teleport content element instantly to target container (no animation)
  const teleportContentElement = useCallback((contentElementId: string, targetContainerId: string) => {
    const targetContainer = containers.find(c => c.id === targetContainerId)
    if (!targetContainer) return
    
    // Instantly update the content element's position and container
    setContentElements(prev => prev.map(ce => {
      if (ce.id === contentElementId) {
        return {
          ...ce,
          containerId: targetContainerId,
          points: [...targetContainer.points] // Instantly match target container's shape
        }
      }
      return ce
    }))
  }, [containers])

  // Animate all content elements in a specific direction
  // Uses menu order: up = move to container above in menu, down = move to container below in menu
  // Wrap-around: top container animating up teleports to bottom, bottom container animating down teleports to top
  const animateDirection = useCallback((direction: 'up' | 'down', scrollSpeed?: number) => {
    if (isAnimating || !isAnimateMode) return
    
    // Calculate animation duration based on scroll speed
    // Faster scroll (larger deltaY) = shorter duration (faster animation)
    // Slower scroll (smaller deltaY) = longer duration (slower animation)
    // Default to 1 second if no scroll speed provided
    let duration = 1
    if (scrollSpeed !== undefined) {
      // Map scroll speed to duration: larger deltaY = shorter duration
      // Clamp between 0.2s (very fast) and 2s (very slow)
      // Use inverse relationship: duration = maxDuration / (1 + speed/maxSpeed)
      const maxSpeed = 100 // Maximum expected scroll delta
      const minDuration = 0.2
      const maxDuration = 2
      const normalizedSpeed = Math.min(Math.abs(scrollSpeed), maxSpeed)
      duration = Math.max(minDuration, Math.min(maxDuration, maxDuration / (1 + normalizedSpeed / (maxSpeed * 0.5))))
    }
    
    const teleportKey = direction === 'up' ? 'aboveTeleportContainerId' : 'belowTeleportContainerId'
    
    // Find all content elements that should animate or teleport
    const animations: Promise<void>[] = []
    
    contentElements.forEach(contentElement => {
      const currentContainer = containers.find(c => c.id === contentElement.containerId)
      if (!currentContainer) return
      
      // Check for teleport target first (teleports take priority over morph)
      // BUT skip if target is a teleport container (they don't receive elements)
      const teleportTargetId = currentContainer[teleportKey]
      if (teleportTargetId) {
        const targetContainer = containers.find(c => c.id === teleportTargetId)
        // Only teleport if target is NOT a teleport container
        if (targetContainer && targetContainer.teleportType === null) {
          // Instant teleport - this happens when animating from a container that has teleport settings
          teleportContentElement(contentElement.id, teleportTargetId)
          return
        }
      }
      
      // Otherwise, use menu order to determine target
      // Filter to normal containers only (exclude teleport containers)
      const normalContainers = containers.filter(c => c.teleportType === null)
      
      // Find current container's index in normal containers
      const currentIndex = normalContainers.findIndex(c => c.id === contentElement.containerId)
      if (currentIndex === -1) return
      
      // Determine target index based on direction with wrap-around
      let targetIndex: number
      if (direction === 'up') {
        // If at top (index 0), wrap to bottom (last index)
        targetIndex = currentIndex === 0 ? normalContainers.length - 1 : currentIndex - 1
      } else {
        // If at bottom (last index), wrap to top (index 0)
        targetIndex = currentIndex === normalContainers.length - 1 ? 0 : currentIndex + 1
      }
      
      const targetContainerId = normalContainers[targetIndex].id
      
      // Check if this is a wrap-around (top to bottom or bottom to top)
      const isWrapAround = (direction === 'up' && currentIndex === 0) || 
                          (direction === 'down' && currentIndex === normalContainers.length - 1)
      
      if (isWrapAround) {
        // For wrap-around animations:
        // UP: topmost element → TOP teleport container (fade out), BOTTOM teleport duplicate → bottommost container (fade in)
        // DOWN: bottommost element → BOTTOM teleport container (fade out), TOP teleport duplicate → topmost container (fade in)
        
        // Find the teleport container where the current element should go (fade out destination)
        const fadeOutTeleportType = direction === 'up' ? 'top' : 'bottom'
        const fadeOutTeleportContainer = containers.find(c => c.teleportType === fadeOutTeleportType)
        
        // Find the teleport container that has the duplicate that should come in (fade in source)
        const fadeInTeleportType = direction === 'up' ? 'bottom' : 'top'
        const fadeInTeleportContainer = containers.find(c => c.teleportType === fadeInTeleportType)
        
        if (fadeOutTeleportContainer && fadeInTeleportContainer) {
          // Find the duplicate element in the fade-in teleport container
          const duplicateElement = contentElements.find(ce => 
            ce.containerId === fadeInTeleportContainer.id && ce.opacity === 0
          )
          
          if (duplicateElement) {
            // DUAL ANIMATION:
            // 1. Original element fades out while morphing to its teleport container (fadeOutTeleportContainer)
            // 2. Duplicate element fades in while morphing from its teleport container (fadeInTeleportContainer) to target
            
            // Animation 1: Original element moves to fade-out teleport container while fading out
            const fadeOutAndMorphToTeleport = animateContentMorph(contentElement.id, fadeOutTeleportContainer.id, duration).then(() => {
              // Update original element's container to teleport container and make it invisible
              setContentElements(prev => prev.map(ce => {
                if (ce.id === contentElement.id) {
                  return { ...ce, containerId: fadeOutTeleportContainer.id, opacity: 0 }
                }
                return ce
              }))
            })
            
            // Fade out original element while it morphs
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
            
            // Animation 2: Duplicate element fades in while morphing from fade-in teleport container to target
            const fadeInDelay = duration * 0.3 // Start fading in at 30% of animation
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
                fadeOutAndMorphToTeleport,
                animateContentMorph(duplicateElement.id, targetContainerId, duration)
              ]).then(() => {
                // Update duplicate's container and make it fully visible
                setContentElements(prev => prev.map(ce => {
                  if (ce.id === duplicateElement.id) {
                    return { ...ce, containerId: targetContainerId, opacity: 1 }
                  }
                  return ce
                }))
                
                // Remove original element (it's now in fade-out teleport container with opacity 0)
                setContentElements(prev => prev.filter(ce => ce.id !== contentElement.id))
                
                // Rename duplicate to original ID for consistency
                setContentElements(prev => prev.map(ce => {
                  if (ce.id === duplicateElement.id) {
                    return { ...ce, id: contentElement.id }
                  }
                  return ce
                }))
                
                // Update duplicates in BOTH teleport containers to reflect current top/bottom elements
                // REVERSED: topmost element goes in bottom teleport container, bottommost element goes in top teleport container
                setContentElements(prev => {
                  // Filter to normal containers only (exclude teleport containers)
                  const normalContainers = containers.filter(c => c.teleportType === null)
                  
                  // Find the current topmost and bottommost normal containers
                  const topNormalContainer = normalContainers[0]
                  const bottomNormalContainer = normalContainers[normalContainers.length - 1]
                  
                  // Find the elements currently in topmost and bottommost containers
                  const topElement = prev.find(ce => ce.containerId === topNormalContainer?.id && ce.opacity === 1)
                  const bottomElement = prev.find(ce => ce.containerId === bottomNormalContainer?.id && ce.opacity === 1)
                  
                  // Find top and bottom teleport containers
                  const topTeleportContainer = containers.find(c => c.teleportType === 'top')
                  const bottomTeleportContainer = containers.find(c => c.teleportType === 'bottom')
                  
                  // Remove old duplicates
                  let updated = prev.filter(ce => {
                    const isTopDuplicate = ce.containerId === topTeleportContainer?.id && ce.opacity === 0
                    const isBottomDuplicate = ce.containerId === bottomTeleportContainer?.id && ce.opacity === 0
                    return !isTopDuplicate && !isBottomDuplicate
                  })
                  
                  // Create new duplicate in TOP teleport container (copy of current BOTTOM element)
                  if (topTeleportContainer && bottomElement) {
                    updated.push({
                      id: `teleport-top-${topTeleportContainer.id}`,
                      containerId: topTeleportContainer.id,
                      text: bottomElement.text,
                      color: bottomElement.color,
                      points: [...topTeleportContainer.points],
                      opacity: 0
                    })
                  }
                  
                  // Create new duplicate in BOTTOM teleport container (copy of current TOP element)
                  if (bottomTeleportContainer && topElement) {
                    updated.push({
                      id: `teleport-bottom-${bottomTeleportContainer.id}`,
                      containerId: bottomTeleportContainer.id,
                      text: topElement.text,
                      color: topElement.color,
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
        
        // No teleport container or duplicate found, use instant teleport as fallback
        teleportContentElement(contentElement.id, targetContainerId)
        return
      }
      
      // Otherwise, morph the content element to match the target container's shape
      animations.push(
        animateContentMorph(contentElement.id, targetContainerId, duration).then(() => {
          // Update the content element's current container after animation
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
    
    // Wait for all animations to complete (teleports are instant, so they're already done)
    Promise.all(animations).then(() => {
      setIsAnimating(false)
    }).catch(() => {
      setIsAnimating(false)
    })
  }, [contentElements, containers, isAnimating, isAnimateMode, animateContentMorph, teleportContentElement])

  // Handle scroll wheel for animate up/down
  const handleWheel = useCallback((e: WheelEvent) => {
    // Only work in animate mode and when not already animating
    if (!isAnimateMode || isAnimating) return
    
    // Prevent default scroll behavior
    e.preventDefault()
    
    // Throttle scroll events to prevent too many rapid animations
    // But allow immediate animation start with speed-based duration
    if (scrollThrottleRef.current !== null) return
    
    // Determine direction: negative deltaY = scroll up = animate up, positive = scroll down = animate down
    const direction = e.deltaY < 0 ? 'up' : 'down'
    
    // Get scroll speed (absolute deltaY value)
    const scrollSpeed = Math.abs(e.deltaY)
    
    // Trigger animation with scroll speed
    animateDirection(direction, scrollSpeed)
    
    // Set throttle: prevent another animation until current one completes
    // Use a shorter throttle since duration is variable now
    scrollThrottleRef.current = window.setTimeout(() => {
      scrollThrottleRef.current = null
    }, 100) // Short throttle to allow rapid scrolling but prevent spam
  }, [isAnimateMode, isAnimating, animateDirection])

  // Add/remove scroll wheel listener
  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    if (!canvasContainer) return

    if (isAnimateMode) {
      canvasContainer.addEventListener('wheel', handleWheel, { passive: false })
    }

    return () => {
      canvasContainer.removeEventListener('wheel', handleWheel)
      // Cleanup throttle timeout on unmount
      if (scrollThrottleRef.current !== null) {
        clearTimeout(scrollThrottleRef.current)
        scrollThrottleRef.current = null
      }
    }
  }, [isAnimateMode, handleWheel])

  // Draw SVG path on canvas with perspective transform
  const drawTransformedPath = useCallback((
    ctx: CanvasRenderingContext2D,
    svgPath: string,
    sourceQuad: [number, number, number, number, number, number, number, number],
    destQuad: [number, number, number, number, number, number, number, number]
  ) => {
    // Create perspective transform instance
    const perspT = new PerspectiveTransform(sourceQuad, destQuad)
    
    // Helper function to transform a point and return [x, y]
    const transformPoint = (x: number, y: number): [number, number] => {
      const result = perspT.transform(x, y)
      // The transform method returns an array [x, y]
      if (Array.isArray(result) && result.length >= 2) {
        return [result[0], result[1]]
      }
      // Fallback if result is unexpected
      return [x, y]
    }

    // Helper to convert SVG arc to canvas arc points
    const arcToCanvas = (
      x1: number, y1: number,
      rx: number, ry: number,
      rotation: number,
      largeArc: number,
      sweep: number,
      x2: number, y2: number
    ): Array<[number, number]> => {
      // Convert SVG arc to points using proper ellipse arc math
      const numSegments = 40
      const points: Array<[number, number]> = []
      
      // Normalize radii
      const dx = (x1 - x2) / 2
      const dy = (y1 - y2) / 2
      const cosPhi = Math.cos(rotation * Math.PI / 180)
      const sinPhi = Math.sin(rotation * Math.PI / 180)
      const x1p = cosPhi * dx + sinPhi * dy
      const y1p = -sinPhi * dx + cosPhi * dy
      
      // Ensure radii are large enough
      const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
      let rxScaled = rx
      let ryScaled = ry
      if (lambda > 1) {
        rxScaled = Math.sqrt(lambda) * rx
        ryScaled = Math.sqrt(lambda) * ry
      }
      
      // Calculate center
      const sign = largeArc === sweep ? -1 : 1
      const denom = (rxScaled * rxScaled) * (ryScaled * ryScaled) - (rxScaled * rxScaled) * (y1p * y1p) - (ryScaled * ryScaled) * (x1p * x1p)
      const s = sign * Math.sqrt(Math.max(0, denom) / ((rxScaled * rxScaled) * (y1p * y1p) + (ryScaled * ryScaled) * (x1p * x1p)))
      const cxp = s * rxScaled * y1p / ryScaled
      const cyp = s * -ryScaled * x1p / rxScaled
      
      const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
      const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2
      
      // Calculate start and end angles
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
      
      // Generate points along the arc
      for (let i = 0; i <= numSegments; i++) {
        const angle = startAngle + (deltaAngle * i) / numSegments
        const x = cx + rxScaled * Math.cos(angle) * cosPhi - ryScaled * Math.sin(angle) * sinPhi
        const y = cy + rxScaled * Math.cos(angle) * sinPhi + ryScaled * Math.sin(angle) * cosPhi
        points.push([x, y])
      }
      
      return points
    }
    
    // Parse SVG path commands - improved regex to handle all commands
    const commands = svgPath.match(/[MLZACQTHVmlzacthv][^MLZACQTHVmlzacthv]*/g) || []
    
    // Start a single path for the entire letter
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
        // Move to - start a new subpath (but don't begin a new canvas path)
        if (coords.length >= 2) {
          const x = isRelative ? currentX + coords[0] : coords[0]
          const y = isRelative ? currentY + coords[1] : coords[1]
          const [tx, ty] = transformPoint(x, y)
          currentX = x
          currentY = y
          startX = x
          startY = y
          if (pathStarted) {
            // Move to new position without drawing (creates a new subpath)
            ctx.moveTo(tx, ty)
          } else {
            ctx.moveTo(tx, ty)
            pathStarted = true
          }
        }
      } else if (type === 'L') {
        // Line to
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
        // Close path - return to start of current subpath
        const [tx, ty] = transformPoint(startX, startY)
        ctx.lineTo(tx, ty)
        ctx.closePath()
        // Don't fill/stroke here - we'll do it once at the end
      } else if (type === 'A') {
        // Arc command - better approximation
        if (coords.length >= 7) {
          const [rx, ry, rotation, largeArc, sweep, x, y] = coords
          const endX = isRelative ? currentX + x : x
          const endY = isRelative ? currentY + y : y
          
          // Get arc points
          const arcPoints = arcToCanvas(
            currentX, currentY,
            rx, ry,
            rotation,
            largeArc,
            sweep,
            endX, endY
          )
          
          // Draw arc segments
          for (let i = 1; i < arcPoints.length; i++) {
            const [px, py] = arcPoints[i]
            const [tx, ty] = transformPoint(px, py)
            ctx.lineTo(tx, ty)
          }
          
          currentX = endX
          currentY = endY
        }
      } else if (type === 'C') {
        // Cubic Bezier curve
        if (coords.length >= 6) {
          const [x1, y1, x2, y2, x, y] = coords
          const cp1X = isRelative ? currentX + x1 : x1
          const cp1Y = isRelative ? currentY + y1 : y1
          const cp2X = isRelative ? currentX + x2 : x2
          const cp2Y = isRelative ? currentY + y2 : y2
          const endX = isRelative ? currentX + x : x
          const endY = isRelative ? currentY + y : y
          
          // Transform control points and end point
          const [tx1, ty1] = transformPoint(cp1X, cp1Y)
          const [tx2, ty2] = transformPoint(cp2X, cp2Y)
          const [tx, ty] = transformPoint(endX, endY)
          
          ctx.bezierCurveTo(tx1, ty1, tx2, ty2, tx, ty)
          currentX = endX
          currentY = endY
        }
      } else if (type === 'H') {
        // Horizontal line
        for (let i = 0; i < coords.length; i++) {
          const x = isRelative ? currentX + coords[i] : coords[i]
          const [tx, ty] = transformPoint(x, currentY)
          currentX = x
          ctx.lineTo(tx, ty)
        }
      } else if (type === 'V') {
        // Vertical line
        for (let i = 0; i < coords.length; i++) {
          const y = isRelative ? currentY + coords[i] : coords[i]
          const [tx, ty] = transformPoint(currentX, y)
          currentY = y
          ctx.lineTo(tx, ty)
        }
      }
    }
    
    // Fill and stroke the entire path once at the end using evenodd rule
    // This creates holes for inner paths (like the center of O, A, etc.)
    try {
      // Use evenodd fill rule if supported (creates holes for overlapping paths)
      ctx.fill('evenodd' as CanvasFillRule)
    } catch {
      // Fallback for browsers that don't support evenodd
      ctx.fill()
    }
    ctx.stroke()
  }, [])

  // Draw everything
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Draw background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Draw uploaded image if available
    if (uploadedImage) {
      ctx.drawImage(
        uploadedImage,
        imagePosition.x,
        imagePosition.y,
        imageSize.width,
        imageSize.height
      )
      
      // Draw image border
      ctx.strokeStyle = '#999999'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.strokeRect(imagePosition.x, imagePosition.y, imageSize.width, imageSize.height)
      ctx.setLineDash([])
      
      // Draw resize handles
      const handleSize = 8
      const handles: Array<{ x: number; y: number; type: 'nw' | 'ne' | 'sw' | 'se' }> = [
        { x: imagePosition.x, y: imagePosition.y, type: 'nw' }, // NW
        { x: imagePosition.x + imageSize.width, y: imagePosition.y, type: 'ne' }, // NE
        { x: imagePosition.x, y: imagePosition.y + imageSize.height, type: 'sw' }, // SW
        { x: imagePosition.x + imageSize.width, y: imagePosition.y + imageSize.height, type: 'se' }, // SE
      ]
      
      handles.forEach((handle) => {
        const isHovered = hoveredResizeHandle === handle.type || resizeHandle === handle.type
        ctx.fillStyle = isHovered ? '#ff6b6b' : '#2196f3'
        ctx.beginPath()
        ctx.arc(handle.x, handle.y, isHovered ? handleSize + 2 : handleSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      })
    }

    // Draw border
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight)

    // In animate mode, clip to viewport box if it exists
    if (isAnimateMode && viewportBox) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(viewportBox.x, viewportBox.y, viewportBox.width, viewportBox.height)
      ctx.clip()
    }

    // Draw containers first (invisible/transparent during animation)
    containers.forEach((container) => {
      const containerPoints = container.points
      const isSelected = container.id === selectedContainerId
      const isTeleportContainer = container.teleportType !== null
      
      // Teleport containers are invisible in both edit and animate mode (except for very faint outline in edit mode for positioning)
      if (isTeleportContainer) {
        if (!isAnimateMode && isSelected) {
          // Very faint outline in edit mode when selected (for positioning only)
          ctx.strokeStyle = `rgba(150, 150, 150, 0.2)`
          ctx.lineWidth = 1
          ctx.setLineDash([10, 10])
          ctx.beginPath()
          ctx.moveTo(containerPoints[0].x, containerPoints[0].y)
          for (let i = 1; i < containerPoints.length; i++) {
            ctx.lineTo(containerPoints[i].x, containerPoints[i].y)
          }
          ctx.closePath()
          ctx.stroke()
          ctx.setLineDash([])
          
          // Very faint label
          const centerX = containerPoints.reduce((sum, p) => sum + p.x, 0) / containerPoints.length
          const centerY = containerPoints.reduce((sum, p) => sum + p.y, 0) / containerPoints.length
          ctx.fillStyle = 'rgba(150, 150, 150, 0.3)'
          ctx.font = '10px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${container.name} (Teleport)`, centerX, centerY)
        }
        return // Skip normal drawing for teleport containers
      }
      
      // Containers are drawn with very low opacity in animate mode, but more visible in edit mode
      const opacity = isAnimateMode ? (isSelected ? 0.3 : 0.1) : (isSelected ? 0.8 : 0.6)
      
      // Draw container fill (semi-transparent) in edit mode
      if (!isAnimateMode) {
        ctx.fillStyle = `${container.color}${Math.floor(opacity * 0.3 * 255).toString(16).padStart(2, '0')}`
        ctx.beginPath()
        ctx.moveTo(containerPoints[0].x, containerPoints[0].y)
        for (let i = 1; i < containerPoints.length; i++) {
          ctx.lineTo(containerPoints[i].x, containerPoints[i].y)
        }
        ctx.closePath()
        ctx.fill()
      }
      
      // Draw container outline (dashed, more visible in edit mode)
      ctx.strokeStyle = isAnimateMode 
        ? `rgba(100, 100, 100, ${opacity})`
        : isSelected 
          ? container.color 
          : `rgba(100, 100, 100, ${opacity})`
      ctx.lineWidth = isSelected ? 3 : 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(containerPoints[0].x, containerPoints[0].y)
      for (let i = 1; i < containerPoints.length; i++) {
        ctx.lineTo(containerPoints[i].x, containerPoints[i].y)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.setLineDash([])
      
      // Draw container label (more visible in edit mode)
      if (isSelected || !isAnimateMode) {
        const centerX = containerPoints.reduce((sum, p) => sum + p.x, 0) / containerPoints.length
        const centerY = containerPoints.reduce((sum, p) => sum + p.y, 0) / containerPoints.length
        
        ctx.fillStyle = isAnimateMode 
          ? `rgba(100, 100, 100, ${opacity * 2})`
          : isSelected
            ? container.color
            : 'rgba(100, 100, 100, 0.8)'
        ctx.font = isSelected ? 'bold 14px Arial' : '12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(container.name, centerX, centerY)
      }

      // Draw vertex points (only for selected container, and not in animate mode)
      if (isSelected && !isAnimateMode) {
        containerPoints.forEach((point, index) => {
          const isHovered = hoveredIndex === index
          const isDragging = draggingIndex === index
          
          ctx.fillStyle = isDragging ? '#ff0000' : isHovered ? '#ff6b6b' : '#2196f3'
          ctx.beginPath()
          ctx.arc(point.x, point.y, isHovered || isDragging ? 10 : 8, 0, Math.PI * 2)
          ctx.fill()
          
          // Draw point number
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 12px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText((index + 1).toString(), point.x, point.y)
        })
      }
    })

    // Draw content elements (visible, with perspective-warped text) - only in animate mode
    if (isAnimateMode) {
      contentElements.forEach((contentElement) => {
        const contentPoints = contentElement.points
        const elementOpacity = contentElement.opacity ?? 1

        // Skip drawing if opacity is 0 (invisible elements in teleport containers)
        if (elementOpacity === 0) return

        // Set opacity for the entire element
        ctx.globalAlpha = elementOpacity

        // Draw perspective-warped text if text is set
        if (contentElement.text && contentElement.text.length > 0) {
          const textLetters = contentElement.text.toUpperCase().split('').filter(char => /[A-Z]/.test(char))
          if (textLetters.length > 0) {
            ctx.fillStyle = contentElement.color
            ctx.strokeStyle = contentElement.color
            ctx.lineWidth = 2

            // Divide container into segments (one per letter)
            const numLetters = textLetters.length
            
            for (let i = 0; i < numLetters; i++) {
              const t1 = i / numLetters // Start of segment (0 to 1)
              const t2 = (i + 1) / numLetters // End of segment (0 to 1)
              
              // Interpolate top edge (between TL and TR)
              const topLeft = {
                x: contentPoints[0].x + (contentPoints[1].x - contentPoints[0].x) * t1,
                y: contentPoints[0].y + (contentPoints[1].y - contentPoints[0].y) * t1
              }
              const topRight = {
                x: contentPoints[0].x + (contentPoints[1].x - contentPoints[0].x) * t2,
                y: contentPoints[0].y + (contentPoints[1].y - contentPoints[0].y) * t2
              }
              
              // Interpolate bottom edge (between BL and BR)
              const bottomLeft = {
                x: contentPoints[3].x + (contentPoints[2].x - contentPoints[3].x) * t1,
                y: contentPoints[3].y + (contentPoints[2].y - contentPoints[3].y) * t1
              }
              const bottomRight = {
                x: contentPoints[3].x + (contentPoints[2].x - contentPoints[3].x) * t2,
                y: contentPoints[3].y + (contentPoints[2].y - contentPoints[3].y) * t2
              }
              
              // Create sub-quadrilateral for this letter
              const letterQuad: [number, number, number, number, number, number, number, number] = [
                topLeft.x, topLeft.y,      // TL
                topRight.x, topRight.y,     // TR
                bottomRight.x, bottomRight.y, // BR
                bottomLeft.x, bottomLeft.y   // BL
              ]
              
              // Source quad: 100x100 square
              const sourceQuad: [number, number, number, number, number, number, number, number] = [
                0, 0,    // TL
                100, 0,  // TR
                100, 100, // BR
                0, 100   // BL
              ]
              
              // Get letter data and draw
              const letter = textLetters[i]
              if (dictionary[letter]) {
                const letterData = dictionary[letter] as LetterData
                drawTransformedPath(ctx, letterData.svgPathD, sourceQuad, letterQuad)
              }
            }
          }
        }
        
        ctx.globalAlpha = 1 // Reset alpha
      })
    }

    // Restore clipping if it was applied
    if (isAnimateMode && viewportBox) {
      ctx.restore()
    }

    // Draw viewport box outline (only in edit mode)
    if (!isAnimateMode && viewportBox) {
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(viewportBox.x, viewportBox.y, viewportBox.width, viewportBox.height)
      ctx.setLineDash([])
      
      // Draw resize handles
      const handleSize = 8
      const handles: Array<{ x: number; y: number; type: 'nw' | 'ne' | 'sw' | 'se' }> = [
        { x: viewportBox.x, y: viewportBox.y, type: 'nw' },
        { x: viewportBox.x + viewportBox.width, y: viewportBox.y, type: 'ne' },
        { x: viewportBox.x, y: viewportBox.y + viewportBox.height, type: 'sw' },
        { x: viewportBox.x + viewportBox.width, y: viewportBox.y + viewportBox.height, type: 'se' },
      ]
      
      handles.forEach((handle) => {
        const isHovered = hoveredViewportHandle === handle.type || viewportResizeHandle === handle.type
        ctx.fillStyle = isHovered ? '#ff0000' : '#ff6b6b'
        ctx.beginPath()
        ctx.arc(handle.x, handle.y, isHovered ? handleSize + 2 : handleSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      })
      
      // Draw viewport label
      ctx.fillStyle = '#ff6b6b'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('Viewport', viewportBox.x + 5, viewportBox.y + 5)
    }
  }, [containers, contentElements, selectedContainerId, hoveredIndex, draggingIndex, uploadedImage, imagePosition, imageSize, hoveredResizeHandle, resizeHandle, isAnimateMode, isAnimating, viewportBox, hoveredViewportHandle, viewportResizeHandle, dictionary, drawTransformedPath])

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: '1rem',
      maxWidth: '1600px',
      width: '100%'
    }}>
      {/* Controls Sidebar */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '250px',
        maxHeight: '800px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Dictionary Upload */}
        <div>
          <input
            ref={dictionaryFileInputRef}
            type="file"
            accept=".json"
            onChange={handleDictionaryUpload}
            style={{ display: 'none' }}
            id="dictionary-upload-input"
          />
          <label
            htmlFor="dictionary-upload-input"
            style={{
              display: 'block',
              padding: '0.75rem',
              backgroundColor: '#9c27b0',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          >
            Upload Dictionary JSON
          </label>
        </div>

        {/* Containers Management */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <h3 style={{ 
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#1a1a1a'
            }}>
              Containers
            </h3>
            {!isAnimateMode && (
              <button
                onClick={addContainer}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.85rem',
                  backgroundColor: '#2196f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                + Add
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {containers.map((container, index) => (
              <div
                key={container.id}
                draggable={!isAnimateMode && !isAnimating}
                onDragStart={(e) => handleContainerDragStart(e, container.id)}
                onDragOver={(e) => handleContainerDragOver(e, container.id)}
                onDrop={(e) => handleContainerDrop(e, container.id)}
                onDragEnd={handleContainerDragEnd}
                onDragLeave={() => {
                  if (dragOverContainerId === container.id) {
                    setDragOverContainerId(null)
                  }
                }}
                style={{
                  padding: '0.75rem',
                  backgroundColor: selectedContainerId === container.id ? '#e3f2fd' : '#f5f5f5',
                  borderRadius: '4px',
                  border: selectedContainerId === container.id 
                    ? '2px solid #2196f3' 
                    : dragOverContainerId === container.id
                      ? '2px dashed #4caf50'
                      : '1px solid #ddd',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  cursor: !isAnimateMode && !isAnimating ? 'grab' : 'default',
                  opacity: draggedContainerId === container.id ? 0.5 : 1,
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                {/* Drag handle indicator */}
                {!isAnimateMode && !isAnimating && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      cursor: 'grab',
                      padding: '4px'
                    }}
                  >
                    <div style={{ width: '12px', height: '2px', backgroundColor: '#999', borderRadius: '1px' }}></div>
                    <div style={{ width: '12px', height: '2px', backgroundColor: '#999', borderRadius: '1px' }}></div>
                    <div style={{ width: '12px', height: '2px', backgroundColor: '#999', borderRadius: '1px' }}></div>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingLeft: !isAnimateMode && !isAnimating ? '24px' : '0'
                }}>
                  <span 
                    style={{ 
                      fontSize: '0.9rem',
                      fontWeight: selectedContainerId === container.id ? 'bold' : 'normal',
                      cursor: isAnimating ? 'not-allowed' : 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => {
                      if (!isAnimating) {
                        setSelectedContainerId(container.id)
                      }
                    }}
                  >
                    {container.name}
                  </span>
                  {containers.length > 1 && !isAnimateMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isAnimating) {
                          removeContainer(container.id)
                        }
                      }}
                      disabled={isAnimating}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: isAnimating ? '#ccc' : '#ff6b6b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isAnimating ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                
                {!isAnimateMode && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.25rem',
                        fontSize: '0.8rem',
                        color: '#666',
                        fontWeight: '500'
                      }}>
                        Content Color:
                      </label>
                      <input
                        type="color"
                        value={container.contentColor || container.color}
                        onChange={(e) => {
                          if (!isAnimating) {
                            updateContainerContentColor(container.id, e.target.value)
                          }
                        }}
                        disabled={isAnimating}
                        style={{
                          width: '100%',
                          height: '40px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          cursor: isAnimating ? 'not-allowed' : 'pointer'
                        }}
                      />
                    </div>
                    {containers.length > 1 && (
                      <>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.25rem',
                            fontSize: '0.8rem',
                            color: '#666',
                            fontWeight: '500'
                          }}>
                            Above Container:
                          </label>
                          <select
                            value={container.aboveContainerId || ''}
                            onChange={(e) => {
                              if (!isAnimating) {
                                updateContainerRelationship(container.id, 'aboveContainerId', e.target.value || null)
                              }
                            }}
                            disabled={isAnimating}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              backgroundColor: isAnimating ? '#f5f5f5' : '#fff',
                              cursor: isAnimating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <option value="">None</option>
                            {containers
                              .filter(c => c.id !== container.id)
                              .map(target => (
                                <option key={target.id} value={target.id}>
                                  {target.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.25rem',
                            fontSize: '0.8rem',
                            color: '#666',
                            fontWeight: '500'
                          }}>
                            Above Teleport:
                          </label>
                          <select
                            value={container.aboveTeleportContainerId || ''}
                            onChange={(e) => {
                              if (!isAnimating) {
                                updateContainerTeleport(container.id, 'aboveTeleportContainerId', e.target.value || null)
                              }
                            }}
                            disabled={isAnimating}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              backgroundColor: isAnimating ? '#f5f5f5' : '#fff',
                              cursor: isAnimating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <option value="">None</option>
                            {containers
                              .filter(c => c.id !== container.id)
                              .map(target => (
                                <option key={target.id} value={target.id}>
                                  {target.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.25rem',
                            fontSize: '0.8rem',
                            color: '#666',
                            fontWeight: '500'
                          }}>
                            Below Container:
                          </label>
                          <select
                            value={container.belowContainerId || ''}
                            onChange={(e) => {
                              if (!isAnimating) {
                                updateContainerRelationship(container.id, 'belowContainerId', e.target.value || null)
                              }
                            }}
                            disabled={isAnimating}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              backgroundColor: isAnimating ? '#f5f5f5' : '#fff',
                              cursor: isAnimating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <option value="">None</option>
                            {containers
                              .filter(c => c.id !== container.id)
                              .map(target => (
                                <option key={target.id} value={target.id}>
                                  {target.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.25rem',
                            fontSize: '0.8rem',
                            color: '#666',
                            fontWeight: '500'
                          }}>
                            Below Teleport:
                          </label>
                          <select
                            value={container.belowTeleportContainerId || ''}
                            onChange={(e) => {
                              if (!isAnimating) {
                                updateContainerTeleport(container.id, 'belowTeleportContainerId', e.target.value || null)
                              }
                            }}
                            disabled={isAnimating}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              backgroundColor: isAnimating ? '#f5f5f5' : '#fff',
                              cursor: isAnimating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <option value="">None</option>
                            {containers
                              .filter(c => c.id !== container.id)
                              .map(target => (
                                <option key={target.id} value={target.id}>
                                  {target.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.25rem',
                            fontSize: '0.8rem',
                            color: '#666',
                            fontWeight: '500'
                          }}>
                            Teleport Type:
                          </label>
                          <select
                            value={container.teleportType || ''}
                            onChange={(e) => {
                              if (!isAnimating) {
                                updateContainerTeleportType(container.id, (e.target.value as 'top' | 'bottom' | '') || null)
                              }
                            }}
                            disabled={isAnimating}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              backgroundColor: isAnimating ? '#f5f5f5' : '#fff',
                              cursor: isAnimating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <option value="">Normal Container</option>
                            <option value="top">Top Teleport Container</option>
                            <option value="bottom">Bottom Teleport Container</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Animate Mode Toggle */}
        {!isAnimateMode ? (
          <button
            onClick={enterAnimateMode}
            disabled={isAnimating || containers.length === 0}
            style={{
              padding: '1rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              backgroundColor: isAnimating || containers.length === 0 ? '#ccc' : '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isAnimating || containers.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: isAnimating || containers.length === 0 ? 'none' : '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'all 0.2s',
              width: '100%'
            }}
          >
            Enter Animate Mode
          </button>
        ) : (
          <>
            <button
              onClick={exitAnimateMode}
              disabled={isAnimating}
              style={{
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                backgroundColor: isAnimating ? '#ccc' : '#ff9800',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                width: '100%'
              }}
            >
              Exit Animate Mode
            </button>
            {containers.length >= 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => animateDirection('up')}
                  disabled={isAnimating}
                  style={{
                    padding: '1rem',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    backgroundColor: isAnimating ? '#ccc' : '#2196f3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isAnimating ? 'not-allowed' : 'pointer',
                    boxShadow: isAnimating ? 'none' : '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isAnimating ? 'Animating...' : (
                    <>
                      <span>▲</span>
                      <span>Animate Up</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => animateDirection('down')}
                  disabled={isAnimating}
                  style={{
                    padding: '1rem',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    backgroundColor: isAnimating ? '#ccc' : '#4caf50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isAnimating ? 'not-allowed' : 'pointer',
                    boxShadow: isAnimating ? 'none' : '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isAnimating ? 'Animating...' : (
                    <>
                      <span>▼</span>
                      <span>Animate Down</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Multi-Letter Text Input (only in animate mode) - exactly like FaceMaker */}
        {isAnimateMode && (() => {
          // Find the content element for the selected container
          const selectedContentElement = contentElements.find(ce => 
            ce.containerId === selectedContainerId && ce.opacity !== 0
          )
          
          if (!selectedContentElement) return null
          
          return (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Type Text (Multiple Letters):
              </label>
              <input
                type="text"
                value={selectedContentElement.text}
                onChange={(e) => updateContentElementText(selectedContentElement.id, e.target.value)}
                placeholder="Type letters here..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  textTransform: 'uppercase'
                }}
              />
              <div style={{
                marginTop: '0.25rem',
                fontSize: '0.75rem',
                color: '#666'
              }}>
                Letters will be warped to fit the container shape
              </div>
            </div>
          )
        })()}

        {/* Container Properties (only when not in animate mode) */}
        {!isAnimateMode && selectedContainer && (
          <>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Container Name:
              </label>
              <input
                type="text"
                value={selectedContainer.name}
                onChange={(e) => updateContainerName(selectedContainer.id, e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Container Color:
              </label>
              <input
                type="color"
                value={selectedContainer.color}
                onChange={(e) => updateContainerColor(selectedContainer.id, e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              />
            </div>
          </>
        )}

        {/* Viewport Box Controls */}
        {!isAnimateMode && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <label style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Viewport Box:
              </label>
              {viewportBox ? (
                <button
                  onClick={() => setViewportBox(null)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#ff6b6b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => setViewportBox({ x: 200, y: 200, width: 800, height: 600 })}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#4caf50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Create
                </button>
              )}
            </div>
            {viewportBox && (
              <div style={{
                fontSize: '0.75rem',
                color: '#666',
                marginTop: '0.25rem'
              }}>
                Drag to move, resize handles to adjust. Only visible area in animate mode.
              </div>
            )}
          </div>
        )}

        {/* Default Color Picker */}
        {!isAnimateMode && (
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#333'
            }}>
              Default Color:
            </label>
            <input
              type="color"
              value={defaultColor}
              onChange={(e) => setDefaultColor(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
            <div style={{
              marginTop: '0.25rem',
              fontSize: '0.75rem',
              color: '#666'
            }}>
              This color will be used for new containers
            </div>
          </div>
        )}

        {/* Export/Import Container Configuration */}
        {!isAnimateMode && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <label style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#333'
              }}>
                Container Configuration:
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  const config = {
                    containers: containers,
                    viewportBox: viewportBox,
                    defaultColor: defaultColor,
                    exportedAt: new Date().toISOString()
                  }
                  const dataStr = JSON.stringify(config, null, 2)
                  const dataBlob = new Blob([dataStr], { type: 'application/json' })
                  const url = URL.createObjectURL(dataBlob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = 'container-config.json'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  URL.revokeObjectURL(url)
                }}
                style={{
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  backgroundColor: '#2196f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Export Configuration
              </button>
              <label style={{
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                backgroundColor: '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'block'
              }}>
                Import Configuration
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      try {
                        const config = JSON.parse(event.target?.result as string)
                        
                        if (config.containers && Array.isArray(config.containers)) {
                          setContainers(config.containers)
                          if (config.containers.length > 0) {
                            setSelectedContainerId(config.containers[0].id)
                          }
                        }
                        
                        if (config.viewportBox) {
                          setViewportBox(config.viewportBox)
                        }
                        
                        if (config.defaultColor) {
                          setDefaultColor(config.defaultColor)
                        }
                        
                        // Reset file input
                        e.target.value = ''
                      } catch (error) {
                        alert('Failed to import configuration. Please check the file format.')
                        console.error('Import error:', error)
                      }
                    }
                    reader.readAsText(file)
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div style={{
              marginTop: '0.25rem',
              fontSize: '0.75rem',
              color: '#666'
            }}>
              Export saves all containers, relationships, teleport settings, and viewport box
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        flex: 1
      }}>
        {/* Image Upload Controls */}
        {!isAnimateMode && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            width: '100%',
            maxWidth: '1200px'
          }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#333'
            }}>
              Upload Background Image:
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
            {uploadedImage && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.85rem',
                color: '#666'
              }}>
                Image loaded. Drag the blue corner handles to resize.
              </div>
            )}
          </div>
        )}

        <div 
          ref={canvasContainerRef}
          style={{
            padding: '1rem',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: isResizingImage 
                ? 'nwse-resize' 
                : draggingIndex !== null 
                  ? 'grabbing' 
                  : hoveredResizeHandle !== null
                    ? 'nwse-resize'
                    : hoveredIndex !== null && !isAnimateMode
                      ? 'grab' 
                      : 'default',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '1200px',
          width: '100%'
        }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Instructions:</h3>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
            {!isAnimateMode ? (
              <>
                <li>Add containers using the "+ Add" button</li>
                <li>Click on a container in the sidebar to select it</li>
                <li>Edit the container name and color</li>
                <li>Click and drag the blue vertex points (numbered 1-4) to reposition container corners</li>
                <li>Set "Above Container" and "Below Container" relationships for each container</li>
                <li>Click "Enter Animate Mode" to create content elements positioned over containers</li>
              </>
            ) : (
              <>
                <li>Content elements are automatically created and positioned over each container</li>
                <li>Click on a container in the sidebar to select it and edit its text</li>
                <li>Type text in the "Type Text (Multiple Letters)" input to warp letters onto the selected container</li>
                <li>Click "Animate Up" or scroll wheel UP to morph all content elements to their above containers</li>
                <li>Click "Animate Down" or scroll wheel DOWN to morph all content elements to their below containers</li>
                <li>Scroll speed determines animation speed: faster scroll = faster animation, slower scroll = slower animation</li>
                <li>Scroll wheel controls work when hovering over the canvas area</li>
                <li>Click "Exit Animate Mode" to return to container editing</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
