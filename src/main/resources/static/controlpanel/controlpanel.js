var displayResidential = true;
var displayCommercial = true;
var displayGarages = true;
var currentCity = DEFAULT_CITY;

function addEventListenerToDropdownElements(dropdownMenuId, eventFunction) {
    // Select elements
    let dropdownElements = document.getElementById(dropdownMenuId).querySelectorAll(".dropdown-element");

    // Add click event listener to each dropdown element
    dropdownElements.forEach(function (element) {
        element.addEventListener("click", () => { eventFunction(element) });
    });
}

function loadFilterState(filterName) {
    let checked = JSON.parse(localStorage.getItem(filterName));

    // filterName is null for new users
    if (checked == null) {
        checked = true;
    }

    // state is inverted when shown?
    document.getElementById(filterName).checked = !checked;

    if (filterName == 'residential-filter') {
        displayResidential = checked;
    }
    if (filterName == 'commercial-filter') {
        displayCommercial = checked;
    }
    if (filterName == 'garage-filter') {
        displayGarages = checked;
    }
}

function toggleResidential() {
    displayResidential = !displayResidential;

    localStorage.setItem("residential-filter", displayResidential);

    updateCustomMapTiler(currentCity, displayResidential, displayCommercial, displayGarages);
}

function toggleCommercial() {
    displayCommercial = !displayCommercial;

    localStorage.setItem("commercial-filter", displayResidential);

    updateCustomMapTiler(currentCity, displayResidential, displayCommercial, displayGarages);
}

function toggleGarages() {
    displayGarages = !displayGarages;

    localStorage.setItem("garage-filter", displayResidential);

    updateCustomMapTiler(currentCity, displayResidential, displayCommercial, displayGarages);
}

async function getAvailableCities() {
    const data = {
        'username': username,
    };

    console.log(data);

    const response = await fetch(`/cities`, {
        method: "POST",
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify(data),
    })


    const responseData = await response.json();
    console.log(responseData);
    let availableCities = responseData['cities'];

    availableCities = [...new Set(availableCities)];
    return availableCities;
}

function populateCityMenu(availableCities) {
    const cityMenuDiv = document.getElementById('city-menu');
    availableCities.forEach((cityName) => {
        const newCityDiv = document.createElement('div');
        newCityDiv.classList.add('fancy-button');
        newCityDiv.classList.add('dropdown-element');

        newCityDiv.setAttribute('value', cityName.toLowerCase());

        newCityDiv.innerText = cityName;

        cityMenuDiv.appendChild(newCityDiv);
    })

}

async function initControlPanel() {
    const controlPanelDiv = document.getElementById('control-panel');
    controlPanelDiv.style.pointerEvents = 'all';

<<<<<<< HEAD:app/src/controlpanel/controlpanel.js
    const currentCityHeader = document.getElementById('current-city');
    currentCityHeader.innerText = currentCity;

=======
    // Update current city header
    const currentCityHeader = document.getElementById('current-city');
    currentCityHeader.innerText = currentCity;

    // Load filter states from local storage
>>>>>>> migration/kotlin:src/main/resources/static/controlpanel/controlpanel.js
    ['residential-filter', 'commercial-filter', 'garage-filter'].forEach((filterName) => {
        console.log(`loading state of filter ${filterName}`);
        loadFilterState(filterName);
    })

    // Add Eventlisteners to map style menu
    addEventListenerToDropdownElements('map-style-menu', (element) => {
        let selectedStyle = element.getAttribute("value");
        map.setStyle({ 'style': selectedStyle });
    });

    // Get available cities for user
    let availableCities = await getAvailableCities();
    console.log(availableCities);

    if (availableCities.length <= 0) {
        createToast("error", "We encountered an error. Unable to load city map");
        return;
    }

<<<<<<< HEAD:app/src/controlpanel/controlpanel.js
=======
    // Update current city header if user does not have access to the the default city
>>>>>>> migration/kotlin:src/main/resources/static/controlpanel/controlpanel.js
    if (!availableCities.includes(currentCity)) {
        currentCity = availableCities[0];
        document.getElementById('current-city').innerText = currentCity;
    }

<<<<<<< HEAD:app/src/controlpanel/controlpanel.js

    
=======
>>>>>>> migration/kotlin:src/main/resources/static/controlpanel/controlpanel.js
    populateCityMenu(availableCities);

    // Add eventlisteners to city menu elements
    addEventListenerToDropdownElements('city-menu', async (element) => {
        // disabled after custom map tiler is done loading
        enableLoadingAnimation();
        let selectedCity = element.getAttribute("value");

        afterMapInitDone = () => {
            const currentCityHeader = document.getElementById('current-city')
            currentCityHeader.innerText = selectedCity;

            currentCity = selectedCity;
        };

        initMap(selectedCity, afterMapInitDone);


    });
}