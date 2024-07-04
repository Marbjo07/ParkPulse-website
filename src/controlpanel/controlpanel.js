function addEvenListnerToDropdownElements(dropdownMenuId, eventFunction) {
    // Select elements
    let dropdownElements = document.getElementById(dropdownMenuId).querySelectorAll(".dropdown-element");

    // Add click event listener to each dropdown element
    dropdownElements.forEach(function(element) {
        element.addEventListener("click", () => {eventFunction(element)});
    });
}


function initControlPanel() {
    addEvenListnerToDropdownElements('map-style-menu', (element) => {
        let selectedStyle = element.getAttribute("value");
        map.setStyle({'style': selectedStyle});
    });

    addEvenListnerToDropdownElements('model-version-menu', (element) => {
        let currentModelVersion = element.getAttribute("value");

        // Restart map tiler
        removeCustomMapTiler();
        initCustomMapTiler(currentModelVersion);
    });
}