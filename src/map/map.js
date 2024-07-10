let map;
let customMapTilerLayer;

function interleaveStrings(stringA, stringB) {
    outputString = "";
    for (let i = 0; i < Math.max(stringA.length, stringB.length); i++) {
        if (i < stringA.length) {
            outputString += stringA[i];
        }
        if (i < stringB.length) {
            outputString += stringB[i];
        }
    }
    return outputString;
}

async function getTileURL(modelVersion, displayResidential, displayCommercial, displayGarages) {
    // create tileURL
    let tileURL = `${API_SERVER_LOCATION}/${modelVersion}/img/{z}/img_{x}_{y}.png?username=${username}&session_key=${sessionKey}`;
    // add filter flags
    if (!displayResidential) {
        tileURL += "&residential=False";
    }
    if (!displayCommercial) {
        tileURL += "&commercial=False";
    }
    if (!displayGarages) {
        tileURL += "&garages=False";
    }
    return tileURL;
}

function enableLoadingAnimation() {
    document.getElementById('spinner').style.visibility = "visible";
}

function disableLoadingAnimation() {
    document.getElementById('spinner').style.visibility = "hidden";
}   

async function initCustomMapTiler(modelVersion, displayResidential, displayCommercial, displayGarages) {
    let current_city = CURRENT_CITY; // TEMP changing after multiple cities
    customMapTilerLayer = new atlas.layer.TileLayer({
        tileUrl: await getTileURL(modelVersion, displayResidential, displayCommercial, displayGarages),
        tileSize: 256,
        opacity: 0.7,
        bounds: cityBoundsMap[current_city]
    });
    map.layers.add(customMapTilerLayer);
}

function addCustomMapTiler() {
    map.layers.add(customMapTilerLayer);
}

function removeCustomMapTiler() {
    map.layers.remove(customMapTilerLayer);
}

function toggleCustomMapTiler() {
    if (customMapTilerLayer.getMap() == null) {
        addCustomMapTiler();
    }
    else {
        removeCustomMapTiler();
    }
}

function mapClickEvent(event) {
    var coordinates = event.position;
    var lat = coordinates[1];
    var lon = coordinates[0];
    console.log(`Latitude: ${lat}, Longitude: ${lon}`);

    // Create the URL for the reverse geocode API
    var url = `https://atlas.microsoft.com/search/address/reverse/json?api-version=1.0&subscription-key=${azureKey}&query=${lat},${lon}`;

    // Make the API request and display 
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.addresses && data.addresses.length > 0) {
                var address = data.addresses[0].address;
                createToast('info', `Address: ${address.freeformAddress}`)
            } else {
                console.error('No address found');
            }
        })
        .catch(error => console.error('Error:', error));
};

function initMap() {
    // create map div
    const mapDiv = document.createElement("div");
    mapDiv.id = "map";
    document.body.appendChild(mapDiv);
    map = new atlas.Map('map', {
        center: [cityCoordMap[CURRENT_CITY].lng, cityCoordMap[CURRENT_CITY].lat],
        zoom: 15,
        view: 'Auto',
        style: 'satellite',
        maxBounds: cityBoundsMap["stockholm"],
        maxZoom: 19,
        minZoom: 10,
        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: azureKey
        },
        dragRotateInteraction:false
    });
    // Add custom map tiler and map click event
    map.events.add('ready', async () => {
        initCustomMapTiler(DEFAULT_MODEL_VERSION, true, true, true);
        map.events.add('click', mapClickEvent);
    });
    // Handle tile loading errors
    map.events.add('error', (e) => {
        console.log(e)
        // Check for status code 419 "Session expired"
        if (e.error && e.error.status == 419) {
            // Delete map            
            const mapDiv = document.getElementById("map")
            mapDiv.remove();


            const userMessage = document.createElement("h1");
            userMessage.id = "userMessage";
            userMessage.textContent = "Session terminated, please login again";
            document.body.appendChild(userMessage);
        }
    });
}
