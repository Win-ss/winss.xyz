        // --- THREE.js Scene Setup ---
        let scene, camera, renderer, controls, particleSystem;
        const canvas = document.getElementById('preview-canvas');
        let gridHelper;
        const PREVIEW_SIZE_FACTOR = 0.6;

        function initPreview() {
            scene = new THREE.Scene();
            const previewBgColorHex = getComputedStyle(document.documentElement).getPropertyValue('--color-preview-bg-threejs').trim();
            scene.background = new THREE.Color(parseInt(previewBgColorHex.replace("#", "0x")));
            
            const rect = canvas.parentElement.getBoundingClientRect();
            const initialWidth = rect.width || 1;
            const initialHeight = rect.height || 1;
            camera = new THREE.PerspectiveCamera(75, initialWidth / initialHeight, 0.1, 1000);
            camera.position.set(60, 40, 80);
            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            renderer.setPixelRatio(window.devicePixelRatio || 1);
            if (renderer.outputEncoding !== undefined) {
                renderer.outputEncoding = THREE.sRGBEncoding; // r128 API
            }
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 10, 7.5);
            scene.add(directionalLight);

            const gridCenterColorHex = getComputedStyle(document.documentElement).getPropertyValue('--color-grid-helper-center').trim();
            const gridColorHex = getComputedStyle(document.documentElement).getPropertyValue('--color-grid-helper-grid').trim();
            gridHelper = new THREE.GridHelper(100, 10, parseInt(gridCenterColorHex.replace("#", "0x")), parseInt(gridColorHex.replace("#", "0x")));
            scene.add(gridHelper);

            animate();
        }

        function animate() {
            requestAnimationFrame(animate);
            const canvasEl = renderer.domElement;
            const parentEl = canvasEl.parentElement;
            if (parentEl) {
                const rect = parentEl.getBoundingClientRect();
                const width = rect.width;
                const height = rect.height;
                const pixelRatio = window.devicePixelRatio || 1;
                
                // Check if size changed or DPI changed
                const needsResize = canvasEl.width !== width * pixelRatio || 
                                   canvasEl.height !== height * pixelRatio;
                
                if (needsResize) {
                    renderer.setSize(width, height, false);
                    renderer.setPixelRatio(pixelRatio);
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                }
            }
            controls.update();
            renderer.render(scene, camera);
        }

        initPreview();

        (function initOptimizedSpiral() {
            const canvas = document.getElementById('silver-spiral-canvas');
            const ctx = canvas.getContext('2d');

            const size = 60;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = size * dpr;
            canvas.height = size * dpr;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            ctx.scale(dpr, dpr);

            const particles = [];
            const numParticles = 80; 
            const angleStep = Math.PI * (2 - Math.sqrt(2));
            const scale = 0.8; 

            const colors = [
                { r: 255, g: 255, b: 255 }, 
                { r: 79, g: 70, b: 229 },   
                { r: 56, g: 42, b: 78 }    
            ];

            for (let i = 0; i < numParticles; i++) {
                const radius = scale * Math.sqrt(i) * 4; 
                const particleSize = 3 - (i / numParticles) * 1.5; 
                if (particleSize < 0.5) continue;

                particles.push({
                    angle: i * angleStep,
                    radius: radius,
                    size: particleSize,
                    pulseTime: Math.random() * 3000,
                    shimmerTime: Math.random() * 10000
                });
            }

            let lastTime = 0;
            let rotation = 0;

            function animate(currentTime) {
                const deltaTime = currentTime - lastTime;
                lastTime = currentTime;

                rotation -= 0.0005 * deltaTime; 

                ctx.clearRect(0, 0, size, size);
                ctx.save();
                ctx.translate(size / 2, size / 2);
                ctx.rotate(rotation);

                particles.forEach(p => {
                    p.pulseTime += deltaTime;
                    p.shimmerTime += deltaTime;

                    const pulseCycle = (p.pulseTime % 3000) / 3000;
                    const pulse = Math.sin(pulseCycle * Math.PI);
                    const currentSize = p.size * (0.8 + pulse * 0.5);
                    const opacity = 0.2 + pulse * 0.8;

                    const shimmerCycle = (p.shimmerTime % 10000) / 10000;
                    const colorIndex1 = Math.floor(shimmerCycle * colors.length);
                    const colorIndex2 = (colorIndex1 + 1) % colors.length;
                    const colorMix = (shimmerCycle * colors.length) % 1;

                    const r = colors[colorIndex1].r + (colors[colorIndex2].r - colors[colorIndex1].r) * colorMix;
                    const g = colors[colorIndex1].g + (colors[colorIndex2].g - colors[colorIndex1].g) * colorMix;
                    const b = colors[colorIndex1].b + (colors[colorIndex2].b - colors[colorIndex1].b) * colorMix;
                    
                    const x = Math.cos(p.angle) * p.radius;
                    const y = Math.sin(p.angle) * p.radius;
                    const colorString = `rgba(${r}, ${g}, ${b}, ${opacity})`;

                    ctx.shadowColor = colorString;
                    ctx.shadowBlur = currentSize * 2; 
                    ctx.fillStyle = colorString;

                    ctx.beginPath();
                    ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                });

                ctx.restore();
                requestAnimationFrame(animate);
            }

            requestAnimationFrame(animate);
        })();

        const fileInput = document.getElementById('file-upload');
        const generateBtn = document.getElementById('generate-btn');
        const particleCountEl = document.getElementById('particle-count');
        const outputCodeEl = document.getElementById('output-code');
        const livePreviewToggle = document.getElementById('live-preview-toggle');
        const experimentalToggle = document.getElementById('experimental-toggle');
        const coordModeSelect = document.getElementById('coord-mode');
        const versionSelector = document.getElementById('version-selector');
        const copyBtn = document.getElementById('copy-btn');
        const copyJsonBtn = document.getElementById('copy-json-btn');
        const downloadJsonBtn = document.getElementById('download-json-btn');
        const clearBtn = document.getElementById('clear-btn');
        const coordAxisSelect = document.getElementById('coord-axis-selector'); 
        const rotationSelector = document.getElementById('rotation-selector'); 
        const sizingModeRadios = document.querySelectorAll('input[name="sizing-mode"]');
        const densityResControls = document.getElementById('density-res-controls');
        const sizeResControls = document.getElementById('size-res-controls');
        const densitySlider = document.getElementById('density');
        const densityValueEl = document.getElementById('density-value');
        const masterResolutionSlider = document.getElementById('master-resolution');
        const masterResolutionValueEl = document.getElementById('master-resolution-value');
        const sizeResTypeRadios = document.querySelectorAll('input[name="size-res-type"]');
        const perBlockControls = document.getElementById('per-block-controls');
        const pixelControls = document.getElementById('pixel-controls');
        const particlesPerBlockInput = document.getElementById('particles-per-block');
        const resolutionWidthPxInput = document.getElementById('resolution-width-px');
        const resolutionHeightPxInput = document.getElementById('resolution-height-px');
        const widthInput = document.getElementById('width-blocks');
        const heightInput = document.getElementById('height-blocks');
        const scaleSlider = document.getElementById('particle-scale');
        const particleScaleValueEl = document.getElementById('particle-scale-value');
        const colorFixerToggle = document.getElementById('color-fixer-toggle');
        const colorFixerControls = document.getElementById('color-fixer-controls');
        const delayToggle = document.getElementById('delay-toggle');
        const delayControls = document.getElementById('delay-controls');
        const delayValueInput = document.getElementById('delay-value');
        const delayMaxTimeInput = document.getElementById('delay-max-time');
        const delayStartPointSelect = document.getElementById('delay-start-point');
        const colorFixerHexInput = document.getElementById('color-fixer-hex');
        const colorModeSelect = document.getElementById('color-mode');
        const solidColorControls = document.getElementById('solid-color-controls');
        const gradientControls = document.getElementById('gradient-controls');
        const gradientStartHex = document.getElementById('gradient-start-hex');
        const gradientEndHex = document.getElementById('gradient-end-hex');
        const gradientDirection = document.getElementById('gradient-direction');
        
        let particleData = [];
        let currentFileName = 'N/A'; 
        let particlesHaveBeenCounted = false;

        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        }
        const debouncedTriggerGeneration = debounce(triggerGeneration, 250);

        function triggerGeneration() {
            if (fileInput.files.length > 0) handleFileUpload({ target: fileInput });
        }
        
        fileInput && fileInput.addEventListener('change', triggerGeneration);
        generateBtn && generateBtn.addEventListener('click', downloadMcfunction);
        copyBtn && copyBtn.addEventListener('click', copyCommands);
        copyJsonBtn && copyJsonBtn.addEventListener('click', copyJson);
        downloadJsonBtn && downloadJsonBtn.addEventListener('click', downloadJson);
        clearBtn && clearBtn.addEventListener('click', resetApp);
        
        [coordModeSelect, versionSelector].filter(el => el).forEach(el => el.addEventListener('input', generateMcfunctionContent));
        [widthInput, heightInput].filter(el => el).forEach(el => el.addEventListener('input', debouncedTriggerGeneration));
        
        [coordAxisSelect, rotationSelector].filter(el => el).forEach(el => el.addEventListener('input', () => {
            if (livePreviewToggle && livePreviewToggle.checked) {
                updatePreview(); 
            } else {
                generateMcfunctionContent(); 
            }
        }));

        livePreviewToggle && livePreviewToggle.addEventListener('change', () => {
            if (livePreviewToggle.checked) {
                updatePreview();
                if (gridHelper) gridHelper.visible = true;
            } else {
                if (particleSystem) scene.remove(particleSystem);
                if (gridHelper) gridHelper.visible = false; 
                renderer.render(scene, camera); 
            }
        });

        [experimentalToggle, ...sizingModeRadios, ...sizeResTypeRadios].filter(el => el).forEach(el => el.addEventListener('input', debouncedTriggerGeneration));
        
        function setupEditableSlider(slider, numberInput, isFloat = false) {
            numberInput.value = isFloat ? parseFloat(slider.value).toFixed(2) : slider.value;
            slider.addEventListener('input', () => { numberInput.value = isFloat ? parseFloat(slider.value).toFixed(2) : slider.value; });
            numberInput.addEventListener('change', () => {
                let value = isFloat ? parseFloat(numberInput.value) : parseInt(numberInput.value);
                const min = parseFloat(slider.min); const max = parseFloat(slider.max);
                if (isNaN(value)) value = min;
                if (value < min) value = min; if (value > max) value = max;
                slider.value = value;
                numberInput.value = isFloat ? value.toFixed(2) : value;
                slider.dispatchEvent(new Event('input', { bubbles:true }));
            });
        }

        setupEditableSlider(densitySlider, densityValueEl, true);
        setupEditableSlider(masterResolutionSlider, masterResolutionValueEl);
        setupEditableSlider(scaleSlider, particleScaleValueEl, true);
        
        [densitySlider, masterResolutionSlider, particlesPerBlockInput, resolutionWidthPxInput, resolutionHeightPxInput, colorFixerToggle, colorFixerHexInput, gradientStartHex, gradientEndHex, gradientDirection].forEach(el => el && el.addEventListener('input', debouncedTriggerGeneration));
        // Delay controls only affect JSON output, not preview - so only regenerate mcfunction content
        [delayToggle, delayValueInput, delayMaxTimeInput, delayStartPointSelect].forEach(el => el && el.addEventListener('input', generateMcfunctionContent));
        scaleSlider && scaleSlider.addEventListener('input', () => { updatePreviewAppearance(); generateMcfunctionContent(); });

        sizingModeRadios.forEach(radio => radio && radio.addEventListener('change', updateSizingModeUI));
        sizeResTypeRadios.forEach(radio => radio && radio.addEventListener('change', updateSizeResModeUI));

        colorFixerToggle && colorFixerToggle.addEventListener('change', (e) => colorFixerControls.classList.toggle('hidden', !e.target.checked));
        delayToggle && delayToggle.addEventListener('change', (e) => delayControls.classList.toggle('hidden', !e.target.checked));
        colorModeSelect && colorModeSelect.addEventListener('change', updateColorModeUI);
        colorModeSelect && colorModeSelect.addEventListener('change', debouncedTriggerGeneration);
        [colorFixerHexInput, gradientStartHex, gradientEndHex].filter(input => input).forEach(input => {
            input.addEventListener('change', (e) => {
                // Validate hex color
                let value = e.target.value;
                if (!value.startsWith('#')) value = '#' + value;
                if (!/^#[0-9A-F]{6}$/i.test(value)) value = '#FFFFFF';
                e.target.value = value.toUpperCase();
            });
        });

        function updateSizingModeUI() {
            const sizingModeElement = document.querySelector('input[name="sizing-mode"]:checked');
            if (!sizingModeElement) return;
            const isDensity = sizingModeElement.value === 'density';
            densityResControls && densityResControls.classList.toggle('hidden', !isDensity);
            sizeResControls && sizeResControls.classList.toggle('hidden', isDensity);
            if (!isDensity) updateSizeResModeUI();
        }
        
        function updateSizeResModeUI() {
            const sizeResTypeElement = document.querySelector('input[name="size-res-type"]:checked');
            if (!sizeResTypeElement) return;
            const isPerBlock = sizeResTypeElement.value === 'perBlock';
            perBlockControls && perBlockControls.classList.toggle('hidden', !isPerBlock);
            pixelControls && pixelControls.classList.toggle('hidden', isPerBlock);
        }

        function updateColorModeUI() {
            if (!colorModeSelect) return;
            const isSolid = colorModeSelect.value === 'solid';
            solidColorControls && solidColorControls.classList.toggle('hidden', !isSolid);
            gradientControls && gradientControls.classList.toggle('hidden', isSolid);
        }

        // Resource tracking to avoid revoking blob URLs before textures finish loading
        let modelResourceURLs = [];
        function registerModelResource(url){ modelResourceURLs.push(url); }
        function clearPreviousModelResources(){
            if (!modelResourceURLs.length) return;
            // Defer revocation slightly to avoid interfering with in-flight GPU uploads
            const urlsToRevoke = modelResourceURLs.slice();
            modelResourceURLs = [];
            setTimeout(()=>{ urlsToRevoke.forEach(u=>{ try { URL.revokeObjectURL(u); } catch(_){} }); }, 5000);
        }

        // Custom Color Picker Implementation BAD
        function handleFileUpload(event) {
            const files = Array.from(event.target.files || []);
            if (!files.length) return;
            clearPreviousModelResources();
            const primary = files.find(f => /\.(obj|gltf|glb|png|jpe?g|webp|gif)$/i.test(f.name));
            if (!primary) { alert('No supported file found.'); return; }
            currentFileName = primary.name;
            const lower = primary.name.toLowerCase();

            const blobURLMap = new Map();
            files.forEach(f => {
                const url = URL.createObjectURL(f);
                blobURLMap.set(f.name, url);
                registerModelResource(url); // track for later cleanup
            });

            const reader = new FileReader();
            if (/(png|jpg|jpeg|webp|gif)$/.test(lower)) {
                reader.onload = e => { const img = new Image(); img.onload = () => processImage(img); img.src = e.target.result; };
                reader.readAsDataURL(primary);
            } else if (lower.endsWith('.obj')) {
                reader.onload = e => { try { processOBJ(e.target.result); } catch(err){ console.error(err); alert('Failed to parse OBJ.'); } };
                reader.readAsText(primary);
            } else if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
                processGLTFWithExtras(primary, blobURLMap);
            } else {
                alert('Unsupported file type.');
            }
        }

        function processGLTFWithExtras(modelFile, blobURLMap){
            const currentSizingMode = document.querySelector('input[name="sizing-mode"]:checked').value;
            if (currentSizingMode !== 'density') {
                alert("Sizing modes other than 'Density & Res' are primarily designed for 2D images. For 3D models, 'Density & Res' will be used.");
                document.querySelector('input[name="sizing-mode"][value="density"]').checked = true;
                updateSizingModeUI();
            }
            const manager = new THREE.LoadingManager();
            manager.setURLModifier((url) => {
                const fileName = url.split(/[\\\/]/).pop();
                if (blobURLMap.has(fileName)) return blobURLMap.get(fileName);
                return url;
            });
            manager.onError = (url)=>{ console.warn('Resource failed to load:', url); };
            const loader = new THREE.GLTFLoader(manager);
            const existing = blobURLMap.get(modelFile.name);
            const modelURL = existing || (()=>{ const u = URL.createObjectURL(modelFile); registerModelResource(u); return u; })();
            loader.load(modelURL, (gltf)=>{
                try { waitForTexturesThenExtract(gltf.scene); }
                catch(err){ console.error('Extraction scheduling error', err); alert('Model loaded but texture handling failed.'); }
            }, undefined, (err)=>{
                console.error('Error loading GLTF/GLB', err);
                alert('Failed to load GLTF/GLB model (see console).');
            });
        }

        function waitForTexturesThenExtract(scene){
            // Gather all potential texture images referenced by materials
            const images = new Set();
            scene.traverse(obj => {
                if (obj.isMesh && obj.material) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    mats.forEach(m => { if (m && m.map && m.map.image) images.add(m.map.image); });
                }
            });
            if (images.size === 0) { extractParticlesFromObject(scene); return; }
            const pending = [];
            images.forEach(img => {
                // Image can be HTMLImageElement, ImageBitmap (already loaded), or Canvas/Video
                if (img instanceof HTMLImageElement) {
                    if (img.complete && img.naturalWidth > 0) return; // already loaded
                    pending.push(new Promise(res => {
                        img.addEventListener('load', () => res(), { once: true });
                        img.addEventListener('error', () => res(), { once: true }); // resolve anyway
                    }));
                }
            });
            if (!pending.length) { extractParticlesFromObject(scene); return; }
            const timeout = new Promise(res => setTimeout(res, 1500));
            Promise.race([
                Promise.all(pending),
                timeout
            ]).then(()=>{
                // Give browser a moment to upload textures to GPU so canvas drawImage succeeds
                requestAnimationFrame(()=> extractParticlesFromObject(scene));
            });
        }
        
        function processImage(img) {
            const sizingMode = document.querySelector('input[name="sizing-mode"]:checked').value;
            const canvas2d = document.createElement('canvas');
            let newParticles = [];
            const isColorFixed = colorFixerToggle.checked;

            if (sizingMode === 'density') {
                const resolution = parseInt(masterResolutionSlider.value);
                canvas2d.width = resolution;
                canvas2d.height = resolution / (img.width / img.height);
                const ctx = canvas2d.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, canvas2d.width, canvas2d.height);
                const imageData = ctx.getImageData(0, 0, canvas2d.width, canvas2d.height).data;
                const density = parseFloat(densitySlider.value);
                for (let y = 0; y < canvas2d.height; y++) {
                    for (let x = 0; x < canvas2d.width; x++) {
                        if (Math.random() > density) continue;
                        const i = (y * canvas2d.width + x) * 4;
                        if (imageData[i+3] > 25) {
                            const normalizedX = x / (canvas2d.width - 1);
                            const normalizedY = y / (canvas2d.height - 1);
                            const color = getFixedColor(normalizedX, normalizedY, imageData[i]/255, imageData[i+1]/255, imageData[i+2]/255);
                            
                            newParticles.push({
                                x, y, z: 0,
                                r: color.r,
                                g: color.g,
                                b: color.b
                            });
                        }
                    }
                }
            } else { 
                const sizeResType = document.querySelector('input[name="size-res-type"]:checked').value;
                let gridW, gridH;
                if (sizeResType === 'perBlock') {
                    const res = parseInt(particlesPerBlockInput.value) || 1;
                    const width = parseInt(widthInput.value) || 16;
                    const height = parseInt(heightInput.value) || 16;
                    gridW = width * res;
                    gridH = height * res;
                } else { 
                    gridW = parseInt(resolutionWidthPxInput.value) || 64;
                    gridH = parseInt(resolutionHeightPxInput.value) || 64;
                }
                canvas2d.width = gridW;
                canvas2d.height = gridH;
                const ctx = canvas2d.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, gridW, gridH);
                const imageData = ctx.getImageData(0, 0, gridW, gridH).data;
                for (let gy = 0; gy < gridH; gy++) {
                    for (let gx = 0; gx < gridW; gx++) {
                        const i = (gy * gridW + gx) * 4;
                         if (imageData[i+3] > 25) {
                            const normalizedX = gx / (gridW - 1);
                            const normalizedY = gy / (gridH - 1);
                            const color = getFixedColor(normalizedX, normalizedY, imageData[i]/255, imageData[i+1]/255, imageData[i+2]/255);
                            
                            newParticles.push({
                                x: gx, y: gy, z: 0,
                                r: color.r,
                                g: color.g,
                                b: color.b
                            });
                        }
                    }
                }
            }
            finalizeParticles(newParticles);
        }

        function processOBJ(data) {
            const currentSizingMode = document.querySelector('input[name="sizing-mode"]:checked').value;
            if (currentSizingMode !== 'density') {
                alert("Sizing modes other than 'Density & Res' are primarily designed for 2D images. For 3D models, 'Density & Res' will be used for particle extraction, though output scaling will still apply.");
                document.querySelector('input[name="sizing-mode"][value="density"]').checked = true;
                updateSizingModeUI();
            }
             const loader = new THREE.OBJLoader();
             const object = loader.parse(data);
             extractParticlesFromObject(object);
        }

        function processGLB(file) {
            const currentSizingMode = document.querySelector('input[name="sizing-mode"]:checked').value;
            if (currentSizingMode !== 'density') {
                alert("Sizing modes other than 'Density & Res' are primarily designed for 2D images. For 3D models, 'Density & Res' will be used for particle extraction, though output scaling will still apply.");
                document.querySelector('input[name="sizing-mode"][value="density"]').checked = true;
                updateSizingModeUI();
            }
             const loader = new THREE.GLTFLoader();
             const objectURL = URL.createObjectURL(file);
             loader.load( objectURL,
                 (gltf) => { extractParticlesFromObject(gltf.scene); URL.revokeObjectURL(objectURL); },
                 undefined,
                 (error) => { console.error("Error loading GLTF model:", error); alert("Failed to load GLTF model."); URL.revokeObjectURL(objectURL); }
             );
        }
        
        function extractParticlesFromObject(object) {
            // Collect vertices (randomly sampled by density) applying full world transform + basic coloration
            let newParticles = [];
            const density = parseFloat(densitySlider.value);
            const resolution = parseInt(masterResolutionSlider.value);
            const textureCanvas = document.createElement('canvas');
            const textureCtx = textureCanvas.getContext('2d', { willReadFrequently: true });
            const isColorFixed = colorFixerToggle && colorFixerToggle.checked;

            // Ensure matrices are current
            object.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = maxDim > 0 ? resolution / maxDim : 1;

            // Calculate bounding box for gradient mapping
            const min = box.min;
            const max = box.max;
            const range = {
                x: max.x - min.x,
                y: max.y - min.y,
                z: max.z - min.z
            };

            const tmpPos = new THREE.Vector3();

            object.traverse(child => {
                if (!child.isMesh) return;
                // Update child's world matrix in case
                child.updateWorldMatrix(true, false);
                const { geometry, material } = child;
                if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
                const positions = geometry.attributes.position.array;
                const uvs = geometry.attributes.uv ? geometry.attributes.uv.array : null;
                const colorsAttr = geometry.attributes.color ? geometry.attributes.color.array : null;
                let textureData = null, textureWidth = 0, textureHeight = 0;

                if (!isColorFixed && material && material.map && material.map.isTexture && uvs) {
                    const image = material.map.image;
                    // Some image objects in older three can be arrays (cubemaps); ignore those
                    if (image && image.width > 0 && image.height > 0) {
                        textureWidth = image.width; textureHeight = image.height;
                        textureCanvas.width = textureWidth; textureCanvas.height = textureHeight;
                        try {
                            textureCtx.clearRect(0, 0, textureWidth, textureHeight);
                            textureCtx.drawImage(image, 0, 0, textureWidth, textureHeight);
                            textureData = textureCtx.getImageData(0, 0, textureWidth, textureHeight).data;
                        } catch (e) {
                            console.warn('Texture sampling failed (likely CORS or not fully loaded); falling back to material color.', e);
                            textureData = null;
                        }
                    }
                }

                for (let i = 0; i < positions.length; i += 3) {
                    if (Math.random() > density) continue; // random vertex sampling
                    let r = 1, g = 1, b = 1;

                    // Transform vertex into world space first to get actual position
                    tmpPos.set(positions[i], positions[i + 1], positions[i + 2]);
                    tmpPos.applyMatrix4(child.matrixWorld);

                    if (isColorFixed) {
                        // Calculate normalized position for gradient mapping (0-1 range)
                        let normalizedX = 0, normalizedY = 0;
                        
                        if (range.x > 0) normalizedX = (tmpPos.x - min.x) / range.x;
                        if (range.y > 0) normalizedY = (tmpPos.y - min.y) / range.y;
                        
                        // Use original colors as base for getFixedColor
                        let originalR = 1, originalG = 1, originalB = 1;
                        
                        // Try to get original colors from various sources
                        if (colorsAttr) {
                            const ci = (i / 3) * 3;
                            if (colorsAttr[ci] !== undefined) {
                                originalR = colorsAttr[ci];
                                originalG = colorsAttr[ci + 1]; 
                                originalB = colorsAttr[ci + 2];
                            }
                        } else if (textureData && uvs) {
                            const uvIndex = (i / 3) * 2;
                            if (uvs[uvIndex] !== undefined && uvs[uvIndex + 1] !== undefined) {
                                const u = uvs[uvIndex];
                                const v = 1 - uvs[uvIndex + 1]; // flip V
                                const texX = Math.min(textureWidth - 1, Math.max(0, Math.floor(u * (textureWidth - 1))));
                                const texY = Math.min(textureHeight - 1, Math.max(0, Math.floor(v * (textureHeight - 1))));
                                const pixelIndex = (texY * textureWidth + texX) * 4;
                                if (pixelIndex >= 0 && pixelIndex + 3 < textureData.length) {
                                    originalR = textureData[pixelIndex] / 255;
                                    originalG = textureData[pixelIndex + 1] / 255;
                                    originalB = textureData[pixelIndex + 2] / 255;
                                }
                            }
                        } else if (material && material.color) {
                            originalR = material.color.r;
                            originalG = material.color.g;
                            originalB = material.color.b;
                        }
                        
                        // Apply color fixer (solid color or gradient)
                        const fixedColor = getFixedColor(normalizedX, normalizedY, originalR, originalG, originalB);
                        r = fixedColor.r;
                        g = fixedColor.g;
                        b = fixedColor.b;
                    } else {
                        // Use original color logic when color fixer is off
                        if (colorsAttr) {
                            const ci = (i / 3) * 3;
                            if (colorsAttr[ci] !== undefined) {
                                r = colorsAttr[ci]; g = colorsAttr[ci + 1]; b = colorsAttr[ci + 2];
                            }
                        } else if (textureData && uvs) {
                            const uvIndex = (i / 3) * 2;
                            if (uvs[uvIndex] !== undefined && uvs[uvIndex + 1] !== undefined) {
                                const u = uvs[uvIndex];
                                const v = 1 - uvs[uvIndex + 1]; // flip V
                                const texX = Math.min(textureWidth - 1, Math.max(0, Math.floor(u * (textureWidth - 1))));
                                const texY = Math.min(textureHeight - 1, Math.max(0, Math.floor(v * (textureHeight - 1))));
                                const pixelIndex = (texY * textureWidth + texX) * 4;
                                if (pixelIndex >= 0 && pixelIndex + 3 < textureData.length) {
                                    r = textureData[pixelIndex] / 255;
                                    g = textureData[pixelIndex + 1] / 255;
                                    b = textureData[pixelIndex + 2] / 255;
                                }
                            }
                        } else if (material && material.color) {
                            r = material.color.r; g = material.color.g; b = material.color.b;
                        }
                    }

                    // Scale the position and add to particles
                    newParticles.push({ x: tmpPos.x * scale, y: tmpPos.y * scale, z: tmpPos.z * scale, r, g, b });
                }
            });

            finalizeParticles(newParticles);
        }

        function hexToRgb(hex) {
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16) / 255,
                g: parseInt(result[2], 16) / 255,
                b: parseInt(result[3], 16) / 255
            } : {r:1, g:1, b:1}; 
        }

        function getFixedColor(x, y, originalR, originalG, originalB) {
            if (!colorFixerToggle || !colorFixerToggle.checked) {
                return { r: originalR, g: originalG, b: originalB };
            }

            if (!colorModeSelect || colorModeSelect.value === 'solid') {
                if (!colorFixerHexInput) {
                    return { r: originalR, g: originalG, b: originalB };
                }
                const fixedColor = hexToRgb(colorFixerHexInput.value);
                return { r: fixedColor.r, g: fixedColor.g, b: fixedColor.b };
            } else {
                // Gradient mode
                if (!gradientStartHex || !gradientEndHex || !gradientDirection) {
                    return { r: originalR, g: originalG, b: originalB };
                }
                
                const startColor = hexToRgb(gradientStartHex.value);
                const endColor = hexToRgb(gradientEndHex.value);
                const direction = gradientDirection.value;
                
                let factor = 0;
                
                // Calculate interpolation factor based on direction
                switch (direction) {
                    case 'horizontal':
                        factor = x; // Assuming x is normalized 0-1
                        break;
                    case 'vertical':
                        factor = y; // Assuming y is normalized 0-1
                        break;
                    case 'diagonal':
                        factor = (x + y) / 2;
                        break;
                    case 'radial':
                        const centerX = 0.5;
                        const centerY = 0.5;
                        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                        factor = Math.min(distance * Math.sqrt(2), 1); // Normalize to max distance
                        break;
                }
                
                factor = Math.max(0, Math.min(1, factor)); // Clamp to 0-1
                
                return {
                    r: startColor.r + (endColor.r - startColor.r) * factor,
                    g: startColor.g + (endColor.g - startColor.g) * factor,
                    b: startColor.b + (endColor.b - startColor.b) * factor
                };
            }
        }

        function finalizeParticles(newParticles) {
            if (!experimentalToggle.checked && newParticles.length > 20000) {
                newParticles = newParticles.slice(0, 20000);
            }
            particleData = newParticles;
            particlesHaveBeenCounted = false; 
            updatePreview();
        }

        function updatePreviewAppearance() {
             if (particleSystem) particleSystem.material.size = parseFloat(scaleSlider.value) * PREVIEW_SIZE_FACTOR;
        }

        function updatePreview() {
            if (particleSystem) { scene.remove(particleSystem); particleSystem.geometry.dispose(); particleSystem.material.dispose(); }

            if (particleData.length === 0 || !livePreviewToggle.checked) {
                particleCountEl.textContent = (particleData.length > 0 ? particleData.length : 0).toLocaleString();
                if (gridHelper) gridHelper.visible = livePreviewToggle.checked;
                renderer.render(scene, camera);
                generateMcfunctionContent(); 
                return;
            }
            if (gridHelper) gridHelper.visible = true;

            const coordAxis = coordAxisSelect.value;
            const selectedRotationDeg = parseInt(rotationSelector.value);

            
            let previewParticles = JSON.parse(JSON.stringify(particleData)); 

            previewParticles = previewParticles.map(p => {
                switch (coordAxis) {
                    case 'Y-Z': return { x_src: p.y, y_src: p.z, z_src: p.x, r: p.r, g: p.g, b: p.b };
                    case 'Z-X': return { x_src: p.z, y_src: p.x, z_src: p.y, r: p.r, g: p.g, b: p.b };
                    case 'X-Y': default: return { x_src: p.x, y_src: p.y, z_src: p.z, r: p.r, g: p.g, b: p.b };
                }
            });

            if (selectedRotationDeg !== 0 && selectedRotationDeg !== 360) {
                const rotationAngleRad = selectedRotationDeg * (Math.PI / 180);
                
                let minX_rot = Infinity, maxX_rot = -Infinity;
                let minY_rot = Infinity, maxY_rot = -Infinity;
                previewParticles.forEach(p => {
                    minX_rot = Math.min(minX_rot, p.x_src);
                    maxX_rot = Math.max(maxX_rot, p.x_src);
                    minY_rot = Math.min(minY_rot, p.y_src);
                    maxY_rot = Math.max(maxY_rot, p.y_src);
                });
                const centerX_rot = (minX_rot === Infinity || maxX_rot === -Infinity) ? 0 : (minX_rot + maxX_rot) / 2;
                const centerY_rot = (minY_rot === Infinity || maxY_rot === -Infinity) ? 0 : (minY_rot + maxY_rot) / 2;
                
                const cosA = Math.cos(rotationAngleRad);
                const sinA = Math.sin(rotationAngleRad);

                previewParticles.forEach(p => {
                    const translatedX = p.x_src - centerX_rot;
                    const translatedY = p.y_src - centerY_rot;
                    p.x_src = translatedX * cosA - translatedY * sinA + centerX_rot;
                    p.y_src = translatedX * sinA + translatedY * cosA + centerY_rot;
                });
            }

            const geometry = new THREE.BufferGeometry();
            const positions = [], colors = [];
            
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
            previewParticles.forEach(p => {
                minX = Math.min(minX, p.x_src); maxX = Math.max(maxX, p.x_src);
                minY = Math.min(minY, p.y_src); maxY = Math.max(maxY, p.y_src);
                minZ = Math.min(minZ, p.z_src); maxZ = Math.max(maxZ, p.z_src);
            });

            const centerX = (minX === Infinity || maxX === -Infinity) ? 0 : (minX + maxX) / 2;
            const centerY = (minY === Infinity || maxY === -Infinity) ? 0 : (minY + maxY) / 2;
            const centerZ = (minZ === Infinity || maxZ === -Infinity) ? 0 : (minZ + maxZ) / 2;

            for (const p of previewParticles) {
                positions.push(p.x_src - centerX, -(p.y_src - centerY), p.z_src - centerZ); 
                colors.push(p.r, p.g, p.b);
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            const material = new THREE.PointsMaterial({
                size: parseFloat(scaleSlider.value) * PREVIEW_SIZE_FACTOR,
                vertexColors: true, sizeAttenuation: true
            });
            particleSystem = new THREE.Points(geometry, material);
            scene.add(particleSystem);
            
            geometry.computeBoundingSphere();
            if (geometry.boundingSphere) { 
                const center = geometry.boundingSphere.center;
                const radius = geometry.boundingSphere.radius;
                const fov = camera.fov * (Math.PI / 180);
                let cameraZ = Math.abs(radius / Math.sin(fov / 2));
                cameraZ = isFinite(cameraZ) && cameraZ > 0 ? cameraZ * 1.2 : 100; 
                camera.position.set(center.x, center.y, cameraZ);
                controls.target.copy(center);
            } else { 
                 // Position camera at an angle to hint at 3D nature
                 camera.position.set(60, 40, 80);
                 controls.target.set(0, 0, 0);
            }
            controls.update();
            particleCountEl.textContent = particleData.length.toLocaleString();
            generateMcfunctionContent();
        }

        function generateMcfunctionContent() {
            if (particleData.length === 0) {
                outputCodeEl.textContent = "Awaiting file upload and generation...";
                return;
            }
            const particleScale = parseFloat(scaleSlider.value).toFixed(2);
            const coordPrefix = coordModeSelect.value === 'local' ? '^' : '~';
            const version = versionSelector.value;
            const coordAxis = coordAxisSelect.value;
            const selectedRotationDeg = parseInt(rotationSelector.value);
            let commands = "";

            // map particledata based on coordAxis (using a deep copy for safety if original particleData structure is complex)
            let tempParticles = JSON.parse(JSON.stringify(particleData)).map(p_orig => {
                const p = {...p_orig}; 
                switch (coordAxis) {
                    case 'Y-Z': 
                        return { x_src: p.y, y_src: p.z, z_src: p.x, r: p.r, g: p.g, b: p.b };
                    case 'Z-X': 
                        return { x_src: p.z, y_src: p.x, z_src: p.y, r: p.r, g: p.g, b: p.b };
                    case 'X-Y': 
                    default:
                        return { x_src: p.x, y_src: p.y, z_src: p.z, r: p.r, g: p.g, b: p.b };
                }
            });

            // rotation if selected
            if (selectedRotationDeg !== 0 && selectedRotationDeg !== 360) {
                const rotationAngleRad = selectedRotationDeg * (Math.PI / 180);
                
                let minX_unrotated = Infinity, maxX_unrotated = -Infinity;
                let minY_unrotated = Infinity, maxY_unrotated = -Infinity;
                tempParticles.forEach(p => {
                    minX_unrotated = Math.min(minX_unrotated, p.x_src);
                    maxX_unrotated = Math.max(maxX_unrotated, p.x_src);
                    minY_unrotated = Math.min(minY_unrotated, p.y_src);
                    maxY_unrotated = Math.max(maxY_unrotated, p.y_src);
                });

                const centerX_unrotated = (minX_unrotated === Infinity || maxX_unrotated === -Infinity) ? 0 : (minX_unrotated + maxX_unrotated) / 2;
                const centerY_unrotated = (minY_unrotated === Infinity || maxY_unrotated === -Infinity) ? 0 : (minY_unrotated + maxY_unrotated) / 2;
                
                const cosA = Math.cos(rotationAngleRad);
                const sinA = Math.sin(rotationAngleRad);

                tempParticles.forEach(p => {
                    const translatedX = p.x_src - centerX_unrotated;
                    const translatedY = p.y_src - centerY_unrotated;
                    p.x_src = translatedX * cosA - translatedY * sinA + centerX_unrotated;
                    p.y_src = translatedX * sinA + translatedY * cosA + centerY_unrotated;
                });
            }
            
            let minX_src = Infinity, maxX_src = -Infinity, minY_src = Infinity, maxY_src = -Infinity, minZ_src = Infinity, maxZ_src = -Infinity;
            tempParticles.forEach(p => {
                minX_src = Math.min(minX_src, p.x_src); maxX_src = Math.max(maxX_src, p.x_src);
                minY_src = Math.min(minY_src, p.y_src); maxY_src = Math.max(maxY_src, p.y_src);
                minZ_src = Math.min(minZ_src, p.z_src); maxZ_src = Math.max(maxZ_src, p.z_src);
            });

            const pWidth_src = (maxX_src === -Infinity || minX_src === Infinity) ? 0 : maxX_src - minX_src; 
            const pHeight_src = (maxY_src === -Infinity || minY_src === Infinity) ? 0 : maxY_src - minY_src; 
            const pDepth_src = (maxZ_src === -Infinity || minZ_src === Infinity) ? 0 : maxZ_src - minZ_src;

            const outWidth_target = parseFloat(widthInput.value) || 16;
            const outHeight_target = parseFloat(heightInput.value) || 16;

            let scaleFactor;
            if (pWidth_src === 0 && pHeight_src === 0) {
                scaleFactor = 1; 
            } else if (pHeight_src === 0) { 
                scaleFactor = pWidth_src > 0 ? outWidth_target / pWidth_src : 1;
            } else if (pWidth_src === 0) { 
                scaleFactor = pHeight_src > 0 ? outHeight_target / pHeight_src : 1;
            } else {
                const aspect_src = pWidth_src / pHeight_src;
                const aspect_out_target = outWidth_target / outHeight_target;
                if (aspect_src > aspect_out_target) {
                    scaleFactor = outWidth_target / pWidth_src; 
                } else {
                    scaleFactor = outHeight_target / pHeight_src; 
                }
            }
            if (!isFinite(scaleFactor) || scaleFactor === 0) scaleFactor = 1; 

            const finalParticles = tempParticles.map(p => {
                const x_norm = pWidth_src > 0 ? (p.x_src - minX_src) / pWidth_src - 0.5 : 0;
                const y_norm = pHeight_src > 0 ? (p.y_src - minY_src) / pHeight_src - 0.5 : 0;
                const z_norm = pDepth_src > 0 ? (p.z_src - minZ_src) / pDepth_src - 0.5 : 0;

                const x = x_norm * (pWidth_src * scaleFactor);
                const y = y_norm * (pHeight_src * scaleFactor);
                const z = z_norm * (pDepth_src * scaleFactor); 
                
                return {
                    x: x.toFixed(3),
                    y: -y.toFixed(3), 
                    z: z.toFixed(3),
                    r: p.r.toFixed(4), g: p.g.toFixed(4), b: p.b.toFixed(4)
                }
            });

            finalParticles.forEach(p => {
                if (version === 'legacy') {
                    commands += `particle minecraft:dust ${p.r} ${p.g} ${p.b} ${particleScale} ${coordPrefix}${p.x} ${coordPrefix}${p.y} ${coordPrefix}${p.z} 0 0 0 0 1 force @a\n`;
                } else {
                    commands += `particle minecraft:dust{color:[${p.r},${p.g},${p.b}],scale:${particleScale}} ${coordPrefix}${p.x} ${coordPrefix}${p.y} ${coordPrefix}${p.z} 0 0 0 0 1 normal\n`;
                }
            });
            outputCodeEl.textContent = commands;
        }
        
        function resetApp(){
            fileInput.value = '';
            currentFileName = 'N/A'; 
            particleData = [];
            particlesHaveBeenCounted = false;
            const sizingModeElement = document.querySelector('input[name="sizing-mode"][value="density"]');
            const sizeResTypeElement = document.querySelector('input[name="size-res-type"][value="perBlock"]');
            sizingModeElement && (sizingModeElement.checked = true);
            sizeResTypeElement && (sizeResTypeElement.checked = true);
            updateSizingModeUI();
            
            widthInput && (widthInput.value = 16);
            heightInput && (heightInput.value = 16);
            particlesPerBlockInput && (particlesPerBlockInput.value = 2);
            resolutionWidthPxInput && (resolutionWidthPxInput.value = 64);
            resolutionHeightPxInput && (resolutionHeightPxInput.value = 64);
            densitySlider && (densitySlider.value = 0.5);
            masterResolutionSlider && (masterResolutionSlider.value = 128);
            scaleSlider && (scaleSlider.value = 1.0);
            coordModeSelect && (coordModeSelect.value = 'local');
            coordAxisSelect && (coordAxisSelect.value = 'X-Y'); 
            rotationSelector && (rotationSelector.value = '0'); 
            versionSelector && (versionSelector.value = '1.21+');
            livePreviewToggle && (livePreviewToggle.checked = true);
            experimentalToggle && (experimentalToggle.checked = false);
            colorFixerToggle && (colorFixerToggle.checked = false);
            colorModeSelect && (colorModeSelect.value = 'solid');
            colorFixerHexInput && (colorFixerHexInput.value = '#FFFFFF');
            gradientStartHex && (gradientStartHex.value = '#FF0000');
            gradientEndHex && (gradientEndHex.value = '#0000FF');
            gradientDirection && (gradientDirection.value = 'horizontal');
            colorFixerControls && colorFixerControls.classList.add('hidden');
            updateColorModeUI();

            densitySlider && densitySlider.dispatchEvent(new Event('input', {bubbles:true}));
            masterResolutionSlider && masterResolutionSlider.dispatchEvent(new Event('input', {bubbles:true}));
            scaleSlider && scaleSlider.dispatchEvent(new Event('input', {bubbles:true}));
            livePreviewToggle && livePreviewToggle.dispatchEvent(new Event('change'));
            updatePreview();
        }

        function copyCommands() {
            const textToCopy = outputCodeEl.textContent;
            if (!textToCopy || textToCopy.startsWith("Awaiting")) return;

            if (!particlesHaveBeenCounted && particleData.length > 0) {
                try {
                    const currentParticles = parseInt(localStorage.getItem('dustlab_userParticles') || '0', 10);
                    localStorage.setItem('dustlab_userParticles', currentParticles + particleData.length);
                    particlesHaveBeenCounted = true;
                } catch (e) {
                    console.error("Failed to update localStorage:", e);
                }
            }

            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
            }, (err) => {
                console.error('Failed to copy text: ', err);
                alert('Failed to copy commands. Please try again.');
            });
        }

        function generateJsonData() {
            if (particleData.length === 0) return null;

            const coordAxis = coordAxisSelect.value;
            const selectedRotationDeg = parseInt(rotationSelector.value);
            const particleScale = parseFloat(scaleSlider.value);

            // Apply coordinate transformation and rotation (same logic as mcfunction generation)
            let tempParticles = JSON.parse(JSON.stringify(particleData)).map(p_orig => {
                const p = {...p_orig}; 
                switch (coordAxis) {
                    case 'Y-Z': 
                        return { x: p.y, y: p.z, z: p.x, r: p.r, g: p.g, b: p.b };
                    case 'Z-X': 
                        return { x: p.z, y: p.x, z: p.y, r: p.r, g: p.g, b: p.b };
                    case 'X-Y': 
                    default:
                        return { x: p.x, y: p.y, z: p.z, r: p.r, g: p.g, b: p.b };
                }
            });

            // Apply rotation if selected
            if (selectedRotationDeg !== 0 && selectedRotationDeg !== 360) {
                const rotationAngleRad = selectedRotationDeg * (Math.PI / 180);
                
                let minX_unrotated = Infinity, maxX_unrotated = -Infinity;
                let minY_unrotated = Infinity, maxY_unrotated = -Infinity;
                tempParticles.forEach(p => {
                    minX_unrotated = Math.min(minX_unrotated, p.x);
                    maxX_unrotated = Math.max(maxX_unrotated, p.x);
                    minY_unrotated = Math.min(minY_unrotated, p.y);
                    maxY_unrotated = Math.max(maxY_unrotated, p.y);
                });

                const centerX_unrotated = (minX_unrotated === Infinity || maxX_unrotated === -Infinity) ? 0 : (minX_unrotated + maxX_unrotated) / 2;
                const centerY_unrotated = (minY_unrotated === Infinity || maxY_unrotated === -Infinity) ? 0 : (minY_unrotated + maxY_unrotated) / 2;
                
                const cosA = Math.cos(rotationAngleRad);
                const sinA = Math.sin(rotationAngleRad);

                tempParticles.forEach(p => {
                    const translatedX = p.x - centerX_unrotated;
                    const translatedY = p.y - centerY_unrotated;
                    p.x = translatedX * cosA - translatedY * sinA + centerX_unrotated;
                    p.y = translatedX * sinA + translatedY * cosA + centerY_unrotated;
                });
            }

            // Apply scaling (same logic as mcfunction generation)
            let minX_src = Infinity, maxX_src = -Infinity, minY_src = Infinity, maxY_src = -Infinity, minZ_src = Infinity, maxZ_src = -Infinity;
            tempParticles.forEach(p => {
                minX_src = Math.min(minX_src, p.x); maxX_src = Math.max(maxX_src, p.x);
                minY_src = Math.min(minY_src, p.y); maxY_src = Math.max(maxY_src, p.y);
                minZ_src = Math.min(minZ_src, p.z); maxZ_src = Math.max(maxZ_src, p.z);
            });

            const pWidth_src = (maxX_src === -Infinity || minX_src === Infinity) ? 0 : maxX_src - minX_src; 
            const pHeight_src = (maxY_src === -Infinity || minY_src === Infinity) ? 0 : maxY_src - minY_src; 
            const pDepth_src = (maxZ_src === -Infinity || minZ_src === Infinity) ? 0 : maxZ_src - minZ_src;

            const outWidth_target = parseFloat(widthInput.value) || 16;
            const outHeight_target = parseFloat(heightInput.value) || 16;

            let scaleFactor;
            if (pWidth_src === 0 && pHeight_src === 0) {
                scaleFactor = 1; 
            } else if (pHeight_src === 0) { 
                scaleFactor = pWidth_src > 0 ? outWidth_target / pWidth_src : 1;
            } else if (pWidth_src === 0) { 
                scaleFactor = pHeight_src > 0 ? outHeight_target / pHeight_src : 1;
            } else {
                const aspect_src = pWidth_src / pHeight_src;
                const aspect_out_target = outWidth_target / outHeight_target;
                if (aspect_src > aspect_out_target) {
                    scaleFactor = outWidth_target / pWidth_src; 
                } else {
                    scaleFactor = outHeight_target / pHeight_src; 
                }
            }
            if (!isFinite(scaleFactor) || scaleFactor === 0) scaleFactor = 1; 

            let finalParticles = tempParticles.map(p => {
                const x_norm = pWidth_src > 0 ? (p.x - minX_src) / pWidth_src - 0.5 : 0;
                const y_norm = pHeight_src > 0 ? (p.y - minY_src) / pHeight_src - 0.5 : 0;
                const z_norm = pDepth_src > 0 ? (p.z - minZ_src) / pDepth_src - 0.5 : 0;

                const x = x_norm * (pWidth_src * scaleFactor);
                const y = y_norm * (pHeight_src * scaleFactor);
                const z = z_norm * (pDepth_src * scaleFactor); 
                
                const particle = {
                    x: parseFloat(x.toFixed(3)),
                    y: parseFloat((-y).toFixed(3)), 
                    z: parseFloat(z.toFixed(3)),
                    r: parseFloat(p.r.toFixed(4)), 
                    g: parseFloat(p.g.toFixed(4)), 
                    b: parseFloat(p.b.toFixed(4)),
                    scale: particleScale
                };

                // Store original normalized coordinates for delay calculation
                particle._normX = x_norm;
                particle._normY = y_norm;
                particle._normZ = z_norm;

                return particle;
            });

            // Apply delay if enabled
            if (delayToggle && delayToggle.checked) {
                const delayValue = parseInt(delayValueInput.value) || 2;
                const startPoint = delayStartPointSelect.value || 'center';
                
                // Calculate distance from start point for each particle
                finalParticles.forEach(particle => {
                    let distanceFromStart;
                    
                    switch (startPoint) {
                        case 'center':
                            distanceFromStart = Math.sqrt(
                                particle._normX * particle._normX + 
                                particle._normY * particle._normY
                            );
                            break;
                        case 'top-left':
                            distanceFromStart = Math.sqrt(
                                (particle._normX + 0.5) * (particle._normX + 0.5) + 
                                (particle._normY + 0.5) * (particle._normY + 0.5)
                            );
                            break;
                        case 'top-right':
                            distanceFromStart = Math.sqrt(
                                (particle._normX - 0.5) * (particle._normX - 0.5) + 
                                (particle._normY + 0.5) * (particle._normY + 0.5)
                            );
                            break;
                        case 'bottom-left':
                            distanceFromStart = Math.sqrt(
                                (particle._normX + 0.5) * (particle._normX + 0.5) + 
                                (particle._normY - 0.5) * (particle._normY - 0.5)
                            );
                            break;
                        case 'bottom-right':
                            distanceFromStart = Math.sqrt(
                                (particle._normX - 0.5) * (particle._normX - 0.5) + 
                                (particle._normY - 0.5) * (particle._normY - 0.5)
                            );
                            break;
                        case 'top':
                            distanceFromStart = Math.abs(particle._normY + 0.5);
                            break;
                        case 'bottom':
                            distanceFromStart = Math.abs(particle._normY - 0.5);
                            break;
                        case 'left':
                            distanceFromStart = Math.abs(particle._normX + 0.5);
                            break;
                        case 'right':
                            distanceFromStart = Math.abs(particle._normX - 0.5);
                            break;
                        default:
                            distanceFromStart = Math.sqrt(
                                particle._normX * particle._normX + 
                                particle._normY * particle._normY
                            );
                    }
                    
                    particle._distance = distanceFromStart;
                });

                // Sort particles by distance from start point
                finalParticles.sort((a, b) => a._distance - b._distance);

                // Get max time in ticks (convert seconds to ticks: 1 second = 20 ticks)
                const maxTimeSeconds = parseInt(delayMaxTimeInput.value) || 30;
                const maxTimeTicks = maxTimeSeconds * 20;

                // Calculate what the total time would be without limit
                const totalUnlimitedTime = (finalParticles.length - 1) * delayValue;
                
                // Assign delays - scale proportionally if exceeding max time
                finalParticles.forEach((particle, index) => {
                    if (totalUnlimitedTime <= maxTimeTicks) {
                        // No scaling needed - use normal cumulative delay
                        particle.delay = index * delayValue;
                    } else {
                        // Scale delays proportionally to fit within max time
                        const scaleFactor = maxTimeTicks / totalUnlimitedTime;
                        particle.delay = Math.round(index * delayValue * scaleFactor);
                    }
                    // Clean up temporary properties
                    delete particle._normX;
                    delete particle._normY;
                    delete particle._normZ;
                    delete particle._distance;
                });
            } else {
                // Clean up temporary properties when delay is not enabled
                finalParticles.forEach(particle => {
                    delete particle._normX;
                    delete particle._normY;
                    delete particle._normZ;
                });
            }

            // Calculate total duration
            let totalDuration = 0;
            if (delayToggle && delayToggle.checked && finalParticles.length > 0) {
                // Total duration is the maximum delay used + the delay interval
                const maxDelay = Math.max(...finalParticles.map(p => p.delay || 0));
                totalDuration = maxDelay + (parseInt(delayValueInput.value) || 2);
            }

            return {
                duration: totalDuration,
                metadata: {
                    generatedBy: "Dust Lab v1.1",
                    website: "https://winss.xyz/dustlab",
                    generatedOn: new Date().toISOString(),
                    sourceFile: currentFileName,
                    particleCount: finalParticles.length,
                    settings: {
                        outputWidth: parseFloat(widthInput.value),
                        outputHeight: parseFloat(heightInput.value),
                        particleScale: particleScale,
                        coordinateMode: coordModeSelect.value,
                        coordinateAxis: coordAxis,
                        rotation: selectedRotationDeg,
                        version: versionSelector && versionSelector.value,
                        delayEnabled: delayToggle && delayToggle.checked,
                        delayValue: delayToggle && delayToggle.checked ? parseInt(delayValueInput.value) || 2 : null,
                        delayMaxTime: delayToggle && delayToggle.checked ? parseInt(delayMaxTimeInput.value) || 30 : null,
                        delayStartPoint: delayToggle && delayToggle.checked ? delayStartPointSelect.value : null,
                        colorFixed: colorFixerToggle && colorFixerToggle.checked,
                        colorMode: colorFixerToggle && colorFixerToggle.checked && colorModeSelect ? colorModeSelect.value : null,
                        fixedColor: colorFixerToggle && colorFixerToggle.checked && colorModeSelect && colorModeSelect.value === 'solid' && colorFixerHexInput ? colorFixerHexInput.value : null,
                        gradientStart: colorFixerToggle && colorFixerToggle.checked && colorModeSelect && colorModeSelect.value === 'gradient' && gradientStartHex ? gradientStartHex.value : null,
                        gradientEnd: colorFixerToggle && colorFixerToggle.checked && colorModeSelect && colorModeSelect.value === 'gradient' && gradientEndHex ? gradientEndHex.value : null,
                        gradientDirection: colorFixerToggle && colorFixerToggle.checked && colorModeSelect && colorModeSelect.value === 'gradient' && gradientDirection ? gradientDirection.value : null
                    }
                },
                particles: finalParticles
            };
        }

        function formatJsonCompact(jsonData) {
            const duration = jsonData.duration || 0;
            const metadata = JSON.stringify(jsonData.metadata, null, 2);
            const particles = jsonData.particles.map(p => 
                `    ${JSON.stringify(p)}`
            ).join(',\n');
            
            return `{\n  "duration": ${duration},\n  "metadata": ${metadata},\n  "particles": [\n${particles}\n  ]\n}`;
        }

        function copyJson() {
            const jsonData = generateJsonData();
            if (!jsonData) {
                alert("Please generate some particles first!");
                return;
            }

            if (!particlesHaveBeenCounted && particleData.length > 0) {
                try {
                    const currentParticles = parseInt(localStorage.getItem('dustlab_userParticles') || '0', 10);
                    localStorage.setItem('dustlab_userParticles', currentParticles + particleData.length);
                    particlesHaveBeenCounted = true;
                } catch (e) {
                    console.error("Failed to update localStorage:", e);
                }
            }

            const jsonString = formatJsonCompact(jsonData);
            navigator.clipboard.writeText(jsonString).then(() => {
                copyJsonBtn.textContent = 'Copied!';
                setTimeout(() => { copyJsonBtn.textContent = 'Copy JSON'; }, 2000);
            }, (err) => {
                console.error('Failed to copy JSON: ', err);
                alert('Failed to copy JSON data. Please try again.');
            });
        }

        function downloadMcfunction() {
            generateMcfunctionContent();
            let commands = outputCodeEl.textContent;
            if (!commands || commands.startsWith("Awaiting")) {
                alert("Please generate some particles first!"); return;
            }

            if (!particlesHaveBeenCounted && particleData.length > 0) {
                try {
                    const currentParticles = parseInt(localStorage.getItem('dustlab_userParticles') || '0', 10);
                    localStorage.setItem('dustlab_userParticles', currentParticles + particleData.length);
                    particlesHaveBeenCounted = true;
                } catch (e) {
                    console.error("Failed to update localStorage:", e);
                }
            }

            try {
                const currentDownloads = parseInt(localStorage.getItem('dustlab_userDownloads') || '0', 10);
                localStorage.setItem('dustlab_userDownloads', currentDownloads + 1);
            } catch (e) {
                console.error("Failed to update localStorage:", e);
            }

            let header = `# Dust Lab, an app by Winss, https://winss.xyz/dustlab \n`;
            header += `# -----------------------------------\n`;
            header += `# Generated on: ${new Date().toLocaleString()}\n`;
            header += `# File: ${currentFileName}\n`; 
            header += `# Output Maximum Width: ${widthInput.value} blocks\n`;
            header += `# Output Maximum Height: ${heightInput.value} blocks\n`;
            if (colorFixerToggle.checked) {
                header += `# Color fixed | ${colorFixerHexInput.value}\n`;
            }
            header += `# --------------------------------------\n`;
            const finalContent = header + commands;

            const blob = new Blob([finalContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dustlab-${crypto.randomUUID().slice(0,8)}.mcfunction`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
        }

        function downloadJson() {
            const jsonData = generateJsonData();
            if (!jsonData) {
                alert("Please generate some particles first!");
                return;
            }

            if (!particlesHaveBeenCounted && particleData.length > 0) {
                try {
                    const currentParticles = parseInt(localStorage.getItem('dustlab_userParticles') || '0', 10);
                    localStorage.setItem('dustlab_userParticles', currentParticles + particleData.length);
                    particlesHaveBeenCounted = true;
                } catch (e) {
                    console.error("Failed to update localStorage:", e);
                }
            }

            try {
                const currentDownloads = parseInt(localStorage.getItem('dustlab_userDownloads') || '0', 10);
                localStorage.setItem('dustlab_userDownloads', currentDownloads + 1);
            } catch (e) {
                console.error("Failed to update localStorage:", e);
            }

            const jsonString = formatJsonCompact(jsonData);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dustlab-particles-${crypto.randomUUID().slice(0,8)}.json`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
        }

        // UI setup
        updateSizingModeUI();
        updateColorModeUI();
        
        // Initialize native color pickers
        const colorFixerPicker = document.getElementById('color-fixer-picker');
        const gradientStartPicker = document.getElementById('gradient-start-picker');
        const gradientEndPicker = document.getElementById('gradient-end-picker');
        
        // Sync color picker with hex input
        colorFixerPicker && colorFixerPicker.addEventListener('input', (e) => {
            colorFixerHexInput && (colorFixerHexInput.value = e.target.value.toUpperCase());
            colorFixerHexInput && colorFixerHexInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        colorFixerHexInput && colorFixerHexInput.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                colorFixerPicker && (colorFixerPicker.value = e.target.value);
            }
        });
        
        gradientStartPicker && gradientStartPicker.addEventListener('input', (e) => {
            gradientStartHex && (gradientStartHex.value = e.target.value.toUpperCase());
            gradientStartHex && gradientStartHex.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        gradientStartHex && gradientStartHex.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                gradientStartPicker && (gradientStartPicker.value = e.target.value);
            }
        });
        
        gradientEndPicker && gradientEndPicker.addEventListener('input', (e) => {
            gradientEndHex && (gradientEndHex.value = e.target.value.toUpperCase());
            gradientEndHex && gradientEndHex.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        gradientEndHex && gradientEndHex.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                gradientEndPicker && (gradientEndPicker.value = e.target.value);
            }
        });
        
        if (gridHelper) {
             const livePreviewToggle = document.getElementById('live-preview-toggle');
             gridHelper.visible = livePreviewToggle.checked;
        }
        setupEditableSlider(densitySlider, densityValueEl, true);
        setupEditableSlider(masterResolutionSlider, masterResolutionValueEl);
        setupEditableSlider(scaleSlider, particleScaleValueEl, true);

        document.getElementById('close-warning').addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.mobile-warning').style.display = 'none';
            document.querySelector('.main-content').style.display = 'block';
        });        