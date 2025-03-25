document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect form data
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        // Send a POST request to the backend
        const response = await fetch("http://localhost:8000/api/v1/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Login successful
            document.getElementById("message").textContent = "Login successful!";
            document.getElementById("message").style.color = "green";
            console.log(data);
        } else {
            // Show error message
            document.getElementById("message").textContent = data.error || "Login failed!";
            document.getElementById("message").style.color = "red";
            console.error(data.error);
        }
    } catch (error) {
        console.error("Error during login:", error);
        document.getElementById("message").textContent = "An error occurred. Please try again.";
        document.getElementById("message").style.color = "red";
    }
});
