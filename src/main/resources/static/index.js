const DEFAULT_CITY = 'malmo';

const cityCoordMap = {
    'stockholm': {lat: 59.379265, lng: 17.835524},
    'munich': {lat:48.1508662, lng: 11.5703644},
    'gothenburg': {lat:57.708870, lng: 11.974560},
    'malmo': {lat: 55.571080, lng: 13.022736}
};

const cityCoordBoundsMap = {
    // min_lng, min_lat, max_lng, max_lat
    'stockholm': [17.505, 58.95, 18.395, 59.545],
    'munich': [10.929, 47.794, 12.110, 48.508],
    'gothenburg': [11.0, 57, 12.5, 58.5],
    'malmo': [12.5, 55, 13.5, 56.0]
}

function displayWelcomeMessage() {
    const toastMessages = [
        "Welcome!",
        "Red marks residential parked cars.",
        "Blue marks commercial parked cars.",
        "Green marks garages.",
        "Click to get the address.",
        "Click 'Help' to replay this message.",
    ];

    const messageType = "info";

    // play the first message without waiting
    createToast(messageType, toastMessages[0]);

    let index = 1;
    // play messages in series with a pause between
    const intervalId = setInterval(() => {
        if (index < toastMessages.length) {
            const message = toastMessages[index];
            if (message) {
                createToast(messageType, message);
            }
            index++;
        } else {
            clearInterval(intervalId); // Stop the loop once all messages are displayed
        }
    }, 4000);
}

function enableHelpButton() {
    const helpButton = document.getElementById('help-button');
    helpButton.style.visibility = 'visible';
}

function removeLoginBackgroundImage() {
    const backgroundImage = document.getElementById('background-image');
    backgroundImage.remove();
}


async function initApp() {
    enableHelpButton();

    displayWelcomeMessage();
    await initControlPanel();

    afterInit = removeLoginBackgroundImage;
    initMap(currentCity, afterInit);

}