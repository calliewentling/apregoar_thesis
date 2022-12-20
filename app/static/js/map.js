let colorOpac = .3;

String.prototype.convertToRGB = function(){
    if(this.length != 6){
        throw "Only six-digit hex colors are allowed.";
    }

    var aRgbHex = this.match(/.{1,2}/g);
    var aRgb = [
        parseInt(aRgbHex[0], 16),
        parseInt(aRgbHex[1], 16),
        parseInt(aRgbHex[2], 16)
    ];
    return aRgb;
}

let tempColor1 = getComputedStyle(document.documentElement).getPropertyValue('--apr-color1').replace('#','').trim();
let aprColor1 = tempColor1.convertToRGB();
let aprColor1O = tempColor1.convertToRGB();
aprColor1O[3] = colorOpac;
let tempColor1L = getComputedStyle(document.documentElement).getPropertyValue('--apr-color1L').replace('#','').trim();
let aprColor1L = tempColor1L.convertToRGB();
let aprColor1LO = tempColor1L.convertToRGB();
aprColor1LO[3] = colorOpac;

let tempColor2 = getComputedStyle(document.documentElement).getPropertyValue('--apr-color2').replace('#','').trim();
let aprColor2 = tempColor2.convertToRGB();
let aprColor2O = tempColor2.convertToRGB();
aprColor2O[3] = colorOpac;
let tempColor2L = getComputedStyle(document.documentElement).getPropertyValue('--apr-color2L').replace('#','').trim();
let aprColor2L = tempColor2L.convertToRGB();
let aprColor2LO = tempColor2L.convertToRGB();
aprColor2LO[3] = colorOpac;

let tempColor3 = getComputedStyle(document.documentElement).getPropertyValue('--apr-color3').replace('#','').trim();
let aprColor3 = tempColor3.convertToRGB();
let aprColor3O = tempColor3.convertToRGB();
aprColor3O[3] = colorOpac;
let tempColor3L = getComputedStyle(document.documentElement).getPropertyValue('--apr-color3L').replace('#','').trim();
let aprColor3L = tempColor3L.convertToRGB();
let aprColor3LO = tempColor3L.convertToRGB();
aprColor3LO[3] = colorOpac;

//// Initialize loader ////
//const spinner = document.getElementById("spinner");

/**
* Elements that make up the popup.
*/

var docTitle = document.title;
console.log(docTitle);
const container = document.getElementById('popup');
const storyContent = document.getElementById('popup-story');
const instContent = document.getElementById('popup-instances');
const closer = document.getElementById('popup-closer');
const popupScroll = document.getElementById('popupScroll');
const popupScrollL = document.getElementById('scrollL');
const popupScrollR = document.getElementById('scrollR');
const popupScrollCount = document.getElementById('scrollCount');
 
/**
* Create an overlay to anchor the popup to the map.
*/
const overlay = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250,
    },
});
 
/**
* Add a click handler to hide the popup.
* @return {boolean} Don't follow the href.
*/
if (closer) {
    closer.onclick = function () {
        overlay.setPosition(undefined);
        closer.blur();
        return false;
    };
}


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

 
const key = 'Jf5RHqVf6hGLR1BLCZRY';
const attributions =
    '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> ' +
    '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';
 


//Styling layers
const styleStory = [
    new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'transparent',
            width: '3',
        }),
        fill: new ol.style.Fill({
            color: aprColor1O,
        }),
    }),
];


//Generic Map Setup
const view = new ol.View({
    projection: 'EPSG:4326',
    center: [-9.150404956762742,38.72493479806579],
    zoom: 12
});


 
var map = new ol.Map({
    /*layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],*/
    overlays: [overlay],
    target: 'map',
    view: view,
});

const backDrop = new ol.layer.Tile({
    source: new ol.source.Stamen({
        layer: 'toner-lines',
    }),
});

map.addLayer(backDrop);

document.getElementById("map").classList.add("skeleton");

// Add Story shapes

const wmsSourceStory = new ol.source.ImageWMS({
    url: 'http://localhost:8080/geoserver/apregoar/wms',
    /*params: {"LAYERS":"apregoar:geonoticias"},*/ //OG
    params: {"LAYERS":"apregoar:geonoticias",
        "cql_filter":mapStoryFilter}, //Set on each individual page
    serverType: 'geoserver',
    crossOrigin: 'anonymous',
});
const wmsLayerStory = new ol.layer.Image({
    source: wmsSourceStory,
    style: styleStory,
});
wmsLayerStory.setOpacity(0.7);
map.addLayer(wmsLayerStory);
console.log("Story instances added");

//Progress bar
wmsSourceStory.on('imageloadstart', function () {
    progress.addLoading();
});

wmsSourceStory.on('imageloadend', function() {
    progress.addLoaded();
});

wmsSourceStory.on('imageloaderror', function() {
    progress.addLoaded();
})

//Zoom to instances
let layerExtent;
let ymax = 39.83801908704823;
let xmax = -7.74577887999189;
let ymin = 38.40907442337447;
let xmin = -9.517104891617194;
//Extent order: [xmin, ymin, xmax, ymax]

const maxExtent = ol.extent.boundingExtent([[xmin,ymin],[xmax,ymin],[xmin,ymax],[xmax,ymax]]);
console.log("maxExtent: ",maxExtent);


const vectorSource = new ol.source.Vector();
//spinner.removeAttribute('hidden');
var wfs_url = 'http://localhost:8080/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=apregoar:geonoticias&cql_filter='+mapStoryFilter+'&outputFormat=application/json';
fetch(wfs_url).then(function (response) {
    json = response.json();
    console.log("JSON: ",json);
    return json;
})
.then(function (json) {
    const features = new ol.format.GeoJSON().readFeatures(json);
    console.log("Features: ",features);
    if (features[0]["A"]["st_astext"]) {
        console.log("Arrival to add features and future zoom")
        vectorSource.addFeatures(features);
        layerExtent = vectorSource.getExtent();
        isInfinite = false;
        for (coord in layerExtent){
            if (!isFinite(layerExtent[coord])){
                console.log("coord is infinite");
                isInfinite = true;
            } else {
                console.log("coord is finite");
            }
        };
        if (isInfinite == false){
            console.log("layerExtent: ",layerExtent);
            const currentExtent = ol.extent.getIntersection(layerExtent,maxExtent);
            console.log("currentExtent: ",currentExtent);
            map.getView().fit(currentExtent); //What does this number mean??
        } 
        //map.getView().fit(ol.extent.buffer(layerExtent, .01)); //What does this number mean??
        //spinner.setAttribute('hidden', '');
        document.getElementById("map").classList.remove("skeleton");
    }   
});
///

/**
* Add a click handler to the map to render the popup
*/


map.on('singleclick', function (evt) {
    console.log("entering map.onclick");
    const coordinate = evt.coordinate;
    popupF = vectorSource.getFeaturesAtCoordinate(coordinate);
    console.log("popupF: ",popupF);
    if (popupF.length > 0){
        popupInstances = [];
        popupIndex = 0;
        for (let i = 0; i< popupF.length; i++){
            popupInstances.push(popupF[i]["A"]["i_id"]);
        };
        updatePopup(instanceID = popupInstances[0]);
        if(popupInstances.length>1){
            popupScrollCount.innerHTML = popupIndex+1+"/"+popupInstances.length;
            popupScroll.style.display="block";
        } else {
            popupScroll.style.display="none";
        };
        /* Set Position */
        overlay.setPosition(coordinate);
    } else {
        overlay.setPosition(undefined);
    };
})

let popupIndex = 0;
let popupInstances = [];
let popupF;

function updatePopup(instanceID){
    console.log("Entering updatePopup("+instanceID+")");
    for (f=0;f<popupF.length;f++){
        if(popupF[f]["A"]["i_id"]==instanceID){
            poppedF = popupF[f]["A"];
            /* Preparing story info */
            var title = [];
            var webLink =[];
            var message = [];
            var pName = [];
            var pDesc = [];
            var tBegin = [];
            var tEnd = [];
            var tDesc = [];
            sID = poppedF.s_id;
            title = poppedF.title;
            summary = poppedF.summary;
            pubDate = new Date(poppedF.pub_date);
            webLink =poppedF.web_link;
            section = poppedF.section;
            tags = poppedF.tags.replaceAll(',',', ');
            author = poppedF.author;
            publication = poppedF.publication;

            /* Preparing instance info */
            iID = poppedF.i_id;
            tBegin = new Date(poppedF.t_begin);
            tEnd = new Date(poppedF.t_end);
            //console.log("tBegin type: "+typeof(tBegin)+', value: '+tBegin);
            tType = poppedF.t_type;
            tDesc = poppedF.t_desc;
            pDesc = poppedF.p_desc;
            pID = poppedF.p_id;
            pName = poppedF.p_name;
            pGeom = poppedF.geom;

            /* Publisher: All Stories Popup */
            var storyBlock = 
                '<h3>' + title + '</h3>' +
                '<em>' + pubDate.toDateString() + '</em>'+
                '<p> <b>' + section + '</b>: ' + tags + '</p>' +  
                //'<a href="' + webLink +'"> Notícia </a>';
                '<a href=/jornal/'+sID+'/historia> Notícia publicada </a>'+
                '<a href=/publisher/'+sID+'/review> Editar </a>';
            
            /* Publisher: Story Review Popup */
            var instanceBlock = 
                '<h3>' + pName + '</h3>' +
                '<p>'+pDesc+'</p>' +
                '<em> <p>'+tBegin.toDateString()+' - '+tEnd.toDateString()+'</p>'+
                '<p>'+tDesc+'</p></em>';
            

            if (docTitle === "Review") {
                console.log("In Review if");
                console.log("docTitle: "+docTitle);
                instContent.innerHTML = instanceBlock;
            } else if (docTitle === "Dashboard") {
                console.log("In DASHBOARD if");
                console.log("docTitle: "+docTitle);
                storyContent.innerHTML = storyBlock;
            } else if (docTitle === "Localize"){
                console.log("In LOCALIZE if docTitle: "+docTitle);
            } else {
                console.log("In else");
                console.log("docTitle: "+docTitle);
                if (storyContent) {
                    storyContent.innerHTML = storyBlock;
                }
            }
            break
        }
    }
    console.log("Leaving updatePopup");
};

popupScrollL.onclick = function(){
    console.log("popupInstances: ",popupInstances);
    console.log("popupIndex: ",popupIndex);
    if (popupIndex ==0){
        popupIndex = popupInstances.length-1;
    } else {
        popupIndex = popupIndex-1;
    }
    popupScrollCount.innerHTML = popupIndex+1+"/"+popupInstances.length;
    updatePopup(instanceID = popupInstances[popupIndex]);
};

popupScrollR.onclick = function(){
    console.log("popupInstances: ",popupInstances);
    console.log("popupIndex: ",popupIndex);
    if (popupIndex ==popupInstances.length-1){
        popupIndex = 0;
    } else {
        popupIndex = popupIndex+1;
    }
    popupScrollCount.innerHTML = popupIndex+1+"/"+popupInstances.length;
    updatePopup(instanceID = popupInstances[popupIndex]);
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
  