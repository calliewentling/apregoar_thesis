var docTitle = document.title;
    
///// Initialize map loader //////
/**
 * Renders a progress bar.
 * @param {HTMLElement} el The target element.
 * @class
 */
function Progress(el) {
this.el = el;
this.loading = 0;
this.loaded = 0;
}

/**
 * Increment the count of loading tiles.
 */
Progress.prototype.addLoading = function () {
if (this.loading === 0) {
    this.show();
}
++this.loading;
this.update();
};

/**
 * Increment the count of loaded tiles.
 */
Progress.prototype.addLoaded = function () {
const this_ = this;
setTimeout(function () {
    ++this_.loaded;
    this_.update();
}, 100);
};

/**
 * Update the progress bar.
 */
Progress.prototype.update = function () {
const width = ((this.loaded / this.loading) * 100).toFixed(1) + '%';
this.el.style.width = width;
if (this.loading === this.loaded) {
    this.loading = 0;
    this.loaded = 0;
    const this_ = this;
    setTimeout(function () {
    this_.hide();
    }, 500);
}
};

/**
 * Show the progress bar.
 */
Progress.prototype.show = function () {
this.el.style.visibility = 'visible';
};

/**
 * Hide the progress bar.
 */
Progress.prototype.hide = function () {
if (this.loading === this.loaded) {
    this.el.style.visibility = 'hidden';
    this.el.style.width = 0;
}
};

const progress = new Progress(document.getElementById('progress'));



//////// Defining color schemes /////////
/*const re= /&#39;/gi
pubColors = pubColors.replace(re,'').replace('[','').replace(']','').split(",");
console.log("pubColors: ",pubColors);

if (pubColors[0].length > 2){
    var pubColor1 = pubColors[0];
    //document.documentElement.style.setProperty('--pub-color1',pubColor1);
    var pubColor1L = pubColors[0]+'80';
    //document.documentElement.style.setProperty('--pub-color1L',pubColor1L);
};*/




////// MAP INITIALIZATION //////
//Generic Map Setup
const viewGaz = new ol.View({
    projection: 'EPSG:4326',
    center: [-9.150404956762742,38.72493479806579],
    zoom: 12
});
 


var styleJson = 'https://api.maptiler.com/maps/3b03922e-4557-48cb-9428-624bbbc242fb/style.json?key=DoqRHLdjG2tKhuJx9x3L';
const mapGaz = new ol.Map({
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    target: 'map',
    view: viewGaz,
});
//olms.apply(mapGaz,styleJson);


// Add Story shapes
const wmsSourceStory = new ol.source.ImageWMS({
    url: 'http://localhost:8080/geoserver/apregoar/wms',
    /*params: {"LAYERS":"apregoar:geonoticias"},*/ //OG
    params: {"LAYERS":"apregoar:geonoticias",
        "STYLES": "apregoar:pub_localize",
        "cql_filter":mapStoryFilter}, //Set on each individual page
    serverType: 'geoserver',
    crossOrigin: 'anonymous',
});
const wmsLayerStory = new ol.layer.Image({
    source: wmsSourceStory,
});
wmsLayerStory.setOpacity(0.7);
mapGaz.addLayer(wmsLayerStory);
console.log("Story instances added");

//Progress bar
wmsSourceStory.on('imageloadstart', function () {
    progress.addLoading();
});

wmsSourceStory.on('imageloadend', function () {
    progress.addLoaded();
});
wmsSourceStory.on('imageloaderror', function () {
    progress.addLoaded();
});

//General Zoom Function
let layerExtent;
let ymax = 39.83801908704823;
let xmax = -7.74577887999189;
let ymin = 38.40907442337447;
let xmin = -9.517104891617194;
//Extent order: [xmin, ymin, xmax, ymax]
function zoomGaz(vectorSource){
    console.log("Entering zoomGaz()");
    var nominatimPolyExtent = sourceNominatimPoly.getExtent();
    if (isFinite(nominatimPolyExtent[0])){
        var layerExtent = nominatimPolyExtent;
    } else {
        var layerExtent = vectorSource.getExtent();
    }
    isInfinite = false;
    for (coord in layerExtent){
        if (!isFinite(layerExtent[coord])){
            isInfinite = true;
        };
    };
    if (isInfinite == false){
        var bufferExtent = ol.geom.Polygon.fromExtent(ol.extent.getIntersection(layerExtent,maxExtent));
        bufferExtent.scale(1.5);
        mapGaz.getView().fit(bufferExtent);
    }
    console.log("leaving zoomGaz()");
    return layerExtent;
}

//Zoom to Story instances (already associated)
const vectorSourceStories = new ol.source.Vector();
var wfs_url_story = 'http://localhost:8080/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=apregoar:geonoticias&cql_filter='+mapStoryFilter+'&outputFormat=application/json';
fetch(wfs_url_story).then(function (response) {
    jsonS = response.json();
    console.log("JSON: ",jsonS);
    return jsonS;
})
.then(function (jsonS) {
    const featuresS = new ol.format.GeoJSON().readFeatures(jsonS);
    console.log("Features: ",featuresS);
    if (featuresS[0]["A"]["st_astext"]) {
        vectorSourceStories.addFeatures(featuresS);
        layerExtent = zoomGaz(vectorSource = vectorSourceStories);
    }
    return vectorSourceStories;
});

//DEFINE LOCALIZATION TOTALS
let tGaz = 0;
let uGaz = 0;
let eGaz = 0;
let gazL = 0;

//// Preparation for map interaction ///
let snapDraw, drawDraw, modifyDraw; //
var typeSelect = document.getElementById('type');
const drawSource = new ol.source.Vector();
const drawVector = new ol.layer.Vector({
    source: drawSource,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255,255,255,0.2)',
        }),
        stroke: new ol.style.Stroke({
            color: '#ff3333',
            width: 2,
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#ff3333',
            }),
        }),
    }),
});     
mapGaz.addLayer(drawVector);



///// Preparation for select and delete /////////
let selectedF;
var featureID = 0;
let select= null; //select and delete
const selectSingleClick = new ol.interaction.Select();
const selectClick = new ol.interaction.Select({
    condition: ol.events.condition.click,
});
const selectPointerMove = new ol.interaction.Select({
    condition: ol.events.condition.pointerMove,
});
const selectAltClick = new ol.interaction.Select({
    condition: function (mapBrowserEvent){
        return click(mapBrowserEvent) && ol.events.condition.altKeyOnly(mapBrowserEvent);
    },
});
const selectElement = document.getElementById('clickType');
const deleteButton = document.getElementById("deletedFeatures");
const changeInteraction = function() {
    if (select !== null) {
        mapGaz.removeInteraction(selectClick);
    }
    const valueClick = selectElement.value;
    if (valueClick == 'singleclick'){
        select = selectSingleClick;
    } else if (valueClick == 'click') {
        select  = selectClick;
    } else if (valueClick == 'pointermove') {
        select = selectPointerMove;
    } else if (valueClick == 'altclick') {
        select = selectAltClick;
    } else {
        select = null;
    }
    if (select !== null) {
        mapGaz.addInteraction(selectClick);
        select.on('select', function (e) {
            var numFeatures = e.target.getFeatures().getLength();            
            console.log(numFeatures,' selected features (last operation selected ',e.selected.length,' and deselected ',e.deselected.length,' features.');
        });
    }
};
selectElement.onchange = changeInteraction;
changeInteraction();

////// TOGGLE FOR CONTEXT ////////
function toggleContext(){
    var cSwitch = document.getElementById("cswitch");
    var cToggleMode = document.getElementById("ctoggleMode");
    var temporalDez = document.getElementById("temporal_dez");
    var eventName = document.getElementById("eventName");
    var allDay = document.getElementsByName("allDay");
    var tBeginf = document.getElementById("tBegin");
    var tEndf = document.getElementById("tEnd");
    var eName = document.getElementById("eName");
    console.log("eName: ",eName.value);
    if (cSwitch.checked == true){
        console.log("context mode activiated");
        cToggleMode.innerHTML = "Modo: Contextualização";
        temporalDez.style.display = "none";
        eventName.style.display = "none";
        timeDefP();
        if (eName.value.length < 1){
            console.log("no ename saved");
            eName.value = "context";
        };
        
    } else {
        console.log("event mode activated");
        cToggleMode.innerHTML = "Modo: Eventos";
        temporalDez.style.display = "block";
        eventName.style.display = "block";
        timeDefD();
    };
    console.log("Event name: ",eName.value);
};

///// TOGGLE TO UGAZ /////////////
//Toggle Map Views (using existing gaz vs. design new place)
function toggleLocalization(){
    //Get the checkbox
    var tswitch = document.getElementById("tswitch");
    //Get output text //
    var newUgaz = document.getElementById("newUgaz");
    var eGazMap = document.getElementById("eGazMap");
    var toggleMode = document.getElementById("toggleMode");
    var poiGaz = document.getElementById("poiGaz");
    var poiNominatim = document.getElementById("poiNominatim");
    //If the checkbox is checked, display the output text
    if (tswitch.checked == true){
        console.log("CREATE NEW UGAZ MODE");
        toggleMode.innerHTML = "Desenhar localização";
        const modifyDraw = new ol.interaction.Modify({
            source: drawSource,
        });
        mapGaz.addInteraction(modifyDraw);
        document.getElementById("map").style.cursor="crosshair";
        function addInteractions() {
            drawDraw = new ol.interaction.Draw({
                source: drawSource,
                type: "Polygon"
            });
            drawDraw.on('drawend',function(event) {
                featureID = featureID + 1;
                event.feature.setProperties({
                    'id': featureID
                })
            })
            mapGaz.addInteraction(drawDraw);
            snapDraw = new ol.interaction.Snap({source: drawSource});
            mapGaz.addInteraction(snapDraw);
        };
        typeSelect.onchange = function() {
            mapGaz.removeInteraction(drawDraw);
            mapGaz.removeInteraction(snapDraw);
            mapGaz.removeInteraction(modifyDraw);
        };
        addInteractions();
        deleteButton.style.display = "none";
    } else {
        if (drawSource.getFeatures().length > 0){
            document.getElementById("map").style.cursor="pointer";
        } else {
            document.getElementById("map").style.cursor="default";
        };
        console.log("UGAZ MODIFY MODE");
        toggleMode.innerHTML = "Ver localizações";
        //remove interactivity
        mapGaz.removeInteraction(drawDraw);
        mapGaz.removeInteraction(snapDraw); 
        mapGaz.removeInteraction(modifyDraw);
        // Show geometry results in console
        drawResults();
        select.on('select', function (e) {
            var selFeatures = e.target.getFeatures();
            var numFeatures = selFeatures.getLength();
            console.log(numFeatures,' selected features (last operation selected ',e.selected.length,' and deselected ',e.deselected.length,' features.');
            console.log("e",e);
            console.log("selFeatures ",selFeatures);
            console.log("numFeatures: ",numFeatures);
            if (numFeatures == 0) {
                deleteButton.style.display = "none";
            } else {
                if (numFeatures == 1) {
                    dButtonText = "Eliminar um elemento.";
                } else {
                    dButtonText = "Eliminar "+numFeatures+" elementos.";
                }
                
                deleteButton.innerHTML = `<button type ="button" class="btn btn-primary" id="buttonDeleteUgazF">`+dButtonText+`</button>`;
                deleteButton.style.display = "block";
                var buttonDeleteUgazF = document.getElementById("buttonDeleteUgazF");
                buttonDeleteUgazF.onclick = function() {
                    console.log("arrived in deleteUgazFeatures");
                    console.log("numFeatures: ",numFeatures);
                    console.log("drawSource features before: ",drawSource.getFeatures());
                    selFeatures.forEach(function(feature){
                        drawSource.removeFeature(feature)
                    });
                    console.log("drawSource features after: ",drawSource.getFeatures());
                    deleteButton.innerHTML = `<p> ${numFeatures} elementos eliminados.`;
                    if (drawSource.getFeatures().length == 0){
                        document.getElementById("map").style.cursor="default";
                    };
                }; 
            }
        });
    }
};

let polyJson = {};
function drawResults() {
    console.log("Begin drawResults");
    drawFeatures = drawSource.getFeatures();
    console.log("drawFeatures: ",drawFeatures);
    if (drawFeatures.length > 0){
        var allCoords = [];
        for (let i = 0; i < drawFeatures.length; i++) {
            geom = drawFeatures[i].getGeometry();
            console.log("geom ",geom);
            coords = geom.getCoordinates()[0];
            console.log("coords: ",coords);
            poly = coords
            allCoords.push(poly);
        }
        var multiPoly = {
            "type": "MultiPolygon",
            "coordinates": allCoords
        };
        console.log("number of polygons: ",drawFeatures.length);
        polyJson = JSON.stringify(multiPoly);
        console.log("polyJson: ",polyJson);        
    } else {
        console.log("No polygons drawn");
    };
    //Update total Gaz Numbers
    uGaz = drawFeatures.length;
    tGaz = updateGazTotals(uGaz, gazL);
}

//On added feature adjustments:
drawSource.on('addfeature',function(evt){
    console.log("addfeature begin",evt);
    var feature = evt.feature;
    console.log("added feature: ",feature.getGeometry().getCoordinates());
    drawResults();
});
drawSource.on('changefeature',function(evt){
    console.log("changefeature begin",evt);
    var feature = evt.feature;
    console.log("changed feature: ",feature.getGeometry().getCoordinates());
    drawResults();
});
drawSource.on('removefeature',function(evt){
    console.log("remove feature begin",evt);
    var feature = evt.feature;
    console.log("removed feature: ",feature.getGeometry().getCoordinates());
    drawResults();
});
drawSource.on('clear',function(evt){
    console.log("clear begin",evt);
    var feature = evt.feature;
    console.log("all cleared ",feature.getGeometry().getCoordinates());
    drawResults();
});


// Add Localize EGaz
//Define map layers for future update
const styleGazAdmin = [
    new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'blue',
            width: '3',
        }),
        fill: new ol.style.Fill({
            color: 'rgba(0,0, 255, 0.1)',
        }),
    }),
];

// Initialize Egaz map layers
const wmsSourceEGaz = new ol.source.ImageWMS({
    url: 'http://localhost:8080/geoserver/apregoar/wms',
    serverType: 'geoserver',
    crossOrigin: 'anonymous',
});
console.log("Source defined")
const wmsLayerEGaz = new ol.layer.Image({
    source: wmsSourceEGaz,
    style: styleGazAdmin,
});
mapGaz.addLayer(wmsLayerEGaz);
console.log("EGaz Layer added");

// Initialize Ugaz map layers
const wmsSourceUGaz = new ol.source.ImageWMS({
    url: 'http://localhost:8080/geoserver/apregoar/wms',
    serverType: 'geoserver',
    crossOrigin: 'anonymous',
});
console.log("Source defined")
const wmsLayerUGaz = new ol.layer.Image({
    source: wmsSourceUGaz,
    style: styleGazAdmin,
});
mapGaz.addLayer(wmsLayerUGaz);
console.log("UGaz Layer added");


const maxExtent = ol.extent.boundingExtent([[xmin,ymin],[xmax,ymin],[xmin,ymax],[xmax,ymax]]);
console.log("maxExtent: ",maxExtent);
let libraryNominatim;

function cleanSelectOptions(selectionElement){
    //Function removing all options that are not already selected
    console.log("entering cleanSelectOptions("+selectionElement+")");
    for (let c=selectionElement.children.length-1; c>=0; c--){
        console.log("option: ",selectionElement.children[c]);
        if (selectionElement.children[c].selected == false){
            selectionElement.removeChild(selectionElement.children[c]);
        };
    };
    if (selectionElement.children.length == 0){
        selectionElement.style.display="none";
    }
    console.log("leaving cleanSelectOptions");
};

//Calling RESTAPI of geonames to search gazetteer
function searchNominatim() {
    var selectNominatim = document.getElementById('select_nominatim');
    cleanSelectOptions(selectNominatim);
    var searchTerm = prompt("Pode especificar a pesquisa para Nominatim:");
    encodedSearch = encodeURIComponent(searchTerm);
    var url = "https://nominatim.openstreetmap.org/search?q="+encodedSearch+"&format=jsonv2&countrycodes=pt&limit=50&viewbox=-7.74577887999189,39.83801908704823,-9.517104891617194,38.40907442337447&polygon_geojson=1"
    console.log("URL: ",url);
    fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error('HTTP error! Status: ${ resonse.status }');
            }
            return response.json();
        })
        .then((response) => {
            //console.log("Response: ",response);
            var nominatim = response;
            const totalResults = nominatim.length;
            //console.log("totalResults: ",totalResults);
            var CSR = {
                "bOgazOsm": 0,
            };
            if (totalResults > 0) {
                for (var i=0; i < nominatim.length; i++) {
                    var option = document.createElement("option");
                    option.textContent = nominatim[i]["display_name"];
                    //console.log("option text: ",option.textContent);
                    var valueN = {
                        "name": nominatim[i]["display_name"],
                        "geojson" : nominatim[i]["geojson"],
                        "id": nominatim[i]["osm_type"]+nominatim[i]["osm_id"] //If you need an ID that is consistent over multiple installations of Nominatim, then you should use the combination of osm_type+osm_id+class. https://nominatim.org/release-docs/latest/api/Output/#notes-on-field-values
                    };
                    option.value = JSON.stringify(valueN);
                    nameN = nominatim[i]["display_name"];
                    const geojson = JSON.stringify(nominatim[i]["geojson"]);
                    //console.log("geojson ",geojson);
                    if (nominatim[i]["geojson"]["type"]=="Polygon"){
                        //Only loading polygons (as these can be saved). In the future: can reincorporate points as guides.
                        selectNominatim.appendChild(option);
                        CSR["bOgazOsm"] = CSR["bOgazOsm"] + 1;
                    };
                    //console.log("Intermediate CSR: ",CSR);              
                };
                //console.log("selectNominatim: ",selectNominatim);
                if (selectNominatim.hasChildNodes()){
                    selectNominatim.style.display="block";
                };
            };
            console.log("CSR: ",CSR);
            updateReturnCounts(CSR,searchTerm);            
        })
};


var sourceNominatimPoly = new ol.source.Vector();


// Adding fetch to search through all previous areas
const selectPrev = document.getElementById("selectPrev");
var selectUgazPersonal = document.getElementById('select_ugaz_personal');
var selectUgazEmpresa = document.getElementById('select_ugaz_empresa');
var selectUgazAll = document.getElementById('select_ugaz_all');
var selectEgazFreguesia = document.getElementById('select_egaz_freguesia');
var selectEgazConcelho = document.getElementById('select_egaz_concelho');
var selectEgazExtra = document.getElementById('select_egaz_extra');
var selectEgazGreen = document.getElementById('select_egaz_green');
var selectEgazArchive = document.getElementById('select_egaz_archive');
var selectNominatim = document.getElementById('select_nominatim');

function searchGazPrev(gazetteer) {
    cleanSelectOptions(selectUgazPersonal);
    cleanSelectOptions(selectUgazEmpresa);
    cleanSelectOptions(selectUgazAll);
    cleanSelectOptions(selectEgazFreguesia);
    cleanSelectOptions(selectEgazConcelho);
    cleanSelectOptions(selectEgazExtra);
    cleanSelectOptions(selectEgazGreen);
    cleanSelectOptions(selectEgazArchive);
    cleanSelectOptions(selectNominatim);

    var bodyContent = {}
    var CSR = { //count search results
        "bUgazAll": 0,
        "bUgazMine": 0,
        "bUgazEmp": 0,
        "bUgazOther": 0,
        "bEgazAll": 0,
        "bEgazFreg": 0,
        "bEgazConc": 0,
        "bEgazBig": 0,
        "bEgazVer": 0,
        "bEgazArq": 0,
        "bOgazAll": 0,
        "bOgazOsm": 0,
    };
    if (gazetteer == "gaz_prev"){
        //var searchTerm = prompt("Pode especificar a pesquisa:");
        var searchTerm = document.getElementById('gazSearch').value;
        console.log("searchTerm: ",searchTerm);
        //Update search term visualiation
        var searchTermDisplay = document.getElementById("searchTermDisplay");
        searchTermDisplay.innerHTML = "<p>"+searchTerm+"</p>";
        searchTermDisplay.style.display="block";
        //Check for invalid search term
        invalidSearchTerm = [null,""," "];
        if (invalidSearchTerm.includes(searchTerm)){
            console.log("no valid searchTerm");
            updateReturnCounts(CSR, searchTerm);
            return;
        };
        bodyContent = JSON.stringify({
            "gazetteer": gazetteer,
            "searchTerm": searchTerm,
            "pubID": pubID,
        });
        console.log("bodyContent: ",bodyContent);
        
    }
    fetch(`${window.origin}/publisher/${sID}/gazetteer`, {
        method: "POST",
        credentials: "include",
        body: bodyContent,
        cache: "no-cache",
        headers: new Headers({
            "content-type":"application/json"
        })
    })
    .then(function(response) {
        if (response.status !== 200) {
            window.alert("Erro no carragemento do gazetteer");
            console.log(`Error status code: ${response.status}`);
            return;
        }
        response.json().then(function(data){
            console.log(data);
                     
            for (var i=0; i < data.length; i++) {
                var option = document.createElement("option");
                option.textContent = data[i]["gaz_name"];
                option.value = data[i]["gaz_id"];
                gazType = data[i]["gaz_desc"];
                console.log("gazType: ",gazType);
                console.log("Option: ",option);
                if (gazType.includes("ugaz")) {
                    //console.log("Entering UGAZ if statement");
                    gazType = gazType.split('_');
                    gazUID = parseInt(gazType[0].substr(4));
                    //console.log("gazUID: ",gazUID);
                    gazPID = parseInt(gazType[1]);
                    CSR["bUgazAll"] = CSR["bUgazAll"] + 1;
                    if (gazUID == uID) {
                        selectUgazPersonal.appendChild(option);
                        selectUgazPersonal.style.display="block";
                        CSR["bUgazMine"] = CSR["bUgazMine"] + 1;
                    } else if (gazPID == pubID){
                        //console.log("my company place");
                        selectUgazEmpresa.appendChild(option);
                        selectUgazEmpresa.style.display="block";
                        CSR["bUgazEmp"] = CSR["bUgazEmp"] + 1;
                    }
                    else {
                        //console.log("not my place");
                        selectUgazAll.appendChild(option);
                        selectUgazAll.style.display="block";
                        CSR["bUgazOther"] = CSR["bUgazOther"]+1;
                    };
                }
                else if (gazType == "freguesia") {
                    selectEgazFreguesia.appendChild(option);
                    selectEgazFreguesia.style.display="block";
                    CSR["bEgazAll"] = CSR["bEgazAll"]+1;
                    CSR["bEgazFreg"] = CSR["bEgazFreg"]+1;
                }
                else if (gazType == "concelho") {
                    selectEgazConcelho.appendChild(option);
                    selectEgazConcelho.style.display="block";
                    CSR["bEgazAll"] = CSR["bEgazAll"]+1;
                    CSR["bEgazConc"] = CSR["bEgazConc"]+1;
                }
                else if (gazType == "espaço_verde") {
                    selectEgazGreen.appendChild(option);
                    selectEgazGreen.style.display="block";
                    CSR["bEgazAll"] = CSR["bEgazAll"]+1;
                    CSR["bEgazVer"] = CSR["bEgazVer"]+1;
                }
                else if (gazType.includes("archiv")) {
                    //console.log("In Archive");
                    selectEgazArchive.appendChild(option);
                    selectEgazArchive.style.display="block";
                    CSR["bEgazAll"] = CSR["bEgazAll"]+1;
                    CSR["bEgazArq"] = CSR["bEgazArq"]+1;
                }
                else {
                    selectEgazExtra.appendChild(option);
                    selectEgazExtra.style.display="block";
                    CSR["bEgazAll"] = CSR["bEgazAll"]+1;
                    CSR["bEgazBig"] = CSR["bEgazBig"]+1;
                }
            }
            styleSelectGaz(gaz=selectUgazPersonal);
            styleSelectGaz(gaz=selectUgazEmpresa);
            styleSelectGaz(gaz=selectUgazAll);
            styleSelectGaz(gaz=selectEgazFreguesia);
            styleSelectGaz(gaz=selectEgazConcelho);
            styleSelectGaz(gaz=selectEgazArchive);
            styleSelectGaz(gaz=selectEgazExtra);           
        })
    })
    .catch(function(error){
        console.log("Fetch error: "+error);
    });

    //CHECK NOMINATIM
    encodedSearch = encodeURIComponent(searchTerm);
    var url = "https://nominatim.openstreetmap.org/search?q="+encodedSearch+"&format=jsonv2&countrycodes=pt&limit=50&viewbox=-7.74577887999189,39.83801908704823,-9.517104891617194,38.40907442337447&polygon_geojson=1"
    console.log("URL: ",url);
    fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error('HTTP error! Status: ${ resonse.status }');
            }
            return response.json();
        })
        .then((response) => {
            console.log("Response: ",response);
            var nominatim = response;
            const totalResults = nominatim.length;
            console.log("totalResults: ",totalResults);
            
            if (totalResults == 0) {
                console.log("No geonames results")
            } else {
                for (var i=0; i < nominatim.length; i++) {
                    var option = document.createElement("option");
                    option.textContent = nominatim[i]["display_name"];
                    //console.log("option text: ",option.textContent);
                    var valueN = {
                        "name": nominatim[i]["display_name"],
                        "geojson" : nominatim[i]["geojson"],
                        "id": nominatim[i]["osm_type"]+nominatim[i]["osm_id"] //If you need an ID that is consistent over multiple installations of Nominatim, then you should use the combination of osm_type+osm_id+class. https://nominatim.org/release-docs/latest/api/Output/#notes-on-field-values
                    };
                
                    option.value = JSON.stringify(valueN);
                    nameN = nominatim[i]["display_name"];
                    //libraryNominatim[nameN] = geojson;
                    if (nominatim[i]["geojson"]["type"]=="Polygon"){
                        selectNominatim.appendChild(option);
                        CSR["bOgazAll"] = CSR["bOgazAll"]+1;
                        CSR["bOgazOsm"] = CSR["bOgazOsm"]+1;
                    } 
                    
                }
                if (selectNominatim.hasChildNodes()){
                    selectNominatim.style.display="block";
                }
            }
            //console.log("libraryNominatim: ", libraryNominatim);
            console.log("CSR: ",CSR);
            updateReturnCounts(CSR, searchTerm)
        })
}

function updateReturnCounts(CSR, searchTerm){
    for (g in CSR){
        let updateText = document.getElementById(g);
        if (CSR[g] > 0){
            updateText.textContent = "("+searchTerm+": "+CSR[g]+")";
        } else {
            updateText.textContent = "";
        };
    };

};

function styleSelectGaz(gaz) {
    maxOptions = 8;
    if (gaz.options.length < maxOptions) {
        gaz.size = gaz.options.length +1;
    } else {
        gaz.size = maxOptions;
    }
}

// Adding fetches to get access to gazetteers
const loadingGaz = document.getElementById("loadingGaz");
function loadGaz(gazetteer) {
    fetch(`${window.origin}/publisher/${sID}/gazetteer`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
            "gazetteer": gazetteer,
            "pubID": pubID,
        }),
        cache: "no-cache",
        headers: new Headers({
            "content-type":"application/json"
        })
    })
    .then(function(response) {
        if (response.status !== 200) {
            window.alert("Erro no carragemento do gazetteer");
            console.log(`Error status code: ${response.status}`);
            return;
        }
        response.json().then(function(data){
            console.log(data);
            var select = document.getElementById(`select_${gazetteer}`)
            for (var i=0; i < data.length; i++) {
                var option = document.createElement("option");
                option.textContent = data[i]["gaz_name"];
                option.value = data[i]["gaz_id"];
                select.appendChild(option);
            }
            select.style.display = "block";
            styleSelectGaz(gaz=select);

        })
    })
    .catch(function(error){
        console.log("Fetch error: "+error);
    });
}

// Initialize POI map layers
const wmsSourcePOI = new ol.source.ImageWMS({
    url: 'http://localhost:8080/geoserver/apregoar/wms',
    serverType: 'geoserver',
    crossOrigin: 'anonymous',
});
console.log("Source defined")
const wmsLayerPOI = new ol.layer.Image({
    source: wmsSourcePOI,
    style: styleGazAdmin,
});
mapGaz.addLayer(wmsLayerPOI);
console.log("POI Layer added");


function prepGaz(selectedGaz,selectedInt) {
    for (var i=0; i<selectedGaz.length; i++) {
        if (selectedGaz[i].selected){
            selectedInt.push(selectedGaz[i].value);
        };
    };
    return 
}

function initGaz(initSource){
    console.log("Entering initGaz("+initSource+")");
    // Initializing values
    var selectedIntE = [];
    var selectedIntU = [];
    // Preparing freguesias
    var selectEgazFreguesia = document.getElementsByName("selectEgazFreguesia")[0];
    var result = prepGaz(selectedGaz = selectEgazFreguesia,selectedInt = selectedIntE);
    selectedIntE = selectedInt;
    // Preparing concelhos
    var selectEgazConcelho = document.getElementsByName("selectEgazConcelho")[0];
    result = prepGaz(selectedGaz = selectEgazConcelho, selectedInt = selectedIntE);
    selectedIntE = selectedInt;
    // Preparing Archive
    var selectEgazArchive = document.getElementsByName("selectEgazArchive")[0];
    result = prepGaz(selectedGaz = selectEgazArchive, selectedInt = selectedIntE);
    selectedIntE = selectedInt;
    // Preparing Green Space
    var selectEgazGreen = document.getElementsByName("selectEgazGreen")[0];
    result = prepGaz(selectedGaz = selectEgazGreen, selectedInt = selectedIntE);
    selectedIntE = selectedInt;
    // Preparing other administrative areas
    var selectEgazExtra = document.getElementsByName("selectEgazExtra")[0];
    result = prepGaz(selectedGaz = selectEgazExtra, selectedInt = selectedIntE);
    selectedIntE = selectedInt;
    // Preparing Sítios pessoais
    var selectUgazPersonal = document.getElementsByName("selectUgazPersonal")[0];
    prepGaz(selectedGaz = selectUgazPersonal, selectedInt = selectedIntU);
    selectedIntU = selectedInt;
    // Preparing Sítios Empresiais
    var selectUgazEmpresa = document.getElementsByName("selectUgazEmpresa")[0];
    result = prepGaz(selectedGaz = selectUgazEmpresa, selectedInt = selectedIntU);
    selectedIntU = selectedInt;
    // Preparing Sítios Empresiais
    var selectUgazAll = document.getElementsByName("selectUgazAll")[0];
    result = prepGaz(selectedGaz = selectUgazAll, selectedInt = selectedIntU);
    selectedIntU = selectedInt;

    // Preparing sítios Nominatim
    var selectedIntN = [];
    sourceNominatimPoly.clear();
    mapGaz.removeLayer(layerNominatimPoly);
    var selectNominatim = document.getElementById("select_nominatim");
    for (var i=0; i<selectNominatim.length; i++){
        if (selectNominatim[i].selected){
            const valueN = JSON.parse(selectNominatim[i]['value']);
            const geojson = valueN["geojson"];
            const coords = geojson["coordinates"];
            const geomType = geojson["type"];
            feature = new ol.Feature({
                geometry: new ol.geom.Polygon(coords),
                name: selectNominatim["name"]
            })
            selectedIntN.push(valueN);
            sourceNominatimPoly.addFeature(feature);
        }
    }
    layerNominatimPoly.setSource(sourceNominatimPoly) 
    mapGaz.addLayer(layerNominatimPoly);

    //Calcuate totals
    gazL = selectedIntE.length + selectedIntU.length + selectedIntN.length;
    tGaz = updateGazTotals(uGaz, gazL);
    results = vizGaz(selectedIntE,selectedIntU);
    //zoomGaz()
    zoomGaz(vectorSource=vectorSourceStories);
    results["tGaz"] = tGaz;
    results["selectedIntN"] = selectedIntN;
    console.log(results);
    return results;
}
var layerNominatimPoly = new ol.layer.Vector({
    source: sourceNominatimPoly,
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(238,130,238,1)',
            width: '2',
        }),
        fill: new ol.style.Fill({
            color: 'rgba(238,130,238,.25)',
        }),
    }),
});

function vizGaz(selectedIntE,selectedIntU, selectedIntN){
    //Update Gaz Totals
    var vectorSource = vectorSourceStories;
    // Get EGaz map images
    if (selectedIntE.length > 0){
        mapEgazFilter = "e_id IN ("+selectedIntE+")";
        //Get Egaz extent
        var wfs_url_E = 'http://localhost:8080/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=apregoar:egazetteer&cql_filter='+mapEgazFilter+'&outputFormat=application/json';
        fetch(wfs_url_E).then(function (response) {
            jsonE = response.json();
            return jsonE;
        })
        .then(function (jsonE) {
            const featuresE = new ol.format.GeoJSON().readFeatures(jsonE);
            if (featuresE.length < selectedIntE.length){
                window.alert("Cuidade! Todos elementos não foram carregados (",featuresE.length," de ",selectedIntE.length," com successo).");
            }
            vectorSource.addFeatures(featuresE);
            layerExtent = zoomGaz(vectorSource);
            return vectorSource;
        });
        // Add eGaz shapes     
        wmsLayerEGaz.setOpacity(0.5);
        wmsSourceEGaz.updateParams({
            "LAYERS": "apreagoar:egazetteer",
            "cql_filter": mapEgazFilter
        });
    } else {
        wmsSourceEGaz.updateParams({
            "LAYERS": "apreagoar:egazetteer",
            "cql_filter": "e_id = 0"
        });
    }
    if(selectedIntU.length > 0){
        mapUgazFilter = "p_id IN ("+selectedIntU+")";
        // Get Ugaz extent
        var wfs_url_U= 'http://localhost:8080/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=apregoar:access_ugaz&cql_filter='+mapUgazFilter+'&outputFormat=application/json';
        fetch(wfs_url_U).then(function (response) {
            jsonU = response.json();
            return jsonU;
        })
        .then(function (jsonU) {
            const featuresU = new ol.format.GeoJSON().readFeatures(jsonU);
            if (featuresU.length < selectedIntU.length){
                window.alert('Cuidade! Todos elementos não foram carregados.');
            }
            vectorSource.addFeatures(featuresU);
            layerExtent = zoomGaz(vectorSource);
            return vectorSource;
        });
        // Add eGaz shapes     
        wmsLayerUGaz.setOpacity(0.5);
        wmsSourceUGaz.updateParams({
            "LAYERS": "apreagoar:access_ugaz",
            "cql_filter": mapUgazFilter
        });
    } else {
        wmsSourceUGaz.updateParams({
            "LAYERS": "apreagoar:access_ugaz",
            "cql_filter": "p_id = 0"
        });
    }
    return {selectedIntE,selectedIntU}
}


//Update Gaz Totals
function updateGazTotals(uGaz,gazL) {
    console.log("entering updateGazTotals()");
    var totalEGaz = document.getElementById("totalEGaz");
    var totalUGaz = document.getElementById("totalUGaz");
    var totalNumGaz = document.getElementById("totalNumGaz");
    var alertPoly = document.getElementById("alertPoly");
    var totalGazDiv = document.getElementById("totalGazDiv");
    tGaz = uGaz + gazL;
    totalEGaz.innerHTML = gazL;
    totalUGaz.innerHTML = uGaz;
    totalNumGaz.innerHTML = tGaz;
    if (tGaz == 0) {
        alertPoly.style.display="block";
        alertPoly.style.color="var(--danger-color)";
        totalGazDiv.style.backgroundColor="var(--danger-colorL)";
        //totalNumGaz.style.color="red";
    } else {
        alertPoly.style.display="none";
        totalGazDiv.style.backgroundColor="transparent";
        //totalNumGaz.style.color="green";
    }
    //console.log("total gaz features selected: ", tGaz)
    console.log("leaving updateGazTotals()")
    return tGaz;
};

//Return to previous story button
const btnReturn = document.getElementById("btnReturn");
btnReturn.innerHTML = '<a href="/publisher/'+sID+'/review"> <button type ="button" class="btn btn-primary">Volta à notícia</button> </a>';

//Setting default temporal inputs
document.getElementsByName("allDay").value="allday_y";
const tBeginInput = document.getElementById("tBegin");
const tEndInput = document.getElementById("tEnd");
tBeginInput.type="date";
tEndInput.type="date";

tBeginInput.valueAsDate= new Date();
tEndInput.valueAsDate= new Date();

/* Switching between date and datetime temporal inputs */
function timeDefH(){
    var tBVal = new Date(document.getElementById("tBegin").value);
    var tEVal = new Date(document.getElementById("tEnd").value);
    var allDay = document.getElementsByName("allDay");
    allDay.value = "allday_n";
    tBText = tBVal.toISOString().substring(0,16);
    tEText = tEVal.toISOString().substring(0,16);
    console.log("tBText: ")
    console.log(tBText);
    var tBeginInput = document.getElementById("tBegin");
    var tEndInput = document.getElementById("tEnd");
    tBeginInput.type = 'datetime-local';
    tEndInput.type = 'datetime-local';
    tBeginInput.value = tBText;
    tEndInput.value = tEText;
    tBeginInput.style.display = 'block';
    tEndInput.style.display = 'block';
}
function timeDefD(){
    var tBVal = new Date(document.getElementById("tBegin").value);
    var tEVal = new Date(document.getElementById("tEnd").value);
    var allDay = document.getElementsByName("allDay");
    allDay.value = "allday_y";
    tBText = tBVal.toISOString().substring(0,10);
    tEText = tEVal.toISOString().substring(0,10);
    console.log("tBText");
    console.log(tBText);
    const tBeginInput = document.getElementById("tBegin");
    const tEndInput = document.getElementById("tEnd");
    tBeginInput.type = 'date';
    tEndInput.type = 'date';
    tBeginInput.value = tBText;
    tEndInput.value = tEText;
    tBeginInput.style.display = 'block';
    tEndInput.style.display = 'block';
}
function timeDefP(){
    var tBVal = new Date(document.getElementById("tBegin").value);
    var tEVal = new Date(document.getElementById("tEnd").value);
    var allDay = document.getElementsByName("allDay");
    allDay.value = "allday_p";
    tBText = tBVal.toISOString().substring(0,10);
    tEText = tEVal.toISOString().substring(0,10);
    console.log("tBText");
    console.log(tBText);
    const tBeginInput = document.getElementById("tBegin");
    const tEndInput = document.getElementById("tEnd");
    tBeginInput.type = 'date';
    tEndInput.type = 'date';
    tBeginInput.value = tBText;
    tEndInput.value = tEText;
    tBeginInput.style.display = 'none';
    tEndInput.style.display = 'none';
}

//Establishing connections to html elements
const answer = document.getElementById('calculated-area');
const saveG = document.getElementById('selectGeom');
const saveN = document.getElementById('selectName');
const saveD = document.getElementById('selectDesc');
const saveB = document.getElementById('formButton');
saveG.innerHTML = `Desenhar um ou mais áreas.`;
const numPoly = 0;
answer.innerHTML = `<strong>${numPoly}</strong>`;

function limparGazSelect(selectGaz) {
    for (var i = 0; i < selectGaz.length; i++) {
        selectGaz[i].selected = false;
    }
}

// Clear the existing values
function limparTudo() {
    location.reload();
    console.log("should be clean");

}

function submitInstance() {
    
    // Get all checked values
    console.log("Beginning Submit");
    results = initGaz("submitInstance");
    tGaz = results.tGaz;
    selectedIntE = results.selectedIntE;
    selectedIntU = results.selectedIntU;
    var selectedIntN = results.selectedIntN;

    // Get form values for validation
    var eName = document.getElementById("eName");
    var eDesc = document.getElementById("eDesc");
    var pNamef = document.getElementById("pName");
    var pDescf = document.getElementById("pDesc");
    var tBeginf = document.getElementById("tBegin");
    var tEndf = document.getElementById("tEnd");
    var tDescf = document.getElementById("tDesc");
    var allDay = document.getElementsByName("allDay");
    console.log("tBeginf.value: ",tBeginf.value)
    console.log("allDay value: ",allDay.value);
    // Geovalues: polyJson is UGaz definition. selectedP is EGaz definition.
    // Get validation announcement areas
    var successAnnouncement = document.getElementById("successAnnouncement");
    var validation = document.getElementById("validation");
    //Check for places assigned
    var faltas = [];
    console.log("tGaz: ",tGaz);
    if (! eName.value){
        faltas.push(" "+eName.placeholder);
    }

    if (! pNamef.value){
        console.log('pNamef: ');
        console.log(pNamef);
        faltas.push(" "+pNamef.placeholder);
        console.log('faltas: ',faltas);
    }
    if (tGaz == 0){
        console.log("No geometry associated");
        faltas.push(" Geometria");
    }
    console.log("allDay.value: ",allDay.value);
    if (allDay.value !== "allday_p") {
        if (! tBeginf.value) {
            console.log('tBeginf: ');
            console.log(tBeginf);
            faltas.push(" Tempo do início");
        }
        if (! tEndf.value) {
            console.log('tEndf: ');
            console.log(tEndf);
            faltas.push(" Tempo do fim");
        }
        if (tEndf.value < tBeginf.value){
            console.log("Ending before beginning");
            faltas.push(" Altura fecha antes o início")
        }
    }     
    if (faltas.length > 0){
        faltasText = "";
        for (f in faltas){
            faltasText = faltasText + faltas[f];
        };
        console.log("faltasText: ",faltasText);
        window.alert("Falta alguns campos requeridos: "+faltasText);
        validation.style.display="block";
        successAnnouncement.style.display="block";
        successAnnouncement.innerHTML = `<em style="color:var(--danger-color)">Falta: ${faltas}</em>`;
        
        return
    } else {
        console.log("Preparating of entry");
        if (allDay.value !=="allday_p") {
            console.log("Scenario: Specific time defined")
            var tBeginVal = tBeginf.value;
            var tEndVal = tEndf.value;
            
        } else {
            console.log("Scenario: Persistent time")
            var tBeginVal = null;
            var tEndVal = null;
        }
        console.log("tBeginVal: ",tBeginVal);
        console.log("tEndVal: ",tEndVal);
        //Remove validation commentary
        validation.style.display="none";
        successAnnouncement.style.display="none";
        //Prepare data for sending to flask
        var entry = {
            type: "Feature",
            properties: {
                eName: eName.value,
                eDesc: eDesc.value,
                pName: pNamef.value,
                pDesc: pDescf.value,
                allDay: allDay.value,
                tBegin: tBeginVal,
                tEnd: tEndVal,
                tDesc: tDescf.value,
                eIds: selectedIntE,
                pIds: selectedIntU,
                nominatims: selectedIntN,
            },
            geometry: polyJson
        };
        console.log("entry: ",entry);
        console.log("entry properties: ",entry.properties);
        //Send to flask
        //spinner.removeAttribute('hidden');
        fetch(`${window.origin}/publisher/${sID}/save_instance`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(entry),
            cache: "no-cache",
            headers: new Headers({
                "content-type": "application/json"
            })
        })
        .then(function(response) {
            if (response.status !== 200) {
                window.alert("Error");
                console.log(`Looks like there was a problem. Status code: ${response.status}`);
                return;
            }
            response.json().then(function(data) {
                console.log(data);
                let maisUm = confirm("Parabéns! A instância foi guardada com sucesso. Quer associar mais uma instância?")
                if (maisUm) {
                    location.reload();
                } else {
                    window.location.href = "review";
                }
                //spinner.setAttribute('hidden','');
            });
        })
        .catch(function(error) {
        console.log("Fetch error: " + error);
        });

    }
};

function validateFile() {
    console.log("Entering validateFile");
    let filesToLoad = document.getElementById("uploadFile").files;
    console.log("filesToLoad: ",filesToLoad);
};


  /* Collapsible */
var coll = document.getElementsByClassName("collapsible");
var c_index;

for (c_index = 0; c_index < coll.length; c_index++) {
  coll[c_index].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  });
};


/* On click identify selected items */
function showSelected(selectElement,targetSpan){
    var selectedNames = "";
    for (let i=0;i<selectElement.children.length;i++){
        if (selectElement.children[i].selected == true){
            console.log("option name: ",selectElement.children[i]);
            selectedNames = selectedNames + selectElement.children[i].outerText + ", ";
        };
    };
    if (selectedNames.length > 0){
        selectedNames = selectedNames.slice(0,-2);
        //console.log("selectedNames: ",selectedNames);
        document.getElementById(targetSpan).innerHTML = "(Selecionados: "+selectedNames+")";
    } else {
        document.getElementById(targetSpan).innerHTML = "";
    };
    
};


/*
https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications
function FileUpload(img, file) {
    const reader = new FileReader();
    this.ctrl = createThrobber(img);
    const xhr = new XMLHttpRequest();
    this.xhr = xhr;
  
    const self = this;
    this.xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded * 100) / e.total);
            self.ctrl.update(percentage);
          }
        }, false);
  
    xhr.upload.addEventListener("load", (e) => {
            self.ctrl.update(100);
            const canvas = self.ctrl.ctx.canvas;
            canvas.parentNode.removeChild(canvas);
        }, false);
    xhr.open("POST", "http://demos.hacks.mozilla.org/paul/demos/resources/webservices/devnull.php");
    xhr.overrideMimeType('text/plain; charset=x-user-defined-binary');
    reader.onload = (evt) => {
      xhr.send(evt.target.result);
    };
    reader.readAsBinaryString(file);
  }
  
  function createThrobber(img) {
    const throbberWidth = 64;
    const throbberHeight = 6;
    const throbber = document.createElement('canvas');
    throbber.classList.add('upload-progress');
    throbber.setAttribute('width', throbberWidth);
    throbber.setAttribute('height', throbberHeight);
    img.parentNode.appendChild(throbber);
    throbber.ctx = throbber.getContext('2d');
    throbber.ctx.fillStyle = 'orange';
    throbber.update = (percent) => {
      throbber.ctx.fillRect(0, 0, throbberWidth * percent / 100, throbberHeight);
      if (percent === 100) {
        throbber.ctx.fillStyle = 'green';
      }
    }
    throbber.update(0);
    return throbber;
  }
  */ 