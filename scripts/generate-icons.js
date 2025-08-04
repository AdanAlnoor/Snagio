// Script to generate PWA icons
// Run with: node scripts/generate-icons.js

const fs = require('node:fs')
const path = require('node:path')

// Create a simple SVG icon with the Snagio "S" logo
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="64" fill="#f97316"/>
  <text x="256" y="360" font-family="Arial, sans-serif" font-size="320" font-weight="bold" fill="white" text-anchor="middle">S</text>
</svg>
`

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Save the SVG
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon.trim())
