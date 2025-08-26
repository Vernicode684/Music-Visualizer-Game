import Player from './player.js'
import Ground from './ground.js'
import CactiController from './CactiController.js';
import Score from './Score.js';

let audioContext = null; // sound control room where you can analyze sound files
let source = null; // the thing that actually plays the sound
let analyser = null;
let currentSongName = null;
let songChanged = false;
let showText = false;
let textMessage = "";


let currentVideoIndex = 0; // start with first video
let pausedAt = 0;     // How far into the audio we paused (seconds)
let startTime = 0;    // AudioContext time when playback started
let isPlaying = false; 
let audioBuffer = null; // music track loaded into memory
let donePlaying = true;
let duration = 0 ;
let paused = false;
let lastSongName = null;
let progress = document.getElementById("progress");
let levelCompleted = false;
let video = document.getElementById("bgVideo");
// checkpoint flags
let checkpoint21 = false;
let checkpoint50 = false;
let checkpoint75 = false;
let checkpoint100 = false;


const fileInput = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const canvas = document.getElementById("canvas"); // canvas to draw the bars in
const canvasContext = canvas.getContext("2d"); // this is to draw bars on the canvas
const timeDisplay = document.getElementById("time-display");
const game = document.getElementById("game"); // game canvas
const ctx = game.getContext("2d");
const gameOverSound1 = new Audio("SoundEffects/game-over-voice-355993.mp3");
const gameOverSound2 = new Audio("SoundEffects/game-over-arcade-6435.mp3");
const welcome = new Audio("SoundEffects/Roi (Instrumental).mp3");
const levelcompletedsound = new Audio("SoundEffects/Super Mario Bros. Level Complete Soundtrack - Sound Effect for editing.mp3");

const GAME_SPEED_START = 0.5; // 1.0
const GAME_SPEED_INCREMENT = 0.00001;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 200;
const PLAYER_WIDTH = 80 / 1.5; // 58
const PLAYER_HEIGHT = 80 / 1.5; // 62
const MAX_JUMP_HEIGHT = GAME_HEIGHT;
const MIN_JUMP_HEIGHT = 150;
const GROUND_WIDTH = 2400;
const GROUND_HEIGHT = 24;
const GROUND_AND_CACTUS_SPEED = 0.5;

const videos = [
  "Videos/SPACE.mp4",
  "Videos/117052-710546287_small.mp4",
  "Videos/263295_small (1).mp4",
  "Videos/266847_small.mp4"
];

const milestones = [0, 0.25,0.50,0.75];

function unlockAndPlayWelcomeAudio() {
    welcome.currentTime = 19;
    welcome.play().catch(() => console.log('Audio playback was prevented by the browser.'));

    // Remove event listeners after first interaction
    window.removeEventListener('keydown', unlockAndPlayWelcomeAudio);
}

const CACTI_CONFIG = [
    {width:48/1.5, height:100/1.5, image:'images/cactus_1.png'},
    {width:88/1.5, height:100/1.5, image:'images/cactus_2.png'},
    {width:88/1.5,   height:70/1.5, image:'images/cactus_3.png'},
] 
  
// Game Objects
let player = null;
let ground = null;
let score = null;
let scaleRatio = null;
let previousTime = null;
let gameSpeed = GAME_SPEED_START;
let cactiController = null;
let hasAddedEventListenersForRestart=false;

let gameOver = false;
let waitingToStart = true;


canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

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
// SPACE key handling


fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    console.log("Now playing:", event);
    console.log("Now playing:", file.name);
    if (!file) {
        
 
      return;
    }
    // Stop previous source if any
    stopCurrentPlayback();

     // Detect if this is a new song
    if (currentSongName !== file.name) {
        currentSongName = file.name;
        songChanged = true;
    }

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

        window.addEventListener("keydown", (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                  if (songChanged || levelCompleted || waitingToStart || gameOver) {
                    levelCompleted =false;
                    songChanged = false;           // clear flag so reset knows it’s not a song change anymore
                    isPlaying= false;
                    console.log("Current video index:", currentVideoIndex);
                    reset();
                    return;
            }

            if (paused) {
                console.log("Play button is triggered!")
                handlePlayClick();             // resume from pause
                return;
            }
            }
        });
        window.addEventListener("touchStart", reset, { once: true });
       
        });

    reader.readAsArrayBuffer(file);
});

function showLevelCompleted(){
   
    const fontSize = 30 * scaleRatio;
    ctx.font = ` ${fontSize}px Courier New`;
    ctx.fillStyle = "white"; 
    const x = game.width/3 ;
    const y = game.height/2;   
  
    ctx.lineWidth = 5 * scaleRatio;            // Thickness of the outline
    ctx.strokeStyle = "black";                 // Outline color
   ctx.strokeText("Level Completed!", x, y); // Draw outline

    // Fill settings
    ctx.fillStyle = "white";                   // Fill color
     ctx.fillText("Level Completed!", x, y);   // Fill text 
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
            levelCompleted = true;
            setupGameReset();
            
        
        }

        
    }
    requestAnimationFrame(updateTime);
}
updateTime();


function startPlayback() {
    // play first video immediately
    video.src = videos[currentVideoIndex];
    video.play().catch(err => console.warn("Autoplay blocked:", err));

    requestAnimationFrame(changeVideo);
}
startPlayback();

let showText1=false;
function changeVideo() {
    if (!isPlaying) return;
        const completed = audioContext.currentTime - startTime;

        if (completed >= duration*0.21 && !checkpoint21) {
            checkpoint21=true;
            nextVideo();
            console.log("current video index:", currentVideoIndex);

            // Show the text for 2 seconds
          textMessage="LET'S GO!"
           showText = true;
            setTimeout(() => {
                showText = false;
            }, 1000); // 2000 ms = 2 seconds*/

            
        }

        if (completed >= duration*0.50 && !checkpoint50) {
            checkpoint50=true;
            nextVideo();
            console.log("current video index:", currentVideoIndex);
            // You can trigger another text here if needed
            textMessage = "KEEP IT UP!";
            showText = true;
            setTimeout(() => {
                showText = false;
            }, 1000); // 2000 ms = 2 seconds*/
            //showKeepitUp();
        }

        if (completed >= duration*0.75 && !checkpoint75) {
            nextVideo();
            checkpoint75= true;
            textMessage = "ALMOST THERE!";

            showText = true;
            setTimeout(() => {
                showText = false;
            }, 1000); // 2000 ms = 2 seconds*/

            //showAmostThere();
            console.log("current video index:", currentVideoIndex);
        }


         if (completed >= duration &&  !checkpoint100 ) {
            nextVideo();
            checkpoint100 = true;

             // reset checkpoints for next loop
             
        
            console.log("current video index:", currentVideoIndex);
        }

        // Draw text if the flag is true
       if (showText1) {
            const fontSize = 50 * scaleRatio;
            ctx.font = `${fontSize}px Courier New`;
            ctx.lineWidth = 5 * scaleRatio;
            ctx.strokeStyle = "black";
            ctx.fillStyle = "white";
            const x = game.width / 3;
            const y = game.height / 2;
            ctx.strokeText("LET'S GO!", x, y);
            ctx.fillText("LET'S GO!", x, y);
        }

    

    //requestAnimationFrame(changeVideo);
}

function nextVideo() {
    currentVideoIndex = (currentVideoIndex + 1) % videos.length;
    video.src = videos[currentVideoIndex];
    video.play().catch(err => console.warn("Play blocked:", err));
    console.log("Switched to video index:", currentVideoIndex);
}
//changeVideo();
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
    const cactiImages = CACTI_CONFIG.map(cactus => {
        const image = new Image();
        image.src = cactus.image;
        return{
            image:image,
            width: cactus.width * scaleRatio,
            height: cactus.height * scaleRatio
        }
    })
    cactiController= new CactiController (ctx, cactiImages, scaleRatio, GROUND_AND_CACTUS_SPEED);

    score = new Score (ctx, scaleRatio)

    

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

function showGameOver(){
    const fontSize = 70 * scaleRatio;
    ctx.font = ` ${fontSize}px Courier New`;
    ctx.fillStyle = "white"; 
    const x = game.width / 4;
    const y = game.height/2;   
  
    ctx.lineWidth = 5 * scaleRatio;            // Thickness of the outline
    ctx.strokeStyle = "black";                 // Outline color
    ctx.strokeText("GAME OVER", x, y); // Draw outline

    // Fill settings
    ctx.fillStyle = "white";                   // Fill color
    ctx.fillText("GAME OVER", x, y);   // Fill text
}

function setupGameReset(){
    if(!hasAddedEventListenersForRestart){
        hasAddedEventListenersForRestart=true;

        setTimeout(()=>{
            window.addEventListener("keyup", reset,{once:true});
            window.addEventListener("touchstart", reset,{once:true});
        }, 1000);
        checkpoint21 = false;
        checkpoint50 = false;
        checkpoint75 = false;
        checkpoint100 = false;

        if (levelCompleted || gameOver){
           startTime = audioContext.currentTime;
        }

    }
}

function reset(){
    if (!welcome.paused) {
        welcome.pause();
        welcome.currentTime = 0;
        window.removeEventListener('keydown', unlockAndPlayWelcomeAudio);

    }

    hasAddedEventListenersForRestart= false;
    gameOver= false;
      levelCompleted = false;
    waitingToStart = false;
    ground.reset();
    paused = false;
   

     // If player doesn't exist or we're starting fresh, recreate all sprites
    if (!player || songChanged) {
        createSprites();
        songChanged = false;
    } else {
        ground.reset();
        cactiController.reset();
        score.reset();
    }
    gameSpeed = GAME_SPEED_START;
    
        // Update Game Objects
        pausedAt = 0; // to play from beginning
        stopCurrentPlayback();
           
        if (audioBuffer && audioContext) {
            createSource();
            startTime = audioContext.currentTime;
            source.start(0);
            isPlaying = true;
            donePlaying = false;
        }

           

            console.log("Audio started from file upload");

            // Start visualization loop if not already started
            if (!window.visualizeStarted) {
                window.visualizeStarted = true;
                visualize();
            }
    
}

async function handlePlayClick() {
      if (!audioBuffer) {
        console.warn("No audio loaded.");
        return;
    }

      if (songChanged) {
        songChanged = false; // reset the flag
        reset(); // full restart from beginning
        return;
    }

    if (waitingToStart) {
        reset(); // reset also restarts audio from the beginning
        return;
    }

    if (isPlaying || gameOver || levelCompleted) return;

    if (donePlaying) pausedAt = 0;

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    
    paused = false;  // <== Add this line to resume game update
    createSource();
    startTime = audioContext.currentTime - pausedAt;
    source.start(0, pausedAt);
    isPlaying = true;
    donePlaying = false;


    playBtn.removeEventListener("click", handlePlayClick);
    playBtn.addEventListener("click", handlePlayClick);


    console.log("Playback started at offset:", pausedAt);
}
playBtn.addEventListener("click", handlePlayClick);


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
    paused = true;
    console.log("Playback paused at:", pausedAt);
});

function showStartGameText() {

    window.addEventListener('keydown', unlockAndPlayWelcomeAudio, { once: true });
    const fontSize = 20 * scaleRatio;
    ctx.font = `bold ${fontSize}px Courier New`;
    const x = game.width /5;
    const y = game.height / 2;

    // Outline settings
    ctx.lineWidth = 2 * scaleRatio;            // Thickness of the outline
    ctx.strokeStyle = "black";                 // Outline color
    ctx.strokeText("Upload Music and Press Space or Tap to Start", x, y); // Draw outline

    // Fill settings
    ctx.fillStyle = "white";                   // Fill color
    ctx.fillText("Upload Music and Press Space or Tap to Start", x, y);   // Fill text
    
}

function updateGameSpeed(frameTimeDelta){
    gameSpeed += frameTimeDelta * GAME_SPEED_INCREMENT;
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

    clearScreen();

    if (!paused) {
        if (!gameOver && !waitingToStart && !levelCompleted) {
            ground.update(gameSpeed, frameTimeDelta);
            cactiController.update(gameSpeed, frameTimeDelta);
            player.update(gameSpeed, frameTimeDelta);
            score.update(frameTimeDelta);
            updateGameSpeed(frameTimeDelta);
           


            if (!gameOver && cactiController.collideWith(player)) {
                gameOver = true;
                if (source && isPlaying) {
                    source.stop();
                    isPlaying = false;
                }
                gameOverSound2.volume = 1;  // 50% volume
                gameOverSound2.currentTime = 0;
                gameOverSound2.play();

                setupGameReset();
                score.setHighScore();


             
            }

             if (levelCompleted){
                ground.reset();
                cactiController.reset();
                score.reset();
                player.reset();
                setupGameReset();   
                
            }
        }

          
    }

    // Always draw, even if paused
    ground.draw();
    cactiController.draw();
    player.draw();
    score.draw();

    if (gameOver) {
        showGameOver();
    }
    if (waitingToStart) {
        showStartGameText();
    }

    if (levelCompleted){
        showLevelCompleted();
        score.setHighScore();
        
        
    }
    changeVideo();

    if (showText && textMessage && !levelCompleted && !gameOver) {
        const fontSize = 60 * scaleRatio;
        ctx.font = `${fontSize}px Courier New`;
        ctx.lineWidth = 5 * scaleRatio;
        ctx.strokeStyle = "black";
        ctx.fillStyle = "white";
        const x = game.width / 4;
        const y = game.height / 2;
        ctx.strokeText(textMessage, x, y);
        ctx.fillText(textMessage, x, y);
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);


 /*if (file){
  
    window.addEventListener("keyup", reset, {once:true });
    window.addEventListener("touchStart", reset, {once:true });
 }*/


