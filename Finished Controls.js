let audioContext = null; //sound control room where you can analyze sound files
let source = null; //the thing that actually pkays the sound
let analyser = null;

let pausedAt = 0;     // How far into the audio we paused (seconds)
let startTime = 0;    // AudioContext time when playback started
let isPlaying = false; 
let audioBuffer = null; //music track loaded into memory
let donePlaying = true;
let duration = 0 ;
let progress = document.getElementById("progress");
let flashOpacity = 0;
let flashFadingIn = false;

const fileInput = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const canvas = document.getElementById("canvas"); //canvas to drawe the bars in
const canvasContext = canvas.getContext("2d"); // this is to draw bars on the canvas
const timeDisplay = document.getElementById("time-display");

canvas.width = canvas.clientWidth;
console.log(canvas.width);
canvas.height = canvas.clientHeight;

fileInput.addEventListener("change",  (event) => {
    const file = event.target.files[0];
    console.log("Now playing:", event);
    console.log("Now playing:", file.name);
    if (!file) return;

    // Stop previous source if any
    stopCurrentPlayback()
    //
    const reader = new FileReader(); //converting the soiund file into an array file

    reader.addEventListener("load", async (event) => {
        const arrayBuffer = event.target.result;
        if (!audioContext || audioContext.state === "closed") {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create analyser only once
            analyser = audioContext.createAnalyser(); // listens to the sound coming through and measures the volume in real time
            analyser.fftSize = 512; //the higher the number the more detailed the visualizattion/ divides the song into frequency bins wwhicj are later turned into bars
            // frequncy bins = fftSize / 2 = 256 (256 bars in the visualizer)
        }
            //wait for audioBuffer to be created before moving on
            //audiobuffer is the fully processed version of the song that is playable
            //using await here is necessary so that that JS pauses the function until the file is fully
            //into an audiobuffer
            //async is used becausing decoding is asynchoronoius it takes time for the file to be fully decoded
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer) 
            duration = audioBuffer.duration;

            pausedAt = 0; //to play from the beginning of the song
            

            //audioContext.currentTime keeps ticking 
            // like a stopwatch from the moment audioContext is created
            //audioContext.currentTime does NOT reset when you upload a new song.

            startTime = audioContext.currentTime;
            createSource();
            source.start(); //start playing song
            isPlaying = true; 
            donePlaying = false;
            
            
            console.log("Audio started from file upload");


            // Start visualization loop if not already started
            if (!window.visualizeStarted) 
                {
                window.visualizeStarted = true;
                visualize();
            }
        
    });

    reader.readAsArrayBuffer(file); //basically loads the file
});


function stopCurrentPlayback() {

    //if the previous source exists 
        //try to stop the previuous and for it cant its goin catch an error 
        //the error catch is just to really make sure if the source is actually viable 
    if (source) {
        try { source.stop(); } catch (e) {}
        source.disconnect(); //
        source = null;
    }
    isPlaying = false; //the old son stops playing
}


function createSource(){

    source = audioContext.createBufferSource(); //source is created here
    source.buffer = audioBuffer; //audio buffer is the fully processed version 
    //.buffer is a property  ---> here is the track you should play
    source.connect(analyser); //to start taking volume measurements
    analyser.connect(audioContext.destination); //comnecting the source tpo the output device (speaker)

  
   
    source.onended = () => {
        
        if (pausedAt<duration) return; //checking if something stopped it manually
        // This means we called stop() early (paused)


        isPlaying = false; 
        pausedAt = 0; //reset the pausedat varaible to 0 to allow the next song to start playing from the beginning
        donePlaying = true;

        console.log("Playback ended");
    };

}

//audioContext.currentTime keeps ticking 
// like a stopwatch from the moment audioContext is created
//audioContext.currentTime does NOT reset when you upload a new song.

playBtn.addEventListener("click", () => {
    if (!audioBuffer) {
        console.warn("No audio loaded.");
        return;
    }

    if (isPlaying) {
        console.log("Already playing");
        return;
    }

    // if the song has ended and I press play it is going to fire source.onded and then 
    //sets donePlaying= true

    //so in this if statemnnts its setting paused 0 when the song has ended naturally
    if (donePlaying) {
        pausedAt = 0; //resetting the pausedAt to 0 for the necxt song to play
    }

    createSource();
    startTime = audioContext.currentTime - pausedAt;
    source.start(0, pausedAt);
    isPlaying = true;
    donePlaying = false;

    console.log("Playback started at offset:", pausedAt);
});


pauseBtn.addEventListener("click", () => {

    if (pausedAt  >=  duration){
        console.log("Done Playing")
        donePlaying= true;
        return;
    }

    if (!isPlaying) {
        console.log("Nothing is playing");
        return;
    }

    pausedAt = audioContext.currentTime - startTime;
    source.stop(); //onended is fired after the pauser handeler code finsihes
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
updateTime(); // start the loop


function visualize() {
    const frequencyBufferLength = analyser.frequencyBinCount; 
    const frequencyData = new Uint8Array(frequencyBufferLength); //initializing the array to 0 with 256 slots

    const barSpacing = 2; // space between bars in px
    const rawBarWidth = canvas.width / (frequencyBufferLength / 2);
    //console.log(rawBarWidth);
    const barWidth = rawBarWidth - barSpacing; 
    //console.log(barWidth);

    function draw() {
        requestAnimationFrame(draw);

        canvasContext.clearRect(0, 0, canvas.width, canvas.height);

        //Add translucent black overlay (this is your tint!)
        canvasContext.fillStyle = "rgba(0, 0, 0, 0)"; // adjust alpha for desired tint
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);

        analyser.getByteFrequencyData(frequencyData);


        for (let i = 0; i < frequencyBufferLength; i += 2) {
            const value = frequencyData[i];
            console.log(value);
            const barHeight = value;


            //cause a rainbow
            const hue = (i / frequencyBufferLength) * 360;
            const saturation = 100;
            const lightness = 50;
            const barColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            const glowStrength = (value / 255) * (i / frequencyBufferLength) * 100;

            canvasContext.shadowColor = barColor;
            canvasContext.shadowBlur = glowStrength;
            canvasContext.fillStyle = barColor;

            const x = (i / 2) * rawBarWidth;

            //In HTML Canvas, the origin (0,0) is at the top-left corner.

            //plotting the bars across the x axis in the canvas
            canvasContext.fillRect(
                x,
                canvas.height - (barHeight-50), //to get the y coordinate of the bar
                barWidth * ((i+3)/frequencyBufferLength-(frequencyBufferLength-50)/frequencyBufferLength),
                barHeight 
            );
        }
    }

    draw();
}