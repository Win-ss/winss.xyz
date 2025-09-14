document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const upload = document.getElementById('upload');
    const effectsContainer = document.getElementById('effects-container');    const resetBtn = document.getElementById('reset-btn');
    const downloadBtn = document.getElementById('download-btn');
    const blinkBtn = document.getElementById('blink-btn');
    const formatSelect = document.getElementById('format-select');
    const takeSnapshotBtn = document.getElementById('take-snapshot-btn');
    const importSnapshotBtn = document.getElementById('import-snapshot-btn');
    const snapshotInput = document.getElementById('snapshot-input');
    const canvasContainer = document.getElementById('canvas-container');
    const notificationContainer = document.getElementById('notification-container');
    const pasteHint = document.querySelector('.paste-hint');
    
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
            
            let displayWidth, displayHeight;
            
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
    }    let originalImageData = null;
    let currentImage = new Image();
    let originalFileName = '';
    let isRecording = false;
    let recordingInterval = null;
    let recordedFrames = [];
    let recordingStartTime = 0;

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
        }
    };

    // Layers system
    let effectLayers = [
        'Brightness', 'Contrast', 'Temperature', 'Grayscale', 'Sepia', 'Invert', 'Noise',
        'Edge Detection', 'Duotone', 'Glitch', 'Chromatic Aberration', 'Pixelate', 'Mosaic',
        'Posterize', 'Oil Painting', 'Emboss', 'Solarize', 'Cross Hatch', 'Thermal Vision',
        'Neon Glow', 'Bad Apple', 'Blur', 'Hue', 'Vignette', 'CRT', 'Dotted Matrix', 'Dotted Line',
        'Kaleidoscope', '3D Perspective'
    ];

    const layersPanel = document.getElementById('layers-panel');
    const layersList = document.getElementById('layers-list');

    function createEffectControls() {
        for (const name in effects) {
            const config = effects[name];
            const container = document.createElement('div');
            container.className = 'effect-item';
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
        });

        numberInput.addEventListener('change', () => {
            slider.value = numberInput.value;
            effects[name].value = parseFloat(numberInput.value);
            applyAllEffects();
            captureFrame();
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
        colorInput.className = 'color-input';        colorInput.addEventListener('input', () => {
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
            applyAllEffects();
            captureFrame();
        });
        
        color2Input.addEventListener('input', () => {
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
    });function setInitialCanvasSize() {
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
        const format = formatSelect.value.toLowerCase();
        const link = document.createElement('a');
        link.download = `wink-edited.${format}`;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = currentImage.width;
        tempCanvas.height = currentImage.height;
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(currentImage, 0, 0);
        
        const finalImageData = applyAllEffectsForDownload(tempCanvas, tempCtx);link.href = tempCanvas.toDataURL(`image/${format}`);
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
                }
            }
        }
        
        effectsContainer.innerHTML = '';
        createEffectControls();
        applyAllEffects();
    }

    function applyAllEffects(inputImageData = null, isDownload = false) {
        if (!originalImageData && !inputImageData) return;

        const sourceImageData = inputImageData || originalImageData;
        const imageData = new ImageData(
            new Uint8ClampedArray(sourceImageData.data),
            sourceImageData.width,
            sourceImageData.height
        );
        
        const effectGroups = {
            colorAdjustments: ['Brightness', 'Contrast', 'Temperature'],
            colorEffects: ['Grayscale', 'Sepia', 'Invert', 'Duotone', 'Hue'],
            spatialEffects: ['Blur', 'Edge Detection', 'Emboss', 'Solarize'],
            artisticEffects: ['Oil Painting', 'Posterize', 'Cross Hatch', 'Thermal Vision', 'Neon Glow', 'Bad Apple'],
            distortionEffects: ['Glitch', 'Chromatic Aberration', 'Pixelate', 'Mosaic', 'Kaleidoscope'],
            overlayEffects: ['Noise', 'Vignette', 'CRT', 'Dotted Matrix', 'Dotted Line', '3D Perspective']
        };

        const enabledEffects = [];
        Object.values(effectGroups).forEach(group => {
            effectLayers.forEach(effectName => {
                if (group.includes(effectName) && effects[effectName] && effects[effectName].enabled) {
                    enabledEffects.push(effectName);
                }
            });
        });

        const data = imageData.data;
        
        enabledEffects.forEach(effectName => {
            const effect = effects[effectName];
            
            // im skipping canvas based effects for now
            if (['Blur', 'Hue', 'Vignette', 'CRT', 'Dotted Matrix', 'Dotted Line', 'Kaleidoscope', '3D Perspective'].includes(effectName)) {
                return;
            }
            
            switch(effectName) {
                case 'Brightness':
                    if (effect.value !== 0) adjustBrightness(data, effect.value);
                    break;
                case 'Contrast':
                    if (effect.value !== 0) adjustContrast(data, effect.value);
                    break;
                case 'Temperature':
                    if (effect.value !== 0) adjustTemperature(data, effect.value);
                    break;
                case 'Grayscale':
                    if (effect.value > 0) grayscale(data, effect.value / 100);
                    break;
                case 'Sepia':
                    if (effect.value > 0) sepia(data, effect.value / 100);
                    break;
                case 'Invert':
                    if (effect.value > 0) invert(data, effect.value / 100);
                    break;
                case 'Noise':
                    if (effect.value > 0) noise(data, effect.value);
                    break;
                case 'Edge Detection':
                    if (effect.intensity > 0) edgeDetection(imageData, effect.intensity / 100, effect.backgroundColor);
                    break;
                case 'Duotone':
                    duotone(data, effect.color1, effect.color2);
                    break;
                case 'Glitch':
                    if (effect.value > 0) glitch(imageData, effect.value);
                    break;
                case 'Chromatic Aberration':
                    if (effect.value > 0) chromaticAberration(imageData, effect.value);
                    break;
                case 'Pixelate':
                    if (effect.value > 1) pixelate(imageData, effect.value);
                    break;
                case 'Mosaic':
                    if (effect.value > 1) mosaic(imageData, effect.value);
                    break;
                case 'Posterize':
                    if (effect.value > 0) posterize(imageData, effect.value);
                    break;
                case 'Oil Painting':
                    if (effect.value > 0) oilPainting(imageData, effect.value);
                    break;
                case 'Emboss':
                    if (effect.value > 0) emboss(imageData, effect.value);
                    break;
                case 'Solarize':
                    if (effect.value > 0) solarize(imageData, effect.value);
                    break;
                case 'Cross Hatch':
                    if (effect.value > 0) crossHatch(imageData, effect.value);
                    break;
                case 'Thermal Vision':
                    if (effect.value > 0) thermalVision(imageData, effect.value);
                    break;
                case 'Neon Glow':
                    if (effect.value > 0) neonGlow(imageData, effect.value);
                    break;
                case 'Bad Apple':
                    if (effect.threshold > 0) badApple(imageData, effect.threshold, effect.fuzz);
                    break;
            }
        });
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);        
        
        let filterString = '';
        enabledEffects.forEach(effectName => {
            const effect = effects[effectName];
            
            switch(effectName) {
                case 'Blur':
                    if (effect.value > 0) filterString += `blur(${effect.value}px) `;
                    break;
                case 'Hue':
                    if (effect.value > 0) filterString += `hue-rotate(${effect.value}deg) `;
                    break;
            }
        });
        
        if (filterString) {
            ctx.filter = filterString;
            ctx.drawImage(canvas, 0, 0); 
            ctx.filter = 'none';
        }
        
        enabledEffects.forEach(effectName => {
            const effect = effects[effectName];
            
            switch(effectName) {
                case 'Vignette':
                    if (effect.value > 0) vignette(canvas, ctx, effect.value / 100);
                    break;
                case 'CRT':
                    if (effect.value > 0) crt(canvas, ctx, effect.value / 100);
                    break;
                case 'Dotted Matrix':
                    if (effect.value > 0) dottedMatrix(canvas, ctx, effect.value);
                    break;
                case 'Dotted Line':
                    if (effect.value > 0) dottedLine(canvas, ctx, effect.value);
                    break;
                case 'Kaleidoscope':
                    if (effect.value > 0) kaleidoscope(canvas, ctx, effect.value);
                    break;
                case '3D Perspective':
                    perspective3D(canvas, ctx, effect);
                    break;
            }
        });
    }

    function applyAllEffectsForDownload(tempCanvas, tempCtx) {
        const sourceImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const imageData = new ImageData(
            new Uint8ClampedArray(sourceImageData.data),
            sourceImageData.width,
            sourceImageData.height
        );
        
        const effectGroups = {
            colorAdjustments: ['Brightness', 'Contrast', 'Temperature'],
            colorEffects: ['Grayscale', 'Sepia', 'Invert', 'Duotone', 'Hue'],
            spatialEffects: ['Blur', 'Edge Detection', 'Emboss', 'Solarize'],
            artisticEffects: ['Oil Painting', 'Posterize', 'Cross Hatch', 'Thermal Vision', 'Neon Glow', 'Bad Apple'],
            distortionEffects: ['Glitch', 'Chromatic Aberration', 'Pixelate', 'Mosaic', 'Kaleidoscope'],
            overlayEffects: ['Noise', 'Vignette', 'CRT', 'Dotted Matrix', 'Dotted Line', '3D Perspective']
        };

        const enabledEffects = [];
        Object.values(effectGroups).forEach(group => {
            effectLayers.forEach(effectName => {
                if (group.includes(effectName) && effects[effectName] && effects[effectName].enabled) {
                    enabledEffects.push(effectName);
                }
            });
        });

        const data = imageData.data;
        
        enabledEffects.forEach(effectName => {
            const effect = effects[effectName];
            
            if (['Blur', 'Hue', 'Vignette', 'CRT', 'Dotted Matrix', 'Dotted Line', 'Kaleidoscope', '3D Perspective'].includes(effectName)) {
                return;
            }
            
            switch(effectName) {
                case 'Brightness':
                    if (effect.value !== 0) adjustBrightness(data, effect.value);
                    break;
                case 'Contrast':
                    if (effect.value !== 0) adjustContrast(data, effect.value);
                    break;
                case 'Temperature':
                    if (effect.value !== 0) adjustTemperature(data, effect.value);
                    break;
                case 'Grayscale':
                    if (effect.value > 0) grayscale(data, effect.value / 100);
                    break;
                case 'Sepia':
                    if (effect.value > 0) sepia(data, effect.value / 100);
                    break;
                case 'Invert':
                    if (effect.value > 0) invert(data, effect.value / 100);
                    break;
                case 'Noise':
                    if (effect.value > 0) noise(data, effect.value);
                    break;
                case 'Edge Detection':
                    if (effect.intensity > 0) edgeDetection(imageData, effect.intensity / 100, effect.backgroundColor);
                    break;
                case 'Duotone':
                    duotone(data, effect.color1, effect.color2);
                    break;
                case 'Glitch':
                    if (effect.value > 0) glitch(imageData, effect.value);
                    break;
                case 'Chromatic Aberration':
                    if (effect.value > 0) chromaticAberration(imageData, effect.value);
                    break;
                case 'Pixelate':
                    if (effect.value > 1) pixelate(imageData, effect.value);
                    break;
                case 'Mosaic':
                    if (effect.value > 1) mosaic(imageData, effect.value);
                    break;
                case 'Posterize':
                    if (effect.value > 0) posterize(imageData, effect.value);
                    break;
                case 'Oil Painting':
                    if (effect.value > 0) oilPainting(imageData, effect.value);
                    break;
                case 'Emboss':
                    if (effect.value > 0) emboss(imageData, effect.value);
                    break;
                case 'Solarize':
                    if (effect.value > 0) solarize(imageData, effect.value);
                    break;
                case 'Cross Hatch':
                    if (effect.value > 0) crossHatch(imageData, effect.value);
                    break;
                case 'Thermal Vision':
                    if (effect.value > 0) thermalVision(imageData, effect.value);
                    break;
                case 'Neon Glow':
                    if (effect.value > 0) neonGlow(imageData, effect.value);
                    break;
                case 'Bad Apple':
                    if (effect.threshold > 0) badApple(imageData, effect.threshold, effect.fuzz);
                    break;
            }
        });
        
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.putImageData(imageData, 0, 0);
        
        let filterString = '';
        enabledEffects.forEach(effectName => {
            const effect = effects[effectName];
            
            switch(effectName) {
                case 'Blur':
                    if (effect.value > 0) filterString += `blur(${effect.value}px) `;
                    break;
                case 'Hue':
                    if (effect.value > 0) filterString += `hue-rotate(${effect.value}deg) `;
                    break;
            }
        });
        
        if (filterString) {
            tempCtx.filter = filterString;
            tempCtx.drawImage(tempCanvas, 0, 0);
            tempCtx.filter = 'none';
        }
        
        enabledEffects.forEach(effectName => {
            const effect = effects[effectName];
            
            switch(effectName) {
                case 'Vignette':
                    if (effect.value > 0) vignette(tempCanvas, tempCtx, effect.value / 100);
                    break;
                case 'CRT':
                    if (effect.value > 0) crt(tempCanvas, tempCtx, effect.value / 100);
                    break;
                case 'Dotted Matrix':
                    if (effect.value > 0) dottedMatrix(tempCanvas, tempCtx, effect.value);
                    break;
                case 'Dotted Line':
                    if (effect.value > 0) dottedLine(tempCanvas, tempCtx, effect.value);
                    break;
                case 'Kaleidoscope':
                    if (effect.value > 0) kaleidoscope(tempCanvas, tempCtx, effect.value);
                    break;
                case '3D Perspective':
                    perspective3D(tempCanvas, tempCtx, effect);
                    break;
            }
        });
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
        const originalData = new Uint8ClampedArray(data);
        const effectRadius = Math.min(3, Math.floor(radius / 2)); 
        const step = Math.max(1, Math.floor(radius / 3)); 
        
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const colorBuckets = new Array(8).fill(null).map(() => ({ count: 0, r: 0, g: 0, b: 0 }));
                let maxCount = 0;
                let dominantBucket = 0;
                
                for (let dy = -effectRadius; dy <= effectRadius; dy += 2) {
                    for (let dx = -effectRadius; dx <= effectRadius; dx += 2) {
                        const nx = Math.max(0, Math.min(width - 1, x + dx));
                        const ny = Math.max(0, Math.min(height - 1, y + dy));
                        const idx = (ny * width + nx) * 4;
                        
                        const bucketIndex = Math.floor((originalData[idx] + originalData[idx + 1] + originalData[idx + 2]) / 96);
                        const bucket = colorBuckets[bucketIndex];
                        
                        bucket.count++;
                        bucket.r += originalData[idx];
                        bucket.g += originalData[idx + 1];
                        bucket.b += originalData[idx + 2];
                        
                        if (bucket.count > maxCount) {
                            maxCount = bucket.count;
                            dominantBucket = bucketIndex;
                        }
                    }
                }
                
                if (maxCount > 0) {
                    const bucket = colorBuckets[dominantBucket];
                    const avgR = Math.floor(bucket.r / bucket.count);
                    const avgG = Math.floor(bucket.g / bucket.count);
                    const avgB = Math.floor(bucket.b / bucket.count);
                    
                    for (let by = 0; by < step && y + by < height; by++) {
                        for (let bx = 0; bx < step && x + bx < width; bx++) {
                            const idx = ((y + by) * width + (x + bx)) * 4;
                            data[idx] = avgR;
                            data[idx + 1] = avgG;
                            data[idx + 2] = avgB;
                        }
                    }
                }
            }
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

    function captureFrame() {
        if (!isRecording || !originalImageData) return;
        
        const captureCanvas = document.createElement('canvas');
        const captureCtx = captureCanvas.getContext('2d', {
            alpha: false,
            colorSpace: 'srgb',
            willReadFrequently: false
        });
        
        captureCanvas.width = canvas.width;
        captureCanvas.height = canvas.height;
        
        captureCtx.imageSmoothingEnabled = true;
        captureCtx.imageSmoothingQuality = 'high';
        
        captureCtx.fillStyle = '#000000';
        captureCtx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
        
        captureCtx.globalCompositeOperation = 'source-over';
        captureCtx.drawImage(canvas, 0, 0);
        
        const frameData = captureCanvas.toDataURL('image/png', 1.0);
        const timestamp = Date.now() - recordingStartTime;
        recordedFrames.push({ data: frameData, timestamp: timestamp });
    }    function startRecording() {
        if (!originalImageData) {
            showError('Please upload an image first!');
            return;
        }
        
        isRecording = true;
        recordedFrames = [];
        recordingStartTime = Date.now();
        
        blinkBtn.textContent = 'Recording... 5s';
        blinkBtn.disabled = true;
        blinkBtn.style.backgroundColor = '#dc2626'; 
        
        captureFrame();
        
        recordingInterval = setInterval(() => {
            if (isRecording) {
                captureFrame();
            }
        }, 100);
        
        setTimeout(() => {
            stopRecording();
        }, 5000);
    }    function stopRecording() {
        isRecording = false;
        
        if (recordingInterval) {
            clearInterval(recordingInterval);
            recordingInterval = null;
        }
        
        blinkBtn.textContent = 'Creating Video...';
        
        setTimeout(() => {
            generateGIF();
        }, 100);
    }    async function generateGIF() {
        if (recordedFrames.length === 0) {
            showError('No frames recorded!');
            resetBlinkButton();
            return;
        }

        createWebMVideo();
    }    function createWebMVideo() {
        try {
            blinkBtn.textContent = 'Creating Video...';
            
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d', {
                alpha: false,
                colorSpace: 'srgb',
                willReadFrequently: false
            });
            tempCanvas.width = currentImage.width;
            tempCanvas.height = currentImage.height;
            
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.fillStyle = '#000000';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            const stream = tempCanvas.captureStream(60);
            
            const pixelCount = tempCanvas.width * tempCanvas.height;
            const qualityBitrate = Math.max(25000000, pixelCount / 50); 
            
            let mediaRecorderOptions;
            
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                mediaRecorderOptions = {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: qualityBitrate,
                    bitsPerSecond: qualityBitrate
                };
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                mediaRecorderOptions = {
                    mimeType: 'video/webm;codecs=vp8',
                    videoBitsPerSecond: qualityBitrate * 0.8,
                    bitsPerSecond: qualityBitrate * 0.8
                };
            } else if (MediaRecorder.isTypeSupported('video/webm')) {
                mediaRecorderOptions = {
                    mimeType: 'video/webm',
                    videoBitsPerSecond: qualityBitrate,
                    bitsPerSecond: qualityBitrate
                };
            } else {
                throw new Error('WebM recording not supported');
            }
            
            const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
            
            const chunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                
                const videoMetadata = {
                    title: originalFileName || 'Untitled',
                    subtitle: 'made using wink!',
                    size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
                    duration: '5 seconds',
                    format: 'WebM (HD)',
                    timestamp: new Date().toISOString()
                };
                
                console.log('Video Metadata:', videoMetadata);
                
                const baseFileName = originalFileName || 'wink-animation';
                const fileName = `${baseFileName}-wink-blink.webm`;
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = fileName;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                
                resetBlinkButton();
            };
              mediaRecorder.start(50); 
            
            const totalDuration = 5000;
            const frameRate = 60;
            const frameDuration = 1000 / frameRate;
            const totalFrames = recordedFrames.length;
            
            let frameIndex = 0;
            let startTime = performance.now();
            let lastFrameTime = startTime;
            
            function playNextFrame() {
                const currentTime = performance.now();
                const elapsed = currentTime - startTime;
                
                if (currentTime - lastFrameTime >= frameDuration) {
                    const progress = Math.min(elapsed / totalDuration, 1);
                    const targetFrameIndex = Math.floor(progress * (totalFrames - 1));
                    
                    if (targetFrameIndex < totalFrames) {
                        frameIndex = targetFrameIndex;
                          const img = new Image();
                        img.onload = () => {
                            tempCtx.fillStyle = '#000000';
                            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                            
                            tempCtx.globalCompositeOperation = 'source-over';
                            tempCtx.imageSmoothingEnabled = true;
                            tempCtx.imageSmoothingQuality = 'high';
                            tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                        };
                        img.crossOrigin = 'anonymous';
                        img.src = recordedFrames[frameIndex].data;
                        
                        lastFrameTime = currentTime;
                    }
                }
                
                if (elapsed < totalDuration) {
                    requestAnimationFrame(playNextFrame);
                } else {
                    setTimeout(() => {
                        mediaRecorder.stop();
                    }, 300);
                }
            }
            
            requestAnimationFrame(playNextFrame);
            
        } catch (error) {
            console.error('Video creation failed:', error);
            createFramesDownload(); 
        }
    }    function createFramesDownload() {
        showInfo('Creating individual frame downloads since GIF/Video failed...');
        
        recordedFrames.forEach((frame, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.download = `wink-frame-${String(index + 1).padStart(3, '0')}.png`;
                link.href = frame.data;
                link.click();
            }, index * 200);
        });
        
        setTimeout(() => {
            resetBlinkButton();
        }, recordedFrames.length * 200 + 1000);
    }    function resetBlinkButton() {
        isRecording = false;
        
        if (recordingInterval) {
            clearInterval(recordingInterval);
            recordingInterval = null;
        }
        
        blinkBtn.textContent = 'BLINK (HD Video)';
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

    function captureFrame() {
        if (!isRecording || !originalImageData) return;
        
        const captureCanvas = document.createElement('canvas');
        const captureCtx = captureCanvas.getContext('2d', {
            alpha: false,
            colorSpace: 'srgb',
            willReadFrequently: false
        });
        
        captureCanvas.width = canvas.width;
        captureCanvas.height = canvas.height;
        
        captureCtx.imageSmoothingEnabled = true;
        captureCtx.imageSmoothingQuality = 'high';
        
        captureCtx.fillStyle = '#000000';
        captureCtx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
        
        captureCtx.globalCompositeOperation = 'source-over';
        captureCtx.drawImage(canvas, 0, 0);
        
        const frameData = captureCanvas.toDataURL('image/png', 1.0);
        const timestamp = Date.now() - recordingStartTime;
        recordedFrames.push({ data: frameData, timestamp: timestamp });
    }    function startRecording() {
        if (!originalImageData) {
            showError('Please upload an image first!');
            return;
        }
        
        isRecording = true;
        recordedFrames = [];
        recordingStartTime = Date.now();
        
        blinkBtn.textContent = 'Recording... 5s';
        blinkBtn.disabled = true;
        blinkBtn.style.backgroundColor = '#dc2626'; 
        
        captureFrame();
        
        recordingInterval = setInterval(() => {
            if (isRecording) {
                captureFrame();
            }
        }, 100); 
        
        setTimeout(() => {
            stopRecording();
        }, 5000);
    }    function stopRecording() {
        isRecording = false;
        
        if (recordingInterval) {
            clearInterval(recordingInterval);
            recordingInterval = null;
        }
        
        blinkBtn.textContent = 'Creating Video...';
        
        setTimeout(() => {
            generateGIF();
        }, 100);
    }    async function generateGIF() {
        if (recordedFrames.length === 0) {
            showError('No frames recorded!');
            resetBlinkButton();
            return;
        }

        createWebMVideo();
    }    function createWebMVideo() {
        try {
            blinkBtn.textContent = 'Creating Video...';
            
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = currentImage.width;
            tempCanvas.height = currentImage.height;
            
            const stream = tempCanvas.captureStream(48); 
            const mediaRecorder = new MediaRecorder(stream, { 
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 2500000 
            });
            
            const chunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                
                const videoMetadata = {
                    title: originalFileName || 'Untitled',
                    subtitle: 'made using wink!',
                    size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
                    duration: '5 seconds',
                    format: 'WebM (Standard)',
                    timestamp: new Date().toISOString()
                };
                
                console.log('🎬 Video Metadata:', videoMetadata);
                
                const baseFileName = originalFileName || 'wink-animation';
                const fileName = `${baseFileName}-wink-blink.webm`;
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = fileName;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                
                resetBlinkButton();
            };
            
            mediaRecorder.start();
            const totalDuration = 5000; 
            const totalFrames = recordedFrames.length;
            
            let frameIndex = 0;
            const startTime = performance.now();
            
            function playNextFrame() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / totalDuration, 1);
                const targetFrameIndex = Math.floor(progress * (totalFrames - 1));
                
                if (targetFrameIndex !== frameIndex && targetFrameIndex < totalFrames) {
                    frameIndex = targetFrameIndex;
                    
                    const img = new Image();
                    img.onload = () => {
                        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                    };
                    img.src = recordedFrames[frameIndex].data;
                }
                
                if (elapsed < totalDuration) {
                    requestAnimationFrame(playNextFrame);
                } else {
                    setTimeout(() => {
                        mediaRecorder.stop();
                    }, 100);
                }
            }
            
            requestAnimationFrame(playNextFrame);
            
        } catch (error) {
            console.error('Video creation failed:', error);
            createFramesDownload(); 
        }
    }    function createFramesDownload() {
        showInfo('Creating individual frame downloads since GIF/Video failed...');
        
        recordedFrames.forEach((frame, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.download = `wink-frame-${String(index + 1).padStart(3, '0')}.png`;
                link.href = frame.data;
                link.click();
            }, index * 200);
        });
        
        setTimeout(() => {
            resetBlinkButton();
        }, recordedFrames.length * 200 + 1000);
    }    function resetBlinkButton() {
        isRecording = false;
        
        if (recordingInterval) {
            clearInterval(recordingInterval);
            recordingInterval = null;
        }        
        blinkBtn.textContent = 'BLINK';
        blinkBtn.disabled = false;
        blinkBtn.style.backgroundColor = ''; 
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