const video = document.getElementById('camera-feed');
const canvas = document.getElementById('canvas-output');
const ctx = canvas.getContext('2d');
const shutterBtn = document.getElementById('shutter-btn');
const switchCamBtn = document.getElementById('switch-camera-btn');
const gridToggle = document.getElementById('grid-toggle');
const grid = document.getElementById('grid');
const focusRing = document.getElementById('focus-ring');

const resToggleBtn = document.getElementById('res-toggle-btn');
const fpsToggleBtn = document.getElementById('fps-toggle-btn');

let currentStream = null;
let facingMode = 'environment';
let currentZoom = 1;
let currentMode = 'photo';

// Pengaturan Grafik & FPS
const resOptions = [
    { label: '720p', width: 1280, height: 720 },
    { label: '1080p', width: 1920, height: 1080 },
    { label: '4K', width: 3840, height: 2160 }
];
let resIndex = 2; // Default 4K

const fpsOptions = [30, 60, 120];
let fpsIndex = 1; // Default 60 FPS

// Hitung FPS Real-Time
let lastFrameTime = performance.now();
let frameCount = 0;
let actualFPS = 0;

// Inisialisasi Akses Kamera Sesuai Grafik & FPS Terpilih
async function startCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    const selectedRes = resOptions[resIndex];
    const targetFPS = fpsOptions[fpsIndex];

    try {
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: selectedRes.width },
                height: { ideal: selectedRes.height },
                frameRate: { ideal: targetFPS, max: targetFPS }
            },
            audio: (currentMode === 'video' || currentMode === 'cinematic')
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
        video.play();

        requestAnimationFrame(renderLoop);
    } catch (err) {
        alert("Kamera/FPS tidak didukung pada resolusi ini: " + err.message);
    }
}

// Event Listener Tombol Pilihan Grafik Resolusi (720p -> 1080p -> 4K)
resToggleBtn.addEventListener('click', () => {
    resIndex = (resIndex + 1) % resOptions.length;
    resToggleBtn.textContent = resOptions[resIndex].label;
    startCamera();
});

// Event Listener Tombol Pilihan FPS Tinggi (30 FPS -> 60 FPS -> 120 FPS)
fpsToggleBtn.addEventListener('click', () => {
    fpsIndex = (fpsIndex + 1) % fpsOptions.length;
    fpsToggleBtn.textContent = `${fpsOptions[fpsIndex]} FPS`;
    startCamera();
});

// Loop Render Kamera ke Canvas
function renderLoop(currentTime) {
    frameCount++;
    if (currentTime - lastFrameTime >= 1000) {
        actualFPS = Math.round((frameCount * 1000) / (currentTime - lastFrameTime));
        fpsToggleBtn.textContent = `${fpsOptions[fpsIndex]} FPS (${actualFPS})`;
        frameCount = 0;
        lastFrameTime = currentTime;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.filter = 'none';

        // Mode PORTRAIT (Bokeh Blur)
        if (currentMode === 'portrait') {
            ctx.filter = 'blur(10px) brightness(0.95)';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            ctx.filter = 'none';
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const rx = canvas.width * 0.35;
            const ry = canvas.height * 0.45;

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        } 
        // Mode NIGHT
        else if (currentMode === 'night') {
            ctx.filter = 'brightness(1.45) contrast(1.15) saturate(1.2)';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } 
        // Mode CINEMATIC, VIDEO, PHOTO (Tampilan Normal Tanpa Distorsi Warna)
        else {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
    }
    requestAnimationFrame(renderLoop);
}

// Switch Camera
switchCamBtn.addEventListener('click', () => {
    facingMode = (facingMode === 'user') ? 'environment' : 'user';
    startCamera();
});

// Toggle Grid
gridToggle.addEventListener('click', () => {
    grid.classList.toggle('show');
    gridToggle.classList.toggle('active');
});

// Pengatur Zoom
document.querySelectorAll('.zoom-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentZoom = parseFloat(e.target.getAttribute('data-zoom'));
        canvas.style.transform = `scale(${currentZoom})`;
    });
});

// Select Mode
document.querySelectorAll('.mode-item').forEach(item => {
    item.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-item').forEach(m => m.classList.remove('active'));
        e.target.classList.add('active');
        currentMode = e.target.getAttribute('data-mode');
        canvas.className = `mode-${currentMode}`;

        // Aktifkan audio jika memilih mode VIDEO / CINEMATIC
        if (currentMode === 'video' || currentMode === 'cinematic') {
            startCamera();
        }
    });
});

// Focus Ring
document.getElementById('viewport').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    focusRing.style.left = `${x}px`;
    focusRing.style.top = `${y}px`;
    focusRing.classList.add('active');
    setTimeout(() => focusRing.classList.remove('active'), 1000);
});

// Shutter Click
shutterBtn.addEventListener('click', () => {
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        alert("Kamera belum siap, tunggu sebentar...");
        return;
    }

    const app = document.getElementById('app-container');
    app.style.opacity = '0.2';
    setTimeout(() => app.style.opacity = '1', 120);

    try {
        const imageURL = canvas.toDataURL('image/jpeg', 0.95);
        const downloadLink = document.createElement('a');
        downloadLink.href = imageURL;
        downloadLink.download = `iPhone17ProMax_${currentMode.toUpperCase()}_${resOptions[resIndex].label}_${Date.now()}.jpg`;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        const galleryBtn = document.getElementById('gallery-btn');
        galleryBtn.innerHTML = `<img src="${imageURL}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
    } catch (err) {
        alert("Gagal mengambil foto: " + err.message);
    }
});

startCamera();