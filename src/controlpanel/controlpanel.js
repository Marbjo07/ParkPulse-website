function addEvenListnerToDropdownElements(dropdownMenuId, eventFunction) {
    // Select elements
    let dropdownElements = document.getElementById(dropdownMenuId).querySelectorAll(".dropdown-element");

    // Add click event listener to each dropdown element
    dropdownElements.forEach(function(element) {
        element.addEventListener("click", () => {eventFunction(element)});
    });
}

var displayResidential = true;
var displayCommercial = true; 
var displayGarages = true;
var currentCity = DEFUALT_CITY;

function initControlPanel() {
    addEvenListnerToDropdownElements('map-style-menu', (element) => {
        let selectedStyle = element.getAttribute("value");
        map.setStyle({'style': selectedStyle});
    });

    addEvenListnerToDropdownElements('city-menu', (element) => {
        let selectedCity = element.getAttribute("value");
        initMap(selectedCity);
        initCustomMapTiler(selectedCity);
        
        const currentCityHeader = document.getElementById('current-city')
        currentCityHeader.innerText = selectedCity;
    });

    addEvenListnerToDropdownElements('model-filter-menu', (element) => {
        let buttonClicked = element.getAttribute("value");
        if (buttonClicked == "residential") {
            displayResidential = !displayResidential;
        }
        if (buttonClicked == "commercial") {
            displayCommercial = !displayCommercial;
        }
        if (buttonClicked == "garages") {
            displayGarages = !displayGarages;
        }

        // Restart map tiler
        removeCustomMapTiler();
        initCustomMapTiler(currentCity, displayResidential, displayCommercial, displayGarages);
    });

}