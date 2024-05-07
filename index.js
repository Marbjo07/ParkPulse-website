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


var eraserOn = false;
function toggleEraserTool(force, value) {

    if (force) {
        eraserOn = value;
        console.debug("Settng eraser to " + (value ? "on" : "off"));
    } else {
        eraserOn = !eraserOn;
    }
    console.debug("Eraser is now " + (eraserOn ? "on" : "off"));
    map.setOptions({ draggable: !eraserOn });


    var div = document.getElementById('mouseSelectionArea'), x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    var startLatLng;
    if (eraserOn) {
        function reCalc() { //This will restyle the div
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
            x1 = e.clientX; //Set the initial X
            y1 = e.clientY; //Set the initial Y
            reCalc();
            startLatLng = pixelToLatlng(x1, y1);
        };
        onmousemove = function (e) {
            x2 = e.clientX; //Update the current position X
            y2 = e.clientY; //Update the current position Y
            reCalc();
        };
        onmouseup = function (e) {
            div.hidden = 1; //Hide the div
            x1 = e.clientX; //Set the initial X
            y1 = e.clientY; //Set the initial Y
            reCalc();
            let endLatlng = pixelToLatlng(x1, y1);


            console.log(latToTile(startLatLng.lat(), 17),
                lngToTile(startLatLng.lng(), 17),
                latToTile(endLatlng.lat(), 17),
                lngToTile(endLatlng.lng(), 17))

            // request recalculation of all affected tiles on other zoom levels
            let start_pos = { lat: startLatLng.lat(), lng: startLatLng.lng() };
            let end_pos = { lat: endLatlng.lat(), lng: endLatlng.lng() };

            let data = { start_pos: start_pos, end_pos: end_pos, key: user_key };
            const requestOptions = {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            };

            fetch(`${API_SERVER_LOCATION}/erase`, requestOptions)
                .then(response => {
                    console.log("Request complete! Response:", response);
                    createToast('success', `Erased ${Math.round(parseFloat(response.area_erased))} square meters`)
                    return response;
                })
                .then(requestFileInfo)
                .then(() => {
                    const startTile = {
                        x: latToTile(startLatLng.lat(), 17),
                        y: lngToTile(startLatLng.lng(), 17)
                    };
                    const endTile = {
                        x: latToTile(endLatlng.lat(), 17),
                        y: lngToTile(endLatlng.lng(), 17)
                    };
                    eraseArea(startTile.x, startTile.y, endTile.x, endTile.y);
                })
                .catch(error => createToast("error", error));
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

function fetchTileLocation(x, y, zoom) {
    let tileName = getTileName(x, y);
    if (!isValidTileName(tileName)) {
        console.log("1");
        return 'white.png';
    }

    if (tileInfo[tileName] && tileInfo[tileName].taken) {
        console.log("1");
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

    infoPoints = await fetch(`${API_SERVER_LOCATION}/info-points`)
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
                const values = lines[i].replace('\r', '').split(',');
                const obj = {
                    position: {
                        lat: parseFloat(values[0]),
                        lng: parseFloat(values[1])
                    },
                    title: `We ${infoTypes[parseInt(values[2])]} here.`,
                    infoTypeID: values[2],
                    marker: null,
                };
                data.push(obj);
            }
            console.log(data);
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

async function initialize() {
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary(
        "marker",
    );

    window.addEventListener("keyup", function (event) {
        if (event.key == "Control") {
            toggleEraserTool(true, false);
        }
    }, false);
    window.addEventListener("keydown", function (event) {
        if (event.ctrlKey && !event.repeat) {
            toggleEraserTool(true, true);
        }
    }, false);


    generateDropdownMenu();

    await requestFileInfo();

    maptiler = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
            return fetchTileLocation(coord.x, coord.y, zoom);
        },
        tileSize: new google.maps.Size(256, 256),
        isPng: true,
        opacity: 1,
    });

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

    google.maps.event.addListener(map, "rightclick", function (event) {
        let lat = event.latLng.lat();
        let lng = event.latLng.lng();
        getAddressAtPoint(lat, lng)
        .then((address) => {
            alert(address);
        });
    });
    // Create an info window to share between markers.
    const infoWindow = new InfoWindow();

    // Create the markers.
    infoPoints.forEach(({ position, title, infoTypeID,  }, i) => {
        const pin = new PinElement({
            background: Object.values(infoColors)[infoTypeID],
            borderColor: infoPointsStyle.borderColor,
            glyphColor: infoPointsStyle.glyphColor,
        });
        console.log(position);
        const marker = new AdvancedMarkerElement({
            position,
            map,
            title: `${title}`,
            content: pin.element,
        });

        // Add a click listener for each marker, and set up the info window.
        marker.addListener('click', ({ domEvent, latLng }) => {
            const { target } = domEvent;

            infoWindow.close();
            infoWindow.setContent(marker.title);
            infoWindow.open(marker.map, marker);
            map.panTo(latLng);
        });

        infoPoints[i].marker = marker;
    });
}