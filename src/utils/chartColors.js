// Color palette for multiple series in charts
export const COLOR_PALETTE = [
  '#059669', // emerald-600
  '#dc2626', // red-600
  '#2563eb', // blue-600
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
  '#06b6d4', // cyan-500
  '#a855f7', // purple-500
]

// Extended color palette for more combinations
export const EXTENDED_COLOR_PALETTE = [
  ...COLOR_PALETTE,
  '#047857', // emerald-700
  '#b91c1c', // red-700
  '#1e40af', // blue-700
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#db2777', // pink-600
  '#0d9488', // teal-600
  '#ea580c', // orange-600
  '#4f46e5', // indigo-600
  '#65a30d', // lime-600
  '#0891b2', // cyan-600
  '#9333ea', // purple-600
]

// Create a color scale function that assigns consistent colors to series
export function createColorScale() {
  const colorMap = new Map()
  let colorIndex = 0
  
  return function(seriesKey) {
    if (!colorMap.has(seriesKey)) {
      colorMap.set(seriesKey, EXTENDED_COLOR_PALETTE[colorIndex % EXTENDED_COLOR_PALETTE.length])
      colorIndex++
    }
    return colorMap.get(seriesKey)
  }
}

// Get contrasting text color for a background color
export function getContrastingTextColor(bgColor) {
  // Convert hex to RGB
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

// Generate a color based on a string (for consistent colors)
export function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const index = Math.abs(hash) % EXTENDED_COLOR_PALETTE.length
  return EXTENDED_COLOR_PALETTE[index]
}