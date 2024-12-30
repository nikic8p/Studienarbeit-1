
// Control Panel erstellen

let gui = new lil.GUI();

var stop = false;
var controls = {
    mikrofon: function(){startMikrofon()},
    sinus: function(){startSinus()},
    frequenz: 1,
    stop: function(){stop = true;},
    clear: function(){clearPlot()}
}
gui.add(controls, 'mikrofon');
gui.add(controls, 'sinus');
gui.add(controls, 'frequenz', 0, 20000).onChange( value => {
    sinus.setFrequency(value);
});
gui.add(controls, 'stop');
gui.add(controls, 'clear');

// Auswahl des DIV Elements in der HTML file
// hier wird mit Plotly gezeichnet

var DEMONSTRATOR = document.getElementById('demonstrator');

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
            },
            tickvals: [0, 53, 106, 159, 212],
            ticktext: [0, 5000, 10000, 15000, 20000]
        },
        yaxis: {
            title: {
                text: 'Zeit',
            }
        },
    },
    autosize: true,
    width: DEMONSTRATOR.clientWidth,
    height: DEMONSTRATOR.clientHeight, 
};

//Initiales Zeichnen des Plots
Plotly.newPlot(DEMONSTRATOR, data, layout, defaultPlotlyConfiguration);


// Erstellen der mikrofon Instanz
const microphone = new Microphone();
function startMikrofon(){
    
    redraw(microphone);

}

// Starte Sinus Generator
const sinus = new SineGenerator(controls.frequenz);
function startSinus(){

    redraw(sinus);

}



var frequenzen;

function redraw(srcObject){


    frequenzen = srcObject.getFrequencys();

    z_data = z_data.slice(1);
    z_data.push(...[frequenzen]);

    var update = {
        z: [z_data]
    }

    Plotly.update(DEMONSTRATOR, update, 0);
    
    setTimeout(function() {
        if (stop === true) {
            stop = false;
            return;
        }
        redraw(srcObject);
      }, 10);
}




function clearPlot(){
    z_data = new Array(200).fill(0).map(()=>new Array(256).fill(0));
    var update = {
        z: [z_data]
    }

    Plotly.update(DEMONSTRATOR, update, 0);
}