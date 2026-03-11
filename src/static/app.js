document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupContainer = document.getElementById("signup-container");
  const authButton = document.getElementById("auth-button");
  const adminStatus = document.getElementById("admin-status");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginButton = document.getElementById("cancel-login");

  let adminToken = localStorage.getItem("adminToken") || "";
  let adminUsername = localStorage.getItem("adminUsername") || "";

  function isAdminLoggedIn() {
    return Boolean(adminToken);
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    if (isAdminLoggedIn()) {
      adminStatus.textContent = `Teacher: ${adminUsername}`;
      authButton.textContent = "Logout";
      authButton.setAttribute("aria-label", "Teacher logout");
      signupContainer.classList.remove("hidden");
    } else {
      adminStatus.textContent = "Student View";
      authButton.textContent = "👤";
      authButton.setAttribute("aria-label", "Teacher login");
      signupContainer.classList.add("hidden");
    }
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.setAttribute("aria-hidden", "false");
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    loginModal.setAttribute("aria-hidden", "true");
    loginForm.reset();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isAdminLoggedIn()
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "X-Admin-Token": adminToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "X-Admin-Token": adminToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  authButton.addEventListener("click", async () => {
    if (!isAdminLoggedIn()) {
      openLoginModal();
      return;
    }

    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: {
          "X-Admin-Token": adminToken,
        },
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }

    adminToken = "";
    adminUsername = "";
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUsername");
    updateAuthUI();
    fetchActivities();
    showMessage("Logged out", "info");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("teacher-username").value;
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      adminToken = result.token;
      adminUsername = result.username;
      localStorage.setItem("adminToken", adminToken);
      localStorage.setItem("adminUsername", adminUsername);

      closeLoginModal();
      updateAuthUI();
      fetchActivities();
      showMessage("Teacher login successful", "success");
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Login error:", error);
    }
  });

  cancelLoginButton.addEventListener("click", () => {
    closeLoginModal();
  });

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
