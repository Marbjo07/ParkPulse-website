function readFormFields(formId) {
    var form = document.getElementById(formId);
    if (form) {
        var fields = form.elements;
        var values = {};
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].type !== 'button') { // Ignore buttons
                values[fields[i].id] = fields[i].value;
            }
        }
        return values;
    }
}

async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}


var passwordVisible = false;

function togglePasswordVisibility() {
    passwordVisible = !passwordVisible;

    const toggleButton = document.getElementById("password-visibility");
    toggleButton.innerHTML = passwordVisible ? "HIDE" : "SHOW";

    const passwordField = document.getElementById("password");
    passwordField.type = passwordVisible ? "text" : "password";
}