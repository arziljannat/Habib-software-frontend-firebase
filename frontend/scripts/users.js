console.log("USERS JS LOADED SUCCESSFULLY");

// ========================================================
// USERS SYSTEM – ACCESS CONTROL (ADMIN + MANAGER ONLY)
// ========================================================

const token = localStorage.getItem("token");
const userRole = localStorage.getItem("role");      // FIXED NAME


// ONLY admin CAN ACCESS THIS PAGE
if (!token || userRole !== "admin") {
    alert("Access Denied: Only admin can access Users page.");
    window.location = "dashboard.html";
}

let usersData = [];
let selectedUserId = null;

// ========================================================
// LOAD USERS ON PAGE LOAD
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
    loadUsers();
});

// ========================================================
// LOAD USERS FROM BACKEND
// ========================================================
async function loadUsers() {
    try {
let res = await fetch("https://snooker-backend-pmjj.onrender.com/api/users", {
headers: {
    "Authorization": token,
    "role": localStorage.getItem("role"),
    "branch": localStorage.getItem("branch")
},
});

        usersData = await res.json();
        renderUsers();

    } catch (err) {
        console.error("User Load Error:", err);
    }
}

// ========================================================
// RENDER USERS TABLE
// ========================================================
function renderUsers() {
    const tbody = document.getElementById("usersBody");
    tbody.innerHTML = "";
   // ✅ SAFE CHECK (ADD THIS)
    if (!Array.isArray(usersData)) {
        console.error("Invalid response:", usersData);
        return;
    }
    usersData.forEach(user => {
        tbody.innerHTML += `
            <tr>
                <td>${user.username}</td>
                <td>${user.role}</td>
                
                <td>${new Date(user.created_at).toLocaleString()}</td>

                <td class="admin-only">
                    <button class="popup-btn" onclick="openEditUser(${user.id})">Edit</button>
                    <button class="popup-btn delete" onclick="openDeleteUser(${user.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

// ========================================================
// ADD USER POPUP
// ========================================================
function openAddUser() {
    console.log("openAddUser called");
    document.getElementById("addUserPopup").style.display = "flex";
}

function closeAddUser() {
    document.getElementById("addUserPopup").style.display = "none";
}

async function saveNewUser() {
    let username = document.getElementById("newUsername").value.trim();
    let password = document.getElementById("newPassword").value.trim();
    let role = document.getElementById("newRole").value;

    if (!username || !password || !role) {
        alert("Please enter all fields");
        return;
    }

    let res = await fetch("https://snooker-backend-pmjj.onrender.com/api/users", {
        method: "POST",
headers: {
    "Content-Type": "application/json",
    "role": localStorage.getItem("role"),
    "branch": localStorage.getItem("branch")
},
        body: JSON.stringify({
            username,
            password,
            role,
            branch_code: localStorage.getItem("branch") // IMPORTANT
        })
    });

    let data = await res.json();

    if (data.success) {
        alert("User Added Successfully");
    } else {
        alert("Error adding user");
    }

    closeAddUser();
    loadUsers();
}
// ========================================================
// EDIT USER POPUP
// ========================================================
function openEditUser(id) {
    selectedUserId = id;

    const u = usersData.find(x => x.id === id);

    document.getElementById("editUsername").value = u.username;
    document.getElementById("editRole").value = u.role;
    document.getElementById("editPassword").value = "";

    document.getElementById("editUserPopup").style.display = "flex";
}

function closeEditUser() {
    document.getElementById("editUserPopup").style.display = "none";
}

async function updateUser() {
    let username = document.getElementById("editUsername").value.trim();
    let password = document.getElementById("editPassword").value.trim();
    let userRole = document.getElementById("editRole").value;
    

    let body = {
        username,
        role: userRole,
        
    };

    if (password) body.password = password;

    let res = await fetch(`https://snooker-backend-pmjj.onrender.com/api/users/update/${selectedUserId}`, {
        method: "PUT",
headers: {
    "Authorization": token,   // ✅ ADD THIS
    "Content-Type": "application/json",
    "role": localStorage.getItem("role"),
    "branch": localStorage.getItem("branch")
},
        body: JSON.stringify(body)
    });

    let data = await res.json();
    alert(data.message);

    closeEditUser();
    loadUsers();
}

// ========================================================
// DELETE USER POPUP
// ========================================================
function openDeleteUser(id) {
    selectedUserId = id;
    document.getElementById("deleteUserPopup").style.display = "flex";
}

function closeDeleteUser() {
    document.getElementById("deleteUserPopup").style.display = "none";
}

async function confirmDeleteUser() {
    let res = await fetch(`https://snooker-backend-pmjj.onrender.com/api/users/delete/${selectedUserId}`, {
        method: "DELETE",
  headers: {
    "Authorization": token,
    "Content-Type": "application/json",
    "role": localStorage.getItem("role"),
    "branch": localStorage.getItem("branch")
},
    });

    let data = await res.json();
    alert(data.message);

    closeDeleteUser();
    loadUsers();
}
