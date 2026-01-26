# Theme Behavior Comparison Chart

## Quick Reference: How Each Theme Feels Different

| Attribute | Classic | Severance | Forest | Sunset |
|-----------|---------|-----------|--------|--------|
| **Push Radius** | 150px (standard) | 100px (tight) | 200px (wide) | 180px (wide) |
| **Max Push Distance** | 60px (moderate) | 70px (strong) | 40px (gentle) | 50px (moderate) |
| **Scale Radius** | 150px | 120px (tight) | 180px (wide) | 170px (wide) |
| **Max Scale** | 1.5x | 1.8x (dramatic) | 1.3x (subtle) | 2.0x (very dramatic) |
| **Visibility Radius** | 250px | 220px (tight) | 280px (wide) | 350px (very wide) |
| **Full Visibility** | 100px | 80px (sharp) | 120px (soft) | 140px (very soft) |
| **Danger Shake** | 20px | 35px (intense) | 10px (gentle) | 15px (moderate) |
| **Shake Exponent** | 1.5 | 2.0 (jarring) | 1.2 (smooth) | 1.3 (smooth) |
| **Danger Zone** | 200px | 200px | 200px | 200px |

## Visual Personality Guide

### 🎯 Classic Theme
**Personality**: Balanced, Traditional
- Standard interaction radius
- Moderate push and scaling
- Predictable, comfortable feel
- Good baseline for comparison

### 💼 Severance Theme  
**Personality**: Intense, Glitchy, Corporate
- **Tight, aggressive distortion** (small radius, strong push)
- **Dramatic scaling** (dots grow/shrink noticeably)
- **Intense shake near hazards** (jarring, glitchy feel)
- Sharp visibility transitions
- **Best for**: Tense, corporate, unsettling atmosphere

### 🌲 Forest Theme
**Personality**: Gentle, Organic, Natural
- **Wide, flowing influence** (large radius, gentle push)
- **Subtle movements** (like leaves rustling)
- **Minimal shake** (gentle, natural sway)
- Soft visibility transitions
- **Best for**: Calm, natural, peaceful atmosphere

### 🌅 Sunset Theme
**Personality**: Dreamy, Dramatic, Ethereal
- **Very wide visibility** (dreamy, soft appearance)
- **Dramatic scaling** (2x size changes!)
- **Flowing movements** (moderate push)
- Very gradual fade-in
- **Best for**: Ethereal, dramatic, soft atmosphere

## Testing Each Theme

### What to Look For:

1. **Move cursor slowly across dots**
   - Classic: Balanced push
   - Severance: Tight, aggressive push
   - Forest: Wide, gentle flow
   - Sunset: Wide, dramatic size changes

2. **Approach a hazard**
   - Classic: Moderate shake
   - Severance: Intense, jarring shake
   - Forest: Gentle rustling
   - Sunset: Moderate shake with wide visibility

3. **Watch dot visibility**
   - Classic: Standard fade-in
   - Severance: Sharp, sudden appearance
   - Forest: Soft, gradual appearance
   - Sunset: Very soft, dreamy appearance

## Customization Tips

Want to adjust a theme's feel? Edit the `dotBehavior` values:

- **More aggressive**: Decrease `pushRadius`, increase `maxPushDistance`
- **More gentle**: Increase `pushRadius`, decrease `maxPushDistance`
- **More dramatic**: Increase `maxScale`, `dangerShakeAmount`
- **More subtle**: Decrease `maxScale`, `dangerShakeAmount`
- **Softer appearance**: Increase `visibilityRadius`, `fullVisibilityRadius`
- **Sharper appearance**: Decrease visibility radii

## Example: Creating a "Zen" Theme

```javascript
dotBehavior: {
    pushRadius: 250,           // Very wide, gentle influence
    maxPushDistance: 20,       // Minimal movement
    scaleRadius: 200,          // Wide, subtle scaling
    maxScale: 1.1,             // Barely noticeable size change
    visibilityRadius: 400,     // Very soft, wide visibility
    fullVisibilityRadius: 200, // Very gradual fade
    dangerShakeAmount: 5,      // Almost no shake
    dangerShakeExponent: 1.0,  // Linear, calm
    dangerZone: 200
}
```

## Example: Creating a "Chaos" Theme

```javascript
dotBehavior: {
    pushRadius: 80,            // Very tight
    maxPushDistance: 100,      // Extreme push
    scaleRadius: 100,          // Tight scaling
    maxScale: 3.0,             // Huge size changes
    visibilityRadius: 150,     // Sharp visibility
    fullVisibilityRadius: 50,  // Sudden appearance
    dangerShakeAmount: 50,     // Extreme shake
    dangerShakeExponent: 3.0,  // Exponential chaos
    dangerZone: 200
}
```
