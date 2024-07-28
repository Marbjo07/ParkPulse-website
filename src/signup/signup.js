MIN_PASSWORD_LENGTH = 8

function fulfillsAllPasswordRequirements() {
    
    const requirements = document.getElementById("password-requirements");

    let allFulfilled = true;

    requirements.childNodes.forEach((child) => {
        if (child.tagName == "DIV" && child.classList.contains("invalid")) {
            allFulfilled = false;
        }
    })
    return allFulfilled;
}

async function submitform() {
    enableLoadingAnimation();

    // disable button for a short period
    const signupButton = document.getElementById('submit-button');
    signupButton.disabled = true;
    setTimeout(function() {
        signupButton.disabled = false;
    }, 1000);

    if (!fulfillsAllPasswordRequirements()) {
        createToast("error", "Password must fulfill criterions");
        return;
    }

    let fields = readFormFields('signup-popup');
    if (fields.confirm_password != fields.password) {
        console.log("balle");
        createToast("error", "passwords must match");
        return;
    }

    fields.password_hash = await sha256(fields.password);
    delete fields.password;

    // Send setup request
    const response = await fetch(`${fields.serverlocation}/complete_user_setup`, {
        method: "POST",
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify(fields),
    })

    if (!response.ok) {
        createToast("error", "Link is invalid or expired, could not create account.");
        disableLoadingAnimation();
    }
    else {
        createToast("success", "Account created. Redirecting to login page.")
        setTimeout(() => {
            disableLoadingAnimation();
            window.location.replace(fields.redirectpage);
        }, 3000);
    }
}

function setRequirementState(element, isValid) {
    if (isValid) {
        element.classList.remove("invalid");
        element.classList.add("valid");
    }
    else {
        element.classList.remove("valid");
        element.classList.add("invalid");
    }
}

function updatePasswordRequirements() {
    let enteredPassword = document.getElementById("password");

    let tests = [
        { id: "has-letter", regex: /[a-z]/g },
        { id: "has-capital", regex: /[A-Z]/g },
        { id: "has-number", regex: /[0-9]/g },
        { id: "has-special", regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/ },
    ];

    tests.forEach((test) => {
        const element = document.getElementById(test.id);
        const matchesCase = enteredPassword.value.match(test.regex);

        setRequirementState(element, matchesCase);
    });

    const element = document.getElementById("has-length");
    setRequirementState(element, (enteredPassword.value.length >= MIN_PASSWORD_LENGTH));

    updateArePasswordsEqualStatus();
}

function updateArePasswordsEqualStatus() {
    const fields = readFormFields('signup-popup');

    const confirm_password = document.getElementById("confirm_password");
    const isValid = fields.confirm_password == fields.password;
    setRequirementState(confirm_password, isValid);

}

document.addEventListener('DOMContentLoaded', () => {
    updatePasswordRequirements();
}, false);