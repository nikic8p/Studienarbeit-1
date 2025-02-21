# Studienarbeit 1

# Demonstrator für die diskrete Fouriertransformation in Javascript

## Aufgabe/Kurzbeschreibung
Es ist ein Javascript Demonstrator zu Entwickeln welcher das Audiosignal eines Mikrofons als Spektrogramm darstellt. Das Ergebnis ist dreidimensional zu visualisieren. <br> Visualisierungsbeispiel: <br>
https://upload.wikimedia.org/wikipedia/commons/0/08/3D_battery_charger_RF_spectrum_over_time.jpg <br> 
Grafikbibliothek: <br>
Three.js konnte passend sein (https://threejs.org/examples/#webgl_interactive_raycasting_points)



## Fragen:
* WebApp oder Standalone? (node?) 
    - kein Node
    - in zwei Browsern testen (z.B. Safari und Chrome)
* Mikro Audio zuerst "Speichern" und dann transformieren oder in real time dynamisch wandeln?
    - dynamisch
* Zusatzfunktionen?
    - erst später wichtig

* Latex
    - egal
* 



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

    function functionName(parameter1, parameter2, ...) {
        inhalt
        return ...;
    }

    functionName(argument1, argument2, ...);








## Zeitplan

    - KW 41
        * Einarbeitung JavaScript
        * Entwicklungsumgebung
        * Zeitplan
    - KW 42
        * Einarbeitung JavaScript (vertiefen)
        * erste Ansätze mit Grafischer Oberfläche
        * erste versuche mit fft
    - KW 43
        * erste grafische fft 
        * potenzielle verbesserungsvorschläge
    - KW 44
        * einarbeiten der Vorschläge
    - KW 45
        * mögliche weitere Verbesserungsvorschläge
    - KW 46
        * einarbeiten der Vorschläge
        * beenden der Programmierarbeit
    - KW 47
        * Studienarbeit schreiben
    - KW 48
        * Studienarbeit schreiben
    - KW 49
        * möglicherweise Feedback zur Studienarbeit
        * Verbesserungen einarbeiten
    - KW 50
        * optimalerweise hier beenden
    - KW 51
        * Klausurwoche
    - KW 52
        * Ende 