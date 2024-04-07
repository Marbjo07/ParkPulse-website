
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

var SAS_key = "not yet";

async function login() {
    const password = document.getElementById("password").value;
    const hashedPassword = await hashPassword(password);

    const data = {
        username: document.getElementById("username").value,
        password_hash: hashedPassword
    };

    try {
        const response = await fetch("http://127.0.0.1:5000/login", {
            method: "POST",
            headers: new Headers({ 'content-type': 'application/json' }),
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const json = await response.json();
            if (json.success) {
                SAS_key = json.key;
                console.log("Login successful. Key:", SAS_key);
                document.getElementById("loginPopup").style.display = "none";
                loadMapInterface();
            } else {
                console.log("Login failed.");
                // Handle login failure
                alert("Unexpected Error, contact maintenance")
            }
        }else if (response.status == 401){
            $('form').addClass('ahashakeheartache');
            $('form').on('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e){
                $('form').delay(200).removeClass('ahashakeheartache');
            });
        } else {
            console.error("Server response not ok:", response.status);
            alert("Unexpected Error, contact maintenance 🧰")
        }
    } catch (error) {
        console.error("Fetch error:", error);
        // Handle fetch error
        alert("Login Server Down or Moved")
    }

}
