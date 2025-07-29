// Listen for the user to select an audio file
let source = null;
let currentSource = false;
let currentAudioContext = false;

document.getElementById("audio")
    .addEventListener("change", (event) => {
        // Get the first file the user selected (usually an audio file)
        const file = event.target.files[0];
        
        if (currentSource && source) {
        try {
            source.stop();
        } catch (e) {
            // source may already be stopped, ignore errors
        }
        currentSource = false;
    }
        // Create a FileReader to read the file data
        const reader = new FileReader();

        // When the file is fully read, this event triggers
        //The event listener function is placed above the readAsArrayBuffer() 
        // call because we need to tell the computer
        // to start listening for the "load" event before the file finishes loading.
        reader.addEventListener("load", (event) => {
            // Get the raw binary data from the file as an ArrayBuffer
            const arrayBuffer = event.target.result;

            // Create an AudioContext — the browser’s way to process audio
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // Decode the audio file bytes into raw audio samples (PCM data)
            audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
                // Now we have digital audio data ready for playback and visualization
        

            // Create an AnalyserNode to get frequency data from the audio
            const analyser = audioContext.createAnalyser();

        // Set FFT size (number of samples used for frequency analysis)
            analyser.fftSize = 512;

            // frequencyBinCount is half the FFT size: number of frequency bands analysed

            // Create an array to hold the frequency data (0-255 for each frequency band)
            //currently there is nothging in this arrray, all 0 numbers
            const frequencyBufferLength = analyser.frequencyBinCount;

            const frequencyData = new Uint8Array(frequencyBufferLength);
            const source = audioContext.createBufferSource(); //creating an audio soiurce that can play a sound form memory
            source.buffer = audioBuffer;  //"assigning" that audio source to the actual sound file (audiobuffer)

            // Connect the audio source to the analyser node
            source.connect(analyser); //analyser is the frequency scanner (breaks sound into bass/mids/highs)

            // Connect the analyser to the speakers (audio output)
            analyser.connect(audioContext.destination);  //audioContext.destination is the headphones or speakers
            //sending sound to speakers

            // Start playing the audio

            source.start();
            currentSource = true;

            const playBtn = document.getElementById("playBtn");
            const pauseBtn = document.getElementById("pauseBtn");
            let startTime = audioContext.currentTime;
            let pausedAt = 0;

            document.getElementById("audio").addEventListener("change", (event) => 
            {
                
                 if (currentSource == true) 
                {
                    source.stop();
                } 

            })
            
           
            document.getElementById("pauseBtn").addEventListener("click", (event) => {
                
                pausedAt = audioContext.currentTime;
                console.log(pausedAt);

                source.stop();
                currentSource = false;

            })
            
            document.getElementById("playBtn").addEventListener("click", (event) => {
                
                source.start(0,pausedAt);
                currentSource = true;
              
            })

                visualize(audioBuffer,frequencyBufferLength,frequencyData,analyser);
                console.log(audioBuffer); // For debugging: shows audio data details

            });
            
        });

        // Start reading the file as binary data
        reader.readAsArrayBuffer(file);

       
    });

function visualize(audioBuffer,frequencyBufferLength,frequencyData,analyser) {
    // Get the canvas element and its drawing context
    const canvas = document.getElementById("canvas");
    const canvasContext = canvas.getContext("2d");

    // Make canvas size responsive to how it appears on the spage
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    console.log(canvas.width);
    console.log(canvas.height);
   

    // Calculate width of each frequency bar on the canvas
    const barWidth = canvas.width / frequencyBufferLength;
    //frequencyBufferLength is 256
    // Function to draw frequency bars continuously (animation loop)
    function draw() {
        // Schedule next draw call (around 60 times per second)
        requestAnimationFrame(draw);
        //refreshes the screen every 60s

        // Fill the canvas with a semi-transparent color for fade/trail effect
        canvasContext.fillStyle = "rgba(0, 0, 0, 0.2)";
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);

        // Get current frequency data from the analyser node
        analyser.getByteFrequencyData(frequencyData); 
        // gets the volume of each frequency range and putting that into the array
        //between 0 (quiet) and 255 (loud)
        //bars are represented by how loud each frequency band is in this array

        // Loop through frequency bands and draw bars for each
        for (let i = 0; i < frequencyBufferLength; i += 2) {
        const value = frequencyData[i];        // Amplitude (0–255)
        const barHeight = value; //the barheight is represents the amplitudes of each freqwuency nabnd in the array

        // Map index to hue range for colorful variety (0–360 degrees for HSL)
        const hue = (i / frequencyBufferLength) * 360; //making it a

        // Brightness and saturation boost
        const saturation = 100;
        const lightness = 50;

        // Use HSL for vibrant colors (pink, orange, green, yellow etc.)
        const barColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

        // Glow based on both amplitude and frequency index — higher freq = more glow
        const glowStrength = (value / 255) * (i / frequencyBufferLength) * 100; // dynamic blur

        canvasContext.shadowColor = barColor;
        canvasContext.shadowBlur = glowStrength;
        
        // White bar with colorful glow
        canvasContext.fillStyle = barColor;

        canvasContext.fillRect(
            i * barWidth,
            canvas.height - barHeight,
            barWidth * ((i+5)/frequencyBufferLength-(frequencyBufferLength-50)/frequencyBufferLength),
            barHeight
        );
        }

    }

    // Start the drawing loop
    draw();
}


