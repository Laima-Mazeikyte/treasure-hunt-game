ANIMATED ASSET GUIDE
====================

This game supports multiple animation formats for cursors, targets, and hazards.
Choose the format that best fits your needs based on performance and complexity.


SUPPORTED FORMATS
-----------------

1. ANIMATED SVG (Recommended - Best Performance)
   - File size: 2-10KB
   - Best for: Icon animations, simple to moderate complexity
   - Performance: Excellent (native browser support)
   - Scales perfectly at any resolution

2. SPRITE SHEETS
   - File size: 20-50KB
   - Best for: Frame-based animations, retro/pixel art style
   - Performance: Excellent (minimal CPU usage)
   - Format: Horizontal strip (all frames in one row)

3. LOTTIE (Already Supported)
   - File size: 10-100KB
   - Best for: Complex After Effects animations, intricate designs
   - Performance: Good (requires library)
   - Tools: Adobe After Effects + Bodymovin plugin


ASSET CONFIGURATION
-------------------

Update the theme configuration in script.js:

assets: {
  cursor: { 
    type: 'animated-svg',  // or 'sprite', 'lottie', 'svg', 'image'
    src: 'assets/cursor-eye-animated.svg',
    size: 32
  },
  target: { 
    type: 'sprite',
    src: 'assets/target-gem-sprite.png',
    size: 40,
    frames: 8,              // Required for sprites
    frameDuration: 100      // Ms per frame (optional, default: 100)
  },
  hazard: {
    type: 'lottie',
    src: 'assets/hazard-skull.json',
    size: 40
  }
}


CREATING ANIMATED SVGS
----------------------

Option 1: Online Tools
- SVGator (https://www.svgator.com) - Visual editor
- Animate SVG easily without coding

Option 2: Hand-coded SMIL Animation

Example - Pulsing Circle:
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="8" fill="#FFD700">
    <animate attributeName="r" 
             values="8;10;8" 
             dur="2s" 
             repeatCount="indefinite"/>
  </circle>
</svg>

Example - Rotating Star:
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" fill="#FFD700">
    <animateTransform attributeName="transform"
                      type="rotate"
                      from="0 12 12"
                      to="360 12 12"
                      dur="3s"
                      repeatCount="indefinite"/>
  </path>
</svg>

Example - Blinking Eye:
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="12" cy="12" rx="8" ry="5" fill="white" stroke="black" stroke-width="2"/>
  <circle cx="12" cy="12" r="3" fill="black">
    <animate attributeName="r" 
             values="3;0.5;3" 
             dur="3s" 
             repeatCount="indefinite"
             keyTimes="0;0.1;0.2"/>
  </circle>
</svg>


CREATING SPRITE SHEETS
----------------------

Format: Horizontal strip (all frames side by side)
Example for 8 frames at 40x40 pixels: Total image is 320x40 pixels

Tools:
- TexturePacker (https://www.codeandweb.com/texturepacker)
- Shoebox (http://renderhjs.net/shoebox/)
- Photoshop: File > Export > Layers to Files

Layout:
+-------+-------+-------+-------+-------+-------+-------+-------+
| Frame | Frame | Frame | Frame | Frame | Frame | Frame | Frame |
|   1   |   2   |   3   |   4   |   5   |   6   |   7   |   8   |
+-------+-------+-------+-------+-------+-------+-------+-------+

File naming:
- target-gem-sprite.png (8 frames @ 40x40 = 320x40 total)
- hazard-skull-sprite.png


CREATING LOTTIE ANIMATIONS
---------------------------

Tools:
- Adobe After Effects + Bodymovin plugin
- Export as JSON file
- Free animations: https://lottiefiles.com

Steps:
1. Create animation in After Effects
2. Install Bodymovin plugin
3. Window > Extensions > Bodymovin
4. Select composition and export as JSON
5. Place JSON file in assets folder


FILE STRUCTURE
--------------

assets/
  # Static (existing)
  cursor-eye.svg
  target-gem.svg
  hazard-skull.svg
  
  # Animated SVGs (recommended)
  cursor-eye-animated.svg
  target-gem-animated.svg
  hazard-skull-animated.svg
  
  # Sprite Sheets
  target-gem-sprite.png          # 8 frames horizontal
  hazard-skull-sprite.png        # 8 frames horizontal
  cursor-sparkle-sprite.png      # Custom frame count
  
  # Lottie
  cursor-eye.json
  target-gem.json
  hazard-skull.json


PERFORMANCE TIPS
----------------

1. Animated SVG is best for most cases:
   - Smallest file size
   - Perfect scaling
   - No library needed

2. Use sprites for frame-based animations:
   - Great for pixel art
   - Consistent performance

3. Reserve Lottie for complex animations only:
   - Requires 200KB library
   - Higher CPU usage

4. Automatic optimizations:
   - Off-screen animations are paused
   - SVG content is cached
   - Memory is properly managed


TROUBLESHOOTING
---------------

Animation not showing?
- Check file path in browser console
- Verify asset type matches file format
- For sprites: ensure 'frames' property is set

Animation not smooth?
- Reduce sprite frameDuration (try 60-80ms)
- Simplify animated SVG complexity
- Check browser performance tab

File too large?
- Optimize SVG: https://jakearchibald.github.io/svgomg/
- Compress PNG sprites with TinyPNG
- Simplify Lottie animations in After Effects


EXAMPLES IN THIS FOLDER
------------------------

Default files (replace with your own):
- cursor-eye.svg           (static SVG)
- target-gem.svg           (static SVG)
- hazard-skull.svg         (static SVG)

To use animated versions, create files with same base name:
- cursor-eye-animated.svg  (animated version)
- target-gem-sprite.png    (sprite version)
- hazard-skull.json        (Lottie version)

Then update script.js theme config to use the new asset type.
