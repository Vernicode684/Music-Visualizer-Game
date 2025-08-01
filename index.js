import Player from './player.js'
import Ground from './ground.js'

let audioContext = null; // sound control room where you can analyze sound files
let source = null; // the thing that actually plays the sound
let analyser = null;

let pausedAt = 0;     // How far into the audio we paused (seconds)
let startTime = 0;    // AudioContext time when playback started
let isPlaying = false; 
let audioBuffer = null; // music track loaded into memory
let donePlaying = true;
let duration = 0 ;
let progress = document.getElementById("progress");

const fileInput = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const canvas = document.getElementById("canvas"); // canvas to draw the bars in
const canvasContext = canvas.getContext("2d"); // this is to draw bars on the canvas
const timeDisplay = document.getElementById("time-display");
const game = document.getElementById("game"); // game canvas
const ctx = game.getContext("2d");

const GAME_SPEED_START = 0.5; // 1.0
const GAME_SPEED_INCREMENT = 0.00001;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 200;
const PLAYER_WIDTH = 88 / 1.5; // 58
const PLAYER_HEIGHT = 94 / 1.5; // 62
const MAX_JUMP_HEIGHT = GAME_HEIGHT;
const MIN_JUMP_HEIGHT = 150;
const GROUND_WIDTH = 2400;
const GROUND_HEIGHT = 24;
const GROUND_AND_CACTUS_SPEED = 0.5;

// Game Objects
let player = null;
let ground = null;
let scaleRatio = null;
let previousTime = null;
let gameSpeed = GAME_SPEED_START;

function createSprites() {
    const playerWidthInGame = PLAYER_WIDTH * scaleRatio;
    const playerHeightInGame = PLAYER_HEIGHT * scaleRatio;
    const minJumpHeightInGame = MIN_JUMP_HEIGHT * scaleRatio;
    const maxJumpHeightInGame = MAX_JUMP_HEIGHT * scaleRatio;

    const groundWidthInGame = GROUND_WIDTH * scaleRatio;
    const groundHeightInGame = GROUND_HEIGHT * scaleRatio;

    player = new Player(
        ctx,
        playerWidthInGame,
        playerHeightInGame,
        minJumpHeightInGame,
        maxJumpHeightInGame,
        scaleRatio
    );

    ground = new Ground(
        ctx,
        groundWidthInGame,
        groundHeightInGame,
        GROUND_AND_CACTUS_SPEED,
        scaleRatio
    );
}

function setScreen() {
    scaleRatio = getScaleRatio();
    game.width = GAME_WIDTH * scaleRatio;
    game.height = GAME_HEIGHT * scaleRatio;
    createSprites();
}

setScreen();

// Use setTimeout on Safari mobile rotation otherwise works fine on desktop
window.addEventListener('resize', () => setTimeout(setScreen, 500));

if (screen.orientation) {
    screen.orientation.addEventListener('change', setScreen);
}

function getScaleRatio() {
    const screenHeight = Math.min(
        window.innerHeight,
        document.documentElement.clientHeight
    );

    const screenWidth = Math.min(
        window.innerWidth,
        document.documentElement.clientWidth
    );

    if (screenWidth / screenHeight < GAME_WIDTH / GAME_HEIGHT) {
        return screenWidth / GAME_WIDTH;
    } else {
        return screenHeight / GAME_HEIGHT;
    }
}

function clearScreen() {
    ctx.clearRect(0, 0, game.width, game.height);
}

function gameLoop(currentTime) {
    if (previousTime == null) {
        previousTime = currentTime;
        requestAnimationFrame(gameLoop);
        return;
    }
    const frameTimeDelta = currentTime - previousTime;
    previousTime = currentTime;
    console.log(frameTimeDelta);
    clearScreen();

    // Update Game Objects
    ground.update(gameSpeed, frameTimeDelta);
    player.update(gameSpeed, frameTimeDelta);

    // Draw Game Objects
    ground.draw();
    player.draw();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    console.log("Now playing:", event);
    console.log("Now playing:", file.name);
    if (!file) return;

    // Stop previous source if any
    stopCurrentPlayback();

    const reader = new FileReader();

    reader.addEventListener("load", async (event) => {
        const arrayBuffer = event.target.result;
        if (!audioContext || audioContext.state === "closed") {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create analyser only once
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512; // higher number means more detailed visualization
        }

        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        duration = audioBuffer.duration;

        pausedAt = 0; // to play from beginning

        startTime = audioContext.currentTime;
        createSource();
        source.start(); // start playing song
        isPlaying = true;
        donePlaying = false;

        console.log("Audio started from file upload");

        // Start visualization loop if not already started
        if (!window.visualizeStarted) {
            window.visualizeStarted = true;
            visualize();
        }
    });

    reader.readAsArrayBuffer(file);
});

function stopCurrentPlayback() {
    if (source) {
        try {
            source.stop();
        } catch (e) { }
        source.disconnect();
        source = null;
    }
    isPlaying = false;
}

function createSource() {
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    source.onended = () => {
        if (pausedAt < duration) return; // stopped early (paused)

        isPlaying = false;
        pausedAt = 0;
        donePlaying = true;

        console.log("Playback ended");
    };
}

playBtn.addEventListener("click", () => {
    if (!audioBuffer) {
        console.warn("No audio loaded.");
        return;
    }

    if (isPlaying) {
        console.log("Already playing");
        return;
    }

    if (donePlaying) {
        pausedAt = 0;
    }

    createSource();
    startTime = audioContext.currentTime - pausedAt;
    source.start(0, pausedAt);
    isPlaying = true;
    donePlaying = false;

    console.log("Playback started at offset:", pausedAt);
});

pauseBtn.addEventListener("click", () => {
    if (pausedAt >= duration) {
        console.log("Done Playing");
        donePlaying = true;
        return;
    }

    if (!isPlaying) {
        console.log("Nothing is playing");
        return;
    }


    pausedAt = audioContext.currentTime - startTime;
    source.stop();
    isPlaying = false;
    source = null;
    console.log("Playback paused at:", pausedAt);
});

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
}

function updateTime() {
    if (isPlaying && audioBuffer) {
        const elapsed = audioContext.currentTime - startTime;
        progress.max = duration;
        progress.value = elapsed;

        timeDisplay.textContent = `${formatTime(elapsed)} / ${formatTime(duration)}`;
        if (elapsed >= duration) {
            timeDisplay.textContent = `${formatTime(duration)} / ${formatTime(duration)}`;
        }
    }
    requestAnimationFrame(updateTime);
}
updateTime();

function visualize() {
    const frequencyBufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(frequencyBufferLength);

    const barSpacing = 2;
    const rawBarWidth = canvas.width / (frequencyBufferLength / 2);
    const barWidth = rawBarWidth - barSpacing;

    function draw() {
        requestAnimationFrame(draw);

        canvasContext.clearRect(0, 0, canvas.width, canvas.height);

        // translucent black overlay (tint)
        canvasContext.fillStyle = "rgba(0, 0, 0, 0)";
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);

        analyser.getByteFrequencyData(frequencyData);

        for (let i = 0; i < frequencyBufferLength; i += 2) {
            const value = frequencyData[i];
            const barHeight = value;

            const hue = (i / frequencyBufferLength) * 360;
            const saturation = 100;
            const lightness = 50;
            const barColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            const glowStrength = (value / 255) * (i / frequencyBufferLength) * 100;

            canvasContext.shadowColor = barColor;
            canvasContext.shadowBlur = glowStrength;
            canvasContext.fillStyle = barColor;

            const x = (i / 2) * rawBarWidth;

            canvasContext.fillRect(
                x,
                canvas.height - (barHeight - 30),
                barWidth * ((i + 3) / frequencyBufferLength - (frequencyBufferLength - 50) / frequencyBufferLength),
                barHeight
            );
        }
    }

    draw();
}
