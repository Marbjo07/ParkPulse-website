let map;
let customMapTilerLayer;

function getTileURL(currentModelVersion) {
    return `${API_SERVER_LOCATION}/${currentModelVersion}/img/{z}/img_{x}_{y}.png`;
}

function enableLoadingAnimation() {
    document.getElementById('spinner').style.visibility = "visible";
}

function disableLoadingAnimation() {
    document.getElementById('spinner').style.visibility = "hidden";
}   

function initCustomMapTiler(currentModelVersion) {
    let current_city = CURRENT_CITY; // TEMP changing after multiple cities
    customMapTilerLayer = new atlas.layer.TileLayer({
        tileUrl: getTileURL(currentModelVersion),
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
    var url = `https://atlas.microsoft.com/search/address/reverse/json?api-version=1.0&subscription-key=${azure_key}&query=${lat},${lon}`;

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
        maxZoom: 19,
        minZoom: 10,
        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: azure_key
        },
        dragRotateInteraction:false
    });

    // Add custom map tiler and map click event
    map.events.add('ready', function () {
        initCustomMapTiler(DEFAULT_MODEL_VERSION);
        map.events.add('click', mapClickEvent);
    });
}
