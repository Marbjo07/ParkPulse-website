
window.onload = function () {
    document.getElementById("login-popup").style.display = "block";
};

async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

var username = null;
var sessionKey = null;
var azureKey = null;

async function login() {
    const password = document.getElementById("password").value;
    const hashedPassword = await sha256(password);

    const data = {
        username: document.getElementById("email").value,
        password_hash: hashedPassword
    };
    username = data.username;

    try {
        // Inform user login is processing
        createToast("info", "Login might take some time.");
        enableLoadingAnimation();
        
        // Disable the login button to prevent multiple submissions
        document.getElementById("login-button").disabled = true;

        // Send login request
        const response = await fetch(`${API_SERVER_LOCATION}/login`, {
            method: "POST",
            headers: new Headers({ 'content-type': 'application/json'}),
            body: JSON.stringify(data),
        });
        
        disableLoadingAnimation();
        if (response.ok) {
            // unpack response
            const json = await response.json();
            sessionKey = json.key;
            azureKey = json.azure_key;

            // Hide login popup
            document.getElementById("login-popup").style.display = "none";

            // Start app🥳
            initApp();
        } else if (response.status == 401){
            console.log("Authentication failed");
            createToast("error", "Authentication failed")
        } else {
            console.error("Server response not ok:", response.status);
            createToast("error", "Unexpected Error, contact maintenance");
        }
    } catch (error) {
        console.error("Fetch error:", error);
        createToast("error", "Internal server error");
        disableLoadingAnimation();
    }
    // Enable login button incase of unsuccessful login attempt
    document.getElementById("login-button").disabled = false;

}