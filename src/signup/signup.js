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

async function submitform() {
    let fields = readFormFields('signup-popup');
    
    console.log(fields);

    fields.password_hash = await sha256(fields.password);
    delete fields.password; 

    // Send setup request
    const response = await fetch(`${fields.serverlocation}/complete_user_setup`, {
        method: "POST",
        headers: new Headers({ 'content-type': 'application/json'}),
        body: JSON.stringify(fields),
    })

    if (!response.ok) {
        createToast("error", "Link is invalid or expired could not create account.");
    }
    else{
        createToast("success", "Account created. Redirecting to login page.")
        setTimeout(() => {
            window.location.replace(fields.redirectpage);
        }, 3000);
    }
}