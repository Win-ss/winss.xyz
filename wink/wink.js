document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const upload = document.getElementById('upload');
    const effectsContainer = document.getElementById('effects-container');
    const resetBtn = document.getElementById('reset-btn');
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
        if (currentImage.src && originalImageData) {
            const containerRect = canvasContainer.getBoundingClientRect();
            const maxWidth = containerRect.width - 32;
            const maxHeight = containerRect.height - 32;

            const imgAspect = currentImage.width / currentImage.height;
            const containerAspect = maxWidth / maxHeight;

            let displayWidth;
            let displayHeight;

            if (imgAspect > containerAspect) {
                displayWidth = Math.min(maxWidth, currentImage.width);
                displayHeight = displayWidth / imgAspect;
            } else {
                displayHeight = Math.min(maxHeight, currentImage.height);
                displayWidth = displayHeight * imgAspect;
            }

            canvas.width = currentImage.width;
            canvas.height = currentImage.height;

            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
            canvas.style.maxWidth = '100%';
            canvas.style.maxHeight = '100%';
            canvas.style.objectFit = 'contain';

            canvas.classList.add('loaded');

            applyAllEffects();
        }
    }

    const BLINK_DURATION_MS = 5000;
    const BLINK_TARGET_FPS = 30;
    const BLINK_FALLBACK_CAPTURE_FPS = 6;
    const BLINK_MIN_BITRATE = 3000000;
    const BLINK_MAX_BITRATE = 12000000;
    const BLINK_BITS_PER_PIXEL = 0.16;
    const BLINK_MIME_CANDIDATES = [
        'video/webm;codecs=vp09.00.10.08',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp8,opus',
        'video/webm'
    ];

    let originalImageData = null;
    let currentImage = new Image();
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
        
        effectItems.forEach(item => {
            const effectName = item.dataset.effectName;
            if (fuzzyMatch(searchTerm, effectName)) {
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

    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            filterEffects('');
            searchInput.focus();
        });
    }

    function animate(currentTime = 0) {
        if (hasAnimatedEffects()) {
            const targetFPS = isRecording ? 10 : 30;
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
        'CRT': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Dotted Line': { value: 0, min: 0, max: 20, type: 'slider', enabled: false },
        'Edge Detection': { 
            enabled: false, 
            type: 'edgeDetection',
            intensity: 0,
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
        }
    };

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
        'Bad TV': 'animated',
        'Spinning Rainbow Wheel': 'animated',
        'Liquid Marble': 'animated',
        'Matrix Rain': 'animated',
        'Glitter Field': 'animated',
        'Storm Syndrome': 'animated',
        'Melt': 'animated',
        'Bouncing Logo': 'animated',
        'Line Art': 'pixel'
    };

    let effectLayers = [
        'Brightness', 'Contrast', 'Temperature', 'Grayscale', 'Sepia', 'Invert', 'Noise',
        'Edge Detection', 'Duotone', 'Glitch', 'Chromatic Aberration', 'Pixelate', 'Mosaic',
        'Posterize', 'Oil Painting', 'Emboss', 'Solarize', 'Cross Hatch', 'Thermal Vision',
        'Neon Glow', 'Bad Apple', 'Bad TV', 'Spinning Rainbow Wheel', 'Liquid Marble', 'Matrix Rain', 'Glitter Field', 'Storm Syndrome', 'Melt', 'Bouncing Logo', 'Line Art', 'Blur', 'Hue', 'Vignette', 'CRT', 'Dotted Matrix', 'Dotted Line',
        'Kaleidoscope', '3D Perspective'
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
                if (effectConfig.intensity > 0) edgeDetection(imageData, effectConfig.intensity / 100, effectConfig.backgroundColor);
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
            default:
                break;
        }
    }

    let filterCanvas = null;
    let filterCtx = null;

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
                if (effectConfig.value > 0) crt(canvas, context, effectConfig.value / 100);
                break;
            case 'Dotted Matrix':
                if (effectConfig.value > 0) dottedMatrix(canvas, context, effectConfig.value);
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
                if (effectConfig.opacity > 0) liquidMarble(canvas, context, effectConfig.opacity / 100, effectConfig.speed, effectConfig.turbulence);
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
            container.dataset.effectName = name; // Add data attribute for search
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
                
                if (enableCheckbox.checked) {
                    controlsContainer.classList.add('expanded');
                    expandToggle.classList.add('expanded');
                }
                
                applyAllEffects();
                captureFrame();
                updateLayersPanel();
                
    
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
        
        // Use throttled updates for live preview
        colorInput.addEventListener('input', () => {
            effects[name][colorKey] = colorInput.value;
            throttledApplyEffects();
        });
        
        // Use change event for final capture
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
        
        // Use throttled updates for live preview
        color1Input.addEventListener('input', () => {
            effects[name].color1 = color1Input.value;
            throttledApplyEffects();
        });
        
        // Use change event for final capture
        color1Input.addEventListener('change', () => {
            effects[name].color1 = color1Input.value;
            applyAllEffects();
            captureFrame();
        });
        
        // Use throttled updates for live preview
        color2Input.addEventListener('input', () => {
            effects[name].color2 = color2Input.value;
            throttledApplyEffects();
        });
        
        // Use change event for final capture
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
        
        colorInput.addEventListener('input', () => {
            effects[name].backgroundColor = colorInput.value;
            throttledApplyEffects();
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
        
        // Background Color
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
        
        // Event listeners
        lineColorInput.addEventListener('input', () => {
            effects[name].lineColor = lineColorInput.value;
            throttledApplyEffects();
        });
        
        lineColorInput.addEventListener('change', () => {
            effects[name].lineColor = lineColorInput.value;
            applyAllEffects();
            captureFrame();
        });
        
        bgColorInput.addEventListener('input', () => {
            effects[name].backgroundColor = bgColorInput.value;
            throttledApplyEffects();
        });
        
        bgColorInput.addEventListener('change', () => {
            effects[name].backgroundColor = bgColorInput.value;
            applyAllEffects();
            captureFrame();
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
            sensitivitySlider.value = sensitivitySlider.value;
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
        
        controlGroup.appendChild(opacityContainer);
        controlGroup.appendChild(speedContainer);
        controlGroup.appendChild(turbulenceContainer);
        
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
            throttledApplyEffects();
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

        // Event listeners
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
            throttledApplyEffects();
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

        // Event listeners
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

        // Event listeners
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

        // Event listeners
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

upload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            originalFileName = file.name.replace(/\.[^/.]+$/, ''); 
            
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
        let imageFile = null;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                imageFile = items[i].getAsFile();
                break;
            }
        }
        
        if (imageFile) {
            originalFileName = 'pasted-image';
            
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
                    
                    showSuccess('Image pasted successfully!');
                };
                currentImage.src = event.target.result;
            };
            reader.readAsDataURL(imageFile);
        } else if (e.clipboardData.items.length > 0) {
            let hasText = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('text') !== -1) {
                    hasText = true;
                    break;
                }
            }
            if (hasText) {
                showInfo('Only images can be pasted. Try copying an image instead.');
            } else {
                showInfo('No image found in clipboard. Copy an image and try again.');
            }
        } else {
            showInfo('No image found in clipboard. Copy an image and try again.');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'v') {
            return;
        }
    });

    function setInitialCanvasSize() {
        // Clear cached data when image changes
        badTVOriginalData = null;
        matrixDrops = null;
        
        const containerRect = canvasContainer.getBoundingClientRect();
        const containerWidth = containerRect.width - 32; 
        const containerHeight = containerRect.height - 32;
        const imageAspectRatio = currentImage.width / currentImage.height;
        const containerAspectRatio = containerWidth / containerHeight;

        let displayWidth, displayHeight;

        if (imageAspectRatio > containerAspectRatio) {
            displayWidth = Math.min(containerWidth, currentImage.width);
            displayHeight = displayWidth / imageAspectRatio;
        } else {
            displayHeight = Math.min(containerHeight, currentImage.height);
            displayWidth = displayHeight * imageAspectRatio;
        }

        canvas.width = currentImage.width;
        canvas.height = currentImage.height;
        
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
                    config.backgroundColor = '#000000';
                }
            }
        }
        effectsContainer.innerHTML = '';
        createEffectControls();
        applyAllEffects();

    });downloadBtn.addEventListener('click', () => {
            if (!originalImageData) {
                showError('Please upload an image first!');
                return;
            }

            const format = formatSelect.value.toLowerCase();
            const link = document.createElement('a');
            link.download = `wink-edited.${format}`;
        
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = currentImage.width;
            tempCanvas.height = currentImage.height;

            applyAllEffects();
            if (hasAnimatedEffects()) {
                applyAnimatedEffects();
            }

            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);

            link.href = tempCanvas.toDataURL(`image/${format}`);
            link.click();
        });

    blinkBtn.addEventListener('click', startRecording);

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
            if (config.enabled) {
                snapshot.effects[name] = {};
                
                if (config.type === 'slider') {
                    snapshot.effects[name] = {
                        type: 'slider',
                        value: config.value,
                        enabled: config.enabled
                    };
                } else if (config.type === 'dual-slider') {
                    snapshot.effects[name] = {
                        type: 'dual-slider',
                        threshold: config.threshold,
                        fuzz: config.fuzz,
                        enabled: config.enabled
                    };
                } else if (config.type === 'duotone') {
                    snapshot.effects[name] = {
                        type: 'duotone',
                        enabled: config.enabled,
                        color1: config.color1,
                        color2: config.color2
                    };
                } else if (config.type === 'perspective3d') {
                    snapshot.effects[name] = {
                        type: 'perspective3d',
                        enabled: config.enabled,
                        rotation: config.rotation,
                        skewX: config.skewX,
                        skewY: config.skewY,
                        scaleX: config.scaleX,
                        scaleY: config.scaleY,
                        offsetX: config.offsetX,
                        offsetY: config.offsetY,
                        shadowBlur: config.shadowBlur,
                        shadowOpacity: config.shadowOpacity
                    };
                } else if (config.type === 'toggle') {
                    snapshot.effects[name] = {
                        type: 'toggle',
                        value: config.value,
                        enabled: config.enabled
                    };
                } else if (config.type === 'edgeDetection') {
                    snapshot.effects[name] = {
                        type: 'edgeDetection',
                        enabled: config.enabled,
                        intensity: config.intensity,
                        backgroundColor: config.backgroundColor
                    };
                } else if (config.type === 'melt') {
                    snapshot.effects[name] = {
                        type: 'melt',
                        enabled: config.enabled,
                        intensity: config.intensity,
                        speed: config.speed
                    };
                } else if (config.type === 'bouncingLogo') {
                    snapshot.effects[name] = {
                        type: 'bouncingLogo',
                        enabled: config.enabled,
                        speed: config.speed,
                        size: config.size,
                        colorShift: config.colorShift
                        // Note: customImage is not saved in snapshots and not able to because uhh common sense?????
                    };
                }
            }
        }
        
        const jsonString = JSON.stringify(snapshot);
        return btoa(jsonString);
    }

    function importSnapshot(snapshotString) {
        const jsonString = atob(snapshotString);
        const snapshot = JSON.parse(jsonString);
        
        for (const name in effects) {
            const config = effects[name];
            if (config.type === 'slider') {
                config.value = (name === 'Pixelate' || name === 'Mosaic') ? 1 : 0;
                config.enabled = false;
            } else if (config.type === 'toggle') {
                config.value = false;
                config.enabled = false;
            } else if (config.type === 'duotone') {
                config.enabled = false;
                config.color1 = '#0000ff';
                config.color2 = '#ffff00';
            } else if (config.type === 'perspective3d') {
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
            } else if (config.type === 'edgeDetection') {
                config.enabled = false;
                config.intensity = 0;
                config.backgroundColor = '#000000';
            } else if (config.type === 'melt') {
                config.enabled = false;
                config.intensity = 30;
                config.speed = 50;
            } else if (config.type === 'bouncingLogo') {
                config.enabled = false;
                config.speed = 100;
                config.size = 50;
                config.colorShift = true;
                config.customImage = null;
            }
        }
        
        const snapshotEffects = snapshot.effects || snapshot; 
        
        if (snapshot.effectLayers) {
            effectLayers = [...snapshot.effectLayers];
        }
        
        for (const name in snapshotEffects) {
            if (effects[name]) {
                const snapshotConfig = snapshotEffects[name];
                const effectConfig = effects[name];
                
                if (snapshotConfig.type === 'slider') {
                    effectConfig.value = snapshotConfig.value;
                    effectConfig.enabled = snapshotConfig.enabled;
                } else if (snapshotConfig.type === 'dual-slider') {
                    effectConfig.threshold = snapshotConfig.threshold;
                    effectConfig.fuzz = snapshotConfig.fuzz;
                    effectConfig.enabled = snapshotConfig.enabled;
                } else if (snapshotConfig.type === 'duotone') {
                    effectConfig.enabled = snapshotConfig.enabled;
                    effectConfig.color1 = snapshotConfig.color1;
                    effectConfig.color2 = snapshotConfig.color2;
                } else if (snapshotConfig.type === 'perspective3d') {
                    effectConfig.enabled = snapshotConfig.enabled;
                    effectConfig.rotation = snapshotConfig.rotation;
                    effectConfig.skewX = snapshotConfig.skewX;
                    effectConfig.skewY = snapshotConfig.skewY;
                    effectConfig.scaleX = snapshotConfig.scaleX;
                    effectConfig.scaleY = snapshotConfig.scaleY;
                    effectConfig.offsetX = snapshotConfig.offsetX;
                    effectConfig.offsetY = snapshotConfig.offsetY;
                    effectConfig.shadowBlur = snapshotConfig.shadowBlur;
                    effectConfig.shadowOpacity = snapshotConfig.shadowOpacity;
                } else if (snapshotConfig.type === 'toggle') {
                    effectConfig.value = snapshotConfig.value;
                    effectConfig.enabled = snapshotConfig.enabled;
                } else if (snapshotConfig.type === 'edgeDetection') {
                    effectConfig.enabled = snapshotConfig.enabled;
                    effectConfig.intensity = snapshotConfig.intensity;
                    effectConfig.backgroundColor = snapshotConfig.backgroundColor;
                } else if (snapshotConfig.type === 'melt') {
                    effectConfig.enabled = snapshotConfig.enabled;
                    effectConfig.intensity = snapshotConfig.intensity;
                    effectConfig.speed = snapshotConfig.speed;
                } else if (snapshotConfig.type === 'bouncingLogo') {
                    effectConfig.enabled = snapshotConfig.enabled;
                    effectConfig.speed = snapshotConfig.speed;
                    effectConfig.size = snapshotConfig.size;
                    effectConfig.colorShift = snapshotConfig.colorShift;
                    // customImage is not restored from snapshots
                }
            }
        }
        
        effectsContainer.innerHTML = '';
        createEffectControls();
        applyAllEffects();
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

    function edgeDetection(imageData, amount, backgroundColor = '#000000') {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const originalData = new Uint8ClampedArray(data);
        
        const bgColor = hexToRgb(backgroundColor);
        
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
                
                data[currentIndex] = bgColor.r * (1 - amount) + edgeValue * amount;
                data[currentIndex + 1] = bgColor.g * (1 - amount) + edgeValue * amount;
                data[currentIndex + 2] = bgColor.b * (1 - amount) + edgeValue * amount;
            }
        }
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    function lineArt(imageData, lineColor, backgroundColor, thickness, sensitivity, smoothColors = false) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const originalData = new Uint8ClampedArray(data);
        
        const lineRgb = hexToRgb(lineColor);
        const bgRgb = hexToRgb(backgroundColor);
        
        // Create edge detection data
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
        
        // Calculate edge magnitudes
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
        
        // Apply thickness by dilating edges
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
        
        // Apply line art effect
        const threshold = (sensitivity / 100) * 255;
        
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = Math.floor(i / 4);
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            const edgeValue = dilatedEdges[pixelIndex];
            
            if (edgeValue > threshold) {
                // Draw line
                if (smoothColors) {
                    // Scramble colors smoothly based on position
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
                // Draw background
                if (smoothColors) {
                    // Scramble background colors smoothly
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
            // Alpha channel remains unchanged
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

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
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
    
    function crt(canvas, ctx, intensity) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        for (let y = 0; y < height; y += 2) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const darkeningFactor = 1 - (intensity * 0.3);
                data[i] *= darkeningFactor;
                data[i + 1] *= darkeningFactor;
                data[i + 2] *= darkeningFactor;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        const alpha = intensity * 0.15; 
        gradient.addColorStop(0, `rgba(0,0,0,${alpha})`);
        gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${alpha})`);        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
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

        // Window size should be odd
        const windowSize = Math.max(3, 2 * Math.floor(radius / 2) + 1);
        const halfWindow = Math.floor(windowSize / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;

                // Define quadrants
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

        // Copy output back to data
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

        const streamFps = Math.max(BLINK_TARGET_FPS, 10);

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

    function liquidMarble(canvas, ctx, opacity, speed, turbulence) {
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
        const freq1 = 0.01 / scaleFactor;
        const freq2 = 0.005 / scaleFactor;
        const freq3 = 0.02 / scaleFactor;
        const freqY1 = 0.01 / scaleFactor;
        const freqY2 = 0.007 / scaleFactor;
        const freqY3 = 0.015 / scaleFactor;
        
        for (let y = 0; y < scaledHeight; y++) {
            for (let x = 0; x < scaledWidth; x++) {
                const i = (y * scaledWidth + x) * 4;
                
                const wave1 = Math.sin(x * freq1 + liquidMarbleTime) * Math.cos(y * freqY1 + liquidMarbleTime * 0.7);
                const wave2 = Math.sin(x * freq2 + liquidMarbleTime * 1.3) * Math.cos(y * freqY2 + liquidMarbleTime * 0.5);
                const wave3 = Math.sin(x * freq3 + liquidMarbleTime * 0.8) * Math.cos(y * freqY3 + liquidMarbleTime * 1.1);
                
                let combinedWave = (wave1 + wave2 * 0.5 + wave3 * 0.3) * turbulenceFactor;
                combinedWave = Math.max(-10, Math.min(10, combinedWave));
                
                const marbleValue = Math.sin(combinedWave) * 80 + 128;
                
                data[i] = Math.max(0, Math.min(255, marbleValue + 15));
                data[i + 1] = Math.max(0, Math.min(255, marbleValue - 8));
                data[i + 2] = Math.max(0, Math.min(255, marbleValue + 20));
                data[i + 3] = 60;
            }
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        
        ctx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    function hexToRgb(color) {
        if (typeof color !== 'string') {
            return { r: 0, g: 255, b: 0 };
        }

        let hex = color.trim().replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        if (hex.length !== 6) {
            return { r: 0, g: 255, b: 0 };
        }

        const parsed = parseInt(hex, 16);
        if (Number.isNaN(parsed)) {
            return { r: 0, g: 255, b: 0 };
        }

        return {
            r: (parsed >> 16) & 255,
            g: (parsed >> 8) & 255,
            b: parsed & 255
        };
    }

    function matrixRain(canvas, ctx, opacity, speed, density, size, color) {
        // Cache character set to avoid recreating every frame
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

        const time = Date.now() * (speed / 200);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const output = new Uint8ClampedArray(data);

        const intensityFactor = intensity / 100;

        const freqX1 = 0.015;
        const freqY1 = 0.012;
        const freqCombined = 0.008;
        const freqThreshold1 = 0.003;
        const freqThreshold2 = 0.005;
        const freqSheenX = 0.08;
        const freqSheenY = 0.06;

        const stepSize = 3;

        for (let y = 0; y < height; y += stepSize) {
            for (let x = 0; x < width; x += stepSize) {
                const index = (y * width + x) * 4;

                const wave1 = Math.sin(x * freqX1 + time * 0.008) * intensityFactor * 12;
                const wave2 = Math.cos(y * freqY1 + time * 0.006) * intensityFactor * 8;
                const wave3 = Math.sin((x * 0.8 + y * 1.2) * freqCombined + time * 0.004) * intensityFactor * 6;

                const totalDistortion = wave1 + wave2 + wave3;
                const meltThreshold1 = Math.sin(x * freqThreshold1 + y * 0.004 + time * 0.002) * 0.5 + 0.5;
                const meltThreshold2 = Math.cos(x * freqThreshold2 + y * 0.003 + time * 0.003) * 0.5 + 0.5;
                const meltThreshold = (meltThreshold1 + meltThreshold2) * 0.5;

                if (meltThreshold > (1 - intensityFactor * 0.8)) {
                    const stretchFactor = 1 + Math.abs(totalDistortion) * 0.08;
                    const sourceY = Math.max(0, y - Math.abs(totalDistortion) * stretchFactor);
                    const sourceX = x + Math.sin(y * 0.03 + time * 0.008) * intensityFactor * 4;

                    const sourceXClamped = Math.max(0, Math.min(width - 1, Math.floor(sourceX)));
                    const sourceYClamped = Math.max(0, Math.min(height - 1, Math.floor(sourceY)));
                    const sourceIndex = (sourceYClamped * width + sourceXClamped) * 4;

                    output[index] = data[sourceIndex];
                    output[index + 1] = data[sourceIndex + 1];
                    output[index + 2] = data[sourceIndex + 2];
                    output[index + 3] = data[sourceIndex + 3];

                    const sheenIntensity = Math.sin(x * freqSheenX + y * freqSheenY + time * 0.04) * 0.5 + 0.5;
                    const sheenAmount = sheenIntensity * intensityFactor * 30;

                    const baseHue = (x * 0.8 + y * 0.5 + time * 0.05) % 360;
                    const hueNoise = Math.sin(x * 0.02 + y * 0.03 + time * 0.1) * 30;
                    const hue = (baseHue + hueNoise) % 360;

                    const saturation = 0.6;
                    const oilR = Math.sin(hue * Math.PI / 180) * sheenAmount * saturation;
                    const oilG = Math.sin((hue + 120) * Math.PI / 180) * sheenAmount * saturation;
                    const oilB = Math.sin((hue + 240) * Math.PI / 180) * sheenAmount * saturation;

                    const blendFactor = 0.7;
                    output[index] = Math.min(255, Math.max(0, output[index] * blendFactor + oilR));
                    output[index + 1] = Math.min(255, Math.max(0, output[index + 1] * blendFactor + oilG));
                    output[index + 2] = Math.min(255, Math.max(0, output[index + 2] * blendFactor + oilB));

                    const colorVariation = Math.sin(x * 0.05 + y * 0.07 + time * 0.08) * intensityFactor * 15;
                    output[index] = Math.min(255, Math.max(0, output[index] + colorVariation * 0.3));
                    output[index + 1] = Math.min(255, Math.max(0, output[index + 1] + colorVariation * 0.2));
                    output[index + 2] = Math.min(255, Math.max(0, output[index + 2] + colorVariation * 0.4));

                    const darken = intensityFactor * 15 * (1 - sheenIntensity);
                    output[index] = Math.max(0, output[index] - darken);
                    output[index + 1] = Math.max(0, output[index + 1] - darken);
                    output[index + 2] = Math.max(0, output[index + 2] - darken);
                } else {
                    output[index] = data[index];
                    output[index + 1] = data[index + 1];
                    output[index + 2] = data[index + 2];
                    output[index + 3] = data[index + 3];
                }
            }
        }

        // Second pass: Bilinear interpolation to fill gaps
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;

                if ((x % stepSize === 0) && (y % stepSize === 0)) continue;

                const x0 = Math.floor(x / stepSize) * stepSize;
                const y0 = Math.floor(y / stepSize) * stepSize;
                const x1 = Math.min(x0 + stepSize, width - 1);
                const y1 = Math.min(y0 + stepSize, height - 1);

                const wx = (x - x0) / (x1 - x0 || 1);
                const wy = (y - y0) / (y1 - y0 || 1);

                const idx00 = (y0 * width + x0) * 4;
                const idx10 = (y0 * width + x1) * 4;
                const idx01 = (y1 * width + x0) * 4;
                const idx11 = (y1 * width + x1) * 4;

                for (let c = 0; c < 4; c++) {
                    const val00 = output[idx00 + c];
                    const val10 = output[idx10 + c];
                    const val01 = output[idx01 + c];
                    const val11 = output[idx11 + c];

                    const top = val00 * (1 - wx) + val10 * wx;
                    const bottom = val01 * (1 - wx) + val11 * wx;
                    output[index + c] = top * (1 - wy) + bottom * wy;
                }
            }
        }

        ctx.putImageData(new ImageData(output, width, height), 0, 0);
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
        // Initialize logo position and velocity if not set
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

        // Top and bottom edges
        if (bouncingLogoY - halfSize <= 0 || bouncingLogoY + halfSize >= canvas.height) {
            bouncingLogoVY = -bouncingLogoVY;
            bouncingLogoY = Math.max(halfSize, Math.min(canvas.height - halfSize, bouncingLogoY));
        }

        // Prevent corner trapping by adding slight randomization when hitting edges
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

        // Apply color shifting if enabled
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