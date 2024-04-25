
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
        "Welcome!",
        "Information, Warnings, Errors and Success are displayed here.",
        "Use left click to get the address!",
        "Red blobs mark parked cars.",
        "This was done using AI, so there may be mistakes.",
        "However, mistakes will decrease with newer generations.",
        "The area searched around Berlin is 800 km^2",
        "More cities are coming soon.",
        "The Erase tool is used to remove blobs that are \"used\" or the housing association is contacted.",
        "Click the 'Erase' button to toggle erase mode.",
        "Then select the area you want to erase.",
        "Use ctrl as a hotkey for the 'Erase' button.",
        "Click 'Help' to replay this message.",
    ];
    
    const messageType = "info";
    
    let index = 1;
    createToast(messageType, toastMessages[0]);
    
    const intervalId = setInterval(() => {
        if (index < toastMessages.length) {
            const message = toastMessages[index];
            createToast(messageType, message);
            index++;
        } else {
            clearInterval(intervalId); // Stop the loop once all messages are displayed
        }
    }, 2500);
}

async function login() {
    const password = document.getElementById("password").value;
    const hashedPassword = await hashPassword(password);

    const data = {
        username: document.getElementById("username").value,
        password_hash: hashedPassword
    };

    try {
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

}
