// ===========================================
// GLOBAL ROLE ACCESS SYSTEM (UI + JS PROTECTION)
// ===========================================

let ROLE = localStorage.getItem("role") || ""; 



// ===============================
// MAIN ACCESS APPLY FUNCTION
// ===============================
function applyRoleAccess() {

    // SAFETY: No role means default restricted
    if (!ROLE) return;

    // --------------------------------------------------------
    // USERS PAGE ACCESS  (ONLY ADMIN)
    // --------------------------------------------------------
    if (ROLE !== "admin") {
        hideButton("users.html");
    }

    // --------------------------------------------------------
    // REPORTS ACCESS  (ONLY ADMIN + MANAGER)
    // --------------------------------------------------------
    if (ROLE !== "admin" && ROLE !== "manager") {
        hideButton("monthly-reports.html");
    }

    // --------------------------------------------------------
    // TABLE EDIT/DELETE (ONLY ADMIN + MANAGER)
    // --------------------------------------------------------
    if (ROLE !== "admin" && ROLE !== "manager") {
        hideClass("admin-only");
    }

    // --------------------------------------------------------
    // INVENTORY EDIT/DELETE (ADMIN + MANAGER + SUPERVISOR)
    // --------------------------------------------------------
    if (ROLE === "frontdesk") {
        hideClass("inv-editor");        // special class for inventory edit controls
    }

    // --------------------------------------------------------
    // EXPENSES EDIT/DELETE (ONLY ADMIN + MANAGER)
    // EXPENSE ADD = ALLOWED TO ALL ROLES
    // --------------------------------------------------------
    if (ROLE !== "admin" && ROLE !== "manager") {
        hideClass("expense-edit-only");
    }

    // SHIFT CLOSE / DAY CLOSE → Allowed to ALL ROLES → NO RESTRICTION
    // (your final rule)
}



// ===============================
// HELPERS
// ===============================
function hideButton(page) {
    let btn = document.querySelector(`button[onclick="location.href='${page}'"]`);
    if (btn) btn.style.display = "none";
}

function hideClass(cls) {
    let items = document.querySelectorAll("." + cls);
    items.forEach(i => i.style.display = "none");
}



// ===============================
// JS-LEVEL PROTECTION
// (BLOCK ACTION even from console)
// ===============================

// LIST OF PROTECTED ADMIN FUNCTIONS
const adminFunctions = [
    "saveNewTable",
    "saveEditTable",
    "confirmDeleteTable",
    "saveItem",
    "saveEditedItem",
    "confirmDeleteItem",
    "updateUser",
    "saveNewUser",
    "confirmDeleteUser"
];

// Allow supervisors inventory edit:
const supervisorAllowed = ["saveItem","saveEditedItem", "confirmDeleteItem"];

// ===============================
// Function Patch (Strong Lock)
// ===============================
function secureFunctions() {

    adminFunctions.forEach(fnName => {
        if (typeof window[fnName] === "function") {

            let original = window[fnName];

            window[fnName] = function() {

                // Admin full access
                if (ROLE === "admin") return original();

                // Manager allowed except Users
                if (ROLE === "manager" && fnName.includes("User") === false) 
                    return original();

                // Supervisor allowed for inventory
                if (ROLE === "supervisor" && supervisorAllowed.includes(fnName))
                    return original();

                // Else → BLOCK
                alert("Access Denied: You do not have permission to perform this action.");
                return;
            };
        }
    });
}



// ===============================
// AUTO LOAD
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    applyRoleAccess();
    secureFunctions();
});
