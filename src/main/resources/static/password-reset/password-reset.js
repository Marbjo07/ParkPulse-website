function readAndValidatedEmail() {
    const fields = readFormFields('enter-email-popup');
    const email = fields.email.replace(/\s/g, '');

    console.log(email);

    if (email == null || email == "") {
        throw Error("empty email");
    }

    if (!email.includes("@") || !email.includes(".")) {
        throw Error("invalid email");
    }

    return email;
}

async function requestPasswordReset() {
    let data = null;   
    try {
        data = {
            'username': readAndValidatedEmail()
        };
    }
    catch (error) { 
        createToast("error", "Please enter a valid email address.");
        return;
    }
    enableLoadingAnimation();

    try {
        const response = await fetch(`/request_password_reset`, {
            method: "POST",
            headers: new Headers({ 'content-type': 'application/json' }),
            body: JSON.stringify(data),
        });

        const responseData = await response.json();
        console.log(responseData);  

        createToast("success", 'If an account with that email exists, you will receive a password reset email shortly.');
        setTimeout(() => {
            disableLoadingAnimation();
            window.location.replace("/");
        }, 3000);
    }
    catch (error) {
        createToast("error", "We encountered an issue processing your request. Please try again later.");
    }
    disableLoadingAnimation();

}