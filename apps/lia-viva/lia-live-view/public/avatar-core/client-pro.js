// =====================================================
// CLIENT-PRO.JS - Avatar Engine Client Integration
// =====================================================
// Handles initialization, UI events, and avatar control
// =====================================================

// Global avatar engine instance
let avatarEngine = null;
let isInitialized = false;

// DOM Elements
const liaCanvas = document.getElementById('lia-canvas');
const statusBadge = document.getElementById('status-badge');
const logPanel = document.getElementById('log-panel');
const speakBtn = document.getElementById('speak-btn');
const speakText = document.getElementById('speak-text');
const temperatureSlider = document.getElementById('temperature');
const tempValue = document.getElementById('temp-value');

// =====================================================
// LOGGING
// =====================================================

function log(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    console.log(`[Client] ${message}`);

    if (logPanel) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${message}</span>
        `;
        logPanel.appendChild(entry);
        logPanel.scrollTop = logPanel.scrollHeight;

        // Keep only last 50 entries
        while (logPanel.children.length > 50) {
            logPanel.removeChild(logPanel.firstChild);
        }
    }
}

function setStatus(status, text) {
    if (statusBadge) {
        statusBadge.className = `status-${status}`;
        statusBadge.textContent = text;
    }
}

// =====================================================
// INITIALIZATION
// =====================================================

async function initializeAvatarEngine() {
    log('Iniciando Avatar Engine Pro...');
    setStatus('loading', '⏳ Carregando...');

    try {
        // Wait for dependencies
        await waitForDependencies();
        log('Dependências carregadas');

        // Create engine instance
        avatarEngine = new AvatarEnginePro(liaCanvas);
        log('Engine criado');

        // Initialize
        await avatarEngine.initialize();
        log('Engine inicializado');

        // Load LIA image
        const liaImage = await loadLiaImage();
        log('Imagem carregada');

        // Create avatar
        await avatarEngine.createAvatar(liaImage);
        log('Avatar criado!');

        isInitialized = true;
        setStatus('ready', '💚 LIA Viva!');
        log('✅ Avatar Engine Pro pronto!');

        // Expose to window for debugging
        window.lia = {
            engine: avatarEngine,
            speak: (text) => avatarEngine.speak(text),
            setExpression: (e, i) => avatarEngine.setExpression(e, i),
            blink: () => avatarEngine.blink(),
            state: () => avatarEngine.getState()
        };

    } catch (error) {
        console.error('Initialization error:', error);
        log(`❌ Erro: ${error.message}`);
        setStatus('error', '❌ Erro');
    }
}

async function waitForDependencies() {
    const maxWait = 10000;
    const interval = 100;
    let waited = 0;

    return new Promise((resolve, reject) => {
        const check = () => {
            // Check for our modules
            const modulesReady =
                typeof window.AvatarEnginePro !== 'undefined' &&
                typeof window.ExpressionExtractor !== 'undefined' &&
                typeof window.FaceRigBuilder !== 'undefined' &&
                typeof window.LipSyncEngine !== 'undefined' &&
                typeof window.MotionSynthesizer !== 'undefined' &&
                typeof window.EmotionEngine !== 'undefined';

            if (modulesReady) {
                resolve();
                return;
            }

            waited += interval;
            if (waited >= maxWait) {
                reject(new Error('Timeout aguardando módulos'));
                return;
            }

            setTimeout(check, interval);
        };
        check();
    });
}

async function loadLiaImage() {
    // Try multiple paths for LIA image
    const paths = [
        '/avatar/ChatGPT Image 10 de out. de 2025, 07_29_56.png',
        '/avatar/Lia expressando curiosidade.PNG',
        '/lia/Lia.png',
        '/images/lia.png'
    ];

    for (const path of paths) {
        try {
            const img = await loadImage(path);
            log(`Imagem encontrada: ${path}`);
            return img;
        } catch (e) {
            // Continue to next path
        }
    }

    // If no image found, create placeholder
    log('Usando imagem placeholder');
    return createPlaceholderImage();
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = src;

        // Timeout
        setTimeout(() => reject(new Error('Image load timeout')), 5000);
    });
}

function createPlaceholderImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 512, 512);

    // Face circle
    ctx.fillStyle = '#e8d5c4';
    ctx.beginPath();
    ctx.arc(256, 200, 80, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(230, 180, 10, 0, Math.PI * 2);
    ctx.arc(282, 180, 10, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(256, 220, 20, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // Body placeholder
    ctx.fillStyle = '#333';
    ctx.fillRect(206, 280, 100, 200);

    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

// =====================================================
// EVENT HANDLERS
// =====================================================

function setupEventHandlers() {
    // Emotion buttons
    document.querySelectorAll('.emotion-btn[data-emotion]').forEach(btn => {
        btn.addEventListener('click', () => {
            const emotion = btn.dataset.emotion;
            if (avatarEngine && isInitialized) {
                avatarEngine.setExpression(emotion, 0.8);
                log(`Expressão: ${emotion}`);

                // Update active state
                document.querySelectorAll('.emotion-btn[data-emotion]').forEach(b =>
                    b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Speak button
    if (speakBtn && speakText) {
        speakBtn.addEventListener('click', async () => {
            if (avatarEngine && isInitialized) {
                const text = speakText.value.trim();
                if (text) {
                    speakBtn.disabled = true;
                    setStatus('speaking', '🗣️ Falando...');
                    log(`Falando: "${text.substring(0, 30)}..."`);

                    try {
                        await avatarEngine.speak(text);
                    } catch (e) {
                        log(`Erro ao falar: ${e.message}`);
                    }

                    speakBtn.disabled = false;
                    setStatus('ready', '💚 LIA Viva!');
                }
            }
        });
    }

    // Temperature slider
    if (temperatureSlider && tempValue) {
        temperatureSlider.addEventListener('input', () => {
            const temp = parseInt(temperatureSlider.value);
            tempValue.textContent = temp;
            if (avatarEngine && isInitialized) {
                avatarEngine.setEmotionalTemperature(temp);
                log(`Temperatura: ${temp}`);
            }
        });
    }

    // Blink button
    const blinkBtn = document.getElementById('blink-btn');
    if (blinkBtn) {
        blinkBtn.addEventListener('click', () => {
            if (avatarEngine && isInitialized) {
                avatarEngine.blink();
                log('Piscou!');
            }
        });
    }

    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (avatarEngine && isInitialized) {
                avatarEngine.setExpression('neutral', 0.5);
                document.querySelectorAll('.emotion-btn[data-emotion]').forEach(b =>
                    b.classList.remove('active'));
                log('Reset para neutro');
            }
        });
    }

    // Debug button
    const debugBtn = document.getElementById('debug-btn');
    if (debugBtn) {
        debugBtn.addEventListener('click', () => {
            if (avatarEngine && isInitialized) {
                const state = avatarEngine.getState();
                console.log('Avatar State:', state);
                log(`Frames: ${state.frameCount}, Speaking: ${state.isSpeaking}`);
            }
        });
    }
}

// =====================================================
// STARTUP
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    log('DOM carregado');
    setupEventHandlers();

    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        initializeAvatarEngine();
    }, 100);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (avatarEngine) {
        if (document.hidden) {
            avatarEngine.stopAnimationLoop();
            log('Animação pausada (aba inativa)');
        } else if (isInitialized) {
            avatarEngine.startAnimationLoop();
            log('Animação retomada');
        }
    }
});

console.log('[client-pro.js] Module loaded');
