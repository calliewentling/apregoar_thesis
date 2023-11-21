console.log("Entering jornal.js");
console.log("publication: ",publication);

/**
 * DEFINITIONS
 */

 let pubColor;
 let url;
 var layerExtent;
 var numStoryFeatures;
 let vSource;
 let vectorLayer;
 let resultsStory;
 let stories;

 let eBoundary;
 let eLayerExtent;
 var eBounds = false;

 $(':root').css("--windowHeight", $( window ).height() );

pubColor = setColors();

const eGazColor = '#f56c42';
document.documentElement.style.setProperty('--egaz-color',eGazColor);

const key = 'Jf5RHqVf6hGLR1BLCZRY';
const attributions =
    '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> ' +
    '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';
/**
* Elements that make up the popup.
*/
var docTitle = document.title;
//console.log(docTitle);
const containerPop = document.getElementById('popup');
const storyContent = document.getElementById('popup-story');
const instContent = document.getElementById('popup-instances');
const closer = document.getElementById('popup-closer');
const pageahead = document.getElementById('popup-pageahead');
const pagebehind = document.getElementById('popup-pagebehind');
const popupinstancecount = document.getElementById('popup-instance-count');
/**
* Create an overlay to anchor the popup to the map.
*/
const overlay = new ol.Overlay({
    element: containerPop,
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
        closePopup();
    };
}

function closePopup(){
    overlay.setPosition(undefined);
    featureFocus.getSource().clear();
    featureOverlay.getSource().clear();
    closer.blur();
    return false;
};

/**
* Add a click handler to page through popups.
* @return {boolean} Don't follow the href.
*/
var popupInstances = [];
var currentF = 0;
var featureCount = document.getElementById('featureCount');
if (pageahead) {
    pageahead.onclick = function () {
        //console.log("entered pageahead");
        //console.log("popupInstances from pageahead: ",popupInstances);
        //console.log("popupInstances.length: ", popupInstances.length);
        //console.log("currentF: ",currentF);
        if (currentF+1 == popupInstances.length){
            var nextF = 0;
        } else {
            var nextF = currentF + 1;
        }
        //console.log("nextF: ",nextF);
        displayCount = nextF + 1;
        featureFocus.getSource().clear();
        featureFocus.getSource().addFeature(popupFeatures[nextF]);
        popupinstancecount.innerHTML = displayCount+'/'+popupInstances.length;
        //featureCount.innerHTML = displayCount+'/'+popupInstances.length;
        instContent.innerHTML = popupInstances[nextF]["instanceBlock"];
        //highlightInstance(popupInstance=popupInstances[nextF].properties.i_id);
        currentF = nextF;
        return false;
    };
}
if (pagebehind) {
    pagebehind.onclick = function () {
        //console.log("entered pagebehind");
        //console.log("popupInstances from pagebehind: ",popupInstances);
        if (currentF == 0){
            nextF = popupInstances.length-1;
        } else {
            nextF = currentF - 1;
        }
        //console.log("nextF: ",nextF);
        displayCount = nextF + 1; //Instead of number "0" display "1"
        featureFocus.getSource().clear();
        featureFocus.getSource().addFeature(popupFeatures[nextF]);
        popupinstancecount.innerHTML = displayCount+'/'+popupInstances.length;
        //featureCount.innerHTML = displayCount+'/'+popupInstances.length;
        instContent.innerHTML = popupInstances[nextF]["instanceBlock"];
        currentF = nextF;
        return false;
    };
}

//Generic Map Setup
const view = new ol.View({
    projection: 'EPSG:4326',
    center: [-9.150404956762742,38.72493479806579],
    zoom: 12
});

var map = new ol.Map({
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    overlays: [overlay],
    target: 'map',
    view: view,
    controls: ol.control.defaults().extend([new ol.control.FullScreen()])
});

/*ADJUST BASEMAP COLORING */
//https://codesandbox.io/s/globalcompositeoperation-fktwf
map.render();
map.getLayers().getArray()[0].on("postrender", function(evt){
    evt.context.globalCompositeOperation = "color";
    if (evt.context.globalCompositeOperation === "color"){
        evt.context.fillStyle = "rgba(255,255,255,.5)";
        evt.context.fillRect(0,0,evt.context.canvas.width,evt.context.canvas.height);
    }
    evt.context.globalCompositeOperation = "source-over";
});

/* Preparing highlight maps of selected instances */
fillColor = 'rgba(255,255,255,.25)';
const style = new ol.style.Style({
    fill: new ol.style.Fill({
        color: fillColor,
        //opacity: .002,
    }),
    stroke: new ol.style.Stroke({
        color: pubColor,
        width: 3,
    }),
    text: new ol.style.Text({
        font: '12px Calibri,sans-serif',
        fill: new ol.style.Fill({
            color: pubColor,
        }),
        stroke: new ol.style.Stroke({
            color: '#fff',
            width: 3,
        }),
    }),
})


const styleJE = new ol.style.Style({
    fill: new ol.style.Fill({
        color: pubColor+'33', //1A: 10%, 33: 20%
    }),
    stroke: new ol.style.Stroke({
        color: pubColor,
        width: 1,
    }),
})
//Setting styles of vector layers
const highlightStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: pubColor+'1A',
        width: 3,
    }),
    fill: new ol.style.Fill({
        color: fillColor,
    }),
    text: new ol.style.Text({
        font: '14px Calibri,sans-serif',
        fill: new ol.style.Fill({
            color: pubColor,
        }),
        stroke: new ol.style.Stroke({
            color: '#fff',
            width: 3,
        }),
    }),
});

const infoStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: '#fff',
        width: 3,
    }),
    fill: new ol.style.Fill({
        color: pubColor+'1A',
    }),
    /*text: new ol.style.Text({
        font: '14px Calibri,sans-serif',
        fill: new ol.style.Fill({
            color: pubColor,
        }),
        stroke: new ol.style.Stroke({
            color: '#fff',
            width: 3,
        }),
    }),*/
});

const highlightFocus = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: '#ffff33',
        width: 3,
    })
})

const hoverOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    map: map,
    style: function (feature) {
        highlightStyle.getText().setText(feature.get('p_name'));
        return highlightStyle;
    },
});
const featureOverlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    map: map,
    style: infoStyle,
    /*style: function (feature) {
        infoStyle.getText().setText(feature.get('p_name'));
        return infoStyle;
    },*/
});
const featureFocus = new ol.layer.Vector({
    source: new ol.source.Vector(),
    map: map,
    style: highlightFocus,
});


const eBoundaryStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
        color: eGazColor,
        width: 5,
    }),
    fill: new ol.style.Fill({
        color: eGazColor +'80',
        opacity: .2,
    }),
    text: new ol.style.Text({
        font: '14px Calibri,sans-serif',
        fill: new ol.style.Fill({
            color: eGazColor,
        }),
        stroke: new ol.style.Stroke({
            color: '#fff',
            width: 3,
        }),
    }),
});

var eBoundaryL = new ol.layer.Vector({
    source: new ol.source.Vector(),
    map: map,
    style: function(feature) {
        eBoundaryStyle.getText().setText(feature.get('name'));
        return eBoundaryStyle;
    },
});

let highlight;
let getInfo;



const displayFeatureInfo = function (pixel, popupFeatures, type) {
    console.log("Entering displayFeatureInfo(pixel=",pixel,", popFeatures=",popupFeatures,", type=",type,")");
    if (popupFeatures.length>0) {
        console.log("popupFeatures.length>0");
        popupInstances = [];
        for (let f=0; f < popupFeatures.length; f++) {
        //for (let f = 0; f < 1; f++) {
            /* Preparing story info */
            var sID = popupFeatures[f]["A"]["s_id"];
            var title = popupFeatures[f]["A"]["title"];
            var summary = popupFeatures[f]["A"]["summary"];
            var pubDate = new Date(popupFeatures[f]["A"]["pub_date"]);
            var webLink = popupFeatures[f]["A"]["web_link"];
            var section = popupFeatures[f]["A"]["section"];
            var tags = popupFeatures[f]["A"]["tags"];
            var author = popupFeatures[f]["A"]["author"];
            var publicationPop = popupFeatures[f]["A"]["publication"];

            /* Preparing instance info */
            var iID = popupFeatures[f]["A"]["i_id"];
            var tBegin = new Date(popupFeatures[f]["A"]["t_begin"]);
            var tEnd = new Date(popupFeatures[f]["A"]["t_end"]);

            //console.log("tBegin type: "+typeof(tBegin)+', value: '+tBegin);
            var tType = popupFeatures[f]["A"]["t_type"];
            console.log("tType = ",tType);
            if (tType == "allday_y"){
                if (tBegin == tEnd){
                    var vizDate = '<p><em>'+tBegin.toDateString()+'</em></p>';
                } else {
                    var vizDate  = '<p><em>'+tBegin.toDateString()+' - '+tEnd.toDateString()+'</em></p>';
                }
            } else if (tType == "allday_n"){
                if (tBegin.toDateString() == tEnd.toDateString()){
                    var vizDate = '<p><em>'+tBegin.toDateString()+'</em>'+tBegin.toTimeString()+' - '+tEnd.toTimeString()+'</p>'; 
                } else {
                    var vizDate = '<p><em>'+tBegin.toDateString()+'</em>'+tBegin.toTimeString()+' - <em>'+tEnd.toDateString()+'</em> '+tEnd.toTimeString()+'</p>'; 
                }
            } else {
                vizDate = 'Sem prazo';
            }
            console.log("vizDate: ",vizDate);
            var tDesc = popupFeatures[f]["A"]["t_desc"];
            var pDesc = popupFeatures[f]["A"]["p_desc"];
            var pID = popupFeatures[f]["A"]["p_id"];
            var pName = popupFeatures[f]["A"]["p_name"];
            var pGeom = popupFeatures[f]["A"]["geom"];

            /* Publisher: All Stories Popup */
            var storyBlock = 
                '<h3>' + title + '</h3>' +
                '<em>' + pubDate.toDateString() + '</em>'+
                '<p> <b>' + section + '</b>: ' + tags + '</p>' +  
                '<a href="/jornal/' + sID +'/historia"> Notícia </a>';
        
            /* Publisher: Story Review Popup */
            var instanceBlock = 
                '<h3>' + pName + '</h3>' +
                '<p>'+pDesc+'</p>' +
                vizDate +
                '<p>'+tDesc+'</p>';
            
            /*Publisher: Tag review Popup */
            var tagBlock = 
                '<h3>'+pName+'</h3>'+
                '<em>'+vizDate+'</em>'+
                '<p>'+title+' ('+pubDate.toDateString()+')</p>';

            //Constructing geojson reference
            console.log("type = ",type);
            popupInstances[f] = {
                "iID": iID,
                "tDesc": tDesc,
                "pDesc": pDesc,
                "pName": pName,
            }
            let priority = []
            const priorityEval = ["i_name","i_desc","p_name","p_desc"];
            let block;
            if (type == "article") {
                for (var k=0; k<priorityEval.length; k++){
                    console.log("priorityEval[k]: ",priorityEval[k]);
                    console.log("popupFeatures[f]['A'][priorityEval[k]]: ",popupFeatures[f]["A"][priorityEval[k]]);
                    if (popupFeatures[f]["A"].hasOwnProperty(priorityEval[k]) && popupFeatures[f]["A"][priorityEval[k]] != null){
                        if (popupFeatures[f]["A"][priorityEval[k]] === "context"){
                            priority.push("Contextual");
                        } else if (popupFeatures[f]["A"][priorityEval[k]].length>0){
                            priority.push(popupFeatures[f]["A"][priorityEval[k]]);
                        } 
                    }
                }                               
                console.log("priority: ",priority);
                block = '<h3 class="blockTitle">'+priority[0]+'</h3>';
                if (priority.length>1){
                    block = block + '<p style="font-weight:bold">'+priority[1]+'</p>';
                    if (priority.length>2){
                        block = block + '<p>'+priority[2];
                        if (priority.length>3){
                            block = block + ': '+priority[3];
                        }
                        block = block+'</p>';
                    }
                }
                block = block + '<p>'+vizDate+'</p>'+tDesc;

                //popupInstances[f]["instanceBlock"] = instanceBlock;
                popupInstances[f]["instanceBlock"] = block;
            } else if (type == "explore"){
                popupInstances[f]["instanceBlock"] = storyBlock; //change this

            } else {
                console.log("type != article");
                popupInstances[f]["instanceBlock"] = tagBlock;
            }
        }
        //console.log("popupInstances");
        //console.log(popupInstances);
        currentF = 0;
        displayCount = currentF+1;
        featureFocus.getSource().clear();
        featureFocus.getSource().addFeature(popupFeatures[currentF]);
        popupinstancecount.innerHTML = displayCount+'/'+popupInstances.length;
        //featureCount.innerHTML = displayCount+'/'+popupFeatures.length;
        instContent.innerHTML = popupInstances[currentF]["instanceBlock"];        
        /* Set Position */
        overlay.setPosition(coordinate);
    }else{ //If click doesn't hit a polygon
        console.log("no features found");
        overlay.setPosition(undefined);
    }
    
    var featureLength = popupFeatures.length;
    //console.log("Number of features: ",featureLength);

    if (popupFeatures.length > 0){
        var infoFeature = [];
        for (var i=0; i<popupFeatures.length; ++i){
            infoFeature.push(popupFeatures[i].get('p_name'));
        }
        if (popupFeatures.length == 1){
            pageahead.style.display = "none";
            pagebehind.style.display = "none";
        } else {
            pageahead.style.display = "block";
            pagebehind.style.display = "block";
        }
    } 
    featureOverlay.getSource().clear();
    for (let i = 0; i<featureLength; i++) {
        console.log("adding features to feature overlay");
        featureOverlay.getSource().addFeature(popupFeatures[i]);
    }
    console.log("Leaving displayFeatureInfo");
};
const highlightInstance = function (pixel) {
    const feature = map.forEachFeatureAtPixel(pixel, function (feature) {
        return feature;
    });    
    if (feature !== highlight) {
        if (highlight) {
            hoverOverlay.getSource().removeFeature(highlight);
        }
        if (feature) {
            hoverOverlay.getSource().addFeature(feature);
        }
        highlight = feature;
    }
};

let popupFeatures;
let popupTags;
map.on('click', function (evt) {
    console.log("Entering map on click");
    coordinate = evt.coordinate;
    featureFocus.getSource().clear();
    console.log("Cleared feature focus source");
    console.log("currentZIndex: ",currentZIndex);
    //popupFeatures = vSource.getFeaturesAtCoordinate(coordinate);
    if (currentZIndex > 1){
        popupFeatures = tagSource.getFeaturesAtCoordinate(coordinate);
        console.log("popupFeatures: ",popupFeatures);
        displayFeatureInfo(evt.pixel, popupFeatures, type="tag");
    } else {
        popupFeatures = vSource.getFeaturesAtCoordinate(coordinate);
        console.log("popupFeatures: ",popupFeatures);
        if (doc_source == "historias"){
            
            displayFeatureInfo(evt.pixel, popupFeatures, type="article");
        } else if (doc_source == "jornal_map"){
            displayFeatureInfo(evt.pixel, popupFeatures, type="explore");
        }
        
    }
    console.log("Leaving map on click");
});
let currentZIndex;
//////////////////////////////////////////////////////////////////////////////
/** VIEWING INDIVIDUAL STORIES FOR A JORNAL ENTRY */
/////////////////////////////////////////////////////////////////////////////
if (doc_source == "historias"){
    currentZIndex = 1;
    console.log("doc_source: ",doc_source);
    console.log("geonoticia: ",geonoticia);
    //Basic story info
    console.log("Geonoticia s_id: ",geonoticia.s_id);
    var sID = geonoticia.s_id;
    var sTags = geonoticia.tags;
    const mapStoryFilter = "s_id="+sID;
    //console.log("mapStoryFilter: ",mapStoryFilter);
    //document.querySelector('h1').style.color = pubColor;
    ///// LOADING IFRAME ////
    const viewHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    console.log("viewHeight: ",viewHeight);
    //const instanceAreaH = document.getElementById("map").style.height;
    //console.log("instanceAreaH: ",instanceAreaH);
    var iframeH = document.getElementById("iframeH");
    /*document.getElementById('noArticle').style.height = "100%";
    iframeH.style.height = "100%";*/
    var timePast = false;
    setTimeout(function() {
        timePast = true;
    },1000);
    const urlRedirect = "http://127.0.0.1:5000/";
    if (iframeH.attachEvent){
        iframeH.attachEvent("onload",function(){
            if(timePast) {
                iframeH.style.display = "block";
            } else {
                iframeH.style.display = "none";
                document.getElementById("noArticle").style.display = "block";
                alert("Peço desculpa, a notícia não está a carregar a partir do anfitrião original");
                //window.open(urlRedirect, "_self");
            }
        });
    } else {
        iframeH.onload = function(){
            if(timePast){
                iframeH.style.display = "block";
            } else {
                iframeH.style.display = "none";
                document.getElementById("noArticle").style.display = "block";
                alert("Peço desculpa, a notícia não está a carregar a partir do anfitrião original")
                //window.open(urlRedirect, "_self");
            }
        };
    }
    /*LOADING OL MAPS */
    if (instancesExist == true){
        vSource = defineVSource(mapFilter = mapStoryFilter);
        vectorLayer = new ol.layer.Vector({
            source: vSource,
            style: function (feature) {
                style.getText().setText(feature.get('p_name'));
                return style;
            },
        });
        map.addLayer(vectorLayer);
        const nearbyButtonArea = document.getElementById('nearbyButtonArea');
        if (nearbys.length > 0){
            for (var i=0;i<nearbys.length;i++){
                var nearbyButton = document.createElement('button');
                nearbyButton.className = "button2";
                nearbyButton.innerHTML = nearbys[i]["name"]+" ("+nearbys[i]["count"]+")";
                
                var nearbyA = document.createElement('a');
                nearbyA.href = "/"+publication.p_name+"/mapa/"+nearbys[i]["e_id"];
                nearbyA.appendChild(nearbyButton);
                nearbyButtonArea.appendChild(nearbyA);
            };
        }
        //Add instances so that these can be easily identified on the map!
        if (geonoticia["instances"].length > 0){
            const instRoundup = document.getElementById('instRoundup');
            for (var i=0; i<geonoticia["instances"].length; i++){
                var instanceLocator = document.createElement('button');
                instanceLocator.className = "button3";
                instanceLocator.id = "id_"+geonoticia["instances"][i]["i_id"];
            
                instanceLocator.onclick = function(){
                    closePopup();
                    const iID = parseInt(this.id.substring(3),10);
                    console.log("Show instance iID: ",iID);
                    var features = vSource.getFeatures();
                    console.log("vSource.getFeatures() ",vSource.getFeatures());
                    for (var j=0; j<features.length; j++){
                        if (features[j]["A"]["i_id"] == iID){
                            //ACT AS IF CLICK OCCURRED
                            hoverOverlay.getSource().clear();
                            featureFocus.getSource().clear();
                            hoverOverlay.getSource().addFeature(features[j]);
                            featureFocus.getSource().addFeature(features[j]);
                            layerExtent = hoverOverlay.getSource().getExtent();
                            map.getView().fit(ol.extent.buffer(layerExtent, .001));
                            break;
                        }
                    }
                }

                var iTitle = document.createElement('div');
                iTitle.className = "iTitle";               
                instanceLocator.appendChild(iTitle);
                var iDesc = document.createElement('div');
                iDesc.className = "iDesc";
                instanceLocator.appendChild(iDesc);
                instRoundup.appendChild(instanceLocator);

                /* Define values shown in instance list. Ideally these will be i_names and descriptions, but during the transition p_names may be used.*/
                if (geonoticia["instances"][i].hasOwnProperty("i_name")){
                    if (geonoticia["instances"][i]["i_name"]==="context"){ 
                        //If contextual instance
                        iTitle.innerHTML = geonoticia["instances"][i]["p_name"];
                        iDesc.innerHTML = "Contextual";
                    } else {
                        //If iname exists use it
                        iTitle.innerHTML = geonoticia["instances"][i]["i_name"];
                        if (geonoticia["instances"][i].hasOwnProperty("i_desc")){
                            //If idesc exists use it
                            iDesc.innerHTML = geonoticia["instances"][i]["i_desc"];
                        }
                    }
                } else {
                    iTitle.innerHTML = geonoticia["instances"][i]["p_name"];
                    iDesc.innerHTML = geonoticia["instances"][i]["p_desc"];
                }; 
    

                


            }
        }
        document.getElementById('instRoundupButton').classList.toggle("active");
        document.getElementById('instRoundupButton').nextElementSibling.style.display = "block";
    } else {
        document.getElementById('instanceArea').style.display="none";
        var instanceAreaNo = document.getElementById('instanceAreaNo');

        var aSeeAll = document.createElement('a');
        aSeeAll.href = "/"+publication.p_name+"/mapa/0";
        aSeeAll.target = "_self";
        instanceAreaNo.appendChild(aSeeAll);

        var buttonSeeAll = document.createElement('button');
        buttonSeeAll.className = "button";
        buttonSeeAll.innerHTML = "Ver uma mapa das notícias";
        aSeeAll.appendChild(buttonSeeAll);

        instanceAreaNo.style.display="block";
        console.log("newsArea:",document.getElementById("newsArea"));
        document.getElementById("newsArea").style.height = (viewHeight - 100)+"px";
        /*iframeH.style.height = (viewHeight - 100)+"px";
        document.getElementById('noArticle').style.height = (viewHeight - 100)+"px";*/
    };
    
} 
//////////////////////////////////////////////////////////////////
/** VIEWING JORNAL MAP */
////////////////////////////////////////////////////////////////////
else if (doc_source == "jornal_map"){
    currentZIndex = 1;
    console.log("jornal_map");
    console.log("jVals: ",jVals); 
    const baseFilters = {
        "Tags": [],
        "Sections": [],
        "Authors": [],
        "Publications": [publication["p_name"]],
        "T_types": [],
        "P_types": [],
        "E_names": [],
        "pubDateR1": pubDate1,
        "pubDateR2": pubDate2,
        "iDateR1": "",
        "iDateR2": "",
        "pNameSearch": "",
        "iDateFilter": false,
        "pubDateFilterMin":false,
        "pubDateFilterMax":false,
        "boundaryPolys":[],
        "boundaryDefinition":"containPartial",
        "e_ids": [],
    };
    var allFilters = baseFilters;
    
    console.log("allFilters: ",allFilters);
    vSource = new ol.source.Vector();
    vectorLayer = new ol.layer.Vector({
        source: vSource,
        style: styleJE,
    });

    document.getElementById('seeResults').classList.toggle("active");
    document.getElementById('seeResults').nextElementSibling.style.display = "block";

    //Initialize Sliders
    //SLIDERS
    let containerSlider = document.getElementById("containerSlider");
    var sliderOne = document.createElement("input");
    sliderOne.id = "slider-1";
    sliderOne.type = "range";
    sliderOne.min = Date.parse(iDate1);
    console.log("sliderOne.min: ",sliderOne.min)
    sliderOne.max = Date.parse(iDate2);
    sliderOne.value = Date.parse(iDate1);
    sliderOne.oninput = slideOne;
    containerSlider.appendChild(sliderOne);
    var sliderTwo = document.createElement("input");
    sliderTwo.id = "slider-2";
    sliderTwo.type = "range";
    sliderTwo.min = Date.parse(iDate1);
    sliderTwo.max = Date.parse(iDate2);
    sliderTwo.value = Date.parse(iDate2);
    sliderTwo.oninput = slideTwo;
    containerSlider.appendChild(sliderTwo);

    
    let displayValOne = document.getElementById("range1");
    let displayValTwo = document.getElementById("range2");
    let minGap = 0;
    let sliderTrack = document.querySelector(".slider-track");

    window.onload = function(){
        slideOne();
        slideTwo();
    }
    
    //SLIDERS
    function slideOne(){
        console.log("Entering slideOne");
        if(sliderTwo.value - sliderOne.value <= minGap){
            sliderOne.value = Date.parse(sliderTwo.value - minGap);
        }
        var s1 = sliderOne.value/1000;
        console.log("s1: ",s1);
        var s11 = 0;
        console.log("s11: ", s11);
        displayValOne.textContent = new Date(sliderOne.value/1).toDateString();;

        fillColor();
        console.log("Leaving slideOne");
    }
    function slideTwo(){
        console.log("Entering slideTwo");
        if(parseInt(sliderTwo.value) - parseInt(sliderOne.value) <= minGap){
            sliderTwo.value = Date.parse(parseInt(sliderOne.value) + minGap);
        }
        displayValTwo.textContent = new Date(sliderTwo.value/1).toDateString();;
        fillColor();
        console.log("Leaving slideTwo");
    }
    function fillColor(){
        console.log("Entering fillColor");
        percent1 = (parseInt(sliderOne.value-sliderOne.min) / parseInt(document.getElementById("slider-1").max-document.getElementById("slider-1").min)) * 100;
        percent2 = (parseInt(sliderTwo.value-sliderOne.min) / parseInt(document.getElementById("slider-1").max-document.getElementById("slider-1").min)) * 100;
        sliderTrack.style.background = `linear-gradient(to right, #dadae5 ${percent1}% , var(--pub-colorL) ${percent1}% , var(--pub-colorL) ${percent2}%, #dadae5 ${percent2}%)`;
        console.log("Leaving fillColor");
    }
    function adjustRange(){
        console.log("Entering adjustRange");
        const iRecent = document.getElementById("ifromforever");
        if (iRecent.checked){
            const today = new Date();
            const r1 = Date.parse(new Date(today.getFullYear()-1, today.getMonth(), today.getDate()));
            const r2 = Date.parse(new Date(today.getFullYear()+1, today.getMonth(), today.getDate()));
            
            
            if (r1 > Date.parse(iDate1)){
                if (sliderOne.value < r1){
                    sliderOne.value = r1;
                }
                sliderOne.min = r1;
                sliderTwo.min = r1;
            }
            if (r2 < Date.parse(iDate2)){
                if (sliderTwo.value > r2){
                    sliderTwo.value = r2
                }
                sliderOne.max = r2;
                sliderTwo.max = r2;
            }
            
            

            slideOne();
            slideTwo();
            

        } else {
            sliderOne.min = Date.parse(iDate1);
            sliderOne.max = Date.parse(iDate2);
            sliderTwo.min = Date.parse(iDate1);
            sliderTwo.max = Date.parse(iDate2);

            slideOne();
            slideTwo();
        }
        console.log("Leaving adjustRange");
    }

    resultsStory = document.getElementById("resultsStory"); 
    if (eID>0){
        allFilters["e_ids"] = [eID];
        eBounds = true;
    }
    filterAllVals();
    if (eID > 0){
        //ADDING EID TO MAP
        console.log("add eBoundary to map");
        defineEBoundary(eID = eID);
        eBoundaryL = new ol.layer.Vector({
            source: eBoundary,
            /*style: function (feature) {
                style.getText().setText(feature.get('name'));
                return style;
            }*/
            style: eBoundaryStyle,
        });
        map.addLayer(eBoundaryL);
        console.log("addition of eBoundary complete");
        allFilters["e_ids"] = [];
        eBounds = false;
    }


    
    /*
    //This should be dynamically updatesa call to exploreFilters.
    var mapFilter = "s_id="+112; 
    vSource = defineVSource(mapFilter = mapFilter);
    vectorLayer = new ol.layer.Vector({
        source: vSource,
        style: function (feature) {
            style.getText().setText(feature.get('p_name'));
            return style;
        },
    });
    map.addLayer(vectorLayer);  */

    /// MULTICHECKBOXES
    $(document).ready(function () {
        $("#checksTags").CreateMultiCheckBox({ width: '230px', defaultText : 'Tags', height:'250px', multiName: "checkTags" });
        $("#checksAuthors").CreateMultiCheckBox({ width: '230px', defaultText : 'Escritores', height:'250px', multiName: "checkAuthors"});
    });

    $(document).ready(function () {
        $(document).on("click", ".MultiCheckBox", function () {
            var detail = $(this).next();
            detail.show();
        });

        $(document).on("click", ".MultiCheckBoxDetailHeader input", function (e) {
            //This should be accessed to remove everything from selection;
            e.stopPropagation();
            var hc = $(this).prop("checked");
            $(this).closest(".MultiCheckBoxDetail").find(".MultiCheckBoxDetailBody input").prop("checked", hc);
            $(this).closest(".MultiCheckBoxDetail").next().UpdateSelect();
        });

        $(document).on("click", ".MultiCheckBoxDetailHeader", function (e) {
            //console.log("This enters a check all scenario");
            var inp = $(this).find("input");
            var chk = inp.prop("checked");
            inp.prop("checked", !chk);
            $(this).closest(".MultiCheckBoxDetail").find(".MultiCheckBoxDetailBody input").prop("checked", !chk);
            $(this).closest(".MultiCheckBoxDetail").next().UpdateSelect();
        });

        $(document).on("click", ".MultiCheckBoxDetail .cont input", function (e) {
            e.stopPropagation();
            $(this).closest(".MultiCheckBoxDetail").next().UpdateSelect();

            var val = ($(".MultiCheckBoxDetailBody input:checked").length == $(".MultiCheckBoxDetailBody input").length)
            $(".MultiCheckBoxDetailHeader input").prop("checked", val);
        });

        $(document).on("click", ".MultiCheckBoxDetail .cont", function (e) {
            var inp = $(this).find("input");
            var chk = inp.prop("checked");
            inp.prop("checked", !chk);

            var multiCheckBoxDetail = $(this).closest(".MultiCheckBoxDetail");
            var multiCheckBoxDetailBody = $(this).closest(".MultiCheckBoxDetailBody");
            multiCheckBoxDetail.next().UpdateSelect();
            

            var val = ($(".MultiCheckBoxDetailBody input:checked").length == $(".MultiCheckBoxDetailBody input").length)
            $(".MultiCheckBoxDetailHeader input").prop("checked", val);
            
        });

        $(document).mouseup(function (e) {
            var container = $(".MultiCheckBoxDetail"); //Are we defining multiple containers?
            if (!container.is(e.target) && container.has(e.target).length === 0) {
                container.hide();
            }
        });
    });
    var defaultMultiCheckBoxOption = { width: '220px', defaultText: "Selecionar", height: '200px' }
    jQuery.fn.extend({
        CreateMultiCheckBox: function (options) {

            var localOption = {};
            localOption.width = (options != null && options.width != null && options.width != undefined) ? options.width : defaultMultiCheckBoxOption.width;
            localOption.defaultText = (options != null && options.defaultText != null && options.defaultText != undefined) ? options.defaultText : defaultMultiCheckBoxOption.defaultText;
            localOption.height = (options != null && options.height != null && options.height != undefined) ? options.height : defaultMultiCheckBoxOption.height;
            this.hide();
            this.attr("multiple", "multiple");
            //console.log("this: ",this[0].id);
            var divSel = $("<div class='MultiCheckBox' id='"+this[0].id+"Vals'>" + localOption.defaultText + "<span class='k-icon k-i-arrow-60-down'><svg aria-hidden='true' focusable='false' data-prefix='fas' data-icon='sort-down' role='img' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 512' class='svg-inline--fa fa-sort-down fa-w-10 fa-2x'><path fill='currentColor' d='M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z' class=''></path></svg></span></div>").insertBefore(this);
            divSel.css({ "width": localOption.width });

            var detail = $("<div class='MultiCheckBoxDetail'><div class='MultiCheckBoxDetailHeader'><input type='checkbox' class='mulinput' value='-1982' /><div>Tudo</div></div><div class='MultiCheckBoxDetailBody'></div></div>").insertAfter(divSel);
            detail.css({ "width": parseInt(options.width) + 10, "max-height": localOption.height });
            var multiCheckBoxDetailBody = detail.find(".MultiCheckBoxDetailBody");

            this.find("option").each(function () {
                var val = $(this).attr("value");

                if (val == undefined)
                    val = '';

                multiCheckBoxDetailBody.append("<div class='cont'><div><input type='checkbox' class='mulinput' value='" + val + "' /></div><div>" + $(this).text() + "</div></div>");
            });

            multiCheckBoxDetailBody.css("max-height", (parseInt($(".MultiCheckBoxDetail").css("max-height")) - 28) + "px");

        },
        UpdateSelect: function () {
            var arr = [];
            var filterName = this[0].id.replace("checks","");
            var filterMultiName = this[0].id+'Vals';
            const filterMulti = document.getElementById(filterMultiName);

            this.prev().find(".mulinput:checked").each(function () {
                arr.push($(this).val());
            });

            this.val(arr);
            console.log("arr ",arr);
            allFilters[filterName] = arr;

            // Gathering values of inputs & updating dropdown viz based on selections
            filterVals = [];
            /*this.prev().find(".mulinput:checked").each(function() {
                filterVals.push($(this).attr("value"));
            })*/
            const attrFilters = document.getElementById("attrFilters");
            if (arr.length < 1) {
                filterVals = filterName;
            } else if (arr.length > 3) {
                filterVals = "("+arr.length+" "+ filterName.toLowerCase() +" selecionados)"
            } else {
                filterVals = arr
            }
            //attrFilters.innerHTML = filterVals;
            filterMulti.innerHTML= filterVals+"<span class='k-icon k-i-arrow-60-down'><svg aria-hidden='true' focusable='false' data-prefix='fas' data-icon='sort-down' role='img' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 512' class='svg-inline--fa fa-sort-down fa-w-10 fa-2x'><path fill='currentColor' d='M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z' class=''></path></svg></span>";
        },
    });
} /** ERROR */
else {
    console.log("how did we get here?");
};

 


/**
 * FUNCTIONS
 */


// Version 2
//https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js)
function shadeHexColor(color, percent) {
    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

function setColors() {
    console.log("Entering setColors()");
    if(publication.p_colors == null){
        pubColor = "#383838";
    } else {
        pubColor = publication.p_colors[0];
    };
    document.documentElement.style.setProperty('--pub-color',pubColor);
    const pubColorL = shadeHexColor(pubColor, .4);
    document.documentElement.style.setProperty('--pub-colorL',pubColorL);
    //console.log(pubColorL);
    console.log("Leaving setColors()");
    return pubColor;
};

function badIFrame(){
    console.log("Entering badIFrame");
    iframeH.style.display = "none";
    document.getElementById("noArticle").style.display = "block";
    alert("Peço desculpa, a notícia não está a carregar a partir do anfitrião original");
    console.log("Leaving badIFrame");
};

function goodIFrame(){
    console.log("Entering goodIFrame");
    iframeH.style.display = "block";
    document.getElementById("noArticle").style.display="none";
    console.log("Leaving goodIFrame");
};

function identifySections(){
    console.log("Entering identifySections");
};

function defineVSource(mapFilter){
    vSource = new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        loader: function(extent, resolution, projection, success, failure) {
            var proj = projection.getCode();
            //console.log("proj: ",proj);
            url = 'http://localhost:8080/geoserver/wfs?service=wfs&'+
                'version=2.0.0&request=GetFeature&typeNames=apregoar:geonoticias&'+
                'cql_filter='+mapFilter+'&'+
                'outputFormat=application/json&srsname='+proj+'&';
            //console.log("url: ",url);
            var xhr = new XMLHttpRequest();
            xhr.open('GET',url);
            var onError = function() {
                console.log("Error in loading vector source");
                vSource.removeLoadedExtent(extent);
                failure();
            }
            xhr.onerror = onError;
            xhr.onloadend = function() {
                removeSkeleton();
                
            }
            xhr.onload = function() {
                if (xhr.status == 200){
                    var features = vSource.getFormat().readFeatures(xhr.responseText);
                    vSource.addFeatures(features);
                    noFeatures = false;
                    if (features.length == 1) {
                        if (features[0]["A"]["geometry"] == null){
                            console.log("no instances here");
                            noFeatures = true;
                        }
                    }
                    success(features);
                    if (eBounds == true){
                        console.log("empty layer extent? ",eBoundary.getExtent());
                        map.getView().fit(ol.extent.buffer(eBoundary.getExtent(), .001)); //What does this number mean??
                    } else if (noFeatures == false) {
                        layerExtent = vSource.getExtent();
                        //console.log("layerExtent: ",layerExtent);
                        map.getView().fit(ol.extent.buffer(layerExtent, .001)); //What does this number mean??
                    }
                    var sourceFeatureInfo = vSource.getFeatures();
                    //console.log("sourceFeatureInfo: ",sourceFeatureInfo);
                    numStoryFeatures = sourceFeatureInfo.length;
                    //console.log("Number of features in story: ", numStoryFeatures);
                    console.log("Successful loading of vector source");
                    
                } else {
                    onError();
                }
            }
            xhr.send();
            //console.log("Passed send of xhr");
        },
        //strategy: ol.loadingstrategy.bbox,
    });
    return vSource;
};

function bubblefy(val, level){
    console.log("bubblefy(",val,",",level,")");
    var bubbleArea = document.getElementById('bubbleArea');
    var newBubble = document.createElement('div');
    newBubble.className = "bubble";
    if (level == "inst"){
        newBubble.classList.add('instLevel');
    }
    newBubble.innerHTML = val;
    bubbleArea.appendChild(newBubble);
};

function textDate(){
    let monthA = ["jan", "fev","mar","abr","maio","jun","jul","ago","set","out","nov","dez"];
    let output;
    console.log("textDate(",arguments,")");

    if (arguments.length > 1){
        if (arguments[1].getFullYear() === arguments[0].getFullYear()){
            if (arguments[1].getMonth() === arguments[0].getMonth()){
                if (arguments[1].getDate() === arguments[0].getDate()){ //If the same dates
                    output = "dia "+arguments[1].getDate+" de "+monthA[arguments[1].getMonth()]+", "+arguments[1].getFullYear();
                } else { //If same months
                    output = "dias "+arguments[0].getDate()+" e "+arguments[1].getDate()+" de "+monthA[arguments[1].getMonth()]+", "+arguments[1].getFullYear();
                }
            } else {//If same years
                output = "dias "+arguments[0].getDate()+" de "+monthA[arguments[0].getMonth()]+" e "+arguments[1].getDate()+" de "+monthA[arguments[1].getMonth()]+", "+arguments[1].getFullYear();
            }
        } else {
            output = "dias "+ arguments[0].getDate()+" de "+monthA[arguments[0].getMonth()]+", "+arguments[0].getFullYear()+" e "+arguments[1].getDate()+" de "+monthA[arguments[1].getMonth()]+", "+arguments[1].getFullYear();
        }
    } else {
        output = "dia "+arguments[0].getDate()+" de "+monthA[arguments[0].getMonth()]+", "+arguments[0].getFullYear();
    }
    
    console.log("output of textDate: ",output);
    return output
};

function filterAllVals(){
    console.log("Entering filterAllVals");
    console.log("allFilters: ",allFilters);
    document.getElementById("map").classList.add("skeleton");
    var storyCount = document.getElementById("storyCount");
    currentLayers = map.getLayers();
    map.removeLayer(vectorLayer);
    vSource.clear();
    allFilters["pNameSearch"] = document.getElementById('pNameSearch').value;
    // REMOVING ANY PREVIOUS EBOUNDARIES
    try {
        eBoundary.clear();
    } catch {
        console.log("No eBoundary to clear");
    }

    /* PREPPING BUBBLES */
    var bubbleArea = document.getElementById("bubbleArea");
    if (bubbleArea.hasChildNodes()){
        var first = bubbleArea.firstElementChild;
        while(first){
            first.remove();
            first = bubbleArea.firstElementChild;
        };
    }

    //existing search area bubble
    if (allFilters["e_ids"].length > 0){
        var newBubble = document.createElement('div');
        newBubble.className = "bubble bubbleEgaz";
        newBubble.innerHTML = e_name;
        newBubble.id = "eID_"+eID;
        bubbleArea.appendChild(newBubble);

        newBubble.onmouseenter = function(){
            map.getView().fit(ol.extent.buffer(eBoundary.getExtent(), .001));
        };
    }
    
    //Determinging publication range
    let text;
    if (allFilters["pubDateR1"] == pubDate1){
        if (allFilters["pubDateR2"]== pubDate2){ //If all filters are maxed
            text = "Todas datas de publicação";
            bubblefy(val = text, level = "story");
        } else { //If pub filter range is min to x
            text = "Publicadas antes do "+textDate(allFilters["pubDateR2"]);
            bubblefy(val = text, level = "story");
        }
    } else if (allFilters["pubDateR2"] == pubDate2){//If pub filter range is x to max
        text = "Publicada depois o "+textDate(allFilters["pubDateR1"]);
        bubblefy(val = text, level="story");
    } else {
        text = "Publicadas entre "+textDate(allFilters["pubDateR1"],allFilters["pubDateR2"]);
        console.log("text: ",text);
        bubblefy(val = text, level="story");
    };
    //Basic filters. Do story then instance
    const sFilters = ["Tags", "Sections", "Authors"]; //NOT DOING PUBLICATION as that is implied
    const iFilters = ["T_types","P_types", "E_names"];
    for (element in allFilters){
        if (sFilters.includes(element)){
            console.log(element," in sFilters");
            if (allFilters[element].length > 0){
                for (var i=0; i<allFilters[element].length; i++){
                    bubblefy(val = allFilters[element][i], level = "story");
                };
            };
        } else if (iFilters.includes(element)){
            console.log(element," in iFilters");
            if (allFilters[element].length>0){
                for (var i=0; i<allFilters[element].length; i++){
                    bubblefy(val = allFilters[element][i], level = "inst");
                };
            };
        } else {
            console.log(element," not in easy filters");
        }
    }
    if (allFilters["pNameSearch"].length > 0){
        bubblefy(val = allFilters["pNameSearch"], level = "inst");
    };
    // Determining instance date range
    if (allFilters["iDateFilter"]==true){
        text = "Eventos acontecendos entre do "+textDate(allFilters["iDateR1"],allFilters["iDateR2"]);
        bubblefy(val = text, level="inst");
    };

    // Determining number of drawn boundaries
    if (allFilters["boundaryPolys"].length > 0){
        text = "Área(s) desenhada(s) applicada(s)";
        bubblefy(val=text, level = "inst");
    };
    
    //Replace human readable terms for data consistency
    for (i = 0; i<allFilters["T_types"].length; i++){
        if (allFilters["T_types"][i] == "contextual"){
            allFilters["T_types"][i] = "allday_p";
        } else if (allFilters["T_types"][i] == "data"){
            allFilters["T_types"][i] = "allday_y";
        } else {
            allFilters["T_types"][i] = "allday_n";
        };
    };

    

    bodyContent = JSON.stringify(allFilters);
    fetch(`${window.origin}/${publication.p_name}/mapa`, {
        method: "POST",
        credentials: "include",
        body: bodyContent,
        cache: "no-cache",
        headers: new Headers({
            "content-type": "application/json"
        })
    })
    .then(function(response){
        if (response.status !=200){
            window.alert("Erro no filtros");
            stories = [];
            return;
        }
        response.json().then(function(resp){
            console.log("response: ",resp);
            let noResults
            if (resp.hasOwnProperty('comments')){
                alert(resp["comments"]);
                noResults = true;
            }
            if (resp["stories"] == null){
                stories = [];
                document.getElementById('zoomAllResults').style.display="none";
            } else{
                stories = resp["stories"];
                document.getElementById('zoomAllResults').style.display="block";
                
            }
            refreshStoryCards(stories=stories);
            iIDs = resp["iIDs"];
            if (iIDs.length > 0){
                iIDFilter = "i_id IN ("+iIDs+")";
                cqlFilter = iIDFilter.replace(/%/gi,"%25").replace(/'/gi,"%27").replace(/ /gi,"%20");
                vSource = defineVSource(mapFilter = cqlFilter);
                vectorLayer.setSource(vSource);
                map.addLayer(vectorLayer);
                map.render();
            } else {
                map.removeLayer(vectorLayer);
                removeSkeleton();
            };
        })
    })
    
    console.log("Leaving filterAllVals");
};

//// SKELETON LOADING INDICATIONS
function removeSkeleton(){
    console.log("Entering removeSkeleton");
    var getSkeleton = document.getElementsByClassName("skeleton");
    while(getSkeleton.length>0){
        for (s=0;s<getSkeleton.length;s++){
            getSkeleton[s].classList.remove("skeleton");
        }
    };
    var hiddenTextItems = document.querySelectorAll(".hide-text");
    hiddenTextItems.forEach(item => {
        item.classList.remove("hide-text");
    });
    console.log("Leaving removeSkeleton");
};




function refreshStoryCards(stories){
    console.log("Entering refreshStoryCards()");
    console.log("stories: ",stories);
    //Removing old cards
    var prevStoryCards = document.querySelectorAll(".story-card");
    prevStoryCards.forEach(card => {
        card.remove();
    });

    //Preparing new story cards
    for(i=0; i<stories.length; i++){
        var sID = stories[i]["s_id"];
        var sCard = document.createElement('div');
        sCard.className = 'story-card skeleton';
        sCard.id = "sID_"+stories[i]["s_id"];

        //console.log("instances all: ", stories[i].instances_all);

        var sCardTitle = document.createElement('div');
        sCardTitle.className = 'story-title hide-text';
        sCardTitle.innerHTML = stories[i]["title"];
        sCard.appendChild(sCardTitle);

        if (Object.keys(stories[i]["instances_all"]).length === 0){
            sCardTitle.classList.add("noInstanceGrey");
        };     

        var sCardDetails = document.createElement('div');
        sCardDetails.className='story-details';
        sCard.appendChild(sCardDetails);

        var sCardSection = document.createElement('div');
        sCardSection.className = 'story-section hide-text';
        if (stories[i].section.length>0){
            sCardSection.innerHTML = stories[i].section+'<br>';
        } else {
            sCardSection.innerHTML = '<br>';
        }
        sCardDetails.appendChild(sCardSection);

        var sCardDate = document.createElement('div');
        sCardDate.className = 'pub-date hide-text';
        sCardDate.innerHTML = stories[i].pub_date+'<br>';
        sCardDetails.appendChild(sCardDate);

        var sCardTags = document.createElement('div');
        sCardTags.className = 'story-tags hide-text';
        sCardTags.innerHTML = stories[i].tags;
        sCardDetails.appendChild(sCardTags);

          
        
        
        sCard.onclick = function(){
            sID = parseInt(this.id.substring(4),10);
            window.location = "/jornal/" + sID + "/historia"; 
        };

        sCard.onmouseenter = function(){
            sID = parseInt(this.id.substring(4),10);
            console.log("Show instances related to story ",sID);
            var features = vSource.getFeatures();
            var hasFeatures = false;
            for (j=0; j<features.length; j++){
                if(features[j]["A"]["s_id"] == sID){
                    hasFeatures = true;
                    hoverOverlay.getSource().addFeature(features[j]);
                    featureFocus.getSource().addFeature(features[j]);
                };
            };
            console.log("Focus features: ",hoverOverlay.getSource().getFeatures());
            if (hasFeatures == true){
                layerExtent = hoverOverlay.getSource().getExtent();
                console.log("layerExtent: ",layerExtent);
                map.getView().fit(ol.extent.buffer(layerExtent, .001)); //What does this number mean??
            };
            
        };

        sCard.onmouseleave = function(){
            var iIDs = [];
            console.log("iIDs: ",iIDs);
            hoverOverlay.getSource().clear();
            featureFocus.getSource().clear();
        };

        resultsStory.appendChild(sCard);
    }
};

function defineEBoundary(eID){
    console.log("entering defineEboundary");
    eBoundary = new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        loader: function(extent, resolution, projection, success, failure) {
            var proj = projection.getCode();
            console.log("proj: ",proj);
            url = 'http://localhost:8080/geoserver/wfs?service=wfs&'+
                'version=2.0.0&request=GetFeature&typeNames=apregoar:egazetteer&'+
                'cql_filter='+"e_id="+eID+'&'+
                'outputFormat=application/json&srsname='+proj+'&';
            //console.log("url: ",url);
            var xhr = new XMLHttpRequest();
            xhr.open('GET',url);
            var onError = function() {
                console.log("Error in loading eBoundary source");
                eBoundary.removeLoadedExtent(extent);
                failure();
            }
            xhr.onerror = onError;
            xhr.onloadend = function() {
                //removeSkeleton();
                //console.log("eBoundary loaded");
            }
            xhr.onload = function() {
                console.log("onload");
                if (xhr.status == 200){
                    //console.log("loaded boundary features");
                    //console.log("xhr.resonseText: ",xhr.responseText);
                    var features = eBoundary.getFormat().readFeatures(xhr.responseText);
                    eBoundary.addFeatures(features);
                    noFeatures = false;
                    if (features.length == 1) {
                        if (features[0]["A"]["geometry"] == null){
                            console.log("no instances here");
                            noFeatures = true;
                        }
                    }
                    success(features);
                    if (noFeatures == false) {
                        eLayerExtent = eBoundary.getExtent();
                        //console.log("layerExtent: ",layerExtent);
                    }
                    var eBoundaryInfo = eBoundary.getFeatures();
                    console.log("sourceFeatureInfo: ",eBoundaryInfo);
                    numStoryFeatures = eBoundaryInfo.length;
                    console.log("Number of features in story: ", numStoryFeatures);
                    console.log("Successful loading of e boundary source");

                } else {
                    console.log("error in loading eBoundary");
                    onError();
                }
            }
            xhr.send();
            //console.log("Passed send of xhr");
        },
        //strategy: ol.loadingstrategy.bbox,
    });
    console.log("leaving defineEBoundary");
    return eBoundary;
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


function sectionFilter(value){
    console.log("value: ",value);
    if (value.toLowerCase() === ""){
         allFilters["Sections"] = [];
         console.log("all sections selected");
    } else {
        allFilters["Sections"] = [value.toLowerCase()];
    }
    document.getElementById("moreSections").style.display="none";
    filterAllVals();
}

function showMoreSections(){
    let toShow = false;
    if (document.getElementById("moreSections").style.display==="none"){
        toShow = true;
    }
    if (toShow){
        document.getElementById("moreSections").style.display="block";
    } else {
        document.getElementById("moreSections").style.display="none";
    }
};

function zoomAllResults(){
    map.getView().fit(ol.extent.buffer(vSource.getExtent(), .001));
}

badIFrame();