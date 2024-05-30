
window.onload = function () {
    document.getElementById("loginPopup").style.display = "block";
};


async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function hashPassword(password) {
    const hashedPassword = await sha256(password);
    return hashedPassword;
}

function loadMapInterface() {
    // Create a div element with id "map"
    const mapDiv = document.createElement("div");
    mapDiv.id = "map";

    // Append the div element to the body of the document
    document.body.appendChild(mapDiv);

    // Create a script element for loading the Google Maps API
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBq8XtJsQz7gs29JOWKW7Owd946vQfFel4&callback=initialize`;
    script.async = true;
    script.defer = true;

    // Append the script element to the body of the document
    document.body.appendChild(script);
}

var user_key = "not yet";

function displayWelcomeMessage() {
    const toastMessages = [
        "Welcome to beta testing!",
        "Information, Warnings, Errors and Success are displayed here.",
        "Red blobs mark parked cars.",
        "The search space is currently limited.",
        null,
        "Markers display current wins.",
        null,
        null,
        "Hold ctrl and drag with the cursor to organize a new work area.",
        null,
        null,
        null,
        "Yellow = to be searched, Green = done. Click to toggle",
        null,
        null,
        "Left click to get the adress",
        null,
        "More functionality coming soon.",
        "Work areas are not stored yet.",
        null,
        "Click 'Help' to replay this message.",
    ];
    
    const messageType = "info";
    
    let index = 1;
    createToast(messageType, toastMessages[0]);
    
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
    }, 3500);
}

async function login() {
    const password = document.getElementById("password").value;
    const hashedPassword = await hashPassword(password);

    const data = {
        username: document.getElementById("username").value,
        password_hash: hashedPassword
    };

    try {
        createToast("info", "Login might take some time.");
        document.getElementById("login-button").disabled = true;
        enableLoadingAnimation();
        const response = await fetch(API_SERVER_LOCATION + "/login", {
            method: "POST",
            headers: new Headers({ 'content-type': 'application/json'}),
            body: JSON.stringify(data),
        });
        
        if (response.ok) {
            const json = await response.json();
            if (json.success) {
                user_key = json.key;
                console.log("Login successful. Key:", user_key);
                document.getElementById("loginPopup").style.display = "none";
                loadMapInterface();

                displayWelcomeMessage();
            } else {
                console.log("Login failed.");
                // Handle login failure
                createToast("error", "Login failed");
            }
        }else if (response.status == 401){
            createToast("error", "Authentication failed")
            console.log("Authentication failed");
        } else {
            console.error("Server response not ok:", response.status);
            createToast("error", "Unexpected Error, contact maintenance");
        }
    } catch (error) {
        console.error("Fetch error:", error);
        // Inform user
        createToast("error", "Internal server error");
    }
    disableLoadingAnimation();
    document.getElementById("login-button").disabled = false;

}
