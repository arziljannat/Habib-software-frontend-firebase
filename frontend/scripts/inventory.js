console.log("INVENTORY JS LOADED");

const currentBranch = localStorage.getItem("branch") || "Rasson1";
let inventoryData = [];
let selectedItemId = null;

// LOAD INVENTORY
document.addEventListener("DOMContentLoaded", loadInventory);

async function loadInventory() {
    try {
        const res = await fetch(`https://snooker-backend-pmjj.onrender.com/api/inventory/${currentBranch}`);
        inventoryData = await res.json();
        renderInventory();
    } catch (err) {
        console.error(err);
    }
}

function renderInventory() {
    const body = document.getElementById("inventoryBody");
    body.innerHTML = "";

    inventoryData.forEach(item => {
        body.innerHTML += `
            <tr>
<td>${item.name}</td>
<td>${item.stock}</td>
<td>${item.price}</td>
<td>${item.selling_price}</td>
                <td>
                    <button class="btn-green" onclick="openEditPopup(${item.id})">Edit</button>
                    <button class="btn-red" onclick="openDeletePopup(${item.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

/* POPUPS */
function openAddPopup() {
    document.getElementById("addPopup").classList.remove("hide");
}

function closeAddPopup() {
    document.getElementById("addPopup").classList.add("hide");
}

function openEditPopup(id) {
    selectedItemId = id;
    const item = inventoryData.find(i => i.id === id);

    document.getElementById("editName").value = item.item_name;
    document.getElementById("editQty").value = item.quantity;
    document.getElementById("editCost").value = item.price;
    document.getElementById("editSell").value = item.selling_price;

    document.getElementById("editPopup").classList.remove("hide");
}

function closeEditPopup() {
    document.getElementById("editPopup").classList.add("hide");
}

function openDeletePopup(id) {
    selectedItemId = id;
    document.getElementById("deletePopup").classList.remove("hide");
}

function closeDeletePopup() {
    document.getElementById("deletePopup").classList.add("hide");
}

/* CRUD ACTIONS */
async function saveNewItem() {
    const body = {
        item_name: document.getElementById("newName").value,
        quantity: document.getElementById("newQty").value,
        price: document.getElementById("newCost").value,
        selling_price: document.getElementById("newSell").value,
        branch_code: currentBranch
    };

    await fetch("https://snooker-backend-pmjj.onrender.com/api/inventory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    closeAddPopup();
    loadInventory();
}

async function updateItem() {
    const body = {
        item_name: document.getElementById("editName").value,
        quantity: document.getElementById("editQty").value,
        price: document.getElementById("editCost").value,
        selling_price: document.getElementById("editSell").value
    };

    await fetch(`https://snooker-backend-pmjj.onrender.com/api/inventory/update/${selectedItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    closeEditPopup();
    loadInventory();
}

async function confirmDelete() {
   await fetch(`https://snooker-backend-pmjj.onrender.com/api/inventory/delete/${selectedItemId}`, {
    method: "DELETE"
});

    closeDeletePopup();
    loadInventory();
}
