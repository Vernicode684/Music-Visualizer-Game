let audioContext = null;
let source = null;
let analyser = null;

let pausedAt = 0;     // How far into the audio we paused (seconds)
let startTime = 0;    // AudioContext time when playback started
let isPlaying = false; 
let audioBuffer = null;
let donePlaying = true;
let duration = 0 ;

let playlist = [];
let currentTrackIndex = 0;

const fileInput = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const canvas = document.getElementById("canvas");
const canvasContext = canvas.getContext("2d");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;


   fileInput.addEventListener("change", async (event) => {     

    const files = Array.from(event.target.files);
   if (!files.length) return;

    // Stop previous source if any
    stopCurrentPlayback()
    const shouldStartPlayback = !isPlaying && playlist.length === 0;

    if (!audioContext || audioContext.state === "closed") 
        {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create analyser only once
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
        }
            //wait for audioBuffer to be created befor emoving on
        for (const file of files) 
        {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = await audioContext.decodeAudioData(arrayBuffer);
            playlist.push({
                name: file.name,
                buffer,
                duration: buffer.duration
            });
        }

            
        console.log("Playlist created with", playlist.length, "tracks.");

        if (shouldStartPlayback) {
        currentTrackIndex = 0;
        playTrack(currentTrackIndex);
}

});

function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;

    audioBuffer = playlist[index].buffer;
    duration = playlist[index].duration;

    pausedAt = 0;
    startTime = audioContext.currentTime;

    createSource();
    source.start(0);
    isPlaying = true;
    donePlaying = false;

    console.log("Now playing:", playlist[index].name);

    if (!window.visualizeStarted) {
        window.visualizeStarted = true;
        visualize();
    }
}





function stopCurrentPlayback() {
    if (source) {
        try { source.stop(); } catch (e) {}
        source.disconnect();
        source = null;
    }
    isPlaying = false;
}


function createSource(){

    source = audioContext.createBufferSource(); //source is created here
    source.buffer = audioBuffer;

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    source.onended = () => {
        if (!isPlaying) return; // Only mark done if ended naturally
        isPlaying = false;
        pausedAt = 0;
        donePlaying = true;

       currentTrackIndex++;
        if (currentTrackIndex < playlist.length) {
            playTrack(currentTrackIndex);
        } else {
            console.log("Playlist finished");
        }
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

    if (donePlaying) {
        pausedAt = 0;
    }
    stopCurrentPlayback(); 
    createSource();
    startTime = audioContext.currentTime - pausedAt;
    source.start(0, pausedAt);
    isPlaying = true;
    donePlaying = false;

    console.log("Playback started at offset:", pausedAt);
});


pauseBtn.addEventListener("click", () => {


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


document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentTrackIndex < playlist.length - 1) {
        stopCurrentPlayback();
        playTrack(++currentTrackIndex);
    }
});

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentTrackIndex > 0) {
        stopCurrentPlayback();
        playTrack(--currentTrackIndex);
    }
});




function visualize() {
    const frequencyBufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(frequencyBufferLength);

    const barSpacing = 2; // space between bars in px
    const rawBarWidth = canvas.width / (frequencyBufferLength / 2);
    const barWidth = rawBarWidth - barSpacing;

    function draw() {
        requestAnimationFrame(draw);

        canvasContext.clearRect(0, 0, canvas.width, canvas.height);

        canvasContext.fillStyle = "rgba(0, 0, 0, 0.6)"; // adjust alpha for desired tint
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
                canvas.height - barHeight,
                barWidth * ((i+5)/frequencyBufferLength-(frequencyBufferLength-50)/frequencyBufferLength),
                barHeight
            );
        }
    }

    draw();
}
