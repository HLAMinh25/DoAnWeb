// ----- DOM -----
const audioFile = document.getElementById("audioFile");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");
const playPauseBtn = document.getElementById("playPauseBtn");
const logo = document.getElementById("logo");
const effectSelect = document.getElementById("effectSelect");
const playlist = document.getElementById("playlist");

// ----- Canvas responsive -----
canvas.width = window.innerWidth * 0.8;
canvas.height = 300;

// ----- Audio & Analyzer -----
let audioCtx, analyser, source;
let dataArray, bufferLength;
let currentAudio = null;
let isPlaying = true;

// ----- Particle -----
let particles = [];

// ----- Playlist -----
let audioFiles = JSON.parse(localStorage.getItem("audioPlaylist") || "[]");
audioFiles.forEach((fileData) => addPlaylistItem(fileData));

// ----- Effect -----
let currentEffect = "bars";

// ----- Functions -----
function addPlaylistItem(fileData) {
  const li = document.createElement("li");
  li.textContent = fileData.name;
  li.style.cursor = "pointer";
  li.addEventListener("click", () => playAudio(fileData));
  playlist.appendChild(li);
}

function savePlaylist(fileData) {
  audioFiles.push(fileData);
  localStorage.setItem("audioPlaylist", JSON.stringify(audioFiles));
  addPlaylistItem(fileData);
}

function playAudio(fileData) {
  if (currentAudio) currentAudio.pause();

  const audio = new Audio();
  audio.src = fileData.url || URL.createObjectURL(fileData);
  audio.crossOrigin = "anonymous";
  audio.loop = true;
  audio.play();

  currentAudio = audio;
  isPlaying = true;
  playPauseBtn.textContent = "⏸️ Pause";

  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  source = audioCtx.createMediaElementSource(audio);
  analyser = audioCtx.createAnalyser();
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  analyser.fftSize = 256;
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
}

// ----- Event Listeners -----
audioFile.addEventListener("change", () => {
  const files = Array.from(audioFile.files);
  if (files.length === 0) return;

  files.forEach((file) => {
    const fileData = { name: file.name, url: URL.createObjectURL(file) };
    savePlaylist(fileData);
    playAudio(fileData); // phát ngay file đầu tiên
  });
});

playPauseBtn.addEventListener("click", () => {
  if (!currentAudio) return;
  if (isPlaying) {
    currentAudio.pause();
    playPauseBtn.textContent = "▶️ Play";
  } else {
    currentAudio.play();
    playPauseBtn.textContent = "⏸️ Pause";
  }
  isPlaying = !isPlaying;
});

effectSelect.addEventListener("change", () => {
  currentEffect = effectSelect.value;
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth * 0.8;
  canvas.height = 300;
});

// ----- Draw Functions -----
function draw() {
  requestAnimationFrame(draw);
  if (!analyser) return;

  analyser.getByteFrequencyData(dataArray);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updatePageBackground();

  switch (currentEffect) {
    case "bars":
      drawBars();
      break;
    case "glow":
      drawGlow();
      break;
    case "wave":
      drawWaveDynamic();
      break;
    case "heart":
      drawHeartDynamic();
      break;
    default:
      drawBars();
  }

  drawParticle();
  updateParticles();

  if (logo) {
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    logo.style.transform = `scale(${1 + avg / 500})`;
  }
}

// Bars
function drawBars() {
  const barWidth = (canvas.width / bufferLength) * 2.5;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const h = dataArray[i];
    const r = h + 25 * (i / bufferLength);
    const g = 250 * (i / bufferLength);
    const b = 50;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, canvas.height - h, barWidth, h);
    x += barWidth + 1;
  }
}

// Glow
function drawGlow() {
  const barWidth = (canvas.width / bufferLength) * 2.5;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const h = dataArray[i];
    ctx.shadowBlur = 20;
    ctx.shadowColor = `rgb(${h + 50},200,255)`;
    ctx.fillStyle = `rgb(${h + 50},200,255)`;
    ctx.fillRect(x, canvas.height - h, barWidth, h);
    x += barWidth + 1;
  }
}

// Wave Dynamic
function drawWaveDynamic() {
  const centerY = canvas.height / 3;
  const waveAmplitude = 90;
  const waveLength = (7 * Math.PI) / bufferLength;
  const layers = 15;
  for (let l = 0; l < layers; l++) {
    ctx.beginPath();
    let offsetY = centerY + l * 10;
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${100 + l * 50}, ${200 - l * 50}, 255, ${
      0.4 + l * 0.2
    })`;
    for (let i = 0; i < bufferLength; i++) {
      const x = (i / bufferLength) * canvas.width;
      const y =
        offsetY +
        Math.sin(i * waveLength + performance.now() / 200) * waveAmplitude +
        dataArray[i] / 3 +
        (Math.random() * 7 - 2.5);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// Heart Dynamic
function drawHeartDynamic() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
  const maxLayers = 50;
  const layers = Math.ceil((avg / 255) * maxLayers);
  for (let l = 0; l < layers; l++) {
    ctx.beginPath();
    const scale = 2 + l * 0.3 + avg / 50;
    const hue = (l * 60 + performance.now() / 20) % 360;
    ctx.strokeStyle = `hsl(${hue},100%,50%)`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 360; i++) {
      const t = (i * Math.PI) / 180;
      const x = 16 * Math.pow(Math.sin(t), 3) * scale + centerX;
      const y =
        -(
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)
        ) *
          scale +
        centerY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// Particle
function drawParticle() {
  for (let i = 0; i < bufferLength; i++) {
    const h = dataArray[i];
    if (Math.random() < 0.4) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 2 + 1,
        color: `rgba(${h + 50},200,255,0.7)`,
      });
    }
  }
}

function updateParticles() {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    p.y -= p.speed;
    p.size *= 0.96;
    if (p.size < 0.5) {
      particles.splice(i, 1);
      i--;
    }
  }
}

// Background động
function updatePageBackground() {
  if (!analyser) return;
  const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
  const r = Math.min(255, avg * 2);
  const g = Math.min(255, 50 + avg);
  const b = Math.min(255, 150 + avg / 2);
  document.body.style.background = `linear-gradient(135deg,rgb(${r},${g},${b}), rgb(${b},${r},${g}))`;
}

// ----- Start Draw Loop -----
draw();
