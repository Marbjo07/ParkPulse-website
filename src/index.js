const API_SERVER_LOCATION = "https://parkpulse-api.azurewebsites.net";
//const API_SERVER_LOCATION = "http://127.0.0.1:5000";
const DEFUALT_CITY = 'stockholm';

const cityCoordMap = {
    'stockholm': {lat: 59.368868, lng: 17.834327},
    'munich': {lat:48.171188, lng:11.517166}
};

const cityBoundsMap = {
    // min_lng, min_lat, max_lng, max_lat
    'stockholm': [17.505, 58.95, 18.395, 59.545],
    'munich': [10.929, 47.794, 12.110, 48.508]
}

function displayWelcomeMessage() {
    const toastMessages = [
        "Welcome to beta testing!",
        "Red marks residential cars.",
        "Blue marks commercial cars.",
        "Green mark garages.",
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

function initApp() {
    displayWelcomeMessage();
    initMap(DEFUALT_CITY);
    initControlPanel();
}