document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const upload = document.getElementById('upload');
    const effectsContainer = document.getElementById('effects-container');    const resetBtn = document.getElementById('reset-btn');
    const downloadBtn = document.getElementById('download-btn');
    const blinkBtn = document.getElementById('blink-btn');
    const formatSelect = document.getElementById('format-select');
    const takeSnapshotBtn = document.getElementById('take-snapshot-btn');
    const importSnapshotBtn = document.getElementById('import-snapshot-btn');
    const snapshotInput = document.getElementById('snapshot-input');
    const canvasContainer = document.getElementById('canvas-container');
    const notificationContainer = document.getElementById('notification-container');    let originalImageData = null;
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
    }const effects = {
        'Brightness': { value: 0, min: -100, max: 100, type: 'slider', enabled: false },
        'Contrast': { value: 0, min: -100, max: 100, type: 'slider', enabled: false },
        'Grayscale': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Sepia': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Invert': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Blur': { value: 0, min: 0, max: 20, type: 'slider', enabled: false },
        'Hue': { value: 0, min: 0, max: 360, type: 'slider', enabled: false },
        'Pixelate': { value: 1, min: 1, max: 50, type: 'slider', enabled: false },
        'Vignette': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Glitch': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Noise': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Chromatic Aberration': { value: 0, min: 0, max: 20, type: 'slider', enabled: false },
        'Dotted Matrix': { value: 0, min: 0, max: 20, type: 'slider', enabled: false },        'Duotone': { enabled: false, color1: '#0000ff', color2: '#ffff00', type: 'duotone' },        
        'CRT': { value: 0, min: 0, max: 100, type: 'slider', enabled: false },
        'Dotted Line': { value: 0, min: 0, max: 20, type: 'slider', enabled: false },
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
        }
    };function createEffectControls() {
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
            });
            
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'effect-controls';
            if (config.type === 'slider') {
                addSlider(controlsContainer, name, config.min, config.max, config.value);
            } else if (config.type === 'color') {
                addColorPicker(controlsContainer, name, 'color1', config.color1);
                addColorPicker(controlsContainer, name, 'color2', config.color2);            } else if (config.type === 'duotone') {
                addDuotoneControls(controlsContainer, name, config);
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
    }    function addSlider(container, name, min, max, value) {
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
    }function addPerspective3DControls(container, name, config) {
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
                };
                currentImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });function setInitialCanvasSize() {
        const containerWidth = canvasContainer.clientWidth - 32; 
        const containerHeight = canvasContainer.clientHeight - 32;
        const imageAspectRatio = currentImage.width / currentImage.height;
        const containerAspectRatio = containerWidth / containerHeight;

        if (imageAspectRatio > containerAspectRatio) {
            canvas.width = Math.min(containerWidth, currentImage.width);
            canvas.height = canvas.width / imageAspectRatio;
        } else {
            canvas.height = Math.min(containerHeight, currentImage.height);
            canvas.width = canvas.height * imageAspectRatio;
        }
    }

    resetBtn.addEventListener('click', () => {
        for (const name in effects) {
            const config = effects[name];
            if (config.type === 'slider') {
                config.value = name === 'Pixelate' ? 1 : 0;
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
        const snapshot = {};
        
        for (const name in effects) {
            const config = effects[name];
            if (config.enabled) {
                snapshot[name] = {};
                
                if (config.type === 'slider') {
                    snapshot[name] = {
                        type: 'slider',
                        value: config.value,
                        enabled: config.enabled
                    };
                } else if (config.type === 'duotone') {
                    snapshot[name] = {
                        type: 'duotone',
                        enabled: config.enabled,
                        color1: config.color1,
                        color2: config.color2
                    };
                } else if (config.type === 'perspective3d') {
                    snapshot[name] = {
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
                    snapshot[name] = {
                        type: 'toggle',
                        value: config.value,
                        enabled: config.enabled
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
                config.value = name === 'Pixelate' ? 1 : 0;
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
            }
        }
        
        for (const name in snapshot) {
            if (effects[name]) {
                const snapshotConfig = snapshot[name];
                const effectConfig = effects[name];
                
                if (snapshotConfig.type === 'slider') {
                    effectConfig.value = snapshotConfig.value;
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
        );        const data = imageData.data;
        
        if (effects['Brightness'].enabled && effects['Brightness'].value !== 0) adjustBrightness(data, effects['Brightness'].value);
        if (effects['Contrast'].enabled && effects['Contrast'].value !== 0) adjustContrast(data, effects['Contrast'].value);
        if (effects['Grayscale'].enabled && effects['Grayscale'].value > 0) grayscale(data, effects['Grayscale'].value / 100);
        if (effects['Sepia'].enabled && effects['Sepia'].value > 0) sepia(data, effects['Sepia'].value / 100);
        if (effects['Invert'].enabled && effects['Invert'].value > 0) invert(data, effects['Invert'].value / 100);
        if (effects['Noise'].enabled && effects['Noise'].value > 0) noise(data, effects['Noise'].value);        if (effects['Duotone'].enabled) {
            duotone(data, effects['Duotone'].color1, effects['Duotone'].color2);
        }
        if (effects['Glitch'].enabled && effects['Glitch'].value > 0) glitch(imageData, effects['Glitch'].value);        if (effects['Chromatic Aberration'].enabled && effects['Chromatic Aberration'].value > 0) chromaticAberration(imageData, effects['Chromatic Aberration'].value);
        if (effects['Pixelate'].enabled && effects['Pixelate'].value > 1) pixelate(imageData, effects['Pixelate'].value);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);        
        let filterString = '';
        if (effects['Blur'].enabled && effects['Blur'].value > 0) filterString += `blur(${effects['Blur'].value}px) `;
        if (effects['Hue'].enabled && effects['Hue'].value > 0) filterString += `hue-rotate(${effects['Hue'].value}deg)`;
        ctx.filter = filterString;
          ctx.drawImage(canvas, 0, 0); 
        ctx.filter = 'none';
        
        if (effects['Vignette'].enabled && effects['Vignette'].value > 0) vignette(canvas, ctx, effects['Vignette'].value / 100);        if (effects['CRT'].enabled && effects['CRT'].value > 0) crt(canvas, ctx, effects['CRT'].value / 100);
        if (effects['Dotted Matrix'].enabled && effects['Dotted Matrix'].value > 0) dottedMatrix(canvas, ctx, effects['Dotted Matrix'].value);
        if (effects['Dotted Line'].enabled && effects['Dotted Line'].value > 0) dottedLine(canvas, ctx, effects['Dotted Line'].value);
        if (effects['3D Perspective'].enabled) perspective3D(canvas, ctx, effects['3D Perspective']);
    }

    function applyAllEffectsForDownload(tempCanvas, tempCtx) {
        const sourceImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const imageData = new ImageData(
            new Uint8ClampedArray(sourceImageData.data),
            sourceImageData.width,
            sourceImageData.height
        );
        const data = imageData.data;
        if (effects['Brightness'].enabled && effects['Brightness'].value !== 0) adjustBrightness(data, effects['Brightness'].value);
        if (effects['Contrast'].enabled && effects['Contrast'].value !== 0) adjustContrast(data, effects['Contrast'].value);
        if (effects['Grayscale'].enabled && effects['Grayscale'].value > 0) grayscale(data, effects['Grayscale'].value / 100);
        if (effects['Sepia'].enabled && effects['Sepia'].value > 0) sepia(data, effects['Sepia'].value / 100);
        if (effects['Invert'].enabled && effects['Invert'].value > 0) invert(data, effects['Invert'].value / 100);
        if (effects['Noise'].enabled && effects['Noise'].value > 0) noise(data, effects['Noise'].value);
        if (effects['Duotone'].enabled) {
            duotone(data, effects['Duotone'].color1, effects['Duotone'].color2);
        }
        if (effects['Glitch'].enabled && effects['Glitch'].value > 0) glitch(imageData, effects['Glitch'].value);
        if (effects['Chromatic Aberration'].enabled && effects['Chromatic Aberration'].value > 0) chromaticAberration(imageData, effects['Chromatic Aberration'].value);        if (effects['Pixelate'].enabled && effects['Pixelate'].value > 1) pixelate(imageData, effects['Pixelate'].value);
        
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

        tempCtx.putImageData(imageData, 0, 0);
        let filterString = '';
        if (effects['Blur'].enabled && effects['Blur'].value > 0) filterString += `blur(${effects['Blur'].value}px) `;
        if (effects['Hue'].enabled && effects['Hue'].value > 0) filterString += `hue-rotate(${effects['Hue'].value}deg)`;
        tempCtx.filter = filterString;
          tempCtx.drawImage(tempCanvas, 0, 0); 
        tempCtx.filter = 'none';
        

        if (effects['Vignette'].enabled && effects['Vignette'].value > 0) vignette(tempCanvas, tempCtx, effects['Vignette'].value / 100);        if (effects['CRT'].enabled && effects['CRT'].value > 0) crt(tempCanvas, tempCtx, effects['CRT'].value / 100);
        if (effects['Dotted Matrix'].enabled && effects['Dotted Matrix'].value > 0) dottedMatrix(tempCanvas, tempCtx, effects['Dotted Matrix'].value);
        if (effects['Dotted Line'].enabled && effects['Dotted Line'].value > 0) dottedLine(tempCanvas, tempCtx, effects['Dotted Line'].value);
        if (effects['3D Perspective'].enabled) perspective3D(tempCanvas, tempCtx, effects['3D Perspective']);
        
        return tempCanvas;
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
        
        // RGB channel separation/shift
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
        amount = Math.floor(amount);

        for (let i = 0; i < data.length; i += 4) {
            const r_offset = i + amount * 4;
            const b_offset = i - amount * 4;

            if (r_offset < data.length) {
                data[i] = newData[r_offset];
            }
            if (b_offset >= 0) {
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
});

        function updateFavicon() {
            const isDark = document.documentElement.classList.contains('dark') || 
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            const favicon = document.querySelector('link[rel="icon"]');
            if (favicon) {
                favicon.href = isDark ? '../assets/wink/winkwhite.png' : '../assets/wink/winkblack.png';
            }
        }
        
        document.addEventListener('DOMContentLoaded', updateFavicon);
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateFavicon);

        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateFavicon();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });