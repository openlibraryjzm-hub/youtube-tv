'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import PerspectiveTransform from 'perspective-transform'

interface Point {
  x: number
  y: number
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

type LetterKey = string

interface Face {
  id: string
  points: Point[]
  selectedLetter: LetterKey | null
  letterColor: string
  text: string // Multi-letter text mode
}

interface FaceBundle {
  id: string
  name: string
  faceIds: string[]
}

export default function FaceMaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [faces, setFaces] = useState<Face[]>([
    {
      id: 'face-1',
      points: [
        { x: 200, y: 200 },
        { x: 800, y: 200 },
        { x: 800, y: 600 },
        { x: 200, y: 600 },
      ],
      selectedLetter: null,
      letterColor: '#1a1a1a',
      text: ''
    }
  ])
  const [selectedFaceId, setSelectedFaceId] = useState<string>('face-1')
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [dictionary, setDictionary] = useState<Record<string, LetterData>>({})
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null)
  const [imagePosition, setImagePosition] = useState<Point>({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 600, height: 500 })
  const [isResizingImage, setIsResizingImage] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null)
  const [hoveredResizeHandle, setHoveredResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bundles, setBundles] = useState<FaceBundle[]>([])
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null)
  const [bundleText, setBundleText] = useState<string>('')
  const [defaultLetterColor, setDefaultLetterColor] = useState<string>('#1a1a1a')

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
        
        // Clear selected letters from all faces since the dictionary changed
        setFaces(prev => prev.map(face => ({ ...face, selectedLetter: null })))
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
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

  // Get selected face
  const selectedFace = faces.find(f => f.id === selectedFaceId) || faces[0]
  const points = selectedFace.points

  // Calculate center point
  const getCenter = useCallback((facePoints: Point[]) => {
    const avgX = facePoints.reduce((sum, p) => sum + p.x, 0) / facePoints.length
    const avgY = facePoints.reduce((sum, p) => sum + p.y, 0) / facePoints.length
    return { x: avgX, y: avgY }
  }, [])

  // Calculate horizontal center line (through center, parallel to top/bottom edges)
  const getHorizontalCenterLine = useCallback((facePoints: Point[]) => {
    const center = getCenter(facePoints)
    // Calculate average of top two points and bottom two points for direction
    const topAvgY = (facePoints[0].y + facePoints[1].y) / 2
    const bottomAvgY = (facePoints[2].y + facePoints[3].y) / 2
    const direction = Math.atan2(bottomAvgY - topAvgY, facePoints[1].x - facePoints[0].x)
    
    // Perpendicular direction (horizontal line)
    const perpDirection = direction + Math.PI / 2
    
    // Extend line across canvas
    const length = Math.max(canvasWidth, canvasHeight) * 2
    return {
      x1: center.x - Math.cos(perpDirection) * length,
      y1: center.y - Math.sin(perpDirection) * length,
      x2: center.x + Math.cos(perpDirection) * length,
      y2: center.y + Math.sin(perpDirection) * length,
    }
  }, [getCenter])

  // Calculate vertical center line (through center, parallel to left/right edges)
  const getVerticalCenterLine = useCallback((facePoints: Point[]) => {
    const center = getCenter(facePoints)
    // Calculate average of left two points and right two points for direction
    const leftAvgX = (facePoints[0].x + facePoints[3].x) / 2
    const rightAvgX = (facePoints[1].x + facePoints[2].x) / 2
    const topAvgY = (facePoints[0].y + facePoints[1].y) / 2
    const bottomAvgY = (facePoints[2].y + facePoints[3].y) / 2
    const direction = Math.atan2(bottomAvgY - topAvgY, rightAvgX - leftAvgX)
    
    // Extend line across canvas
    const length = Math.max(canvasWidth, canvasHeight) * 2
    return {
      x1: center.x - Math.cos(direction) * length,
      y1: center.y - Math.sin(direction) * length,
      x2: center.x + Math.cos(direction) * length,
      y2: center.y + Math.sin(direction) * length,
    }
  }, [getCenter])

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
  const getPointAt = useCallback((x: number, y: number, facePoints: Point[], threshold = 10) => {
    for (let i = 0; i < facePoints.length; i++) {
      const dx = facePoints[i].x - x
      const dy = facePoints[i].y - y
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        return i
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
    
    // Check for image resize handle first
    const handle = getResizeHandleAt(pos.x, pos.y)
    if (handle && uploadedImage) {
      setIsResizingImage(true)
      setResizeHandle(handle)
      return
    }
    
    // Check for vertex point on selected face
    const index = getPointAt(pos.x, pos.y, points)
    if (index !== null) {
      setDraggingIndex(index)
    }
  }, [getMousePos, getPointAt, getResizeHandleAt, uploadedImage, points])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    
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
    } else if (draggingIndex !== null) {
      setFaces((prev) => {
        return prev.map(face => {
          if (face.id === selectedFaceId) {
            const newPoints = [...face.points]
            newPoints[draggingIndex] = { x: pos.x, y: pos.y }
            return { ...face, points: newPoints }
          }
          return face
        })
      })
    } else {
      const index = getPointAt(pos.x, pos.y, points)
      setHoveredIndex(index)
      
      // Check for resize handle hover
      if (uploadedImage) {
        const handle = getResizeHandleAt(pos.x, pos.y)
        setHoveredResizeHandle(handle)
      } else {
        setHoveredResizeHandle(null)
      }
    }
  }, [isResizingImage, resizeHandle, uploadedImage, imagePosition, imageSize, draggingIndex, selectedFaceId, getMousePos, getPointAt, getResizeHandleAt, points])

  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null)
    setIsResizingImage(false)
    setResizeHandle(null)
  }, [])

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

    // Draw all faces
    faces.forEach((face) => {
      const facePoints = face.points
      const isSelected = face.id === selectedFaceId
      const opacity = isSelected ? 1 : 0.6

      // Only draw connector lines for selected face
      if (isSelected) {
        // Draw diagonal lines (connecting opposite corners)
        ctx.strokeStyle = 'rgba(74, 144, 226, 1)'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(facePoints[0].x, facePoints[0].y)
        ctx.lineTo(facePoints[2].x, facePoints[2].y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(facePoints[1].x, facePoints[1].y)
        ctx.lineTo(facePoints[3].x, facePoints[3].y)
        ctx.stroke()
        ctx.setLineDash([])

        // Draw horizontal center line
        const hLine = getHorizontalCenterLine(facePoints)
        ctx.strokeStyle = 'rgba(80, 200, 120, 1)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(hLine.x1, hLine.y1)
        ctx.lineTo(hLine.x2, hLine.y2)
        ctx.stroke()
        ctx.setLineDash([])

        // Draw vertical center line
        const vLine = getVerticalCenterLine(facePoints)
        ctx.strokeStyle = 'rgba(255, 107, 107, 1)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(vLine.x1, vLine.y1)
        ctx.lineTo(vLine.x2, vLine.y2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw quadrilateral outline
      ctx.strokeStyle = isSelected ? '#333333' : `rgba(51, 51, 51, ${opacity})`
      ctx.lineWidth = isSelected ? 2 : 1.5
      ctx.beginPath()
      ctx.moveTo(facePoints[0].x, facePoints[0].y)
      for (let i = 1; i < facePoints.length; i++) {
        ctx.lineTo(facePoints[i].x, facePoints[i].y)
      }
      ctx.closePath()
      ctx.stroke()

      // Draw center point
      const center = getCenter(facePoints)
      ctx.fillStyle = `rgba(255, 152, 0, ${opacity})`
      ctx.beginPath()
      ctx.arc(center.x, center.y, 4, 0, Math.PI * 2)
      ctx.fill()

      // Draw transformed letter if one is selected
      if (face.selectedLetter && dictionary[face.selectedLetter]) {
        const letterData = dictionary[face.selectedLetter] as LetterData
        
        // Source quad: 100x100 square (TL, TR, BR, BL)
        const sourceQuad: [number, number, number, number, number, number, number, number] = [
          0, 0,    // TL
          100, 0,  // TR
          100, 100, // BR
          0, 100   // BL
        ]
        
        // Destination quad: our 4 vertex points (TL, TR, BR, BL)
        const destQuad: [number, number, number, number, number, number, number, number] = [
          facePoints[0].x, facePoints[0].y, // TL
          facePoints[1].x, facePoints[1].y, // TR
          facePoints[2].x, facePoints[2].y, // BR
          facePoints[3].x, facePoints[3].y  // BL
        ]
        
        // Draw the transformed letter with face color
        ctx.fillStyle = face.letterColor
        ctx.strokeStyle = face.letterColor
        ctx.lineWidth = 2
        drawTransformedPath(ctx, letterData.svgPathD, sourceQuad, destQuad)
      }

      // Draw multiple letters if text is set
      if (face.text && face.text.length > 0) {
        const textLetters = face.text.toUpperCase().split('').filter(char => /[A-Z]/.test(char))
        if (textLetters.length > 0) {
          ctx.fillStyle = face.letterColor
          ctx.strokeStyle = face.letterColor
          ctx.lineWidth = 2

          // Divide face into segments (one per letter)
          const numLetters = textLetters.length
          
          for (let i = 0; i < numLetters; i++) {
            const t1 = i / numLetters // Start of segment (0 to 1)
            const t2 = (i + 1) / numLetters // End of segment (0 to 1)
            
            // Interpolate top edge (between TL and TR)
            const topLeft = {
              x: facePoints[0].x + (facePoints[1].x - facePoints[0].x) * t1,
              y: facePoints[0].y + (facePoints[1].y - facePoints[0].y) * t1
            }
            const topRight = {
              x: facePoints[0].x + (facePoints[1].x - facePoints[0].x) * t2,
              y: facePoints[0].y + (facePoints[1].y - facePoints[0].y) * t2
            }
            
            // Interpolate bottom edge (between BL and BR)
            const bottomLeft = {
              x: facePoints[3].x + (facePoints[2].x - facePoints[3].x) * t1,
              y: facePoints[3].y + (facePoints[2].y - facePoints[3].y) * t1
            }
            const bottomRight = {
              x: facePoints[3].x + (facePoints[2].x - facePoints[3].x) * t2,
              y: facePoints[3].y + (facePoints[2].y - facePoints[3].y) * t2
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
            
            // Get letter data
            const letter = textLetters[i]
            if (dictionary[letter]) {
              const letterData = dictionary[letter] as LetterData
              drawTransformedPath(ctx, letterData.svgPathD, sourceQuad, letterQuad)
            }
          }
        }
      }

      // Draw vertex points (only for selected face)
      if (isSelected) {
        facePoints.forEach((point, index) => {
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
  }, [faces, selectedFaceId, hoveredIndex, draggingIndex, uploadedImage, imagePosition, imageSize, hoveredResizeHandle, resizeHandle, getCenter, getHorizontalCenterLine, getVerticalCenterLine, drawTransformedPath, dictionary])

  // Add new face
  const addFace = useCallback(() => {
    const newId = `face-${Date.now()}`
    const newFace: Face = {
      id: newId,
      points: [
        { x: 300, y: 300 },
        { x: 700, y: 300 },
        { x: 700, y: 500 },
        { x: 300, y: 500 },
      ],
      selectedLetter: null,
      letterColor: defaultLetterColor,
      text: ''
    }
    setFaces(prev => [...prev, newFace])
    setSelectedFaceId(newId)
  }, [defaultLetterColor])

  // Remove face
  const removeFace = useCallback((faceId: string) => {
    setFaces(prev => {
      const filtered = prev.filter(f => f.id !== faceId)
      if (filtered.length > 0 && selectedFaceId === faceId) {
        setSelectedFaceId(filtered[0].id)
      }
      return filtered
    })
  }, [selectedFaceId])

  // Update face letter
  const updateFaceLetter = useCallback((letter: LetterKey | null) => {
    setFaces(prev => prev.map(face => 
      face.id === selectedFaceId ? { ...face, selectedLetter: letter, text: '' } : face
    ))
  }, [selectedFaceId])

  // Update face text
  const updateFaceText = useCallback((text: string) => {
    setFaces(prev => prev.map(face => 
      face.id === selectedFaceId ? { ...face, text, selectedLetter: null } : face
    ))
  }, [selectedFaceId])

  // Update default color (applies to new faces)
  const updateDefaultColor = useCallback((color: string) => {
    setDefaultLetterColor(color)
  }, [])

  // Bundle management
  const createBundle = useCallback(() => {
    const bundleName = prompt('Enter bundle name:')
    if (!bundleName) return
    
    const newBundle: FaceBundle = {
      id: `bundle-${Date.now()}`,
      name: bundleName,
      faceIds: []
    }
    setBundles(prev => [...prev, newBundle])
    setSelectedBundleId(newBundle.id)
  }, [])

  const removeBundle = useCallback((bundleId: string) => {
    setBundles(prev => prev.filter(b => b.id !== bundleId))
    if (selectedBundleId === bundleId) {
      setSelectedBundleId(null)
      setBundleText('')
    }
  }, [selectedBundleId])

  const toggleFaceInBundle = useCallback((bundleId: string, faceId: string) => {
    setBundles(prev => prev.map(bundle => {
      if (bundle.id !== bundleId) return bundle
      const isIncluded = bundle.faceIds.includes(faceId)
      return {
        ...bundle,
        faceIds: isIncluded
          ? bundle.faceIds.filter(id => id !== faceId)
          : [...bundle.faceIds, faceId]
      }
    }))
  }, [])

  const applyTextToBundle = useCallback((text: string) => {
    if (!selectedBundleId) return
    
    const bundle = bundles.find(b => b.id === selectedBundleId)
    if (!bundle || bundle.faceIds.length === 0) return

    // Convert text to uppercase and filter to only letters
    const letters = text.toUpperCase().split('').filter(char => /[A-Z]/.test(char))
    
    // Apply letters to faces in bundle (1 letter per face)
    setFaces(prev => prev.map(face => {
      const indexInBundle = bundle.faceIds.indexOf(face.id)
      if (indexInBundle === -1) return face
      
      const letter = indexInBundle < letters.length ? letters[indexInBundle] : null
      return {
        ...face,
        selectedLetter: letter || null
      }
    }))
  }, [selectedBundleId, bundles])

  // Handle bundle text change
  const handleBundleTextChange = useCallback((text: string) => {
    setBundleText(text)
    applyTextToBundle(text)
  }, [applyTextToBundle])

  // Get all letter keys
  const letters = Object.keys(dictionary).sort()
  const selectedBundle = bundles.find(b => b.id === selectedBundleId)

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
        minWidth: '200px',
        maxHeight: '600px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Faces Management */}
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
              Faces
            </h3>
            <button
              onClick={addFace}
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
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {faces.map((face) => (
              <div
                key={face.id}
                style={{
                  padding: '0.5rem',
                  backgroundColor: selectedFaceId === face.id ? '#e3f2fd' : '#f5f5f5',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: selectedFaceId === face.id ? '2px solid #2196f3' : '1px solid #ddd'
                }}
                onClick={() => setSelectedFaceId(face.id)}
              >
                <span style={{ fontSize: '0.9rem' }}>
                  Face {faces.indexOf(face) + 1}
                </span>
                {faces.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFace(face.id)
                    }}
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
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Default Letter Color Picker */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: '500',
            color: '#333'
          }}>
            Default Letter Color:
          </label>
          <input
            type="color"
            value={defaultLetterColor}
            onChange={(e) => updateDefaultColor(e.target.value)}
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
            This color will be used for new faces
          </div>
        </div>

        {/* Face Bundles */}
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
              Bundles
            </h3>
            <button
              onClick={createBundle}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.85rem',
                backgroundColor: '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              + New
            </button>
          </div>
          
          {bundles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: selectedBundleId === bundle.id ? '#e8f5e9' : '#f5f5f5',
                    borderRadius: '4px',
                    border: selectedBundleId === bundle.id ? '2px solid #4caf50' : '1px solid #ddd',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedBundleId(bundle.id)
                    if (bundleText) {
                      applyTextToBundle(bundleText)
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: selectedBundleId === bundle.id ? 'bold' : 'normal' }}>
                      {bundle.name} ({bundle.faceIds.length} faces)
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeBundle(bundle.id)
                      }}
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
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedBundle && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              marginBottom: '0.5rem'
            }}>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                Select faces for "{selectedBundle.name}":
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '150px', overflowY: 'auto' }}>
                {faces.map((face) => {
                  const isInBundle = selectedBundle.faceIds.includes(face.id)
                  return (
                    <label
                      key={face.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        backgroundColor: isInBundle ? '#e8f5e9' : 'transparent',
                        borderRadius: '4px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFaceInBundle(selectedBundle.id, face.id)
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isInBundle}
                        onChange={() => toggleFaceInBundle(selectedBundle.id, face.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>Face {faces.indexOf(face) + 1}</span>
                    </label>
                  )
                })}
              </div>
              
              {selectedBundle.faceIds.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}>
                    Type word ({selectedBundle.faceIds.length} letters max):
                  </label>
                  <input
                    type="text"
                    value={bundleText}
                    onChange={(e) => handleBundleTextChange(e.target.value)}
                    placeholder="Type here..."
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
                    Letters will be applied: {bundleText.toUpperCase().split('').filter(c => /[A-Z]/.test(c)).slice(0, selectedBundle.faceIds.length).join(' → ') || '(none)'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dictionary Upload */}
        <div>
          <input
            ref={fileInputRef}
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

        {/* Letter Menu */}
        <div>
          <h3 style={{ 
            marginBottom: '0.5rem', 
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#1a1a1a'
          }}>
            Letters
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem'
          }}>
            {letters.map((letter) => (
              <button
                key={letter}
                onClick={() => updateFaceLetter(selectedFace?.selectedLetter === letter ? null : letter)}
                style={{
                  padding: '0.75rem',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  border: selectedFace?.selectedLetter === letter ? '2px solid #2196f3' : '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: selectedFace?.selectedLetter === letter ? '#e3f2fd' : '#f5f5f5',
                  color: selectedFace?.selectedLetter === letter ? '#2196f3' : '#333',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (selectedFace?.selectedLetter !== letter) {
                    e.currentTarget.style.backgroundColor = '#e0e0e0'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFace?.selectedLetter !== letter) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                  }
                }}
              >
                {letter}
              </button>
            ))}
          </div>
          {selectedFace?.selectedLetter && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '4px',
              fontSize: '0.9rem',
              color: '#1976d2'
            }}>
              Selected: <strong>{selectedFace.selectedLetter}</strong>
            </div>
          )}
        </div>

        {/* Multi-Letter Text Input */}
        {selectedFace && (
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
              value={selectedFace.text}
              onChange={(e) => updateFaceText(e.target.value)}
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
              Letters will be warped to fit the face shape
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

        <div style={{
          padding: '1rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
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
                    : hoveredIndex !== null 
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
            <li>Upload an image to use as a background</li>
            <li>Drag the blue corner handles on the image to resize it</li>
            <li>Add multiple faces using the "+ Add" button</li>
            <li>Click on a face in the sidebar to select it</li>
            <li>Use the color picker to set the default letter color for new faces</li>
            <li>Select a letter from the menu to warp it onto the selected face</li>
            <li>Click and drag the blue vertex points (numbered 1-4) to reposition them</li>
            <li>Blue dashed lines: Diagonals connecting opposite corners</li>
            <li>Green dashed line: Horizontal center line</li>
            <li>Red dashed line: Vertical center line</li>
            <li>Orange dot: Center point of the quadrilateral</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

