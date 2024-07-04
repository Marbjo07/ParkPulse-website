let $ = document;

const toastDetails = {
	timer: 5000,
	"success": {
		icon: "fa-circle-check",
	},
	"error": {
		icon: "fa-circle-xmark",
	},
	"warning": {
		icon: "fa-circle-exclamation",
	},
	"info": {
		icon: "fa-circle-info",
	}
}

const removeToast = (toast) => {
	toast.classList.add("hide")
	if (toast.timeoutId) clearTimeout(toast.timeoutId); // Clearing the timeout for the toast
	setTimeout(() => toast.remove(), 1000) // Removing the toast after 500ms
}

const createToast = (type, message) => {
	const notifications = $.querySelector(".notifications")
	console.log(type, message)

	// Getting the icon and text for the toast based on the id passed
	const { icon, text } = toastDetails[type];
	const toast = $.createElement("li"); // Creating a new 'li' element for the toast
	toast.className = `toast ${type}` // Setting the classes for the toast
	// Setting the inner HTML for the toast
	toast.innerHTML = `<div class="column">
                        <i class="fa ${icon}"></i>
                        <span>${message}</span>
                        </div>`
	notifications.appendChild(toast); // Append the toast to the notification ul
	// Setting a timeout to remove the toast after the specified duration
	toast.timeoutId = setTimeout(() => removeToast(toast), toastDetails.timer)
}