const socket = io("https://snooker-backend-pmjj.onrender.com");
socket.on("connect", () => {
    console.log("✅ SOCKET CONNECTED:", socket.id);
});

const BRANCH = localStorage.getItem("branch");
// 🔥 HELPER FUNCTIONS (ADD AT TOP)
function getItemName(item) {
    return item.item_name || item.name || "Unknown Item";
}

function getItemStock(item) {
    return item.quantity || item.stock || 0;
}


let pendingQueue = JSON.parse(localStorage.getItem("pendingQueue") || "[]");

function saveQueue() {
    localStorage.setItem("pendingQueue", JSON.stringify(pendingQueue));
}
async function sendToServer(url, data) {

    // offline save
    if (!navigator.onLine) {
        pendingQueue.push({ url, data });
        saveQueue();
        return;
    }

    try {
        await fetch(url, {
            method: url.includes("update-rate") ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json",
                "branch": BRANCH
            },
            body: JSON.stringify(data)
        });
    } catch (err) {
        // fallback offline queue
        pendingQueue.push({ url, data });
        saveQueue();
    }
}

// change rate function
async function updateRate(table_id, frame_rate, century_rate) {
    try {

        console.log("SENDING:", {
            table_id,
            frame_rate,
            century_rate,
            branch: BRANCH
        });

        await sendToServer(
    "https://snooker-backend-pmjj.onrender.com/api/tables/update-rate",
    {
        table_id,
        frame_rate,
        century_rate,
        branch: BRANCH
    }
);
        let t = tables.find(x => String(x.id) === String(table_id));
if (t) {
    t.frameRate = frame_rate;
    t.centuryRate = century_rate;
}

// ❌ REMOVE loadTablesFromServer

// ❌ REMOVE render & restore here

saveState(); // only save

// UI will update via socket (REAL SOURCE)

    } catch (err) {
        console.error("Rate update error:", err);
    }
}

socket.on("table-rate-updated", (data) => {

    if (data.branch !== BRANCH) return;

    console.log("⚡ RATE UPDATE:", data);

    let t = tables.find(x => String(x.id) === String(data.table_id));

    if (!t) return;

    // ✅ DIRECT UPDATE (NO RELOAD)
    t.frameRate = Number(data.frame_rate);
    t.centuryRate = Number(data.century_rate);

    // 🔥 IMPORTANT: force playType sync
    if (t.playType === "frame") {
        t.playType = "frame";
    } else {
        t.playType = "century";
    }

    updateDisplay(t.id);

// 🔥 BUTTON STATE FIX (VERY IMPORTANT)
if (t.isRunning) {
    updateButtons(t.id, "running");
}
else if (t.afterCheckout) {
    updateButtons(t.id, "afterCheckout");
}
else {
    updateButtons(t.id, "idle");
}

// ❌ DO NOT FULL RENDER
// renderTables();  ❌ REMOVE THIS
});

/******************************************************
 * GLOBAL DATA + LOCALSTORAGE SETUP
 ******************************************************/
let tables = [];
let shift1 = JSON.parse(localStorage.getItem("shift1") || "null");
let shift2 = JSON.parse(localStorage.getItem("shift2") || "null");
let dayRanges = JSON.parse(localStorage.getItem("dayRanges") || "[]");
let editTargetId = null;
let deleteTargetId = null;

let afterCheckoutMap = JSON.parse(localStorage.getItem("afterCheckoutMap") || "{}");

function saveAfterCheckout() {
    localStorage.setItem("afterCheckoutMap", JSON.stringify(afterCheckoutMap));
}
let finalAmountMap = JSON.parse(localStorage.getItem("finalAmountMap") || "{}");

function saveFinalAmount() {
    localStorage.setItem("finalAmountMap", JSON.stringify(finalAmountMap));
}
let finalSecondsMap = JSON.parse(localStorage.getItem("finalSecondsMap") || "{}");

function saveFinalSeconds() {
    localStorage.setItem("finalSecondsMap", JSON.stringify(finalSecondsMap));
}
let checkoutTimeMap = JSON.parse(localStorage.getItem("checkoutTimeMap") || "{}");

function saveCheckoutTime() {
    localStorage.setItem("checkoutTimeMap", JSON.stringify(checkoutTimeMap));
}
let checkinTimeMap = JSON.parse(localStorage.getItem("checkinTimeMap") || "{}");

function saveCheckinTime() {
    localStorage.setItem("checkinTimeMap", JSON.stringify(checkinTimeMap));
}
/******************************************************
 * SAVE STATE (MANDATORY)
 ******************************************************/
function saveState() {
    localStorage.setItem("snookerTables", JSON.stringify(tables));
}

/******************************************************
 * PAGE LOAD INITIALIZER
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {

    await loadTablesFromServer();

    renderTables();
    restoreTimers();

    bindAddTablePopup();
    bindShiftButtons();
    bindHistoryButtons();
});

async function loadTablesFromServer() {
    try {
const branch = (BRANCH || "").trim();

console.log("TABLES PAGE BRANCH:", branch);

if (!branch) {
    alert("Session expired — please login again");
    window.location.href = "../index.html";
    return;
}

const currentDayId = localStorage.getItem("currentDayId");

const res = await fetch(
  `https://snooker-backend-pmjj.onrender.com/api/tables?branch=${branch}`
);

const data = await res.json();

// 🔥 SAFE HANDLING
const tableList = Array.isArray(data) ? data : data.tables || [];
const sessions = data.sessions || [];

const runningIds = sessions.map(s => s.table_id);

const uniqueTables = {};

tableList.forEach(t => {
    uniqueTables[t.table_id] = t;
});
let newTables = Object.values(uniqueTables).map(t => {

    let session = (data.sessions || []).find(
        s => String(s.table_id) === String(t.table_id)
    );

    // 🔥 ADD THIS LINE
    let existing = tables.find(x => String(x.id) === String(t.table_id));

    return {
        id: t.table_id,
        name: t.table_id,

playType: session
    ? session.play_type
    : "frame",

        frameRate: Number(t.frame_rate || 8),
centuryRate: Number(t.century_rate || 10),
    

        isRunning: runningIds.includes(t.table_id),

        afterCheckout: afterCheckoutMap[t.table_id] || false,
        finalAmount: finalAmountMap[t.table_id] || 0,
        finalSeconds: finalSecondsMap[t.table_id] || 0,

        checkinTime: session
            ? new Date(session.start_time).getTime()
            : checkinTimeMap[String(t.table_id)] || null,

        checkoutTime: session && session.end_time
            ? new Date(session.end_time).getTime()
            : checkoutTimeMap[String(t.table_id)] || null,

        playSeconds: 0,
        liveAmount: 0,
        canteenTotal: 0,
        canteenItems: {},
        history: []
    };
});

// 🔥 SAFE MERGE (CRITICAL)
newTables.forEach(nt => {

    let existing = tables.find(t => String(t.id) === String(nt.id));

 if (existing && existing.isRunning) {
    nt.checkinTime = existing.checkinTime;
    nt.playSeconds = existing.playSeconds;
    nt.canteenTotal = existing.canteenTotal;
    nt.canteenItems = existing.canteenItems;
    nt.afterCheckout = existing.afterCheckout;

    // ❌ REMOVE THIS LINE (VERY IMPORTANT)
    // nt.liveAmount = existing.liveAmount;
}
});

tables = newTables;
// ✅ HISTORY LOAD FROM NEW API
const historyRes = await fetch(
  "https://snooker-backend-pmjj.onrender.com/api/tables/history/all"
);

const historyData = await historyRes.json();

const dayStartTime = Number(localStorage.getItem("dayStartTime") || 0); // ✅ ADD

historyData.forEach(s => {

    if (new Date(s.start_time).getTime() < dayStartTime) return;

    let t = tables.find(x => String(x.id) === String(s.table_id));

    if (t) {
        t.history.push({
            checkin: new Date(s.start_time).getTime(),
            checkout: new Date(s.end_time).getTime(),
            playSeconds: (s.total_minutes || 0) * 60,
            rate: s.frame_rate,
            amount: s.total_amount,
            canteenAmount: 0,
            total: s.total_amount,
            paid: true
        });
    }
});

    } catch (err) {
        console.error("LOAD TABLES ERROR:", err);
        loadDefaultTables(); // fallback
    }
}

/******************************************************
 * ADD TABLE POPUP BINDING (FIX)
 ******************************************************/
function bindAddTablePopup() {

    // popup open
    document.getElementById("addTableBtn").onclick = () => {
        document.getElementById("addTablePopup").classList.remove("hidden");
    };

    // popup close
    document.getElementById("cancelAddBtn").onclick = () => {
        document.getElementById("addTablePopup").classList.add("hidden");
    };

    // create table
    document.getElementById("createTableBtn").onclick = async () => {

        let name = document.getElementById("tableNameInput").value.trim();
        let frame = document.getElementById("frameRateInput").value;
        let cen = document.getElementById("centuryRateInput").value;

        if (!name) return alert("Enter table name");

let res = await fetch("https://snooker-backend-pmjj.onrender.com/api/tables/create", {
    method: "POST",
headers: {
  "Content-Type": "application/json",
  "branch": BRANCH
},
body: JSON.stringify({
    table_id: name,
    frame_rate: Number(frame) || 8,
    century_rate: Number(cen) || 10,
    branch: BRANCH
})
});

let data = await res.json();

// ✅ ERROR HANDLE
if (!res.ok) {
    alert(data.message || "Error creating table");
    return;
}

        await loadTablesFromServer();
        renderTables();

        document.getElementById("addTablePopup").classList.add("hidden");
    };
}

/******************************************************
 * CREATE DEFAULT TABLES (FIRST TIME ONLY)
 ******************************************************/
function loadDefaultTables() {

    let names = ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "Table 6"];

    names.forEach(name => {
tables.push({
    id: Date.now() + Math.random(),
    name,
    frameRate: 7,
    centuryRate: 10,
    selectedRate: 7,

    isRunning: false,
    checkinTime: null,
    checkoutTime: null,
    playSeconds: 0,
    liveAmount: 0,
    canteenTotal: 0,

    canteenItems: {}, // ✅ FIX

    history: []
});
    });

    saveState();
}

/******************************************************
 * RENDER ALL TABLE CARDS
 ******************************************************/
function renderTables() {
    const box = document.getElementById("tablesContainer");
    box.innerHTML = "";

    tables.forEach(t => {

        const div = document.createElement("div");
        div.classList.add("table-box");

        div.innerHTML = `
            <div class="table-title">${t.name}</div>

<div class="rate-selector">
<select onchange='handleRateChange("${t.id}", this)'>

<option value="frame-${t.frameRate}" 
${t.playType === "frame" ? "selected" : ""}>
Frame (${t.frameRate})
</option>

<option value="century-${t.centuryRate}" 
${t.playType === "century" ? "selected" : ""}>
Century (${t.centuryRate})
</option>

</select>
            </div>

            <div class="timer-box">
                <div class="timer-line"><span>Check-in:</span><span id="checkin-${t.id}">--:--:--</span></div>
                <div class="timer-line"><span>Checkout:</span><span id="checkout-${t.id}">--:--:--</span></div>
                <div class="timer-line"><span>Play Time:</span><span id="playtime-${t.id}">00:00:00</span></div>
                <div class="timer-line"><span>Amount:</span><span id="amount-${t.id}">0</span></div>
                <div class="timer-line" style="font-size:12px; color:#0f0;" id="canteen-items-${t.id}"></div>
            </div>

            <div class="table-actions">

                <div class="big-btn-row">
                    <button id="checkinBtn-${t.id}" class="neon-btn big-btn" onclick='checkIn("${t.id}")'>CHECK IN</button>
                    <button id="checkoutBtn-${t.id}" class="neon-btn big-btn red hidden" onclick='checkOut("${t.id}")'>CHECK OUT</button>
                    <div id="afterRow-${t.id}" class="dual-btn-row hidden">
                        <button class="neon-btn big-btn" onclick='showBill("${t.id}")'>VIEW BILL</button>
                        <button class="neon-btn big-btn" onclick='checkIn("${t.id}")'>CHECK IN</button>
                    </div>
                </div>

                <div class="second-row">
                    <button id="historyBtn-${t.id}" class="neon-btn small-btn" onclick='openHistory("${t.id}")'>HISTORY</button>
                    <button id="editBtn-${t.id}" class="neon-btn small-btn" onclick='editTable("${t.id}")'>EDIT</button>
                    <button id="deleteBtn-${t.id}" class="neon-btn small-btn red" onclick='deleteTableOpen("${t.id}")'>DELETE</button>

                   <button id="canteenBtn-${t.id}" class="neon-btn small-btn hidden" onclick='openCanteen("${t.id}")'>CANTEEN</button>
                    <button id="shiftBtn-${t.id}" class="neon-btn small-btn hidden" onclick='openTableShift("${t.id}")'>SHIFT TABLE</button>
                </div>

            </div>
        `;

        box.appendChild(div);
    });
}

/******************************************************
 * CHANGE RATE
 ******************************************************/
function changeRate(id, rateType, value) {

    let table = tables.find(t => String(t.id) === String(id));
    if (!table) return;

    if (rateType === "frame") {
        table.frameRate = Number(value);
        table.playType = "frame";
    } 
    else if (rateType === "century") {
        table.centuryRate = Number(value);
        table.playType = "century";
    }

    updateRate(
        table.id,
        table.frameRate,
        table.centuryRate
    );

    // ✅ UI UPDATE YAHAN HOGA (CORRECT PLACE)
    updateDisplay(id);

    if (table.isRunning) {
        updateButtons(id, "running");
    }
}
function handleRateChange(id, select) {
    const value = select.value;

    const [type, rate] = value.split("-");

    changeRate(id, type, rate);
}
/******************************************************
 * CHECK-IN FUNCTION
 ******************************************************/
async function checkIn(id) {
    let t = tables.find(x => String(x.id) === String(id));

 if (t.isRunning) {
    console.log("Already running - ignore");
    return;
}
  

    t.isRunning = true;
    t.checkinTime = Date.now();
    checkinTimeMap[id] = t.checkinTime;
saveCheckinTime();
    t.afterCheckout = false;
    delete afterCheckoutMap[id];
saveAfterCheckout();
    t.checkoutTime = null;
    t.playSeconds = 0;

    t.liveAmount = 0;
    t.canteenTotal = 0;
    t.canteenItems = {}; // 🔥 ADD THIS LINE

    updateButtons(id, "running");
    runTimer(id);
    saveState();

await fetch("https://snooker-backend-pmjj.onrender.com/api/tables/start", {
    method: "POST",
   headers: {
  "Content-Type": "application/json",
  "branch": BRANCH
},
    body: JSON.stringify({
        table_id: id,
        frame_rate: t.frameRate,
        century_rate: t.centuryRate,
        play_type: t.playType || "frame",
        branch: BRANCH
    })
});

}




/******************************************************
 * CHECK-OUT FUNCTION
 ******************************************************/
async function checkOut(id) {

    let btn = document.getElementById(`checkoutBtn-${id}`);
    if (btn) btn.disabled = true;

    let t = tables.find(x => String(x.id) === String(id));

    // 🔒 DOUBLE CLICK PROTECTION
    if (t._stopping) {
        if (btn) btn.disabled = false;
        return;
    }

    t._stopping = true;

    try {
        // 🔒 UI FREEZE (temporary)
        t.isRunning = false;
        t.afterCheckout = true;

        t.checkoutTime = Date.now();
        t.finalSeconds = t.playSeconds;

        // ✅ SAVE LOCAL STATE (only UI purpose)
        afterCheckoutMap[id] = true;
        checkoutTimeMap[id] = t.checkoutTime;
        finalSecondsMap[id] = t.finalSeconds;

        saveAfterCheckout();
        saveCheckoutTime();
        saveFinalSeconds();

        // ❌ NO HISTORY PUSH HERE (IMPORTANT FIX)

        // 🔥 API CALL
        const res = await fetch("https://snooker-backend-pmjj.onrender.com/api/tables/stop", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "branch": BRANCH
            },
            body: JSON.stringify({
                table_id: id
            })
        });

        const data = await res.json();
        console.log("STOP RESPONSE:", data);

        if (data && data.success) {

            // ✅ FINAL AMOUNT FROM BACKEND ONLY
            t.finalAmount = Number(data.total);

            finalAmountMap[id] = t.finalAmount;
            saveFinalAmount();

            // 🔥 UI UPDATE
            updateButtons(id, "afterCheckout");
            updateDisplay(id);

            // 🔥 FULL SYNC FROM BACKEND (MOST IMPORTANT)
            await loadTablesFromServer();
            renderTables();
            restoreTimers();
        }

    } catch (err) {
        console.error("CHECKOUT ERROR:", err);
    }

    finally {
        t._stopping = false;

        if (btn) btn.disabled = false;
    }
}



/******************************************************
 * TIMER — (1 SEC = 1 MIN CHARGE FIX)
 ******************************************************/
function runTimer(id) {
    let t = tables.find(x => String(x.id) === String(id));
    if (!t || !t.isRunning) return;

    t.playSeconds = Math.floor((Date.now() - t.checkinTime) / 1000);

    // FIXED BILLING
    const rate = t.playType === "century" ? t.centuryRate : t.frameRate;
t.liveAmount = Math.ceil(t.playSeconds / 60) * rate;

    updateDisplay(id);
    saveState();

    setTimeout(() => runTimer(id), 1000);
}

/******************************************************
 * UPDATE DISPLAY
 ******************************************************/
function updateDisplay(id) {
    let t = tables.find(x => String(x.id) === String(id));

    document.getElementById(`checkin-${id}`).innerText = t.checkinTime ? formatTime(t.checkinTime) : "--:--:--";
    document.getElementById(`checkout-${id}`).innerText = t.checkoutTime ? formatTime(t.checkoutTime) : "--:--:--";
    document.getElementById(`playtime-${id}`).innerText =
    formatSeconds(t.afterCheckout ? t.finalSeconds : t.playSeconds);
    document.getElementById(`amount-${id}`).innerText =
    (t.afterCheckout ? t.finalAmount : t.liveAmount) + t.canteenTotal;
    let itemsHTML = "";

Object.values(t.canteenItems).forEach(item => {
    itemsHTML += `${item.name} x${item.qty}<br>`;
});

let el = document.getElementById(`canteen-items-${id}`);
if (el) el.innerHTML = itemsHTML;
}

/******************************************************
 * FORMAT HELPERS
 ******************************************************/
function formatTime(ms){
    return new Date(ms).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}
function pad(n){ return n<10 ? "0"+n : n; }
function formatSeconds(sec){
    let h = Math.floor(sec/3600);
    let m = Math.floor((sec%3600)/60);
    let s = sec%60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/******************************************************
 * BUTTON STATUS LOGIC (FULL FIX)
 ******************************************************/
function updateButtons(id, mode) {

    let checkInBtn = document.getElementById(`checkinBtn-${id}`);
    let checkOutBtn = document.getElementById(`checkoutBtn-${id}`);
    let afterRow = document.getElementById(`afterRow-${id}`);

    let histBtn = document.getElementById(`historyBtn-${id}`);
    let editBtn = document.getElementById(`editBtn-${id}`);
    let delBtn = document.getElementById(`deleteBtn-${id}`);

    let canteenBtn = document.getElementById(`canteenBtn-${id}`);
    let shiftBtn = document.getElementById(`shiftBtn-${id}`);

    if (mode === "running") {

        checkInBtn.classList.add("hidden");
        checkOutBtn.classList.remove("hidden");
        afterRow.classList.add("hidden");

        histBtn.classList.add("hidden");
        editBtn.classList.add("hidden");
        delBtn.classList.add("hidden");

        canteenBtn.classList.remove("hidden");
        shiftBtn.classList.remove("hidden");
    }
    else if (mode === "afterCheckout") {

        checkInBtn.classList.add("hidden");
        checkOutBtn.classList.add("hidden");
        afterRow.classList.remove("hidden");

        histBtn.classList.remove("hidden");
        editBtn.classList.remove("hidden");
        delBtn.classList.remove("hidden");

        canteenBtn.classList.add("hidden");
        shiftBtn.classList.add("hidden");
    }
    else {
        checkInBtn.classList.remove("hidden");
        checkOutBtn.classList.add("hidden");
        afterRow.classList.add("hidden");

        histBtn.classList.remove("hidden");
        editBtn.classList.remove("hidden");
        delBtn.classList.remove("hidden");

        canteenBtn.classList.add("hidden");
        shiftBtn.classList.add("hidden");
    }
}
/******************************************************
 * BILL POPUP — SHOW BILL FOR A TABLE
 ******************************************************/
async function showBill(id) {

    let t = tables.find(x => String(x.id) === String(id));

    let canteenItemsFromDB = [];

    try {
 const branch = BRANCH;

const res = await fetch(
  `https://snooker-backend-pmjj.onrender.com/api/tables/canteen-items/${t.id}?branch=${branch}`
);
        const data = await res.json();
        canteenItemsFromDB = data || [];
    } catch (err) {
        console.error("Canteen items fetch error:", err);
    }

    let academy = localStorage.getItem("academyName") || "Rasson Snooker Academy";
    let branch = BRANCH || "Rasson1";

    let checkin = t.checkinTime ? formatTime(t.checkinTime) : "--";
    let checkout = t.checkoutTime ? formatTime(t.checkoutTime) : "--";
    let playtime = formatSeconds(t.finalSeconds || t.playSeconds);

    let bill = document.getElementById("billDetails");

    // ✅ CANTEEN BUILD
    let canteenDetails = "";
    let canteenTotal = 0;

    canteenItemsFromDB.forEach(item => {
        let total = Number(item.price) * Number(item.quantity);
        canteenTotal += total;

        canteenDetails += `
            <p style="margin:2px 0;">
                ${item.name} &nbsp;&nbsp; ${item.quantity}
            </p>
        `;
    });

    if (!canteenDetails) {
        canteenDetails = `<p>No items</p>`;
    }

    let gameAmount = t.finalAmount || t.liveAmount;

    // ✅ FINAL BILL HTML
    bill.innerHTML = `
    <div class="bill-print-box">

        <img src="../assets/bill-logo.png" style="width:200px;">

        <p><b>${academy}</b></p>
        <p>${branch}</p>

        <hr>

        <p><b>${t.name}</b></p>

        <hr>

        <p>Check-in: ${checkin}</p>
        <p>Checkout: ${checkout}</p>
        <p>Play Time: ${playtime}</p>

        <hr>

        <p>Game: Rs ${gameAmount}</p>
        <p>Canteen: Rs ${canteenTotal}</p>

        <hr>

        <p><b>Total: Rs ${gameAmount + canteenTotal}</b></p>

        <hr>

        <p><b>Canteen Items:</b></p>
        ${canteenDetails}

        <hr>

        <p>Thanks for visit</p>

    </div>
    `;

    document.getElementById("billPopup").classList.remove("hidden");

    document.getElementById("paidBtn").onclick = () => completePayment(id);
    document.getElementById("cancelBillBtn").onclick =
        () => document.getElementById("billPopup").classList.add("hidden");
}

function completePayment(id) {

    let t = tables.find(x => String(x.id) === String(id));
    t.afterCheckout = false;   // ✅ reset after payment
    delete finalAmountMap[id];
saveFinalAmount();
    delete checkinTimeMap[id];
saveCheckinTime();
    delete afterCheckoutMap[id];
saveAfterCheckout();

    // Find last history entry (latest checkout)
    let last = t.history[t.history.length - 1];

    if (!last) {
        alert("No bill found.");
        return;
    }

    // Mark as paid
    last.paid = true;

    saveState();

    // Auto print bill
    window.print();

    // Close bill popup
    document.getElementById("billPopup").classList.add("hidden");

    // Reset table UI (ready for new check-in)
    updateButtons(id, "idle");
    updateDisplay(id);
}




/******************************************************
 * CANTEEN POPUP — FOOD ITEMS
 ******************************************************/
async function openCanteen(id) {

    const branch = BRANCH || "Rasson1";

    const res = await fetch(
        `https://snooker-backend-pmjj.onrender.com/api/inventory/${branch}`
    );

const items = await res.json();

// 🔥 ADD THIS LINE (DEBUG)
console.log("INVENTORY DATA:", items);

window.inventoryItems = items;

    let list = document.getElementById("canteenList");
    list.innerHTML = "";

items.forEach(item => {

    const name = getItemName(item);
    const stock = getItemStock(item);

    list.innerHTML += `
        <div style="margin-bottom:10px;">
            <b>${name}</b> - Rs ${item.price} (Stock: ${stock})
            <br>
            <button onclick="addItem('${id}', ${item.id}, ${item.price})">➕</button>
            <button onclick="removeItem('${id}', ${item.id}, ${item.price})">➖</button>
        </div>
    `;
});

    document.getElementById("canteenPopup").classList.remove("hidden");

    document.getElementById("closeCanteenBtn").onclick =
        () => document.getElementById("canteenPopup").classList.add("hidden");
}

async function addItem(tableId, itemId, price) {

    let t = tables.find(x => x.id == tableId);

    await fetch("https://snooker-backend-pmjj.onrender.com/api/inventory/use", {
        method: "POST",
 headers: {
  "Content-Type": "application/json",
  "branch": BRANCH
},
        body: JSON.stringify({
            table_id: tableId,
            item_id: itemId
        })
    });

let item = window.inventoryItems.find(x => x.id == itemId);

if (!item) {
    alert("Item not found ❌");
    return;
}

const name = getItemName(item);

if (!t.canteenItems[itemId]) {
    t.canteenItems[itemId] = {
        name: name,
        qty: 0,
        price: price
    };
}

t.canteenItems[itemId].qty += 1;
t.canteenTotal += price;

alert(name + " added ✅");

updateDisplay(tableId);
}

async function removeItem(tableId, itemId, price) {

    let t = tables.find(x => x.id == tableId);

    await fetch("https://snooker-backend-pmjj.onrender.com/api/inventory/remove", {
        method: "POST",
  headers: {
  "Content-Type": "application/json",
  "branch": BRANCH
},
        body: JSON.stringify({
            table_id: tableId,
            item_id: itemId
        })
    });

    // 🔥 item exist check
    if (!t.canteenItems[itemId]) {
        return alert("Item not added yet ❌");
    }

    // 🔥 quantity reduce
    t.canteenItems[itemId].qty -= 1;

    // 🔥 agar 0 ho gaya to delete
    if (t.canteenItems[itemId].qty <= 0) {
        delete t.canteenItems[itemId];
    }

    // 🔥 total update
    t.canteenTotal = Math.max(t.canteenTotal - price, 0);

    alert("Item removed ❌");

    updateDisplay(tableId);
}

/******************************************************
 * EDIT TABLE POPUP
 ******************************************************/
function editTable(id) {
    let t = tables.find(x => String(x.id) === String(id));
    editTargetId = id;

    document.getElementById("editTableName").value = t.name;
    document.getElementById("editFrameRate").value = t.frameRate;
    document.getElementById("editCenturyRate").value = t.centuryRate;

    document.getElementById("editTablePopup").classList.remove("hidden");

    document.getElementById("saveEditBtn").onclick = updateTable;
    document.getElementById("cancelEditBtn").onclick = () =>
        document.getElementById("editTablePopup").classList.add("hidden");
}

function updateTable() {
    let t = tables.find(x => x.id === editTargetId);

    t.name = document.getElementById("editTableName").value.trim();
    t.frameRate = Number(document.getElementById("editFrameRate").value);
    t.centuryRate = Number(document.getElementById("editCenturyRate").value);

    // 🔥 BACKEND SAVE (MISSING THA)
    updateRate(
        t.id,           // table_id
        t.frameRate,      // frame
        t.centuryRate     // century
    );

    saveState();
    renderTables();

    document.getElementById("editTablePopup").classList.add("hidden");
}

/******************************************************
 * DELETE TABLE POPUP
 ******************************************************/
function deleteTableOpen(id) {
    deleteTargetId = id;
    document.getElementById("deletePopup").classList.remove("hidden");

    document.getElementById("confirmDeleteBtn").onclick = deleteTableConfirm;
    document.getElementById("cancelDeleteBtn").onclick =
        () => document.getElementById("deletePopup").classList.add("hidden");
}

function deleteTableConfirm() {
    tables = tables.filter(x => x.id !== deleteTargetId);

    saveState();
    renderTables();

    document.getElementById("deletePopup").classList.add("hidden");
}

/******************************************************
 * OPEN HISTORY POPUP (FULL FIX)
 ******************************************************/
function openHistory(id) {

    let t = tables.find(x => String(x.id) === String(id));

    let body = document.getElementById("historyTableBody");
    body.innerHTML = "";

    if (t.history.length === 0) {
        body.innerHTML = `
            <tr><td colspan="9" style="text-align:center;">No history found.</td></tr>
        `;
    } else {
        t.history.forEach((h, index) => {
            body.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${new Date(h.checkin).toLocaleString()}</td>
                    <td>${new Date(h.checkout).toLocaleString()}</td>
                    <td>${formatSeconds(h.playSeconds)}</td>
                    <td>${h.rate}</td>
                    <td>${h.amount}</td>
                    <td>${h.canteenAmount}</td>
                    <td>${h.total}</td>
                    <td>
    ${h.paid
        ? `<button class="paid-btn" disabled>PAID</button>`
        : `<button class="unpaid-btn" onclick="openBillFromHistory('${id}', ${index})">UNPAID</button>`
    }
</td>

                </tr>
            `;
        });
    }

    document.getElementById("historyPopup").classList.remove("hidden");

    document.getElementById("closeHistoryBtn").onclick =
        () => document.getElementById("historyPopup").classList.add("hidden");
}

function openBillFromHistory(tableId, historyIndex) {

    let t = tables.find(x => String(x.id) === String(tableId));
    let h = t.history[historyIndex];

    let academy = localStorage.getItem("academyName") || "Rasson Snooker Academy";
    let branch = BRANCH || "Rasson1";

    let checkin = h.checkin ? new Date(h.checkin).toLocaleTimeString() : "--";
    let checkout = h.checkout ? new Date(h.checkout).toLocaleTimeString() : "--";
    let playtime = formatSeconds(h.playSeconds || 0);

    let bill = document.getElementById("billDetails");

    // canteen items
    let canteenDetails = "";
    let canteenTotal = 0;

    Object.values(h.canteenItems || {}).forEach(item => {
        let total = item.qty * item.price;
        canteenTotal += total;

        canteenDetails += `
            <p style="margin:2px 0;">
                ${item.name} &nbsp;&nbsp; ${item.qty}
            </p>
        `;
    });

    if (!canteenDetails) {
        canteenDetails = `<p>No items</p>`;
    }

    bill.innerHTML = `
    <div class="bill-print-box">

        <img src="../assets/bill-logo.png" style="width:200px;">

        <p><b>${academy}</b></p>
        <p>${branch}</p>

        <hr>

        <p><b>${t.name}</b></p>

        <hr>

        <p>Check-in: ${checkin}</p>
        <p>Checkout: ${checkout}</p>
        <p>Play Time: ${playtime}</p>

        <hr>

        <p>Game: Rs ${h.amount}</p>
        <p>Canteen: Rs ${canteenTotal}</p>

        <hr>

        <p><b>Total: Rs ${h.amount + canteenTotal}</b></p>

        <hr>

        <p><b>Canteen Items:</b></p>
        ${canteenDetails}

        <hr>

        <p>Thanks for visit</p>

    </div>
    `;

    document.getElementById("billPopup").classList.remove("hidden");
}
/******************************************************
 * SHIFT TABLE POPUP (OPEN)
 ******************************************************/
function openTableShift(id) {
    let t = tables.find(x => String(x.id) === String(id));

    if (!t.isRunning) {
        alert("Only running tables can be shifted.");
        return;
    }

    window._shiftSourceTable = id;

    let sel = document.getElementById("shiftTableSelect");
    sel.innerHTML = "";

    tables.forEach(tb => {
        if (!tb.isRunning && tb.id !== id) {
            sel.innerHTML += `<option value="${tb.id}">${tb.name}</option>`;
        }
    });

    if (sel.innerHTML === "") {
        alert("No free tables available to shift.");
        return;
    }

    document.getElementById("shiftTablePopup").classList.remove("hidden");

    document.getElementById("cancelShiftTableBtn").onclick =
        () => document.getElementById("shiftTablePopup").classList.add("hidden");

    document.getElementById("confirmShiftTableBtn").onclick =
        shiftPlayerToNewTable;
}

/******************************************************
 * SHIFT PLAYER TO NEW TABLE (MAIN LOGIC)
 ******************************************************/
function shiftPlayerToNewTable() {

    let oldId = window._shiftSourceTable;
    let newId = document.getElementById("shiftTableSelect").value;

    let oldT = tables.find(x => x.id === oldId);
   let newT = tables.find(x => String(x.id) === String(newId));

    // Move session to new table
    newT.isRunning = true;
    newT.checkinTime = oldT.checkinTime;
    newT.playSeconds = oldT.playSeconds;
    newT.liveAmount = oldT.liveAmount;
    newT.canteenTotal = oldT.canteenTotal;
    newT.canteenItems = { ...oldT.canteenItems }; // ✅ FIX

    

    runTimer(newT.id);

    // Reset old table

    oldT.isRunning = false;
    oldT.checkinTime = null;
    oldT.checkoutTime = null;
    oldT.playSeconds = 0;
    oldT.liveAmount = 0;
    oldT.canteenTotal = 0;
    oldT.canteenItems = {}; // ✅ FINAL FIX

    saveState();
    renderTables();

    document.getElementById("shiftTablePopup").classList.add("hidden");

    alert(`Shifted successfully to ${newT.name}`);
}
/******************************************************
 * SHIFT BUTTON BINDING
 ******************************************************/
function bindShiftButtons() {

    document.getElementById("shiftCloseBtn").onclick = openShiftSummary;

    document.getElementById("confirmShiftCloseBtn").onclick = () => {

        let btn = document.getElementById("shiftCloseBtn");

        if (btn.innerText.includes("Day")) {
            closeDay();
        }
        else if (btn.innerText.includes("1")) {
            closeShift1();
        }
        else {
            closeShift2();
        }
    };

    document.getElementById("cancelShiftSummaryBtn").onclick =
        () => hidePopup("shiftSummaryPopup");
    hidePopup("shiftSummaryPopup");

}

/******************************************************
 * POPUP SHOW/HIDE
 ******************************************************/
function showPopup(id) {
    document.getElementById(id).classList.remove("hidden");
}
function hidePopup(id) {
    document.getElementById(id).classList.add("hidden");
}

/******************************************************
 * OPEN SHIFT SUMMARY POPUP (Shift1 + Shift2 + Combined)
 ******************************************************/
function openShiftSummary() {

    let btn = document.getElementById("shiftCloseBtn");
    let summaryBody = document.getElementById("shiftSummaryBody");
    let title = document.getElementById("shiftSummaryTitle");



    let now = new Date().toLocaleString();

    
    


    // Title Logic
    if (btn.innerText.includes("Day")) {
        title.innerText = "Day Summary";
        document.getElementById("confirmShiftCloseBtn").innerText = "Close Day";
    } else {
        title.innerText = "Shift Summary";
        document.getElementById("confirmShiftCloseBtn").innerText = "Close Shift";
    }

// Load frozen snapshots of shift1 & shift2
let s1 = JSON.parse(localStorage.getItem("shift1") || "{}");
let s2 = JSON.parse(localStorage.getItem("shift2") || "{}");

// Build Combined summary by adding both shift values
let combined = {
    gameTotal: (s1.gameTotal || 0) + (s2.gameTotal || 0),
    canteenTotal: (s1.canteenTotal || 0) + (s2.canteenTotal || 0),
    gameCollection: (s1.gameCollection || 0) + (s2.gameCollection || 0),
    canteenCollection: (s1.canteenCollection || 0) + (s2.canteenCollection || 0),
    gameBalance: (s1.gameBalance || 0) + (s2.gameBalance || 0),
    canteenBalance: (s1.canteenBalance || 0) + (s2.canteenBalance || 0),
    expenses: (s1.expenses || 0) + (s2.expenses || 0)
};

combined.closingCash = 
    (combined.gameCollection + combined.canteenCollection) - combined.expenses;

// APPLY to HTML table
summaryBody.innerHTML = `
    <tr>
        <td>Shift 1</td>
        <td>${s1.gameTotal || 0}</td>
        <td>${s1.canteenTotal || 0}</td>
        <td>${s1.gameCollection || 0}</td>
        <td>${s1.canteenCollection || 0}</td>
        <td>${s1.gameBalance || 0}</td>
        <td>${s1.canteenBalance || 0}</td>
        <td>${s1.expenses || 0}</td>
        <td>${s1.closingCash || 0}</td>
        <td>${s1.openTime || "-"}</td>
        <td>${s1.closeTime || "-"}</td>
    </tr>

    <tr>
        <td>Shift 2</td>
        <td>${s2.gameTotal || 0}</td>
        <td>${s2.canteenTotal || 0}</td>
        <td>${s2.gameCollection || 0}</td>
        <td>${s2.canteenCollection || 0}</td>
        <td>${s2.gameBalance || 0}</td>
        <td>${s2.canteenBalance || 0}</td>
        <td>${s2.expenses || 0}</td>
        <td>${s2.closingCash || 0}</td>
        <td>${s2.openTime || "-"}</td>
        <td>${s2.closeTime || "-"}</td>
    </tr>

    <tr class="combined-row">
        <td>Combined</td>
        <td>${combined.gameTotal}</td>
        <td>${combined.canteenTotal}</td>
        <td>${combined.gameCollection}</td>
        <td>${combined.canteenCollection}</td>
        <td>${combined.gameBalance}</td>
        <td>${combined.canteenBalance}</td>
        <td>${combined.expenses}</td>
        <td>${combined.closingCash}</td>
        <td>-</td>
        <td>-</td>
    </tr>
`;


    showPopup("shiftSummaryPopup");
}

/******************************************************
 * SHIFT 1 CLOSE (running tables allowed)
 ******************************************************/
function closeShift1() {

    let now = Date.now();

    // Start of shift1 = the moment the user closes shift1
    let startMs = parseInt(localStorage.getItem("shift1Start") || now);

    // Save this ONLY FIRST TIME
    localStorage.setItem("shift1Start", startMs);

    let endMs = now;

    let snap = calculateShiftSnapshot(startMs, endMs);

    shift1 = {
        shift: 1,
        openTime: new Date(startMs).toLocaleString(),
        closeTime: new Date(endMs).toLocaleString(),
        startMs: startMs,
        endMs: endMs,
        ...snap
    };

    localStorage.setItem("shift1", JSON.stringify(shift1));

    document.getElementById("shiftCloseBtn").innerText = "Shift 2 Close";
    hidePopup("shiftSummaryPopup");

// ✅ BACKEND SAVE
sendToServer("https://snooker-backend-pmjj.onrender.com/api/shifts/close", {
    shift_number: 1,
    branch_code: BRANCH,

    open_time: shift1.openTime,
    close_time: shift1.closeTime,

    game_total: snap.gameTotal,
    canteen_total: snap.canteenTotal,

    game_collection: snap.gameCollection,
    canteen_collection: snap.canteenCollection,

    expenses: snap.expenses,
    closing_cash: snap.closingCash
});

}




/******************************************************
 * SHIFT 2 CLOSE (no running tables allowed)
 ******************************************************/
function closeShift2() {

    // cannot close if any table still running
    let running = tables.some(t => t.isRunning);
    if (running) {
        alert("Please checkout all tables before closing Shift 2!");
        return;
    }

    let now = Date.now();

    // Shift1 snapshot required
    let s1 = JSON.parse(localStorage.getItem("shift1") || "{}");

    let startMs = s1.endMs || 0;
    let endMs = now;

    let snap = calculateShiftSnapshot(startMs, endMs);

    shift2 = {
        shift: 2,
        openTime: new Date(startMs).toLocaleString(),
        closeTime: new Date(endMs).toLocaleString(),
        startMs: startMs,
        endMs: endMs,
        ...snap
    };

    localStorage.setItem("shift2", JSON.stringify(shift2));

    document.getElementById("shiftCloseBtn").innerText = "Day Close";
    hidePopup("shiftSummaryPopup");

// ✅ BACKEND SAVE
sendToServer("https://snooker-backend-pmjj.onrender.com/api/shifts/close", {
    shift_number: 2,
    branch_code: BRANCH,

    open_time: shift2.openTime,
    close_time: shift2.closeTime,

    game_total: snap.gameTotal,
    canteen_total: snap.canteenTotal,

    game_collection: snap.gameCollection,
    canteen_collection: snap.canteenCollection,

    expenses: snap.expenses,
    closing_cash: snap.closingCash
});

}



/******************************************************
 * DAY CLOSE — RESET EVERYTHING + NEW DAY START
 ******************************************************/
function closeDay() {

    // LOAD SHIFT 1 & SHIFT 2 SNAPSHOTS
    let s1 = JSON.parse(localStorage.getItem("shift1") || "null");
    let s2 = JSON.parse(localStorage.getItem("shift2") || "null");

    if (!s1 || !s2) {
        alert("Please close Shift 1 and Shift 2 before Day Close.");
        return;
    }

    // --------------- BUILD COMBINED SUMMARY --------------------
    let combined = {
        gameTotal: (s1.gameTotal || 0) + (s2.gameTotal || 0),
        canteenTotal: (s1.canteenTotal || 0) + (s2.canteenTotal || 0),

        gameCollection: (s1.gameCollection || 0) + (s2.gameCollection || 0),
        canteenCollection: (s1.canteenCollection || 0) + (s2.canteenCollection || 0),

        gameBalance: (s1.gameBalance || 0) + (s2.gameBalance || 0),
        canteenBalance: (s1.canteenBalance || 0) + (s2.canteenBalance || 0),

        expenses: (s1.expenses || 0) + (s2.expenses || 0),
    };

    // CLOSING CASH = TOTAL PAID – EXPENSES
    combined.closingCash =
        (combined.gameCollection + combined.canteenCollection) - combined.expenses;

    // -------- SAVE INTO DAY HISTORY LIST ------------
    let dayList = JSON.parse(localStorage.getItem("dayHistory") || "[]");

 let tableData = {};

tables.forEach(t => {

let t1 = getTableShiftTotalsFromDay(t, s1);
let t2 = getTableShiftTotalsFromDay(t, s2);

    tableData[String(t.id)] = {
        shift1: t1,
        shift2: t2
    };
});

dayList.push({
    date: new Date().toLocaleDateString(),
    shift1: s1,
    shift2: s2,
    combined: combined,
    tables: tableData   // 🔥 THIS IS THE FIX
});

    localStorage.setItem("dayHistory", JSON.stringify(dayList));

    // -------- SAVE DATE RANGE INTO dayRanges ----------
    let dayRanges = JSON.parse(localStorage.getItem("dayRanges") || "[]");

dayRanges.push({
    start: s1.startMs,
    end: s2.endMs
});

    localStorage.setItem("dayRanges", JSON.stringify(dayRanges));

    // -------- RESET EVERYTHING FOR A NEW DAY ----------
    localStorage.removeItem("shift1");
    localStorage.removeItem("shift2");
    localStorage.removeItem("dayStart");
    localStorage.setItem("currentDayId", Date.now());
    localStorage.setItem("dayStartTime", Date.now());


    // RESET ALL TABLES
    tables.forEach(t => {
        t.history = [];   // ✅ ADD THIS LINE
        t.isRunning = false;
        t.checkinTime = null;
        t.checkoutTime = null;
        t.playSeconds = 0;
        t.liveAmount = 0;
        t.canteenTotal = 0;
        t.canteenItems = {};
    });

    saveState();
    renderTables();

    // RESET SHIFT BUTTON
    document.getElementById("shiftCloseBtn").innerText = "Shift 1 Close";

    hidePopup("shiftSummaryPopup");  
    alert("Day Closed Successfully & Saved in Day History!");

    // ✅ BACKEND DAY SAVE (EXACT JAGAH)
sendToServer("https://snooker-backend-pmjj.onrender.com/api/day/close", {
  date: new Date().toISOString().slice(0, 10),
  branch: BRANCH
});
    
}



/******************************************************
 * SHIFT HELPERS
 ******************************************************/
function getGameTotal() {
    return tables.reduce((sum, t) => sum + t.liveAmount, 0);
}

function getTotalCollection() {
    return tables.reduce((sum, t) => sum + (t.liveAmount + t.canteenTotal), 0);
}

function calculateShiftSnapshot(startTime, endTime) {

    let gameTotal = 0;
    let canteenTotal = 0;
    let gameCollection = 0;
    let canteenCollection = 0;
    let gameBalance = 0;
    let canteenBalance = 0;

    tables.forEach(t => {
        t.history.forEach(h => {

            if (h.checkin >= startTime && h.checkout <= endTime) {

                let g = Number(h.amount || 0);
                let c = Number(h.canteenAmount || 0);

                gameTotal += g;
                canteenTotal += c;

                if (h.paid) {
                    gameCollection += g;
                    canteenCollection += c;
                } else {
                    gameBalance += g;
                    canteenBalance += c;
                }
            }
        });
    });

    // LOAD shift expenses
    let expensesArr = JSON.parse(localStorage.getItem("expenses") || "[]");
    let expenses = expensesArr
        .filter(e => e.time >= startTime && e.time <= endTime)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    let closingCash = (gameCollection + canteenCollection) - expenses;

    return {
        gameTotal,
        canteenTotal,
        gameCollection,
        canteenCollection,
        gameBalance,
        canteenBalance,
        expenses,
        closingCash
    };
}


/******************************************************
 * HISTORY BUTTON BINDING
 ******************************************************/
function bindHistoryButtons() {

    // DAY HISTORY
    document.getElementById("dayHistoryBtn").onclick = openDayHistory;
    document.getElementById("cancelDayHistoryBtn").onclick =
        () => hidePopup("dayHistoryPopup");

    document.getElementById("printDayHistoryBtn").onclick =
        () => window.print();

    // TABLE HISTORY
    document.getElementById("tableHistoryBtn").onclick = openTableHistory;
    document.getElementById("cancelTableHistoryBtn").onclick =
        () => hidePopup("tableHistoryPopup");

    document.getElementById("printTableHistoryBtn").onclick =
        () => window.print();
}

/******************************************************
 * 🟢 OPEN DAY HISTORY POPUP
 ******************************************************/
function openDayHistory() {

    let sel = document.getElementById("dayHistoryDateSelect");
    sel.innerHTML = "";

    dayRanges.forEach(r => {
        let startDate = new Date(r.start);
let endDate = new Date(r.end);

// DATE
let startDateStr = startDate.toLocaleDateString("en-GB");

// TIME
let startTimeStr = startDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
});

let endTimeStr = endDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
});

// FINAL
sel.innerHTML += `
<option>
${startDateStr} | ${startTimeStr} → ${endTimeStr}
</option>`;
    });

    document.getElementById("dayHistoryBranch").innerText =
        "Branch: " + (BRANCH || "Rasson1");

    loadDaySummary();
    document.getElementById("dayHistoryDateSelect").onchange = loadDaySummary;

    showPopup("dayHistoryPopup");
}

/******************************************************
 * 🟢 BUILD DAY SUMMARY (SHIFT 1 + SHIFT 2 + COMBINED)
 ******************************************************/
function loadDaySummary() {

    let dayList = JSON.parse(localStorage.getItem("dayHistory") || "[]");

    if (dayList.length === 0) {
        document.getElementById("dayCombinedBody").innerHTML =
            "<tr><td colspan='10'>No day history found</td></tr>";
        return;
    }

    let select = document.getElementById("dayHistoryDateSelect");
    let index = select.selectedIndex;

    let selectedDay = dayList[index];

    if (!selectedDay) return;

    let s1 = selectedDay.shift1 || {};
    let s2 = selectedDay.shift2 || {};
    let c = selectedDay.combined || {};

    // ✅ SHIFT 1
    document.getElementById("dayShift1Body").innerHTML = `
        <tr>
            <td>${s1.gameTotal || 0}</td>
            <td>${s1.canteenTotal || 0}</td>
            <td>${s1.gameCollection || 0}</td>
            <td>${s1.canteenCollection || 0}</td>
            <td>${s1.gameBalance || 0}</td>
            <td>${s1.canteenBalance || 0}</td>
            <td>${s1.expenses || 0}</td>
            <td>${s1.closingCash || 0}</td>
        </tr>
    `;

    // ✅ SHIFT 2
    document.getElementById("dayShift2Body").innerHTML = `
        <tr>
            <td>${s2.gameTotal || 0}</td>
            <td>${s2.canteenTotal || 0}</td>
            <td>${s2.gameCollection || 0}</td>
            <td>${s2.canteenCollection || 0}</td>
            <td>${s2.gameBalance || 0}</td>
            <td>${s2.canteenBalance || 0}</td>
            <td>${s2.expenses || 0}</td>
            <td>${s2.closingCash || 0}</td>
        </tr>
    `;

    // ✅ COMBINED
    document.getElementById("dayCombinedBody").innerHTML = `
        <tr>
            <td>${c.gameTotal || 0}</td>
            <td>${c.canteenTotal || 0}</td>
            <td>${c.gameCollection || 0}</td>
            <td>${c.canteenCollection || 0}</td>
            <td>${c.gameBalance || 0}</td>
            <td>${c.canteenBalance || 0}</td>
            <td>${c.expenses || 0}</td>
            <td>${c.closingCash || 0}</td>
            <td>${selectedDay.date}</td>
        </tr>
    `;
}

/******************************************************
 * 🟢 BUILD A SINGLE SUMMARY ROW
 ******************************************************/
function buildDayRow(s) {
    return `
        <tr>
            <td>${s.gameTotal}</td>
            <td>${s.canteenTotal}</td>
            <td>${s.gameCollection}</td>
            <td>${s.canteenCollection}</td>
            <td>${s.gameBalance}</td>
            <td>${s.canteenBalance}</td>
            <td>${s.expenses}</td>
            <td>${s.closingCash}</td>
        </tr>
    `;

}


/******************************************************
 * 🟢 OPEN TABLE HISTORY POPUP
 ******************************************************/
function openTableHistory() {

    let dateSel = document.getElementById("tableHistoryDateSelect");
    dateSel.innerHTML = "";

    dayRanges.forEach(r => {
let startDate = new Date(r.start);
let endDate = new Date(r.end);

// DATE FORMAT: 17/04/2026
let startDateStr = startDate.toLocaleDateString("en-GB");
let endDateStr = endDate.toLocaleDateString("en-GB");

// TIME FORMAT
let startTimeStr = startDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
});

let endTimeStr = endDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
});

// FINAL DISPLAY
dateSel.innerHTML += `
<option value="${r.start}">
${startDateStr} | ${startTimeStr} → ${endTimeStr}
</option>
`;
    });

    let tableSel = document.getElementById("tableHistoryTableSelect");
    tableSel.innerHTML = tables
        .map(t => `<option value="${t.id}">${t.name}</option>`)
        .join("");

    document.getElementById("tableHistoryBranch").innerText =
    "Branch: " + (BRANCH || "Rasson1");

    loadSelectedTableHistory();




    showPopup("tableHistoryPopup");
    document.getElementById("tableHistoryDateSelect").onchange = loadSelectedTableHistory;
document.getElementById("tableHistoryTableSelect").onchange = loadSelectedTableHistory;
}

/******************************************************
 * 🟢 LOAD SUMMARY FOR SELECTED TABLE
 ******************************************************/
function loadSelectedTableHistory() {

    let tableId = document.getElementById("tableHistoryTableSelect").value;
    let t = tables.find(x => String(x.id) === String(tableId));

    if (!t) return;

let dayList = JSON.parse(localStorage.getItem("dayHistory") || "[]");
let dayIndex = document.getElementById("tableHistoryDateSelect").selectedIndex;
let selectedDay = dayList[dayIndex];

if (!selectedDay) return;

let t1 = selectedDay.tables?.[String(tableId)]?.shift1 || { time:0, game:0, canteen:0, total:0 };
let t2 = selectedDay.tables?.[String(tableId)]?.shift2 || { time:0, game:0, canteen:0, total:0 };
    document.getElementById("tableShift1Body").innerHTML =
        buildTableHistoryRow(t, t1);

    document.getElementById("tableShift2Body").innerHTML =
        buildTableHistoryRow(t, t2);

let combined = {
    time: (t1.time || 0) + (t2.time || 0),
    game: (t1.game || 0) + (t2.game || 0),
    canteen: (t1.canteen || 0) + (t2.canteen || 0),
    total: (t1.total || 0) + (t2.total || 0)
};

    document.getElementById("tableCombinedBody").innerHTML =
        buildTableHistoryRow(t, combined);
}

/******************************************************
 * 🟢 CALCULATE TABLE SUMMARY FOR SPECIFIC SHIFT
 ******************************************************/
function getTableShiftTotalsFromDay(t, shiftData) {

    if (!shiftData || !shiftData.startMs || !shiftData.endMs) {
        return { time: 0, game: 0, canteen: 0, total: 0 };
    }

    let start = shiftData.startMs;
    let end = shiftData.endMs;

    let total = 0;
    let game = 0;
    let canteen = 0;
    let time = 0;

    t.history.forEach(h => {

        if (h.checkin >= start && h.checkout <= end) {

            total += Number(h.total || 0);
            game += Number(h.amount || 0);
            canteen += Number(h.canteenAmount || 0);
            time += Number(h.playSeconds || 0);
        }
    });

    return { total, game, canteen, time };
}


/******************************************************
 * 🟢 BUILD TABLE HISTORY ROW
 ******************************************************/
function buildTableHistoryRow(t, d) {
    return `
        <tr>
            <td>${t.name}</td>
            <td>${formatSeconds(d.time || 0)}</td>
            <td>${d.game || 0}</td>
            <td>${d.canteen || 0}</td>
            <td>${d.total || 0}</td>
        </tr>
    `;
}

/******************************************************
 * TABLE HISTORY PAGINATION (FINAL FIX)
 ******************************************************/

let historyPage = 1;
let historyPerPage = 5;  // 5 rows per page (you can change this)

function nextPage() {
    let tableId = document.getElementById("tableHistoryTableSelect").value;
    let t = tables.find(x => String(x.id) === String(tableId));

    if (!t || t.history.length === 0) return;

    let maxPage = Math.ceil(t.history.length / historyPerPage);
    if (historyPage < maxPage) {
        historyPage++;
        renderHistoryPage();
    }
}

function prevPage() {
    if (historyPage > 1) {
        historyPage--;
        renderHistoryPage();
    }
}

function renderHistoryPage() {

    let tableId = document.getElementById("tableHistoryTableSelect").value;
    let t = tables.find(x => String(x.id) === String(tableId));

    let body = document.getElementById("historyTableBody");
    body.innerHTML = "";

    if (!t || t.history.length === 0) {
        body.innerHTML = "<tr><td colspan='9'>No history found.</td></tr>";
        return;
    }

    let start = (historyPage - 1) * historyPerPage;
    let end = start + historyPerPage;

    let pageRows = t.history.slice(start, end);

    pageRows.forEach((h, index) => {
        body.innerHTML += `
            <tr>
                <td>${start + index + 1}</td>
                <td>${new Date(h.checkin).toLocaleString()}</td>
                <td>${new Date(h.checkout).toLocaleString()}</td>
                <td>${formatSeconds(h.playSeconds)}</td>
                <td>${h.rate}</td>
                <td>${h.amount}</td>
                <td>${h.canteenAmount}</td>
                <td>${h.total}</td>
<td>
${h.paid
    ? `<button class="paid-btn" disabled>PAID</button>`
    : `<button class="unpaid-btn"onclick="openBillFromHistory('${tableId}', ${start + index})">UNPAID</button>`
}
</td>


            </tr>
        `;
    });

    // Update current page number display
    document.getElementById("pageNumber").innerText = historyPage;
}

/******************************************************
 * 🟢 RESTORE TIMERS ON PAGE LOAD
 ******************************************************/
function restoreTimers() {

    tables.forEach(t => {

        if (t.isRunning) {
            runTimer(t.id);
        }

        updateDisplay(t.id);
        if (t.isRunning) {
    updateButtons(t.id, "running");
}
else if (t.afterCheckout) {
    updateButtons(t.id, "afterCheckout");   // ✅ FIX
}
else {
    updateButtons(t.id, "idle");
}
    });
}

// ===============================================
// AUTO SYNC OFFLINE QUEUE EVERY 5 SEC
// ===============================================
async function syncPending() {
    if (!navigator.onLine || pendingQueue.length === 0) return;

    let copy = [...pendingQueue];
    pendingQueue = [];
    saveQueue();

    for (let job of copy) {
        try {
            await fetch(job.url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(job.data)
            });
        } catch (e) {
            pendingQueue.push(job);
        }
    }

    saveQueue();
}

// Run sync every 5 seconds
setInterval(syncPending, 5000);


