(function() {
    'use strict';

    // Configuration
    
    const API_BASE = 'https://crumble.winss.studio/api';
    
    // Local storage keys
    const STORAGE_USER = 'crumble_user';
    const STORAGE_TOKEN = 'crumble_token';
    
    // State
    
    let currentUser = null;
    let currentToken = null;
    let currentDownloadInfo = null;
    let messageTimeout = null;
    
    // DOM Elements
    
    const elements = {
        // User bar
        userBar: document.getElementById('user-bar'),
        loggedUsername: document.getElementById('logged-username'),
        logoutBtn: document.getElementById('logout-btn'),
        
        // Tabs
        tabBtns: document.querySelectorAll('.tab-btn'),
        uploadTab: document.getElementById('upload-tab'),
        downloadTab: document.getElementById('download-tab'),
        
        // Auth section
        authSection: document.getElementById('auth-section'),
        authTabBtns: document.querySelectorAll('.auth-tab-btn'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        
        // Login
        loginUsername: document.getElementById('login-username'),
        loginPassword: document.getElementById('login-password'),
        rememberLogin: document.getElementById('remember-login'),
        loginBtn: document.getElementById('login-btn'),
        
        // Register
        registerUsername: document.getElementById('register-username'),
        registerPassword: document.getElementById('register-password'),
        registerBtn: document.getElementById('register-btn'),
        
        // Upload form
        uploadForm: document.getElementById('upload-form'),
        uploadAuthor: document.getElementById('upload-author'),
        uploadHashtag: document.getElementById('upload-hashtag'),
        uploadFilePassword: document.getElementById('upload-file-password'),
        uploadTTL: document.getElementById('upload-ttl'),
        uploadMaxDownloads: document.getElementById('upload-maxdownloads'),
        uploadFile: document.getElementById('upload-file'),
        fileDropZone: document.getElementById('file-drop-zone'),
        fileSelected: document.getElementById('file-selected'),
        selectedFileName: document.getElementById('selected-file-name'),
        selectedFileSize: document.getElementById('selected-file-size'),
        fileRemove: document.getElementById('file-remove'),
        uploadBtn: document.getElementById('upload-btn'),
        
        // Upload success
        uploadSuccess: document.getElementById('upload-success'),
        successAuthor: document.getElementById('success-author'),
        successHashtag: document.getElementById('success-hashtag'),
        successExpires: document.getElementById('success-expires'),
        successPasswordDisplay: document.getElementById('success-password-display'),
        uploadAnother: document.getElementById('upload-another'),
        shareLink: document.getElementById('share-link'),
        copyLinkBtn: document.getElementById('copy-link-btn'),
        
        // Download form
        downloadForm: document.getElementById('download-form'),
        downloadAuthor: document.getElementById('download-author'),
        downloadHashtag: document.getElementById('download-hashtag'),
        downloadPassword: document.getElementById('download-password'),
        downloadBtn: document.getElementById('download-btn'),
        
        // File preview
        filePreview: document.getElementById('file-preview'),
        previewFilename: document.getElementById('preview-filename'),
        previewSize: document.getElementById('preview-size'),
        previewExpires: document.getElementById('preview-expires'),
        previewDownloads: document.getElementById('preview-downloads'),
        previewDownloadsContainer: document.getElementById('preview-downloads-container'),
        confirmDownload: document.getElementById('confirm-download'),
        cancelDownload: document.getElementById('cancel-download'),
        
        // Message
        messageBox: document.getElementById('message-box'),
        messageText: document.getElementById('message-text'),
        messageClose: document.getElementById('message-close'),
    };
    
    
    function init() {
        loadSavedSession();
        setupEventListeners();
        updateUIForAuth();
        setupCrumbleEffect();
        checkShareLink();
    }
    
    function checkShareLink() {
        const params = new URLSearchParams(window.location.search);
        const author = params.get('a');
        const hashtag = params.get('t');
        
        if (author && hashtag) {
            switchTab('download');
            elements.downloadAuthor.value = author;
            elements.downloadHashtag.value = hashtag;
            elements.downloadPassword.focus();
        }
    }
    
    function loadSavedSession() {
        const savedUser = localStorage.getItem(STORAGE_USER);
        const savedToken = sessionStorage.getItem(STORAGE_TOKEN);
        
        if (savedUser && savedToken) {
            currentUser = savedUser;
            currentToken = savedToken;
        }
    }
    
    function setupEventListeners() {
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
        
        elements.authTabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchAuthTab(btn.dataset.auth));
        });
        
        elements.loginForm.addEventListener('submit', handleLogin);
        elements.registerForm.addEventListener('submit', handleRegister);
        elements.logoutBtn.addEventListener('click', handleLogout);
        
        elements.uploadFile.addEventListener('change', handleFileSelect);
        elements.fileRemove.addEventListener('click', clearFileSelection);
        
        elements.fileDropZone.addEventListener('dragover', handleDragOver);
        elements.fileDropZone.addEventListener('dragleave', handleDragLeave);
        elements.fileDropZone.addEventListener('drop', handleDrop);
        
        elements.uploadForm.addEventListener('submit', handleUpload);
        elements.uploadAnother.addEventListener('click', resetUploadForm);
        elements.copyLinkBtn.addEventListener('click', copyShareLink);
        
        elements.downloadForm.addEventListener('submit', handleDownloadCheck);
        elements.confirmDownload.addEventListener('click', handleDownload);
        elements.cancelDownload.addEventListener('click', cancelDownloadPreview);
        
        elements.messageClose.addEventListener('click', hideMessage);

        elements.successPasswordDisplay.addEventListener('mouseenter', handlePasswordHover);
        elements.successPasswordDisplay.addEventListener('mouseleave', handlePasswordLeave);
    }
    
    let passwordRevealTimeout = null;

    function handlePasswordHover() {
        const password = elements.uploadFilePassword.value;
        if (!password) return;

        elements.successPasswordDisplay.textContent = "do you really want to see it? fine.. showing password in 3s...";
        
        passwordRevealTimeout = setTimeout(() => {
            elements.successPasswordDisplay.textContent = password;
        }, 3000);
    }

    function handlePasswordLeave() {
        if (passwordRevealTimeout) {
            clearTimeout(passwordRevealTimeout);
            passwordRevealTimeout = null;
        }
        elements.successPasswordDisplay.textContent = "[share separately]";
    }
    
    // Authentication
    
    function updateUIForAuth() {
        if (currentUser) {
            elements.userBar.style.display = 'flex';
            elements.loggedUsername.textContent = '#' + currentUser;
            elements.authSection.style.display = 'none';
            elements.uploadForm.style.display = 'flex';
            elements.uploadAuthor.value = currentUser;
        } else {
            elements.userBar.style.display = 'none';
            elements.authSection.style.display = 'block';
            elements.uploadForm.style.display = 'none';
        }
        elements.uploadSuccess.style.display = 'none';
    }
    
    function switchAuthTab(tab) {
        elements.authTabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.auth === tab);
        });
        
        elements.loginForm.style.display = tab === 'login' ? 'flex' : 'none';
        elements.registerForm.style.display = tab === 'register' ? 'flex' : 'none';
    }
    
    async function handleLogin(e) {
        e.preventDefault();
        
        const username = elements.loginUsername.value.trim();
        const password = elements.loginPassword.value;
        
        if (!username || !password) {
            showMessage('Please fill in all fields.', 'error');
            return;
        }
        
        setButtonLoading(elements.loginBtn, true);
        
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Login failed.');
            }
            
            currentUser = data.username;
            currentToken = data.token;
            
            if (elements.rememberLogin.checked) {
                localStorage.setItem(STORAGE_USER, data.username);
            }
            sessionStorage.setItem(STORAGE_TOKEN, data.token);
            
            showMessage('Logged in successfully!', 'success');
            updateUIForAuth();
            elements.loginPassword.value = '';
            
        } catch (error) {
            showMessage(error.message || 'Login failed.', 'error');
        } finally {
            setButtonLoading(elements.loginBtn, false);
        }
    }
    
    async function handleRegister(e) {
        e.preventDefault();
        
        const username = elements.registerUsername.value.trim();
        const password = elements.registerPassword.value;
        
        if (!username || !password) {
            showMessage('Please fill in all fields.', 'error');
            return;
        }
        
        if (username.length < 2 || username.length > 30) {
            showMessage('Username must be 2-30 characters.', 'error');
            return;
        }
        
        if (password.length < 4) {
            showMessage('Password must be at least 4 characters.', 'error');
            return;
        }
        
        setButtonLoading(elements.registerBtn, true);
        
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Registration failed.');
            }
            
            currentUser = data.username;
            currentToken = data.token;
            
            localStorage.setItem(STORAGE_USER, data.username);
            sessionStorage.setItem(STORAGE_TOKEN, data.token);
            
            showMessage('Account created! You are now logged in.', 'success');
            updateUIForAuth();
            
            elements.registerUsername.value = '';
            elements.registerPassword.value = '';
            
        } catch (error) {
            showMessage(error.message || 'Registration failed.', 'error');
        } finally {
            setButtonLoading(elements.registerBtn, false);
        }
    }
    
    function handleLogout() {
        currentUser = null;
        currentToken = null;
        localStorage.removeItem(STORAGE_USER);
        sessionStorage.removeItem(STORAGE_TOKEN);
        
        updateUIForAuth();
        showMessage('Logged out.', 'success');
    }
    
    // Tab Management
    
    function switchTab(tab) {
        elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        elements.uploadTab.classList.toggle('active', tab === 'upload');
        elements.downloadTab.classList.toggle('active', tab === 'download');
        
        hideMessage();
        if (tab === 'download') {
            cancelDownloadPreview();
        }
    }
    
    // File Selection
    
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) displaySelectedFile(file);
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        elements.fileDropZone.classList.add('dragover');
    }
    
    function handleDragLeave(e) {
        e.preventDefault();
        elements.fileDropZone.classList.remove('dragover');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        elements.fileDropZone.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            elements.uploadFile.files = dataTransfer.files;
            displaySelectedFile(file);
        }
    }
    
    function displaySelectedFile(file) {
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            showMessage('File too large. Maximum size is 100MB.', 'error');
            clearFileSelection();
            return;
        }
        
        elements.selectedFileName.textContent = file.name;
        elements.selectedFileSize.textContent = formatBytes(file.size);
        elements.fileDropZone.querySelector('.file-drop-content').style.display = 'none';
        elements.fileSelected.style.display = 'flex';
    }
    
    function clearFileSelection() {
        elements.uploadFile.value = '';
        elements.fileDropZone.querySelector('.file-drop-content').style.display = 'flex';
        elements.fileSelected.style.display = 'none';
    }
    
    // Upload
    
    async function handleUpload(e) {
        e.preventDefault();
        
        if (!currentUser || !currentToken) {
            showMessage('Please login first.', 'error');
            return;
        }
        
        const hashtag = elements.uploadHashtag.value.trim();
        const filePassword = elements.uploadFilePassword.value;
        const ttl = elements.uploadTTL.value;
        const maxDownloads = elements.uploadMaxDownloads.value;
        const file = elements.uploadFile.files[0];
        
        if (!hashtag || !filePassword || !file) {
            showMessage('Please fill in all required fields.', 'error');
            return;
        }
        
        if (hashtag.length < 2) {
            showMessage('File tag must be at least 2 characters.', 'error');
            return;
        }
        
        if (filePassword.length < 4) {
            showMessage('File password must be at least 4 characters.', 'error');
            return;
        }
        
        setButtonLoading(elements.uploadBtn, true);
        
        try {
            const checkResponse = await fetch(`${API_BASE}/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ author: currentUser, hashtag }),
            });
            
            const checkData = await checkResponse.json();
            
            if (!checkData.success) {
                throw new Error(checkData.error || 'Failed to check availability.');
            }
            
            if (!checkData.available) {
                throw new Error('This tag is already in use. Try a different one.');
            }
            
            // Upload the file
            const formData = new FormData();
            formData.append('file', file);
            formData.append('hashtag', hashtag);
            formData.append('filePassword', filePassword);
            formData.append('ttl', ttl);
            if (maxDownloads) {
                formData.append('maxDownloads', maxDownloads);
            }
            
            const uploadResponse = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                },
                body: formData,
            });
            
            const uploadData = await uploadResponse.json();
            
            if (!uploadData.success) {
                throw new Error(uploadData.error || 'Upload failed.');
            }
            
            showUploadSuccess(uploadData.data);
            
        } catch (error) {
            showMessage(error.message || 'Upload failed. Please try again.', 'error');
        } finally {
            setButtonLoading(elements.uploadBtn, false);
        }
    }
    
    function showUploadSuccess(data) {
        elements.uploadForm.style.display = 'none';
        elements.uploadSuccess.style.display = 'block';
        
        elements.successAuthor.textContent = '#' + data.author;
        elements.successHashtag.textContent = '#' + data.hashtag;
        elements.successExpires.textContent = formatDate(data.expiresAt);
        elements.successPasswordDisplay.textContent = "[share separately]";
        
        // Generate shareable link
        const shareUrl = `${window.location.origin}${window.location.pathname}?a=${encodeURIComponent(data.author)}&t=${encodeURIComponent(data.hashtag)}`;
        elements.shareLink.value = shareUrl;
    }
    
    function copyShareLink() {
        elements.shareLink.select();
        navigator.clipboard.writeText(elements.shareLink.value).then(() => {
            const copyIcon = elements.copyLinkBtn.querySelector('.copy-icon');
            const copiedText = elements.copyLinkBtn.querySelector('.copied-text');
            copyIcon.style.display = 'none';
            copiedText.style.display = 'inline';
            setTimeout(() => {
                copyIcon.style.display = 'inline';
                copiedText.style.display = 'none';
            }, 2000);
        });
    }
    
    function resetUploadForm() {
        elements.uploadForm.style.display = 'flex';
        elements.uploadSuccess.style.display = 'none';
        
        elements.uploadHashtag.value = '';
        elements.uploadFilePassword.value = '';
        elements.uploadMaxDownloads.value = '';
        elements.uploadTTL.value = '24';
        clearFileSelection();
    }
    
    // Download
    
    async function handleDownloadCheck(e) {
        e.preventDefault();
        
        const author = elements.downloadAuthor.value.trim();
        const hashtag = elements.downloadHashtag.value.trim();
        const password = elements.downloadPassword.value;
        
        if (!author || !hashtag || !password) {
            showMessage('Please fill in all fields.', 'error');
            return;
        }
        
        setButtonLoading(elements.downloadBtn, true);
        
        try {
            const infoResponse = await fetch(`${API_BASE}/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ author, hashtag }),
            });
            
            const infoData = await infoResponse.json();
            
            if (!infoData.success) {
                throw new Error(infoData.error || 'File not found.');
            }
            
            currentDownloadInfo = {
                author,
                hashtag,
                password,
                ...infoData.data,
            };
            
            showFilePreview(infoData.data);
            
        } catch (error) {
            showMessage(error.message || 'File not found.', 'error');
        } finally {
            setButtonLoading(elements.downloadBtn, false);
        }
    }
    
    function showFilePreview(data) {
        elements.downloadForm.style.display = 'none';
        elements.filePreview.style.display = 'block';
        
        elements.previewFilename.textContent = data.fileName;
        elements.previewSize.textContent = formatBytes(data.size);
        elements.previewExpires.textContent = formatDate(data.expiresAt);
        
        if (data.maxDownloads !== null) {
            elements.previewDownloadsContainer.style.display = 'flex';
            elements.previewDownloads.textContent = `${data.downloadCount} / ${data.maxDownloads}`;
        } else {
            elements.previewDownloadsContainer.style.display = 'none';
        }
    }
    
    async function handleDownload() {
        if (!currentDownloadInfo) return;
        
        setButtonLoading(elements.confirmDownload, true);
        
        try {
            const response = await fetch(`${API_BASE}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author: currentDownloadInfo.author,
                    hashtag: currentDownloadInfo.hashtag,
                    password: currentDownloadInfo.password,
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Download failed.');
            }
            
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentDownloadInfo.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showMessage('Download started!', 'success');
            
            setTimeout(() => {
                cancelDownloadPreview();
            }, 1500);
            
        } catch (error) {
            showMessage(error.message || 'Download failed.', 'error');
        } finally {
            setButtonLoading(elements.confirmDownload, false);
        }
    }
    
    function cancelDownloadPreview() {
        elements.downloadForm.style.display = 'flex';
        elements.filePreview.style.display = 'none';
        currentDownloadInfo = null;
    }
    
    // UI Helpers
    
    function setButtonLoading(btn, loading) {
        if (!btn) return;
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        
        btn.disabled = loading;
        if (btnText) btnText.style.display = loading ? 'none' : 'inline';
        if (btnLoading) btnLoading.style.display = loading ? 'inline' : 'none';
    }
    
    function showMessage(text, type = 'info') {
        if (messageTimeout) {
            clearTimeout(messageTimeout);
        }
        
        elements.messageText.textContent = text;
        elements.messageBox.className = 'message-box ' + type;
        elements.messageBox.style.display = 'flex';
        
        messageTimeout = setTimeout(hideMessage, 5000);
    }
    
    function hideMessage() {
        elements.messageBox.style.display = 'none';
        if (messageTimeout) {
            clearTimeout(messageTimeout);
            messageTimeout = null;
        }
    }
    
    // Utility Functions
    
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = date - now;
        
        if (diff <= 0) {
            return 'Expired';
        }
        
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `in ${days} day${days !== 1 ? 's' : ''}`;
        }
        
        return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    function setupCrumbleEffect() {
        const title = document.querySelector('.crumble-title');
        if (!title) return;

        let isCrumbling = false;

        title.addEventListener('mouseenter', () => {
            if (isCrumbling) return;
            isCrumbling = true;

            setTimeout(() => {
                const letters = title.querySelectorAll('.crumble-letter');
                const particles = [];
                
                const canvas = document.createElement('canvas');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                canvas.style.position = 'fixed';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.pointerEvents = 'none';
                canvas.style.zIndex = '9999';
                canvas.style.background = 'transparent';
                document.body.appendChild(canvas);
                
                const ctx = canvas.getContext('2d');

                letters.forEach(letter => {
                    const rect = letter.getBoundingClientRect();
                    const style = window.getComputedStyle(letter);
                    
                    const tempCanvas = document.createElement('canvas');
                    const scale = 0.1;
                    tempCanvas.width = Math.ceil(rect.width * scale);
                    tempCanvas.height = Math.ceil(rect.height * scale);
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    tempCtx.scale(scale, scale);
                    tempCtx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
                    tempCtx.fillStyle = style.color;
                    tempCtx.textBaseline = 'top';
                    tempCtx.fillText(letter.textContent, 0, 0);
                    
                    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                    const data = imageData.data;
                    
                    for (let y = 0; y < tempCanvas.height; y++) {
                        for (let x = 0; x < tempCanvas.width; x++) {
                            const index = (y * tempCanvas.width + x) * 4;
                            if (data[index + 3] > 128) {
                                particles.push({
                                    x: rect.left + (x / scale),
                                    y: rect.top + (y / scale),
                                    vx: (Math.random() - 0.5) * 0.8, 
                                    vy: (Math.random() - 0.5) * 0.8, 
                                    color: style.color,
                                    size: 1 / scale,
                                    alpha: 1
                                });
                            }
                        }
                    }
                    
                    letter.style.opacity = '0';
                });

                let startTime = null;
                function animate(timestamp) {
                    if (!startTime) startTime = timestamp;
                    const progress = timestamp - startTime;
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    let activeParticles = 0;

                    particles.forEach(p => {
                        if (p.alpha <= 0) return;
                        activeParticles++;

                        p.x += p.vx;
                        p.y += p.vy;
                        p.vy += 0.05;
                        p.alpha -= 0.005;
                        
                        ctx.globalAlpha = p.alpha;
                        ctx.fillStyle = p.color;
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    });
                    ctx.globalAlpha = 1;
                    
                    if (activeParticles > 0 && progress < 5000) {
                        requestAnimationFrame(animate);
                    } else {
                        if (document.body.contains(canvas)) {
                            document.body.removeChild(canvas);
                        }
                        letters.forEach(l => l.style.opacity = '1');
                        isCrumbling = false;
                    }
                }
                
                requestAnimationFrame(animate);
            }, 250); 
        });
    }
    
    
    init();
    
})();
