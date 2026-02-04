import { db, ensureInstantDb, hasInstantDb, id } from './instantdb.js';

const gridContainer = document.getElementById('grid-container');
const dotSpacing = 40; // Spacing between dots in pixels
// Note: pushRadius, maxPushDistance, and other distortion parameters are now theme-specific
// See each theme's dotBehavior configuration

const userAgent = navigator.userAgent || '';
const isChrome = /Chrome/.test(userAgent) && !/Edg|OPR|Brave|Chromium/.test(userAgent);
const usePerformanceMode = !isChrome;

let dots = [];
let mouseX = -1000;
let mouseY = -1000;
let centerX = window.innerWidth / 2;
let centerY = window.innerHeight / 2;
let targets = [];
let isDragging = false;
let targetsFound = 0;
let gameStarted = false;
let gameReady = false; // Game is prepared but waiting for user to move
let hasInteracted = false; // Track if user has started interacting
let currentHoveredTarget = null; // Track which target is currently hovered
let hazards = []; // Array of hazard enemies
let currentLevel = 1; // Track current level
let totalTargets = 3; // Total targets for current level
let totalTargetsCollected = 0;
let levelsCompleted = 0;
let scoreSubmitted = false;
let isTouchDevice = false;
let customCursorElement = null;

function updatePerformanceModeState() {
    document.body.classList.toggle('performance-mode', usePerformanceMode && gameStarted);
}

// Theme configuration (colors, assets, and copy)
const themes = {
    classic: {
        name: 'Treasure Hunt',
        colors: {
            baseColor: { r: 102, g: 194, b: 255 },    // #66C2FF
            targetColor: { r: 255, g: 92, b: 52 },    // #FF5C34
            hazardColor: { r: 53, g: 30, b: 40 }      // #351E28
        },
        assets: {
            // NOTE: with `publicDir: 'assets'` these resolve from the site root.
            target: { src: 'target-gem-01.svg', size: 32, randomColor: true },
            hazard: { src: 'hazzard-octopus.svg', size: 32 }
        },
        copy: {
            gameTitle: 'Treasure Hunt',
            themePrompt: 'Select a theme:',
            levelPrompt: 'Select a level to start:',
            levelButtonTemplate: 'Level {level}',
            levelButtonSubtext: '{hazards} Hazards, {targets} Targets',
            legendTargetLabel: 'Targets',
            legendHazardLabel: 'Hazards',
            gameOverTitle: 'Game Over!',
            gameOverMessage: 'You were caught by a hazard!',
            levelCompleteTitle: 'Level {level} complete!',
            levelCompleteMessage: 'All targets found!',
            nextLevelCta: 'Next Level',
            restartCta: 'Restart Game',
            playAgainCta: 'Play Again',
            saveScoreCta: 'Save Score',
            finishRunCta: 'Finish Run'
        },
        levelOverrides: {},
        dotGrid: {
            type: 'symbols',
            characters: '▲◆•✦★◊',
            fontSize: 20,
            fontFamily: 'Arial, sans-serif',
            colorSource: 'custom',
            color: { r: 215, g: 239, b: 255 } // #D7EFFF
        },
        dotBehavior: {
            pushRadius: 150,           // Radius of influence from cursor
            maxPushDistance: 60,       // Maximum distance dots can move
            scaleRadius: 150,          // Distance for scaling effect
            maxScale: 1.5,             // Maximum size multiplier
            visibilityRadius: 250,     // Distance dots start fading
            fullVisibilityRadius: 100, // Distance dots are fully visible
            baseJitterAmount: 2,       // Always jitter slightly
            dangerShakeAmount: 20,     // Max shake intensity near hazards
            dangerShakeExponent: 1.5,  // Controls shake curve (higher = more dramatic)
            dangerZone: 200            // Distance from hazard to trigger effects
        }
    }
};

// Current selected theme
let currentTheme = 'classic';

// Color palette (will be set based on selected theme)
let baseColor = { ...themes.classic.colors.baseColor };
let targetColor = { ...themes.classic.colors.targetColor };
let hazardColor = { ...themes.classic.colors.hazardColor };

const maxTargetDistance = 400; // Distance for target color transition
const maxHazardDistance = 300; // Distance for hazard darkness effect

// Proximity messages
const proximityMessages = [
    { maxDistance: 50, text: "BURNING HOT! Right here!" },
    { maxDistance: 100, text: "Very hot! So close!" },
    { maxDistance: 150, text: "Hot! Getting warmer..." },
    { maxDistance: 250, text: "Warm... keep going" },
    { maxDistance: 350, text: "Lukewarm" },
    { maxDistance: 450, text: "Cool... far away" },
    { maxDistance: Infinity, text: "Ice cold! Very far..." }
];

function getThemeConfig(themeId) {
    return themes[themeId] || themes.classic;
}

// Clear any previously applied asset content for an element.
// (We removed Lottie/sprite support, so this is now a lightweight cleanup helper.)
function clearAnimationForElement(element) {
    if (!element) return;
    element.innerHTML = '';
    element.style.backgroundImage = '';
    element.style.backgroundSize = '';
    element.style.backgroundRepeat = '';
    element.style.backgroundPosition = '';
}

// Enhanced asset application function supporting multiple formats
async function applyAssetToElement(element, asset) {
    if (!element || !asset || !asset.src) return;
    
    const size = asset.size || 40;
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;

    // Clear any previous asset content/styles
    clearAnimationForElement(element);

    const isSvg = asset.src.endsWith('.svg');
    const isImage = asset.src.match(/\.(png|jpg|jpeg|gif|webp)$/i);

    if (isSvg) {
        // Load SVG inline to allow color manipulation
        const isTargetElement = element.classList.contains('target') || element.id === 'target-legend-icon';
        if (asset.randomColor && isTargetElement) {
            fetch(asset.src)
                .then(response => response.text())
                .then(svgContent => {
                    element.innerHTML = svgContent;
                    const svgElement = element.querySelector('svg');
                    if (!svgElement) return;

                    svgElement.style.width = '100%';
                    svgElement.style.height = '100%';
                    svgElement.style.display = 'block';

                    // Apply random color to all path elements
                    const randomColor = getRandomGemColor();
                    const paths = svgElement.querySelectorAll('path');
                    paths.forEach(path => {
                        path.setAttribute('fill', randomColor);
                    });

                    // Apply color-matched glow to the element
                    const hexToRgb = (hex) => {
                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                        return result ? {
                            r: parseInt(result[1], 16),
                            g: parseInt(result[2], 16),
                            b: parseInt(result[3], 16)
                        } : null;
                    };
                    const rgb = hexToRgb(randomColor);
                    if (rgb) {
                        element.style.filter = `drop-shadow(0 0 8px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)) drop-shadow(0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6))`;
                    }
                })
                .catch(err => {
                    console.error('Failed to load SVG for color randomization:', err);
                    // Fallback to background image
                    element.style.backgroundImage = `url(${asset.src})`;
                    element.style.backgroundSize = 'contain';
                    element.style.backgroundRepeat = 'no-repeat';
                    element.style.backgroundPosition = 'center';
                });
        } else {
            // Static SVG without color randomization
            element.style.backgroundImage = `url(${asset.src})`;
            element.style.backgroundSize = 'contain';
            element.style.backgroundRepeat = 'no-repeat';
            element.style.backgroundPosition = 'center';
        }
        return;
    }

    if (isImage) {
        element.style.backgroundImage = `url(${asset.src})`;
        element.style.backgroundSize = 'contain';
        element.style.backgroundRepeat = 'no-repeat';
        element.style.backgroundPosition = 'center';
        return;
    }

    // If the asset isn't a supported format, fail quietly (prevents noisy console logs).
}

function formatTemplate(text, replacements) {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
        return Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : match;
    });
}

function normalizeNickname(value) {
    return value.replace(/\s+/g, ' ').trim();
}

async function submitLeaderboardEntry(nickname) {
    if (scoreSubmitted) {
        return { ok: false, error: 'Score already saved for this run.' };
    }
    if (!ensureInstantDb() || !db) {
        return { ok: false, error: 'Leaderboard is not configured yet.' };
    }

    const entryId = id();
    const payload = {
        nickname,
        totalTargets: totalTargetsCollected,
        levelsCompleted,
        createdAt: Date.now()
    };

    try {
        await db.transact(
            db.tx.leaderboard_entries[entryId].update(payload)
        );
        scoreSubmitted = true;
        return { ok: true, entryId };
    } catch (error) {
        return { ok: false, error: 'Could not save score. Please try again.' };
    }
}

function showScoreForm(gameOverScreen) {
    // Store the original content
    const originalContent = gameOverScreen.innerHTML;
    const theme = getThemeConfig(currentTheme);
    
    // Replace with score form
    gameOverScreen.innerHTML = `
        <h2 style="color: #F4C2C2;">Save Score</h2>
        <p>Levels: ${levelsCompleted}<br>Targets: ${totalTargetsCollected}</p>
        <form class="score-form">
            <label class="score-label" for="score-nickname-input" style="color: white;">Nickname</label>
            <input id="score-nickname-input" class="score-input" type="text" maxlength="20" />
            <div class="score-error" id="score-error-message"></div>
            <div class="score-actions-row">
                <button type="submit" class="score-submit">Save</button>
                <button type="button" class="score-cancel">Cancel</button>
            </div>
        </form>
    `;

    const input = gameOverScreen.querySelector('#score-nickname-input');
    const cancelBtn = gameOverScreen.querySelector('.score-cancel');
    const submitBtn = gameOverScreen.querySelector('.score-submit');
    const form = gameOverScreen.querySelector('.score-form');
    const errorMessage = document.getElementById('score-error-message');

    // Clear error message when user starts typing
    if (input && errorMessage) {
        input.addEventListener('input', () => {
            errorMessage.textContent = '';
        });
    }

    const restoreGameOver = () => {
        gameOverScreen.innerHTML = originalContent;
        // Re-attach event listeners to the restored buttons
        const restartBtn = gameOverScreen.querySelector('#restart-button');
        const saveBtn = gameOverScreen.querySelector('#save-score-button');
        
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                location.reload();
            });
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                showScoreForm(gameOverScreen);
            });
        }
    };

    if (!hasInstantDb) {
        submitBtn.disabled = true;
    } else if (scoreSubmitted) {
        submitBtn.disabled = true;
    }

    cancelBtn.addEventListener('click', restoreGameOver);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const errorMessage = document.getElementById('score-error-message');
        const nickname = normalizeNickname(input.value || '');
        
        if (!nickname) {
            errorMessage.textContent = 'Please add a nickname';
            return;
        }
        if (nickname.length < 2) {
            errorMessage.textContent = 'Please add a nickname';
            return;
        }
        if (nickname.length > 20) {
            errorMessage.textContent = 'Nickname is too long';
            return;
        }

        errorMessage.textContent = '';
        submitBtn.disabled = true;
        cancelBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const result = await submitLeaderboardEntry(nickname);
        if (!result.ok) {
            submitBtn.disabled = false;
            cancelBtn.disabled = false;
            submitBtn.textContent = 'Save';
            errorMessage.textContent = result.error || 'Could not save score';
            return;
        }

        submitBtn.textContent = 'Saved!';
        setTimeout(() => {
            // Pass the entry ID to show personalized ranking
            window.location.href = `leaderboard.html?entry=${result.entryId}`;
        }, 400);
    });

    if (input) {
        input.focus();
    }
}

function updateStartScreenCopy(theme) {
    const titleEl = document.getElementById('start-title');
    if (titleEl) titleEl.textContent = theme.copy.gameTitle;
}

function applyThemeAssetsToUi(level, themeId) {
    const config = getLevelConfig(level, themeId);
    const targetLegendIcon = document.getElementById('target-legend-icon');
    const hazardLegendIcon = document.getElementById('hazard-legend-icon');
    
    // Apply target asset with random color
    if (targetLegendIcon && config.assets.target) {
        const targetAsset = { ...config.assets.target };
        // Force random color for the legend icon
        targetAsset.randomColor = true;
        applyAssetToElement(targetLegendIcon, targetAsset);
    }
    
    // Apply hazard asset
    if (hazardLegendIcon && config.assets.hazard) {
        applyAssetToElement(hazardLegendIcon, config.assets.hazard);
    }
}

// Get level configuration - dynamically generated for infinite levels
function getLevelConfig(level, themeId = currentTheme) {
    const theme = getThemeConfig(themeId);

    // Calculate progressive difficulty
    // Hazards: Level 1 has 0, Level 2+ starts at 1 and increases by 1 every level (capped at 8)
    const hazardsCount = level === 1 ? 0 : Math.min(level - 1, 8);

    // Targets: Level 1 and 2 have 3, then increases by 2 each level
    const targetsCount = level <= 2 ? 3 : 3 + ((level - 2) * 2);

    return {
        hazards: hazardsCount,
        targets: targetsCount,
        assets: {
            target: theme.assets.target,
            hazard: theme.assets.hazard
        },
        movingHazards: true
    };
}

// Create hazards based on level
function createHazards() {
    const config = getLevelConfig(currentLevel);
    hazards = [];

    // Minimum safe distance from cursor (to prevent instant loss)
    const minCursorDistance = 250;
    const hazardAsset = config.assets.hazard;
    const hazardSize = hazardAsset.size || 40;
    const hazardRadius = hazardSize / 2;

    for (let i = 0; i < config.hazards; i++) {
        const hazardEl = document.createElement('div');
        hazardEl.className = 'hazard';
        applyAssetToElement(hazardEl, hazardAsset);

        // Random position, ensuring spacing from other hazards, cursor, and UI elements
        let x, y, tooClose, tooCloseToCursor, inUIZone;
        do {
            x = Math.random() * (window.innerWidth - hazardSize * 2) + hazardSize;
            y = Math.random() * (window.innerHeight - hazardSize * 2) + hazardSize;

            // Check if too close to existing hazards
            tooClose = hazards.some(h => {
                const dx = x - h.x;
                const dy = y - h.y;
                return Math.sqrt(dx * dx + dy * dy) < 200;
            });

            // Check if too close to cursor position
            const dxCursor = x - mouseX;
            const dyCursor = y - mouseY;
            const distanceToCursor = Math.sqrt(dxCursor * dxCursor + dyCursor * dyCursor);
            tooCloseToCursor = distanceToCursor < minCursorDistance;

            // Check if in UI zone (bottom 100px of screen to avoid legend and level indicator)
            inUIZone = y > window.innerHeight - 100;
        } while (tooClose || tooCloseToCursor || inUIZone);

        hazardEl.style.left = `${x - hazardRadius}px`;
        hazardEl.style.top = `${y - hazardRadius}px`;

        document.body.appendChild(hazardEl);

        // Random velocity for moving hazards
        // Base speed is 0.5, but increases by 10% per level after level 2
        const baseSpeed = 0.5;
        const speed = currentLevel > 2 
            ? baseSpeed * Math.pow(1.10, currentLevel - 2) 
            : baseSpeed;
        const angle = Math.random() * Math.PI * 2;

        hazards.push({
            element: hazardEl,
            x: x,
            y: y,
            size: hazardSize,
            velocityX: Math.cos(angle) * speed,
            velocityY: Math.sin(angle) * speed
        });
    }
}

// Create targets based on level
function createTargets() {
    const config = getLevelConfig(currentLevel);
    totalTargets = config.targets;
    targets = [];

    // Minimum safe distance from cursor (to prevent instant discovery)
    const minCursorDistance = 200;
    const targetAsset = config.assets.target;
    const targetSize = targetAsset.size || 40;
    const targetRadius = targetSize / 2;

    for (let i = 0; i < config.targets; i++) {
        const targetEl = document.createElement('div');
        targetEl.className = 'target';

        // Random position, ensuring spacing from hazards, cursor, and UI elements
        let x, y, tooCloseToEnemy, tooCloseToCursor, inUIZone;
        do {
            x = Math.random() * (window.innerWidth - targetSize * 2) + targetSize;
            y = Math.random() * (window.innerHeight - targetSize * 2) + targetSize;

            // Check if too close to any hazard
            tooCloseToEnemy = hazards.some(h => {
                const dx = x - h.x;
                const dy = y - h.y;
                return Math.sqrt(dx * dx + dy * dy) < 150;
            });

            // Check if too close to cursor position
            const dxCursor = x - mouseX;
            const dyCursor = y - mouseY;
            const distanceToCursor = Math.sqrt(dxCursor * dxCursor + dyCursor * dyCursor);
            tooCloseToCursor = distanceToCursor < minCursorDistance;

            // Check if in UI zone (bottom 100px of screen to avoid legend and level indicator)
            inUIZone = y > window.innerHeight - 100;
        } while (tooCloseToEnemy || tooCloseToCursor || inUIZone);

        targetEl.style.left = `${x - targetRadius}px`;
        targetEl.style.top = `${y - targetRadius}px`;

        // Add to DOM first, then apply asset (Lottie needs element in DOM)
        document.body.appendChild(targetEl);
        
        // Apply asset after element is in DOM (async, but don't wait - let it load in background)
        applyAssetToElement(targetEl, targetAsset).catch(err => {
            console.error('Failed to apply asset to target:', err);
        });

        targets.push({
            element: targetEl,
            x: x,
            y: y,
            size: targetSize,
            revealed: false,
            hasBeenHovered: false // Track if player has hovered over this target before
        });
    }
}

// Helper function to get a random character from a string
function getRandomCharacter(characters) {
    return characters[Math.floor(Math.random() * characters.length)];
}

// Helper function to generate random gem colors
function getRandomGemColor() {
    const gemColors = [
        '#FFFFFF', // White
        '#FFBEE3', // Light Pink
        '#FCFFBD', // Light Yellow
        '#F7C0C1', // Peach
        '#E9F056', // Yellow
        '#D3B6F0', // Lavender
        '#BFEC78', // Light Green
        '#99F8FF', // Light Cyan
        '#78ECAA', // Mint Green
    ];
    return gemColors[Math.floor(Math.random() * gemColors.length)];
}

// Helper function to initialize dot content based on theme
function initializeDotContent(dot, dotGridConfig) {
    if (!dotGridConfig) {
        // Default to circular dots if no config
        dot.className = 'dot';
        return;
    }

    if (dotGridConfig.type === 'dots') {
        // Traditional circular dots
        dot.className = 'dot';
    } else {
        // Text-based dots (letters, numbers, symbols, mixed)
        dot.className = 'dot dot-text';
        const character = getRandomCharacter(dotGridConfig.characters);
        dot.textContent = character;
        
        // Apply font styling
        if (dotGridConfig.fontSize) {
            dot.style.fontSize = `${dotGridConfig.fontSize}px`;
        }
        if (dotGridConfig.fontFamily) {
            dot.style.fontFamily = dotGridConfig.fontFamily;
        }
        if (dotGridConfig.fontWeight) {
            dot.style.fontWeight = dotGridConfig.fontWeight;
        }
    }
}

// Calculate grid dimensions with seamless tiling
function createGrid() {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    
    // Calculate number of columns and rows to fill entire viewport with seams
    // Add 1 to ensure dots appear on both edges for seamless wrapping
    const cols = Math.ceil(containerWidth / dotSpacing) + 1;
    const rows = Math.ceil(containerHeight / dotSpacing) + 1;
    
    // Set grid template
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, ${dotSpacing}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${rows}, ${dotSpacing}px)`;
    
    // Clear existing dots
    gridContainer.innerHTML = '';
    dots = [];
    
    // Get current theme's dot grid configuration
    const theme = getThemeConfig(currentTheme);
    const dotGridConfig = theme.dotGrid;
    
    // Create dots starting from edge (0,0) for seamless tiling
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const dot = document.createElement('div');
            
            // Initialize dot content based on theme configuration
            initializeDotContent(dot, dotGridConfig);
            
            // Store original position - dots start at edges for seamed effect
            const originalX = col * dotSpacing;
            const originalY = row * dotSpacing;
            
            dots.push({
                element: dot,
                originalX,
                originalY,
                currentX: originalX,
                currentY: originalY
            });
            
            gridContainer.appendChild(dot);
        }
    }
}

// Update hazard positions (for moving hazards level)
function updateHazardPositions() {
    const config = getLevelConfig(currentLevel);

    // Only move hazards if this level has moving hazards
    if (!config.movingHazards || !gameStarted) return;

    hazards.forEach(hazard => {
        // Update position
        hazard.x += hazard.velocityX;
        hazard.y += hazard.velocityY;

        // Bounce off walls
        const margin = Math.max(40, hazard.size);
        if (hazard.x < margin || hazard.x > window.innerWidth - margin) {
            hazard.velocityX *= -1;
            hazard.x = Math.max(margin, Math.min(window.innerWidth - margin, hazard.x));
        }
        if (hazard.y < margin || hazard.y > window.innerHeight - margin) {
            hazard.velocityY *= -1;
            hazard.y = Math.max(margin, Math.min(window.innerHeight - margin, hazard.y));
        }

        // Update element position (subtract radius to account for center offset)
        hazard.element.style.left = `${hazard.x - hazard.size / 2}px`;
        hazard.element.style.top = `${hazard.y - hazard.size / 2}px`;
    });
}

// Check if cursor is near distorted area (for desktop interaction start)
function isNearDistortedArea() {
    if (!gameReady || !hasInteracted) {
        // Check if mouse is near any dot
        const theme = getThemeConfig(currentTheme);
        const behavior = theme.dotBehavior || { pushRadius: 150 };
        
        for (let dot of dots) {
            const dx = mouseX - dot.originalX;
            const dy = mouseY - dot.originalY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < behavior.pushRadius) {
                return true;
            }
        }
    }
    return hasInteracted;
}

// Update dot positions based on cursor
function updateDots() {
    // Get current theme's dot behavior configuration
    const theme = getThemeConfig(currentTheme);
    const behavior = theme.dotBehavior || {
        pushRadius: 150,
        maxPushDistance: 60,
        scaleRadius: 150,
        maxScale: 1.5,
        visibilityRadius: 250,
        fullVisibilityRadius: 100,
        dangerShakeAmount: 20,
        dangerShakeExponent: 1.5,
        dangerZone: 200
    };
    
    // Calculate distance to closest hazard for danger effect
    let closestHazardDistance = Infinity;
    hazards.forEach(hazard => {
        const dx = mouseX - hazard.x;
        const dy = mouseY - hazard.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < closestHazardDistance) {
            closestHazardDistance = distance;
        }
    });

    // Determine if in danger zone (using theme-specific dangerZone)
    const inDanger = closestHazardDistance < behavior.dangerZone;
    const dangerIntensity = inDanger ? (1 - closestHazardDistance / behavior.dangerZone) : 0;
    
    dots.forEach(dot => {
        const dx = mouseX - dot.originalX;
        const dy = mouseY - dot.originalY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate opacity based on distance from cursor (theme-specific visibility)
        let opacity = 0;
        if (distance < behavior.fullVisibilityRadius) {
            opacity = 1;
        } else if (distance < behavior.visibilityRadius) {
            // Smooth fade from full visibility to invisible
            opacity = 1 - ((distance - behavior.fullVisibilityRadius) / (behavior.visibilityRadius - behavior.fullVisibilityRadius));
        }
        
        dot.element.style.opacity = opacity;
        
        // Calculate scale based on distance from cursor (theme-specific scaling)
        let scale = 1;
        const scaleFalloffRadius = Math.max(
            behavior.scaleRadius || 0,
            behavior.visibilityRadius || 0
        );
        if (scaleFalloffRadius > 0) {
            const clampedDistance = Math.min(distance, scaleFalloffRadius);
            // Closer dots are bigger, farther dots shrink toward original size
            scale = 1 + ((1 - clampedDistance / scaleFalloffRadius) * (behavior.maxScale - 1));
        }
        
        if (distance < behavior.pushRadius) {
            // Calculate push amount (stronger when closer, theme-specific)
            let pushStrength = (1 - distance / behavior.pushRadius) * behavior.maxPushDistance;
            
            // Add danger effect: make dots shake/vibrate when near hazard
            if (inDanger) {
                // Exponential shake for more dramatic effect when very close (theme-specific)
                const hazardJitterBoost = behavior.hazardJitterBoost || 1.6;
                const shakeAmount = Math.pow(dangerIntensity, behavior.dangerShakeExponent)
                    * behavior.dangerShakeAmount
                    * hazardJitterBoost;
                const randomShakeX = (Math.random() - 0.5) * shakeAmount;
                const randomShakeY = (Math.random() - 0.5) * shakeAmount;
                const baseJitter = behavior.baseJitterAmount || 0;
                const baseJitterX = (Math.random() - 0.5) * baseJitter;
                const baseJitterY = (Math.random() - 0.5) * baseJitter;
                
                // Calculate direction away from cursor
                const angle = Math.atan2(dy, dx);
                const pushX = -Math.cos(angle) * pushStrength + randomShakeX + baseJitterX;
                const pushY = -Math.sin(angle) * pushStrength + randomShakeY + baseJitterY;
                
                dot.element.style.transform = `translate(${pushX}px, ${pushY}px) scale(${scale})`;
                
                // Add red tint to dots when in danger (more intense)
                const redIntensity = Math.floor(dangerIntensity * 220);
                const dotColor = getDotBaseColor(theme, currentBgColor);
                const dangerColor = `rgba(${Math.min(255, dotColor.r + 80)}, ${Math.max(0, dotColor.g - redIntensity)}, ${Math.max(0, dotColor.b - redIntensity)}, 0.6)`;
                
                // Apply color based on dot type
                if (dot.element.classList.contains('dot-text')) {
                    dot.element.style.color = dangerColor;
                } else {
                    dot.element.style.backgroundColor = dangerColor;
                }
            } else {
                // Normal push behavior
                const angle = Math.atan2(dy, dx);
                const baseJitter = inDanger ? (behavior.baseJitterAmount || 0) : 0;
                const baseJitterX = (Math.random() - 0.5) * baseJitter;
                const baseJitterY = (Math.random() - 0.5) * baseJitter;
                const pushX = -Math.cos(angle) * pushStrength + baseJitterX;
                const pushY = -Math.sin(angle) * pushStrength + baseJitterY;
                
                const dotColor = getDotBaseColor(theme, currentBgColor);
                const normalColor = `rgba(${dotColor.r}, ${dotColor.g}, ${dotColor.b}, 0.5)`;
                dot.element.style.transform = `translate(${pushX}px, ${pushY}px) scale(${scale})`;
                
                // Apply color based on dot type
                if (dot.element.classList.contains('dot-text')) {
                    dot.element.style.color = normalColor;
                } else {
                    dot.element.style.backgroundColor = normalColor;
                }
            }
        } else {
            // Return to original position with scale
            const dotColor = getDotBaseColor(theme, currentBgColor);
            const normalColor = `rgba(${dotColor.r}, ${dotColor.g}, ${dotColor.b}, 0.5)`;
            const baseJitter = inDanger ? (behavior.baseJitterAmount || 0) : 0;
            const baseJitterX = (Math.random() - 0.5) * baseJitter;
            const baseJitterY = (Math.random() - 0.5) * baseJitter;
            dot.element.style.transform = `translate(${baseJitterX}px, ${baseJitterY}px) scale(${scale})`;
            
            // Apply color based on dot type
            if (dot.element.classList.contains('dot-text')) {
                dot.element.style.color = normalColor;
            } else {
                dot.element.style.backgroundColor = normalColor;
            }
        }
    });
    
    // Update hazard positions if they're moving
    updateHazardPositions();
    
    requestAnimationFrame(updateDots);
}

// Find closest unrevealed target
function getClosestTargetDistance() {
    let minDistance = Infinity;
    let closestTarget = null;

    targets.forEach(target => {
        // Only consider unrevealed targets that haven't been hovered yet
        if (!target.revealed && !target.hasBeenHovered) {
            const dx = mouseX - target.x;
            const dy = mouseY - target.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                closestTarget = target;
            }
        }
    });

    // Track if we're currently hovering over a target
    if (closestTarget && minDistance < 50) {
        if (currentHoveredTarget !== closestTarget) {
            currentHoveredTarget = closestTarget;
        }
    } else if (currentHoveredTarget && minDistance >= 50) {
        // Mark target as hovered when player moves away
        currentHoveredTarget.hasBeenHovered = true;
        currentHoveredTarget = null;
    }

    return minDistance;
}

// Interpolate between colors
function interpolateColor(color1, color2, factor) {
    return {
        r: Math.round(color1.r + (color2.r - color1.r) * factor),
        g: Math.round(color1.g + (color2.g - color1.g) * factor),
        b: Math.round(color1.b + (color2.b - color1.b) * factor)
    };
}

// Update target counter
function updateTargetCounter() {
    const counterElement = document.getElementById('target-count');
    counterElement.textContent = totalTargets - targetsFound;
}

// Update hazard counter
function updateHazardCounter() {
    const counterElement = document.getElementById('hazard-count');
    const config = getLevelConfig(currentLevel);
    counterElement.textContent = config.hazards;
    
    // Hide hazard legend item if no hazards
    const hazardLegendItem = counterElement.closest('.legend-item');
    if (hazardLegendItem) {
        hazardLegendItem.style.display = config.hazards === 0 ? 'none' : 'flex';
    }
}

// Update theme icons in legend
function updateLegendIcons() {
    applyThemeAssetsToUi(currentLevel, currentTheme);
}

// Update custom cursor position
function updateCustomCursor() {
    if (!customCursorElement || !isTouchDevice) return;
    
    // Position the cursor indicator at the exact center of distortion
    // Using transform for precise centering at the distortion point
    customCursorElement.style.left = `${mouseX}px`;
    customCursorElement.style.top = `${mouseY}px`;
    customCursorElement.style.transform = 'translate(-50%, -50%)';
}

// Initialize custom cursor (simple circle, no asset needed)
function initCustomCursor() {
    customCursorElement = document.getElementById('custom-cursor');
}

function typeTitleText() {
    const titleEl = document.getElementById('start-title');
    if (!titleEl) return;

    const fullText = titleEl.textContent || '';
    const lockTitleSize = () => {
        const rect = titleEl.getBoundingClientRect();
        titleEl.style.minHeight = `${rect.height}px`;
        titleEl.style.minWidth = `${rect.width}px`;
        titleEl.style.display = 'inline-block';
    };

    const startTyping = () => {
        titleEl.textContent = '';
        titleEl.style.visibility = 'visible';
        let index = 0;

        const typeNext = () => {
            if (index <= fullText.length) {
                titleEl.textContent = fullText.slice(0, index);
                index += 1;
                setTimeout(typeNext, 80);
            }
        };

        typeNext();
    };

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            lockTitleSize();
            startTyping();
        });
    } else {
        lockTitleSize();
        startTyping();
    }
}

function typeInstructionText(text, callback, isHTML = false) {
    const instructionEl = document.getElementById('instruction-text');
    const overlayEl = document.getElementById('instruction-overlay');
    if (!instructionEl || !overlayEl) return;

    overlayEl.style.display = 'block';
    overlayEl.style.opacity = '1';
    overlayEl.classList.remove('dissolving');
    
    if (isHTML) {
        // For HTML content, type it out by revealing characters progressively
        instructionEl.innerHTML = '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const fullHTML = text;
        
        // Create a temporary element to parse the HTML structure
        let visibleText = '';
        let htmlBuffer = '';
        let insideTag = false;
        let index = 0;
        
        const typeNext = () => {
            if (index < fullHTML.length) {
                const char = fullHTML[index];
                
                if (char === '<') {
                    insideTag = true;
                    htmlBuffer = '<';
                } else if (char === '>' && insideTag) {
                    htmlBuffer += '>';
                    visibleText += htmlBuffer;
                    htmlBuffer = '';
                    insideTag = false;
                } else if (insideTag) {
                    htmlBuffer += char;
                } else {
                    visibleText += char;
                }
                
                instructionEl.innerHTML = visibleText;
                index++;
                setTimeout(typeNext, 25);
            } else {
                // After typing is complete, immediately start dissolve
                setTimeout(() => {
                    overlayEl.classList.add('dissolving');
                    setTimeout(() => {
                        overlayEl.style.display = 'none';
                        if (callback) {
                            callback();
                        }
                    }, 1000);
                }, 100); // Small delay after typing completes
            }
        };
        
        typeNext();
    } else {
        // Original text typing animation
        instructionEl.textContent = '';
        let index = 0;

        const typeNext = () => {
            if (index <= text.length) {
                instructionEl.textContent = text.slice(0, index);
                index += 1;
                setTimeout(typeNext, 25);
            } else {
                // After typing is complete, immediately start dissolve
                setTimeout(() => {
                    overlayEl.classList.add('dissolving');
                    // After dissolve animation completes, call callback
                    setTimeout(() => {
                        overlayEl.style.display = 'none';
                        if (callback) {
                            callback();
                        }
                    }, 1000); // Match the CSS transition duration
                }, 100); // Small delay after typing completes
            }
        };

        typeNext();
    }
}

function typeInstructionTextWithRules(mainText, rules, callback) {
    const instructionEl = document.getElementById('instruction-text');
    const overlayEl = document.getElementById('instruction-overlay');
    if (!instructionEl || !overlayEl) return;

    overlayEl.style.display = 'block';
    overlayEl.style.opacity = '1';
    overlayEl.classList.remove('dissolving');
    instructionEl.innerHTML = '';
    
    let index = 0;
    
    const typeNext = () => {
        if (index <= mainText.length) {
            instructionEl.textContent = mainText.slice(0, index);
            index += 1;
            setTimeout(typeNext, 25);
        } else {
            // After main text is typed, show all rules at once
            instructionEl.innerHTML = mainText + '<br>' + rules;
            
            // Wait 3 seconds then dissolve
            setTimeout(() => {
                overlayEl.classList.add('dissolving');
                setTimeout(() => {
                    overlayEl.style.display = 'none';
                    if (callback) {
                        callback();
                    }
                }, 1000);
            }, 3000);
        }
    };
    
    typeNext();
}

function showStartMessage(callback) {
    const instructionEl = document.getElementById('instruction-text');
    const overlayEl = document.getElementById('instruction-overlay');
    if (!instructionEl || !overlayEl) return;

    overlayEl.style.display = 'block';
    overlayEl.style.opacity = '1';
    overlayEl.classList.remove('dissolving');
    instructionEl.textContent = 'Start!';

    // Wait a moment, then dissolve
    setTimeout(() => {
        overlayEl.classList.add('dissolving');
        setTimeout(() => {
            overlayEl.style.display = 'none';
            if (callback) {
                callback();
            }
        }, 1000); // Match the CSS transition duration
    }, 800); // Show "Start!" for 800ms
}

function hideInstructionText() {
    const overlayEl = document.getElementById('instruction-overlay');
    if (overlayEl) {
        overlayEl.classList.add('dissolving');
        setTimeout(() => {
            overlayEl.style.display = 'none';
        }, 1000);
    }
}

function createClassicFloatingShapes() {
    const layer = document.getElementById('classic-shapes-layer');
    if (!layer) return;

    layer.innerHTML = '';
    const shapes = ['▲', '◆', '•', '✦', '★', '◊'];
    const count = 192;

    for (let i = 0; i < count; i++) {
        const shape = document.createElement('div');
        shape.className = 'classic-shape';
        shape.textContent = shapes[Math.floor(Math.random() * shapes.length)];

        const size = Math.floor(Math.random() * 26) + 10;
        const left = Math.random() * 100;
        const duration = Math.random() * 10 + 6;
        const delay = Math.random() * 6;
        const drift = (Math.random() - 0.5) * 40;

        shape.style.fontSize = `${size}px`;
        shape.style.left = `${left}%`;
        shape.style.animationDuration = `${duration}s`;
        shape.style.animationDelay = `${delay}s`;
        shape.style.transform = `translateX(${drift}px)`;

        layer.appendChild(shape);
    }
}

// Get dot color based on background color (lighter version for contrast)
function getDotColor(bgColor) {
    // Make dots lighter than background for visibility
    const lightnessBoost = 120;
    return {
        r: Math.min(255, bgColor.r + lightnessBoost),
        g: Math.min(255, bgColor.g + lightnessBoost),
        b: Math.min(255, bgColor.b + lightnessBoost)
    };
}

function getDotBaseColor(theme, bgColor) {
    if (theme.dotGrid?.colorSource === 'custom' && theme.dotGrid.color) {
        return { ...theme.dotGrid.color };
    }
    if (theme.dotGrid?.colorSource === 'hazard') {
        return { ...theme.colors.hazardColor };
    }
    return getDotColor(bgColor);
}

// Current background color (tracked globally)
let currentBgColor = { ...baseColor };

// Update background based on proximity to targets and hazards
function updateBackground() {
    const targetDistance = getClosestTargetDistance();

    // Calculate distance to closest hazard
    let hazardDistance = Infinity;
    hazards.forEach(hazard => {
        const dx = mouseX - hazard.x;
        const dy = mouseY - hazard.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < hazardDistance) {
            hazardDistance = distance;
        }
    });

    // Start with base color
    let finalColor = { ...baseColor };
    
    // Calculate target influence (closer = more target color)
    if (targetDistance < maxTargetDistance) {
        const targetFactor = 1 - (targetDistance / maxTargetDistance); // 0 = far, 1 = close
        finalColor = interpolateColor(baseColor, targetColor, targetFactor);
    }
    
    // Calculate hazard influence (closer = more hazard color)
    if (hazardDistance < maxHazardDistance) {
        const hazardFactor = 1 - (hazardDistance / maxHazardDistance); // 0 = far, 1 = close
        finalColor = interpolateColor(finalColor, hazardColor, hazardFactor);
    }
    
    // Store current background color for dot color calculations
    currentBgColor = finalColor;
    
    // Create smooth gradient around the final color
    const color1 = finalColor;
    const color2 = {
        r: Math.max(0, finalColor.r - 20),
        g: Math.max(0, finalColor.g - 20),
        b: Math.max(0, finalColor.b - 20)
    };
    
    // Create gradient
    const normalizedX = mouseX / window.innerWidth;
    const angle = normalizedX * 360;
    
    const color1Str = `rgb(${color1.r}, ${color1.g}, ${color1.b})`;
    const color2Str = `rgb(${color2.r}, ${color2.g}, ${color2.b})`;
    
    document.body.style.background = `linear-gradient(${angle}deg, ${color1Str} 0%, ${color2Str} 100%)`;
}

// Show +1 animation
function showPlusOne(x, y, color = '#FFD700') {
    const plusOne = document.createElement('div');
    plusOne.className = 'plus-one';
    plusOne.textContent = '+1';
    plusOne.style.left = `${x}px`;
    plusOne.style.top = `${y - 30}px`; // Position above the target
    plusOne.style.color = color;
    
    document.body.appendChild(plusOne);
    
    // Remove element after animation completes
    setTimeout(() => {
        plusOne.remove();
    }, 1000);
}

// Check if player touched any hazard
function checkHazardCollision() {
    hazards.forEach(hazard => {
        const dx = mouseX - hazard.x;
        const dy = mouseY - hazard.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Game over if within 40px of hazard
        if (distance < 40) {
            gameOver();
        }
    });
}

// Game over function
function gameOver() {
    gameStarted = false;
    gameReady = false; // Reset ready state to allow button clicks
    // Keep game-started class to hide landing elements during modal
    // document.body.classList.remove('game-started');
    updatePerformanceModeState();
    
    // Reveal all hazards
    hazards.forEach(hazard => {
        hazard.element.classList.add('revealed');
    });
    
    // Reveal all targets (both found and unfound)
    targets.forEach(target => {
        target.element.classList.add('revealed');
        target.revealed = true;
    });
    
    // Create game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    const theme = getThemeConfig(currentTheme);
    gameOverScreen.innerHTML = `
        <h1>${theme.copy.gameOverTitle}</h1>
        <div class="score-actions-row">
            <button id="save-score-button">${theme.copy.saveScoreCta}</button>
            <button id="restart-button">${theme.copy.playAgainCta}</button>
        </div>
    `;
    document.body.appendChild(gameOverScreen);
    
    // Add restart functionality
    document.getElementById('restart-button').addEventListener('click', () => {
        location.reload();
    });

    const saveButton = document.getElementById('save-score-button');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            showScoreForm(gameOverScreen);
        });
    }
}

// Level complete function
function levelComplete() {
    levelsCompleted += 1;
    gameStarted = false;
    gameReady = false; // Reset ready state to allow button clicks
    // Keep game-started class to hide landing elements during modal
    // document.body.classList.remove('game-started');
    updatePerformanceModeState();
    
    // Reveal all hazards
    hazards.forEach(hazard => {
        hazard.element.classList.add('revealed');
    });
    
    // Reveal any unfound targets (should all be found, but just in case)
    targets.forEach(target => {
        target.element.classList.add('revealed');
        target.revealed = true;
    });
    
    // Set background to the start screen gradient when level is complete
    document.body.style.background = `linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)`;
    
    const theme = getThemeConfig(currentTheme);
    
    // Create level complete screen
    const levelCompleteScreen = document.createElement('div');
    levelCompleteScreen.id = 'level-complete-screen';
    
    // Always show next level option - infinite levels!
    levelCompleteScreen.innerHTML = `
        <h1>Treasure found</h1>
        <div class="score-actions-row">
            <button id="next-level-button">${theme.copy.nextLevelCta}</button>
        </div>
    `;
    
    document.body.appendChild(levelCompleteScreen);
    
    // Add next level functionality
    const nextButton = document.getElementById('next-level-button');
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            levelCompleteScreen.remove();
            document.body.classList.add('game-started');
            currentLevel++;
            gameReady = false; // Reset ready state
            hasInteracted = false; // Reset interaction state
            startLevel();
        });
    }
}

// Check if mouse is over any target
function checkTargetReveal() {
    targets.forEach(target => {
        const dx = mouseX - target.x;
        const dy = mouseY - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Reveal if mouse is within 50px of target center (larger bounding box)
        if (distance < 50 && !target.revealed) {
            target.element.classList.add('revealed');
            target.revealed = true;
            targetsFound++;
            totalTargetsCollected++;
            updateTargetCounter();

            // Extract gem color from the SVG path element
            let gemColor = '#FFD700'; // Default color
            const svgElement = target.element.querySelector('svg');
            if (svgElement) {
                const pathElement = svgElement.querySelector('path');
                if (pathElement) {
                    gemColor = pathElement.getAttribute('fill') || '#FFD700';
                }
            }

            // Show +1 animation above the target with gem's color
            showPlusOne(target.x, target.y, gemColor);

            // Update background immediately to remove target color from this target
            updateBackground();

            // Check if all targets found
            if (targetsFound >= totalTargets) {
                setTimeout(() => {
                    levelComplete();
                }, 500);
            }
        }
    });
}

// Start a level
function startLevel() {
    gameReady = false; // Will be set to true after instruction sequence
    gameStarted = false; // Will be set to true when user moves
    hasInteracted = false;
    document.body.classList.add('game-started');
    targetsFound = 0;
    updatePerformanceModeState();
    
    // Reset background to base color at the start of each level
    const color1 = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
    const color2 = `rgb(${Math.max(0, baseColor.r - 20)}, ${Math.max(0, baseColor.g - 20)}, ${Math.max(0, baseColor.b - 20)})`;
    document.body.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
    currentBgColor = { ...baseColor };
    
    // Show game UI
    document.getElementById('game-legend').style.display = 'flex';
    document.getElementById('level-indicator').style.display = 'block';
    
    // Update level display
    updateLevelDisplay();
    
    // Clear existing game elements with proper animation cleanup
    targets.forEach(target => {
        clearAnimationForElement(target.element);
        target.element.remove();
    });
    hazards.forEach(hazard => {
        clearAnimationForElement(hazard.element);
        hazard.element.remove();
    });
    
    // Initialize level
    createGrid();
    createHazards();
    createTargets();
    updateHazardCounter();
    updateTargetCounter();
    updateLegendIcons();
    applyThemeAssetsToUi(currentLevel, currentTheme);
    
    // Initialize custom cursor for touch devices
    initCustomCursor();
    
    // Show instruction text based on level
    if (currentLevel === 1) {
        const message = 'Find all the Treasure!\n<span style="color: #FF5C34;">Red</span> = treasure is near';
        typeInstructionText(message, () => {
            // After rules dissolve, show "Start!" then enable game
            showStartMessage(() => {
                gameReady = true; // Now ready for interaction
            });
        }, true);
    } else if (currentLevel === 2) {
        const message = 'Find all the Treasure!\n<span style="color: #FF5C34;">Red</span> = treasure is near\n<span style="color: #351E28;">Dark</span> = danger is near';
        typeInstructionText(message, () => {
            // After rules dissolve, show "Start!" then enable game
            showStartMessage(() => {
                gameReady = true; // Now ready for interaction
            });
        }, true);
    } else {
        // Level 3+: No instruction text, game ready immediately
        hideInstructionText();
        gameReady = true;
    }
}

// Actually start the game (called when user moves)
function beginGame() {
    if (!gameReady || gameStarted || hasInteracted) return;
    
    hasInteracted = true;
    gameStarted = true;
    // Keep instruction text visible
}

// Start game with selected level
function startGame(selectedLevel = 1) {
    const startScreen = document.getElementById('start-screen');
    startScreen.style.display = 'none';
    document.body.classList.add('game-started');

    // From this point on we're no longer showing the start screen, so it's safe
    // to apply the theme background without overriding the CSS start-screen look.
    updateStartScreenBackground(getThemeConfig(currentTheme));
    
    totalTargetsCollected = 0;
    levelsCompleted = 0;
    scoreSubmitted = false;
    currentLevel = selectedLevel;
    updatePerformanceModeState();
    startLevel();
    
    // Start the dot animation loop
    updateDots();
}

// Update level display
function updateLevelDisplay() {
    const levelDisplay = document.getElementById('level-display');
    if (levelDisplay) {
        levelDisplay.textContent = `Level ${currentLevel}`;
    }
}

// Track mouse movement
document.addEventListener('mousemove', (e) => {
    const prevX = mouseX;
    const prevY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Update custom cursor position (for consistency)
    updateCustomCursor();
    
    // For desktop: check if user has touched distorted area to begin
    if (gameReady && !hasInteracted && !isTouchDevice) {
        // Check if cursor moved into a distorted area
        const moved = Math.abs(mouseX - prevX) > 2 || Math.abs(mouseY - prevY) > 2;
        if (moved && isNearDistortedArea()) {
            beginGame();
        }
    }
    
    if (!gameStarted) return;
    updateBackground();
    checkTargetReveal();
    checkHazardCollision();
});

// Track mouse down/up for dragging
document.addEventListener('mousedown', () => {
    isDragging = true;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// Touch support for mobile devices
document.addEventListener('touchstart', (e) => {
    // Mark as touch device and add class
    if (!isTouchDevice) {
        isTouchDevice = true;
        document.body.classList.add('touch-device');
    }
    
    // Only prevent default during active gameplay to allow button clicks on UI screens
    if (gameStarted || gameReady) {
        e.preventDefault();
        isDragging = true;
        
        // Get the first touch point
        const touch = e.touches[0];
        mouseX = touch.clientX;
        mouseY = touch.clientY;
        
        // Update custom cursor position
        updateCustomCursor();
        
        // Begin game on first touch if ready
        if (gameReady && !hasInteracted) {
            beginGame();
        }
        
        // Update game state
        if (gameStarted) {
            updateBackground();
            checkTargetReveal();
            checkHazardCollision();
        }
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    // Mark as touch device and add class
    if (!isTouchDevice) {
        isTouchDevice = true;
        document.body.classList.add('touch-device');
    }
    
    // Only prevent default and handle dragging during active gameplay
    if (gameStarted || gameReady) {
        e.preventDefault();
        
        // Get the first touch point
        const touch = e.touches[0];
        mouseX = touch.clientX;
        mouseY = touch.clientY;
        
        // Update custom cursor position
        updateCustomCursor();
        
        // Begin game on first touch move if ready
        if (gameReady && !hasInteracted) {
            beginGame();
        }
        
        // Update game state
        if (gameStarted) {
            updateBackground();
            checkTargetReveal();
            checkHazardCollision();
        }
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    // Only prevent default during active gameplay
    if (gameStarted || gameReady) {
        e.preventDefault();
        isDragging = false;
    }
}, { passive: false });

// Function to update background gradient based on theme
function updateStartScreenBackground(theme) {
    const color = theme.colors.baseColor;
    // Create a gradient with the base color
    const color1 = `rgb(${color.r}, ${color.g}, ${color.b})`;
    const color2 = `rgb(${Math.min(255, color.r + 40)}, ${Math.min(255, color.g + 40)}, ${Math.min(255, color.b + 40)})`;
    document.body.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
}

// Theme selection buttons
// Removed: theme + level selection UI listeners (those controls are no longer in `index.html`).

// Start button (defaults to classic theme, level 1)
const startButton = document.getElementById('start-button');
if (startButton) {
    startButton.addEventListener('click', () => {
        currentTheme = 'classic';
        const theme = getThemeConfig('classic');
        baseColor = { ...theme.colors.baseColor };
        targetColor = { ...theme.colors.targetColor };
        hazardColor = { ...theme.colors.hazardColor };
        startGame(1);
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    if (!gameStarted) return;
    
    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
    createGrid();
    // Remove old targets and hazards with proper animation cleanup, create new ones
    targets.forEach(target => {
        clearAnimationForElement(target.element);
        target.element.remove();
    });
    hazards.forEach(hazard => {
        clearAnimationForElement(hazard.element);
        hazard.element.remove();
    });
    createHazards();
    createTargets();
    updateLegendIcons();
});

// Initialize with classic theme selected by default
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.remove('game-started');
    updatePerformanceModeState();
    const theme = getThemeConfig('classic');
    baseColor = { ...theme.colors.baseColor };
    targetColor = { ...theme.colors.targetColor };
    hazardColor = { ...theme.colors.hazardColor };
    updateStartScreenCopy(theme);
    applyThemeAssetsToUi(1, 'classic');

    typeTitleText();
    createClassicFloatingShapes();
    loadVersion();
});

// Load and display version number
async function loadVersion() {
    try {
        const response = await fetch('version.json');
        const data = await response.json();
        const versionElement = document.getElementById('version-number');
        if (versionElement && data.version) {
            versionElement.textContent = `v${data.version}`;
        }
    } catch (error) {
        console.error('Failed to load version:', error);
    }
}

// Initialize (game starts when button is clicked)
