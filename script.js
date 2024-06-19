let recorder;
let audioBlob;
const voiceIndicators = document.getElementById('voiceIndicators');
let receivedAudio;
let kanchiRecording;
const startRecording = async () => {
    kanchiRecording=true
    document.getElementById('startRecordButton').style.display='none'
    document.getElementById('recording').style.display='flex'
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new RecordRTC(stream, {
            type: 'audio',
            mimeType: 'audio/wav',
            recorderType: StereoAudioRecorder,
            desiredSampRate: 22500,  // Desired sample rate in Hz
            numberOfAudioChannels: 1  // Number of audio channels (1 for mono, 2 for stereo)
        });
        recorder.startRecording();
        setTimeout(()=>{startVAD(stream)},5000);
       // document.getElementById('startRecordButton').disabled = true;
        //document.getElementById('stopRecordButton').disabled = false;
        //document.getElementById('statusMessage').textContent = 'Recording...';
    } catch (error) {
        console.error('Error accessing microphone:', error);
        document.getElementById('statusMessage').textContent = 'Error accessing microphone.';
    }
};
function startVAD(stream) {
    const audioContext = new AudioContext();
    const mediaStreamSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256; // Adjust the FFT size as needed

    mediaStreamSource.connect(analyser);

    // Buffer size for silence detection (adjust as needed)
    const bufferSize = 2048;
    const buffer = new Float32Array(bufferSize);

    // Function to check for silence
    function checkForSilence() {
        analyser.getFloatTimeDomainData(buffer);

        // Calculate RMS amplitude
        let rms = 0;
        for (let i = 0; i < bufferSize; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / bufferSize);

        // Adjust this threshold based on your environment and microphone sensitivity
        const silenceThreshold = 0.01; // Example threshold, adjust as needed

        if (rms < silenceThreshold) {
            // Silence detected, stop recording
            if(kanchiRecording){
                stopRecording();
            }
        } else {
            // Continue checking
            if(kanchiRecording){
                setTimeout(checkForSilence, 3000);
            }
             // Check every 100ms (adjust as needed)
        }
    }
    checkForSilence()
}
const stopRecording =() => {
    kanchiRecording=false;
    document.getElementById('recording').style.display='none'
    document.getElementById('loader').style.display='flex';
    recorder.stopRecording(() => {
        audioBlob = recorder.getBlob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.controls = true;
        console.log('requesting to api')
        sendAudioToAPI();
       // document.getElementById('startRecordButton').disabled = false;
       // document.getElementById('stopRecordButton').disabled = true;
        //document.getElementById('sendButton').disabled = false;
        //document.getElementById('statusMessage').textContent = 'Recording stopped.';
    });
};

const sendAudioToAPI = () => {
    const formData = new FormData();
    formData.append('query', audioBlob, 'recording.wav');
    fetch('http://192.168.1.71:8000/api/ask/', {
    method: 'POST',
    body: formData // Assuming formData is correctly constructed
    }).then(response => {
        if (response.ok) {
            // Assuming the response is a WAV file, handle it appropriately
            return response.blob();
        } else {
            throw new Error('Network response was not ok.');
        }
    }).then(blob => {
        console.log('received blob file:',blob);
        const url = URL.createObjectURL(blob);
        receivedAudio= new Audio(url);
        receivedAudio.controls = true;
        receivedAudio.autoplay = true;
        document.getElementById('loader').style.display='none';
        document.getElementById('speaking').style.display='flex';
        document.getElementById('receivedAudio').appendChild(receivedAudio)
        receivedAudio.addEventListener('ended', () => {
            stopPlaying()
        });
    }).catch(error => {
        console.error('Error receiving or processing audio:', error);
        document.getElementById('statusMessage').textContent = 'Error receiving audio.';
    });
}


const stopPlaying=()=>{
    receivedAudio.pause();
    console.log('Audio playback ended.');
    document.getElementById('startRecordButton').style.display='flex';
    document.getElementById('speaking').style.display='none';
    kanchiRecording=false;
}
//document.getElementById('startRecordButton').addEventListener('click', startRecording);
//document.getElementById('stopRecordButton').addEventListener('click', stopRecording);
//document.getElementById('sendButton').addEventListener('click', sendAudioToAPI);