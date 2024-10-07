# Studienarbeit 1

# Demonstrator für die diskrete Fouriertransformation in Javascript

## Aufgabe/Kurzbeschreibung
Es ist ein Javascript Demonstrator zu Entwickeln welcher das Audiosignal eines Mikrofons als Spektrogramm darstellt. Das Ergebnis ist dreidimensional zu visualisieren. <br> Visualisierungsbeispiel: <br>
https://upload.wikimedia.org/wikipedia/commons/0/08/3D_battery_charger_RF_spectrum_over_time.jpg <br> 
Grafikbibliothek: <br>
Three.js konnte passend sein (https://threejs.org/examples/#webgl_interactive_raycasting_points)



## Fragen:
* WebApp oder Standalone?
* Mikro Audio zuerst "Speichern" und dann transformieren oder in real time dynamisch wandeln?



## JavaScript

### Variablen
    let variableName = Value; 
        // dynamische Variable, die im Programm einfsch einem neuen Variablentypen zugeordnet werden kann.
    const constName = constant;
        // Variable ist konstand und kann keinen neuen Wert zugeordnet bekommen.

### Objekte
    let objektName = {
        name: 'Name',
        age: Zahl
    };
        // Objekt erstellen

    Dot Notation:
    objektName.Attdribut ;
        // auf Attribut zugreifen/ändern

    Bracket Notation:
    objektName['Attribut'] = ...;
        // wie Bot Notation
        // kann auch dynamisch mit zusätzlicher Variablen verwendet werden (vorteil)

### Listen
    let arrayName = [element1, element2];
        // klassische Array Funktionalität
        // Variablentyp ist nicht relevant (kann unterschiedlich sein)
    arrayName.lenght
        // länge von Array wiedergeben


### Funktienen

    finction functionName(parameter1, parameter2, ...) {
        inhalt
        return ...;
    }

    functionName(argument1, argument2, ...);