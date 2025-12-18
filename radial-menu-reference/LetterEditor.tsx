'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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

export default function LetterEditor() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dictionary, setDictionary] = useState<Record<string, LetterData>>({})
  const [selectedLetter, setSelectedLetter] = useState<LetterKey | null>(null)
  const [svgPath, setSvgPath] = useState<string>('')
  const [editedLetters, setEditedLetters] = useState<Record<string, LetterData>>({})
  const [useFontTemplate, setUseFontTemplate] = useState<boolean>(false)
  const [selectedFont, setSelectedFont] = useState<string>('Arial')
  const [fontSize, setFontSize] = useState<number>(80)
  const [drawingMode, setDrawingMode] = useState<boolean>(false)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [drawingPath, setDrawingPath] = useState<Array<[number, number]>>([])
  const [completedStrokes, setCompletedStrokes] = useState<Array<Array<[number, number]>>>([])
  const templateCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  
  // Image upload and point tracing
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null)
  const [pointTracingMode, setPointTracingMode] = useState<boolean>(false)
  const [currentPath, setCurrentPath] = useState<Array<[number, number]>>([])
  const [completedPaths, setCompletedPaths] = useState<Array<Array<[number, number]>>>([])

  const canvasWidth = 600
  const canvasHeight = 600
  const boxSize = 500
  const boxX = (canvasWidth - boxSize) / 2
  const boxY = (canvasHeight - boxSize) / 2
  const scale = boxSize / 100

  // Load dictionary on mount
  useEffect(() => {
    fetch('/dictionary.json')
      .then(res => res.json())
      .then(data => {
        const { description, unitSize, ...letters } = data
        setDictionary(letters)
        // Load saved edits from localStorage
        const saved = localStorage.getItem('editedLetters')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setEditedLetters(parsed)
            // Merge saved edits with dictionary
            Object.keys(parsed).forEach(key => {
              if (letters[key]) {
                letters[key] = parsed[key]
              }
        })
          } catch (e) {
            console.error('Failed to load saved letters:', e)
          }
        }
      })
      .catch(err => {
        console.error('Failed to load dictionary:', err)
      })
  }, [])

  // Draw SVG path on canvas (no transform, just render it)
  const drawSvgPath = useCallback((ctx: CanvasRenderingContext2D, path: string) => {
    const commands = path.match(/[MLZACQTHVmlzacthv][^MLZACQTHVmlzacthv]*/g) || []
    
    ctx.beginPath()
    let currentX = 0
    let currentY = 0
    let startX = 0
    let startY = 0
    
    for (const command of commands) {
      const type = command[0].toUpperCase()
      const isRelative = command[0] === command[0].toLowerCase()
      const coords = command.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number)
      
      if (type === 'M') {
        if (coords.length >= 2) {
          const x = isRelative ? currentX + coords[0] : coords[0]
          const y = isRelative ? currentY + coords[1] : coords[1]
          currentX = x
          currentY = y
          startX = x
          startY = y
          ctx.moveTo(x, y)
        }
      } else if (type === 'L') {
        for (let i = 0; i < coords.length; i += 2) {
          if (i + 1 < coords.length) {
            const x = isRelative ? currentX + coords[i] : coords[i]
            const y = isRelative ? currentY + coords[i + 1] : coords[i + 1]
            currentX = x
            currentY = y
            ctx.lineTo(x, y)
          }
        }
      } else if (type === 'Z') {
        ctx.lineTo(startX, startY)
        ctx.closePath()
      } else if (type === 'A') {
        if (coords.length >= 7) {
          const [rx, ry, rotation, largeArc, sweep, x, y] = coords
          const endX = isRelative ? currentX + x : x
          const endY = isRelative ? currentY + y : y
          
          // Simplified arc - use canvas arc for circular arcs, approximate for elliptical
          if (Math.abs(rx - ry) < 0.1 && Math.abs(rotation) < 0.1) {
            // Nearly circular, use canvas arc
            const startAngle = Math.atan2(currentY - (currentY + endY) / 2, currentX - (currentX + endX) / 2)
            const endAngle = Math.atan2(endY - (currentY + endY) / 2, endX - (currentX + endX) / 2)
            ctx.arc((currentX + endX) / 2, (currentY + endY) / 2, rx, startAngle, endAngle, sweep === 0)
          } else {
            // Approximate with line segments
            const numSegments = 20
            for (let i = 1; i <= numSegments; i++) {
              const t = i / numSegments
              const approxX = currentX + (endX - currentX) * t
              const approxY = currentY + (endY - currentY) * t
              ctx.lineTo(approxX, approxY)
            }
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
          ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY)
          currentX = endX
          currentY = endY
        }
      } else if (type === 'H') {
        for (let i = 0; i < coords.length; i++) {
          const x = isRelative ? currentX + coords[i] : coords[i]
          ctx.lineTo(x, currentY)
          currentX = x
        }
      } else if (type === 'V') {
        for (let i = 0; i < coords.length; i++) {
          const y = isRelative ? currentY + coords[i] : coords[i]
          ctx.lineTo(currentX, y)
          currentY = y
        }
      }
    }
    
    ctx.fillStyle = '#1a1a1a'
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    try {
      ctx.fill('evenodd' as CanvasFillRule)
    } catch {
      ctx.fill()
    }
    ctx.stroke()
  }, [])

  // Update SVG path when letter is selected
  useEffect(() => {
    if (selectedLetter) {
      const letterData = editedLetters[selectedLetter] || dictionary[selectedLetter]
      if (letterData) {
        setSvgPath(letterData.svgPathD)
      }
    }
  }, [selectedLetter, dictionary, editedLetters])

  // Draw the letter preview
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

    // Draw uploaded image if present (behind everything)
    if (uploadedImage) {
      // Scale image to fit within the box while maintaining aspect ratio
      const imgAspect = uploadedImage.width / uploadedImage.height
      const boxAspect = boxSize / boxSize
      let drawWidth = boxSize
      let drawHeight = boxSize
      let drawX = boxX
      let drawY = boxY
      
      if (imgAspect > boxAspect) {
        drawHeight = boxSize / imgAspect
        drawY = boxY + (boxSize - drawHeight) / 2
      } else {
        drawWidth = boxSize * imgAspect
        drawX = boxX + (boxSize - drawWidth) / 2
      }
      
      ctx.drawImage(uploadedImage, drawX, drawY, drawWidth, drawHeight)
    }

    // Draw the 100x100 reference box (scaled to boxSize)
    // Draw box border
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 2
    ctx.strokeRect(boxX, boxY, boxSize, boxSize)

    // Draw corner points
    const corners = [
      { x: boxX, y: boxY, label: 'TL' },
      { x: boxX + boxSize, y: boxY, label: 'TR' },
      { x: boxX + boxSize, y: boxY + boxSize, label: 'BR' },
      { x: boxX, y: boxY + boxSize, label: 'BL' },
    ]

    corners.forEach((corner, index) => {
      ctx.fillStyle = '#2196f3'
      ctx.beginPath()
      ctx.arc(corner.x, corner.y, 8, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(corner.label, corner.x, corner.y)
    })

    // Draw diagonal lines
    ctx.strokeStyle = '#4a90e2'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(corners[0].x, corners[0].y)
    ctx.lineTo(corners[2].x, corners[2].y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(corners[1].x, corners[1].y)
    ctx.lineTo(corners[3].x, corners[3].y)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw horizontal center line
    ctx.strokeStyle = '#50c878'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(boxX, boxY + boxSize / 2)
    ctx.lineTo(boxX + boxSize, boxY + boxSize / 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw vertical center line
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(boxX + boxSize / 2, boxY)
    ctx.lineTo(boxX + boxSize / 2, boxY + boxSize)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw center point
    ctx.fillStyle = '#ff9800'
    ctx.beginPath()
    ctx.arc(boxX + boxSize / 2, boxY + boxSize / 2, 4, 0, Math.PI * 2)
    ctx.fill()

    // Draw point tracing paths
    if (pointTracingMode || completedPaths.length > 0 || currentPath.length > 0) {
      ctx.save()
      ctx.translate(boxX, boxY)
      ctx.scale(scale, scale)
      
      // Draw all completed paths
      completedPaths.forEach((path, pathIndex) => {
        if (path.length === 0) return
        
        ctx.strokeStyle = '#2196f3'
        ctx.lineWidth = 2 / scale
        ctx.fillStyle = 'rgba(33, 150, 243, 0.2)'
        
        ctx.beginPath()
        const [firstX, firstY] = path[0]
        ctx.moveTo(firstX, firstY)
        
        for (let i = 1; i < path.length; i++) {
          const [x, y] = path[i]
          ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        
        // Draw points
        path.forEach(([x, y], pointIndex) => {
          ctx.fillStyle = '#2196f3'
          ctx.beginPath()
          ctx.arc(x, y, 4 / scale, 0, Math.PI * 2)
          ctx.fill()
        })
      })
      
      // Draw current path being traced
      if (currentPath.length > 0) {
        ctx.strokeStyle = '#ff9800'
        ctx.lineWidth = 2 / scale
        ctx.fillStyle = 'rgba(255, 152, 0, 0.2)'
        
        ctx.beginPath()
        const [firstX, firstY] = currentPath[0]
        ctx.moveTo(firstX, firstY)
        
        for (let i = 1; i < currentPath.length; i++) {
          const [x, y] = currentPath[i]
          ctx.lineTo(x, y)
        }
        ctx.stroke()
        
        // Draw points
        currentPath.forEach(([x, y]) => {
          ctx.fillStyle = '#ff9800'
          ctx.beginPath()
          ctx.arc(x, y, 4 / scale, 0, Math.PI * 2)
          ctx.fill()
        })
      }
      
      ctx.restore()
    }

    // Draw the SVG path if we have one (and not in drawing/point tracing mode)
    if (svgPath && selectedLetter && !drawingMode && !pointTracingMode) {
      ctx.save()
      ctx.translate(boxX, boxY)
      ctx.scale(scale, scale)
      
      // Parse and draw SVG path
      drawSvgPath(ctx, svgPath)
      
      ctx.restore()
    }

    // Draw all strokes if in drawing mode
    if (drawingMode) {
      ctx.save()
      ctx.translate(boxX, boxY)
      ctx.scale(scale, scale)
      
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 3 / scale // Scale line width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.fillStyle = 'transparent' // Don't fill in drawing mode
      
      // Draw all completed strokes
      completedStrokes.forEach(stroke => {
        if (stroke.length === 0) return
        
        ctx.beginPath()
        const [firstX, firstY] = stroke[0]
        ctx.moveTo(firstX, firstY)
        
        for (let i = 1; i < stroke.length; i++) {
          const [x, y] = stroke[i]
          ctx.lineTo(x, y)
        }
        
        ctx.stroke()
      })
      
      // Draw current stroke being drawn
      if (drawingPath.length > 0) {
        ctx.beginPath()
        const [firstX, firstY] = drawingPath[0]
        ctx.moveTo(firstX, firstY)
        
        for (let i = 1; i < drawingPath.length; i++) {
          const [x, y] = drawingPath[i]
          ctx.lineTo(x, y)
        }
        
        ctx.stroke()
      }
      
      ctx.restore()
    }
  }, [svgPath, selectedLetter, drawingMode, drawingPath, completedStrokes, drawSvgPath, uploadedImage, pointTracingMode, currentPath, completedPaths])

  // Convert text to SVG path using canvas tracing
  const textToSvgPath = useCallback((letter: string, font: string, size: number): string => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return ''

    // Clear and render text
    ctx.fillStyle = '#000000'
    ctx.font = `bold ${size}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(letter, 200, 200)

    // Get image data
    const imageData = ctx.getImageData(0, 0, 400, 400)
    const data = imageData.data
    const width = 400
    const height = 400

    // Find bounding box
    let minX = width, minY = height, maxX = 0, maxY = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        if (data[idx + 3] > 128) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }

    if (minX >= maxX || minY >= maxY) return ''

    // Scale to fit 100x100 box with padding
    const padding = 8
    const scaleX = (100 - padding * 2) / (maxX - minX)
    const scaleY = (100 - padding * 2) / (maxY - minY)
    const scale = Math.min(scaleX, scaleY) * 0.95 // Slight scale down for safety
    const offsetX = padding - minX * scale + (100 - (maxX - minX) * scale) / 2
    const offsetY = padding - minY * scale + (100 - (maxY - minY) * scale) / 2

    // Use a simpler approach: sample points along the outline
    const path: string[] = []
    const points: Array<[number, number]> = []
    
    // Sample outline points by scanning edges
    for (let y = minY; y <= maxY; y += 2) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4
        const leftIdx = x > 0 ? ((y * width + x - 1) * 4) : idx
        const rightIdx = x < width - 1 ? ((y * width + x + 1) * 4) : idx
        
        // Left edge
        if (data[idx + 3] > 128 && data[leftIdx + 3] <= 128) {
          points.push([x, y])
        }
        // Right edge
        if (data[idx + 3] > 128 && data[rightIdx + 3] <= 128) {
          points.push([x, y])
        }
      }
    }

    for (let x = minX; x <= maxX; x += 2) {
      for (let y = minY; y <= maxY; y++) {
        const idx = (y * width + x) * 4
        const upIdx = y > 0 ? ((y - 1) * width + x) * 4 : idx
        const downIdx = y < height - 1 ? ((y + 1) * width + x) * 4 : idx
        
        // Top edge
        if (data[idx + 3] > 128 && data[upIdx + 3] <= 128) {
          points.push([x, y])
        }
        // Bottom edge
        if (data[idx + 3] > 128 && data[downIdx + 3] <= 128) {
          points.push([x, y])
        }
      }
    }

    if (points.length === 0) return ''

    // Sort points to create a path (simple: sort by angle from center)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    
    points.sort((a, b) => {
      const angleA = Math.atan2(a[1] - centerY, a[0] - centerX)
      const angleB = Math.atan2(b[1] - centerY, b[0] - centerX)
      return angleA - angleB
    })

    // Build path
    if (points.length > 0) {
      const [firstX, firstY] = points[0]
      path.push(`M ${(firstX * scale + offsetX).toFixed(1)} ${(firstY * scale + offsetY).toFixed(1)}`)
      
      // Add points, simplifying if they're too close
      let lastX = firstX
      let lastY = firstY
      for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i]
        const dist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2)
        if (dist > 3) { // Only add if significant distance
          path.push(`L ${(x * scale + offsetX).toFixed(1)} ${(y * scale + offsetY).toFixed(1)}`)
          lastX = x
          lastY = y
        }
      }
      
      path.push('Z')
    }
    
    return path.join(' ')
  }, [])

  // Get mouse position relative to canvas in 100x100 coordinates
  const getMousePosInBox = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Convert to box coordinates (0-100)
    const boxXCoord = ((x - boxX) / boxSize) * 100
    const boxYCoord = ((y - boxY) / boxSize) * 100
    
    // Clamp to box bounds
    return {
      x: Math.max(0, Math.min(100, boxXCoord)),
      y: Math.max(0, Math.min(100, boxYCoord))
    }
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
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  // Handle point tracing click
  const handlePointTracingClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!pointTracingMode) return
    
    const pos = getMousePosInBox(e)
    setCurrentPath(prev => [...prev, [pos.x, pos.y]])
  }, [pointTracingMode, getMousePosInBox])

  // Update SVG path from point paths
  const updateSvgPathFromPointPaths = useCallback((paths: Array<Array<[number, number]>>) => {
    const pathCommands: string[] = []
    
    paths.forEach((path) => {
      if (path.length === 0) return
      
      const [firstX, firstY] = path[0]
      pathCommands.push(`M ${firstX.toFixed(2)} ${firstY.toFixed(2)}`)
      
      for (let i = 1; i < path.length; i++) {
        const [x, y] = path[i]
        pathCommands.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`)
      }
      
      // Close path if it has enough points
      if (path.length > 2) {
        pathCommands.push('Z')
      }
    })
    
    setSvgPath(pathCommands.join(' '))
  }, [])

  // Finish current path
  const finishPath = useCallback(() => {
    if (currentPath.length > 0) {
      const newCompletedPaths = [...completedPaths, [...currentPath]]
      setCompletedPaths(newCompletedPaths)
      setCurrentPath([])
      updateSvgPathFromPointPaths(newCompletedPaths)
    }
  }, [currentPath, completedPaths, updateSvgPathFromPointPaths])

  // Clear point tracing
  const clearPointTracing = useCallback(() => {
    setCurrentPath([])
    setCompletedPaths([])
    setSvgPath('')
  }, [])

  // Handle drawing
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (pointTracingMode) {
      handlePointTracingClick(e)
      return
    }
    if (!drawingMode) return
    
    const pos = getMousePosInBox(e)
    setIsDrawing(true)
    setDrawingPath([[pos.x, pos.y]])
  }, [drawingMode, pointTracingMode, handlePointTracingClick, getMousePosInBox])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingMode || !isDrawing) return
    
    const pos = getMousePosInBox(e)
    setDrawingPath(prev => {
      if (prev.length === 0) return [[pos.x, pos.y]]
      // Only add if moved significantly (reduce noise)
      const lastPoint = prev[prev.length - 1]
      const dist = Math.sqrt((pos.x - lastPoint[0]) ** 2 + (pos.y - lastPoint[1]) ** 2)
      if (dist > 0.5) {
        return [...prev, [pos.x, pos.y]]
      }
      return prev
    })
  }, [drawingMode, isDrawing, getMousePosInBox])

  // Update SVG path from all completed strokes
  const updateSvgPathFromStrokes = useCallback((strokes: Array<Array<[number, number]>>) => {
    const pathCommands: string[] = []
    
    strokes.forEach((stroke, strokeIndex) => {
      if (stroke.length === 0) return
      
      const [firstX, firstY] = stroke[0]
      pathCommands.push(`M ${firstX.toFixed(2)} ${firstY.toFixed(2)}`)
      
      for (let i = 1; i < stroke.length; i++) {
        const [x, y] = stroke[i]
        pathCommands.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`)
      }
      
      // Check if stroke is closed (ends near start)
      if (stroke.length > 2) {
        const [lastX, lastY] = stroke[stroke.length - 1]
        const distToStart = Math.sqrt((lastX - firstX) ** 2 + (lastY - firstY) ** 2)
        if (distToStart < 5) {
          pathCommands.push('Z')
        }
      }
    })
    
    setSvgPath(pathCommands.join(' '))
  }, [])

  // Finish drawing and convert to SVG
  const finishDrawing = useCallback(() => {
    setCompletedStrokes(prev => {
      if (drawingPath.length > 1) {
        const allStrokes = [...prev, [...drawingPath]]
        updateSvgPathFromStrokes(allStrokes)
        setDrawingPath([])
        return allStrokes
      } else if (prev.length > 0) {
        updateSvgPathFromStrokes(prev)
        return prev
      }
      return prev
    })
  }, [drawingPath, updateSvgPathFromStrokes])

  const handleCanvasMouseUp = useCallback(() => {
    if (!drawingMode || !isDrawing) return
    
    setIsDrawing(false)
    // Add current stroke to completed strokes
    if (drawingPath.length > 1) {
      setCompletedStrokes(prev => {
        const newStrokes = [...prev, [...drawingPath]]
        updateSvgPathFromStrokes(newStrokes)
        return newStrokes
      })
      setDrawingPath([])
    } else {
      setDrawingPath([])
    }
  }, [drawingMode, isDrawing, drawingPath, updateSvgPathFromStrokes])

  // Clear drawing
  const clearDrawing = useCallback(() => {
    setDrawingPath([])
    setCompletedStrokes([])
    setSvgPath('')
  }, [])

  // Generate template from font
  const generateFontTemplate = useCallback(() => {
    if (!selectedLetter) return
    
    const path = textToSvgPath(selectedLetter, selectedFont, fontSize)
    if (path) {
      setSvgPath(path)
      setUseFontTemplate(false) // Switch back to manual editing
    } else {
      alert('Failed to generate template. Try a different font or size.')
    }
  }, [selectedLetter, selectedFont, fontSize, textToSvgPath])

  // Save current letter
  const saveLetter = useCallback(() => {
    if (!selectedLetter) return

    const letterData: LetterData = {
      guidePoints: {
        TL: [0, 0],
        TR: [100, 0],
        BR: [100, 100],
        BL: [0, 100],
        Center: [50, 50]
      },
      svgPathD: svgPath
    }

    setEditedLetters(prev => {
      const updated = { ...prev, [selectedLetter]: letterData }
      // Save to localStorage
      localStorage.setItem('editedLetters', JSON.stringify(updated))
      return updated
    })

    alert(`Letter "${selectedLetter}" saved!`)
  }, [selectedLetter, svgPath])

  // Export to JSON
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
        
        // Clear edited letters since we're loading a new dictionary
        setEditedLetters({})
        setSelectedLetter(null)
        setSvgPath('')
        
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

  const exportDictionary = useCallback(() => {
    // Merge edited letters with original dictionary
    const merged: Record<string, LetterData> = { ...dictionary }
    Object.keys(editedLetters).forEach(key => {
      merged[key] = editedLetters[key]
    })

    const exportData = {
      description: "Source vector geometry for perspective warping, defined in a 100x100 unit square. These paths are stylized blocks suitable for aggressive perspective transforms.",
      unitSize: 100,
      ...merged
    }

    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dictionary.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [dictionary, editedLetters])

  // Get all letter keys
  const letters = Object.keys(dictionary).sort()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      gap: '1rem',
      maxWidth: '1400px',
      width: '100%'
    }}>
      {/* Sidebar */}
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
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2196f3',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ← Back to Face Maker
        </button>

        <div>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
            Select Letter
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem'
          }}>
            {letters.map((letter) => {
              const isEdited = editedLetters[letter] !== undefined
              return (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(letter)}
                  style={{
                    padding: '0.75rem',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    border: selectedLetter === letter ? '2px solid #2196f3' : '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: selectedLetter === letter 
                      ? '#e3f2fd' 
                      : isEdited 
                        ? '#fff9c4' 
                        : '#f5f5f5',
                    color: selectedLetter === letter ? '#2196f3' : '#333',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  {letter}
                  {isEdited && (
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      fontSize: '0.6rem',
                      color: '#ff9800'
                    }}>●</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {selectedLetter && (
          <>
            {/* Image Upload */}
            <div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                id="image-upload-input"
              />
              <label
                htmlFor="image-upload-input"
                style={{
                  display: 'block',
                  padding: '0.75rem',
                  backgroundColor: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  marginBottom: '0.5rem'
                }}
              >
                {uploadedImage ? 'Change Image' : 'Upload Letter Image'}
              </label>
              {uploadedImage && (
                <button
                  onClick={() => {
                    setUploadedImage(null)
                    if (imageInputRef.current) {
                      imageInputRef.current.value = ''
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor: '#ff6b6b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    marginBottom: '0.5rem'
                  }}
                >
                  Clear Image
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={pointTracingMode}
                  onChange={(e) => {
                    setPointTracingMode(e.target.checked)
                    setDrawingMode(false)
                    setUseFontTemplate(false)
                    if (!e.target.checked) {
                      // When exiting point tracing mode, finalize any current path
                      if (currentPath.length > 0) {
                        finishPath()
                      }
                    }
                  }}
                />
                Point Tracing Mode
              </label>
              
              {pointTracingMode && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fff3cd',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#856404'
                }}>
                  Click on the image to mark points along the letter edges. Click "Finish Path" when done with a path (e.g., outer edge of O). You can create multiple paths (e.g., inner and outer of O).
                </div>
              )}

              {pointTracingMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={finishPath}
                    disabled={currentPath.length === 0}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: currentPath.length > 0 ? '#4caf50' : '#ccc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPath.length > 0 ? 'pointer' : 'not-allowed',
                      fontSize: '0.9rem'
                    }}
                  >
                    Finish Path ({currentPath.length} points)
                  </button>
                  <button
                    onClick={clearPointTracing}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#ff6b6b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Clear All Paths
                  </button>
                  {completedPaths.length > 0 && (
                    <div style={{
                      padding: '0.5rem',
                      backgroundColor: '#e3f2fd',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      color: '#1976d2'
                    }}>
                      Completed paths: {completedPaths.length}
                    </div>
                  )}
                </div>
              )}

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={drawingMode}
                  onChange={(e) => {
                    setDrawingMode(e.target.checked)
                    setPointTracingMode(false)
                    setUseFontTemplate(false)
                    if (e.target.checked) {
                      setDrawingPath([])
                      setCompletedStrokes([])
                    } else {
                      // When exiting drawing mode, finalize the path
                      if (completedStrokes.length > 0 || drawingPath.length > 1) {
                        finishDrawing()
                      }
                    }
                  }}
                />
                Draw Mode
              </label>
              
              {drawingMode && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#1976d2'
                }}>
                  Click and drag on the canvas to draw strokes. Each stroke is added to your letter. Click "Finish Stroke" to complete the current stroke and start a new one.
                </div>
              )}

              {drawingMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={finishDrawing}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#4caf50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Finish Stroke
                  </button>
                  <button
                    onClick={clearDrawing}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#ff6b6b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={useFontTemplate}
                  onChange={(e) => {
                    setUseFontTemplate(e.target.checked)
                    setDrawingMode(false)
                  }}
                />
                Use Font Template
              </label>
            </div>

            {useFontTemplate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontSize: '0.85rem'
                  }}>
                    Font:
                  </label>
                  <select
                    value={selectedFont}
                    onChange={(e) => setSelectedFont(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Palatino">Palatino</option>
                    <option value="Garamond">Garamond</option>
                    <option value="Impact">Impact</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                    <option value="Trebuchet MS">Trebuchet MS</option>
                    <option value="Arial Black">Arial Black</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.25rem',
                    fontSize: '0.85rem'
                  }}>
                    Font Size: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="40"
                    max="120"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <button
                  onClick={generateFontTemplate}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#2196f3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Generate Template
                </button>

                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#1976d2'
                }}>
                  This will generate an SVG path from the selected font. You can then edit it manually if needed.
                </div>
              </div>
            ) : (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  SVG Path:
                </label>
                <textarea
                  value={svgPath}
                  onChange={(e) => setSvgPath(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '150px',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem'
                  }}
                  placeholder="M 50 10 L 90 90..."
                />
              </div>
            )}

            <button
              onClick={saveLetter}
              disabled={!svgPath}
              style={{
                padding: '0.75rem',
                backgroundColor: svgPath ? '#4caf50' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: svgPath ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              Save Letter
            </button>
          </>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                fontSize: '1rem',
                fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              Upload Dictionary JSON
            </label>
          </div>
          
          <button
            onClick={exportDictionary}
            style={{
              padding: '0.75rem',
              backgroundColor: '#ff9800',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Export Dictionary JSON
          </button>
        </div>
      </div>

      {/* Canvas Area */}
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
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: pointTracingMode ? 'crosshair' : drawingMode ? 'crosshair' : 'default'
          }}
        />
        {selectedLetter && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            <strong>Editing:</strong> {selectedLetter}
            {editedLetters[selectedLetter] && (
              <span style={{ color: '#4caf50', marginLeft: '0.5rem' }}>● Saved</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

