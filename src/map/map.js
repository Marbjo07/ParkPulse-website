let map;
let customMapTilerLayer;

async function getTileURL(cityName, displayResidential, displayCommercial, displayGarages) {
    // create tileURL
    let tileURL = `${API_SERVER_LOCATION}/${cityName}/img/{z}/img_{x}_{y}.png?username=${username}&session_key=${sessionKey}`;
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

async function initCustomMapTiler(currentCity, displayResidential, displayCommercial, displayGarages) {
    customMapTilerLayer = new atlas.layer.TileLayer({
        tileUrl: await getTileURL(currentCity, displayResidential, displayCommercial, displayGarages),
        tileSize: 256,
        opacity: 0.7,
        bounds: cityBoundsMap[currentCity]
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

function initMap(currentCity) {
    // Create map div
    const mapDiv = document.createElement("div");
    mapDiv.id = "map";
    document.body.appendChild(mapDiv);
    map = new atlas.Map('map', {
        center: [cityCoordMap[currentCity].lng, cityCoordMap[currentCity].lat],
        zoom: 15,
        view: 'Auto',
        style: 'satellite',
        maxBounds: cityBoundsMap[currentCity],
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
        initCustomMapTiler(currentCity, true, true, true);
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
