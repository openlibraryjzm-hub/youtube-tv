'use client'

import { useState, useRef, useCallback } from 'react'

export default function PlayerAreaMapper({ onAreaSet }) {
  const [isActive, setIsActive] = useState(false)
  const [box, setBox] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState(null) // 'move', 'resize-nw', 'resize-ne', 'resize-sw', 'resize-se', 'resize-n', 'resize-s', 'resize-w', 'resize-e'
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [startBox, setStartBox] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const containerRef = useRef(null)

  const handleMouseDown = useCallback((e) => {
    if (!isActive) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if clicking on resize handle
    const handleSize = 10
    const isOnNW = x >= box.x - handleSize && x <= box.x + handleSize && y >= box.y - handleSize && y <= box.y + handleSize
    const isOnNE = x >= box.x + box.width - handleSize && x <= box.x + box.width + handleSize && y >= box.y - handleSize && y <= box.y + handleSize
    const isOnSW = x >= box.x - handleSize && x <= box.x + handleSize && y >= box.y + box.height - handleSize && y <= box.y + box.height + handleSize
    const isOnSE = x >= box.x + box.width - handleSize && x <= box.x + box.width + handleSize && y >= box.y + box.height - handleSize && y <= box.y + box.height + handleSize
    const isOnN = x >= box.x && x <= box.x + box.width && y >= box.y - handleSize && y <= box.y + handleSize
    const isOnS = x >= box.x && x <= box.x + box.width && y >= box.y + box.height - handleSize && y <= box.y + box.height + handleSize
    const isOnW = x >= box.x - handleSize && x <= box.x + handleSize && y >= box.y && y <= box.y + box.height
    const isOnE = x >= box.x + box.width - handleSize && x <= box.x + box.width + handleSize && y >= box.y && y <= box.y + box.height
    
    if (isOnNW) {
      setDragType('resize-nw')
    } else if (isOnNE) {
      setDragType('resize-ne')
    } else if (isOnSW) {
      setDragType('resize-sw')
    } else if (isOnSE) {
      setDragType('resize-se')
    } else if (isOnN) {
      setDragType('resize-n')
    } else if (isOnS) {
      setDragType('resize-s')
    } else if (isOnW) {
      setDragType('resize-w')
    } else if (isOnE) {
      setDragType('resize-e')
    } else if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
      setDragType('move')
    } else {
      // Start new box
      setBox({ x, y, width: 0, height: 0 })
      setDragType('resize-se')
    }
    
    setIsDragging(true)
    setStartPos({ x, y })
    setStartBox({ ...box })
  }, [isActive, box])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !isActive) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const deltaX = x - startPos.x
    const deltaY = y - startPos.y
    
    let newBox = { ...startBox }
    
    if (dragType === 'move') {
      newBox.x = Math.max(0, Math.min(rect.width - newBox.width, startBox.x + deltaX))
      newBox.y = Math.max(0, Math.min(rect.height - newBox.height, startBox.y + deltaY))
    } else if (dragType === 'resize-nw') {
      newBox.x = Math.max(0, Math.min(startBox.x + startBox.width - 20, startBox.x + deltaX))
      newBox.y = Math.max(0, Math.min(startBox.y + startBox.height - 20, startBox.y + deltaY))
      newBox.width = startBox.width - (newBox.x - startBox.x)
      newBox.height = startBox.height - (newBox.y - startBox.y)
    } else if (dragType === 'resize-ne') {
      newBox.y = Math.max(0, Math.min(startBox.y + startBox.height - 20, startBox.y + deltaY))
      newBox.width = Math.max(20, startBox.width + deltaX)
      newBox.height = startBox.height - (newBox.y - startBox.y)
    } else if (dragType === 'resize-sw') {
      newBox.x = Math.max(0, Math.min(startBox.x + startBox.width - 20, startBox.x + deltaX))
      newBox.width = startBox.width - (newBox.x - startBox.x)
      newBox.height = Math.max(20, startBox.height + deltaY)
    } else if (dragType === 'resize-se') {
      newBox.width = Math.max(20, startBox.width + deltaX)
      newBox.height = Math.max(20, startBox.height + deltaY)
    } else if (dragType === 'resize-n') {
      newBox.y = Math.max(0, Math.min(startBox.y + startBox.height - 20, startBox.y + deltaY))
      newBox.height = startBox.height - (newBox.y - startBox.y)
    } else if (dragType === 'resize-s') {
      newBox.height = Math.max(20, startBox.height + deltaY)
    } else if (dragType === 'resize-w') {
      newBox.x = Math.max(0, Math.min(startBox.x + startBox.width - 20, startBox.x + deltaX))
      newBox.width = startBox.width - (newBox.x - startBox.x)
    } else if (dragType === 'resize-e') {
      newBox.width = Math.max(20, startBox.width + deltaX)
    }
    
    setBox(newBox)
  }, [isDragging, isActive, dragType, startPos, startBox])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragType(null)
  }, [])

  const handleSave = useCallback(() => {
    console.log('Save button clicked')
    
    if (!containerRef.current || box.width === 0 || box.height === 0) {
      console.error('Cannot save: invalid box dimensions or container not found')
      alert('Cannot save: Please draw a valid area first.')
      return
    }
    
    const rect = containerRef.current.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) {
      console.error('Cannot save: invalid container dimensions')
      alert('Cannot save: Invalid container dimensions.')
      return
    }
    
    const normalizedBox = {
      x: box.x / rect.width,
      y: box.y / rect.height,
      width: box.width / rect.width,
      height: box.height / rect.height,
      absolute: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height
      },
      viewport: {
        width: rect.width,
        height: rect.height
      },
      timestamp: new Date().toISOString()
    }
    
    // Save to console
    console.log('Player Area Data:', normalizedBox)
    console.log('JSON String:', JSON.stringify(normalizedBox, null, 2))
    
    // Save to file - use immediate click (not in requestAnimationFrame)
    try {
      const jsonString = JSON.stringify(normalizedBox, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      
      console.log('Blob created, URL:', url)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `player-area-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      a.style.position = 'fixed'
      a.style.left = '-9999px'
      document.body.appendChild(a)
      
      console.log('Anchor element created and appended')
      
      // Click immediately (must be in same event handler for browser security)
      a.click()
      console.log('Click triggered')
      
      // Cleanup after a short delay
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a)
        }
        URL.revokeObjectURL(url)
        console.log('Cleanup complete')
      }, 1000)
      
      alert('File download should start. Check your downloads folder.')
    } catch (error) {
      console.error('Error saving file:', error)
      alert(`Error saving file: ${error.message}. Check console for details.`)
    }
    
    if (onAreaSet) {
      onAreaSet(normalizedBox)
    }
  }, [box, onAreaSet])

  if (!isActive) {
    return (
      <button
        onClick={() => setIsActive(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg"
      >
        Map Player Area
      </button>
    )
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/50"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-black/90 text-white p-4 rounded-lg">
        <h3 className="font-bold mb-2">Player Area Mapper</h3>
        <p className="text-sm mb-2">Click and drag to create/resize box</p>
        <p className="text-sm mb-2">Drag corners/edges to resize, drag center to move</p>
        <div className="text-xs mt-2">
          <div>X: {Math.round(box.x)}px</div>
          <div>Y: {Math.round(box.y)}px</div>
          <div>Width: {Math.round(box.width)}px</div>
          <div>Height: {Math.round(box.height)}px</div>
          {box.width > 0 && box.height > 0 && (
            <>
              <div className="mt-2">X%: {((box.x / containerRef.current?.getBoundingClientRect().width) * 100).toFixed(2)}%</div>
              <div>Y%: {((box.y / containerRef.current?.getBoundingClientRect().height) * 100).toFixed(2)}%</div>
              <div>Width%: {((box.width / containerRef.current?.getBoundingClientRect().width) * 100).toFixed(2)}%</div>
              <div>Height%: {((box.height / containerRef.current?.getBoundingClientRect().height) * 100).toFixed(2)}%</div>
            </>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm"
            disabled={box.width === 0 || box.height === 0}
          >
            Save to File
          </button>
          <button
            onClick={() => {
              setIsActive(false)
              setBox({ x: 0, y: 0, width: 0, height: 0 })
            }}
            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* Box */}
      {box.width > 0 && box.height > 0 && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
          style={{
            left: `${box.x}px`,
            top: `${box.y}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
          }}
        >
          {/* Resize handles */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nwse-resize" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nesw-resize" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nesw-resize" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nwse-resize" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ns-resize" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ns-resize" />
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ew-resize" />
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ew-resize" />
        </div>
      )}
    </div>
  )
}
