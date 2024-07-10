const API_SERVER_LOCATION = "https://parkpulse-api.azurewebsites.net";
const CURRENT_CITY = 'stockholm';
const DEFAULT_MODEL_VERSION = 'v2';

const cityCoordMap = {
    'stockholm': {lat: 59.368868, lng: 17.834327}
};

const cityBoundsMap = {
    'stockholm': [17.5, 59, 18.4, 59.55],
}

function displayWelcomeMessage() {
    const toastMessages = [
        "Welcome to beta testing!",
        "Red marks personal parked cars.",
        "Blue marks commercial parked cars.",
        "Green mark garages.",
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

function initApp() {
    displayWelcomeMessage();
    initMap();
    initControlPanel();
}