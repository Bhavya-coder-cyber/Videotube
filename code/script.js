addEventListener("DOMContentLoaded", () => {
    const login = document.getElementById("login")
    const register = document.getElementById("register")

    login.addEventListener("click", () => {
        window.location.href = "login.html"
    })

    register.addEventListener("click", () => {
        window.location.href = "register.html"
    })
})