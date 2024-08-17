
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
        document.getElementById("submit-button").disabled = true;

        // Send login request
        const response = await fetch(`${API_SERVER_URL}/login`, {
            method: "POST",
            headers: new Headers({ 'content-type': 'application/json' }),
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
        } else if (response.status == 401) {
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
    document.getElementById("submit-button").disabled = false;

}

function readAndValidatedEmail() {
    const fields = readFormFields("login-popup");

    const email = fields.email.replace(/\s/g, '');
    console.log(email);

    if (email == null || email == "") {
        throw Error("empty email");
    }

    if (email.not)
    return email;
}

async function forgotPassword() {
    let data = null;
    try {
        data = {
            'username': readAndValidatedEmail()
        };
    }
    catch (error) {
        createToast("error", "Please enter email first.");
        return;
    }
    enableLoadingAnimation();

    try {
        const response = await fetch(`${API_SERVER_URL}/request_password_reset`, {
            method: "POST",
            headers: new Headers({ 'content-type': 'application/json' }),
            body: JSON.stringify(data),
        });

        const responseData = await response.json();
        console.log(responseData);  

        createToast("success", 'If an account with that email exists, you will receive a password reset email shortly.');
    }
    catch (error) {
        createToast("error", "Unable to proccess request");
    }
    disableLoadingAnimation();
}
