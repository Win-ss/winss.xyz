document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const upload = document.getElementById('upload');
    const effectsContainer = document.getElementById('effects-container');
    const resetBtn = document.getElementById('reset-btn');

    const PALETTES = { // this is terribly implemented, please forgive me 
        'Pico-8': ['#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8', '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'],
        'GameBoy': ['#081820', '#346856', '#88c070', '#e0f8d0'],
        'NES': ['#7C7C7C', '#0000FC', '#0000BC', '#4428BC', '#940084', '#A80020', '#A81000', '#881400', '#503000', '#007800', '#006800', '#005800', '#004058', '#000000', '#BCBCBC', '#0078F8', '#0058F8', '#6844FC', '#D800CC', '#E40058', '#F83800', '#E45C10', '#AC7C00', '#00B800', '#00A800', '#00A844', '#008888', '#000000', '#F8F8F8', '#3CBCFC', '#6888FC', '#9878F8', '#F878F8', '#F85898', '#F87858', '#FCA044', '#F8B800', '#B8F818', '#58D854', '#58F898', '#00E8D8', '#787878', '#FCFCFC', '#A4E4FC', '#B8B8F8', '#D8B8F8', '#F8B8F8', '#F8A4C0', '#F0D0B0', '#FCE0A8', '#F8D878', '#D8F878', '#B8F8B8', '#B8F8D8', '#00FCFC', '#F8D8F8', '#000000'],
        'C64': ['#000000', '#FFFFFF', '#883932', '#67B6BD', '#8B3F96', '#55A049', '#40318D', '#BFCE72', '#8B5429', '#574200', '#B86962', '#505050', '#787878', '#94E089', '#7869C4', '#9F9F9F'],
        'IBM BIOS': ['#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA', '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'],
        'ZX Spectrum': ['#000000', '#0000D7', '#D70000', '#D700D7', '#00D700', '#00D7D7', '#D700D7', '#D7D7D7', '#0000FF', '#FF0000', '#FF00FF', '#00FF00', '#00FFFF', '#FFFF00', '#FFFFFF'],
        'Grayscale': ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'],
        'Monochrome Green': ['#002200', '#004400', '#006600', '#008800', '#00AA00', '#00CC00', '#00FF00'],
        'Monochrome Amber': ['#221100', '#442200', '#663300', '#884400', '#AA5500', '#CC6600', '#FFAA00']
    };
    const downloadBtn = document.getElementById('download-btn');
    const blinkBtn = document.getElementById('blink-btn');
    const formatSelect = document.getElementById('format-select');
    const takeSnapshotBtn = document.getElementById('take-snapshot-btn');
    const importSnapshotBtn = document.getElementById('import-snapshot-btn');
    const snapshotInput = document.getElementById('snapshot-input');
    const canvasContainer = document.getElementById('canvas-container');
    const notificationContainer = document.getElementById('notification-container');
    const pasteHint = document.querySelector('.paste-hint');
    const searchInput = document.getElementById('effect-search');
    const searchClear = document.getElementById('search-clear');
    const activeToggle = document.getElementById('active-toggle');
    const exportVideoBtn = document.getElementById('export-video-btn');

    function updatePasteHintVisibility(hasImage) {
        if (pasteHint) {
            pasteHint.style.display = hasImage ? 'none' : 'block';
        }
    }

    updatePasteHintVisibility(false);

    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileClose = document.getElementById('mobile-close');
    const sidebar = document.getElementById('sidebar');

    function openSidebar() {
        sidebar.classList.add('open');
        if (mobileToggle) mobileToggle.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (!document.querySelector('.sidebar-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay active';
            overlay.addEventListener('click', closeSidebar);
            document.body.appendChild(overlay);
        }
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        if (mobileToggle) mobileToggle.classList.remove('active');
        document.body.style.overflow = '';

        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (mobileClose) {
        mobileClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
        });
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
        resizeCanvas();
    });

    function resizeCanvas() {
        if ((currentImage.src || isVideoSource || isGIFSource) && originalImageData) {
            const containerRect = canvasContainer.getBoundingClientRect();
            const maxWidth = containerRect.width - 32;
            const maxHeight = containerRect.height - 32;

            const width = (isVideoSource || isGIFSource) ? canvas.width : currentImage.width;
            const height = (isVideoSource || isGIFSource) ? canvas.height : currentImage.height;
            const imgAspect = width / height;
            const containerAspect = maxWidth / maxHeight;

            let displayWidth;
            let displayHeight;

            if (imgAspect > containerAspect) {
                displayWidth = Math.min(maxWidth, width);
                displayHeight = displayWidth / imgAspect;
            } else {
                displayHeight = Math.min(maxHeight, height);
                displayWidth = displayHeight * imgAspect;
            }

            canvas.width = width;
            canvas.height = height;

            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
            canvas.style.maxWidth = '100%';
            canvas.style.maxHeight = '100%';
            canvas.style.objectFit = 'contain';

            canvas.classList.add('loaded');

            if (!isVideoSource && !isGIFSource) {
                applyAllEffects();
            }
        }
    }

    const BLINK_DURATION_MS = 5000;
    const BLINK_TARGET_FPS = 60;
    const BLINK_FALLBACK_CAPTURE_FPS = 30;
    const BLINK_MIN_BITRATE = 3000000;
    const BLINK_MAX_BITRATE = 20000000;
    const BLINK_BITS_PER_PIXEL = 0.2;
    const BLINK_MIME_CANDIDATES = [
        'video/webm;codecs=vp09.00.10.08',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp8,opus',
        'video/webm'
    ];

    let originalImageData = null;
    let cachedSmartPalette = null;
    let cachedSmartPaletteSource = null;
    let currentImage = new Image();
    let currentVideo = null;
    let isVideoSource = false;
    let videoFrameCanvas = null;
    let videoFrameCtx = null;
    let originalFileName = '';
    let isRecording = false;
    let recordingStream = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    let fallbackCaptureTimer = null;
    let fallbackFrames = [];
    let recordingStartTime = 0;
    let mediaRecorderMimeType = '';
    let fallbackCaptureCanvas = null;
    let fallbackCaptureCtx = null;
    let animationFrameId = null;
    let badTVOffset = 0;
    let rainbowAngle = 0;
    let badTVOriginalData = null;
    let matrixChars = null;

    let lastAnimationTime = 0;
    let preAnimatedImageData = null;
    let matrixDrops = null;
    let matrixCanvasWidth = 0;
    let matrixCanvasHeight = 0;
    let matrixDensity = 0;
    let matrixSize = 0;
    let animatedEffectStack = [];
    let postAnimatedEffectStack = [];
    let effectProcessingOrder = [];
    let processingCanvas = null;
    let processingCtx = null;
    let recordingTimeoutId = null;
    let isFallbackCapturing = false;
    let isVideoExporting = false;
    let videoExportDuration = 5000; 
    let videoExportMimeType = 'video/webm';
    let videoOriginalDuration = 0; 
    let videoOriginalFPS = 30; 

    let isGIFSource = false;
    let gifFrames = [];
    let gifFrameIndex = 0;
    let gifTotalDuration = 0;
    let gifPlaybackTimer = null;
    let gifWidth = 0;
    let gifHeight = 0;
    let gifEncoder = null;
    let gifWorkerBlobURL = null;

    async function getGIFWorkerURL() {
        if (gifWorkerBlobURL) return gifWorkerBlobURL;
        const response = await fetch('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js');
        const text = await response.text();
        const blob = new Blob([text], { type: 'application/javascript' });
        gifWorkerBlobURL = URL.createObjectURL(blob);
        return gifWorkerBlobURL;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    const debouncedApplyEffects = debounce(() => {
        applyAllEffects();
        captureFrame();
    }, 100);

    const throttledApplyEffects = throttle(() => {
        applyAllEffects();
    }, 50);

    function hexToRgb(color) {
        if (!color) return { r: 0, g: 0, b: 0 };
        if (typeof color === 'object') return color;
        
        let hex = color.trim().replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        const parsed = parseInt(hex, 16);
        return {
            r: (parsed >> 16) & 255,
            g: (parsed >> 8) & 255,
            b: parsed & 255
        };
    }

    function rgbToHex(rgb) {
        if (!rgb) return '#000000';
        const r = Math.round(rgb.r).toString(16).padStart(2, '0');
        const g = Math.round(rgb.g).toString(16).padStart(2, '0');
        const b = Math.round(rgb.b).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    function fuzzyMatch(searchTerm, targetText) {
        searchTerm = searchTerm.toLowerCase().trim();
        targetText = targetText.toLowerCase();
        
        if (searchTerm === '') return true;
        
        if (targetText.includes(searchTerm)) return true;
        
        let searchIndex = 0;
        for (let i = 0; i < targetText.length && searchIndex < searchTerm.length; i++) {
            if (targetText[i] === searchTerm[searchIndex]) {
                searchIndex++;
            }
        }
        if (searchIndex === searchTerm.length) return true;
        
        const words = targetText.split(/\s+/);
        for (let word of words) {
            if (word.startsWith(searchTerm)) return true;
        }
        
        const acronym = targetText.split(/\s+/).map(w => w[0]).join('');
        if (acronym.includes(searchTerm)) return true;
        
        return false;
    }

    function filterEffects(searchTerm) {
        const effectItems = effectsContainer.querySelectorAll('.effect-item');
        let visibleCount = 0;
        const onlyActive = activeToggle && activeToggle.checked;
        
        effectItems.forEach(item => {
            const effectName = item.dataset.effectName;
            const matches = fuzzyMatch(searchTerm, effectName);
            const isActive = effects[effectName] && effects[effectName].enabled;
            if (matches && (!onlyActive || isActive)) {
                item.classList.remove('hidden-by-search');
                visibleCount++;
            } else {
                item.classList.add('hidden-by-search');
            }
        });
        
        let noResultsMsg = effectsContainer.querySelector('.no-results-message');
        if (visibleCount === 0 && searchTerm.trim() !== '') {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'no-results-message';
                noResultsMsg.textContent = 'No effects found. Try a different search term!';
                effectsContainer.appendChild(noResultsMsg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
        
        if (searchTerm.trim() !== '') {
            searchClear.style.display = 'block';
        } else {
            searchClear.style.display = 'none';
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterEffects(e.target.value);
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                filterEffects('');
                searchInput.blur();
            }
        });
    }

    if (activeToggle) {
        activeToggle.addEventListener('change', () => {
            // re-run filter using current search text whenever toggle flips
            filterEffects(searchInput ? searchInput.value : '');
        });
    }

    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            filterEffects('');
            searchInput.focus();
        });
    }



    function animate(currentTime = 0) {
        if (hasAnimatedEffects()) {
            const targetFPS = isRecording ? 60 : 30;
            const frameInterval = 1000 / targetFPS;

            if (currentTime - lastAnimationTime >= frameInterval) {
                applyAnimatedEffects();
                lastAnimationTime = currentTime;
            }
            animationFrameId = requestAnimationFrame(animate);
        } else {
            animationFrameId = null;
        }
    }

    function hasAnimatedEffects() {
        return (effects['Bad TV'] && effects['Bad TV'].enabled && effects['Bad TV'].value > 0) ||
               (effects['Spinning Rainbow Wheel'] && effects['Spinning Rainbow Wheel'].enabled && effects['Spinning Rainbow Wheel'].opacity > 0) ||
               (effects['Liquid Marble'] && effects['Liquid Marble'].enabled && effects['Liquid Marble'].opacity > 0) ||
               (effects['Matrix Rain'] && effects['Matrix Rain'].enabled && effects['Matrix Rain'].opacity > 0) ||
               (effects['Glitter Field'] && effects['Glitter Field'].enabled) ||
               (effects['Storm Syndrome'] && effects['Storm Syndrome'].enabled && effects['Storm Syndrome'].intensity > 0) ||
               (effects['Melt'] && effects['Melt'].enabled && effects['Melt'].intensity > 0) ||
               (effects['Bouncing Logo'] && effects['Bouncing Logo'].enabled);
    }

    function applyAnimatedEffects() {
        if (!preAnimatedImageData || animatedEffectStack.length === 0) {
            return;
        }

        ctx.putImageData(preAnimatedImageData, 0, 0);

        animatedEffectStack.forEach(effectName => {
            const effectConfig = effects[effectName];
            if (!effectConfig) return;
            applyAnimatedEffect(canvas, ctx, effectName, effectConfig);
        });

        if (postAnimatedEffectStack.length === 0) {
            return;
        }

        postAnimatedEffectStack.forEach(({ name, stage }) => {
            const effectConfig = effects[name];
            if (!effectConfig) return;

            switch (stage) {
                case 'pixel': {
                    const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    applyPixelEffect(frameData, name, effectConfig);
                    ctx.putImageData(frameData, 0, 0);
                    break;
                }
                case 'filter':
                    if ((name === 'Blur' && effectConfig.value <= 0) || (name === 'Hue' && effectConfig.value === 0)) {
                        break;
                    }
                    applyFilterEffect(canvas, ctx, name, effectConfig);
                    break;
                case 'overlay':
                    applyOverlayEffect(canvas, ctx, name, effectConfig);
                    break;
                case 'animated':
                    applyAnimatedEffect(canvas, ctx, name, effectConfig);
                    break;
                default:
                    break;
            }
        });
    }

    function showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        notification.innerHTML = `
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
            ${message}
        `;
        
        notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
        
        return notification;
    }

    function showError(message) {
        showNotification(message, 'error');
    }

    function showSuccess(message) {
        showNotification(message, 'success');
    }

    function showInfo(message) {
        showNotification(message, 'info');
    }

    const effects = {
        'Brightness': { value: 0, min: -100, max: 100, type: 'slider', enabled: false },
        'Contrast': { value: 0, min: -100, max: 100, type: 'slider', enabled: false },
        'Grayscale': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Sepia': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Invert': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Blur': { value: 0, min: 0, max: 20, type: 'slider', enabled: false },
        'Hue': { value: 0, min: 0, max: 360, type: 'slider', enabled: false },
        'Temperature': { value: 0, min: -100, max: 100, type: 'slider', enabled: false },
        'Pixelate': { value: 1, min: 1, max: 50, type: 'slider', enabled: false },
        'Vignette': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Glitch': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Noise': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Chromatic Aberration': { value: 0, min: 0, max: 20, type: 'slider', enabled: false },
        'Dotted Matrix': { value: 0, min: 0, max: 20, type: 'slider', enabled: false },
        'Mosaic': { value: 1, min: 1, max: 50, type: 'slider', enabled: false },        'Duotone': { enabled: false, color1: '#0000ff', color2: '#ffff00', type: 'duotone' },        
        'CRT': { 
            intensity: 0, 
            curvature: 50, 
            scanlines: 50, 
            glow: false, 
            type: 'crt', 
            enabled: false 
        },
        'Dotted Line': { value: 0, min: 0, max: 20, type: 'slider', enabled: false },
        'Square Matrix': { value: 0, min: 0, max: 20, type: 'slider', enabled: false },
        'Edge Detection': { 
            enabled: false, 
            type: 'edgeDetection',
            intensity: 0,
            edgeColor: '#ffffff',
            backgroundColor: '#000000'
        },
        '3D Perspective': { 
            enabled: false, 
            type: 'perspective3d',
            rotation: 0,
            skewX: 0, 
            skewY: 0,
            scaleX: 100,
            scaleY: 100,
            offsetX: 0,
            offsetY: 0,
            shadowBlur: 0,
            shadowOpacity: 50
        },
        'Posterize': { value: 0, min: 0, max: 10, type: 'slider', enabled: false },
        'Oil Painting': { value: 0, min: 0, max: 10, type: 'slider', enabled: false },
        'Kaleidoscope': { value: 0, min: 0, max: 8, type: 'slider', enabled: false },
        'Emboss': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Solarize': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Cross Hatch': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Thermal Vision': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Neon Glow': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Bad Apple': { 
            threshold: 50, 
            fuzz: 20, 
            type: 'dual-slider', 
            enabled: false 
        },
        'Bad TV': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Spinning Rainbow Wheel': { 
            opacity: 0, 
            speed: 50, 
            type: 'spinningRainbow', 
            enabled: false 
        },
        'Liquid Marble': { 
            opacity: 0, 
            speed: 50, 
            turbulence: 50, 
            scale: 50,
            colorInfluence: 50,
            flowX: 50,
            flowY: 50,
            type: 'liquidMarble', 
            enabled: false 
        },
        'Matrix Rain': { 
            opacity: 0, 
            speed: 50, 
            density: 30, 
            size: 80, 
            color: '#00ff00',
            type: 'matrixRain', 
            enabled: false 
        },
        'Glitter Field': {
            density: 50,
            size: 3,
            speed: 100,
            color: '#ffffff',
            type: 'glitterField',
            enabled: false
        },
        'Storm Syndrome': {
            intensity: 30,
            speed: 50,
            type: 'stormSyndrome',
            enabled: false
        },
        'Melt': {
            intensity: 30,
            speed: 50,
            type: 'melt',
            enabled: false
        },
        'Bouncing Logo': {
            speed: 100,
            size: 50,
            colorShift: true,
            customImage: null,
            type: 'bouncingLogo',
            enabled: false
        },
        'Line Art': {
            enabled: false,
            type: 'lineArt',
            lineColor: '#ffffff',
            backgroundColor: '#000000',
            thickness: 1,
            sensitivity: 50,
            smoothColors: false
        },
        'Frosted Glass': {
            enabled: false,
            type: 'frostedGlass',
            intensity: 10,
            noise: 20,
            opacity: 50,
            tint: '#333333'
        },
        'Pixel Art': {
            enabled: false,
            type: 'pixelArt',
            pixelSize: 8,
            palette: 'Pico-8',
            customPalette: [],
            dithering: 20,
            brightness: 0,
            contrast: 0
        },
        'Film Grain': {
            intensity: 0,
            size: 50,
            monochrome: true,
            type: 'filmGrain',
            enabled: false
        },
        'Pixel Sort': {
            threshold: 50,
            direction: 0,
            type: 'pixelSort',
            enabled: false
        },
        'ASCII Art': {
            size: 8,
            fontSize: 8,
            symbols: '@%#*+=-:. ',
            invert: false,
            fontFamily: 'monospace',
            type: 'asciiArt',
            enabled: false
        }
    };

    const SNAPSHOT_FIELDS_BY_TYPE = {
        'slider': ['value'],
        'dual-slider': ['threshold', 'fuzz'],
        'duotone': ['color1', 'color2'],
        'perspective3d': ['rotation', 'skewX', 'skewY', 'scaleX', 'scaleY', 'offsetX', 'offsetY', 'shadowBlur', 'shadowOpacity'],
        'toggle': ['value'],
        'edgeDetection': ['intensity', 'edgeColor', 'backgroundColor'],
        'spinningRainbow': ['opacity', 'speed'],
        'liquidMarble': ['opacity', 'speed', 'turbulence', 'scale', 'colorInfluence', 'flowX', 'flowY'],
        'matrixRain': ['opacity', 'speed', 'density', 'size', 'color'],
        'glitterField': ['density', 'size', 'speed', 'color'],
        'stormSyndrome': ['intensity', 'speed'],
        'melt': ['intensity', 'speed'],
        'bouncingLogo': ['speed', 'size', 'colorShift'],
        'lineArt': ['lineColor', 'backgroundColor', 'thickness', 'sensitivity', 'smoothColors'],
        'frostedGlass': ['intensity', 'noise', 'opacity', 'tint'],
        'pixelArt': ['pixelSize', 'palette', 'customPalette', 'dithering', 'brightness', 'contrast'],
        'crt': ['intensity', 'curvature', 'scanlines', 'glow'],
        'filmGrain': ['intensity', 'size', 'monochrome'],
        'pixelSort': ['threshold', 'direction'],
        'asciiArt': ['size', 'fontSize', 'symbols', 'invert', 'fontFamily']
    };

    const NON_SNAPSHOT_KEYS = new Set(['min', 'max', 'type']);

    function cloneSnapshotValue(value) {
        if (Array.isArray(value)) {
            return value.map(cloneSnapshotValue);
        }

        if (value && typeof value === 'object') {
            const cloned = {};
            for (const key in value) {
                if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
                if (key === 'customImage') continue;
                cloned[key] = cloneSnapshotValue(value[key]);
            }
            return cloned;
        }

        return value;
    }

    function getSnapshotFields(configType, config) {
        const fields = SNAPSHOT_FIELDS_BY_TYPE[configType];
        if (fields) return fields;

        return Object.keys(config).filter(key =>
            !NON_SNAPSHOT_KEYS.has(key) &&
            key !== 'customImage'
        );
    }

    function captureEffectSnapshot(config) {
        const snapshotConfig = {
            type: config.type
        };

        if (Object.prototype.hasOwnProperty.call(config, 'enabled')) {
            snapshotConfig.enabled = !!config.enabled;
        }

        const fields = getSnapshotFields(config.type, config);
        fields.forEach(field => {
            if (field === 'enabled') return;
            if (Object.prototype.hasOwnProperty.call(config, field)) {
                snapshotConfig[field] = cloneSnapshotValue(config[field]);
            }
        });

        return snapshotConfig;
    }

    const defaultEffects = cloneSnapshotValue(effects);

    const effectStages = {
        'Brightness': 'pixel',
        'Contrast': 'pixel',
        'Temperature': 'pixel',
        'Grayscale': 'pixel',
        'Sepia': 'pixel',
        'Invert': 'pixel',
        'Noise': 'pixel',
        'Edge Detection': 'pixel',
        'Duotone': 'pixel',
        'Glitch': 'pixel',
        'Chromatic Aberration': 'pixel',
        'Pixelate': 'pixel',
        'Mosaic': 'pixel',
        'Posterize': 'pixel',
        'Oil Painting': 'pixel',
        'Emboss': 'pixel',
        'Solarize': 'pixel',
        'Cross Hatch': 'pixel',
        'Thermal Vision': 'pixel',
        'Neon Glow': 'pixel',
        'Bad Apple': 'pixel',
        'Blur': 'filter',
        'Hue': 'filter',
        'Vignette': 'overlay',
        'CRT': 'overlay',
        'Dotted Matrix': 'overlay',
        'Dotted Line': 'overlay',
        'Kaleidoscope': 'overlay',
        '3D Perspective': 'overlay',
        'Frosted Glass': 'overlay',
        'Bad TV': 'animated',
        'Spinning Rainbow Wheel': 'animated',
        'Liquid Marble': 'animated',
        'Matrix Rain': 'animated',
        'Glitter Field': 'animated',
        'Storm Syndrome': 'animated',
        'Melt': 'animated',
        'Bouncing Logo': 'animated',
        'Line Art': 'pixel',
        'Pixel Art': 'pixel',
        'Square Matrix': 'overlay',
        'Film Grain': 'pixel',
        'Pixel Sort': 'pixel',
        'ASCII Art': 'pixel'
    };

    let effectLayers = [
        'Brightness', 'Contrast', 'Temperature', 'Grayscale', 'Sepia', 'Invert', 'Noise', 'Film Grain',
        'Edge Detection', 'Duotone', 'Glitch', 'Chromatic Aberration', 'Pixelate', 'Pixel Art', 'Pixel Sort', 'ASCII Art', 'Mosaic',
        'Posterize', 'Oil Painting', 'Emboss', 'Solarize', 'Cross Hatch', 'Thermal Vision',
        'Neon Glow', 'Bad Apple', 'Bad TV', 'Spinning Rainbow Wheel', 'Liquid Marble', 'Matrix Rain', 'Glitter Field', 'Storm Syndrome', 'Melt', 'Bouncing Logo', 'Line Art', 'Blur', 'Hue', 'Vignette', 'CRT', 'Dotted Matrix', 'Square Matrix', 'Dotted Line',
        'Kaleidoscope', '3D Perspective', 'Frosted Glass'
    ];

    const layersPanel = document.getElementById('layers-panel');
    const layersList = document.getElementById('layers-list');

    function getEffectStage(effectName) {
        return effectStages[effectName] || 'pixel';
    }

    function applyPixelEffect(imageData, effectName, effectConfig) {
        if (!imageData || !effectConfig) return;
        const data = imageData.data;

        switch (effectName) {
            case 'Brightness':
                if (effectConfig.value !== 0) adjustBrightness(data, effectConfig.value);
                break;
            case 'Contrast':
                if (effectConfig.value !== 0) adjustContrast(data, effectConfig.value);
                break;
            case 'Temperature':
                if (effectConfig.value !== 0) adjustTemperature(data, effectConfig.value);
                break;
            case 'Grayscale':
                if (effectConfig.value > 0) grayscale(data, effectConfig.value / 100);
                break;
            case 'Sepia':
                if (effectConfig.value > 0) sepia(data, effectConfig.value / 100);
                break;
            case 'Invert':
                if (effectConfig.value > 0) invert(data, effectConfig.value / 100);
                break;
            case 'Noise':
                if (effectConfig.value > 0) noise(data, effectConfig.value);
                break;
            case 'Edge Detection':
                if (effectConfig.intensity > 0) edgeDetection(
                    imageData,
                    effectConfig.intensity / 100,
                    effectConfig.edgeColor,
                    effectConfig.backgroundColor
                );
                break;
            case 'Duotone':
                duotone(data, effectConfig.color1, effectConfig.color2);
                break;
            case 'Glitch':
                if (effectConfig.value > 0) glitch(imageData, effectConfig.value);
                break;
            case 'Chromatic Aberration':
                if (effectConfig.value > 0) chromaticAberration(imageData, effectConfig.value);
                break;
            case 'Pixelate':
                if (effectConfig.value > 1) pixelate(imageData, effectConfig.value);
                break;
            case 'Mosaic':
                if (effectConfig.value > 1) mosaic(imageData, effectConfig.value);
                break;
            case 'Posterize':
                if (effectConfig.value > 0) posterize(imageData, effectConfig.value);
                break;
            case 'Oil Painting':
                if (effectConfig.value > 0) oilPainting(imageData, effectConfig.value);
                break;
            case 'Emboss':
                if (effectConfig.value > 0) emboss(imageData, effectConfig.value);
                break;
            case 'Solarize':
                if (effectConfig.value > 0) solarize(imageData, effectConfig.value);
                break;
            case 'Cross Hatch':
                if (effectConfig.value > 0) crossHatch(imageData, effectConfig.value);
                break;
            case 'Thermal Vision':
                if (effectConfig.value > 0) thermalVision(imageData, effectConfig.value);
                break;
            case 'Neon Glow':
                if (effectConfig.value > 0) neonGlow(imageData, effectConfig.value);
                break;
            case 'Bad Apple':
                if (effectConfig.threshold > 0) badApple(imageData, effectConfig.threshold, effectConfig.fuzz);
                break;
            case 'Line Art':
                lineArt(imageData, effectConfig.lineColor, effectConfig.backgroundColor, effectConfig.thickness, effectConfig.sensitivity, effectConfig.smoothColors);
                break;
            case 'Pixel Art':
                pixelArt(imageData, effectConfig);
                break;
            case 'Film Grain':
                if (effectConfig.intensity > 0) filmGrain(imageData, effectConfig.intensity, effectConfig.size, effectConfig.monochrome);
                break;
            case 'Pixel Sort':
                if (effectConfig.threshold > 0) pixelSort(imageData, effectConfig.threshold, effectConfig.direction);
                break;
            case 'ASCII Art':
                if (effectConfig.size > 0) asciiArt(imageData, effectConfig.size, effectConfig.fontSize, effectConfig.symbols, effectConfig.invert, effectConfig.fontFamily);
                break;
            default:
                break;
        }
    }

    let filterCanvas = null;
    let filterCtx = null;
    let frostedCanvas = null;
    let frostedCtx = null;
    let cachedNoiseCanvas = null;
    let cachedNoiseAmount = -1;

    function ensureProcessingContext(width, height) {
        if (!processingCanvas) {
            processingCanvas = document.createElement('canvas');
            processingCtx = processingCanvas.getContext('2d');
        }
        if (processingCanvas.width !== width || processingCanvas.height !== height) {
            processingCanvas.width = width;
            processingCanvas.height = height;
        }
    }

    function ensureFilterContext(canvas) {
        if (!filterCanvas) {
            filterCanvas = document.createElement('canvas');
            filterCtx = filterCanvas.getContext('2d');
        }
        if (filterCanvas.width !== canvas.width || filterCanvas.height !== canvas.height) {
            filterCanvas.width = canvas.width;
            filterCanvas.height = canvas.height;
        }
    }

    function applyFilterEffect(canvas, context, effectName, effectConfig) {
        if (!effectConfig) return;
        ensureFilterContext(canvas);
        filterCtx.clearRect(0, 0, filterCanvas.width, filterCanvas.height);
        filterCtx.drawImage(canvas, 0, 0);

        context.save();
        switch (effectName) {
            case 'Blur':
                if (effectConfig.value > 0) {
                    context.filter = `blur(${effectConfig.value}px)`;
                }
                break;
            case 'Hue':
                if (effectConfig.value > 0) {
                    context.filter = `hue-rotate(${effectConfig.value}deg)`;
                }
                break;
            default:
                context.restore();
                return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(filterCanvas, 0, 0);
        context.restore();
    }

    function applyOverlayEffect(canvas, context, effectName, effectConfig) {
        if (!effectConfig) return;
        switch (effectName) {
            case 'Vignette':
                if (effectConfig.value > 0) vignette(canvas, context, effectConfig.value / 100);
                break;
            case 'CRT':
                if (effectConfig.intensity > 0) crt(canvas, context, effectConfig);
                break;
            case 'Dotted Matrix':
                if (effectConfig.value > 0) dottedMatrix(canvas, context, effectConfig.value);
                break;
            case 'Square Matrix':
                if (effectConfig.value > 0) squareMatrix(canvas, context, effectConfig.value);
                break;
            case 'Dotted Line':
                if (effectConfig.value > 0) dottedLine(canvas, context, effectConfig.value);
                break;
            case 'Kaleidoscope':
                if (effectConfig.value > 0) kaleidoscope(canvas, context, effectConfig.value);
                break;
            case '3D Perspective':
                perspective3D(canvas, context, effectConfig);
                break;
            case 'Frosted Glass':
                frostedGlass(canvas, context, effectConfig.intensity, effectConfig.noise, effectConfig.opacity, effectConfig.tint);
                break;
            default:
                break;
        }
    }

    function applyAnimatedEffect(canvas, context, effectName, effectConfig) {
        if (!effectConfig) return;
        switch (effectName) {
            case 'Bad TV':
                if (effectConfig.value > 0) badTV(canvas, context, effectConfig.value);
                break;
            case 'Spinning Rainbow Wheel':
                if (effectConfig.opacity > 0) spinningRainbowWheel(canvas, context, effectConfig.opacity / 100, effectConfig.speed);
                break;
            case 'Liquid Marble':
                if (effectConfig.opacity > 0) liquidMarble(canvas, context, effectConfig.opacity / 100, effectConfig.speed, effectConfig.turbulence, effectConfig.scale, effectConfig.colorInfluence, effectConfig.flowX, effectConfig.flowY);
                break;
            case 'Matrix Rain':
                if (effectConfig.opacity > 0) matrixRain(canvas, context, effectConfig.opacity / 100, effectConfig.speed, effectConfig.density, effectConfig.size, effectConfig.color);
                break;
            case 'Glitter Field':
                glitterField(canvas, context, effectConfig.density, effectConfig.size, effectConfig.speed, effectConfig.color);
                break;
            case 'Storm Syndrome':
                stormSyndrome(canvas, context, effectConfig.intensity, effectConfig.speed);
                break;
            case 'Melt':
                melt(canvas, context, effectConfig.intensity, effectConfig.speed);
                break;
            case 'Bouncing Logo':
                bouncingLogo(canvas, context, effectConfig.speed, effectConfig.size, effectConfig.colorShift, effectConfig.customImage);
                break;
            default:
                break;
        }
    }

    function createEffectControls() {
        const sortedEffectNames = Object.keys(effects).sort((a, b) => {
            if (a === '3D Perspective') return 1;
            if (b === '3D Perspective') return -1;
            return a.localeCompare(b);
        });
        for (const name of sortedEffectNames) {
            const config = effects[name];
            const container = document.createElement('div');
            container.className = 'effect-item';
            container.dataset.effectName = name;
            container.dataset.enabled = config.enabled ? 'true' : 'false';
            if (effectStages[name] === 'animated') {
                container.classList.add('animated-glow');
            }
            const header = document.createElement('div');
            header.className = 'effect-header';
            
            const titleContainer = document.createElement('div');
            titleContainer.className = 'effect-title-container';
            
            const title = document.createElement('span');
            title.className = 'effect-title';
            title.textContent = name;
            
            const enableToggle = document.createElement('label');
            enableToggle.className = 'effect-enable-toggle toggle-switch';
            
            const enableCheckbox = document.createElement('input');
            enableCheckbox.type = 'checkbox';
            enableCheckbox.checked = config.enabled || (config.type === 'duotone' ? config.enabled : false);
            
            const enableSlider = document.createElement('span');
            enableSlider.className = 'toggle-slider';
            
            enableToggle.appendChild(enableCheckbox);
            enableToggle.appendChild(enableSlider);
            
            titleContainer.appendChild(title);
            titleContainer.appendChild(enableToggle);
            
            const expandToggle = document.createElement('div');
            expandToggle.className = 'effect-toggle';
            
            header.appendChild(titleContainer);
            header.appendChild(expandToggle);
            
            enableCheckbox.addEventListener('change', (e) => {
                e.stopPropagation(); 
                if (config.type === 'duotone') {
                    effects[name].enabled = enableCheckbox.checked;
                } else {
                    effects[name].enabled = enableCheckbox.checked;
                }
                container.dataset.enabled = enableCheckbox.checked ? 'true' : 'false';
                
                if (enableCheckbox.checked) {
                    controlsContainer.classList.add('expanded');
                    expandToggle.classList.add('expanded');
                }
                
                applyAllEffects();
                captureFrame();
                updateLayersPanel();
                if (activeToggle && activeToggle.checked) {
                    filterEffects(searchInput ? searchInput.value : '');
                }
                
    
                if (hasAnimatedEffects() && !animationFrameId) {
                    animate();
                } else if (!hasAnimatedEffects() && animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            });
            
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'effect-controls';
            if (config.type === 'slider') {
                addSlider(controlsContainer, name, config.min, config.max, config.value);
            } else if (config.type === 'dual-slider') {
                addDualSlider(controlsContainer, name, config);
            } else if (config.type === 'color') {
                addColorPicker(controlsContainer, name, 'color1', config.color1);
                addColorPicker(controlsContainer, name, 'color2', config.color2);            } else if (config.type === 'duotone') {
                addDuotoneControls(controlsContainer, name, config);
            } else if (config.type === 'edgeDetection') {
                addEdgeDetectionControls(controlsContainer, name, config);
            } else if (config.type === 'perspective3d') {
                addPerspective3DControls(controlsContainer, name, config);
            } else if (config.type === 'spinningRainbow') {
                addSpinningRainbowControls(controlsContainer, name, config);
            } else if (config.type === 'liquidMarble') {
                addLiquidMarbleControls(controlsContainer, name, config);
            } else if (config.type === 'matrixRain') {
                addMatrixRainControls(controlsContainer, name, config);
            } else if (config.type === 'glitterField') {
                addGlitterFieldControls(controlsContainer, name, config);
            } else if (config.type === 'stormSyndrome') {
                addStormSyndromeControls(controlsContainer, name, config);
            } else if (config.type === 'melt') {
                addMeltControls(controlsContainer, name, config);
            } else if (config.type === 'bouncingLogo') {
                addBouncingLogoControls(controlsContainer, name, config);
            } else if (config.type === 'lineArt') {
                addLineArtControls(controlsContainer, name, config);
            } else if (config.type === 'frostedGlass') {
                addFrostedGlassControls(controlsContainer, name, config);
            } else if (config.type === 'pixelArt') {
                addPixelArtControls(controlsContainer, name, config);
            } else if (config.type === 'crt') {
                addCRTControls(controlsContainer, name, config);
            } else if (config.type === 'filmGrain') {
                addFilmGrainControls(controlsContainer, name, config);
            } else if (config.type === 'pixelSort') {
                addPixelSortControls(controlsContainer, name, config);
            } else if (config.type === 'asciiArt') {
                addAsciiArtControls(controlsContainer, name, config);
            } else if (config.type === 'toggle') {
                addToggle(controlsContainer, name, config.value);
            }
            header.addEventListener('click', (e) => {
                if (e.target.closest('.effect-enable-toggle')) return;
                
                const isExpanded = controlsContainer.classList.contains('expanded');
                if (isExpanded) {
                    controlsContainer.classList.remove('expanded');
                    expandToggle.classList.remove('expanded');
                } else {
                    controlsContainer.classList.add('expanded');
                    expandToggle.classList.add('expanded');
                }
                
            });
            
            container.appendChild(header);
            container.appendChild(controlsContainer);
            effectsContainer.appendChild(container);
        }
        
        updateLayersPanel();
    }

    function initializeLayersPanel() {
        updateLayersPanel();
    }

    function updateLayersPanel() {
        layersList.innerHTML = '';
        
        effectLayers.forEach((effectName, index) => {
            if (effects[effectName] && effects[effectName].enabled) {
                const layerItem = createLayerItem(effectName, index);
                layersList.appendChild(layerItem);
            }
        });
        // if filter toggle is on, reapply filtering to effects list
        if (activeToggle && activeToggle.checked) {
            filterEffects(searchInput ? searchInput.value : '');
        }
    }

    function createLayerItem(effectName, index) {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.draggable = true;
        item.dataset.effectName = effectName;

        item.innerHTML = `
            <span class="layer-drag-handle">⋮⋮</span>
            <span class="layer-name">${effectName}</span>
            <span class="layer-order">${index + 1}</span>
        `;

        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);

        item.addEventListener('dblclick', (e) => {
            e.preventDefault();
            scrollToEffect(effectName);
        });

        return item;
    }

    let draggedElement = null;

    function handleDragStart(e) {
        draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const afterElement = getDragAfterElement(layersList, e.clientY);
        const dragging = document.querySelector('.dragging');
        
        if (afterElement == null) {
            layersList.appendChild(dragging);
        } else {
            layersList.insertBefore(dragging, afterElement);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const draggedEffectName = draggedElement.dataset.effectName;
        
        const newOrder = Array.from(layersList.children).map(item => 
            item.dataset.effectName
        );
        
        const enabledEffects = newOrder;
        const disabledEffects = effectLayers.filter(name => 
            !enabledEffects.includes(name)
        );
        
        effectLayers = [...enabledEffects, ...disabledEffects];
        
        applyAllEffects();
        updateLayersPanel();
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        draggedElement = null;
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.layer-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function scrollToEffect(effectName) {
        const effectsContainer = document.getElementById('effects-container');
        const effectItems = effectsContainer.querySelectorAll('.effect-item');
        
        let targetEffect = null;
        effectItems.forEach(item => {
            const titleElement = item.querySelector('.effect-title');
            if (titleElement && titleElement.textContent === effectName) {
                targetEffect = item;
            }
        });
        
        if (targetEffect) {
            targetEffect.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
            
            targetEffect.classList.add('effect-highlight');
            
            const controlsContainer = targetEffect.querySelector('.effect-controls');
            const expandToggle = targetEffect.querySelector('.effect-toggle');
            if (controlsContainer && expandToggle) {
                controlsContainer.classList.add('expanded');
                expandToggle.classList.add('expanded');
            }
            
            setTimeout(() => {
                targetEffect.classList.remove('effect-highlight');
            }, 2000);
        }
    }
    
    function addSlider(container, name, min, max, value) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const controlContainer = document.createElement('div');
        controlContainer.className = 'flex items-center space-x-2';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.value = value;
        slider.className = 'slider';
        
        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.min = min;
        numberInput.max = max;
        numberInput.value = value;
        numberInput.className = 'number-input';        slider.addEventListener('input', () => {
            numberInput.value = slider.value;
            effects[name].value = parseFloat(slider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });

        numberInput.addEventListener('change', () => {
            slider.value = numberInput.value;
            effects[name].value = parseFloat(numberInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });

        controlContainer.appendChild(slider);
        controlContainer.appendChild(numberInput);
        controlGroup.appendChild(controlContainer);
        container.appendChild(controlGroup);
    }

    function addDualSlider(container, name, config) {
        const thresholdGroup = document.createElement('div');
        thresholdGroup.className = 'control-group';
        
        const thresholdLabel = document.createElement('label');
        thresholdLabel.textContent = 'Threshold';
        thresholdLabel.className = 'text-sm font-medium';
        
        const thresholdContainer = document.createElement('div');
        thresholdContainer.className = 'flex items-center space-x-2';
        
        const thresholdSlider = document.createElement('input');
        thresholdSlider.type = 'range';
        thresholdSlider.min = 0;
        thresholdSlider.max = 100;
        thresholdSlider.value = config.threshold;
        thresholdSlider.className = 'slider';
        
        const thresholdInput = document.createElement('input');
        thresholdInput.type = 'number';
        thresholdInput.min = 0;
        thresholdInput.max = 100;
        thresholdInput.value = config.threshold;
        thresholdInput.className = 'number-input';
        
        thresholdSlider.addEventListener('input', () => {
            thresholdInput.value = thresholdSlider.value;
            effects[name].threshold = parseFloat(thresholdSlider.value);
            applyAllEffects();
            captureFrame();
        });
        
        thresholdInput.addEventListener('change', () => {
            thresholdSlider.value = thresholdInput.value;
            effects[name].threshold = parseFloat(thresholdInput.value);
            applyAllEffects();
            captureFrame();
        });
        
        thresholdContainer.appendChild(thresholdSlider);
        thresholdContainer.appendChild(thresholdInput);
        thresholdGroup.appendChild(thresholdLabel);
        thresholdGroup.appendChild(thresholdContainer);
        
        const fuzzGroup = document.createElement('div');
        fuzzGroup.className = 'control-group';
        
        const fuzzLabel = document.createElement('label');
        fuzzLabel.textContent = 'Fuzz';
        fuzzLabel.className = 'text-sm font-medium';
        
        const fuzzContainer = document.createElement('div');
        fuzzContainer.className = 'flex items-center space-x-2';
        
        const fuzzSlider = document.createElement('input');
        fuzzSlider.type = 'range';
        fuzzSlider.min = 0;
        fuzzSlider.max = 50;
        fuzzSlider.value = config.fuzz;
        fuzzSlider.className = 'slider';
        
        const fuzzInput = document.createElement('input');
        fuzzInput.type = 'number';
        fuzzInput.min = 0;
        fuzzInput.max = 50;
        fuzzInput.value = config.fuzz;
        fuzzInput.className = 'number-input';
        
        fuzzSlider.addEventListener('input', () => {
            fuzzInput.value = fuzzSlider.value;
            effects[name].fuzz = parseFloat(fuzzSlider.value);
            applyAllEffects();
            captureFrame();
        });
        
        fuzzInput.addEventListener('change', () => {
            fuzzSlider.value = fuzzInput.value;
            effects[name].fuzz = parseFloat(fuzzInput.value);
            applyAllEffects();
            captureFrame();
        });
        
        fuzzContainer.appendChild(fuzzSlider);
        fuzzContainer.appendChild(fuzzInput);
        fuzzGroup.appendChild(fuzzLabel);
        fuzzGroup.appendChild(fuzzContainer);
        
        container.appendChild(thresholdGroup);
        container.appendChild(fuzzGroup);
    }
      
      function addColorPicker(container, name, colorKey, value) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        const controlContainer = document.createElement('div');
        controlContainer.className = 'flex items-center space-x-2';
        
        const label = document.createElement('label');
        label.textContent = colorKey === 'color1' ? 'Color 1' : 'Color 2';
        label.className = 'text-sm';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = value;
        colorInput.className = 'color-input';        
        
        colorInput.addEventListener('input', () => {
            effects[name][colorKey] = colorInput.value;
            debouncedApplyEffects();
        });
        
        colorInput.addEventListener('change', () => {
            effects[name][colorKey] = colorInput.value;
            applyAllEffects();
            captureFrame();
        });

        controlContainer.appendChild(label);
        controlContainer.appendChild(colorInput);
        controlGroup.appendChild(controlContainer);
        container.appendChild(controlGroup);
    }    function addToggle(container, name, value) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        const toggleContainer = document.createElement('label');
        toggleContainer.className = 'toggle-switch';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = value;

        const slider = document.createElement('span');
        slider.className = 'toggle-slider';        toggle.addEventListener('change', () => {
            effects[name].value = toggle.checked;
            applyAllEffects();
            captureFrame();
        });

        toggleContainer.appendChild(toggle);
        toggleContainer.appendChild(slider);
        controlGroup.appendChild(toggleContainer);
        container.appendChild(controlGroup);
    }    function addDuotoneControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        const color1Container = document.createElement('div');
        color1Container.className = 'flex items-center space-x-2';
        const color1Label = document.createElement('label');
        color1Label.textContent = 'Color 1';
        color1Label.className = 'text-sm';
        const color1Input = document.createElement('input');
        color1Input.type = 'color';
        color1Input.value = config.color1;
        color1Input.className = 'color-input';
        color1Container.appendChild(color1Label);
        color1Container.appendChild(color1Input);
        
        const color2Container = document.createElement('div');
        color2Container.className = 'flex items-center space-x-2';
        const color2Label = document.createElement('label');
        color2Label.textContent = 'Color 2';
        color2Label.className = 'text-sm';
        const color2Input = document.createElement('input');
        color2Input.type = 'color';
        color2Input.value = config.color2;
        color2Input.className = 'color-input';
        color2Container.appendChild(color2Label);
        color2Container.appendChild(color2Input);
        
        controlGroup.appendChild(color1Container);
        controlGroup.appendChild(color2Container);
        
        color1Input.addEventListener('input', () => {
            effects[name].color1 = color1Input.value;
            throttledApplyEffects();
        });
        
        
        color1Input.addEventListener('change', () => {
            effects[name].color1 = color1Input.value;
            applyAllEffects();
            captureFrame();
        });
        
        
        color2Input.addEventListener('input', () => {
            effects[name].color2 = color2Input.value;
            throttledApplyEffects();
        });
        
        
        color2Input.addEventListener('change', () => {
            effects[name].color2 = color2Input.value;
            applyAllEffects();
            captureFrame();
        });
        
        container.appendChild(controlGroup);
    }

    function addEdgeDetectionControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        const intensityContainer = document.createElement('div');
        intensityContainer.className = 'flex items-center space-x-2';
        const intensityLabel = document.createElement('label');
        intensityLabel.textContent = 'Intensity';
        intensityLabel.className = 'text-sm';
        const intensitySlider = document.createElement('input');
        intensitySlider.type = 'range';
        intensitySlider.min = 0;
        intensitySlider.max = 100;
        intensitySlider.value = config.intensity;
        intensitySlider.className = 'slider';
        const intensityNumber = document.createElement('input');
        intensityNumber.type = 'number';
        intensityNumber.min = 0;
        intensityNumber.max = 100;
        intensityNumber.value = config.intensity;
        intensityNumber.className = 'number-input';
        
        intensityContainer.appendChild(intensityLabel);
        intensityContainer.appendChild(intensitySlider);
        intensityContainer.appendChild(intensityNumber);
        
        const edgeColorContainer = document.createElement('div');
        edgeColorContainer.className = 'flex items-center space-x-2';
        const edgeColorLabel = document.createElement('label');
        edgeColorLabel.textContent = 'Edge Color';
        edgeColorLabel.className = 'text-sm';
        const edgeColorInput = document.createElement('input');
        edgeColorInput.type = 'color';
        edgeColorInput.value = config.edgeColor || '#ffffff';
        edgeColorInput.className = 'color-input';
        edgeColorContainer.appendChild(edgeColorLabel);
        edgeColorContainer.appendChild(edgeColorInput);
        
        const colorContainer = document.createElement('div');
        colorContainer.className = 'flex items-center space-x-2';
        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Background';
        colorLabel.className = 'text-sm';
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = config.backgroundColor;
        colorInput.className = 'color-input';
        colorContainer.appendChild(colorLabel);
        colorContainer.appendChild(colorInput);
        
        controlGroup.appendChild(intensityContainer);
        controlGroup.appendChild(edgeColorContainer);
        controlGroup.appendChild(colorContainer);
        

        intensitySlider.addEventListener('input', () => {
            intensityNumber.value = intensitySlider.value;
            effects[name].intensity = parseFloat(intensitySlider.value);
            applyAllEffects();
            captureFrame();
        });
        
        intensityNumber.addEventListener('change', () => {
            intensitySlider.value = intensityNumber.value;
            effects[name].intensity = parseFloat(intensityNumber.value);
            applyAllEffects();
            captureFrame();
        });
        
        edgeColorInput.addEventListener('input', () => {
            effects[name].edgeColor = edgeColorInput.value;
            debouncedApplyEffects();
        });
        
        edgeColorInput.addEventListener('change', () => {
            effects[name].edgeColor = edgeColorInput.value;
            applyAllEffects();
            captureFrame();
        });

        colorInput.addEventListener('input', () => {
            effects[name].backgroundColor = colorInput.value;
            debouncedApplyEffects();
        });
        
        colorInput.addEventListener('change', () => {
            effects[name].backgroundColor = colorInput.value;
            applyAllEffects();
            captureFrame();
        });
        
        container.appendChild(controlGroup);
    }

    function addLineArtControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        const lineColorContainer = document.createElement('div');
        lineColorContainer.className = 'flex items-center space-x-2';
        const lineColorLabel = document.createElement('label');
        lineColorLabel.textContent = 'Line Color';
        lineColorLabel.className = 'text-sm';
        const lineColorInput = document.createElement('input');
        lineColorInput.type = 'color';
        lineColorInput.value = config.lineColor;
        lineColorInput.className = 'color-input';
        lineColorContainer.appendChild(lineColorLabel);
        lineColorContainer.appendChild(lineColorInput);
        
        
        const bgColorContainer = document.createElement('div');
        bgColorContainer.className = 'flex items-center space-x-2';
        const bgColorLabel = document.createElement('label');
        bgColorLabel.textContent = 'Background';
        bgColorLabel.className = 'text-sm';
        const bgColorInput = document.createElement('input');
        bgColorInput.type = 'color';
        bgColorInput.value = config.backgroundColor;
        bgColorInput.className = 'color-input';
        bgColorContainer.appendChild(bgColorLabel);
        bgColorContainer.appendChild(bgColorInput);
        
        const thicknessContainer = document.createElement('div');
        thicknessContainer.className = 'flex items-center space-x-2';
        const thicknessLabel = document.createElement('label');
        thicknessLabel.textContent = 'Thickness';
        thicknessLabel.className = 'text-sm';
        const thicknessSlider = document.createElement('input');
        thicknessSlider.type = 'range';
        thicknessSlider.min = 1;
        thicknessSlider.max = 10;
        thicknessSlider.value = config.thickness;
        thicknessSlider.className = 'slider';
        const thicknessNumber = document.createElement('input');
        thicknessNumber.type = 'number';
        thicknessNumber.min = 1;
        thicknessNumber.max = 10;
        thicknessNumber.value = config.thickness;
        thicknessNumber.className = 'number-input';
        thicknessContainer.appendChild(thicknessLabel);
        thicknessContainer.appendChild(thicknessSlider);
        thicknessContainer.appendChild(thicknessNumber);
        
        const sensitivityContainer = document.createElement('div');
        sensitivityContainer.className = 'flex items-center space-x-2';
        const sensitivityLabel = document.createElement('label');
        sensitivityLabel.textContent = 'Sensitivity';
        sensitivityLabel.className = 'text-sm';
        const sensitivitySlider = document.createElement('input');
        sensitivitySlider.type = 'range';
        sensitivitySlider.min = 1;
        sensitivitySlider.max = 100;
        sensitivitySlider.value = config.sensitivity;
        sensitivitySlider.className = 'slider';
        const sensitivityNumber = document.createElement('input');
        sensitivityNumber.type = 'number';
        sensitivityNumber.min = 1;
        sensitivityNumber.max = 100;
        sensitivityNumber.value = config.sensitivity;
        sensitivityNumber.className = 'number-input';
        sensitivityContainer.appendChild(sensitivityLabel);
        sensitivityContainer.appendChild(sensitivitySlider);
        sensitivityContainer.appendChild(sensitivityNumber);
        
        const smoothContainer = document.createElement('div');
        smoothContainer.className = 'flex items-center space-x-2';
        const smoothLabel = document.createElement('label');
        smoothLabel.textContent = 'Smooth Colors';
        smoothLabel.className = 'text-sm';
        const smoothToggle = document.createElement('input');
        smoothToggle.type = 'checkbox';
        smoothToggle.checked = config.smoothColors;
        smoothToggle.className = 'toggle-switch';
        smoothContainer.appendChild(smoothLabel);
        smoothContainer.appendChild(smoothToggle);
        
        controlGroup.appendChild(lineColorContainer);
        controlGroup.appendChild(bgColorContainer);
        controlGroup.appendChild(thicknessContainer);
        controlGroup.appendChild(sensitivityContainer);
        controlGroup.appendChild(smoothContainer);
        
        
        lineColorInput.addEventListener('input', () => {
            effects[name].lineColor = lineColorInput.value;
            debouncedApplyEffects();
        });
        
        bgColorInput.addEventListener('input', () => {
            effects[name].backgroundColor = bgColorInput.value;
            debouncedApplyEffects();
        });
        
        thicknessSlider.addEventListener('input', () => {
            thicknessNumber.value = thicknessSlider.value;
            effects[name].thickness = parseInt(thicknessSlider.value);
            applyAllEffects();
            captureFrame();
        });
        thicknessNumber.addEventListener('change', () => {
            thicknessSlider.value = thicknessNumber.value;
            effects[name].thickness = parseInt(thicknessNumber.value);
            applyAllEffects();
            captureFrame();
        });
        
        sensitivitySlider.addEventListener('input', () => {
            sensitivityNumber.value = sensitivitySlider.value;
            effects[name].sensitivity = parseInt(sensitivitySlider.value);
            applyAllEffects();
            captureFrame();
        });
        sensitivityNumber.addEventListener('change', () => {
            sensitivitySlider.value = sensitivityNumber.value;
            effects[name].sensitivity = parseInt(sensitivityNumber.value);
            applyAllEffects();
            captureFrame();
        });
        
        smoothToggle.addEventListener('change', () => {
            effects[name].smoothColors = smoothToggle.checked;
            applyAllEffects();
            captureFrame();
        });
        
        container.appendChild(controlGroup);
    }

    function addFrostedGlassControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const intensityContainer = document.createElement('div');
        intensityContainer.className = 'flex items-center space-x-2';
        const intensityLabel = document.createElement('label');
        intensityLabel.textContent = 'Blur';
        intensityLabel.className = 'text-sm';
        const intensitySlider = document.createElement('input');
        intensitySlider.type = 'range';
        intensitySlider.min = 0;
        intensitySlider.max = 50;
        intensitySlider.value = config.intensity;
        intensitySlider.className = 'slider';
        const intensityInput = document.createElement('input');
        intensityInput.type = 'number';
        intensityInput.min = 0;
        intensityInput.max = 50;
        intensityInput.value = config.intensity;
        intensityInput.className = 'number-input';
        intensityContainer.appendChild(intensityLabel);
        intensityContainer.appendChild(intensitySlider);
        intensityContainer.appendChild(intensityInput);

        const noiseContainer = document.createElement('div');
        noiseContainer.className = 'flex items-center space-x-2';
        const noiseLabel = document.createElement('label');
        noiseLabel.textContent = 'Noise';
        noiseLabel.className = 'text-sm';
        const noiseSlider = document.createElement('input');
        noiseSlider.type = 'range';
        noiseSlider.min = 0;
        noiseSlider.max = 100;
        noiseSlider.value = config.noise;
        noiseSlider.className = 'slider';
        const noiseInput = document.createElement('input');
        noiseInput.type = 'number';
        noiseInput.min = 0;
        noiseInput.max = 100;
        noiseInput.value = config.noise;
        noiseInput.className = 'number-input';
        noiseContainer.appendChild(noiseLabel);
        noiseContainer.appendChild(noiseSlider);
        noiseContainer.appendChild(noiseInput);

        const opacityContainer = document.createElement('div');
        opacityContainer.className = 'flex items-center space-x-2';
        const opacityLabel = document.createElement('label');
        opacityLabel.textContent = 'Opacity';
        opacityLabel.className = 'text-sm';
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.min = 0;
        opacitySlider.max = 100;
        opacitySlider.value = config.opacity;
        opacitySlider.className = 'slider';
        const opacityInput = document.createElement('input');
        opacityInput.type = 'number';
        opacityInput.min = 0;
        opacityInput.max = 100;
        opacityInput.value = config.opacity;
        opacityInput.className = 'number-input';
        opacityContainer.appendChild(opacityLabel);
        opacityContainer.appendChild(opacitySlider);
        opacityContainer.appendChild(opacityInput);

        const tintContainer = document.createElement('div');
        tintContainer.className = 'flex items-center space-x-2';
        const tintLabel = document.createElement('label');
        tintLabel.textContent = 'Tint';
        tintLabel.className = 'text-sm';
        const tintInput = document.createElement('input');
        tintInput.type = 'color';
        tintInput.value = config.tint;
        tintInput.className = 'color-input';
        tintContainer.appendChild(tintLabel);
        tintContainer.appendChild(tintInput);

        controlGroup.appendChild(intensityContainer);
        controlGroup.appendChild(noiseContainer);
        controlGroup.appendChild(opacityContainer);
        controlGroup.appendChild(tintContainer);

        intensitySlider.addEventListener('input', () => {
            intensityInput.value = intensitySlider.value;
            effects[name].intensity = parseInt(intensitySlider.value);
            applyAllEffects();
            captureFrame();
        });
        intensityInput.addEventListener('change', () => {
            intensitySlider.value = intensityInput.value;
            effects[name].intensity = parseInt(intensityInput.value);
            applyAllEffects();
            captureFrame();
        });

        noiseSlider.addEventListener('input', () => {
            noiseInput.value = noiseSlider.value;
            effects[name].noise = parseInt(noiseSlider.value);
            applyAllEffects();
            captureFrame();
        });
        noiseInput.addEventListener('change', () => {
            noiseSlider.value = noiseInput.value;
            effects[name].noise = parseInt(noiseInput.value);
            applyAllEffects();
            captureFrame();
        });

        opacitySlider.addEventListener('input', () => {
            opacityInput.value = opacitySlider.value;
            effects[name].opacity = parseInt(opacitySlider.value);
            applyAllEffects();
            captureFrame();
        });
        opacityInput.addEventListener('change', () => {
            opacitySlider.value = opacityInput.value;
            effects[name].opacity = parseInt(opacityInput.value);
            applyAllEffects();
            captureFrame();
        });

        tintInput.addEventListener('input', () => {
            effects[name].tint = tintInput.value;
            debouncedApplyEffects();
        });
        tintInput.addEventListener('change', () => {
            effects[name].tint = tintInput.value;
            applyAllEffects();
            captureFrame();
        });

        container.appendChild(controlGroup);
    }

    function addPixelArtControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const sizeContainer = document.createElement('div');
        sizeContainer.className = 'flex items-center space-x-2';
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Pixel Size';
        sizeLabel.className = 'text-sm w-24';
        const sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
        sizeSlider.min = 1;
        sizeSlider.max = 64;
        sizeSlider.value = config.pixelSize;
        sizeSlider.className = 'slider';
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.min = 1;
        sizeInput.max = 64;
        sizeInput.value = config.pixelSize;
        sizeInput.className = 'number-input';
        sizeContainer.appendChild(sizeLabel);
        sizeContainer.appendChild(sizeSlider);
        sizeContainer.appendChild(sizeInput);

        const paletteContainer = document.createElement('div');
        paletteContainer.className = 'flex items-center space-x-2';
        const paletteLabel = document.createElement('label');
        paletteLabel.textContent = 'Palette';
        paletteLabel.className = 'text-sm w-24';
        const paletteSelect = document.createElement('select');
        paletteSelect.className = 'select flex-grow';
        const paletteOptions = Object.keys(PALETTES).concat(['Smart (From Media)', 'Custom']);
        paletteOptions.forEach(p => {
            const option = document.createElement('option');
            option.value = p;
            option.textContent = p;
            if (config.palette === p) option.selected = true;
            paletteSelect.appendChild(option);
        });
        paletteContainer.appendChild(paletteLabel);
        paletteContainer.appendChild(paletteSelect);

        // Palette Editor
        const paletteEditor = document.createElement('div');
        paletteEditor.className = 'palette-grid';
        
        function updatePaletteEditor(colors) {
            paletteEditor.innerHTML = '';
            colors.forEach((color, index) => {
                const colorInput = document.createElement('input');
                colorInput.type = 'color';
                colorInput.className = 'palette-color-input';
                colorInput.value = color.startsWith('#') ? color : '#000000';
                colorInput.title = `Color ${index + 1}`;
                
                colorInput.addEventListener('input', () => {
                    if (effects[name].palette !== 'Custom') {
                        effects[name].palette = 'Custom';
                        paletteSelect.value = 'Custom';
                    }
                    
                    // If switching to Custom, ensure customPalette is initialized from current colors
                    if (effects[name].customPalette.length === 0) {
                        const currentColors = PALETTES[config.palette] || PALETTES['Pico-8'];
                        effects[name].customPalette = [...currentColors];
                    }
                    
                    effects[name].customPalette[index] = colorInput.value;
                    applyAllEffects();
                    captureFrame();
                });
                
                paletteEditor.appendChild(colorInput);
            });
        }

        // Initialize editor with current colors
        let initialColors = config.customPalette.length > 0 ? config.customPalette : (PALETTES[config.palette] || PALETTES['Pico-8']);
        if (config.palette === 'Smart (From Media)') {
            initialColors = cachedSmartPalette ? cachedSmartPalette.map(rgbToHex) : ['#000000'];
        }
        updatePaletteEditor(initialColors);

        const ditherContainer = document.createElement('div');
        ditherContainer.className = 'flex items-center space-x-2';
        const ditherLabel = document.createElement('label');
        ditherLabel.textContent = 'Dithering';
        ditherLabel.className = 'text-sm w-24';
        const ditherSlider = document.createElement('input');
        ditherSlider.type = 'range';
        ditherSlider.min = 0;
        ditherSlider.max = 100;
        ditherSlider.value = config.dithering;
        ditherSlider.className = 'slider';
        const ditherInput = document.createElement('input');
        ditherInput.type = 'number';
        ditherInput.min = 0;
        ditherInput.max = 100;
        ditherInput.value = config.dithering;
        ditherInput.className = 'number-input';
        ditherContainer.appendChild(ditherLabel);
        ditherContainer.appendChild(ditherSlider);
        ditherContainer.appendChild(ditherInput);

        const contrastContainer = document.createElement('div');
        contrastContainer.className = 'flex items-center space-x-2';
        const contrastLabel = document.createElement('label');
        contrastLabel.textContent = 'Contrast';
        contrastLabel.className = 'text-sm w-24';
        const contrastSlider = document.createElement('input');
        contrastSlider.type = 'range';
        contrastSlider.min = -100;
        contrastSlider.max = 100;
        contrastSlider.value = config.contrast || 0;
        contrastSlider.className = 'slider';
        contrastContainer.appendChild(contrastLabel);
        contrastContainer.appendChild(contrastSlider);

        controlGroup.appendChild(sizeContainer);
        controlGroup.appendChild(paletteContainer);
        controlGroup.appendChild(paletteEditor);
        controlGroup.appendChild(ditherContainer);
        controlGroup.appendChild(contrastContainer);

        sizeSlider.addEventListener('input', () => {
            sizeInput.value = sizeSlider.value;
            effects[name].pixelSize = parseInt(sizeSlider.value);
            applyAllEffects();
            captureFrame();
        });
        sizeInput.addEventListener('change', () => {
            sizeSlider.value = sizeInput.value;
            effects[name].pixelSize = parseInt(sizeInput.value);
            applyAllEffects();
            captureFrame();
        });

        paletteSelect.addEventListener('change', () => {
            const val = paletteSelect.value;
            effects[name].palette = val;
            
            if (val !== 'Custom' && val !== 'Smart (From Media)') {
                const presetColors = PALETTES[val];
                effects[name].customPalette = [...presetColors];
                updatePaletteEditor(presetColors);
            } else if (val === 'Custom' && effects[name].customPalette.length > 0) {
                updatePaletteEditor(effects[name].customPalette);
            } else if (val === 'Smart (From Media)') {
                const source = originalImageData || null;
                if (source) {
                    const smartColors = getSmartPalette(source, 16);
                    cachedSmartPalette = smartColors;
                    cachedSmartPaletteSource = source;
                    const hexColors = smartColors.map(rgbToHex);
                    effects[name].customPalette = [...hexColors];
                    updatePaletteEditor(hexColors);
                } else {
                    updatePaletteEditor(['#000000']);
                }
            }
            
            applyAllEffects();
            captureFrame();
        });

        ditherSlider.addEventListener('input', () => {
            ditherInput.value = ditherSlider.value;
            effects[name].dithering = parseInt(ditherSlider.value);
            applyAllEffects();
            captureFrame();
        });
        ditherInput.addEventListener('change', () => {
            ditherSlider.value = ditherInput.value;
            effects[name].dithering = parseInt(ditherInput.value);
            applyAllEffects();
            captureFrame();
        });

        contrastSlider.addEventListener('input', () => {
            effects[name].contrast = parseInt(contrastSlider.value);
            applyAllEffects();
            captureFrame();
        });

        container.appendChild(controlGroup);
    }

    function addPerspective3DControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        const rotationContainer = document.createElement('div');
        rotationContainer.className = 'flex items-center space-x-2';
        const rotationLabel = document.createElement('label');
        rotationLabel.textContent = 'Rotation';
        rotationLabel.className = 'text-sm';
        const rotationSlider = document.createElement('input');
        rotationSlider.type = 'range';
        rotationSlider.min = -45;
        rotationSlider.max = 45;
        rotationSlider.value = config.rotation;
        rotationSlider.className = 'slider';
        const rotationInput = document.createElement('input');
        rotationInput.type = 'number';
        rotationInput.min = -45;
        rotationInput.max = 45;
        rotationInput.value = config.rotation;
        rotationInput.className = 'number-input';
        rotationContainer.appendChild(rotationLabel);
        rotationContainer.appendChild(rotationSlider);
        rotationContainer.appendChild(rotationInput);
        
        const skewXContainer = document.createElement('div');
        skewXContainer.className = 'flex items-center space-x-2';
        const skewXLabel = document.createElement('label');
        skewXLabel.textContent = 'Skew X';
        skewXLabel.className = 'text-sm';
        const skewXSlider = document.createElement('input');
        skewXSlider.type = 'range';
        skewXSlider.min = -50;
        skewXSlider.max = 50;
        skewXSlider.value = config.skewX;
        skewXSlider.className = 'slider';
        const skewXInput = document.createElement('input');
        skewXInput.type = 'number';
        skewXInput.min = -50;
        skewXInput.max = 50;
        skewXInput.value = config.skewX;
        skewXInput.className = 'number-input';
        skewXContainer.appendChild(skewXLabel);
        skewXContainer.appendChild(skewXSlider);
        skewXContainer.appendChild(skewXInput);
        
        const skewYContainer = document.createElement('div');
        skewYContainer.className = 'flex items-center space-x-2';
        const skewYLabel = document.createElement('label');
        skewYLabel.textContent = 'Skew Y';
        skewYLabel.className = 'text-sm';
        const skewYSlider = document.createElement('input');
        skewYSlider.type = 'range';
        skewYSlider.min = -50;
        skewYSlider.max = 50;
        skewYSlider.value = config.skewY;
        skewYSlider.className = 'slider';
        const skewYInput = document.createElement('input');
        skewYInput.type = 'number';
        skewYInput.min = -50;
        skewYInput.max = 50;
        skewYInput.value = config.skewY;
        skewYInput.className = 'number-input';
        skewYContainer.appendChild(skewYLabel);
        skewYContainer.appendChild(skewYSlider);
        skewYContainer.appendChild(skewYInput);
        
        const scaleXContainer = document.createElement('div');
        scaleXContainer.className = 'flex items-center space-x-2';
        const scaleXLabel = document.createElement('label');
        scaleXLabel.textContent = 'Scale X';
        scaleXLabel.className = 'text-sm';
        const scaleXSlider = document.createElement('input');
        scaleXSlider.type = 'range';
        scaleXSlider.min = 50;
        scaleXSlider.max = 150;
        scaleXSlider.value = config.scaleX;
        scaleXSlider.className = 'slider';
        const scaleXInput = document.createElement('input');
        scaleXInput.type = 'number';
        scaleXInput.min = 50;
        scaleXInput.max = 150;
        scaleXInput.value = config.scaleX;
        scaleXInput.className = 'number-input';
        scaleXContainer.appendChild(scaleXLabel);
        scaleXContainer.appendChild(scaleXSlider);
        scaleXContainer.appendChild(scaleXInput);
        
        const scaleYContainer = document.createElement('div');
        scaleYContainer.className = 'flex items-center space-x-2';
        const scaleYLabel = document.createElement('label');
        scaleYLabel.textContent = 'Scale Y';
        scaleYLabel.className = 'text-sm';
        const scaleYSlider = document.createElement('input');
        scaleYSlider.type = 'range';
        scaleYSlider.min = 50;
        scaleYSlider.max = 150;
        scaleYSlider.value = config.scaleY;
        scaleYSlider.className = 'slider';
        const scaleYInput = document.createElement('input');
        scaleYInput.type = 'number';
        scaleYInput.min = 50;
        scaleYInput.max = 150;
        scaleYInput.value = config.scaleY;
        scaleYInput.className = 'number-input';
        scaleYContainer.appendChild(scaleYLabel);
        scaleYContainer.appendChild(scaleYSlider);
        scaleYContainer.appendChild(scaleYInput);
        
        const shadowBlurContainer = document.createElement('div');
        shadowBlurContainer.className = 'flex items-center space-x-2';
        const shadowBlurLabel = document.createElement('label');
        shadowBlurLabel.textContent = 'Shadow Blur';
        shadowBlurLabel.className = 'text-sm';
        const shadowBlurSlider = document.createElement('input');
        shadowBlurSlider.type = 'range';
        shadowBlurSlider.min = 0;
        shadowBlurSlider.max = 30;
        shadowBlurSlider.value = config.shadowBlur;
        shadowBlurSlider.className = 'slider';
        const shadowBlurInput = document.createElement('input');
        shadowBlurInput.type = 'number';
        shadowBlurInput.min = 0;
        shadowBlurInput.max = 30;
        shadowBlurInput.value = config.shadowBlur;
        shadowBlurInput.className = 'number-input';
        shadowBlurContainer.appendChild(shadowBlurLabel);
        shadowBlurContainer.appendChild(shadowBlurSlider);
        shadowBlurContainer.appendChild(shadowBlurInput);
        
        const shadowOpacityContainer = document.createElement('div');
        shadowOpacityContainer.className = 'flex items-center space-x-2';
        const shadowOpacityLabel = document.createElement('label');
        shadowOpacityLabel.textContent = 'Shadow Opacity';
        shadowOpacityLabel.className = 'text-sm';
        const shadowOpacitySlider = document.createElement('input');
        shadowOpacitySlider.type = 'range';
        shadowOpacitySlider.min = 0;
        shadowOpacitySlider.max = 100;
        shadowOpacitySlider.value = config.shadowOpacity;
        shadowOpacitySlider.className = 'slider';
        const shadowOpacityInput = document.createElement('input');
        shadowOpacityInput.type = 'number';
        shadowOpacityInput.min = 0;
        shadowOpacityInput.max = 100;
        shadowOpacityInput.value = config.shadowOpacity;
        shadowOpacityInput.className = 'number-input';
        shadowOpacityContainer.appendChild(shadowOpacityLabel);
        shadowOpacityContainer.appendChild(shadowOpacitySlider);
        shadowOpacityContainer.appendChild(shadowOpacityInput);
        
        controlGroup.appendChild(rotationContainer);
        controlGroup.appendChild(skewXContainer);
        controlGroup.appendChild(skewYContainer);
        controlGroup.appendChild(scaleXContainer);
        controlGroup.appendChild(scaleYContainer);
        controlGroup.appendChild(shadowBlurContainer);
        controlGroup.appendChild(shadowOpacityContainer);
        
        rotationSlider.addEventListener('input', () => {
            rotationInput.value = rotationSlider.value;
            effects[name].rotation = parseFloat(rotationSlider.value);
            applyAllEffects();
            captureFrame();
        });
        rotationInput.addEventListener('change', () => {
            rotationSlider.value = rotationInput.value;
            effects[name].rotation = parseFloat(rotationInput.value);
            applyAllEffects();
            captureFrame();
        });
        
        skewXSlider.addEventListener('input', () => {
            skewXInput.value = skewXSlider.value;
            effects[name].skewX = parseFloat(skewXSlider.value);
            applyAllEffects();
            captureFrame();
        });
        skewXInput.addEventListener('change', () => {
            skewXSlider.value = skewXInput.value;
            effects[name].skewX = parseFloat(skewXInput.value);
            applyAllEffects();
            captureFrame();
        });
        
        skewYSlider.addEventListener('input', () => {
            skewYInput.value = skewYSlider.value;
            effects[name].skewY = parseFloat(skewYSlider.value);
            applyAllEffects();
            captureFrame();
        });
        skewYInput.addEventListener('change', () => {
            skewYSlider.value = skewYInput.value;
            effects[name].skewY = parseFloat(skewYInput.value);
            applyAllEffects();
            captureFrame();
        });
        
        scaleXSlider.addEventListener('input', () => {
            scaleXInput.value = scaleXSlider.value;
            effects[name].scaleX = parseFloat(scaleXSlider.value);
            applyAllEffects();
            captureFrame();
        });
        scaleXInput.addEventListener('change', () => {
            scaleXSlider.value = scaleXInput.value;
            effects[name].scaleX = parseFloat(scaleXInput.value);
            applyAllEffects();
            captureFrame();
        });
        
        scaleYSlider.addEventListener('input', () => {
            scaleYInput.value = scaleYSlider.value;
            effects[name].scaleY = parseFloat(scaleYSlider.value);
            applyAllEffects();
            captureFrame();
        });
        scaleYInput.addEventListener('change', () => {
            scaleYSlider.value = scaleYInput.value;
            effects[name].scaleY = parseFloat(scaleYInput.value);
            applyAllEffects();
            captureFrame();
        });
        
        shadowBlurSlider.addEventListener('input', () => {
            shadowBlurInput.value = shadowBlurSlider.value;
            effects[name].shadowBlur = parseFloat(shadowBlurSlider.value);
            applyAllEffects();
            captureFrame();
        });
        shadowBlurInput.addEventListener('change', () => {
            shadowBlurSlider.value = shadowBlurInput.value;
            effects[name].shadowBlur = parseFloat(shadowBlurInput.value);
            applyAllEffects();
            captureFrame();
        });
        
        shadowOpacitySlider.addEventListener('input', () => {
            shadowOpacityInput.value = shadowOpacitySlider.value;
            effects[name].shadowOpacity = parseFloat(shadowOpacitySlider.value);
            applyAllEffects();
            captureFrame();
        });
        shadowOpacityInput.addEventListener('change', () => {
            shadowOpacitySlider.value = shadowOpacityInput.value;
            effects[name].shadowOpacity = parseFloat(shadowOpacityInput.value);
            applyAllEffects();
            captureFrame();
        });
        
        container.appendChild(controlGroup);
    }

    function addSpinningRainbowControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        const opacityContainer = document.createElement('div');
        opacityContainer.className = 'flex items-center space-x-2';
        const opacityLabel = document.createElement('label');
        opacityLabel.textContent = 'Opacity';
        opacityLabel.className = 'text-sm';
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.min = 0;
        opacitySlider.max = 100;
        opacitySlider.value = config.opacity;
        opacitySlider.className = 'slider';
        const opacityInput = document.createElement('input');
        opacityInput.type = 'number';
        opacityInput.min = 0;
        opacityInput.max = 100;
        opacityInput.value = config.opacity;
        opacityInput.className = 'number-input';
        opacityContainer.appendChild(opacityLabel);
        opacityContainer.appendChild(opacitySlider);
        opacityContainer.appendChild(opacityInput);
        
        const speedContainer = document.createElement('div');
        speedContainer.className = 'flex items-center space-x-2';
        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Speed';
        speedLabel.className = 'text-sm';
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = 0;
        speedSlider.max = 100;
        speedSlider.value = config.speed;
        speedSlider.className = 'slider';
        const speedInput = document.createElement('input');
        speedInput.type = 'number';
        speedInput.min = 0;
        speedInput.max = 100;
        speedInput.value = config.speed;
        speedInput.className = 'number-input';
        speedContainer.appendChild(speedLabel);
        speedContainer.appendChild(speedSlider);
        speedContainer.appendChild(speedInput);
        
        controlGroup.appendChild(opacityContainer);
        controlGroup.appendChild(speedContainer);
        
        opacitySlider.addEventListener('input', () => {
            opacityInput.value = opacitySlider.value;
            effects[name].opacity = parseFloat(opacitySlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        opacityInput.addEventListener('change', () => {
            opacitySlider.value = opacityInput.value;
            effects[name].opacity = parseFloat(opacityInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        
        speedSlider.addEventListener('input', () => {
            speedInput.value = speedSlider.value;
            effects[name].speed = parseFloat(speedSlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        speedInput.addEventListener('change', () => {
            speedSlider.value = speedInput.value;
            effects[name].speed = parseFloat(speedInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        
        container.appendChild(controlGroup);
    }

    function addLiquidMarbleControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        
        const opacityContainer = document.createElement('div');
        opacityContainer.className = 'flex items-center space-x-2';
        const opacityLabel = document.createElement('label');
        opacityLabel.textContent = 'Opacity';
        opacityLabel.className = 'text-sm';
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.min = 0;
        opacitySlider.max = 100;
        opacitySlider.value = config.opacity;
        opacitySlider.className = 'slider';
        const opacityInput = document.createElement('input');
        opacityInput.type = 'number';
        opacityInput.min = 0;
        opacityInput.max = 100;
        opacityInput.value = config.opacity;
        opacityInput.className = 'number-input';
        opacityContainer.appendChild(opacityLabel);
        opacityContainer.appendChild(opacitySlider);
        opacityContainer.appendChild(opacityInput);
        
        const speedContainer = document.createElement('div');
        speedContainer.className = 'flex items-center space-x-2';
        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Speed';
        speedLabel.className = 'text-sm';
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = 0;
        speedSlider.max = 100;
        speedSlider.value = config.speed;
        speedSlider.className = 'slider';
        const speedInput = document.createElement('input');
        speedInput.type = 'number';
        speedInput.min = 0;
        speedInput.max = 100;
        speedInput.value = config.speed;
        speedInput.className = 'number-input';
        speedContainer.appendChild(speedLabel);
        speedContainer.appendChild(speedSlider);
        speedContainer.appendChild(speedInput);
        
        const turbulenceContainer = document.createElement('div');
        turbulenceContainer.className = 'flex items-center space-x-2';
        const turbulenceLabel = document.createElement('label');
        turbulenceLabel.textContent = 'Turbulence';
        turbulenceLabel.className = 'text-sm';
        const turbulenceSlider = document.createElement('input');
        turbulenceSlider.type = 'range';
        turbulenceSlider.min = 0;
        turbulenceSlider.max = 100;
        turbulenceSlider.value = config.turbulence;
        turbulenceSlider.className = 'slider';
        const turbulenceInput = document.createElement('input');
        turbulenceInput.type = 'number';
        turbulenceInput.min = 0;
        turbulenceInput.max = 100;
        turbulenceInput.value = config.turbulence;
        turbulenceInput.className = 'number-input';
        turbulenceContainer.appendChild(turbulenceLabel);
        turbulenceContainer.appendChild(turbulenceSlider);
        turbulenceContainer.appendChild(turbulenceInput);

        const scaleContainer = document.createElement('div');
        scaleContainer.className = 'flex items-center space-x-2';
        const scaleLabel = document.createElement('label');
        scaleLabel.textContent = 'Scale';
        scaleLabel.className = 'text-sm';
        const scaleSlider = document.createElement('input');
        scaleSlider.type = 'range';
        scaleSlider.min = 1;
        scaleSlider.max = 200;
        scaleSlider.value = config.scale;
        scaleSlider.className = 'slider';
        const scaleInput = document.createElement('input');
        scaleInput.type = 'number';
        scaleInput.min = 1;
        scaleInput.max = 200;
        scaleInput.value = config.scale;
        scaleInput.className = 'number-input';
        scaleContainer.appendChild(scaleLabel);
        scaleContainer.appendChild(scaleSlider);
        scaleContainer.appendChild(scaleInput);

        const colorInfluenceContainer = document.createElement('div');
        colorInfluenceContainer.className = 'flex items-center space-x-2';
        const colorInfluenceLabel = document.createElement('label');
        colorInfluenceLabel.textContent = 'Color Influence';
        colorInfluenceLabel.className = 'text-sm';
        const colorInfluenceSlider = document.createElement('input');
        colorInfluenceSlider.type = 'range';
        colorInfluenceSlider.min = 0;
        colorInfluenceSlider.max = 100;
        colorInfluenceSlider.value = config.colorInfluence;
        colorInfluenceSlider.className = 'slider';
        const colorInfluenceInput = document.createElement('input');
        colorInfluenceInput.type = 'number';
        colorInfluenceInput.min = 0;
        colorInfluenceInput.max = 100;
        colorInfluenceInput.value = config.colorInfluence;
        colorInfluenceInput.className = 'number-input';
        colorInfluenceContainer.appendChild(colorInfluenceLabel);
        colorInfluenceContainer.appendChild(colorInfluenceSlider);
        colorInfluenceContainer.appendChild(colorInfluenceInput);

        const flowXContainer = document.createElement('div');
        flowXContainer.className = 'flex items-center space-x-2';
        const flowXLabel = document.createElement('label');
        flowXLabel.textContent = 'Flow X';
        flowXLabel.className = 'text-sm';
        const flowXSlider = document.createElement('input');
        flowXSlider.type = 'range';
        flowXSlider.min = -100;
        flowXSlider.max = 100;
        flowXSlider.value = config.flowX;
        flowXSlider.className = 'slider';
        const flowXInput = document.createElement('input');
        flowXInput.type = 'number';
        flowXInput.min = -100;
        flowXInput.max = 100;
        flowXInput.value = config.flowX;
        flowXInput.className = 'number-input';
        flowXContainer.appendChild(flowXLabel);
        flowXContainer.appendChild(flowXSlider);
        flowXContainer.appendChild(flowXInput);

        const flowYContainer = document.createElement('div');
        flowYContainer.className = 'flex items-center space-x-2';
        const flowYLabel = document.createElement('label');
        flowYLabel.textContent = 'Flow Y';
        flowYLabel.className = 'text-sm';
        const flowYSlider = document.createElement('input');
        flowYSlider.type = 'range';
        flowYSlider.min = -100;
        flowYSlider.max = 100;
        flowYSlider.value = config.flowY;
        flowYSlider.className = 'slider';
        const flowYInput = document.createElement('input');
        flowYInput.type = 'number';
        flowYInput.min = -100;
        flowYInput.max = 100;
        flowYInput.value = config.flowY;
        flowYInput.className = 'number-input';
        flowYContainer.appendChild(flowYLabel);
        flowYContainer.appendChild(flowYSlider);
        flowYContainer.appendChild(flowYInput);
        
        controlGroup.appendChild(opacityContainer);
        controlGroup.appendChild(speedContainer);
        controlGroup.appendChild(turbulenceContainer);
        controlGroup.appendChild(scaleContainer);
        controlGroup.appendChild(colorInfluenceContainer);
        controlGroup.appendChild(flowXContainer);
        controlGroup.appendChild(flowYContainer);
        
        opacitySlider.addEventListener('input', () => {
            opacityInput.value = opacitySlider.value;
            effects[name].opacity = parseFloat(opacitySlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        opacityInput.addEventListener('change', () => {
            opacitySlider.value = opacityInput.value;
            effects[name].opacity = parseFloat(opacityInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        
        speedSlider.addEventListener('input', () => {
            speedInput.value = speedSlider.value;
            effects[name].speed = parseFloat(speedSlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        speedInput.addEventListener('change', () => {
            speedSlider.value = speedInput.value;
            effects[name].speed = parseFloat(speedInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        
        turbulenceSlider.addEventListener('input', () => {
            turbulenceInput.value = turbulenceSlider.value;
            effects[name].turbulence = parseFloat(turbulenceSlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        turbulenceInput.addEventListener('change', () => {
            turbulenceSlider.value = turbulenceInput.value;
            effects[name].turbulence = parseFloat(turbulenceInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });

        scaleSlider.addEventListener('input', () => {
            scaleInput.value = scaleSlider.value;
            effects[name].scale = parseFloat(scaleSlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        scaleInput.addEventListener('change', () => {
            scaleSlider.value = scaleInput.value;
            effects[name].scale = parseFloat(scaleInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });

        colorInfluenceSlider.addEventListener('input', () => {
            colorInfluenceInput.value = colorInfluenceSlider.value;
            effects[name].colorInfluence = parseFloat(colorInfluenceSlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        colorInfluenceInput.addEventListener('change', () => {
            colorInfluenceSlider.value = colorInfluenceInput.value;
            effects[name].colorInfluence = parseFloat(colorInfluenceInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });

        flowXSlider.addEventListener('input', () => {
            flowXInput.value = flowXSlider.value;
            effects[name].flowX = parseFloat(flowXSlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        flowXInput.addEventListener('change', () => {
            flowXSlider.value = flowXInput.value;
            effects[name].flowX = parseFloat(flowXInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });

        flowYSlider.addEventListener('input', () => {
            flowYInput.value = flowYSlider.value;
            effects[name].flowY = parseFloat(flowYSlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        flowYInput.addEventListener('change', () => {
            flowYSlider.value = flowYInput.value;
            effects[name].flowY = parseFloat(flowYInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        
        container.appendChild(controlGroup);
    }

    function addCRTControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const intensityContainer = document.createElement('div');
        intensityContainer.className = 'flex items-center space-x-2';
        const intensityLabel = document.createElement('label');
        intensityLabel.textContent = 'Intensity';
        intensityLabel.className = 'text-sm';
        const intensitySlider = document.createElement('input');
        intensitySlider.type = 'range';
        intensitySlider.min = 0;
        intensitySlider.max = 100;
        intensitySlider.value = config.intensity;
        intensitySlider.className = 'slider';
        const intensityInput = document.createElement('input');
        intensityInput.type = 'number';
        intensityInput.min = 0;
        intensityInput.max = 100;
        intensityInput.value = config.intensity;
        intensityInput.className = 'number-input';
        intensityContainer.appendChild(intensityLabel);
        intensityContainer.appendChild(intensitySlider);
        intensityContainer.appendChild(intensityInput);

        const curvatureContainer = document.createElement('div');
        curvatureContainer.className = 'flex items-center space-x-2';
        const curvatureLabel = document.createElement('label');
        curvatureLabel.textContent = 'Curvature';
        curvatureLabel.className = 'text-sm';
        const curvatureSlider = document.createElement('input');
        curvatureSlider.type = 'range';
        curvatureSlider.min = 0;
        curvatureSlider.max = 100;
        curvatureSlider.value = config.curvature;
        curvatureSlider.className = 'slider';
        const curvatureInput = document.createElement('input');
        curvatureInput.type = 'number';
        curvatureInput.min = 0;
        curvatureInput.max = 100;
        curvatureInput.value = config.curvature;
        curvatureInput.className = 'number-input';
        curvatureContainer.appendChild(curvatureLabel);
        curvatureContainer.appendChild(curvatureSlider);
        curvatureContainer.appendChild(curvatureInput);

        const scanlinesContainer = document.createElement('div');
        scanlinesContainer.className = 'flex items-center space-x-2';
        const scanlinesLabel = document.createElement('label');
        scanlinesLabel.textContent = 'Scanlines';
        scanlinesLabel.className = 'text-sm';
        const scanlinesSlider = document.createElement('input');
        scanlinesSlider.type = 'range';
        scanlinesSlider.min = 0;
        scanlinesSlider.max = 100;
        scanlinesSlider.value = config.scanlines;
        scanlinesSlider.className = 'slider';
        const scanlinesInput = document.createElement('input');
        scanlinesInput.type = 'number';
        scanlinesInput.min = 0;
        scanlinesInput.max = 100;
        scanlinesInput.value = config.scanlines;
        scanlinesInput.className = 'number-input';
        scanlinesContainer.appendChild(scanlinesLabel);
        scanlinesContainer.appendChild(scanlinesSlider);
        scanlinesContainer.appendChild(scanlinesInput);

        const glowContainer = document.createElement('div');
        glowContainer.className = 'flex items-center space-x-2';
        const glowLabel = document.createElement('label');
        glowLabel.textContent = 'Glow';
        glowLabel.className = 'text-sm';
        const glowToggle = document.createElement('input');
        glowToggle.type = 'checkbox';
        glowToggle.checked = config.glow;
        glowToggle.className = 'toggle-switch';
        glowContainer.appendChild(glowLabel);
        glowContainer.appendChild(glowToggle);

        controlGroup.appendChild(intensityContainer);
        controlGroup.appendChild(curvatureContainer);
        controlGroup.appendChild(scanlinesContainer);
        controlGroup.appendChild(glowContainer);

        intensitySlider.addEventListener('input', () => {
            intensityInput.value = intensitySlider.value;
            effects[name].intensity = parseFloat(intensitySlider.value);
            applyAllEffects();
            captureFrame();
        });
        intensityInput.addEventListener('change', () => {
            intensitySlider.value = intensityInput.value;
            effects[name].intensity = parseFloat(intensityInput.value);
            applyAllEffects();
            captureFrame();
        });

        curvatureSlider.addEventListener('input', () => {
            curvatureInput.value = curvatureSlider.value;
            effects[name].curvature = parseFloat(curvatureSlider.value);
            applyAllEffects();
            captureFrame();
        });
        curvatureInput.addEventListener('change', () => {
            curvatureSlider.value = curvatureInput.value;
            effects[name].curvature = parseFloat(curvatureInput.value);
            applyAllEffects();
            captureFrame();
        });

        scanlinesSlider.addEventListener('input', () => {
            scanlinesInput.value = scanlinesSlider.value;
            effects[name].scanlines = parseFloat(scanlinesSlider.value);
            applyAllEffects();
            captureFrame();
        });
        scanlinesInput.addEventListener('change', () => {
            scanlinesSlider.value = scanlinesInput.value;
            effects[name].scanlines = parseFloat(scanlinesInput.value);
            applyAllEffects();
            captureFrame();
        });

        glowToggle.addEventListener('change', () => {
            effects[name].glow = glowToggle.checked;
            applyAllEffects();
            captureFrame();
        });

        container.appendChild(controlGroup);
    }

    function addFilmGrainControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const intensityContainer = document.createElement('div');
        intensityContainer.className = 'flex items-center space-x-2';
        const intensityLabel = document.createElement('label');
        intensityLabel.textContent = 'Intensity';
        intensityLabel.className = 'text-sm';
        const intensitySlider = document.createElement('input');
        intensitySlider.type = 'range';
        intensitySlider.min = 0;
        intensitySlider.max = 100;
        intensitySlider.value = config.intensity;
        intensitySlider.className = 'slider';
        const intensityInput = document.createElement('input');
        intensityInput.type = 'number';
        intensityInput.min = 0;
        intensityInput.max = 100;
        intensityInput.value = config.intensity;
        intensityInput.className = 'number-input';
        intensityContainer.appendChild(intensityLabel);
        intensityContainer.appendChild(intensitySlider);
        intensityContainer.appendChild(intensityInput);

        const sizeContainer = document.createElement('div');
        sizeContainer.className = 'flex items-center space-x-2';
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Size';
        sizeLabel.className = 'text-sm';
        const sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
        sizeSlider.min = 0;
        sizeSlider.max = 100;
        sizeSlider.value = config.size;
        sizeSlider.className = 'slider';
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.min = 0;
        sizeInput.max = 100;
        sizeInput.value = config.size;
        sizeInput.className = 'number-input';
        sizeContainer.appendChild(sizeLabel);
        sizeContainer.appendChild(sizeSlider);
        sizeContainer.appendChild(sizeInput);

        const monochromeContainer = document.createElement('div');
        monochromeContainer.className = 'flex items-center space-x-2';
        const monochromeLabel = document.createElement('label');
        monochromeLabel.textContent = 'Monochrome';
        monochromeLabel.className = 'text-sm';
        const monochromeToggle = document.createElement('input');
        monochromeToggle.type = 'checkbox';
        monochromeToggle.checked = config.monochrome;
        monochromeToggle.className = 'toggle-switch';
        monochromeContainer.appendChild(monochromeLabel);
        monochromeContainer.appendChild(monochromeToggle);

        controlGroup.appendChild(intensityContainer);
        controlGroup.appendChild(sizeContainer);
        controlGroup.appendChild(monochromeContainer);

        intensitySlider.addEventListener('input', () => {
            intensityInput.value = intensitySlider.value;
            effects[name].intensity = parseFloat(intensitySlider.value);
            applyAllEffects();
            captureFrame();
        });
        intensityInput.addEventListener('change', () => {
            intensitySlider.value = intensityInput.value;
            effects[name].intensity = parseFloat(intensityInput.value);
            applyAllEffects();
            captureFrame();
        });

        sizeSlider.addEventListener('input', () => {
            sizeInput.value = sizeSlider.value;
            effects[name].size = parseFloat(sizeSlider.value);
            applyAllEffects();
            captureFrame();
        });
        sizeInput.addEventListener('change', () => {
            sizeSlider.value = sizeInput.value;
            effects[name].size = parseFloat(sizeInput.value);
            applyAllEffects();
            captureFrame();
        });

        monochromeToggle.addEventListener('change', () => {
            effects[name].monochrome = monochromeToggle.checked;
            applyAllEffects();
            captureFrame();
        });

        container.appendChild(controlGroup);
    }

    function addPixelSortControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const thresholdContainer = document.createElement('div');
        thresholdContainer.className = 'flex items-center space-x-2';
        const thresholdLabel = document.createElement('label');
        thresholdLabel.textContent = 'Threshold';
        thresholdLabel.className = 'text-sm';
        const thresholdSlider = document.createElement('input');
        thresholdSlider.type = 'range';
        thresholdSlider.min = 0;
        thresholdSlider.max = 255;
        thresholdSlider.value = config.threshold;
        thresholdSlider.className = 'slider';
        const thresholdInput = document.createElement('input');
        thresholdInput.type = 'number';
        thresholdInput.min = 0;
        thresholdInput.max = 255;
        thresholdInput.value = config.threshold;
        thresholdInput.className = 'number-input';
        thresholdContainer.appendChild(thresholdLabel);
        thresholdContainer.appendChild(thresholdSlider);
        thresholdContainer.appendChild(thresholdInput);

        const directionContainer = document.createElement('div');
        directionContainer.className = 'flex items-center space-x-2';
        const directionLabel = document.createElement('label');
        directionLabel.textContent = 'Direction (Deg)';
        directionLabel.className = 'text-sm';
        const directionSlider = document.createElement('input');
        directionSlider.type = 'range';
        directionSlider.min = 0;
        directionSlider.max = 360;
        directionSlider.value = config.direction;
        directionSlider.className = 'slider';
        const directionInput = document.createElement('input');
        directionInput.type = 'number';
        directionInput.min = 0;
        directionInput.max = 360;
        directionInput.value = config.direction;
        directionInput.className = 'number-input';
        directionContainer.appendChild(directionLabel);
        directionContainer.appendChild(directionSlider);
        directionContainer.appendChild(directionInput);

        controlGroup.appendChild(thresholdContainer);
        controlGroup.appendChild(directionContainer);

        thresholdSlider.addEventListener('input', () => {
            thresholdInput.value = thresholdSlider.value;
            effects[name].threshold = parseFloat(thresholdSlider.value);
            applyAllEffects();
            captureFrame();
        });
        thresholdInput.addEventListener('change', () => {
            thresholdSlider.value = thresholdInput.value;
            effects[name].threshold = parseFloat(thresholdInput.value);
            applyAllEffects();
            captureFrame();
        });

        directionSlider.addEventListener('input', () => {
            directionInput.value = directionSlider.value;
            effects[name].direction = parseFloat(directionSlider.value);
            applyAllEffects();
            captureFrame();
        });
        directionInput.addEventListener('change', () => {
            directionSlider.value = directionInput.value;
            effects[name].direction = parseFloat(directionInput.value);
            applyAllEffects();
            captureFrame();
        });

        container.appendChild(controlGroup);
    }

    function addAsciiArtControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const sizeContainer = document.createElement('div');
        sizeContainer.className = 'flex items-center space-x-2';
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Size';
        sizeLabel.className = 'text-sm';
        const sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
        sizeSlider.min = 1;
        sizeSlider.max = 50;
        sizeSlider.value = config.size;
        sizeSlider.className = 'slider';
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.min = 1;
        sizeInput.max = 50;
        sizeInput.value = config.size;
        sizeInput.className = 'number-input';
        sizeContainer.appendChild(sizeLabel);
        sizeContainer.appendChild(sizeSlider);
        sizeContainer.appendChild(sizeInput);

        const fontSizeContainer = document.createElement('div');
        fontSizeContainer.className = 'flex items-center space-x-2 mt-2';
        const fontSizeLabel = document.createElement('label');
        fontSizeLabel.textContent = 'Font Size';
        fontSizeLabel.className = 'text-sm';
        const fontSizeSlider = document.createElement('input');
        fontSizeSlider.type = 'range';
        fontSizeSlider.min = 2;
        fontSizeSlider.max = 50;
        fontSizeSlider.value = config.fontSize;
        fontSizeSlider.className = 'slider';
        const fontSizeInput = document.createElement('input');
        fontSizeInput.type = 'number';
        fontSizeInput.min = 2;
        fontSizeInput.max = 50;
        fontSizeInput.value = config.fontSize;
        fontSizeInput.className = 'number-input';
        fontSizeContainer.appendChild(fontSizeLabel);
        fontSizeContainer.appendChild(fontSizeSlider);
        fontSizeContainer.appendChild(fontSizeInput);

        const symbolsContainer = document.createElement('div');
        symbolsContainer.className = 'flex flex-col mt-2 space-y-1';
        const symbolsLabel = document.createElement('label');
        symbolsLabel.textContent = 'Symbols (Dark to Light)';
        symbolsLabel.className = 'text-sm mb-1';
        const symbolsInput = document.createElement('input');
        symbolsInput.type = 'text';
        symbolsInput.value = config.symbols;
        symbolsInput.style.backgroundColor = '#2c2c2c';
        symbolsInput.style.color = 'white';
        symbolsInput.style.border = '1px solid #444';
        symbolsInput.style.borderRadius = '4px';
        symbolsInput.style.padding = '4px';
        symbolsContainer.appendChild(symbolsLabel);
        symbolsContainer.appendChild(symbolsInput);

        const invertContainer = document.createElement('div');
        invertContainer.className = 'flex items-center space-x-2 mt-2';
        const invertLabel = document.createElement('label');
        invertLabel.textContent = 'Invert';
        invertLabel.className = 'text-sm';
        const invertToggle = document.createElement('input');
        invertToggle.type = 'checkbox';
        invertToggle.checked = config.invert;
        invertToggle.className = 'toggle-switch';
        invertContainer.appendChild(invertLabel);
        invertContainer.appendChild(invertToggle);

        const fontContainer = document.createElement('div');
        fontContainer.className = 'flex flex-col mt-2 space-y-1';
        const fontLabel = document.createElement('label');
        fontLabel.textContent = 'Custom Font (.ttf, .woff)';
        fontLabel.className = 'text-sm mb-1';
        const fontInput = document.createElement('input');
        fontInput.type = 'file';
        fontInput.accept = '.ttf,.woff,.woff2,.otf';
        fontInput.className = 'text-sm text-gray-300';
        fontContainer.appendChild(fontLabel);
        fontContainer.appendChild(fontInput);

        controlGroup.appendChild(sizeContainer);
        controlGroup.appendChild(fontSizeContainer);
        controlGroup.appendChild(symbolsContainer);
        controlGroup.appendChild(fontContainer);
        controlGroup.appendChild(invertContainer);

        fontInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            const rawName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "");
            const uniqueName = `customAsciiFont_${rawName}_${Date.now()}`;
            
            const newFont = new FontFace(uniqueName, `url(${url})`);
            newFont.load().then((loadedFace) => {
                document.fonts.add(loadedFace);
                effects[name].fontFamily = uniqueName;
                applyAllEffects();
                captureFrame();
            }).catch(err => {
                console.error("Font loading error:", err);
            });
        });

        sizeSlider.addEventListener('input', () => {
            sizeInput.value = sizeSlider.value;
            effects[name].size = parseFloat(sizeSlider.value);
            applyAllEffects();
            captureFrame();
        });
        sizeInput.addEventListener('change', () => {
            sizeSlider.value = sizeInput.value;
            effects[name].size = parseFloat(sizeInput.value);
            applyAllEffects();
            captureFrame();
        });

        fontSizeSlider.addEventListener('input', () => {
            fontSizeInput.value = fontSizeSlider.value;
            effects[name].fontSize = parseFloat(fontSizeSlider.value);
            applyAllEffects();
            captureFrame();
        });
        fontSizeInput.addEventListener('change', () => {
            fontSizeSlider.value = fontSizeInput.value;
            effects[name].fontSize = parseFloat(fontSizeInput.value);
            applyAllEffects();
            captureFrame();
        });

        symbolsInput.addEventListener('input', (e) => {
            effects[name].symbols = e.target.value || ' ';
            applyAllEffects();
            captureFrame();
        });

        invertToggle.addEventListener('change', () => {
            effects[name].invert = invertToggle.checked;
            applyAllEffects();
            captureFrame();
        });

        container.appendChild(controlGroup);
    }

    function addMatrixRainControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        let colorUpdateFrameId = null;

        if (!effects[name].color) {
            effects[name].color = '#00ff00';
        }
        
        const opacityContainer = document.createElement('div');
        opacityContainer.className = 'flex items-center space-x-2';
        const opacityLabel = document.createElement('label');
        opacityLabel.textContent = 'Opacity';
        opacityLabel.className = 'text-sm';
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.min = 0;
        opacitySlider.max = 100;
        opacitySlider.value = config.opacity;
        opacitySlider.className = 'slider';
        const opacityInput = document.createElement('input');
        opacityInput.type = 'number';
        opacityInput.min = 0;
        opacityInput.max = 100;
        opacityInput.value = config.opacity;
        opacityInput.className = 'number-input';
        opacityContainer.appendChild(opacityLabel);
        opacityContainer.appendChild(opacitySlider);
        opacityContainer.appendChild(opacityInput);
        
        const speedContainer = document.createElement('div');
        speedContainer.className = 'flex items-center space-x-2';
        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Speed';
        speedLabel.className = 'text-sm';
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = 0;
        speedSlider.max = 100;
        speedSlider.value = config.speed;
        speedSlider.className = 'slider';
        const speedInput = document.createElement('input');
        speedInput.type = 'number';
        speedInput.min = 0;
        speedInput.max = 100;
        speedInput.value = config.speed;
        speedInput.className = 'number-input';
        speedContainer.appendChild(speedLabel);
        speedContainer.appendChild(speedSlider);
        speedContainer.appendChild(speedInput);
        
        const densityContainer = document.createElement('div');
        densityContainer.className = 'flex items-center space-x-2';
        const densityLabel = document.createElement('label');
        densityLabel.textContent = 'Density';
        densityLabel.className = 'text-sm';
        const densitySlider = document.createElement('input');
        densitySlider.type = 'range';
        densitySlider.min = 1;
        densitySlider.max = 100;
        densitySlider.value = config.density;
        densitySlider.className = 'slider';
        const densityInput = document.createElement('input');
        densityInput.type = 'number';
        densityInput.min = 1;
        densityInput.max = 100;
        densityInput.value = config.density;
        densityInput.className = 'number-input';
        densityContainer.appendChild(densityLabel);
        densityContainer.appendChild(densitySlider);
        densityContainer.appendChild(densityInput);
        
        const sizeContainer = document.createElement('div');
        sizeContainer.className = 'flex items-center space-x-2';
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Size';
        sizeLabel.className = 'text-sm';
        const sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
    sizeSlider.min = 20;
    sizeSlider.max = 200;
        sizeSlider.value = config.size;
        sizeSlider.className = 'slider';
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
    sizeInput.min = 20;
    sizeInput.max = 200;
        sizeInput.value = config.size;
        sizeInput.className = 'number-input';
        sizeContainer.appendChild(sizeLabel);
        sizeContainer.appendChild(sizeSlider);
        sizeContainer.appendChild(sizeInput);

    const colorContainer = document.createElement('div');
    colorContainer.className = 'flex items-center space-x-2';
    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Color';
    colorLabel.className = 'text-sm';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = effects[name].color || '#00ff00';
    colorInput.className = 'color-input';
    colorContainer.appendChild(colorLabel);
    colorContainer.appendChild(colorInput);
        
        controlGroup.appendChild(opacityContainer);
        controlGroup.appendChild(speedContainer);
        controlGroup.appendChild(densityContainer);
        controlGroup.appendChild(sizeContainer);
    controlGroup.appendChild(colorContainer);
        
        opacitySlider.addEventListener('input', () => {
            opacityInput.value = opacitySlider.value;
            effects[name].opacity = parseFloat(opacitySlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        opacityInput.addEventListener('change', () => {
            opacitySlider.value = opacityInput.value;
            effects[name].opacity = parseFloat(opacityInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        
        speedSlider.addEventListener('input', () => {
            speedInput.value = speedSlider.value;
            effects[name].speed = parseFloat(speedSlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        speedInput.addEventListener('change', () => {
            speedSlider.value = speedInput.value;
            effects[name].speed = parseFloat(speedInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        
        densitySlider.addEventListener('input', () => {
            densityInput.value = densitySlider.value;
            effects[name].density = parseFloat(densitySlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        densityInput.addEventListener('change', () => {
            densitySlider.value = densityInput.value;
            effects[name].density = parseFloat(densityInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        
        sizeSlider.addEventListener('input', () => {
            sizeInput.value = sizeSlider.value;
            effects[name].size = parseFloat(sizeSlider.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        sizeInput.addEventListener('change', () => {
            sizeSlider.value = sizeInput.value;
            effects[name].size = parseFloat(sizeInput.value);
            applyAllEffects();
            captureFrame();

            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });

        colorInput.addEventListener('input', () => {
            effects[name].color = colorInput.value;
            debouncedApplyEffects();
        });
        
        colorInput.addEventListener('change', () => {
            effects[name].color = colorInput.value;
            applyAllEffects();
            captureFrame();
            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            }
        });

        colorInput.addEventListener('change', () => {
            effects[name].color = colorInput.value;
            if (colorUpdateFrameId !== null) {
                cancelAnimationFrame(colorUpdateFrameId);
                colorUpdateFrameId = null;
            }
            applyAllEffects();
            captureFrame();
            if (hasAnimatedEffects() && !animationFrameId) {
                animate();
            } else if (!hasAnimatedEffects() && animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
        
        container.appendChild(controlGroup);
    }

    function addGlitterFieldControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const densityContainer = document.createElement('div');
        densityContainer.className = 'flex items-center space-x-2';
        const densityLabel = document.createElement('label');
        densityLabel.textContent = 'Density';
        densityLabel.className = 'text-sm';
        const densitySlider = document.createElement('input');
        densitySlider.type = 'range';
        densitySlider.min = 10;
        densitySlider.max = 200;
        densitySlider.value = config.density;
        densitySlider.className = 'slider';
        const densityInput = document.createElement('input');
        densityInput.type = 'number';
        densityInput.min = 10;
        densityInput.max = 200;
        densityInput.value = config.density;
        densityInput.className = 'number-input';
        densityContainer.appendChild(densityLabel);
        densityContainer.appendChild(densitySlider);
        densityContainer.appendChild(densityInput);

        const sizeContainer = document.createElement('div');
        sizeContainer.className = 'flex items-center space-x-2';
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Size';
        sizeLabel.className = 'text-sm';
        const sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
        sizeSlider.min = 1;
        sizeSlider.max = 10;
        sizeSlider.value = config.size;
        sizeSlider.className = 'slider';
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.min = 1;
        sizeInput.max = 10;
        sizeInput.value = config.size;
        sizeInput.className = 'number-input';
        sizeContainer.appendChild(sizeLabel);
        sizeContainer.appendChild(sizeSlider);
        sizeContainer.appendChild(sizeInput);

        const speedContainer = document.createElement('div');
        speedContainer.className = 'flex items-center space-x-2';
        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Speed';
        speedLabel.className = 'text-sm';
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = 10;
        speedSlider.max = 500;
        speedSlider.value = config.speed;
        speedSlider.className = 'slider';
        const speedInput = document.createElement('input');
        speedInput.type = 'number';
        speedInput.min = 10;
        speedInput.max = 500;
        speedInput.value = config.speed;
        speedInput.className = 'number-input';
        speedContainer.appendChild(speedLabel);
        speedContainer.appendChild(speedSlider);
        speedContainer.appendChild(speedInput);

        const colorContainer = document.createElement('div');
        colorContainer.className = 'flex items-center space-x-2';
        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Color';
        colorLabel.className = 'text-sm';
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = config.color;
        colorInput.className = 'color-input';
        colorContainer.appendChild(colorLabel);
        colorContainer.appendChild(colorInput);

        controlGroup.appendChild(densityContainer);
        controlGroup.appendChild(sizeContainer);
        controlGroup.appendChild(speedContainer);
        controlGroup.appendChild(colorContainer);

        
        densitySlider.addEventListener('input', () => {
            densityInput.value = densitySlider.value;
            effects[name].density = parseInt(densitySlider.value);
        });
        densityInput.addEventListener('change', () => {
            densitySlider.value = densityInput.value;
            effects[name].density = parseInt(densityInput.value);
        });

        sizeSlider.addEventListener('input', () => {
            sizeInput.value = sizeSlider.value;
            effects[name].size = parseInt(sizeSlider.value);
        });
        sizeInput.addEventListener('change', () => {
            sizeSlider.value = sizeInput.value;
            effects[name].size = parseInt(sizeInput.value);
        });

        speedSlider.addEventListener('input', () => {
            speedInput.value = speedSlider.value;
            effects[name].speed = parseInt(speedSlider.value);
        });
        speedInput.addEventListener('change', () => {
            speedSlider.value = speedInput.value;
            effects[name].speed = parseInt(speedInput.value);
        });

        colorInput.addEventListener('input', () => {
            effects[name].color = colorInput.value;
            debouncedApplyEffects();
        });
        
        colorInput.addEventListener('change', () => {
            effects[name].color = colorInput.value;
            applyAllEffects();
            captureFrame();
        });

        container.appendChild(controlGroup);
    }

    function addStormSyndromeControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const intensityContainer = document.createElement('div');
        intensityContainer.className = 'flex items-center space-x-2';
        const intensityLabel = document.createElement('label');
        intensityLabel.textContent = 'Intensity';
        intensityLabel.className = 'text-sm';
        const intensitySlider = document.createElement('input');
        intensitySlider.type = 'range';
        intensitySlider.min = 0;
        intensitySlider.max = 100;
        intensitySlider.value = config.intensity;
        intensitySlider.className = 'slider';
        const intensityInput = document.createElement('input');
        intensityInput.type = 'number';
        intensityInput.min = 0;
        intensityInput.max = 100;
        intensityInput.value = config.intensity;
        intensityInput.className = 'number-input';
        intensityContainer.appendChild(intensityLabel);
        intensityContainer.appendChild(intensitySlider);
        intensityContainer.appendChild(intensityInput);

        const speedContainer = document.createElement('div');
        speedContainer.className = 'flex items-center space-x-2';
        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Speed';
        speedLabel.className = 'text-sm';
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = 10;
        speedSlider.max = 200;
        speedSlider.value = config.speed;
        speedSlider.className = 'slider';
        const speedInput = document.createElement('input');
        speedInput.type = 'number';
        speedInput.min = 10;
        speedInput.max = 200;
        speedInput.value = config.speed;
        speedInput.className = 'number-input';
        speedContainer.appendChild(speedLabel);
        speedContainer.appendChild(speedSlider);
        speedContainer.appendChild(speedInput);

        controlGroup.appendChild(intensityContainer);
        controlGroup.appendChild(speedContainer);

        
        intensitySlider.addEventListener('input', () => {
            intensityInput.value = intensitySlider.value;
            effects[name].intensity = parseInt(intensitySlider.value);
        });
        intensityInput.addEventListener('change', () => {
            intensitySlider.value = intensityInput.value;
            effects[name].intensity = parseInt(intensityInput.value);
        });

        speedSlider.addEventListener('input', () => {
            speedInput.value = speedSlider.value;
            effects[name].speed = parseInt(speedSlider.value);
        });
        speedInput.addEventListener('change', () => {
            speedSlider.value = speedInput.value;
            effects[name].speed = parseInt(speedInput.value);
        });

        container.appendChild(controlGroup);
    }

    function addMeltControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const intensityContainer = document.createElement('div');
        intensityContainer.className = 'flex items-center space-x-2';
        const intensityLabel = document.createElement('label');
        intensityLabel.textContent = 'Intensity';
        intensityLabel.className = 'text-sm';
        const intensitySlider = document.createElement('input');
        intensitySlider.type = 'range';
        intensitySlider.min = 0;
        intensitySlider.max = 100;
        intensitySlider.value = config.intensity;
        intensitySlider.className = 'slider';
        const intensityInput = document.createElement('input');
        intensityInput.type = 'number';
        intensityInput.min = 0;
        intensityInput.max = 100;
        intensityInput.value = config.intensity;
        intensityInput.className = 'number-input';
        intensityContainer.appendChild(intensityLabel);
        intensityContainer.appendChild(intensitySlider);
        intensityContainer.appendChild(intensityInput);

        const speedContainer = document.createElement('div');
        speedContainer.className = 'flex items-center space-x-2';
        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Speed';
        speedLabel.className = 'text-sm';
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = 10;
        speedSlider.max = 200;
        speedSlider.value = config.speed;
        speedSlider.className = 'slider';
        const speedInput = document.createElement('input');
        speedInput.type = 'number';
        speedInput.min = 10;
        speedInput.max = 200;
        speedInput.value = config.speed;
        speedInput.className = 'number-input';
        speedContainer.appendChild(speedLabel);
        speedContainer.appendChild(speedSlider);
        speedContainer.appendChild(speedInput);

        controlGroup.appendChild(intensityContainer);
        controlGroup.appendChild(speedContainer);

        
        intensitySlider.addEventListener('input', () => {
            intensityInput.value = intensitySlider.value;
            effects[name].intensity = parseInt(intensitySlider.value);
        });
        intensityInput.addEventListener('change', () => {
            intensitySlider.value = intensityInput.value;
            effects[name].intensity = parseInt(intensityInput.value);
        });

        speedSlider.addEventListener('input', () => {
            speedInput.value = speedSlider.value;
            effects[name].speed = parseInt(speedSlider.value);
        });
        speedInput.addEventListener('change', () => {
            speedSlider.value = speedInput.value;
            effects[name].speed = parseInt(speedInput.value);
        });

        container.appendChild(controlGroup);
    }

    function addBouncingLogoControls(container, name, config) {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';

        const speedContainer = document.createElement('div');
        speedContainer.className = 'flex items-center space-x-2';
        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Speed';
        speedLabel.className = 'text-sm';
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = 5;
        speedSlider.max = 800;
        speedSlider.value = config.speed;
        speedSlider.className = 'slider';
        const speedInput = document.createElement('input');
        speedInput.type = 'number';
        speedInput.min = 5;
        speedInput.max = 800;
        speedInput.value = config.speed;
        speedInput.className = 'number-input';
        speedContainer.appendChild(speedLabel);
        speedContainer.appendChild(speedSlider);
        speedContainer.appendChild(speedInput);

        const sizeContainer = document.createElement('div');
        sizeContainer.className = 'flex items-center space-x-2';
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Size';
        sizeLabel.className = 'text-sm';
        const sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
        sizeSlider.min = 10;
        sizeSlider.max = 500;
        sizeSlider.value = config.size;
        sizeSlider.className = 'slider';
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.min = 10;
        sizeInput.max = 500;
        sizeInput.value = config.size;
        sizeInput.className = 'number-input';
        sizeContainer.appendChild(sizeLabel);
        sizeContainer.appendChild(sizeSlider);
        sizeContainer.appendChild(sizeInput);

        const colorShiftContainer = document.createElement('div');
        colorShiftContainer.className = 'flex items-center space-x-2';
        const colorShiftLabel = document.createElement('label');
        colorShiftLabel.textContent = 'Color Shift';
        colorShiftLabel.className = 'text-sm';
        const colorShiftCheckbox = document.createElement('input');
        colorShiftCheckbox.type = 'checkbox';
        colorShiftCheckbox.checked = config.colorShift;
        colorShiftCheckbox.className = 'checkbox';
        colorShiftContainer.appendChild(colorShiftLabel);
        colorShiftContainer.appendChild(colorShiftCheckbox);

        const imageContainer = document.createElement('div');
        imageContainer.className = 'flex items-center space-x-2';
        const imageLabel = document.createElement('label');
        imageLabel.textContent = 'Custom Logo';
        imageLabel.className = 'text-sm';
        const imageInput = document.createElement('input');
        imageInput.type = 'file';
        imageInput.accept = 'image/*';
        imageInput.className = 'file-input';
        imageContainer.appendChild(imageLabel);
        imageContainer.appendChild(imageInput);

        controlGroup.appendChild(speedContainer);
        controlGroup.appendChild(sizeContainer);
        controlGroup.appendChild(colorShiftContainer);
        controlGroup.appendChild(imageContainer);

        
        speedSlider.addEventListener('input', () => {
            speedInput.value = speedSlider.value;
            effects[name].speed = parseInt(speedSlider.value);
        });
        speedInput.addEventListener('change', () => {
            speedSlider.value = speedInput.value;
            effects[name].speed = parseInt(speedInput.value);
        });

        sizeSlider.addEventListener('input', () => {
            sizeInput.value = sizeSlider.value;
            effects[name].size = parseInt(sizeSlider.value);
        });
        sizeInput.addEventListener('change', () => {
            sizeSlider.value = sizeInput.value;
            effects[name].size = parseInt(sizeInput.value);
        });

        colorShiftCheckbox.addEventListener('change', () => {
            effects[name].colorShift = colorShiftCheckbox.checked;
        });

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        effects[name].customImage = img;
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                effects[name].customImage = null;
            }
        });

        container.appendChild(controlGroup);
    }

    function loadMediaFromFile(file, fileName) {
        cachedSmartPalette = null;
        cachedSmartPaletteSource = null;
        originalFileName = fileName.replace(/\.[^/.]+$/, '');
        const fileType = file.type;
        const fileExt = fileName.split('.').pop().toLowerCase();

        if (fileExt === 'gif' || fileType === 'image/gif') {
            loadGIFFile(file);
        } else if (fileType.startsWith('video/') || fileExt === 'webm') {
            loadVideoFile(file);
        } else if (fileType.startsWith('image/')) {
            loadImageFile(file);
        } else {
            showError('Unsupported file format. Please upload an image, WebM, or GIF.');
        }
    }

    function loadImageFile(file) {
        isVideoSource = false;
        isGIFSource = false;
        stopGIFPlayback();
        if (currentVideo) {
            currentVideo.pause();
            currentVideo.src = '';
            currentVideo = null;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            currentImage.onload = () => {
                setInitialCanvasSize();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
                originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                applyAllEffects();
                resizeCanvas();
                updatePasteHintVisibility(true);
            };
            currentImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function loadVideoFile(file) {
        isVideoSource = true;
        isGIFSource = false;
        stopGIFPlayback();
        
        
        if (!currentVideo) {
            currentVideo = document.createElement('video');
            currentVideo.playsInline = true;
            currentVideo.muted = true;
            currentVideo.loop = true;
        }

        
        if (!videoFrameCanvas) {
            videoFrameCanvas = document.createElement('canvas');
            videoFrameCtx = videoFrameCanvas.getContext('2d', { willReadFrequently: true });
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            currentVideo.src = event.target.result;
            
            currentVideo.onloadedmetadata = () => {
                videoFrameCanvas.width = currentVideo.videoWidth;
                videoFrameCanvas.height = currentVideo.videoHeight;
                
                
                currentImage.width = currentVideo.videoWidth;
                currentImage.height = currentVideo.videoHeight;
                
                
                videoOriginalDuration = currentVideo.duration * 1000;
                
                
                
                videoOriginalFPS = 30; 
                
                console.log(`Video loaded: ${currentVideo.videoWidth}x${currentVideo.videoHeight}, Duration: ${currentVideo.duration}s`);
                
                setInitialCanvasSize();
                
                
                currentVideo.play().catch(err => {
                    console.warn('Auto-play prevented:', err);
                    showNotification('Click to play video', 'info');
                });
                
                
                updateVideoFrame();
                updatePasteHintVisibility(true);
                showSuccess(`Video loaded successfully! Duration: ${currentVideo.duration.toFixed(1)}s`);
            };

            currentVideo.onerror = (err) => {
                console.error('Video loading error:', err);
                showError('Failed to load video. The format may not be supported.');
                isVideoSource = false;
            };
        };
        reader.readAsDataURL(file);
    }

    function loadGIFFile(file) {
        isVideoSource = false;
        isGIFSource = false;
        stopGIFPlayback();
        if (currentVideo) {
            currentVideo.pause();
            currentVideo.src = '';
            currentVideo = null;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            (async () => {
                try {
                    if (!window.gifuct || !window.gifuct.parseGIF) {
                        showInfo('Loading GIF decoder...');
                        const mod = await import('https://esm.sh/gifuct-js@2.1.2');
                        window.gifuct = { parseGIF: mod.parseGIF, decompressFrames: mod.decompressFrames };
                    }
                    const gif = window.gifuct.parseGIF(arrayBuffer);
                    const rawFrames = window.gifuct.decompressFrames(gif, true);

                if (!rawFrames || rawFrames.length === 0) {
                    showError('Failed to parse GIF: no frames found.');
                    return;
                }

                gifWidth = gif.lsd.width;
                gifHeight = gif.lsd.height;
                gifFrames = buildGIFFrames(rawFrames, gifWidth, gifHeight);
                gifTotalDuration = gifFrames.reduce((sum, f) => sum + f.delay, 0);

                currentImage.width = gifWidth;
                currentImage.height = gifHeight;

                setInitialCanvasSize();

                isGIFSource = true;
                gifFrameIndex = 0;

                canvas.width = gifWidth;
                canvas.height = gifHeight;
                originalImageData = gifFrames[0].imageData;
                applyAllEffects();
                resizeCanvas();
                updatePasteHintVisibility(true);

                playGIFFrames();

                formatSelect.value = 'GIF';
                handleFormatChange();

                showSuccess(`GIF loaded: ${gifFrames.length} frames, ${(gifTotalDuration / 1000).toFixed(1)}s`);
                } catch (err) {
                    console.error('GIF parsing error:', err);
                    showError('Failed to parse GIF file.');
                }
            })();
        };
        reader.readAsArrayBuffer(file);
    }

    function buildGIFFrames(rawFrames, width, height) {
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = width;
        compositeCanvas.height = height;
        const compCtx = compositeCanvas.getContext('2d', { willReadFrequently: true });

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        const builtFrames = [];
        let previousImageData = null;

        for (let i = 0; i < rawFrames.length; i++) {
            const frame = rawFrames[i];
            const dims = frame.dims;

            if (frame.disposalType === 3) {
                previousImageData = compCtx.getImageData(0, 0, width, height);
            }

            tempCanvas.width = dims.width;
            tempCanvas.height = dims.height;
            const patchData = new ImageData(
                new Uint8ClampedArray(frame.patch),
                dims.width,
                dims.height
            );
            tempCtx.putImageData(patchData, 0, 0);
            compCtx.drawImage(tempCanvas, dims.left, dims.top);

            const fullFrame = compCtx.getImageData(0, 0, width, height);
            builtFrames.push({
                imageData: fullFrame,
                delay: Math.max(frame.delay || 100, 20) // delay already in ms from gifuct-js; min 20ms
            });

            if (frame.disposalType === 2) {
                compCtx.clearRect(dims.left, dims.top, dims.width, dims.height);
            } else if (frame.disposalType === 3 && previousImageData) {
                compCtx.putImageData(previousImageData, 0, 0);
            }
        }

        return builtFrames;
    }

    function playGIFFrames() {
        stopGIFPlayback();
        if (!isGIFSource || gifFrames.length === 0) return;

        const renderFrame = () => {
            if (!isGIFSource || gifFrames.length === 0) return;

            const frame = gifFrames[gifFrameIndex];

            canvas.width = gifWidth;
            canvas.height = gifHeight;
            originalImageData = frame.imageData;
            applyAllEffects();
            if (hasAnimatedEffects()) {
                applyAnimatedEffects();
            }

            gifFrameIndex = (gifFrameIndex + 1) % gifFrames.length;
            gifPlaybackTimer = setTimeout(renderFrame, frame.delay);
        };

        renderFrame();
    }

    function stopGIFPlayback() {
        if (gifPlaybackTimer) {
            clearTimeout(gifPlaybackTimer);
            gifPlaybackTimer = null;
        }
    }

    function updateVideoFrame() {
        if (!isVideoSource || !currentVideo || currentVideo.paused || currentVideo.ended) {
            return;
        }

        
        videoFrameCtx.drawImage(currentVideo, 0, 0, videoFrameCanvas.width, videoFrameCanvas.height);
        
        
        const frameData = videoFrameCtx.getImageData(0, 0, videoFrameCanvas.width, videoFrameCanvas.height);
        
        
        canvas.width = videoFrameCanvas.width;
        canvas.height = videoFrameCanvas.height;
        originalImageData = frameData;
        
        
        applyAllEffects();
        
        
        requestAnimationFrame(updateVideoFrame);
    }

upload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            loadMediaFromFile(file, file.name);
        }
    });

    document.addEventListener('paste', (e) => {
        const activeElement = document.activeElement;
        const isTextInput = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.contentEditable === 'true'
        );
        
        if (isTextInput) {
            return; 
        }
        
        e.preventDefault();
        
        const items = e.clipboardData.items;
        let mediaFile = null;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('video') !== -1) {
                mediaFile = items[i].getAsFile();
                break;
            }
        }
        
        if (mediaFile) {
            const fileName = mediaFile.type.indexOf('video') !== -1 ? 'pasted-video' : 'pasted-image';
            loadMediaFromFile(mediaFile, fileName);
            showSuccess('Media pasted successfully!');
        } else if (e.clipboardData.items.length > 0) {
            let hasText = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('text') !== -1) {
                    hasText = true;
                    break;
                }
            }
            if (hasText) {
                showInfo('Only images/videos can be pasted. Try copying media instead.');
            } else {
                showInfo('No media found in clipboard. Copy an image or video and try again.');
            }
        } else {
            showInfo('No media found in clipboard. Copy an image or video and try again.');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'v') {
            return;
        }
    });

    function setInitialCanvasSize() {
        
        badTVOriginalData = null;
        matrixDrops = null;
        
        const containerRect = canvasContainer.getBoundingClientRect();
        const containerWidth = containerRect.width - 32; 
        const containerHeight = containerRect.height - 32;
        
        const width = isVideoSource ? (currentVideo ? currentVideo.videoWidth : canvas.width) : isGIFSource ? gifWidth : currentImage.width;
        const height = isVideoSource ? (currentVideo ? currentVideo.videoHeight : canvas.height) : isGIFSource ? gifHeight : currentImage.height;
        const imageAspectRatio = width / height;
        const containerAspectRatio = containerWidth / containerHeight;

        let displayWidth, displayHeight;

        if (imageAspectRatio > containerAspectRatio) {
            displayWidth = Math.min(containerWidth, width);
            displayHeight = displayWidth / imageAspectRatio;
        } else {
            displayHeight = Math.min(containerHeight, height);
            displayWidth = displayHeight * imageAspectRatio;
        }

        canvas.width = width;
        canvas.height = height;
        
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '100%';
        canvas.style.objectFit = 'contain';
        
        canvas.classList.add('loaded');
    }

    resetBtn.addEventListener('click', () => {
        for (const name in effects) {
            const config = effects[name];
            if (config.type === 'slider') {
                config.value = (name === 'Pixelate' || name === 'Mosaic') ? 1 : 0;
                config.enabled = false;
            }
            if (config.type === 'toggle') {
                config.value = false;
                config.enabled = false;
            }            if (config.type === 'duotone') {
                config.enabled = false;
                config.color1 = '#0000ff';
                config.color2 = '#ffff00';
            }
            if (config.type === 'perspective3d') {
                config.enabled = false;
                config.rotation = 0;
                config.skewX = 0;
                config.skewY = 0;
                config.scaleX = 100;
                config.scaleY = 100;
                config.offsetX = 0;
                config.offsetY = 0;
                config.shadowBlur = 0;
                config.shadowOpacity = 50;
            }
            if (config.type === 'complex') {
                config.enabled = false;
                if (name === 'edgeDetection') {
                    config.intensity = 1;
                    config.edgeColor = '#ffffff';
                    config.backgroundColor = '#000000';
                }
            }
        }
        effectsContainer.innerHTML = '';
        createEffectControls();
        applyAllEffects();
        updateLayersPanel();
        if (activeToggle && activeToggle.checked) {
            filterEffects(searchInput ? searchInput.value : '');
        }

    });downloadBtn.addEventListener('click', () => {
            if (!originalImageData) {
                showError('Please upload an image or video first!');
                return;
            }

            const format = formatSelect.value.toLowerCase();

            
            if (format === 'webm' || format === 'gif') {
                startVideoExport();
                return;
            }

            
            const link = document.createElement('a');
            link.download = `wink-edited.${format}`;

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;

            if (!isVideoSource && !isGIFSource) {
                applyAllEffects();
                if (hasAnimatedEffects()) {
                    applyAnimatedEffects();
                }
            }

            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);

            link.href = tempCanvas.toDataURL(`image/${format}`);
            link.click();
        });

    blinkBtn.addEventListener('click', startRecording);
    exportVideoBtn.addEventListener('click', startVideoExport);
    formatSelect.addEventListener('change', handleFormatChange);

    takeSnapshotBtn.addEventListener('click', () => {
        const snapshot = takeSnapshot();
        snapshotInput.value = snapshot;
        snapshotInput.select();
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(snapshot).then(() => {
                showSuccess('Snapshot taken and copied to clipboard!');
            }).catch(() => {
                showSuccess('Snapshot taken! Please copy the text manually.');
            });
        } else {
            try {
                document.execCommand('copy');
                showSuccess('Snapshot taken and copied to clipboard!');
            } catch (err) {
                showSuccess('Snapshot taken! Please copy the text manually.');
            }
        }
    });

    importSnapshotBtn.addEventListener('click', () => {
        const snapshotString = snapshotInput.value.trim();
        if (!snapshotString) {
            showError('Please paste a snapshot string first.');
            return;
        }
        
        try {
            importSnapshot(snapshotString);
            showSuccess('Snapshot imported successfully!');
            snapshotInput.value = '';
        } catch (error) {
            showError('Invalid snapshot string. Please check and try again.');
        }
    });

    function takeSnapshot() {
        const snapshot = {
            effectLayers: [...effectLayers], 
            effects: {}
        };
        
        for (const name in effects) {
            const config = effects[name];
            snapshot.effects[name] = captureEffectSnapshot(config);
        }
        
        const jsonString = JSON.stringify(snapshot);
        return btoa(jsonString);
    }

    function importSnapshot(snapshotString) {
        const jsonString = atob(snapshotString);
        const snapshot = JSON.parse(jsonString);

        for (const name in effects) {
            const effectConfig = effects[name];
            const defaultConfig = defaultEffects[name];

            if (!effectConfig || !defaultConfig) continue;

            for (const key in effectConfig) {
                if (!Object.prototype.hasOwnProperty.call(defaultConfig, key)) {
                    delete effectConfig[key];
                }
            }

            for (const key in defaultConfig) {
                effectConfig[key] = cloneSnapshotValue(defaultConfig[key]);
            }
        }
        
        const snapshotEffects = snapshot.effects || snapshot;
        
        if (Array.isArray(snapshot.effectLayers)) {
            const knownSnapshotLayers = snapshot.effectLayers.filter(name => effects[name]);
            const deduplicatedLayers = [...new Set(knownSnapshotLayers)];
            const missingLayers = Object.keys(effects).filter(name => !deduplicatedLayers.includes(name));
            effectLayers = [...deduplicatedLayers, ...missingLayers];
        }
        
        for (const name in snapshotEffects) {
            if (effects[name]) {
                const snapshotConfig = snapshotEffects[name];
                const effectConfig = effects[name];
                if (!snapshotConfig || typeof snapshotConfig !== 'object') continue;
                
                if (Object.prototype.hasOwnProperty.call(snapshotConfig, 'enabled')) {
                    effectConfig.enabled = !!snapshotConfig.enabled;
                }

                const fields = getSnapshotFields(effectConfig.type, effectConfig);
                fields.forEach(field => {
                    if (field === 'enabled') return;
                    if (Object.prototype.hasOwnProperty.call(snapshotConfig, field)) {
                        effectConfig[field] = cloneSnapshotValue(snapshotConfig[field]);
                    }
                });

                if (effectConfig.type === 'edgeDetection' && !effectConfig.edgeColor) {
                    effectConfig.edgeColor = '#ffffff';
                }
            }
        }
        
        effectsContainer.innerHTML = '';
        createEffectControls();
        updateLayersPanel();
        applyAllEffects();
        if (activeToggle && activeToggle.checked) {
            filterEffects(searchInput ? searchInput.value : '');
        }
    }

    function applyAllEffects(inputImageData = null) {
        if (!originalImageData && !inputImageData) return;

        const sourceImageData = inputImageData || originalImageData;
        ensureProcessingContext(sourceImageData.width, sourceImageData.height);

        let workingImageData = new ImageData(
            new Uint8ClampedArray(sourceImageData.data),
            sourceImageData.width,
            sourceImageData.height
        );
        let hasPendingImageData = true;

        processingCtx.clearRect(0, 0, processingCanvas.width, processingCanvas.height);

        const enabledEffectsTopDown = effectLayers.filter(effectName => effects[effectName] && effects[effectName].enabled);
        effectProcessingOrder = [...enabledEffectsTopDown];
        const bottomToTopOrder = [...enabledEffectsTopDown].reverse();

        animatedEffectStack = [];
        postAnimatedEffectStack = [];

        const flushImageDataToProcessingCanvas = () => {
            if (hasPendingImageData) {
                processingCtx.putImageData(workingImageData, 0, 0);
                hasPendingImageData = false;
            }
        };

        const ensureWorkingImageData = () => {
            if (!hasPendingImageData) {
                workingImageData = processingCtx.getImageData(0, 0, processingCanvas.width, processingCanvas.height);
                hasPendingImageData = true;
            }
        };

        let encounteredAnimatedEffect = false;

        bottomToTopOrder.forEach(effectName => {
            const effectConfig = effects[effectName];
            if (!effectConfig) return;

            const stage = getEffectStage(effectName);

            if (stage === 'animated') {
                flushImageDataToProcessingCanvas();
                animatedEffectStack.push(effectName);
                encounteredAnimatedEffect = true;
                return;
            }

            if (encounteredAnimatedEffect) {
                postAnimatedEffectStack.push({ name: effectName, stage });
                return;
            }

            switch (stage) {
                case 'pixel':
                    ensureWorkingImageData();
                    applyPixelEffect(workingImageData, effectName, effectConfig);
                    break;
                case 'filter':
                    if ((effectName === 'Blur' && effectConfig.value <= 0) || (effectName === 'Hue' && effectConfig.value === 0)) {
                        break;
                    }
                    flushImageDataToProcessingCanvas();
                    applyFilterEffect(processingCanvas, processingCtx, effectName, effectConfig);
                    hasPendingImageData = false;
                    break;
                case 'overlay':
                    flushImageDataToProcessingCanvas();
                    applyOverlayEffect(processingCanvas, processingCtx, effectName, effectConfig);
                    hasPendingImageData = false;
                    break;
                default:
                    ensureWorkingImageData();
                    applyPixelEffect(workingImageData, effectName, effectConfig);
                    break;
            }
        });

        flushImageDataToProcessingCanvas();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (animatedEffectStack.length > 0) {
            preAnimatedImageData = processingCtx.getImageData(0, 0, processingCanvas.width, processingCanvas.height);
            applyAnimatedEffects();
        } else {
            preAnimatedImageData = null;
            ctx.drawImage(processingCanvas, 0, 0);
        }
    }
    function adjustBrightness(data, amount) {
        const value = (amount / 100) * 255;
        for (let i = 0; i < data.length; i += 4) {
            data[i] += value;
            data[i + 1] += value;
            data[i + 2] += value;
        }
    }

    function adjustContrast(data, amount) {
        const factor = (259 * (amount + 255)) / (255 * (259 - amount));
        for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128;
            data[i + 1] = factor * (data[i + 1] - 128) + 128;
            data[i + 2] = factor * (data[i + 2] - 128) + 128;
        }
    }

    function grayscale(data, amount) {
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i] * (1 - amount) + avg * amount;
            data[i + 1] = data[i + 1] * (1 - amount) + avg * amount;
            data[i + 2] = data[i + 2] * (1 - amount) + avg * amount;
        }
    }

    function sepia(data, amount) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const tr = r * 0.393 + g * 0.769 + b * 0.189;
            const tg = r * 0.349 + g * 0.686 + b * 0.168;
            const tb = r * 0.272 + g * 0.534 + b * 0.131;
            data[i] = r * (1 - amount) + tr * amount;
            data[i + 1] = g * (1 - amount) + tg * amount;
            data[i + 2] = b * (1 - amount) + tb * amount;
        }
    }

    function invert(data, amount) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = data[i] * (1 - amount) + (255 - data[i]) * amount;
            data[i + 1] = data[i + 1] * (1 - amount) + (255 - data[i + 1]) * amount;
            data[i + 2] = data[i + 2] * (1 - amount) + (255 - data[i + 2]) * amount;
        }
    }

    function adjustTemperature(data, amount) {
        const temp = amount / 100; 
        
        for (let i = 0; i < data.length; i += 4) {
            if (temp > 0) {
                data[i] = Math.min(255, data[i] + temp * 40);      
                data[i + 1] = Math.min(255, data[i + 1] + temp * 20); 
                data[i + 2] = Math.max(0, data[i + 2] - temp * 30);   
            } else {
                data[i] = Math.max(0, data[i] + temp * 30);           
                data[i + 1] = data[i + 1] + temp * 10;                
                data[i + 2] = Math.min(255, data[i + 2] - temp * 40); 
            }
        }
    }

    function edgeDetection(imageData, amount, edgeColor = '#ffffff', backgroundColor = '#000000') {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const originalData = new Uint8ClampedArray(data);
        
        const bgColor = hexToRgb(backgroundColor);
        const edgeRgb = hexToRgb(edgeColor);
        
        const sobelX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        
        const sobelY = [
            [-1, -2, -1],
            [ 0,  0,  0],
            [ 1,  2,  1]
        ];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let pixelX = 0;
                let pixelY = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const py = Math.max(0, Math.min(height - 1, y + ky));
                        const px = Math.max(0, Math.min(width - 1, x + kx));
                        
                        const pixelIndex = (py * width + px) * 4;
                        const gray = (originalData[pixelIndex] + originalData[pixelIndex + 1] + originalData[pixelIndex + 2]) / 3;
                        
                        pixelX += gray * sobelX[ky + 1][kx + 1];
                        pixelY += gray * sobelY[ky + 1][kx + 1];
                    }
                }
                
                const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
                const edgeValue = Math.min(255, magnitude);
                
                const currentIndex = (y * width + x) * 4;
                const edgeFactor = (edgeValue / 255) * amount;
                
                data[currentIndex] = bgColor.r * (1 - amount) + edgeRgb.r * edgeFactor;
                data[currentIndex + 1] = bgColor.g * (1 - amount) + edgeRgb.g * edgeFactor;
                data[currentIndex + 2] = bgColor.b * (1 - amount) + edgeRgb.b * edgeFactor;
            }
        }
    }

    
    function lineArt(imageData, lineColor, backgroundColor, thickness, sensitivity, smoothColors = false) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const originalData = new Uint8ClampedArray(data);
        
        const lineRgb = hexToRgb(lineColor);
        const bgRgb = hexToRgb(backgroundColor);
        
        
        const edgeData = new Float32Array(width * height);
        
        const sobelX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        
        const sobelY = [
            [-1, -2, -1],
            [ 0,  0,  0],
            [ 1,  2,  1]
        ];
        
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let pixelX = 0;
                let pixelY = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const py = Math.max(0, Math.min(height - 1, y + ky));
                        const px = Math.max(0, Math.min(width - 1, x + kx));
                        
                        const pixelIndex = (py * width + px) * 4;
                        const gray = (originalData[pixelIndex] + originalData[pixelIndex + 1] + originalData[pixelIndex + 2]) / 3;
                        
                        pixelX += gray * sobelX[ky + 1][kx + 1];
                        pixelY += gray * sobelY[ky + 1][kx + 1];
                    }
                }
                
                const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
                edgeData[y * width + x] = magnitude;
            }
        }
        
        
        const dilatedEdges = new Float32Array(width * height);
        const kernelSize = Math.max(1, Math.floor(thickness / 2));
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let maxEdge = 0;
                for (let ky = -kernelSize; ky <= kernelSize; ky++) {
                    for (let kx = -kernelSize; kx <= kernelSize; kx++) {
                        const py = Math.max(0, Math.min(height - 1, y + ky));
                        const px = Math.max(0, Math.min(width - 1, x + kx));
                        maxEdge = Math.max(maxEdge, edgeData[py * width + px]);
                    }
                }
                dilatedEdges[y * width + x] = maxEdge;
            }
        }
        
        
        const threshold = (sensitivity / 100) * 255;
        
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = Math.floor(i / 4);
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            const edgeValue = dilatedEdges[pixelIndex];
            
            if (edgeValue > threshold) {
                
                if (smoothColors) {
                    
                    const noise = Math.sin(x * 0.01 + y * 0.01) * 0.3 + Math.cos(x * 0.02 - y * 0.015) * 0.2;
                    const variation = Math.sin(x * 0.005 + y * 0.008 + edgeValue * 0.001) * 0.15;
                    const totalNoise = noise + variation;
                    
                    data[i] = Math.max(0, Math.min(255, lineRgb.r + totalNoise * 100));
                    data[i + 1] = Math.max(0, Math.min(255, lineRgb.g + totalNoise * 80));
                    data[i + 2] = Math.max(0, Math.min(255, lineRgb.b + totalNoise * 120));
                } else {
                    data[i] = lineRgb.r;
                    data[i + 1] = lineRgb.g;
                    data[i + 2] = lineRgb.b;
                }
            } else {
                
                if (smoothColors) {
                    
                    const noise = Math.sin(x * 0.008 - y * 0.012) * 0.2 + Math.cos(x * 0.015 + y * 0.01) * 0.15;
                    const variation = Math.sin(x * 0.003 - y * 0.005) * 0.1;
                    const totalNoise = noise + variation;
                    
                    data[i] = Math.max(0, Math.min(255, bgRgb.r + totalNoise * 60));
                    data[i + 1] = Math.max(0, Math.min(255, bgRgb.g + totalNoise * 40));
                    data[i + 2] = Math.max(0, Math.min(255, bgRgb.b + totalNoise * 80));
                } else {
                    data[i] = bgRgb.r;
                    data[i + 1] = bgRgb.g;
                    data[i + 2] = bgRgb.b;
                }
            }
            
        }
    }
    
    function pixelate(imageData, pixelSize) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        pixelSize = Math.floor(pixelSize);

        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                for (let nY = y; nY < y + pixelSize && nY < height; nY++) {
                    for (let nX = x; nX < x + pixelSize && nX < width; nX++) {
                        const j = (nY * width + nX) * 4;
                        data[j] = r;
                        data[j + 1] = g;
                        data[j + 2] = b;
                    }
                }
            }
        }
    }



    function getSmartPalette(imageData, count = 16) {
        if (!imageData) return [];
        const data = imageData.data;
        const pixels = [];
        const samplingStep = Math.max(1, Math.floor(data.length / (4 * 2000))); 
        for (let i = 0; i < data.length; i += 4 * samplingStep) {
            pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
        }

        let clusters = [];
        for (const p of pixels) {
            let bestC = -1;
            let minDist = 30 * 30; 
            for (let i = 0; i < clusters.length; i++) {
                const dist = Math.pow(p.r - clusters[i].r, 2) + Math.pow(p.g - clusters[i].g, 2) + Math.pow(p.b - clusters[i].b, 2);
                if (dist < minDist) {
                    minDist = dist;
                    bestC = i;
                    break;
                }
            }
            if (bestC === -1) {
                clusters.push({ ...p, count: 1 });
            } else {
                const c = clusters[bestC];
                c.r = (c.r * c.count + p.r) / (c.count + 1);
                c.g = (c.g * c.count + p.g) / (c.count + 1);
                c.b = (c.b * c.count + p.b) / (c.count + 1);
                c.count++;
            }
        }

        clusters.sort((a, b) => b.count - a.count);
        return clusters.slice(0, count).map(c => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) }));
    }

    function pixelArt(imageData, config) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const pixelSize = Math.max(1, Math.floor(config.pixelSize));
        const paletteName = config.palette;
        const ditherAmount = config.dithering / 100;
        const contrast = (config.contrast || 0) / 100;

        let rgbPalette;
        if (paletteName === 'Smart (From Media)') {
            const source = originalImageData || imageData;
            if (cachedSmartPalette && cachedSmartPaletteSource === source) {
                rgbPalette = cachedSmartPalette;
            } else {
                rgbPalette = getSmartPalette(source, 16);
                cachedSmartPalette = rgbPalette;
                cachedSmartPaletteSource = source;
            }
        } else if (paletteName === 'Custom' && config.customPalette && config.customPalette.length > 0) {
            rgbPalette = config.customPalette.map(hex => hexToRgb(hex));
        } else {
            const palette = PALETTES[paletteName] || PALETTES['Pico-8'];
            rgbPalette = palette.map(hex => hexToRgb(hex));
        }

        if (rgbPalette.length === 0) return;

        const bayerMatrix = [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ];

        const findClosest = (r, g, b) => {
            let minDist = Infinity;
            let closest = rgbPalette[0];
            for (let i = 0; i < rgbPalette.length; i++) {
                const color = rgbPalette[i];
                const dr = r - color.r;
                const dg = g - color.g;
                const db = b - color.b;
                const dist = dr * dr + dg * dg + db * db;
                if (dist < minDist) {
                    minDist = dist;
                    closest = color;
                }
            }
            return closest;
        };

        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                let r = 0, g = 0, b = 0, count = 0;
                
                // Average the block
                for (let nY = y; nY < y + pixelSize && nY < height; nY++) {
                    for (let nX = x; nX < x + pixelSize && nX < width; nX++) {
                        const j = (nY * width + nX) * 4;
                        r += data[j];
                        g += data[j + 1];
                        b += data[j + 2];
                        count++;
                    }
                }
                
                r /= count;
                g /= count;
                b /= count;

                // Contrast
                if (contrast !== 0) {
                    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
                    r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
                    g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
                    b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
                }

                // Dithering (Ordered)
                if (ditherAmount > 0) {
                    const bx = (x / pixelSize) % 4;
                    const by = (y / pixelSize) % 4;
                    const threshold = (bayerMatrix[by][bx] / 16 - 0.5) * ditherAmount * 255;
                    r = Math.max(0, Math.min(255, r + threshold));
                    g = Math.max(0, Math.min(255, g + threshold));
                    b = Math.max(0, Math.min(255, b + threshold));
                }

                const closest = findClosest(r, g, b);

                for (let nY = y; nY < y + pixelSize && nY < height; nY++) {
                    for (let nX = x; nX < x + pixelSize && nX < width; nX++) {
                        const j = (nY * width + nX) * 4;
                        data[j] = closest.r;
                        data[j + 1] = closest.g;
                        data[j + 2] = closest.b;
                    }
                }
            }
        }
    }

    function mosaic(imageData, tileSize) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        tileSize = Math.floor(tileSize);
        
        const originalData = new Uint8ClampedArray(data);

        const triangleHeight = Math.floor(tileSize * Math.sqrt(3) / 2);
        
        for (let row = 0; row < height; row += triangleHeight) {
            for (let col = 0; col < width; col += tileSize) {
                const isEvenRow = Math.floor(row / triangleHeight) % 2 === 0;
                
                for (let triangle = 0; triangle < 2; triangle++) {
                    let avgR = 0, avgG = 0, avgB = 0, pixelCount = 0;
                    
                    for (let y = row; y < row + triangleHeight && y < height; y++) {
                        for (let x = col; x < col + tileSize && x < width; x++) {
                            if (isPointInTriangle(x, y, col, row, tileSize, triangleHeight, triangle, isEvenRow)) {
                                const i = (y * width + x) * 4;
                                avgR += originalData[i];
                                avgG += originalData[i + 1];
                                avgB += originalData[i + 2];
                                pixelCount++;
                            }
                        }
                    }
                    
                    if (pixelCount > 0) {
                        avgR = Math.floor(avgR / pixelCount);
                        avgG = Math.floor(avgG / pixelCount);
                        avgB = Math.floor(avgB / pixelCount);
                        
                        for (let y = row; y < row + triangleHeight && y < height; y++) {
                            for (let x = col; x < col + tileSize && x < width; x++) {
                                if (isPointInTriangle(x, y, col, row, tileSize, triangleHeight, triangle, isEvenRow)) {
                                    const i = (y * width + x) * 4;
                                    
                                    const variation = (Math.random() - 0.5) * 15;
                                    
                                    data[i] = Math.max(0, Math.min(255, avgR + variation));
                                    data[i + 1] = Math.max(0, Math.min(255, avgG + variation));
                                    data[i + 2] = Math.max(0, Math.min(255, avgB + variation));
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    function isPointInTriangle(px, py, baseX, baseY, tileSize, triangleHeight, triangleIndex, isEvenRow) {
        const x = px - baseX;
        const y = py - baseY;
        
        if (triangleIndex === 0) {
            if (isEvenRow) {
                return y >= 0 && 
                       y <= triangleHeight && 
                       x >= (tileSize / 2) - (y * tileSize / (2 * triangleHeight)) && 
                       x <= (tileSize / 2) + (y * tileSize / (2 * triangleHeight));
            } else {
                const shiftedX = x - tileSize / 2;
                return y >= 0 && 
                       y <= triangleHeight && 
                       shiftedX >= -(y * tileSize / (2 * triangleHeight)) && 
                       shiftedX <= (y * tileSize / (2 * triangleHeight));
            }
        } else {
            if (isEvenRow) {
                return y >= 0 && 
                       y <= triangleHeight && 
                       x >= (y * tileSize / (2 * triangleHeight)) && 
                       x <= tileSize - (y * tileSize / (2 * triangleHeight));
            } else {
                const shiftedX = x - tileSize / 2;
                return y >= 0 && 
                       y <= triangleHeight && 
                       shiftedX >= (tileSize / 2) - ((triangleHeight - y) * tileSize / (2 * triangleHeight)) && 
                       shiftedX <= ((triangleHeight - y) * tileSize / (2 * triangleHeight)) - (tileSize / 2);
            }
        }
    }

    function vignette(canvas, ctx, amount) {
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.width / 4,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${amount})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function frostedGlass(canvas, ctx, intensity, noiseAmount, opacity, tint) {
        if (!frostedCanvas) {
            frostedCanvas = document.createElement('canvas');
            frostedCtx = frostedCanvas.getContext('2d');
        }
        if (frostedCanvas.width !== canvas.width || frostedCanvas.height !== canvas.height) {
            frostedCanvas.width = canvas.width;
            frostedCanvas.height = canvas.height;
        }

        frostedCtx.clearRect(0, 0, frostedCanvas.width, frostedCanvas.height);

        if (intensity > 0) {
            frostedCtx.filter = `blur(${intensity}px)`;
        } else {
            frostedCtx.filter = 'none';
        }
        frostedCtx.drawImage(canvas, 0, 0);
        frostedCtx.filter = 'none';

        if (noiseAmount > 0) {
            if (!cachedNoiseCanvas || cachedNoiseAmount !== noiseAmount) {
                cachedNoiseCanvas = document.createElement('canvas');
                cachedNoiseCanvas.width = 256;
                cachedNoiseCanvas.height = 256;
                const noiseCtx = cachedNoiseCanvas.getContext('2d');
                const noiseData = noiseCtx.createImageData(256, 256);
                const data = noiseData.data;
                
                for (let i = 0; i < data.length; i += 4) {
                    const val = Math.floor(Math.random() * 255);
                    data[i] = val;
                    data[i + 1] = val;
                    data[i + 2] = val;
                    data[i + 3] = (noiseAmount / 100) * 255; 
                }
                noiseCtx.putImageData(noiseData, 0, 0);
                cachedNoiseAmount = noiseAmount;
            }

            frostedCtx.save();
            frostedCtx.globalCompositeOperation = 'overlay';
            const pattern = frostedCtx.createPattern(cachedNoiseCanvas, 'repeat');
            frostedCtx.fillStyle = pattern;
            frostedCtx.fillRect(0, 0, frostedCanvas.width, frostedCanvas.height);
            frostedCtx.restore();
        }

        if (tint) {
            frostedCtx.save();
            frostedCtx.globalCompositeOperation = 'soft-light';
            frostedCtx.fillStyle = tint;
            frostedCtx.fillRect(0, 0, frostedCanvas.width, frostedCanvas.height);
            
            frostedCtx.globalCompositeOperation = 'source-over';
            frostedCtx.globalAlpha = 0.2;
            frostedCtx.fillStyle = tint;
            frostedCtx.fillRect(0, 0, frostedCanvas.width, frostedCanvas.height);
            frostedCtx.restore();
        }

        ctx.save();
        ctx.globalAlpha = opacity / 100;
        ctx.drawImage(frostedCanvas, 0, 0);
        ctx.restore();
    }    function glitch(imageData, amount) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const intensity = amount / 100;
        
        const originalData = new Uint8ClampedArray(data);
        
        const numGlitchLines = Math.floor(intensity * 15);
        for (let i = 0; i < numGlitchLines; i++) {
            const y = Math.floor(Math.random() * height);
            const displacement = Math.floor((Math.random() - 0.5) * intensity * 50);
            const lineHeight = Math.floor(Math.random() * 3) + 1;
            
            for (let dy = 0; dy < lineHeight && y + dy < height; dy++) {
                for (let x = 0; x < width; x++) {
                    const sourceX = Math.max(0, Math.min(width - 1, x + displacement));
                    const sourceIndex = ((y + dy) * width + sourceX) * 4;
                    const targetIndex = ((y + dy) * width + x) * 4;
                    
                    data[targetIndex] = originalData[sourceIndex];
                    data[targetIndex + 1] = originalData[sourceIndex + 1];
                    data[targetIndex + 2] = originalData[sourceIndex + 2];
                    data[targetIndex + 3] = originalData[sourceIndex + 3];
                }
            }
        }
        
        const channelShift = Math.floor(intensity * 8);
        if (channelShift > 0) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    
                    const redX = Math.max(0, Math.min(width - 1, x + channelShift));
                    const redIndex = (y * width + redX) * 4;
                    data[index] = originalData[redIndex];
                    
                    const blueX = Math.max(0, Math.min(width - 1, x - channelShift));
                    const blueIndex = (y * width + blueX) * 4;
                    data[index + 2] = originalData[blueIndex + 2];
                }
            }
        }
        
        const numBlocks = Math.floor(intensity * 8);
        for (let i = 0; i < numBlocks; i++) {
            const blockX = Math.floor(Math.random() * width);
            const blockY = Math.floor(Math.random() * height);
            const blockWidth = Math.floor(Math.random() * 20) + 5;
            const blockHeight = Math.floor(Math.random() * 5) + 1;
            
            for (let y = blockY; y < Math.min(height, blockY + blockHeight); y++) {
                for (let x = blockX; x < Math.min(width, blockX + blockWidth); x++) {
                    const index = (y * width + x) * 4;
                    const brightness = Math.random() > 0.5 ? 255 : 0;
                    data[index] = brightness;
                    data[index + 1] = brightness;
                    data[index + 2] = brightness;
                }
            }
        }
        
        if (intensity > 0.3) {
            const numCorruptLines = Math.floor(intensity * 5);
            for (let i = 0; i < numCorruptLines; i++) {
                const y = Math.floor(Math.random() * height);
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    data[index] = Math.random() * 255;
                    data[index + 1] = Math.random() * 100;
                    data[index + 2] = Math.random() * 255;
                }
            }
        }
    }

    function noise(data, amount) {
        const value = (amount / 100) * 128;
        for (let i = 0; i < data.length; i += 4) {
            const random = (Math.random() - 0.5) * value;
            data[i] += random;
            data[i + 1] += random;
            data[i + 2] += random;
        }
    }

    function chromaticAberration(imageData, amount) {
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data);
        const width = imageData.width;
        const height = imageData.height;
        amount = Math.floor(amount);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                
                
                const r_x = Math.min(width - 1, Math.max(0, x + amount));
                const b_x = Math.min(width - 1, Math.max(0, x - amount));
                
                const r_offset = (y * width + r_x) * 4;
                const b_offset = (y * width + b_x) * 4;

                data[i] = newData[r_offset];    
                data[i + 1] = newData[i + 1];   
                data[i + 2] = newData[b_offset + 2];
            }
        }
    }    function getOptimalBackgroundColor(data, width, height) {
        return '#000000';
    }
    
    function dottedMatrix(canvas, ctx, dotSize) {
        if (dotSize <= 0) return;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let backgroundColor = null;
        if (isRecording) {
            backgroundColor = getOptimalBackgroundColor(data, width, height);
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.clearRect(0, 0, width, height);
        }

        const spacing = Math.max(2, Math.floor(dotSize));
        
        for (let y = 0; y < height; y += spacing) {
            for (let x = 0; x < width; x += spacing) {
                const i = (y * width + x) * 4;
                const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
                
                if (a === 0) continue;
                
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255; 
                const maxRadius = spacing / 2;
                const radius = brightness * maxRadius;

                if (radius > 0.5) { 
                    ctx.beginPath();
                    ctx.arc(x + spacing / 2, y + spacing / 2, radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${r},${g},${b},${a/255})`;
                    ctx.fill();
                }
            }
        }
    }


    function squareMatrix(canvas, ctx, dotSize) {
        if (dotSize <= 0) return;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        let backgroundColor = null;
        if (isRecording) {
            backgroundColor = getOptimalBackgroundColor(data, width, height);
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.clearRect(0, 0, width, height);
        }

        const spacing = Math.max(2, Math.floor(dotSize));
        
        for (let y = 0; y < height; y += spacing) {
            for (let x = 0; x < width; x += spacing) {
                const i = (y * width + x) * 4;
                const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
                
                if (a === 0) continue;
                
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255; 
                const maxSize = spacing;
                const size = Math.floor(brightness * maxSize);

                if (size > 0) { 
                    ctx.fillStyle = `rgba(${r},${g},${b},${a/255})`;
                    const offset = (spacing - size) / 2;
                    ctx.fillRect(x + offset, y + offset, size, size);
                }
            }
        }
    }

    function duotone(data, color1, color2) {
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);
        if (!c1 || !c2) return;
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const t = avg / 255;
            data[i] = c1.r * (1 - t) + c2.r * t;
            data[i + 1] = c1.g * (1 - t) + c2.g * t;
            data[i + 2] = c1.b * (1 - t) + c2.b * t;        }
    }
    
    function filmGrain(imageData, intensity, size, monochrome) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const intFactor = intensity / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            let noiseR = (Math.random() - 0.5) * 255 * intFactor;
            let noiseG, noiseB;
            if (monochrome) {
                noiseG = noiseR;
                noiseB = noiseR;
            } else {
                noiseG = (Math.random() - 0.5) * 255 * intFactor;
                noiseB = (Math.random() - 0.5) * 255 * intFactor;
            }
            
            data[i] = Math.min(255, Math.max(0, data[i] + noiseR));
            data[i+1] = Math.min(255, Math.max(0, data[i+1] + noiseG));
            data[i+2] = Math.min(255, Math.max(0, data[i+2] + noiseB));
        }
    }

    function pixelSort(imageData, threshold, direction) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const threshData = threshold / 100 * 255;
        
        for (let y = 0; y < height; y++) {
            let sortStart = -1;
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const brightness = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
                
                if (brightness > threshData) {
                    if (sortStart === -1) sortStart = x;
                } else {
                    if (sortStart !== -1) {
                        const runPixels = [];
                        for (let k = sortStart; k < x; k++) {
                            const ki = (y * width + k) * 4;
                            runPixels.push({
                                r: data[ki], g: data[ki+1], b: data[ki+2], a: data[ki+3],
                                br: (data[ki]*0.299 + data[ki+1]*0.587 + data[ki+2]*0.114)
                            });
                        }
                        if (direction < 50) {
                            runPixels.sort((a,b) => a.br - b.br);
                        } else {
                            runPixels.sort((a,b) => b.br - a.br);
                        }
                        for (let k = sortStart; k < x; k++) {
                            const ki = (y * width + k) * 4;
                            const p = runPixels[k - sortStart];
                            data[ki] = p.r;
                            data[ki+1] = p.g;
                            data[ki+2] = p.b;
                        }
                        sortStart = -1;
                    }
                }
            }
        }
    }

    function asciiArt(imageData, size, fontSize, symbols, invert, fontFamily) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const chars = symbols || " ";
        const fFamily = fontFamily || 'monospace';
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = invert ? '#ffffff' : '#000000';
        tempCtx.fillRect(0, 0, width, height);
        tempCtx.font = `${fontSize}px ${fFamily}`;
        tempCtx.textBaseline = 'middle';
        tempCtx.textAlign = 'center';
        
        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                const i = (y * width + x) * 4;
                const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
                if (a === 0) continue;
                
                let brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                if (invert) brightness = 1 - brightness;
                
                const charIndex = Math.floor(brightness * (chars.length - 1));
                const char = chars[charIndex];
                
                tempCtx.fillStyle = `rgba(${r},${g},${b},${a/255})`;
                tempCtx.fillText(char, x + size / 2, y + size / 2);
            }
        }
        
        const newImageData = tempCtx.getImageData(0, 0, width, height);
        for(let i=0; i<data.length; i++) {
            data[i] = newImageData.data[i];
        }
    }

    function crt(canvas, ctx, config) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        const intensity = config.intensity / 100;
        const curvature = config.curvature / 100;
        const scanlines = config.scanlines / 100;
        const glow = config.glow;
        
        const output = new Uint8ClampedArray(data);
        
        const scanlineCount = Math.floor(height * scanlines * 0.5) || 1;
        const scanlineFactor = height / scanlineCount;
        
        for (let y = 0; y < height; y++) {
            const ny = (y / height) * 2 - 1; 
            for (let x = 0; x < width; x++) {
                const nx = (x / width) * 2 - 1; 
                
                let rd = nx * nx + ny * ny;
                let rx = nx * (1 + curvature * rd);
                let ry = ny * (1 + curvature * rd);
                
                if (rx < -1 || rx > 1 || ry < -1 || ry > 1) {
                    const idx = (y * width + x) * 4;
                    output[idx] = 0; output[idx+1] = 0; output[idx+2] = 0; output[idx+3] = 255;
                    continue;
                }
                
                let sx = Math.floor(((rx + 1) / 2) * width);
                let sy = Math.floor(((ry + 1) / 2) * height);
                
                sx = Math.max(0, Math.min(width - 1, sx));
                sy = Math.max(0, Math.min(height - 1, sy));
                
                const srcIdx = (sy * width + sx) * 4;
                const dstIdx = (y * width + x) * 4;
                
                let colorBleed = Math.floor(intensity * 3);
                output[dstIdx] = data[srcIdx];
                
                let greenIdx = (sy * width + Math.max(0, sx - colorBleed)) * 4;
                output[dstIdx+1] = data[greenIdx+1];
                
                let blueIdx = (sy * width + Math.min(width - 1, sx + colorBleed)) * 4;
                output[dstIdx+2] = data[blueIdx+2];
                output[dstIdx+3] = data[srcIdx+3];
                
                const scan = Math.sin(y * Math.PI / scanlineFactor);
                const darken = 1 - (intensity * 0.5 * (1 - scan));
                output[dstIdx] *= darken;
                output[dstIdx+1] *= darken;
                output[dstIdx+2] *= darken;
            }
        }
        
        ctx.putImageData(new ImageData(output, width, height), 0, 0);
        
        if (glow) {
            const glowCanvas = document.createElement('canvas');
            glowCanvas.width = width;
            glowCanvas.height = height;
            const gCtx = glowCanvas.getContext('2d');
            gCtx.putImageData(new ImageData(output, width, height), 0, 0);
            
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.5 * intensity;
            ctx.filter = `blur(${Math.max(2, intensity * 10)}px)`;
            ctx.drawImage(glowCanvas, 0, 0);
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
            ctx.filter = 'none';
        }
    }
    
    function dottedLine(canvas, ctx, lineSpacing = 4) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        ctx.clearRect(0, 0, width, height);

        const spacing = Math.max(2, Math.floor(22 - lineSpacing));

        for (let y = 0; y < height; y += spacing) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];                
                if (a === 0) continue;                
                ctx.fillStyle = `rgba(${r},${g},${b},${a/255})`;
                ctx.fillRect(x, y, 2, 2);
            }        }
    }

    function posterize(imageData, levels) {
        if (levels <= 0) return;
        const data = imageData.data;
        const numLevels = Math.max(2, Math.min(255, Math.floor(levels + 2)));
        const stepSize = 255 / (numLevels - 1);
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.round(data[i] / stepSize) * stepSize;
            data[i + 1] = Math.round(data[i + 1] / stepSize) * stepSize;
            data[i + 2] = Math.round(data[i + 2] / stepSize) * stepSize;
        }
    }

    function oilPainting(imageData, radius) {
        if (radius <= 0) return;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const output = new Uint8ClampedArray(data.length);

        
        const windowSize = Math.max(3, 2 * Math.floor(radius / 2) + 1);
        const halfWindow = Math.floor(windowSize / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;

                
                const quadrants = [
                    { minX: x - halfWindow, maxX: x, minY: y - halfWindow, maxY: y },
                    { minX: x + 1, maxX: x + halfWindow, minY: y - halfWindow, maxY: y },
                    { minX: x - halfWindow, maxX: x, minY: y + 1, maxY: y + halfWindow },
                    { minX: x + 1, maxX: x + halfWindow, minY: y + 1, maxY: y + halfWindow }
                ];

                let minVariance = Infinity;
                let bestMeanR = 0, bestMeanG = 0, bestMeanB = 0;

                for (const quad of quadrants) {
                    let sumR = 0, sumG = 0, sumB = 0, count = 0;
                    let sumSqR = 0, sumSqG = 0, sumSqB = 0;

                    for (let qy = quad.minY; qy <= quad.maxY; qy++) {
                        for (let qx = quad.minX; qx <= quad.maxX; qx++) {
                            if (qx >= 0 && qx < width && qy >= 0 && qy < height) {
                                const qIndex = (qy * width + qx) * 4;
                                const r = data[qIndex];
                                const g = data[qIndex + 1];
                                const b = data[qIndex + 2];

                                sumR += r;
                                sumG += g;
                                sumB += b;
                                sumSqR += r * r;
                                sumSqG += g * g;
                                sumSqB += b * b;
                                count++;
                            }
                        }
                    }

                    if (count > 0) {
                        const meanR = sumR / count;
                        const meanG = sumG / count;
                        const meanB = sumB / count;

                        const varR = (sumSqR / count) - (meanR * meanR);
                        const varG = (sumSqG / count) - (meanG * meanG);
                        const varB = (sumSqB / count) - (meanB * meanB);
                        const variance = varR + varG + varB;

                        if (variance < minVariance) {
                            minVariance = variance;
                            bestMeanR = meanR;
                            bestMeanG = meanG;
                            bestMeanB = meanB;
                        }
                    }
                }

                output[index] = Math.round(bestMeanR);
                output[index + 1] = Math.round(bestMeanG);
                output[index + 2] = Math.round(bestMeanB);
                output[index + 3] = data[index + 3];
            }
        }

        
        for (let i = 0; i < data.length; i++) {
            data[i] = output[i];
        }
    }

    function kaleidoscope(canvas, ctx, segments) {
        if (segments <= 0) return;
        const segmentCount = Math.max(2, Math.floor(segments + 2));
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const angleStep = (Math.PI * 2) / segmentCount;
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < segmentCount; i++) {
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.putImageData(imageData, 0, 0);
            
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 1 / segmentCount;
            ctx.translate(centerX, centerY);
            ctx.rotate(i * angleStep);
            if (i % 2 === 1) {
                ctx.scale(1, -1); 
            }
            ctx.drawImage(tempCanvas, -centerX, -centerY);
            ctx.restore();
        }
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }

    function emboss(imageData, amount) {
        if (amount <= 0) return;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const originalData = new Uint8ClampedArray(data);
        
        const kernel = [
            [-2, -1, 0],
            [-1, 1, 1],
            [0, 1, 2]
        ];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;
                
                for (let ky = 0; ky < 3; ky++) {
                    for (let kx = 0; kx < 3; kx++) {
                        const px = x + kx - 1;
                        const py = y + ky - 1;
                        const idx = (py * width + px) * 4;
                        const weight = kernel[ky][kx];
                        
                        r += originalData[idx] * weight;
                        g += originalData[idx + 1] * weight;
                        b += originalData[idx + 2] * weight;
                    }
                }
                
                const idx = (y * width + x) * 4;
                const intensity = amount / 100;
                data[idx] = Math.max(0, Math.min(255, 128 + r * intensity));
                data[idx + 1] = Math.max(0, Math.min(255, 128 + g * intensity));
                data[idx + 2] = Math.max(0, Math.min(255, 128 + b * intensity));
            }
        }
    }

    function solarize(imageData, threshold) {
        const data = imageData.data;
        const solarizeThreshold = (threshold / 100) * 255;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > solarizeThreshold) data[i] = 255 - data[i];
            if (data[i + 1] > solarizeThreshold) data[i + 1] = 255 - data[i + 1];
            if (data[i + 2] > solarizeThreshold) data[i + 2] = 255 - data[i + 2];
        }
    }

    function crossHatch(imageData, intensity) {
        if (intensity <= 0) return;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const originalData = new Uint8ClampedArray(data);
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = originalData[i] * 0.299 + originalData[i + 1] * 0.587 + originalData[i + 2] * 0.114;
            data[i] = data[i + 1] = data[i + 2] = gray;
        }
        
        const effectIntensity = intensity / 100;
        const hatchSpacing = 4;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const brightness = data[idx] / 255;
                
                let shouldDarken = false;
                
                if (brightness < 0.8 && (x + y) % hatchSpacing === 0) {
                    shouldDarken = true;
                }
                
                if (brightness < 0.6 && (x - y) % hatchSpacing === 0) {
                    shouldDarken = true;
                }
                
                if (brightness < 0.4 && x % hatchSpacing === 0) {
                    shouldDarken = true;
                }
                
                if (brightness < 0.2 && y % hatchSpacing === 0) {
                    shouldDarken = true;
                }
                
                if (shouldDarken) {
                    const darkenAmount = 80 * effectIntensity;
                    data[idx] = Math.max(0, data[idx] - darkenAmount);
                    data[idx + 1] = Math.max(0, data[idx + 1] - darkenAmount);
                    data[idx + 2] = Math.max(0, data[idx + 2] - darkenAmount);
                } else {
                    const lightenAmount = 20 * effectIntensity;
                    data[idx] = Math.min(255, data[idx] + lightenAmount);
                    data[idx + 1] = Math.min(255, data[idx + 1] + lightenAmount);
                    data[idx + 2] = Math.min(255, data[idx + 2] + lightenAmount);
                }
            }
        }
    }

    function thermalVision(imageData, intensity) {
        const data = imageData.data;
        const amount = intensity / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const temp = brightness / 255;
            
            let r, g, b;
            if (temp < 0.25) {
                r = 0;
                g = 0;
                b = Math.floor(255 * (temp * 4));
            } else if (temp < 0.5) {
                r = 0;
                g = Math.floor(255 * ((temp - 0.25) * 4));
                b = 255;
            } else if (temp < 0.75) {
                r = Math.floor(255 * ((temp - 0.5) * 4));
                g = 255;
                b = Math.floor(255 * (1 - (temp - 0.5) * 4));
            } else {
                r = 255;
                g = Math.floor(255 * (1 - (temp - 0.75) * 4));
                b = 0;
            }
            
            data[i] = data[i] * (1 - amount) + r * amount;
            data[i + 1] = data[i + 1] * (1 - amount) + g * amount;
            data[i + 2] = data[i + 2] * (1 - amount) + b * amount;
        }
    }

    function neonGlow(imageData, intensity) {
        if (intensity <= 0) return;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const originalData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                let edgeR = 0, edgeG = 0, edgeB = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nIdx = ((y + dy) * width + (x + dx)) * 4;
                        edgeR += originalData[nIdx] * (dx === 0 && dy === 0 ? -8 : 1);
                        edgeG += originalData[nIdx + 1] * (dx === 0 && dy === 0 ? -8 : 1);
                        edgeB += originalData[nIdx + 2] * (dx === 0 && dy === 0 ? -8 : 1);
                    }
                }
                
                const edgeStrength = Math.sqrt(edgeR * edgeR + edgeG * edgeG + edgeB * edgeB) / 100;
                const glow = Math.min(255, edgeStrength * intensity);
                
                const glowAmount = glow / 255;
                data[idx] = Math.min(255, originalData[idx] + originalData[idx] * glowAmount);
                data[idx + 1] = Math.min(255, originalData[idx + 1] + originalData[idx + 1] * glowAmount * 0.5);
                data[idx + 2] = Math.min(255, originalData[idx + 2] + originalData[idx + 2] * glowAmount * 1.5);
            }
        }
    }

    function badApple(imageData, threshold, fuzz) {
        if (threshold <= 0) return;
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        const cutoff = (threshold / 100) * 255;
        const fuzzFactor = fuzz / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            let gray = (r + g + b) / 3;
            
            gray = Math.pow(gray / 255, 0.7) * 255;
            
            const adjustedCutoff = cutoff + (fuzzFactor * 50);
            let result;
            
            if (gray < adjustedCutoff) {
                result = 0;
            } else {
                result = 255;
            }
            
            data[i] = result;
            data[i + 1] = result;
            data[i + 2] = result;
        }
        
        const cleaned = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                const values = [];
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nIdx = ((y + dy) * width + (x + dx)) * 4;
                        values.push(cleaned[nIdx]);
                    }
                }
                
                let blackCount = 0;
                let whiteCount = 0;
                
                for (let v of values) {
                    if (v < 128) blackCount++;
                    else whiteCount++;
                }
                
                const finalValue = blackCount > whiteCount ? 0 : 255;
                
                data[idx] = finalValue;
                data[idx + 1] = finalValue;
                data[idx + 2] = finalValue;
            }
        }
    }

    function calculateBlinkBitrate(width, height) {
        const estimated = width * height * BLINK_TARGET_FPS * BLINK_BITS_PER_PIXEL;
        return Math.round(Math.min(BLINK_MAX_BITRATE, Math.max(BLINK_MIN_BITRATE, estimated)));
    }

    function getBlinkMimeType() {
        if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
            return '';
        }

        return BLINK_MIME_CANDIDATES.find(type => MediaRecorder.isTypeSupported(type)) || '';
    }

    function startFallbackCapture() {
        if (isFallbackCapturing) return;

        isFallbackCapturing = true;
        fallbackFrames = [];

        fallbackCaptureCanvas = document.createElement('canvas');
        fallbackCaptureCanvas.width = canvas.width;
        fallbackCaptureCanvas.height = canvas.height;
        fallbackCaptureCtx = fallbackCaptureCanvas.getContext('2d', {
            alpha: false,
            colorSpace: 'srgb',
            willReadFrequently: false
        });

        const intervalMs = Math.max(1000 / BLINK_FALLBACK_CAPTURE_FPS, 50);
        captureFrame();
        fallbackCaptureTimer = setInterval(() => {
            if (!isFallbackCapturing) return;
            captureFrame();
        }, intervalMs);
    }

    function stopFallbackCapture() {
        if (fallbackCaptureTimer) {
            clearInterval(fallbackCaptureTimer);
            fallbackCaptureTimer = null;
        }
        isFallbackCapturing = false;
        fallbackCaptureCanvas = null;
        fallbackCaptureCtx = null;
    }

    function captureFrame() {
        if (!isFallbackCapturing || !fallbackCaptureCtx || !fallbackCaptureCanvas) {
            return;
        }

        try {
            fallbackCaptureCtx.clearRect(0, 0, fallbackCaptureCanvas.width, fallbackCaptureCanvas.height);
            fallbackCaptureCtx.drawImage(canvas, 0, 0, fallbackCaptureCanvas.width, fallbackCaptureCanvas.height);
            fallbackFrames.push(fallbackCaptureCanvas.toDataURL('image/webp', 0.95));
        } catch (error) {
            console.error('Fallback frame capture failed:', error);
        }
    }

    function startRecording() {
        if (!originalImageData) {
            showError('Please upload an image first!');
            return;
        }

        if (isRecording) {
            return;
        }

        isRecording = true;
        recordedChunks = [];
        fallbackFrames = [];
        mediaRecorderMimeType = '';
        blinkBtn.textContent = 'Recording... 5s';
        blinkBtn.disabled = true;
        blinkBtn.style.backgroundColor = '#dc2626';

        if (hasAnimatedEffects() && !animationFrameId) {
            animate();
        }

        const streamFps = BLINK_TARGET_FPS;

        try {
            recordingStream = canvas.captureStream(streamFps);
            const mimeType = getBlinkMimeType();
            mediaRecorderMimeType = mimeType || 'video/webm';
            const recorderOptions = {
                videoBitsPerSecond: calculateBlinkBitrate(canvas.width, canvas.height)
            };

            if (mimeType) {
                recorderOptions.mimeType = mimeType;
            }

            mediaRecorder = new MediaRecorder(recordingStream, recorderOptions);
            mediaRecorder.ondataavailable = event => {
                if (event.data && event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            mediaRecorder.onerror = handleMediaRecorderError;
            mediaRecorder.onstop = handleMediaRecorderStop;
            mediaRecorder.start(Math.round(1000 / streamFps));
        } catch (error) {
            console.error('MediaRecorder unavailable, falling back to frame capture:', error);
            mediaRecorder = null;
            recordingStream = null;
            startFallbackCapture();
        }

        if (!mediaRecorder || mediaRecorder.state !== 'recording') {
            startFallbackCapture();
        }

        recordingStartTime = performance.now();
        if (recordingTimeoutId) {
            clearTimeout(recordingTimeoutId);
        }
        recordingTimeoutId = setTimeout(stopRecording, BLINK_DURATION_MS);
    }

    function stopRecording() {
        if (!isRecording) {
            return;
        }

        isRecording = false;

        if (recordingTimeoutId) {
            clearTimeout(recordingTimeoutId);
            recordingTimeoutId = null;
        }

        blinkBtn.textContent = 'Processing Video...';

        if (mediaRecorder && mediaRecorder.state === 'recording') {
            try {
                mediaRecorder.stop();
                return;
            } catch (error) {
                console.error('Failed to stop MediaRecorder gracefully:', error);
                mediaRecorder = null;
            }
        }

        finalizeBlinkRecording();
    }

    function handleMediaRecorderError(event) {
        console.error('MediaRecorder error:', event.error || event);

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
                mediaRecorder.stop();
            } catch (error) {
                console.error('MediaRecorder stop after error failed:', error);
            }
        }

        mediaRecorder = null;
        recordingStream = null;

        if (!isFallbackCapturing) {
            startFallbackCapture();
        }
    }

    function handleMediaRecorderStop() {
        finalizeBlinkRecording();
    }

    function downloadBlinkBlob(blob) {
        const durationSeconds = BLINK_DURATION_MS / 1000;
        const metadata = {
            title: originalFileName || 'Untitled',
            subtitle: 'made using wink!',
            size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
            duration: `${durationSeconds.toFixed(1)} seconds`,
            format: mediaRecorderMimeType || 'video/webm',
            bitrate: `${((blob.size * 8) / durationSeconds / 1000 / 1000).toFixed(2)} Mbps`,
            timestamp: new Date().toISOString()
        };

        console.log('Blink video metadata:', metadata);

        const baseFileName = originalFileName || 'wink-animation';
        const fileName = `${baseFileName}-wink-blink.webm`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        showSuccess('HD blink video ready!');
        resetBlinkButton();
    }

    function finalizeBlinkRecording() {
        stopFallbackCapture();

        if (recordingStream) {
            try {
                recordingStream.getTracks().forEach(track => track.stop());
            } catch (error) {
                console.error('Failed to stop recording stream tracks:', error);
            }
        }
        recordingStream = null;

        const hasVideo = recordedChunks.length > 0;

        if (hasVideo) {
            const blob = new Blob(recordedChunks, { type: mediaRecorderMimeType || 'video/webm' });
            recordedChunks = [];
            downloadBlinkBlob(blob);
            return;
        }

        if (fallbackFrames.length > 0) {
            finalizeBlinkFallback();
            return;
        }

        showError('Recording finished but no frames were captured.');
        resetBlinkButton();
    }

    function finalizeBlinkFallback() {
        showInfo('MediaRecorder unavailable — exporting individual HD frames instead.');
        createFramesDownload(fallbackFrames, 'wink-fallback');
    }

    function createFramesDownload(frames, prefix = 'wink-frame') {
        if (!frames || frames.length === 0) {
            resetBlinkButton();
            return;
        }

        frames.forEach((frame, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.download = `${prefix}-${String(index + 1).padStart(3, '0')}.png`;
                link.href = frame;
                link.click();
            }, index * 150);
        });

        setTimeout(() => {
            resetBlinkButton();
        }, frames.length * 150 + 800);
    }

    function resetBlinkButton() {
        isRecording = false;
        stopFallbackCapture();

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
                mediaRecorder.stop();
            } catch (error) {
                console.error('Error stopping MediaRecorder during reset:', error);
            }
        }

        mediaRecorder = null;
        recordingStream = null;
        recordedChunks = [];
        fallbackFrames = [];

        blinkBtn.textContent = 'BLINK (Video)';
        blinkBtn.disabled = false;
        blinkBtn.style.backgroundColor = '';
    }

    function handleFormatChange() {
        const format = formatSelect.value.toLowerCase();
        if (format === 'webm' || format === 'gif') {
            exportVideoBtn.style.display = 'inline-block';
            exportVideoBtn.textContent = format === 'gif' ? 'Export GIF' : 'Export Video';
            downloadBtn.style.display = 'none';
        } else if (isGIFSource) {
            exportVideoBtn.style.display = 'inline-block';
            exportVideoBtn.textContent = 'Export GIF';
            downloadBtn.style.display = 'inline-block';
        } else {
            exportVideoBtn.style.display = 'none';
            exportVideoBtn.textContent = 'Export Video';
            downloadBtn.style.display = 'inline-block';
        }
    }

    function startVideoExport() {
        if (!originalImageData) {
            showError('Please upload an image or video first!');
            return;
        }

        if (isVideoExporting || isRecording) {
            return;
        }

        const format = formatSelect.value.toLowerCase();
        if (format !== 'webm' && format !== 'gif') {
            showError('Video export only supports WebM and GIF formats.');
            return;
        }

        if (format === 'gif') {
            if (isGIFSource && gifFrames.length > 0) {
                exportGIFFromGIFSource();
            } else {
                exportGIFFromCanvas();
            }
            return;
        }

        isVideoExporting = true;
        recordedChunks = [];
        fallbackFrames = [];
        mediaRecorderMimeType = '';

        if (isVideoSource && currentVideo && videoOriginalDuration > 0) {
            videoExportDuration = videoOriginalDuration;
            currentVideo.currentTime = 0;
            currentVideo.play().catch(err => {
                console.warn('Failed to restart video for export:', err);
            });
            const durationSeconds = (videoExportDuration / 1000).toFixed(1);
            showInfo(`Exporting full ${durationSeconds}s video with effects...`);
        } else {
            videoExportDuration = 5000;
        }

        const durationSeconds = (videoExportDuration / 1000).toFixed(1);
        exportVideoBtn.textContent = `Exporting WEBM (${durationSeconds}s)...`;
        exportVideoBtn.disabled = true;
        exportVideoBtn.style.backgroundColor = '#dc2626';

        if (hasAnimatedEffects() && !animationFrameId) {
            animate();
        }

        let streamFps;
        if (isVideoSource) {
            streamFps = 60;
        } else {
            streamFps = BLINK_TARGET_FPS;
        }

        try {
            recordingStream = canvas.captureStream(streamFps);
            const mimeType = getBlinkMimeType();
            mediaRecorderMimeType = mimeType || 'video/webm';

            let bitrate = calculateBlinkBitrate(canvas.width, canvas.height);
            if (isVideoSource) {
                bitrate = bitrate * 2;
            }

            const recorderOptions = {
                videoBitsPerSecond: bitrate
            };
            if (mimeType) {
                recorderOptions.mimeType = mimeType;
            }

            console.log(`Starting WebM export: ${durationSeconds}s at ${streamFps}fps, ${(bitrate/1000000).toFixed(1)}Mbps`);

            mediaRecorder = new MediaRecorder(recordingStream, recorderOptions);
            mediaRecorder.ondataavailable = event => {
                if (event.data && event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            mediaRecorder.onerror = handleMediaRecorderError;
            mediaRecorder.onstop = () => finalizeVideoExport(format);
            mediaRecorder.start(Math.round(1000 / streamFps));
        } catch (error) {
            console.error('Video export failed:', error);
            showError('WebM export not supported in this browser.');
            resetVideoExportButton();
            return;
        }

        recordingStartTime = performance.now();
        if (recordingTimeoutId) {
            clearTimeout(recordingTimeoutId);
        }
        recordingTimeoutId = setTimeout(() => stopVideoExport(format), videoExportDuration);
        updateExportProgress(format);
    }

    function exportGIFFromGIFSource() {
        isVideoExporting = true;
        stopGIFPlayback();

        exportVideoBtn.textContent = 'Encoding GIF...';
        exportVideoBtn.disabled = true;
        exportVideoBtn.style.backgroundColor = '#dc2626';

        showInfo(`Encoding GIF: ${gifFrames.length} frames...`);

        getGIFWorkerURL().then(workerURL => {
            const encoder = new GIF({
                workers: Math.min(navigator.hardwareConcurrency || 2, 4),
                quality: 1,
                width: gifWidth,
                height: gifHeight,
                workerScript: workerURL
            });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = gifWidth;
        tempCanvas.height = gifHeight;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        for (let i = 0; i < gifFrames.length; i++) {
            const frame = gifFrames[i];
            canvas.width = gifWidth;
            canvas.height = gifHeight;
            originalImageData = frame.imageData;
            applyAllEffects();
            if (hasAnimatedEffects()) {
                applyAnimatedEffects();
            }

            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);

            encoder.addFrame(tempCtx, {
                copy: true,
                delay: frame.delay
            });
        }

        encoder.on('progress', function(p) {
            exportVideoBtn.textContent = `Encoding GIF... ${Math.round(p * 100)}%`;
        });

        encoder.on('finished', function(blob) {
            const baseFileName = originalFileName || 'wink-animation';
            const fileName = `${baseFileName}-wink.gif`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = fileName;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);

            showSuccess(`GIF exported! ${gifFrames.length} frames, ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
            resetVideoExportButton();

            gifFrameIndex = 0;
            playGIFFrames();
        });

        encoder.render();
        }).catch(err => {
            console.error('Failed to load GIF worker:', err);
            showError('Failed to initialize GIF encoder.');
            resetVideoExportButton();
            gifFrameIndex = 0;
            playGIFFrames();
        });
    }

    function exportGIFFromCanvas() {
        isVideoExporting = true;

        const fps = 15;
        const frameDelay = Math.round(1000 / fps);

        if (isVideoSource && currentVideo && videoOriginalDuration > 0) {
            videoExportDuration = videoOriginalDuration;
            currentVideo.currentTime = 0;
            currentVideo.play().catch(err => {
                console.warn('Failed to restart video for export:', err);
            });
        } else {
            videoExportDuration = 5000;
        }

        const durationSeconds = (videoExportDuration / 1000).toFixed(1);
        exportVideoBtn.textContent = `Capturing GIF (${durationSeconds}s)...`;
        exportVideoBtn.disabled = true;
        exportVideoBtn.style.backgroundColor = '#dc2626';

        if (hasAnimatedEffects() && !animationFrameId) {
            animate();
        }

        showInfo(`Capturing GIF frames for ${durationSeconds}s...`);

        const canvasW = canvas.width;
        const canvasH = canvas.height;

        getGIFWorkerURL().then(workerURL => {
            const encoder = new GIF({
                workers: Math.min(navigator.hardwareConcurrency || 2, 4),
                quality: 1,
                width: canvasW,
                height: canvasH,
                workerScript: workerURL
            });

        gifEncoder = encoder;
        let capturedCount = 0;

        const captureFrame = () => {
            if (!isVideoExporting) return;

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempCtx.drawImage(canvas, 0, 0);

            encoder.addFrame(tempCtx, {
                copy: true,
                delay: frameDelay
            });
            capturedCount++;

            if (isVideoExporting) {
                setTimeout(captureFrame, frameDelay);
            }
        };

        captureFrame();

        recordingStartTime = performance.now();
        if (recordingTimeoutId) {
            clearTimeout(recordingTimeoutId);
        }

        recordingTimeoutId = setTimeout(() => {
            isVideoExporting = false;

            if (capturedCount === 0) {
                showError('No frames captured for GIF.');
                resetVideoExportButton();
                gifEncoder = null;
                return;
            }

            exportVideoBtn.textContent = 'Encoding GIF...';
            showInfo(`Encoding ${capturedCount} frames into GIF...`);

            encoder.on('progress', function(p) {
                exportVideoBtn.textContent = `Encoding GIF... ${Math.round(p * 100)}%`;
            });

            encoder.on('finished', function(blob) {
                const baseFileName = originalFileName || 'wink-animation';
                const fileName = `${baseFileName}-wink.gif`;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = fileName;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);

                showSuccess(`GIF exported! ${capturedCount} frames, ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
                resetVideoExportButton();
                gifEncoder = null;
            });

            encoder.render();
        }, videoExportDuration);

        updateExportProgress('gif');
        }).catch(err => {
            console.error('Failed to load GIF worker:', err);
            showError('Failed to initialize GIF encoder.');
            resetVideoExportButton();
        });
    }

    function updateExportProgress(format) {
        if (!isVideoExporting) return;
        
        const elapsed = performance.now() - recordingStartTime;
        const remaining = Math.max(0, videoExportDuration - elapsed);
        const remainingSeconds = (remaining / 1000).toFixed(1);
        
        if (remaining > 0) {
            exportVideoBtn.textContent = `Exporting ${format.toUpperCase()}... ${remainingSeconds}s`;
            setTimeout(() => updateExportProgress(format), 100);
        }
    }

    function stopVideoExport(format) {
        if (!isVideoExporting) return;

        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        } else {
            finalizeVideoExport(format);
        }
    }

    function finalizeVideoExport(format) {
        if (recordingStream) {
            try {
                recordingStream.getTracks().forEach(track => track.stop());
            } catch (error) {
                console.error('Failed to stop recording stream tracks:', error);
            }
        }
        recordingStream = null;

        const hasVideo = recordedChunks.length > 0;

        if (hasVideo) {
            const blob = new Blob(recordedChunks, { type: mediaRecorderMimeType || 'video/webm' });
            recordedChunks = [];
            downloadVideoBlob(blob, format);
            return;
        }

        showError('Video export finished but no frames were captured.');
        resetVideoExportButton();
    }

    function downloadVideoBlob(blob, format) {
        const durationSeconds = videoExportDuration / 1000;
        const metadata = {
            title: originalFileName || 'Untitled',
            subtitle: 'made using wink!',
            size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
            duration: `${durationSeconds.toFixed(1)} seconds`,
            format: format,
            bitrate: `${((blob.size * 8) / durationSeconds / 1000 / 1000).toFixed(2)} Mbps`,
            timestamp: new Date().toISOString()
        };

        console.log('Video export metadata:', metadata);

        const baseFileName = originalFileName || 'wink-video';
        const extension = format === 'webm' ? 'webm' : 'gif';
        const fileName = `${baseFileName}-wink.${extension}`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        showSuccess(`${format.toUpperCase()} video exported successfully!`);
        resetVideoExportButton();
    }

    function resetVideoExportButton() {
        isVideoExporting = false;
        isFallbackCapturing = false;

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
                mediaRecorder.stop();
            } catch (error) {
                console.error('Error stopping MediaRecorder during reset:', error);
            }
        }

        if (gifEncoder) {
            try { gifEncoder.abort(); } catch (e) {}
            gifEncoder = null;
        }

        if (recordingTimeoutId) {
            clearTimeout(recordingTimeoutId);
            recordingTimeoutId = null;
        }

        mediaRecorder = null;
        recordingStream = null;
        recordedChunks = [];
        fallbackFrames = [];

        exportVideoBtn.textContent = 'Export Video';
        exportVideoBtn.disabled = false;
        exportVideoBtn.style.backgroundColor = '';
        handleFormatChange();
    }

    handleFormatChange();

    function perspective3D(canvas, ctx, config) {
        if (!config.enabled) return;
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.putImageData(imageData, 0, 0);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        
        const rotation = (config.rotation * Math.PI) / 180;
        const skewX = config.skewX / 100;
        const skewY = config.skewY / 100;
        const scaleX = config.scaleX / 100;
        const scaleY = config.scaleY / 100;
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        ctx.transform(
            scaleX,
            skewY * scaleX,
            skewX * scaleY,
            scaleY,
            config.offsetX,
            config.offsetY
        );
        
        ctx.rotate(rotation);
        
        ctx.drawImage(
            tempCanvas,
            -canvas.width / 2,
            -canvas.height / 2,
            canvas.width,
            canvas.height
        );
        
        ctx.restore();
        
        if (config.shadowBlur > 0 && config.shadowOpacity > 0) {
            ctx.save();
            ctx.globalAlpha = config.shadowOpacity / 100;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = config.shadowBlur;
            ctx.shadowOffsetX = config.shadowBlur / 3;
            ctx.shadowOffsetY = config.shadowBlur / 3;
            
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.transform(
                scaleX,
                skewY * scaleX,
                skewX * scaleY,
                scaleY,
                config.offsetX,
                config.offsetY
            );
            ctx.rotate(rotation);
            
            ctx.globalCompositeOperation = 'destination-over';
            ctx.drawImage(
                tempCanvas,
                -canvas.width / 2,
                -canvas.height / 2,
                canvas.width,
                canvas.height
            );
            
            ctx.restore();        }    }

    function badTV(canvas, ctx, speed) {
        if (!badTVOriginalData) {
            badTVOriginalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        
        if (typeof badTVOffset === 'undefined') badTVOffset = 0;
        badTVOffset += speed / 10; 
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const scrollY = badTVOffset % canvas.height;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(badTVOriginalData, 0, 0);
        
        ctx.drawImage(tempCanvas, 0, scrollY, canvas.width, canvas.height - scrollY, 0, 0, canvas.width, canvas.height - scrollY);
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, scrollY, 0, canvas.height - scrollY, canvas.width, scrollY);
        
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2 + 1;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const gradient = ctx.createRadialGradient(
            centerX, centerY, Math.min(canvas.width, canvas.height) * 0.3,
            centerX, centerY, Math.max(canvas.width, canvas.height) * 0.7
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
        
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.fillStyle = 'rgba(255, 200, 150, 0.1)';
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
    }

    function spinningRainbowWheel(canvas, ctx, opacity, speed) {
        if (typeof rainbowAngle === 'undefined') rainbowAngle = 0;
        rainbowAngle += speed / 100;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / 2;
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(centerX, centerY);
        ctx.rotate(rainbowAngle);
        
        const gradient = ctx.createConicGradient(0, 0, 0);
        
        for (let i = 0; i <= 360; i += 1) { 
            const hue = i;
            const saturation = 100;
            const lightness = 50;
            const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            gradient.addColorStop(i / 360, color);
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
    }

    function liquidMarble(canvas, ctx, opacity, speed, turbulence, scale=50, colorInfluence=50, flowX=50, flowY=50) {
        if (typeof liquidMarbleTime === 'undefined') liquidMarbleTime = 0;
        liquidMarbleTime += speed / 1000;
        liquidMarbleTime = liquidMarbleTime % (Math.PI * 4);
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = 'overlay'
        const scaleFactor = 0.5;
        const scaledWidth = Math.floor(canvas.width * scaleFactor);
        const scaledHeight = Math.floor(canvas.height * scaleFactor);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        const imageData = tempCtx.createImageData(scaledWidth, scaledHeight);
        const data = imageData.data;
        
        const turbulenceFactor = (turbulence / 100) * 2;
        const sF = Math.max(0.1, scale / 100);
        const cInf = colorInfluence / 100;
        const dx = (flowX - 50) / 10;
        const dy = (flowY - 50) / 10;
        
        const freq1 = 0.01 / scaleFactor * sF;
        const freq2 = 0.005 / scaleFactor * sF;
        const freq3 = 0.02 / scaleFactor * sF;
        const freqY1 = 0.01 / scaleFactor * sF;
        const freqY2 = 0.007 / scaleFactor * sF;
        const freqY3 = 0.015 / scaleFactor * sF;
        
        for (let y = 0; y < scaledHeight; y++) {
            for (let x = 0; x < scaledWidth; x++) {
                const i = (y * scaledWidth + x) * 4;
                
                const timeX = liquidMarbleTime * dx;
                const timeY = liquidMarbleTime * dy;
                
                const wave1 = Math.sin((x + timeX * 100) * freq1) * Math.cos((y + timeY * 100) * freqY1);
                const wave2 = Math.sin((x + timeX * 50) * freq2 + liquidMarbleTime) * Math.cos((y + timeY * 50) * freqY2 + liquidMarbleTime);
                const wave3 = Math.sin(x * freq3) * Math.cos(y * freqY3 + liquidMarbleTime * 0.5);
                
                let combinedWave = (wave1 + wave2 * 0.5 + wave3 * 0.3) * turbulenceFactor;
                combinedWave = Math.max(-10, Math.min(10, combinedWave));
                
                const marbleValue = Math.sin(combinedWave) * 80 + 128;
                
                data[i] = Math.max(0, Math.min(255, marbleValue + 15 * cInf));
                data[i + 1] = Math.max(0, Math.min(255, marbleValue - 8 * cInf));
                data[i + 2] = Math.max(0, Math.min(255, marbleValue + 20 * cInf));
                data[i + 3] = 60;
            }
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        
        ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    }


    function matrixRain(canvas, ctx, opacity, speed, density, size, color) {
        
        if (!matrixChars) {
            matrixChars = 'WinssWasHereアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        }

        const fontSize = Math.max(12, size / 2);
        const trailBase = Math.max(5, size / 8);
        const baseColor = hexToRgb(color || '#00ff00');

        if (!matrixDrops || matrixCanvasWidth !== canvas.width || matrixCanvasHeight !== canvas.height || matrixDensity !== density || matrixSize !== size) {
            matrixCanvasWidth = canvas.width;
            matrixCanvasHeight = canvas.height;
            matrixDensity = density;
            matrixSize = size;
            matrixDrops = [];
            const animationDensity = Math.max(1, Math.floor(density * canvas.width / 400));
            for (let i = 0; i < animationDensity; i++) {
                matrixDrops[i] = {
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    speed: Math.random() * 2 + 1,
                    length: Math.random() * trailBase + trailBase / 2,
                    opacity: Math.random() * 0.8 + 0.2
                };
            }
        }

        ctx.save();
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';

        for (let i = 0; i < matrixDrops.length; i++) {
            const drop = matrixDrops[i];

            const trailLength = Math.min(drop.length, trailBase);
            for (let j = 0; j < trailLength; j++) {
                const charY = drop.y - j * fontSize;
                if (charY > 0 && charY < canvas.height) {
                    const alpha = (trailLength - j) / trailLength * drop.opacity;
                    ctx.globalAlpha = Math.max(0, Math.min(1, opacity * alpha));

                    const brightnessFactor = 0.35 + 0.65 * alpha;
                    const finalR = Math.min(255, Math.round(baseColor.r * brightnessFactor));
                    const finalG = Math.min(255, Math.round(baseColor.g * brightnessFactor));
                    const finalB = Math.min(255, Math.round(baseColor.b * brightnessFactor));
                    ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;

                    const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                    ctx.fillText(char, drop.x, charY);
                }
            }

            drop.y += drop.speed * (speed / 50);

            if (drop.y > canvas.height + drop.length * fontSize) {
                drop.y = -drop.length * fontSize;
                drop.x = Math.random() * canvas.width;
                drop.speed = Math.random() * 2 + 1;
                drop.length = Math.random() * trailBase + trailBase / 2;
                drop.opacity = Math.random() * 0.8 + 0.2;
            }
        }

        ctx.restore();
    }

    function glitterField(canvas, ctx, density, size, speed, color) {
        const time = Date.now() * speed / 1000;
        const sparkleCount = Math.max(10, Math.min(500, density));

        ctx.save();

        for (let i = 0; i < sparkleCount; i++) {
            const seed = i * 1000;
            const noise1 = Math.sin(time * 0.01 + seed * 0.017) * Math.cos(time * 0.008 + seed * 0.023);
            const noise2 = Math.sin(time * 0.012 + seed * 0.031) * Math.cos(time * 0.006 + seed * 0.019);
            const noise3 = Math.sin(time * 0.009 + seed * 0.041) * Math.cos(time * 0.011 + seed * 0.037);

            const movementX = (noise1 + noise2 * 0.7) * 120;
            const movementY = (noise2 + noise3 * 0.8) * 90;

            const gridSize = Math.ceil(Math.sqrt(sparkleCount));
            const cellWidth = canvas.width / gridSize;
            const cellHeight = canvas.height / gridSize;
            const gridX = i % gridSize;
            const gridY = Math.floor(i / gridSize);
            const baseX = gridX * cellWidth + (Math.sin(seed * 0.01) * cellWidth * 0.4);
            const baseY = gridY * cellHeight + (Math.cos(seed * 0.015) * cellHeight * 0.4);

            const x = baseX + movementX;
            const y = baseY + movementY;

            const clampedX = ((x % canvas.width) + canvas.width) % canvas.width;
            const clampedY = ((y % canvas.height) + canvas.height) % canvas.height;

            const twinkleSeed = seed * 0.1;
            const twinkle = Math.sin(time * 0.05 + twinkleSeed) * Math.cos(time * 0.03 + twinkleSeed * 1.3) * 0.5 + 0.5;
            const alpha = twinkle * 0.9 + 0.1;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;

            const sparkleSize = size;
            ctx.shadowColor = color;
            ctx.shadowBlur = sparkleSize * 2;

            ctx.beginPath();
            ctx.arc(clampedX, clampedY, sparkleSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(clampedX - sparkleSize * 1.5, clampedY);
            ctx.lineTo(clampedX + sparkleSize * 1.5, clampedY);
            ctx.moveTo(clampedX, clampedY - sparkleSize * 1.5);
            ctx.lineTo(clampedX, clampedY + sparkleSize * 1.5);
            ctx.strokeStyle = color;
            ctx.lineWidth = sparkleSize * 0.3;
            ctx.globalAlpha = alpha * 0.7;
            ctx.stroke();
        }

        ctx.restore();
    }

    function stormSyndrome(canvas, ctx, intensity, speed) {
        if (intensity <= 0) return;

        const time = Date.now() * (speed / 1000);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const output = new Uint8ClampedArray(data);

        const intFactor = intensity / 100;
        const maxMeltDist = 80 * intFactor; // reduced purely vertical tearing

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                
                // Cohesive 2D distortion (Simulating fluid reverse gravity)
                const noiseX = Math.sin(y * 0.01 + time * 1.2) + Math.cos(x * 0.02 + time * 0.8);
                const noiseY = Math.sin(x * 0.015 - time * 2) + Math.cos(y * 0.005 + time);
                
                // Only pull upwards
                const meltDistY = Math.max(0, noiseY * maxMeltDist);
                const meltDistX = noiseX * (maxMeltDist * 0.3); // Slight horizontal sway
                
                let sourceX = Math.floor(x + meltDistX);
                let sourceY = Math.floor(y + meltDistY);
                
                sourceX = Math.max(0, Math.min(width - 1, sourceX));
                
                if (sourceY < height && meltDistY > 5 * intFactor) {
                    const srcI = (sourceY * width + sourceX) * 4;
                    output[i] = data[srcI];
                    output[i+1] = data[srcI+1];
                    output[i+2] = data[srcI+2];
                    output[i+3] = data[srcI+3];
                    
                    // Iridescent storm shine (More subtle)
                    const sheen = (Math.sin(x * 0.01 + y * 0.02 + time * 3) + 1) / 2;
                    if (sheen > 0.6) {
                        let hue = (x * 0.1 + y * 0.1 + time * 50) % 360;
                        const oilR = Math.sin(hue * Math.PI / 180) * 127 + 128;
                        const oilG = Math.sin((hue + 120) * Math.PI / 180) * 127 + 128;
                        const oilB = Math.sin((hue + 240) * Math.PI / 180) * 127 + 128;
                        
                        const blend = (sheen - 0.6) * 0.8 * intFactor; 
                        output[i] = output[i] * (1 - blend) + oilR * blend;
                        output[i+1] = output[i+1] * (1 - blend) + oilG * blend;
                        output[i+2] = output[i+2] * (1 - blend) + oilB * blend;
                    }
                } else {
                    output[i] = data[i];
                    output[i+1] = data[i+1];
                    output[i+2] = data[i+2];
                    output[i+3] = data[i+3];
                }
            }
        }
        
        ctx.putImageData(new ImageData(output, width, height), 0, 0);
        
        // Reverse Rain Particles (Thinner, faster)
        const particleCount = Math.floor(width * 2 * intFactor);
        ctx.fillStyle = `rgba(220, 230, 255, ${0.3 * intFactor})`;
        for(let p = 0; p < particleCount; p++) {
            let px = (p * 137 + time * 30) % width;
            let py = height - ((p * 227 + time * speed * 30) % height);
            let pHeight = 10 + Math.random() * 40 * intFactor;
            ctx.fillRect(px, py, Math.random() < 0.5 ? 1 : 2, pHeight);
        }
    }

    function melt(canvas, ctx, intensity, speed) {
        if (intensity <= 0) return;

        const time = Date.now() * (speed / 200);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const output = new Uint8ClampedArray(data);

        const intensityFactor = intensity / 100;

        const freqX1 = 0.012;
        const freqY1 = 0.008;
        const freqDrip1 = 0.006;
        const freqDrip2 = 0.004;
        const freqWave1 = 0.01;
        const freqWave2 = 0.007;

        const stepSize = 3;

        for (let y = 0; y < height; y += stepSize) {
            for (let x = 0; x < width; x += stepSize) {
                const index = (y * width + x) * 4;

                const drip1 = Math.sin(x * freqDrip1 + time * 0.005) * Math.cos(y * freqDrip2 + time * 0.003);
                const drip2 = Math.sin((x + y) * freqWave1 + time * 0.004) * Math.cos(x * freqWave2 + time * 0.006);

                const meltOffset = (drip1 + drip2 * 0.7) * intensityFactor * 15;
                const sourceY = Math.max(0, Math.min(height - 1, y + meltOffset));

                const sourceIndex = (Math.floor(sourceY) * width + x) * 4;
                for (let c = 0; c < 4; c++) {
                    output[index + c] = data[sourceIndex + c];
                }
            }
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;

                if ((y % stepSize === 0) && (x % stepSize === 0)) continue;

                const x0 = Math.floor(x / stepSize) * stepSize;
                const x1 = Math.min(width - 1, x0 + stepSize);
                const y0 = Math.floor(y / stepSize) * stepSize;
                const y1 = Math.min(height - 1, y0 + stepSize);

                const wx = (x - x0) / stepSize;
                const wy = (y - y0) / stepSize;

                for (let c = 0; c < 4; c++) {
                    const idx00 = (y0 * width + x0) * 4 + c;
                    const idx10 = (y0 * width + x1) * 4 + c;
                    const idx01 = (y1 * width + x0) * 4 + c;
                    const idx11 = (y1 * width + x1) * 4 + c;

                    const val00 = output[idx00];
                    const val10 = output[idx10];
                    const val01 = output[idx01];
                    const val11 = output[idx11];

                    const top = val00 * (1 - wx) + val10 * wx;
                    const bottom = val01 * (1 - wx) + val11 * wx;
                    output[index + c] = top * (1 - wy) + bottom * wy;
                }
            }
        }

        ctx.putImageData(new ImageData(output, width, height), 0, 0);
    }

    function bouncingLogo(canvas, ctx, speed, size, colorShift, customImage) {
        
        if (typeof bouncingLogoX === 'undefined') bouncingLogoX = canvas.width / 2;
        if (typeof bouncingLogoY === 'undefined') bouncingLogoY = canvas.height / 2;
        if (typeof bouncingLogoVX === 'undefined') bouncingLogoVX = (speed / 50) * 2;
        if (typeof bouncingLogoVY === 'undefined') bouncingLogoVY = (speed / 50) * 1.5;

        bouncingLogoX += bouncingLogoVX;
        bouncingLogoY += bouncingLogoVY;

        const logoSize = Math.max(20, Math.min(200, size));
        const halfSize = logoSize / 2;

        if (bouncingLogoX - halfSize <= 0 || bouncingLogoX + halfSize >= canvas.width) {
            bouncingLogoVX = -bouncingLogoVX;
            bouncingLogoX = Math.max(halfSize, Math.min(canvas.width - halfSize, bouncingLogoX));
        }

        
        if (bouncingLogoY - halfSize <= 0 || bouncingLogoY + halfSize >= canvas.height) {
            bouncingLogoVY = -bouncingLogoVY;
            bouncingLogoY = Math.max(halfSize, Math.min(canvas.height - halfSize, bouncingLogoY));
        }

        
        if (bouncingLogoX - halfSize <= 5 || bouncingLogoX + halfSize >= canvas.width - 5 ||
            bouncingLogoY - halfSize <= 5 || bouncingLogoY + halfSize >= canvas.height - 5) {
            bouncingLogoVX += (Math.random() - 0.5) * 0.5;
            bouncingLogoVY += (Math.random() - 0.5) * 0.5;
            bouncingLogoVX = Math.max(-5, Math.min(5, bouncingLogoVX));
            bouncingLogoVY = Math.max(-5, Math.min(5, bouncingLogoVY));
        }

        ctx.save();

        const drawX = bouncingLogoX - halfSize;
        const drawY = bouncingLogoY - halfSize;

        let logoImage;
        if (customImage) {
            logoImage = customImage;
        } else {
            logoImage = new Image();
            logoImage.src = '../assets/wink/winkwhite.png';
            if (!logoImage.complete) {
                ctx.restore();
                return;
            }
        }

        
        if (colorShift) {
            const time = Date.now() * 0.001;
            const hue = (time * 30) % 360;

            ctx.filter = `sepia(1) saturate(4) hue-rotate(${hue}deg)`;

            ctx.drawImage(logoImage, drawX, drawY, logoSize, logoSize);

            ctx.restore();
            return;
        }

        ctx.drawImage(logoImage, drawX, drawY, logoSize, logoSize);
    }

    createEffectControls();
    initializeLayersPanel();

    function updateFavicon() {
        const isDark = document.documentElement.classList.contains('dark') || 
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            favicon.href = isDark ? '../assets/wink/winkwhite.png' : '../assets/wink/winkblack.png';
        }
    }
    
    updateFavicon(); 
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateFavicon);

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                updateFavicon();
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });
});