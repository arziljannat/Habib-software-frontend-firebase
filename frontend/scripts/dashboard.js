// DASHBOARD JS (FINAL UPDATED VERSION)

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});

const role = (localStorage.getItem("role") || "").toLowerCase();

let incomeChartInstance;
let billsChartInstance;

function loadDashboard() {
    fetch(`https://snooker-backend-pmjj.onrender.com/api/dashboard/summary`, {
        headers: {
            "Authorization": localStorage.getItem("token"),
            "role": localStorage.getItem("role"),
            "branch": localStorage.getItem("branch")
        }
    })
        .then(res => res.json())
        .then(data => {

            if (!data || data.success === false) {
                console.error("Invalid dashboard response:", data);
                return;
            }

            // =========================
            // BASIC STATS
            // =========================
            setText("totalTables", data.total_tables);
            setText("activeTables", data.active_tables);
            setText("freeTables", data.free_tables);

            // ❌ OLD SESSION BASED (REMOVE)
            setText("todaySessions", 0);
            setText("completedSessions", 0);

            // ✅ NEW DAY SUMMARY DATA
            setText("timeIncome", data.today_game_total);
            setText("canteenIncome", data.today_canteen_total);

            setText("totalIncome", data.today_total_income);

            // 👉 OPTIONAL (agar UI me jagah ho)
            setText("monthlyExpense", data.today_expense);

            setText("unpaidBills", data.today_unpaid);
            setText("paidBills", data.today_paid);

            // =========================
            // ADMIN DATA
            // =========================
            if (role !== "staff") {

                if (data.monthly_income !== undefined) {
                    setText("monthlyIncome", data.monthly_income);
                }

                if (data.monthly_expense !== undefined) {
                    setText("monthlyExpense", data.monthly_expense);
                }

                if (data.net_profit !== undefined) {
                    setText("netProfit", data.net_profit);
                }

                if (data.daily) {
                    loadCharts(data);
                }
            }

            // =========================
            // STAFF UI HIDE
            // =========================
            if (role === "staff") {
                document.querySelectorAll(".admin-only").forEach(el => {
                    el.style.display = "none";
                });
            }

        })
        .catch(err => {
            console.error("Dashboard Load Error:", err);
        });
}


// =========================
// SAFE TEXT SETTER
// =========================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = value ?? 0;
    }
}


// =========================
// CHARTS
// =========================
function loadCharts(data) {

    if (incomeChartInstance) incomeChartInstance.destroy();
    if (billsChartInstance) billsChartInstance.destroy();

    // INCOME CHART
    const ctx1 = document.getElementById("incomeChart");
    if (!ctx1) return;

    const labels = data.daily.map(d => d.date).reverse();
    const chartData = data.daily.map(d => d.total).reverse();

    incomeChartInstance = new Chart(ctx1, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Income (PKR)",
                data: chartData,
                backgroundColor: "rgba(0,255,150,0.6)",
                borderColor: "#00ff99",
                borderWidth: 2
            }]
        }
    });

    // BILLS CHART
    const ctx2 = document.getElementById("billsChart");
    if (!ctx2) return;

    billsChartInstance = new Chart(ctx2, {
        type: "doughnut",
        data: {
            labels: ["Paid", "Unpaid"],
            datasets: [{
                data: [data.today_paid || 0, data.today_unpaid || 0],
                backgroundColor: [
                    "rgba(0,255,100,0.7)",
                    "rgba(255,0,50,0.7)"
                ],
                borderColor: "#00ff99",
                borderWidth: 2
            }]
        }
    });
}
