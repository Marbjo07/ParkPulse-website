var map;

API_SERVER_LOCATION = "https://parkpulse-api.azurewebsites.net"
//API_SERVER_LOCATION = "http://127.0.0.1:5000"

var city_coord_map = {
    "stockholm": [59.33072276590821, 18.019477350453403], //59.334591, 18.063240
    "berlin": [52.51752504687608, 13.432100060622572],
    //"gothenburg": [57.7430536834832, 11.947388104548555],
    //"munich": [48.1364898, 11.5825052],
}

function jump(place) {
    let [lat, lng] = city_coord_map[place]
    console.log(lat, lng)
    current_city_name = place;
    map.panTo(new google.maps.LatLng(lat, lng));
    document.getElementById('current-city').innerHTML = `You are in ${place.charAt(0).toUpperCase() + place.slice(1)}!`
}

function generateDropdownMenu() {
    Object.entries(city_coord_map).forEach(([name, coord]) => {

        let button = document.createElement("a");

        let text = document.createTextNode(name);
        button.appendChild(text);

        button.setAttribute("onclick", `jump('${name}')`);

        button.setAttribute("class", "fancy-button");

        document.getElementById("dropdown-jump-menu").appendChild(button)
    });
}

var tileInfo = {};
function eraseArea(top, left, bottom, right) {
    console.log(`Erasing from (${top}, ${left}) to (${bottom} ${right})`)

    let numTakenTiles = Object.keys(tileInfo).length;
    // erase tiles at current zoom level and inwards
    for (let y = Math.min(top, bottom); y < Math.max(top, bottom); y++) {
        for (let x = Math.min(left, right); x < Math.max(left, right); x++) {
            let tileName = getTileName(x, y);
            tileInfo[tileName] = { taken: true };
        }
    }

    // delete irrelevant tiles
    console.time("filter tileInfo");
    for (const key in tileInfo) {
        if (!isValidTileName(key)) {
            delete tileInfo[key];
        }
    }
    console.timeEnd("filter tileInfo");


    console.log(`Erased ${Object.keys(tileInfo).length - numTakenTiles} tiles`);

    // refresh
    map.overlayMapTypes.removeAt(0);
    map.overlayMapTypes.push(maptiler);
}


let current_city_name = Object.keys(city_coord_map)[0];

// magic from stackoverflow
function pixelToLatlng(xcoor, ycoor) {
    var ne = map.getBounds().getNorthEast();
    var sw = map.getBounds().getSouthWest();
    var projection = map.getProjection();
    var topRight = projection.fromLatLngToPoint(ne);
    var bottomLeft = projection.fromLatLngToPoint(sw);
    var scale = 1 << map.getZoom();
    var newLatlng = projection.fromPointToLatLng(new google.maps.Point(xcoor / scale + bottomLeft.x, ycoor / scale + topRight.y));
    return newLatlng;
};

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function lngToTile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function latToTile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

var areaSelectionOn = false;
function toggleAreaSelectionTool(force, value) {

    if (force) {
        areaSelectionOn = value;
        console.debug("Settng eraser to " + (value ? "on" : "off"));
    } else {
        areaSelectionOn = !areaSelectionOn;
    }
    console.debug("Eraser is now " + (areaSelectionOn ? "on" : "off"));
    map.setOptions({ draggable: !areaSelectionOn });


    var div = document.getElementById('mouseSelectionArea'), x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    if (areaSelectionOn) {
        function updateSquareDiv() { //This will restyle the div
            var x3 = Math.min(x1, x2); //Smaller X
            var x4 = Math.max(x1, x2); //Larger X
            var y3 = Math.min(y1, y2); //Smaller Y
            var y4 = Math.max(y1, y2); //Larger Y
            div.style.left = x3 + 'px';
            div.style.top = y3 + 'px';
            div.style.width = x4 - x3 + 'px';
            div.style.height = y4 - y3 + 'px';
        }
        onmousedown = function (e) {
            div.hidden = 0; //Unhide the div

            x1 = e.clientX;
            y1 = e.clientY; 

            updateSquareDiv();
        };
        onmousemove = function (e) {
            x2 = e.clientX; //Update the current position X
            y2 = e.clientY; //Update the current position Y
            updateSquareDiv();
        };
        onmouseup = function (e) {
            div.hidden = 1; //Hide the div
            updateSquareDiv();

            // adjust the x, y coords to be relative to the clicked div, e.g the map
            let clickDivBoundingBox = e.target.getBoundingClientRect();
            let startLatLng = pixelToLatlng(x1 - clickDivBoundingBox.left, y1 - clickDivBoundingBox.top);
            let endLatlng = pixelToLatlng(x2 - clickDivBoundingBox.left, y2 - clickDivBoundingBox.top);

            biggestLat = Math.max(startLatLng.lat(), endLatlng.lat());
            smallestLat = Math.min(startLatLng.lat(), endLatlng.lat());

            biggestLng = Math.max(startLatLng.lng(), endLatlng.lng());
            smallestLng = Math.min(startLatLng.lng(), endLatlng.lng());

            let start_pos = { lat: smallestLat, lng: smallestLng };
            let end_pos = { lat: biggestLat, lng: biggestLng };
            
            console.log(start_pos, end_pos);
            
            let creatorName = prompt("Enter your name:");
            toggleAreaSelectionTool(true, false); // the prompt may interrupt keyboard events so ctrl key up is not registered

            createSquareGridOverlay(start_pos, end_pos, creatorName);
        };
    } else {
        div.hidden = 1; //Hide the div
        // disable all added mouse events
        onmousedown = () => { };
        onmousemove = () => { };
        onmouseup = () => { }; 
    }
}

function getTileName(x, y) {
    return `img_${x}_${y}.png`;
}

function isValidTileName(name) {
    return validTileRequests.includes(name);
}

function enableLoadingAnimation() {
    document.getElementById('spinner').style.visibility = "visible";
}

function disableLoadingAnimation() {
    document.getElementById('spinner').style.visibility = "hidden";
}

function getTileLocation(x, y, zoom) {
    enableLoadingAnimation();

    let tileName = getTileName(x, y);
    if (!isValidTileName(tileName)) {
        return 'white.png';
    }

    if (tileInfo[tileName] && tileInfo[tileName].taken) {
        return 'white.png';
    }

    let fetchURL = `${API_SERVER_LOCATION}/img/${zoom}/${tileName}`;
    return fetchURL;
}

async function fetchAndAddToList(url, list) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.text();
        list.push(...data.trim().split('\n'));
    } catch (error) {
        createToast('error', 'Network error');
        console.error('There was a problem fetching the file:', error);
    }
}

async function requestFileInfo() {
    await fetchAndAddToList('https://pulseoverlaystorage.blob.core.windows.net/tiles/valid_requests_berlin.txt?raw=True', validTileRequests);
    await fetchAndAddToList('https://pulseoverlaystorage.blob.core.windows.net/tiles/valid_requests_stockholm.txt?raw=True', validTileRequests);
    
    let data = { key: user_key };
    const requestOptions = {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };

    infoPoints = await fetch(`${API_SERVER_LOCATION}/info-points`, requestOptions)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text(); // Get the response as text
    })
    .then(text => {
        const lines = text.split('\n');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue; // Skip empty lines

            const values = lines[i].replace('\r', '').split(';');
            
            if (values.length != 10) continue;
            
            if (values[9] == '') continue;

            // Parse the lat/lng JSON string
            let latLngString = values[9].replaceAll("'", '"')
            const latLng = JSON.parse(latLngString); // Parse the lat/lng JSON string

            const obj = {
                position: {
                    lat: parseFloat(latLng.lat),
                    lng: parseFloat(latLng.lng)
                },
                recordId: values[1],
                title: values[2], // Assuming the title comes from the third field
                infoTypeID: 0, // Adjust this according to the correct field for infoTypeID
                city: values[3], // City    
                address: values[4], // Address
                country: values[6], // Country
                contact: values[7], // Contact name
                street: values[8], // Street
                marker: null,
            };
            data.push(obj);
        }
        return data;
    })
    .catch(error => {
        createToast('error', 'Network error');
        console.error('There was a problem fetching the file:', error);
    });
    console.log(validTileRequests);
}

async function getAddressAtPoint(lat, lng) {
    return await fetch("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lng + "&key=AIzaSyBq8XtJsQz7gs29JOWKW7Owd946vQfFel4")
        .then(response => response.json())
        .then(data => {
            const address = data.results[0].formatted_address;
            return address;
        });
}

var maptiler;
let validTileRequests = [];
var infoPoints;
const infoTypes = ['won', 'are waiting', 'lost'];

const infoColors = {
    won: '#37c42d',
    waiting: '#fbbc04',
    lost: '#000000'
};

const infoPointsStyle = {
    borderColor: '#000000',
    glyphColor: 'white'
};

function toggleMarkers() {
    let setStateEqual = (infoPoints[0].marker.map != null) ? null : map;
    for (let i = 0; i < infoPoints.length; i++) {
        infoPoints[i].marker.setMap(setStateEqual);
    }
}

function generateInfoWindowHTML(infoPoint) {
    return `<h4>${infoPoint.title.replace("Bostadsrättsförening", "BRF")}</h4></br><p>Owner: ${infoPoint.contact} </br>Address: ${infoPoint.address}</br>Region: ${infoPoint.city}</br>Record ID: ${infoPoint.recordId}</p>`
}

function addKeyEvents() {
    window.addEventListener("keyup", function (event) {
        if (event.key == "Control") {
            toggleAreaSelectionTool(true, false);
        }
    }, false);
    window.addEventListener("keydown", function (event) {
        if (event.ctrlKey && !event.repeat) {
            toggleAreaSelectionTool(true, true);
        }
    }, false);
}

function addMapOverlayTiler() {
    maptiler = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
            return getTileLocation(coord.x, coord.y, zoom);
        },
        tileSize: new google.maps.Size(256, 256),
        isPng: true,
        opacity: 1,
    });
    
    maptiler.addListener("tilesloaded", disableLoadingAnimation);

    let [lat, lng] = Object.values(city_coord_map)[0];
    map = new google.maps.Map(document.getElementById("map"), {
        center: new google.maps.LatLng(lat, lng),
        zoom: 15,
        mapTypeId: 'satellite',
        maxZoom: 19,
        minZoom: 6,
        rotateControl: false,
        tilt: 0,
        mapId: "47e0b8f09b84f863"
    });

    map.overlayMapTypes.insertAt(0, maptiler);
}

function addDefaultMouseEvents(element) {
    google.maps.event.addListener(element, "rightclick", function (event) {
        let lat = event.latLng.lat();
        let lng = event.latLng.lng();
        getAddressAtPoint(lat, lng)
        .then((address) => {
            alert(address);
        });
    });
}

function addInfoMarkers(InfoWindow, AdvancedMarkerElement, PinElement) {
    // Create an info window to share between markers.
    const infoWindow = new InfoWindow();
    // Create the markers.
    infoPoints.forEach((infoPoint, i) => {
        const pin = new PinElement({
            background: Object.values(infoColors)[infoPoint.infoTypeID],
            borderColor: infoPointsStyle.borderColor,
            glyphColor: infoPointsStyle.glyphColor,
        });

        let title = infoPoint.title;
        let position = infoPoint.position;
        const marker = new AdvancedMarkerElement({
            position,
            map,
            title: `${title}`,
            content: pin.element,
        });

        // Add a click listener for each marker, and set up the info window.
        marker.addListener('click', ({ domEvent, latLng }) => {
            infoWindow.close();
            infoWindow.setContent(generateInfoWindowHTML(infoPoint));
            infoWindow.open(marker.map, marker);
            map.panTo(latLng);
        });

        infoPoints[i].marker = marker;
    });
}


polygonColors = ["#CCCC11", "#11EE11"];
let polygons = [];
let polygonsOn = true;
function addPolygonOverlay(coordinates, creatorName) {

    for (let i = 0; i < polygons.length; i++) {
        const coords = polygons[i].getPath().getArray().map(coord => {
            return {
              lat: coord.lat(),
              lng: coord.lng()
            }
          });
        if (Math.abs(coords[0].lat - coordinates[0].lat) < 0.00001 && Math.abs(coords[0].lng - coordinates[0].lng) < 0.00001) {
            return;
        }
    }

    const polygon = new google.maps.Polygon({
        paths: coordinates,
        strokeColor: "#000000",
        strokeOpacity: 0.3,
        strokeWeight: 0,
        fillColor: polygonColors[0],
        fillOpacity: 0.4,
        creatorName: creatorName,
    });

    addDefaultMouseEvents(polygon);

    google.maps.event.addListener(polygon, 'click', function (event) {
        let currentIndex = polygonColors.indexOf(polygon.fillColor);
        let nextIndex = (currentIndex + 1) % polygonColors.length;
        polygon.setOptions({fillColor:  polygonColors[nextIndex]});

    });
    
    google.maps.event.addListener(polygon, 'mouseover', function (event) {
        infoBoxAtCursor = document.getElementById("infoBoxAtCursor");
        infoBoxAtCursor.innerHTML = `<p>Work area made by ${polygon.creatorName}</p>`;
        
        infoBoxAtCursor.style.left = event.domEvent.clientX + 'px';
        infoBoxAtCursor.style.top = event.domEvent.clientY + 'px';

        infoBoxAtCursor.style.visibility = "visible";
    });
    
    polygon.setMap(map);
    polygons.push(polygon);
}

function addSquareOverlay(topRight, bottomLeft, creatorName) {
    addPolygonOverlay([
        {lat:topRight.lat, lng:bottomLeft.lng},
        topRight,
        {lat:bottomLeft.lat, lng:topRight.lng},
        bottomLeft,
    ], creatorName);
}


function createSquareGridOverlay(topRight, bottomLeft, creatorName) {

    const lngIncrement = 0.01;
    const latIncrement = lngIncrement/2;

    console.log(topRight, bottomLeft, creatorName);

    
    let startLat = Math.round(topRight.lat * (1 / latIncrement)) / (1 / latIncrement);
    let startLng = Math.round(topRight.lng * (1 / lngIncrement)) / (1 / lngIncrement);

    for (let lat = startLat; lat + latIncrement < bottomLeft.lat; lat += latIncrement) {
        for (let lng = startLng; lng + lngIncrement < bottomLeft.lng; lng += lngIncrement) {
            let topLeft = { lat: lat, lng: lng };
            let bottomRight = { lat: Math.min(lat + latIncrement, bottomLeft.lat), lng: Math.min(lng + lngIncrement, bottomLeft.lng) };

            // Define a rectangle and set its editable property to true.
            addSquareOverlay(topLeft, bottomRight, creatorName);
        }
    }
}

function toggleAllPolygons() {
    polygonsOn = !polygonsOn;
    for (let i = 0; i < polygons.length; i++) {
        if (polygonsOn) {
            polygons[i].setMap(map);
        }
        else {
            polygons[i].setMap(null);
        }
    }
}

async function initialize() {
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary(
        "marker",
    );

    addKeyEvents();

    generateDropdownMenu();

    await requestFileInfo();

    await addMapOverlayTiler();

    addDefaultMouseEvents(map);

    addInfoMarkers(InfoWindow, AdvancedMarkerElement, PinElement);

    map.addListener("center_changed", () => {
        if (!document.getElementById("infoBoxAtCursor").matches(':hover')) {
            document.getElementById("infoBoxAtCursor").style.visibility = "hidden";
        }
    })

}