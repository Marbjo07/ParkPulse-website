const DEFAULT_CITY = 'malmo';

const cityCoordMap = {
    'stockholm': {lat: 59.379265, lng: 17.835524},
    'munich': {lat:48.1508662, lng: 11.5703644},
    'gothenborg': {lat:57.708870, lng: 11.974560},
    'malmo': {lat: 55.571080, lng: 13.022736}
};

const cityCoordBoundsMap = {
    // min_lng, min_lat, max_lng, max_lat
    'stockholm': [17.505, 58.95, 18.395, 59.545],
    'munich': [10.929, 47.794, 12.110, 48.508],
    'gothenborg': [11.0, 57, 12.5, 58.5],
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

// Declare the interval ID outside to access it globally
var countdownInterval;

function displayMalmoFreePeriodPopup() {
    const freePeriodMessage = document.getElementById('free-period-message');
    freePeriodMessage.style.visibility = 'visible';

    const map = document.getElementById('map');
    map.style.visibility = 'hidden';

    // Set the date we're counting down to
    var countDownDate = new Date("Oct 13, 2024 18:00:00").getTime();

    // Clear any existing interval before setting a new one (to prevent multiple intervals)
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    // Update the count down every 1 second
    countdownInterval = setInterval(function() {

        // Get today's date and time
        var now = new Date().getTime();

        // Find the distance between now and the count down date
        var distance = countDownDate - now;

        // Time calculations for days, hours, minutes and seconds
        var days = Math.floor(distance / (1000 * 60 * 60 * 24));
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Update the countdown display
        document.getElementById("free-period-countdown").innerHTML = "Time left: " + days + "d " + hours + "h "
        + minutes + "m " + seconds + "s ";

        // If the countdown is finished, stop the interval and update the message
        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById("free-period-countdown").innerHTML = "SHUTTING DOWN";
        }
    }, 1000);
}

function closeFreePeriodPopup() {
    // Clear the countdown interval when the popup is closed
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    const freePeriodMessage = document.getElementById('free-period-message');
    freePeriodMessage.remove();

    const map = document.getElementById('map');
    map.style.visibility = 'visible';

}



async function initApp() {

    enableHelpButton();
    displayMalmoFreePeriodPopup();

    displayWelcomeMessage();
    await initControlPanel();

    afterInit = removeLoginBackgroundImage;
    initMap(currentCity, afterInit);

}