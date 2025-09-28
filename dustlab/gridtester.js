import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

(function () {
    // DOM Elements
    const canvas = document.getElementById('grid-canvas');
    const particleCountEl = document.getElementById('particle-count');
    const boundsInfoEl = document.getElementById('bounds-info');
    const hoverInfoEl = document.getElementById('hover-info');
    const coordinateListEl = document.getElementById('coordinate-list');
    const messageEl = document.getElementById('message');
    const metaGeneratedEl = document.getElementById('meta-generated');
    const metaSourceEl = document.getElementById('meta-source');
    const metaVersionEl = document.getElementById('meta-version');
    const metaScaleEl = document.getElementById('meta-scale');

    // Controls
    const fileInput = document.getElementById('json-file');
    const textArea = document.getElementById('json-text');
    const renderButton = document.getElementById('render-text-btn');
    const clearButton = document.getElementById('clear-btn');
    const sampleButton = document.getElementById('sample-btn');
    const gridToggle = document.getElementById('grid-toggle');
    const axesToggle = document.getElementById('axes-toggle');
    const boundsToggle = document.getElementById('bounds-toggle');

    if (!canvas) {
        console.warn('Grid Tester canvas not found, script aborted.');
        return;
    }

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080808);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(18, 14, 20);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 120;
    controls.target.set(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(12, 18, 10);
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(64, 64, 0x7845c4, 0x2c2c2c);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(16);
    scene.add(axesHelper);

    // State
    let animationFrameId = null;
    let particleMesh = null;
    let outlineMesh = null;
    let boundsHelper = null;
    let particleData = [];
    let baseColors = [];
    let hoveredId = null;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const highlightTarget = new THREE.Color(0xffffff);

    // --- Core Functions ---

    function resizeRenderer() {
        const rect = canvas.getBoundingClientRect();
        const { width, height } = rect;
        if (width === 0 || height === 0) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    function startRendering() {
        resizeRenderer();
        if (animationFrameId === null) {
            animate();
        }
    }

    function stopRendering() {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    // --- Utility Functions ---

    function clamp01(value) {
        return Math.min(1, Math.max(0, value ?? 0));
    }

    function formatNumber(value) {
        return Number.isFinite(value) ? value.toFixed(3).replace(/\.000$/, '') : '—';
    }

    function setInstanceColor(mesh, index, color) {
        if (!mesh || typeof mesh.setColorAt !== 'function' || !mesh.instanceColor) return;
        mesh.setColorAt(index, color);
        mesh.instanceColor.needsUpdate = true;
    }

    // --- Scene Management ---

    function clearParticles() {
        if (particleMesh) {
            scene.remove(particleMesh);
            particleMesh.geometry.dispose();
            particleMesh.material.dispose();
            particleMesh = null;
        }
        if (outlineMesh) {
            scene.remove(outlineMesh);
            outlineMesh.geometry.dispose();
            outlineMesh.material.dispose();
            outlineMesh = null;
        }
        if (boundsHelper) {
            scene.remove(boundsHelper);
            boundsHelper.geometry.dispose();
            boundsHelper.material.dispose();
            boundsHelper = null;
        }
        particleData = [];
        baseColors = [];
        hoveredId = null;

        particleCountEl.textContent = '0';
        updateBoundsInfo(null);
        updateGrid(null);
        focusCamera(null);
        hoverInfoEl.textContent = 'Move over cubes to see coordinates';
        coordinateListEl.innerHTML = '<p>No particles loaded.</p>';
        updateMetadata();
    }

    function calculateBounds(particles) {
        if (!particles || !particles.length) return null;

        return particles.reduce((acc, p) => {
            acc.minX = Math.min(acc.minX, p.x);
            acc.maxX = Math.max(acc.maxX, p.x);
            acc.minY = Math.min(acc.minY, p.y);
            acc.maxY = Math.max(acc.maxY, p.y);
            acc.minZ = Math.min(acc.minZ, p.z);
            acc.maxZ = Math.max(acc.maxZ, p.z);
            return acc;
        }, {
            minX: Infinity, maxX: -Infinity,
            minY: Infinity, maxY: -Infinity,
            minZ: Infinity, maxZ: -Infinity
        });
    }

    function focusCamera(bounds) {
        if (!bounds) {
            controls.target.set(0, 0, 0);
            camera.position.set(18, 14, 20);
            controls.update();
            return;
        }

        const center = new THREE.Vector3(
            (bounds.minX + bounds.maxX) / 2,
            (bounds.minY + bounds.maxY) / 2,
            (bounds.minZ + bounds.maxZ) / 2
        );
        const span = Math.max(
            bounds.maxX - bounds.minX,
            bounds.maxY - bounds.minY,
            bounds.maxZ - bounds.minZ,
            4 // Minimum span to avoid excessive zoom
        );

        const distance = span * 1.8 + 6;
        camera.position.set(center.x + distance, center.y + distance * 0.6, center.z + distance);
        controls.target.copy(center);
        controls.update();
    }

    function updateGrid(bounds) {
        if (!bounds) {
            gridHelper.scale.set(1, 1, 1);
            gridHelper.position.set(0, -0.5, 0);
            return;
        }

        const center = new THREE.Vector3(
            (bounds.minX + bounds.maxX) / 2,
            bounds.minY - 0.5,
            (bounds.minZ + bounds.maxZ) / 2
        );
        const maxSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 8);
        const scale = Math.max(maxSpan, 4) / 32;

        gridHelper.scale.set(scale, 1, scale);
        gridHelper.position.copy(center);
    }

    // --- UI Updates ---

    function updateBoundsInfo(bounds) {
        if (!bounds) {
            boundsInfoEl.innerHTML = '—';
            return;
        }
        boundsInfoEl.innerHTML = `
            X: ${formatNumber(bounds.minX)} → ${formatNumber(bounds.maxX)}<br>
            Y: ${formatNumber(bounds.minY)} → ${formatNumber(bounds.maxY)}<br>
            Z: ${formatNumber(bounds.minZ)} → ${formatNumber(bounds.maxZ)}
        `;
    }

    function updateMetadata(metadata = {}, settings = {}) {
        metaGeneratedEl.textContent = metadata.generatedBy || '—';
        metaSourceEl.textContent = metadata.sourceFile || metadata.originalSource || '—';
        metaVersionEl.textContent = settings.version || metadata.version || '—';
        const scale = settings.particleScale ?? metadata.averageScale;
        metaScaleEl.textContent = scale ? formatNumber(scale) : '—';
    }

    function updateCoordinateList(particles) {
        if (!particles || !particles.length) {
            coordinateListEl.innerHTML = '<p>No particles loaded.</p>';
            return;
        }

        const MAX_RENDERED = 600;
        const fragment = document.createDocumentFragment();

        particles.slice(0, MAX_RENDERED).forEach((p, index) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between gap-2 px-2 py-1 rounded-md';
            item.style.backgroundColor = 'rgba(60, 60, 60, 0.2)';

            const color = new THREE.Color(p.r, p.g, p.b);
            const rgbDisplay = `${formatNumber(p.r)}, ${formatNumber(p.g)}, ${formatNumber(p.b)}`;

            item.innerHTML = `
                <div class="flex flex-col">
                    <span style="color: var(--color-text-main);">#${index + 1}</span>
                    <span>XYZ: (${formatNumber(p.x)}, ${formatNumber(p.y)}, ${formatNumber(p.z)})</span>
                </div>
                <div class="text-right" style="color: var(--color-text-muted);">
                    <div>RGB: ${rgbDisplay}</div>
                    <div>Scale: ${formatNumber(p.scale ?? 1)}</div>
                </div>
            `;

            const swatch = document.createElement('span');
            swatch.style.cssText = `display: inline-block; width: 12px; height: 12px; border-radius: 3px; background: rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}); border: 1px solid rgba(255, 255, 255, 0.2);`;
            swatch.setAttribute('aria-label', `Color ${rgbDisplay}`);

            item.prepend(swatch);
            fragment.appendChild(item);
        });

        if (particles.length > MAX_RENDERED) {
            const note = document.createElement('p');
            note.className = 'text-xs mt-2';
            note.textContent = `Showing first ${MAX_RENDERED.toLocaleString()} of ${particles.length.toLocaleString()} particles.`;
            fragment.appendChild(note);
        }

        coordinateListEl.innerHTML = '';
        coordinateListEl.appendChild(fragment);
    }

    function updateHoverInfo(id) {
        if (id == null || !particleData[id]) {
            hoverInfoEl.textContent = 'Move over cubes to see coordinates';
            return;
        }
        const p = particleData[id];
        const rgb = { r: formatNumber(p.r), g: formatNumber(p.g), b: formatNumber(p.b) };
        hoverInfoEl.textContent = `#${id + 1} · XYZ (${formatNumber(p.x)}, ${formatNumber(p.y)}, ${formatNumber(p.z)}) · RGB (${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }

    // --- Particle Rendering ---

    function buildParticleMesh(particles) {
        clearParticles();

        if (!particles || !particles.length) {
            showMessage('No valid particles found in JSON.', 'error');
            return;
        }

        const count = particles.length;
        const fillGeometry = new THREE.BoxGeometry(1, 1, 1);
        const outlineGeometry = new THREE.BoxGeometry(1, 1, 1);
        const fillMaterial = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.2 });
        const outlineMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });

        particleMesh = new THREE.InstancedMesh(fillGeometry, fillMaterial, count);
        outlineMesh = new THREE.InstancedMesh(outlineGeometry, outlineMaterial, count);
        outlineMesh.renderOrder = 1; // Render outlines on top

        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scaleVec = new THREE.Vector3();

        particleData = particles;
        baseColors = new Array(count);

        particles.forEach((p, i) => {
            const visualScale = Math.max(0.05, (p.scale ?? 1) * 0.2);
            position.set(p.x, p.y, p.z);
            scaleVec.setScalar(visualScale);
            matrix.compose(position, quaternion, scaleVec);
            particleMesh.setMatrixAt(i, matrix);
            outlineMesh.setMatrixAt(i, matrix);

            const color = new THREE.Color(p.r, p.g, p.b);
            const fillColor = color.clone(); // Use exact color from JSON
            const outlineColor = color.clone().lerp(new THREE.Color(1, 1, 1), 0.3); // Brighten outline for visibility

            particleMesh.setColorAt(i, fillColor);
            outlineMesh.setColorAt(i, outlineColor);
            baseColors[i] = { fill: fillColor, outline: outlineColor };
        });

        particleMesh.instanceMatrix.needsUpdate = true;
        outlineMesh.instanceMatrix.needsUpdate = true;
        if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
        if (outlineMesh.instanceColor) outlineMesh.instanceColor.needsUpdate = true;

        scene.add(particleMesh);
        scene.add(outlineMesh);

        const bounds = calculateBounds(particles);

        if (bounds) {
            const box = new THREE.Box3(
                new THREE.Vector3(bounds.minX, bounds.minY, bounds.minZ),
                new THREE.Vector3(bounds.maxX, bounds.maxY, bounds.maxZ)
            );
            boundsHelper = new THREE.Box3Helper(box, 0xffff00);
            scene.add(boundsHelper);
            boundsHelper.visible = boundsToggle.checked;
        }

        particleCountEl.textContent = count.toLocaleString();
        updateBoundsInfo(bounds);
        updateGrid(bounds);
        focusCamera(bounds);
        updateCoordinateList(particles);
        updateHoverInfo(null);
    }

    // --- Data Handling ---

    function parseParticleJson(text) {
        if (!text || !text.trim()) {
            throw new Error('No JSON provided. Paste or upload a file.');
        }
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (error) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }

        const particles = Array.isArray(parsed.particles) ? parsed.particles : Array.isArray(parsed) ? parsed : null;
        if (!particles) {
            throw new Error('No "particles" array found in the JSON.');
        }

        const sanitized = particles
            .filter(p => typeof p === 'object' && p !== null)
            .map(p => ({
                x: Number(p.x) || 0,
                y: Number(p.y) || 0,
                z: Number(p.z) || 0,
                r: clamp01(p.r),
                g: clamp01(p.g),
                b: clamp01(p.b),
                scale: Number.isFinite(p.scale) ? p.scale : 1
            }));

        if (!sanitized.length) {
            throw new Error('Particle array is empty after validation.');
        }

        return {
            particles: sanitized,
            metadata: parsed.metadata || {},
            settings: parsed.metadata?.settings || parsed.settings || {}
        };
    }

    function showMessage(content, variant = 'info') {
        if (!messageEl) return;
        messageEl.textContent = content;
        messageEl.style.color = variant === 'error' ? '#f87171' : '#a78bfa';
    }

    function handleLoadedJson({ particles, metadata, settings }) {
        buildParticleMesh(particles);
        updateMetadata(metadata, settings);
        showMessage(`Loaded ${particles.length.toLocaleString()} particles.`, 'info');
    }

    // --- Event Handlers ---

    function onFileSelected(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                textArea.value = e.target.result;
                const result = parseParticleJson(e.target.result);
                handleLoadedJson(result);
            } catch (error) {
                showMessage(error.message, 'error');
            }
        };
        reader.onerror = () => {
            showMessage('Failed to read the file.', 'error');
        };
        reader.readAsText(file);
    }

    function onRenderClicked() {
        try {
            const result = parseParticleJson(textArea.value);
            handleLoadedJson(result);
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }

    function onClearClicked() {
        fileInput.value = '';
        textArea.value = '';
        clearParticles();
        showMessage('Cleared.', 'info');
    }

    function loadSample() {
        const sample = `{
  "duration": 0,
  "metadata": {
    "generatedBy": "Dust Lab v1.1",
    "website": "https://winss.xyz/dustlab",
    "generatedOn": "2025-09-26T20:51:11.053Z",
    "sourceFile": "sample.png",
    "particleCount": 20,
    "settings": { "particleScale": 2.3, "version": "1.21+" }
  },
  "particles": [
    {"x":0.198,"y":-3,"z":0,"r":0.265,"g":0.566,"b":0.41,"scale":2.3},
    {"x":0.264,"y":-2.934,"z":0,"r":0.269,"g":0.568,"b":0.410,"scale":2.3},
    {"x":0.198,"y":-2.934,"z":0,"r":0.269,"g":0.568,"b":0.410,"scale":2.3},
    {"x":0.066,"y":-2.868,"z":0,"r":0.274,"g":0.570,"b":0.411,"scale":2.3},
    {"x":-0.264,"y":-2.868,"z":0,"r":0.273,"g":0.569,"b":0.411,"scale":2.3},
    {"x":-0.33,"y":-2.868,"z":0,"r":0.273,"g":0.569,"b":0.411,"scale":2.3},
    {"x":0.132,"y":-2.802,"z":0,"r":0.279,"g":0.571,"b":0.412,"scale":2.3},
    {"x":0,"y":-2.802,"z":0,"r":0.279,"g":0.571,"b":0.412,"scale":2.3},
    {"x":-0.066,"y":-2.736,"z":0,"r":0.283,"g":0.573,"b":0.412,"scale":2.3},
    {"x":-0.264,"y":-2.67,"z":0,"r":0.287,"g":0.574,"b":0.413,"scale":2.3},
    {"x":0.264,"y":-2.604,"z":0,"r":0.292,"g":0.576,"b":0.414,"scale":2.3},
    {"x":0.462,"y":-2.338,"z":0,"r":0.295,"g":0.577,"b":0.414,"scale":2.3},
    {"x":-0.132,"y":-2.338,"z":0,"r":0.297,"g":0.578,"b":0.415,"scale":2.3},
    {"x":-0.33,"y":-2.473,"z":0,"r":0.300,"g":0.579,"b":0.415,"scale":2.3},
    {"x":0.396,"y":-2.407,"z":0,"r":0.305,"g":0.581,"b":0.416,"scale":2.3},
    {"x":-0.264,"y":-2.407,"z":0,"r":0.305,"g":0.581,"b":0.416,"scale":2.3},
    {"x":-0.527,"y":-2.407,"z":0,"r":0.302,"g":0.580,"b":0.415,"scale":2.3},
    {"x":0.593,"y":-2.341,"z":0,"r":0.306,"g":0.581,"b":0.416,"scale":2.3},
    {"x":0.462,"y":-2.341,"z":0,"r":0.308,"g":0.582,"b":0.416,"scale":2.3},
    {"x":0.396,"y":-2.341,"z":0,"r":0.309,"g":0.582,"b":0.417,"scale":2.3}
  ]
}`;
        textArea.value = sample;
        showMessage('Sample JSON loaded. Click Render to view.', 'info');
    }

    function handlePointerMove(event) {
        if (!particleMesh) return;

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(particleMesh);

        const newHoveredId = (intersects.length > 0) ? intersects[0].instanceId : null;

        if (newHoveredId !== hoveredId) {
            // Restore old hovered color
            if (hoveredId !== null && baseColors[hoveredId]) {
                setInstanceColor(particleMesh, hoveredId, baseColors[hoveredId].fill);
                setInstanceColor(outlineMesh, hoveredId, baseColors[hoveredId].outline);
            }

            hoveredId = newHoveredId;

            // Apply new highlight
            if (hoveredId !== null) {
                setInstanceColor(particleMesh, hoveredId, highlightTarget);
                setInstanceColor(outlineMesh, hoveredId, highlightTarget);
            }
            updateHoverInfo(hoveredId);
        }
    }

    function handlePointerLeave() {
        if (hoveredId !== null && baseColors[hoveredId]) {
            setInstanceColor(particleMesh, hoveredId, baseColors[hoveredId].fill);
            setInstanceColor(outlineMesh, hoveredId, baseColors[hoveredId].outline);
        }
        hoveredId = null;
        updateHoverInfo(null);
    }

    function initEventListeners() {
        window.addEventListener('resize', resizeRenderer);
        renderer.domElement.addEventListener('mousemove', handlePointerMove);
        renderer.domElement.addEventListener('mouseleave', handlePointerLeave);
        fileInput.addEventListener('change', onFileSelected);
        renderButton.addEventListener('click', onRenderClicked);
        clearButton.addEventListener('click', onClearClicked);
        sampleButton.addEventListener('click', loadSample);
        gridToggle.addEventListener('change', (e) => (gridHelper.visible = e.target.checked));
        axesToggle.addEventListener('change', (e) => (axesHelper.visible = e.target.checked));
        boundsToggle.addEventListener('change', (e) => {
            if (boundsHelper) {
                boundsHelper.visible = e.target.checked;
            }
        });
    }

    // --- Initialization ---
    initEventListeners();
    startRendering();
    loadSample();
    onRenderClicked();
})();
