let map;
var customMapTilerLayer;

function getTileURL(cityName, displayResidential, displayCommercial, displayGarages) {
    // create tileURL
    let tileURL = `${API_SERVER_LOCATION}/tile/${cityName}/{z}/img_{x}_{y}.png?username=${username}&session_key=${sessionKey}`;
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


function initCustomMapTiler(currentCity, displayResidential, displayCommercial, displayGarages) {
    enableLoadingAnimation();
    customMapTilerLayer = new atlas.layer.TileLayer({
        tileUrl: getTileURL(currentCity, displayResidential, displayCommercial, displayGarages),
        tileSize: 256,
        maxSourceZoom: 18,
        opacity: 0.5,
        saturation: 0.9,
        bounds: cityCoordBoundsMap[currentCity]
    });
    map.layers.add(customMapTilerLayer);
}

// updates maptiler with new settings
function updateCustomMapTiler(currentCity, displayResidential, displayCommercial, displayGarages) {
    let bounds = cityCoordBoundsMap[currentCity];
    customMapTilerLayer.setOptions({
        'bounds':bounds, 
        'tileUrl':getTileURL(currentCity, displayResidential, displayCommercial, displayGarages)
    });
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

function mapClickEvent(event, azureKey) {
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
                createToast('error', 'No address found :/');
                console.error('No address found');
            }
        })
        .catch(error => console.error('Error:', error));
};

async function getAzureKeyForCity(cityName) {
    const data = {
        'username': username,
        'city_name': cityName,
        'session_key': sessionKey 
    };

    const response = await fetch(`${API_SERVER_LOCATION}/get_azure_key_for_city`, {
        method: "POST",
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify(data),
    });

    const responseData = await response.json();
    
    let azureKey = responseData['azure_key'];

    return azureKey;
}

async function initMap(currentCity, afterInitDone) {
    // disabled after custom tiler is loaded
    enableLoadingAnimation();
    let azureKey = await getAzureKeyForCity(currentCity);
    try {
        coords = [cityCoordMap[currentCity].lng, cityCoordMap[currentCity].lat];
    
        map = new atlas.Map('map', {
            center: coords,
            zoom: 16,
            view: 'Auto',
            style: 'satellite',
            maxBounds: cityCoordBoundsMap[currentCity],
            maxZoom: 18,
            minZoom: 10,
            authOptions: {
                authType: 'subscriptionKey',
                subscriptionKey: azureKey
            },
            dragRotateInteraction:false
        });
    }
    catch (e) {
        createToast("error", "City not found.");
        console.error(e);
        disableLoadingAnimation();
        return;
    }
    // Add custom map tiler and map click event
    map.events.add('ready', async () => {
        initCustomMapTiler(currentCity, displayResidential, displayCommercial, displayGarages);
        map.events.add('click', (event) => {mapClickEvent(event, azureKey)});
        afterInitDone();
    });
    // disable loading animation after finish loading 
    ['load', 'idle', 'dragend'].forEach((event) => {
        map.events.add(event, disableLoadingAnimation);
    });

    map.events.add('render', enableLoadingAnimation);

    map.events.add('zoomend', (event) => {
        let currentZoomLevel = map.getCamera().zoom;
        let saturation = (currentZoomLevel > 16) ? 0.3 : 0.9; 
        console.log(currentZoomLevel);
        customMapTilerLayer.setOptions({'saturation':saturation});
    })
    // Handle tile loading errors
    map.events.add('error', (e) => {
        if (e.error && e.error.status == 401) {
            // Delete map            
            const mapDiv = document.getElementById("map")
            mapDiv.remove();

            // Show a litle message 💀
            const userMessage = document.createElement("h1");
            userMessage.id = "userMessage";
            userMessage.textContent = "Session expired, please login again";
            document.body.appendChild(userMessage);
        }
    });

}
