console.log("NAVBAR JS LOADED");
// ✅ DEFAULT BRANCH FIX (SAFE ADD)
let savedBranch = localStorage.getItem("branch");

if (!savedBranch) {
    console.warn("No branch found → redirecting to login");
    window.location.href = "../index.html";
}
document.addEventListener("DOMContentLoaded", () => {

    let role = (localStorage.getItem("role") || "").trim().toLowerCase();
    let branch = localStorage.getItem("branch");

    // ✅ FIRST define, then use
    if (!branch) {
        console.error("Branch missing — redirecting to login");
        window.location.href = "../index.html";
        return;
    }

    console.log("CURRENT BRANCH:", branch);

    const branchSelect = document.getElementById("branchSelect");

    // =========================
    // STAFF RESTRICTIONS (FIXED)
    // =========================
    if (role === "staff") {

        // delay taake navbar load ho jaye
        setTimeout(() => {
            document.querySelectorAll(".admin-only").forEach(el => {
                el.style.display = "none";
            });
        }, 300);

    }

    // =========================
    // SET SELECTED BRANCH
    // =========================
if (branch && branchSelect) {
    // DB → UI format convert
    let displayBranch = branch.replace(/(\D+)(\d+)/, "$1 $2");
    branchSelect.value = displayBranch;
}

    // =========================
    // BRANCH CHANGE (ADMIN ONLY)
    // =========================
if (branchSelect) {
    branchSelect.addEventListener("change", () => {
        if (role === "admin" || role === "super_admin") {

            const selected = branchSelect.value.replace(/\s+/g, "").trim();

            console.log("NEW SELECTED BRANCH:", selected);

            if (!selected) {
                alert("Invalid branch");
                return;
            }

            // ✅ SAVE + RELOAD (FINAL FIX)
            localStorage.setItem("branch", selected);
            window.location.reload();
        }
    });
}

    // =========================
    // ACTIVE NAV HIGHLIGHT
    // =========================
    let currentPage = window.location.pathname.split("/").pop().replace(".html", "");
    document.querySelectorAll(".nav-btn").forEach(btn => {
        if (btn.dataset.page === currentPage) btn.classList.add("active-nav");
    });

});

// =========================
// NAVIGATION
// =========================
function goTo(page) {
    window.location.href = `../html/${page}.html`;
}
