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
let currentHoveredTarget = null; // Track which target is currently hovered
let hazards = []; // Array of hazard enemies
let currentLevel = 1; // Track current level
let totalTargets = 3; // Total targets for current level
let activeLevelAssetOverrides = null; // Randomized assets for the current level
const lastRandomizedAssetsByTheme = new Map(); // Prevent immediate repeats per theme
let totalTargetsCollected = 0;
let levelsCompleted = 0;
let scoreSubmitted = false;

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
            cursor: { src: 'assets/cursor-eye.svg', size: 32 },
            target: { src: 'assets/target-diamond.webp', size: 40 },
            hazard: { src: 'assets/hazard-skull.webp', size: 40 },
            targetOptions: [
                { src: 'assets/target-black-gem.webp', size: 40 },
                { src: 'assets/target-diamond.webp', size: 40 },
                { src: 'assets/target-red-gem.webp', size: 40 },
                { src: 'assets/target-red-oval-gem.webp', size: 40 }
            ],
            hazardOptions: [
                { src: 'assets/hazard-skull.webp', size: 40 }
            ]
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
            levelCompleteTitle: 'Level {level} Complete!',
            levelCompleteMessage: 'All targets found!',
            nextLevelCta: 'Next Level',
            restartCta: 'Restart Game',
            playAgainCta: 'Play Again',
            saveScoreCta: 'Save Score',
            finishRunCta: 'Finish Run'
        },
        levelOverrides: {
            2: { target: { src: 'assets/target-crown.svg' } },
            3: { target: { src: 'assets/target-trophy.svg' } }
        },
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
    },
    severance: {
        name: 'Severance',
        colors: {
            baseColor: { r: 0, g: 139, b: 146 },      // #008B92
            targetColor: { r: 226, g: 250, b: 251 },  // #E2FAFB
            hazardColor: { r: 7, g: 48, b: 75 }       // #07304B
        },
        assets: {
            cursor: { src: 'assets/cursor-eye.svg', size: 32 },
            target: { src: 'assets/target-gem.webp', size: 40 },
            hazard: { src: 'assets/hazard-skull.webp', size: 40 }
        },
        copy: {
            gameTitle: 'Severance Hunt',
            themePrompt: 'Select a theme:',
            levelPrompt: 'Select a level to start:',
            levelButtonTemplate: 'Level {level}',
            levelButtonSubtext: '{hazards} Hazards, {targets} Targets',
            legendTargetLabel: 'Targets',
            legendHazardLabel: 'Hazards',
            gameOverTitle: 'Game Over!',
            gameOverMessage: 'You were caught by a hazard!',
            levelCompleteTitle: 'Level {level} Complete!',
            levelCompleteMessage: 'All targets found!',
            nextLevelCta: 'Next Level',
            restartCta: 'Restart Game',
            playAgainCta: 'Play Again',
            saveScoreCta: 'Save Score',
            finishRunCta: 'Finish Run'
        },
        levelOverrides: {},
        dotGrid: {
            type: 'mixed',
            characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            fontSize: 14,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            colorSource: 'hazard'
        },
        dotBehavior: {
            pushRadius: 150,           // Match classic distortion
            maxPushDistance: 60,
            scaleRadius: 150,
            maxScale: 1.5,
            visibilityRadius: 250,
            fullVisibilityRadius: 100,
            baseJitterAmount: 2.5,     // Always jitter slightly
            dangerShakeAmount: 20,
            dangerShakeExponent: 1.5,
            dangerZone: 200
        }
    },
    forest: {
        name: 'Firefly Forest',
        colors: {
            baseColor: { r: 52, g: 97, b: 69 },       // #346145
            targetColor: { r: 255, g: 185, b: 80 },   // #FFB950
            hazardColor: { r: 50, g: 33, b: 22 }      // #322116
        },
        assets: {
            cursor: { src: 'assets/cursor-eye.svg', size: 32 },
            target: { src: 'assets/target-gem.webp', size: 40 },
            hazard: { src: 'assets/hazard-skull.webp', size: 40 }
        },
        copy: {
            gameTitle: 'Firefly Forest',
            themePrompt: 'Select a theme:',
            levelPrompt: 'Select a level to start:',
            levelButtonTemplate: 'Level {level}',
            levelButtonSubtext: '{hazards} Hazards, {targets} Targets',
            legendTargetLabel: 'Targets',
            legendHazardLabel: 'Hazards',
            gameOverTitle: 'Game Over!',
            gameOverMessage: 'You were caught by a hazard!',
            levelCompleteTitle: 'Level {level} Complete!',
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
            fontSize: 10,
            fontFamily: 'Arial, sans-serif'
        },
        dotBehavior: {
            pushRadius: 200,           // Larger, gentle flowing influence
            maxPushDistance: 40,       // Subtle, organic movements
            scaleRadius: 180,          // Gradual scaling
            maxScale: 1.3,             // Gentle size changes
            visibilityRadius: 280,     // Soft, wide visibility
            fullVisibilityRadius: 120, // Gentle fade-in
            dangerShakeAmount: 10,     // Gentle rustling effect
            dangerShakeExponent: 1.2,  // Smooth, natural movements
            dangerZone: 200            // Same danger zone
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

function resolveAsset(baseAsset, overrideAsset = {}) {
    return { ...baseAsset, ...overrideAsset };
}

function normalizeAssetOption(option) {
    if (!option) return null;
    if (typeof option === 'string') return { src: option };
    return option;
}

function pickRandomAssetOption(options = []) {
    if (!options.length) return null;
    const choice = options[Math.floor(Math.random() * options.length)];
    return normalizeAssetOption(choice);
}

function pickRandomAssetOptionWithGap(options = [], lastSrc) {
    if (!options.length) return null;
    if (options.length === 1) return normalizeAssetOption(options[0]);

    const filtered = options.filter(option => normalizeAssetOption(option)?.src !== lastSrc);
    const pool = filtered.length ? filtered : options;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    return normalizeAssetOption(choice);
}

function setActiveLevelAssetOverrides(themeId = currentTheme) {
    const theme = getThemeConfig(themeId);
    const lastRandomized = lastRandomizedAssetsByTheme.get(themeId) || {};
    const randomizedTarget = pickRandomAssetOptionWithGap(
        theme.assets?.targetOptions,
        lastRandomized.targetSrc
    );
    const randomizedHazard = pickRandomAssetOption(theme.assets?.hazardOptions);
    activeLevelAssetOverrides = {
        ...(randomizedTarget ? { target: randomizedTarget } : {}),
        ...(randomizedHazard ? { hazard: randomizedHazard } : {})
    };
    if (randomizedTarget?.src) {
        lastRandomizedAssetsByTheme.set(themeId, {
            ...lastRandomized,
            targetSrc: randomizedTarget.src
        });
    }
}

// Animation instance management for all types
const animationInstances = new Map();
const svgCache = new Map(); // Cache for loaded SVG content

// Performance optimization: Track visibility and pause off-screen animations
let visibilityObserver = null;

// Initialize Intersection Observer for performance optimization
function initVisibilityObserver() {
    if (visibilityObserver) return;
    
    const options = {
        root: null,
        rootMargin: '50px', // Start loading slightly before element is visible
        threshold: 0
    };

    visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const animation = animationInstances.get(entry.target);
            if (!animation) return;

            if (entry.isIntersecting) {
                // Element is visible, resume animation
                if (animation.play) {
                    animation.play(); // Lottie
                } else if (animation.start) {
                    animation.start(); // SpriteAnimation
                }
            } else {
                // Element is off-screen, pause animation
                if (animation.pause) {
                    animation.pause(); // Both Lottie and SpriteAnimation
                }
            }
        });
    }, options);
}

// Call this during game initialization
initVisibilityObserver();

// Sprite sheet animation manager
class SpriteAnimation {
    constructor(element, asset) {
        this.element = element;
        this.asset = asset;
        this.isPlaying = false;
        this.currentFrame = 0;
        this.animationFrame = null;
        this.lastFrameTime = 0;
    }

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }

    animate() {
        if (!this.isPlaying) return;

        const now = performance.now();
        const frameDuration = this.asset.frameDuration || 100;

        if (now - this.lastFrameTime >= frameDuration) {
            this.currentFrame = (this.currentFrame + 1) % this.asset.frames;
            const frameWidth = this.asset.size || 40;
            const xPos = -this.currentFrame * frameWidth;
            this.element.style.backgroundPosition = `${xPos}px 0`;
            this.lastFrameTime = now;
        }

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    pause() {
        this.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    destroy() {
        this.pause();
        this.element = null;
    }
}

// Clear all animation instances for an element
function clearAnimationForElement(element) {
    const existing = animationInstances.get(element);
    if (existing) {
        // Handle different animation types
        if (existing.destroy) {
            existing.destroy(); // Lottie or SpriteAnimation
        }
        animationInstances.delete(element);
    }
    
    // Stop observing for visibility
    if (visibilityObserver && element) {
        visibilityObserver.unobserve(element);
    }
}

// Load and inject animated SVG content
async function loadAnimatedSVG(element, asset) {
    try {
        // Check cache first
        let svgContent = svgCache.get(asset.src);
        
        if (!svgContent) {
            const response = await fetch(asset.src);
            if (!response.ok) {
                throw new Error(`Failed to load SVG: ${response.statusText}`);
            }
            svgContent = await response.text();
            svgCache.set(asset.src, svgContent);
        }

        // Inject SVG content
        element.innerHTML = svgContent;
        
        // Find the SVG element and ensure it fills the container
        const svgElement = element.querySelector('svg');
        if (svgElement) {
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
            svgElement.style.display = 'block';
        }

        return true;
    } catch (error) {
        console.error('Error loading animated SVG:', error);
        return false;
    }
}

// Enhanced asset application function supporting multiple formats
async function applyAssetToElement(element, asset) {
    if (!element || !asset || !asset.src) return;
    
    const size = asset.size || 40;
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;

    // Clear any existing animations
    clearAnimationForElement(element);
    element.style.backgroundImage = '';
    element.innerHTML = '';

    // Detect asset type (auto-detect if not specified)
    let assetType = asset.type;
    if (!assetType) {
        if (asset.src.endsWith('.json')) {
            assetType = 'lottie';
        } else if (asset.src.endsWith('.svg')) {
            assetType = 'svg';
        } else if (asset.src.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
            assetType = asset.frames ? 'sprite' : 'image';
        }
    }

    // Handle different asset types
    switch (assetType) {
        case 'lottie':
            if (window.lottie) {
                const animation = window.lottie.loadAnimation({
                    container: element,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: asset.src
                });
                animationInstances.set(element, animation);
                
                // Observe for visibility optimization
                if (visibilityObserver) {
                    visibilityObserver.observe(element);
                }
            } else {
                console.warn('Lottie library not loaded');
            }
            break;

        case 'animated-svg':
            await loadAnimatedSVG(element, asset);
            // SVG animations are typically lightweight, no need to pause
            break;

        case 'sprite':
            if (!asset.frames) {
                console.error('Sprite asset missing frames property');
                return;
            }
            // Set up sprite sheet background
            element.style.backgroundImage = `url(${asset.src})`;
            element.style.backgroundSize = `${asset.frames * 100}% 100%`;
            element.style.backgroundRepeat = 'no-repeat';
            element.style.backgroundPosition = '0 0';
            
            // Create and start sprite animation
            const spriteAnim = new SpriteAnimation(element, asset);
            spriteAnim.start();
            animationInstances.set(element, spriteAnim);
            
            // Observe for visibility optimization
            if (visibilityObserver) {
                visibilityObserver.observe(element);
            }
            break;

        case 'svg':
        case 'image':
        default:
            // Static image or SVG
            element.style.backgroundImage = `url(${asset.src})`;
            element.style.backgroundSize = 'contain';
            element.style.backgroundRepeat = 'no-repeat';
            element.style.backgroundPosition = 'center';
            break;
    }
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

    const payload = {
        nickname,
        totalTargets: totalTargetsCollected,
        levelsCompleted,
        createdAt: Date.now()
    };

    try {
        await db.transact(
            db.tx.leaderboard_entries[id()].update(payload)
        );
        scoreSubmitted = true;
        return { ok: true };
    } catch (error) {
        return { ok: false, error: 'Could not save score. Please try again.' };
    }
}

function openScoreModal({ title, description }) {
    const overlay = document.createElement('div');
    overlay.className = 'score-modal-overlay';
    overlay.innerHTML = `
        <div class="score-modal-card" role="dialog" aria-modal="true">
            <h2>${title}</h2>
            <p>${description}</p>
            <form class="score-form">
                <label class="score-label" for="score-nickname-input">Nickname</label>
                <input id="score-nickname-input" class="score-input" type="text" maxlength="20" placeholder="Your name" />
                <div class="score-error" aria-live="polite"></div>
                <div class="score-actions">
                    <button type="button" class="score-cancel">Cancel</button>
                    <button type="submit" class="score-submit">Save</button>
                </div>
            </form>
        </div>
    `;

    const input = overlay.querySelector('#score-nickname-input');
    const errorEl = overlay.querySelector('.score-error');
    const cancelBtn = overlay.querySelector('.score-cancel');
    const submitBtn = overlay.querySelector('.score-submit');
    const form = overlay.querySelector('.score-form');

    const closeModal = () => {
        overlay.remove();
        document.removeEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (event) => {
        if (event.key === 'Escape') {
            closeModal();
        }
    };

    if (!hasInstantDb) {
        errorEl.textContent = 'Leaderboard setup missing. Add your InstantDB app ID first.';
        submitBtn.disabled = true;
    } else if (scoreSubmitted) {
        errorEl.textContent = 'Score already saved for this run.';
        submitBtn.disabled = true;
    }

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const nickname = normalizeNickname(input.value || '');
        if (!nickname) {
            errorEl.textContent = 'Please enter a nickname.';
            return;
        }
        if (nickname.length < 2) {
            errorEl.textContent = 'Nickname must be at least 2 characters.';
            return;
        }
        if (nickname.length > 20) {
            errorEl.textContent = 'Nickname must be 20 characters or fewer.';
            return;
        }

        submitBtn.disabled = true;
        cancelBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        errorEl.textContent = '';

        const result = await submitLeaderboardEntry(nickname);
        if (!result.ok) {
            submitBtn.disabled = false;
            cancelBtn.disabled = false;
            submitBtn.textContent = 'Save';
            errorEl.textContent = result.error;
            return;
        }

        submitBtn.textContent = 'Saved!';
        setTimeout(() => {
            window.location.href = 'leaderboard.html';
        }, 400);
    });

    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKeyDown);
    if (input) {
        input.focus();
    }
}

function updateStartScreenCopy(theme) {
    const titleEl = document.getElementById('start-title');
    const themePromptEl = document.getElementById('theme-prompt');
    const levelPromptEl = document.getElementById('level-prompt');
    if (titleEl) titleEl.textContent = theme.copy.gameTitle;
    if (themePromptEl) themePromptEl.textContent = theme.copy.themePrompt;
    if (levelPromptEl) levelPromptEl.textContent = theme.copy.levelPrompt;
}

function updateLevelSelectionCopy(themeId) {
    const theme = getThemeConfig(themeId);
    document.querySelectorAll('.level-button').forEach(button => {
        const level = parseInt(button.getAttribute('data-level'), 10);
        const config = getLevelConfig(level, themeId);
        const labelEl = button.querySelector('.level-label');
        const subtextEl = button.querySelector('.level-subtext');
        if (labelEl) {
            labelEl.textContent = formatTemplate(theme.copy.levelButtonTemplate, { level });
        }
        if (subtextEl) {
            subtextEl.textContent = formatTemplate(theme.copy.levelButtonSubtext, {
                hazards: config.hazards,
                targets: config.targets
            });
        }
    });
}

function updateLegendLabels(themeId) {
    const theme = getThemeConfig(themeId);
    const targetLabel = document.getElementById('target-label');
    const hazardLabel = document.getElementById('hazard-label');
    if (targetLabel) targetLabel.textContent = theme.copy.legendTargetLabel;
    if (hazardLabel) hazardLabel.textContent = theme.copy.legendHazardLabel;
}

function applyThemeAssetsToUi(level, themeId) {
    const config = getLevelConfig(level, themeId);
    applyAssetToElement(document.getElementById('custom-cursor'), config.assets.cursor);
    applyAssetToElement(document.getElementById('target-legend-icon'), config.assets.target);
    applyAssetToElement(document.getElementById('hazard-legend-icon'), config.assets.hazard);
    applyAssetToElement(document.getElementById('target-indicator-icon'), config.assets.target);
    applyAssetToElement(document.getElementById('hazard-indicator-icon'), config.assets.hazard);
}

// Get level configuration - dynamically generated for infinite levels
function getLevelConfig(level, themeId = currentTheme) {
    const theme = getThemeConfig(themeId);
    const levelOverride = (theme.levelOverrides && theme.levelOverrides[level]) ? theme.levelOverrides[level] : {};
    const runtimeOverride = (themeId === currentTheme && activeLevelAssetOverrides) ? activeLevelAssetOverrides : {};
    const mergedTargetOverride = { ...levelOverride.target, ...runtimeOverride.target };

    // Calculate progressive difficulty
    // Hazards: starts at 1, increases by 1 every level (capped at 8 for reasonable difficulty)
    const hazardsCount = Math.min(level, 8);

    // Targets: starts at 3, increases by 2 each level
    const targetsCount = 3 + ((level - 1) * 2);

    return {
        hazards: hazardsCount,
        targets: targetsCount,
        assets: {
            cursor: resolveAsset(theme.assets.cursor, levelOverride.cursor),
            target: resolveAsset(theme.assets.target, mergedTargetOverride),
            hazard: resolveAsset(theme.assets.hazard, levelOverride.hazard)
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

        // Random position, ensuring spacing from other hazards and cursor
        let x, y, tooClose, tooCloseToCursor;
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
        } while (tooClose || tooCloseToCursor);

        hazardEl.style.left = `${x - hazardRadius}px`;
        hazardEl.style.top = `${y - hazardRadius}px`;

        document.body.appendChild(hazardEl);

        // Random velocity for moving hazards
        const speed = 0.5; // Slow speed
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
        applyAssetToElement(targetEl, targetAsset);

        // Random position, ensuring spacing from hazards and cursor
        let x, y, tooCloseToEnemy, tooCloseToCursor;
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
        } while (tooCloseToEnemy || tooCloseToCursor);

        targetEl.style.left = `${x - targetRadius}px`;
        targetEl.style.top = `${y - targetRadius}px`;

        document.body.appendChild(targetEl);

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
}

// Update theme icons in legend and indicators
function updateLegendIcons() {
    applyThemeAssetsToUi(currentLevel, currentTheme);
}

// Update cursor indicators
function updateCursorIndicators(targetDistance, hazardDistance) {
    const cursorIndicators = document.getElementById('cursor-indicators');
    const targetFill = document.getElementById('target-fill');
    const hazardFill = document.getElementById('hazard-fill');
    
    // Position next to cursor
    const offset = 25;
    cursorIndicators.style.left = `${mouseX + offset}px`;
    cursorIndicators.style.top = `${mouseY}px`;
    cursorIndicators.style.opacity = '1';
    
    // Calculate fill percentages (closer = more filled)
    // Max distance for full bar effect
    const maxTargetBar = 400;
    const maxHazardBar = 300;

    const targetPercent = Math.max(0, Math.min(100, (1 - targetDistance / maxTargetBar) * 100));
    const hazardPercent = Math.max(0, Math.min(100, (1 - hazardDistance / maxHazardBar) * 100));

    targetFill.style.width = `${targetPercent}%`;
    hazardFill.style.width = `${hazardPercent}%`;
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

    // Update cursor indicators
    updateCursorIndicators(targetDistance, hazardDistance);

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
function showPlusOne(x, y) {
    const plusOne = document.createElement('div');
    plusOne.className = 'plus-one';
    plusOne.textContent = '+1';
    plusOne.style.left = `${x}px`;
    plusOne.style.top = `${y - 30}px`; // Position above the target
    
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
    document.body.classList.remove('game-started');
    updatePerformanceModeState();
    
    // Reveal all hazards
    hazards.forEach(hazard => {
        hazard.element.classList.add('revealed');
    });
    
    // Create game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    const theme = getThemeConfig(currentTheme);
    gameOverScreen.innerHTML = `
        <h1>${theme.copy.gameOverTitle}</h1>
        <p>${theme.copy.gameOverMessage}</p>
        <p>Level: ${currentLevel}</p>
        <p>Targets found: ${targetsFound}/${totalTargets}</p>
        <p>Total targets collected: ${totalTargetsCollected}</p>
        <p>Levels completed: ${levelsCompleted}</p>
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
            openScoreModal({
                title: 'Save your score',
                description: `Targets: ${totalTargetsCollected} · Levels: ${levelsCompleted}`
            });
        });
    }
}

// Level complete function
function levelComplete() {
    levelsCompleted += 1;
    gameStarted = false;
    document.body.classList.remove('game-started');
    updatePerformanceModeState();
    
    const theme = getThemeConfig(currentTheme);
    
    // Create level complete screen
    const levelCompleteScreen = document.createElement('div');
    levelCompleteScreen.id = 'level-complete-screen';
    
    // Always show next level option - infinite levels!
    levelCompleteScreen.innerHTML = `
        <h1>${formatTemplate(theme.copy.levelCompleteTitle, { level: currentLevel })}</h1>
        <p>${theme.copy.levelCompleteMessage}</p>
        <p>Ready for the next challenge?</p>
        <button id="next-level-button">${theme.copy.nextLevelCta}</button>
        <button id="finish-run-button" style="margin-left: 10px;">${theme.copy.finishRunCta}</button>
        <button id="restart-button" style="margin-left: 10px;">${theme.copy.restartCta}</button>
    `;
    
    document.body.appendChild(levelCompleteScreen);
    
    // Add next level functionality
    const nextButton = document.getElementById('next-level-button');
    const finishButton = document.getElementById('finish-run-button');
    const restartButton = document.getElementById('restart-button');
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            levelCompleteScreen.remove();
            document.body.classList.add('game-started');
            currentLevel++;
            startLevel();
        });
    }
    
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            location.reload();
        });
    }

    if (finishButton) {
        finishButton.addEventListener('click', () => {
            openScoreModal({
                title: 'Save your score',
                description: `Targets: ${totalTargetsCollected} · Levels: ${levelsCompleted}`
            });
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

            // Show +1 animation above the target
            showPlusOne(target.x, target.y);

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
    gameStarted = true;
    document.body.classList.add('game-started');
    targetsFound = 0;
    setActiveLevelAssetOverrides(currentTheme);
    updatePerformanceModeState();
    
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
}

// Start game with selected level
function startGame(selectedLevel = 1) {
    const startScreen = document.getElementById('start-screen');
    startScreen.style.display = 'none';
    document.body.classList.add('game-started');
    
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

// Update custom cursor position
function updateCustomCursor(x, y) {
    const customCursor = document.getElementById('custom-cursor');
    if (customCursor) {
        customCursor.style.left = `${x}px`;
        customCursor.style.top = `${y}px`;
    }
}

// Track mouse movement
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
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
    isDragging = true;
    
    // Get the first touch point
    const touch = e.touches[0];
    mouseX = touch.clientX;
    mouseY = touch.clientY;
    
    // Prevent default to avoid scrolling
    if (gameStarted) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    // Get the first touch point
    const touch = e.touches[0];
    mouseX = touch.clientX;
    mouseY = touch.clientY;
    
    if (!gameStarted) return;
    
    // Prevent default to avoid scrolling during gameplay
    e.preventDefault();
    
    updateBackground();
    checkTargetReveal();
    checkHazardCollision();
}, { passive: false });

document.addEventListener('touchend', (e) => {
    isDragging = false;
    
    // Prevent default
    if (gameStarted) {
        e.preventDefault();
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
document.querySelectorAll('.theme-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove selected class from all theme buttons
        document.querySelectorAll('.theme-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Add selected class to clicked button
        button.classList.add('selected');
        
        // Set the selected theme
        currentTheme = button.getAttribute('data-theme');
        const theme = getThemeConfig(currentTheme);

        // Update color palette
        baseColor = { ...theme.colors.baseColor };
        targetColor = { ...theme.colors.targetColor };
        hazardColor = { ...theme.colors.hazardColor };

        // Update background to match theme
        updateStartScreenBackground(theme);
        updateStartScreenCopy(theme);
        updateLevelSelectionCopy(currentTheme);
        updateLegendLabels(currentTheme);
        applyThemeAssetsToUi(currentLevel, currentTheme);
    });
});

// Level selection buttons
document.querySelectorAll('.level-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove selected class from all level buttons
        document.querySelectorAll('.level-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Add selected class to clicked button
        button.classList.add('selected');
        
        const selectedLevel = parseInt(button.getAttribute('data-level'));
        
        // Small delay to show selection before starting game
        setTimeout(() => {
            startGame(selectedLevel);
        }, 300);
    });
});

// Start button (defaults to classic theme, level 1)
const startButton = document.getElementById('start-button');
if (startButton) {
    startButton.addEventListener('click', () => {
        currentTheme = 'classic';
        const theme = getThemeConfig('classic');
        baseColor = { ...theme.colors.baseColor };
        targetColor = { ...theme.colors.targetColor };
        hazardColor = { ...theme.colors.hazardColor };
        updateStartScreenBackground(theme);
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
    const classicButton = document.querySelector('.theme-button[data-theme="classic"]');
    if (classicButton) {
        classicButton.classList.add('selected');
        const theme = getThemeConfig('classic');
        baseColor = { ...theme.colors.baseColor };
        targetColor = { ...theme.colors.targetColor };
        hazardColor = { ...theme.colors.hazardColor };
        updateStartScreenBackground(theme);
        updateStartScreenCopy(theme);
        updateLevelSelectionCopy('classic');
        updateLegendLabels('classic');
        applyThemeAssetsToUi(1, 'classic');
    }

    typeTitleText();
    createClassicFloatingShapes();
});

// Initialize (game starts when button is clicked)
