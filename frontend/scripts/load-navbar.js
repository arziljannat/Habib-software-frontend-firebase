console.log("LOAD-NAVBAR JS LOADED");

document.addEventListener("DOMContentLoaded", () => {
    fetch("../html/navbar.html")
        .then(res => res.text())
        .then(html => {
            document.body.insertAdjacentHTML("afterbegin", html);
            initializeNavbar();
        });
});

function initializeNavbar() {

    let role = (localStorage.getItem("role") || "").trim().toLowerCase();
    let branch = localStorage.getItem("branch");

    if (!branch) {
        console.error("No branch → redirect login");
        window.location.href = "../index.html";
        return;
    }

    console.log("CURRENT BRANCH:", branch);

    let sel = document.getElementById("branchSelect");

    // ✅ SET BRANCH (SAFE MATCH)
    if (branch && sel) {
        const options = Array.from(sel.options);

        let match = options.find(opt =>
            opt.value.replace(/\s+/g, "").toLowerCase() === branch.toLowerCase()
        );

        if (match) {
            sel.value = match.value;
        } else {
            console.warn("Branch not found in dropdown:", branch);
        }
    }

    // ✅ BRANCH CHANGE
    if (sel) {
        sel.addEventListener("change", () => {

            const selected = sel.value.replace(/\s+/g, "").trim();

            console.log("NEW SELECTED BRANCH:", selected);

            if (!selected) {
                alert("Invalid branch");
                return;
            }

            localStorage.setItem("branch", selected);
            location.reload();
        });
    }

    // ✅ STAFF RESTRICTION
    if (role === "staff") {
        setTimeout(() => {
            document.querySelectorAll(".admin-only").forEach(el => {
                el.style.display = "none";
            });
        }, 300);
    }

    // ✅ ACTIVE PAGE
    let current = window.location.pathname.split("/").pop().replace(".html", "");
    document.querySelectorAll(".nav-btn").forEach(btn => {
        if (btn.dataset.page === current) btn.classList.add("active-nav");
    });

    // ✅ LOGOUT
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "../index.html";
    });

    // ✅ NAVIGATION
    window.goTo = function (page) {
        window.location.href = `../html/${page}.html`;
    };
}
