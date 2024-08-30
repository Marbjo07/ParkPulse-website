var displayResidential = true;
var displayCommercial = true;
var displayGarages = true;
var currentCity = DEFUALT_CITY;

function addEvenListnerToDropdownElements(dropdownMenuId, eventFunction) {
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

    const response = await fetch(`/list_available_cities`, {
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

    ['residential-filter', 'commercial-filter', 'garage-filter'].forEach((filterName) => {
        console.log(`loading state of filter ${filterName}`);
        loadFilterState(filterName);
    })

    addEvenListnerToDropdownElements('map-style-menu', (element) => {   
        let selectedStyle = element.getAttribute("value");
        map.setStyle({ 'style': selectedStyle });
    });

    let availableCities = await getAvailableCities();
    console.log(availableCities);
    populateCityMenu(availableCities);

    addEvenListnerToDropdownElements('city-menu', async (element) => {
        // disabled after custom map tiler is done loading
        enableLoadingAnimation();
        let selectedCity = element.getAttribute("value");

        afterInitDone = () => {
            const currentCityHeader = document.getElementById('current-city')
            currentCityHeader.innerText = selectedCity;

            currentCity = selectedCity;
        };

        initMap(selectedCity, afterInitDone);

        
    });
}
