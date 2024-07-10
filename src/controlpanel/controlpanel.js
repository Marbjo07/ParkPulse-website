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

function initControlPanel() {
    addEvenListnerToDropdownElements('map-style-menu', (element) => {
        let selectedStyle = element.getAttribute("value");
        map.setStyle({'style': selectedStyle});
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
        initCustomMapTiler(DEFAULT_MODEL_VERSION, displayResidential, displayCommercial, displayGarages);
    });

}