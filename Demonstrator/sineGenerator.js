class SineGenerator {
    constructor(f){
        this.initialized = false;
        navigator.mediaDevices.getUserMedia({audio: true})
        .then(function(stream){
            this.audioContext = new AudioContext();
            this.sineGenerator = this.audioContext.createOscillator();
            this.sineGenerator.type = "sine";
            this.sineGenerator.frequency.setValueAtTime(f, this.audioContext.currentTime);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.sineGenerator.connect(this.analyser);
            this.sineGenerator.start();
            this.initialized = true;
        }.bind(this)).catch(function(err){
            alert(err);
        })
    }
    getFrequencys(){
        this.analyser.getByteFrequencyData(this.dataArray);
        let frequencys = [...this.dataArray];
        
        return frequencys;
    }
    setFrequency(f){
        this.sineGenerator.frequency.setValueAtTime(f, this.audioContext.currentTime);
    }
}
