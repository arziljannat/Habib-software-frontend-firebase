async function login() {
  const branchCode = document.getElementById("branchCode").value.trim();
  const username = document.getElementById("loginUserId").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!branchCode || !username || !password) {
    document.getElementById("errorMsg").innerText = "All fields required";
    return;
  }

  try {
    const res = await fetch(
      "https://snooker-backend-pmjj.onrender.com/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password, branchCode })
      }
    );

    let data = {};

try {
  data = await res.json();
} catch (e) {
  document.getElementById("errorMsg").innerText = "Invalid server response";
  return;
}

    if (data.success) {
      // 🔐 save session
      localStorage.setItem("token", data.token);
      let role = data.user?.role || data.role;

if (!role) {
  document.getElementById("errorMsg").innerText = "Role not assigned";
  return;
}

localStorage.setItem("role", role);
     localStorage.setItem("branch", branchCode.replace(/\s+/g, ""));

      // 👉 redirect
      window.location.href = "../html/dashboard.html";

    } else {
      document.getElementById("errorMsg").innerText = "Invalid login";
    }
  } catch (err) {
    console.error(err);
    document.getElementById("errorMsg").innerText = "Server error";
  }
}
