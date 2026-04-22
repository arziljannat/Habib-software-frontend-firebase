// ==========================
// 🔵 DATE FUNCTION
// ==========================
function getDates() {
    let fromInput = document.getElementById("fromDate").value;
    let toInput = document.getElementById("toDate").value;

    if (!fromInput || !toInput) {
        alert("Select date range");
        return null;
    }

    let from = new Date(fromInput);
    let to = new Date(toInput);

    if (isNaN(from) || isNaN(to)) {
        alert("Invalid date");
        return null;
    }

    from.setHours(0,0,0,0);
    to.setHours(23,59,59,999);

    return {
        from: from.toISOString(),
        to: to.toISOString()
    };
}


// ==========================
// 🔵 BUTTON EVENTS (FINAL CLEAN)
// ==========================
const buttons = document.querySelectorAll(".report-btn");

let currentReport = "game"; // default

// Default active
buttons.forEach(btn => btn.classList.remove("active"));
buttons[0].classList.add("active");

// Game button
buttons[0].onclick = () => {
    currentReport = "game";

    buttons.forEach(btn => btn.classList.remove("active"));
    buttons[0].classList.add("active");
};

// Canteen button
buttons[1].onclick = () => {
    currentReport = "canteen";

    buttons.forEach(btn => btn.classList.remove("active"));
    buttons[1].classList.add("active");
};

// View Report button
document.getElementById("viewReportBtn").onclick = () => {
    if (currentReport === "game") {
        loadReport();
    } else {
        loadCanteenReport();
    }
};


// ==========================
// 🔵 MAIN FUNCTION
// ==========================
async function loadReport() {

    let dates = getDates();
    if (!dates) return;

    let branch = localStorage.getItem("branch") || "Rasson1";
    let box = document.getElementById("reportOutput");

    box.innerHTML = "Loading...";

    try {
        let res = await fetch(`https://snooker-backend-pmjj.onrender.com/api/reports/full?branch=${branch}&from=${dates.from}&to=${dates.to}`);
        let data = await res.json();

        if (!res.ok) throw data;

        // ==========================
        // 🎱 TABLE REPORT
        // ==========================
        let html = "<h3>🎱 Game Income (Table Wise)</h3>";

        (data.tables || []).forEach(t => {
            html += `
            <div style="margin-bottom:10px;">
                <b>${t.table_id}</b><br>
                Shift 1: Rs ${t.shift1}<br>
                Shift 2: Rs ${t.shift2}<br>
                Total: Rs ${t.total}
            </div>
            <hr>`;
        });

        // ==========================
        // 🍔 CANTEEN
        // ==========================


        // ==========================
        // 💸 EXPENSES
        // ==========================
        html += `
        <h3>💸 Total Expenses: Rs ${data.expenses || 0}</h3>
        <hr>
        `;

        // ==========================
        // 💰 FINAL
        // ==========================
        html += `
        <h3>💰 Total Income: Rs ${data.total_income || 0}</h3>
        <h2 style="color:#00ffcc;">🔥 Net Profit: Rs ${data.net_profit || 0}</h2>
        `;

        box.innerHTML = html;

    } catch (e) {
        console.error(e);
        box.innerHTML = `<p>${e.error || "Error loading report"}</p>`;
    }
}
// ==========================
// 🟡 CANTEEN REPORT FUNCTION
// ==========================
async function loadCanteenReport() {

    let dates = getDates();
    if (!dates) return;

    let branch = localStorage.getItem("branch") || "Rasson1";
    let box = document.getElementById("reportOutput");

    box.innerHTML = "Loading...";

    try {
        let res = await fetch(
            `https://snooker-backend-pmjj.onrender.com/api/reports/canteen?branch=${branch}&from=${dates.from}&to=${dates.to}`
        );

        let data = await res.json();

        if (!res.ok) throw data;

        let html = `
        <h3>🍔 Canteen Income Report</h3>
        <div>
            Shift 1: Rs ${data.shift1 || 0}<br>
            Shift 2: Rs ${data.shift2 || 0}<br>
        </div>
        <hr>
        <h2 style="color:#00ffcc;">Total Canteen Income: Rs ${data.total || 0}</h2>
        `;

        box.innerHTML = html;

    } catch (e) {
        console.error(e);
        box.innerHTML = `<p>${e.error || "Error loading canteen report"}</p>`;
    }
}
