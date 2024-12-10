import * as FFT from 'fft';

//const FFT = require('fft.js');

const f = new FFT.FFT(256);

let input = new Array(f.size);
//const x = Math.sin()
input.fill(0);

const out = f.createComplexArray();

function fillSine(arr, frequency){
    for (let i = 0; i<arr.length; i++){
        arr[i] = Math.cos(2 * Math.PI * frequency * i/512);
    }
    return arr;
}
let frequency = 1;
function fourier(){
    
    input = fillSine(input, frequency);
    
    f.realTransform(out, input);
    
    frequency ++;

    return f.fromComplexArray(out);
}




let gui = new lil.GUI();



let z_data = new Array(200).fill(0).map(()=>new Array(256).fill(0));
//z_data = getData(z_data);

var data = [{
    z: z_data,
    type: 'surface',
    showscale: false,
    displayModeBar: false
    // contours: {
    // z: {
    //     show:true,
    //     usecolormap: true,
    //     highlightcolor:"#42f462"
    // }
    // }
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

var TESTER = document.getElementById('tester');


var layout = {
    title: {
    text: 'Visualisierung 3D Plot mit Zufallsdaten'
    },
    scene: {
        camera: {eye: {x: 1.87, y: 0.88, z: 0.64}},
        aspectmode: "manual",
        aspectratio: {x: 1, y: 2, z: 0.2}
    },
    autosize: true,
    width: TESTER.clientWidth,
    height: TESTER.clientHeight,
    // margin: {
    // l: 65,
    // r: 50,
    // b: 65,
    // t: 50,
    // }
};
Plotly.newPlot(TESTER, data, layout, defaultPlotlyConfiguration);

var clear = false;

function randomize(){
    z_data = z_data.slice(1);
    // z_data.push(...getData([z_data[0]]));
    // let arr = new Array(256);
    // for (let i = 0; i<arr.length; i++){
    //     arr[i] = Math.sin(2 * Math.PI * frequency * i/256);
    // }
    // frequency += 1;

    let fou = fourier();
    console.log(fou);
    z_data.push(...[fou]);
    // data[0]['z'] = z_data;




    var update = {
        z: [z_data]
    }

    Plotly.restyle(TESTER, update, 0);
    
    setTimeout(function() {
        if (stop === true) {
            stop = false;
            return;
        }
        randomize();
      }, 20);
}

function getData(arr) {
    
    for (let i = 0; i< arr.length; i++){
        for (let j = 0; j< arr[0].length; j++){
            arr[i][j] = Math.random();
        }
    }
    return arr;
}
var stop = false;
var controls = {
    random: function(){randomize()},
    stop: function(){stop = true;}
}
gui.add(controls, 'random');
gui.add(controls, 'stop');