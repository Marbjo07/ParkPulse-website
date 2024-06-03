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

let current_city_name = Object.keys(city_coord_map)[0];

var areaSelectionOn = false;
var drawingManager;

function initPolygonDrawingManager() {
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingControl: false,
        polygonOptions: {
            editable: true
        }
    });

    google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon) => {
        polygon.setMap(null);
    });
}

function formatDate(date) {
    let datePart = [
        date.getDate(),
        date.toLocaleString('default', { month: 'long' }),
      date.getFullYear()
    ].map((n, i) => n.toString().padStart(i === 2 ? 4 : 2, "0")).join("/");
    let timePart = [
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    ].map((n, i) => n.toString().padStart(2, "0")).join(":");
    return datePart + " " + timePart;
  }

function getDate() {
    return formatDate(new Date());
}

function pushAllPolygonsToServer() {
     // push polygon to server
     let data = { key: user_key, polygon_keys: Array.from(polygonCoords.keys()), polygon_values: Array.from(polygonCoords.values()) };
     const requestOptions = {
         method: "POST",
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data)
     };
 
     fetch(`${API_SERVER_LOCATION}/push-polygons`, requestOptions)
     .catch(() => {
         createToast("error", "faild to sync with server");
     });
}

function updatePolygonToServer(id) {
    let data = { key: user_key, polygon_key: id, polygon_value: polygonCoords.get(id) };
     const requestOptions = {
         method: "POST",
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data)
     };
 
     fetch(`${API_SERVER_LOCATION}/update-polygon`, requestOptions)
     .catch(() => {
         createToast("error", "faild to update work space with server");
     });
}

// handles the rest of polygon creation. talking with server, ownership and etc
function completedPolygonHandler(polygon) {
    var intersects = findSelfIntersects(polygon.getPath());
    if (intersects && intersects.length) {
        createToast("error", "Selection can not intersect itself.");
        return;
    }

    let creatorName = prompt("Enter your name:");
    if (creatorName == null) {
        return;
    }

    let id = uniqueId();
    polygonCoords.set(
        id,
        {
            polygon: polygon.getPath().getArray(),
            creatorName: creatorName,
            fillColor: polygonColors[0],
            creationDate: getDate()
        }
    )

    displayPolygonOverlay(id)

    pushAllPolygonsToServer();

    toggleAreaSelectionTool(true, false);// disable area selection
    // remove the intermediate polygon
    polygon.setMap(null);
}

function toggleAreaSelectionTool(force, value) {

    if (force) {
        areaSelectionOn = value;
        console.debug("Settng eraser to " + (value ? "on" : "off"));
    } else {
        areaSelectionOn = !areaSelectionOn;
    }
    console.debug("Eraser is now " + (areaSelectionOn ? "on" : "off"));

    if (areaSelectionOn) {
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        drawingManager.setMap(map);
        google.maps.event.addListener(drawingManager, 'polygoncomplete', completedPolygonHandler);
    }
    else {
        drawingManager.setDrawingMode(null);
        drawingManager.setMap(null);
        google.maps.event.clearListeners(drawingManager, 'polygoncomplete');   
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

async function requestInfoPoints() {
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
}

async function requestFileInfo() {
    await fetchAndAddToList('https://pulseoverlaystorage.blob.core.windows.net/tiles/valid_requests_berlin.txt?raw=True', validTileRequests);
    await fetchAndAddToList('https://pulseoverlaystorage.blob.core.windows.net/tiles/valid_requests_stockholm.txt?raw=True', validTileRequests);
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
    // when ctrl is pressed area selection tool is on
    // when shift is pressed editing of areas is on
    // else its all off

    window.addEventListener("keyup", function (event) {
        if (event.key == "Control") {
            toggleAreaSelectionTool(true, false);
        }
        if (event.key == "Shift") {
            polygons.forEach((polygon, index) => {
                polygon.setEditable(false);
                polygon.setDraggable(false);
            })
        }
    }, false);
    window.addEventListener("keydown", function (event) {
        if (event.ctrlKey && !event.repeat) {
            toggleAreaSelectionTool(true, true);
        }
        if (event.key == "Shift") {
            polygons.forEach((polygon, index) => {
                polygon.setEditable(true);
                polygon.setDraggable(true);
            })
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
    try {
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
    catch (error) {
        console.error("error adding info markers" + error);
    }
}

polygonColors = ["#CCCC11", "#11EE11"];
let polygons = [];
let polygonsOn = true;
let polygonCoords = new Map();
function displayPolygonOverlay(id) {
    let path = polygonCoords.get(id).polygon;
    let fillColor = polygonCoords.get(id).fillColor;
    let creatorName = polygonCoords.get(id).creatorName;
    let creationDate = polygonCoords.get(id).creationDate;
    let completionDate = polygonCoords.get(id).completionDate;

    const polygon = new google.maps.Polygon({
        paths: path,
        strokeColor: "#000000",
        strokeOpacity: 1,
        strokeWeight: 1,
        fillColor: fillColor,
        fillOpacity: 0.4,
        creatorName: creatorName,
        id: id,
        creationDate: creationDate,
        completionDate: completionDate,
        editable: false, // changes when shift is pressed
        draggable: false // changes when shift is pressed
    });

    addDefaultMouseEvents(polygon);
    
    // update after status change or deleting a vertex
    google.maps.event.addListener(polygon, 'click', (event) => {
        
        // if clicked a vertex delete it
        if (event.vertex != null) {
            polygon.getPath().removeAt(event.vertex);
            polygonCoords.get(id).polygon = polygon.getPath().getArray();
        }
        else {
            let currentIndex = polygonColors.indexOf(polygon.fillColor);
            let nextIndex = (currentIndex + 1) % polygonColors.length;
            let fillColor = polygonColors[nextIndex];
            polygon.setOptions({ fillColor: fillColor });
            polygonCoords.get(id).fillColor = fillColor;
            if (fillColor == polygonColors[1]) {
                polygonCoords.get(id).completionDate = getDate();
            }
            else {
                polygonCoords.get(id).completionDate = null;
            }

        }
        updatePolygonToServer(polygon.id);
    });

    // update after shape changes or movement
    google.maps.event.addListener(polygon, 'dragend', (event) => {
        polygonCoords.get(polygon.id).polygon = polygon.getPath().getArray();
        updatePolygonToServer(polygon.id);
    })
    google.maps.event.addListener(polygon.getPath(), 'insert_at', function(index, obj) {
        polygonCoords.get(polygon.id).polygon = polygon.getPath().getArray();
        updatePolygonToServer(polygon.id);
    });

    // display information at curser on mouseover
    google.maps.event.addListener(polygon, 'mouseover', (event) => {
        infoBoxAtCursor = document.getElementById("infoBoxAtCursor");
        let completedString = (polygon.completionDate) ? `</br>Finished: ${completionDate}` : "";
        infoBoxAtCursor.innerHTML = `<p>Work area made by ${polygon.creatorName} </br>Id: ${polygon.id} </br> Created: ${polygon.creationDate} ${completedString}</p>`;

        infoBoxAtCursor.style.left = event.domEvent.clientX + 'px';
        infoBoxAtCursor.style.top = event.domEvent.clientY + 'px';

        infoBoxAtCursor.style.visibility = "visible";
    });
    google.maps.event.addListener(polygon, 'mouseout', (event) => {
        infoBoxAtCursor = document.getElementById("infoBoxAtCursor");
        infoBoxAtCursor.style.visibility = "hidden";
    });

    polygon.setMap(map);
    polygons.push(polygon);
}

function deletePolygons() {
    for (let i = 0; i < polygons.length; i++) {
        polygons[i].setMap(null);
    }

    delete polygonCoords;
}

function addPolygonsFromCoords() {
    try {
        for (const item of polygonCoords) {
            displayPolygonOverlay(item[0]);
        }
    }
    catch (error) {
        createToast("error", "unable to display work areas");
        console.error(error);
    }
}

const uniqueId = () => {
    const dateString = Date.now().toString(36);
    const randomness = Math.random().toString(36).substr(2);
    return dateString + randomness;
};

function toggleAllPolygons(force, value) {

    if (force) {
        polygonsOn = value;
    }
    else {
        polygonsOn = !polygonsOn;
    }
    for (let i = 0; i < polygons.length; i++) {
        if (polygonsOn) {
            polygons[i].setMap(map);
        }
        else {
            polygons[i].setMap(null);
        }
    }
}

async function addPolygonsToMapFromServer() {
    let data = { key: user_key };
    const requestOptions = {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };

    await fetch(`${API_SERVER_LOCATION}/fetch-polygons`, requestOptions)
        .then((response) => {
            return response.json();
        })
        .then((response) => {
            return response;
        })
        .then((response) => {
            for (let i = 0; i < response.polygon_keys.length; i++) {
                polygonCoords.set(response.polygon_keys[i], response.polygon_values[i]);
            }
        })
        .then(() => {
            addPolygonsFromCoords();
        })
        .catch((error) => { createToast("error", "there was a problem fetching work spaces"); console.log(error) });
}

function updateAllPolygons() {
    deletePolygons();
    addPolygonsToMapFromServer();
}

function googleMaps2JTS(boundaries) {
    var coordinates = [];
    for (var i = 0; i < boundaries.getLength(); i++) {
        coordinates.push(new jsts.geom.Coordinate(
            boundaries.getAt(i).lat(), boundaries.getAt(i).lng()));
    }
    coordinates.push(coordinates[0]);
    console.log(coordinates);
    return coordinates;
};

/**
 * findSelfIntersects
 *
 * Detect self-intersections in a polygon.
 *
 * @param {object} google.maps.Polygon path co-ordinates.
 * @return {array} array of points of intersections.
 */
function findSelfIntersects(googlePolygonPath) {
    var coordinates = googleMaps2JTS(googlePolygonPath);
    var geometryFactory = new jsts.geom.GeometryFactory();
    var shell = geometryFactory.createLinearRing(coordinates);
    var jstsPolygon = geometryFactory.createPolygon(shell);

    // if the geometry is aleady a simple linear ring, do not
    // try to find self intersection points.
    var validator = new jsts.operation.IsSimpleOp(jstsPolygon);
    if (validator.isSimpleLinearGeometry(jstsPolygon)) {
        return;
    }

    var res = [];
    var graph = new jsts.geomgraph.GeometryGraph(0, jstsPolygon);
    var cat = new jsts.operation.valid.ConsistentAreaTester(graph);
    var r = cat.isNodeConsistentArea();
    if (!r) {
        var pt = cat.getInvalidPoint();
        res.push([pt.x, pt.y]);
    }
    return res;
};


async function initialize() {
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary(
        "marker",
    );

    addKeyEvents();

    generateDropdownMenu();

    await requestFileInfo();

    await requestInfoPoints();

    await addMapOverlayTiler();

    addDefaultMouseEvents(map);

    initPolygonDrawingManager()

    addInfoMarkers(InfoWindow, AdvancedMarkerElement, PinElement);

    await addPolygonsToMapFromServer();

    map.addListener("center_changed", () => {
        if (!document.getElementById("infoBoxAtCursor").matches(':hover')) {
            document.getElementById("infoBoxAtCursor").style.visibility = "hidden";
        }
    })

    const socket = io(API_SERVER_LOCATION);

    socket.on('polygon_push', (msg) => {
        updateAllPolygons();
    });

    socket.on('polygon_update', (msg) => {
        // TODO: dont update every polygon
        updateAllPolygons();
    });

}