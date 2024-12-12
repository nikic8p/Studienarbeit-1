//import * as FFT from 'fft';

// var constraints = { audio: true, video: false };
    
// navigator.mediaDevices.getUserMedia(constraints).then(function (stream)
// {
//     var audio = document.getElementById('audioCapture');
//     audio.srcObject = stream;
//     // console.log(stream);
//     audio.createAnalyser();

// }).catch(function (err)
// {
//     console.log(err);
// });


// const f = new FFT.FFT(256);

// let input = new Array(f.size);
// //const x = Math.sin()
// input.fill(0);

// const out = f.createComplexArray();

// function fillSine(arr, frequency){
//     for (let i = 0; i<arr.length; i++){
//         arr[i] = Math.cos(2 * Math.PI * frequency * i/25600);
//     }
//     return arr;
// }
// let frequency = 1;

// function fourier(){
    
//     input = fillSine(input, frequency);
    
//     f.realTransform(out, input);
    
//     frequency += 100;

//     return f.fromComplexArray(out);
// }


// Control Panel erstellen

let gui = new lil.GUI();

var stop = false;
var controls = {
    random: function(){redraw()},
    stop: function(){stop = true;}
}
gui.add(controls, 'random');
gui.add(controls, 'stop');

// Auswahl des DIV Elements in der HTML file
// hier wird mit Plotly gezeichnet

var TESTER = document.getElementById('tester');

// 2D Arrays für den Plot gefüllt mit 0

let z_data = new Array(200).fill(0).map(()=>new Array(256).fill(0));

// Erstellen der Plotly-js Objekte für das Zeichnen des Plots

var data = [{
    z: z_data,
    type: 'surface',
    showscale: false,
    displayModeBar: false
}];

var defaultPlotlyConfiguration = { 
    modeBarButtonsToRemove: [
        'pan',
        'orbitRotation',
        'tableRotation',
        'resetCameraDefault3d',
        'resetCameraLastSave3d',
        'zoom',
        'toImage',
        'sendDataToCloud', 
        'autoScale2d', 
        'hoverClosestCartesian', 
        'hoverCompareCartesian', 
        'lasso2d', 
        'select2d'
    ], 
    displaylogo: false, 
    showTips: false
};

var layout = {
    title: {
    text: 'Visualisierung 3D Plot mit Zufallsdaten'
    },
    scene: {
        camera: {eye: {x: 1.87, y: 0.88, z: 0.64}},
        aspectmode: "manual",
        aspectratio: {x: 1, y: 2, z: 0.2},
        xaxis: {
            title: {
                text: 'Frequenz',
            }
        },
        yaxis: {
            title: {
                text: 'Zeit',
            }
        },
    },
    autosize: true,
    width: TESTER.clientWidth,
    height: TESTER.clientHeight, 
};

//Initiales Zeichnen des Plots

Plotly.newPlot(TESTER, data, layout, defaultPlotlyConfiguration);


const microphone = new Microphone()

console.log(microphone);
var samples;
function redraw(){
    samples = microphone.getSamples();

    for (let i = 0; i<samples.length; i++){
        samples[i] = Math.abs(samples[i] - 128);
    }


    z_data = z_data.slice(1);
    z_data.push(...[samples]);

    var update = {
        z: [z_data]
    }

    Plotly.update(TESTER, update, 0);
    
    setTimeout(function() {
        if (stop === true) {
            stop = false;
            return;
        }
        redraw();
      }, 20);
}