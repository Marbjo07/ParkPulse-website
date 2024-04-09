// Define the initialize function
var map;

var city_coord_map = {
    "berlin": [52.520008, 13.404954],
    "gothenburg": [57.7162651, 11.9774066],
    "munich": [48.1364898, 11.5825052],
    "stockholm": [59.3297094, 18.0701035],
    "zurich": [47.36667, 8.55],
}

function jump(place) {
    let [lat, lng] = city_coord_map[place]
    console.log(lat, lng)
    current_city_name = place;
    map.panTo(new google.maps.LatLng(lat, lng));
    let warning = "";
    if (place == "munich") {
        warning = "\n------\nwarnings \n    accuracy is currently low";
    }
    let info = "";
    if (place == "stockholm") {
        info = "\n------\ninfo\n    search not yet completed"
    }
    alert("stats\n    coverage: 5%\n    area searched: 500km2" + warning + info);
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

var tileInfo = [];
function eraseArea(top, left, bottom, right) {
    console.log(`erasing from (${top}, ${left}) to (${bottom} ${right})`)
}

let current_city_name = Object.keys(city_coord_map)[0];

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
        console.log("Settng eraser to " + (value ? "on" : "off"));
    } else {
        eraserOn = !eraserOn;
    }
    console.log("Eraser is now " + (eraserOn ? "on" : "off"));
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
            let latlng = pixelToLatlng(x1, y1);

            let currentZoom = map.getZoom();
            let startTile = { x: latToTile(startLatLng.lat(), currentZoom), y: lngToTile(startLatLng.lng(), currentZoom) };
            let endTile =   { x: latToTile(latlng.lat(), currentZoom), y: lngToTile(latlng.lng(), currentZoom) };

            eraseArea(endTile.x, endTile.y, startTile.x, startTile.y);
        };
    } else {
        div.hidden = 1; //Hide the div
        onmousedown = () => { };
        onmousemove = () => { };
        onmouseup = () => { };
    }
}


function fetchTileLocation(x, y, zoom) {
    let tileName = "img_" + x + "_" + y + ".png";
    if (!validTileRequests.includes(tileName)) {
        return "black.png";
    }

    if (tileInfo[tileName] == null || (tileInfo[tileName] != null && !tileInfo[tileName].taken)) {
        return 'https://pulseoverlaystorage.blob.core.windows.net/cities/' + current_city_name + '/' + zoom + '/img_' + x + '_' + y + '.png?raw=True&' + SAS_key;
    }
}

let validTileRequests;
async function initialize() {


    window.addEventListener("keyup", function (event) {
        console.log("key up!");
        console.log(event)
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

    validTileRequests = await fetch('https://pulseoverlaystorage.blob.core.windows.net/cities/' + current_city_name + '/valid_requests_' + current_city_name + '.txt?raw=True&' + SAS_key)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text(); // Get the response as text
        })
        .then(data => {
            return data.trim().split('\n'); // Split text into an array of lines
        })
        .catch(error => {
            console.error('There was a problem fetching the file:', error);
        });
    console.log(validTileRequests);

    var maptiler = new google.maps.ImageMapType({
        getTileUrl: function (coord, zoom) {
            return fetchTileLocation(coord.x, coord.y, zoom);
        },
        tileSize: new google.maps.Size(256, 256),
        isPng: true
    });

    let [lat, lng] = Object.values(city_coord_map)[0];
    map = new google.maps.Map(document.getElementById("map"), {
        center: new google.maps.LatLng(lat, lng),
        zoom: 17,
        mapTypeId: 'satellite',
        maxZoom: 18,
        minZoom: 6,
        rotateControl: false,
        tilt: 0
    });

    map.overlayMapTypes.insertAt(0, maptiler);

    google.maps.event.addListener(map, "rightclick", function (event) {
        var lat = event.latLng.lat();
        var lng = event.latLng.lng();
        fetch("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lng + "&key=AIzaSyBq8XtJsQz7gs29JOWKW7Owd946vQfFel4")
            .then(response => response.json())
            .then(data => {
                const address = data.results[0].formatted_address;
                alert(address);
            })
    });
}

