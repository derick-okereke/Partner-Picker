// --- CONFIGURATION ---
// Paste your unique SheetDB URL right here between the quotes
const API_URL = "https://sheetdb.io/api/v1/mivhuraycnyae";
const MAX_PER_GROUP = 3; // The maximum number of people allowed per group

// --- STEP 1: Check Local Storage on Page Load ---
// This runs immediately when the page opens
window.onload = function () {
  if (localStorage.getItem("hasVoted") === "true") {
    // If they already voted, hide the buttons and show a message
    document.getElementById("buttonGrid").style.display = "none";
    document.getElementById("statusMessage").innerText =
      "You've already locked in your group! Wait for everyone else to finish.";
    document.getElementById("checkGroupBtn").style.display = "block";
  }
};

// --- STEP 2: The Main Button Click Logic ---
async function submitVote(selectedNumber) {
  const nameInput = document.getElementById("playerName").value.trim();

  // Make sure they actually typed a name
  if (nameInput === "") {
    document.getElementById("inputFeedback").innerText =
      "Please enter your nameID!";
    return;
  } else {
    // Clear the error if they typed something!
    document.getElementById("inputFeedback").innerText = "";
  }

  // Temporarily disable the buttons so they can't spam click while it loads
  let buttons = document.querySelectorAll(".number-btn");
  buttons.forEach((btn) => (btn.disabled = true));
  document.getElementById("statusMessage").innerText =
    "Checking availability...";

  try {
    // 1. Read the database to see how many people picked this number
    let response = await fetch(API_URL);
    let data = await response.json();

    // Count how many rows have this specific Vote
    let currentCount = data.filter((row) => row.Vote == selectedNumber).length;

    // 2. The Bouncer: Check if the group is ful
    if (currentCount >= MAX_PER_GROUP) {
      alert(
        `Oh no! Group ${selectedNumber} is already full. Pick a different number.`,
      );
      buttons.forEach((btn) => (btn.disabled = false)); //Re-enable buttons
      return;
    }

    // 3. If there is space, update their specific row in the database!
    // Because we pre-filled their names, we use PATCH to update their existing row.
    let patchUrl = `${API_URL}/Name/${nameInput}`;
    let updateResponse = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          Status: "Assigned",
          Vote: selectedNumber,
        },
      }),
    });

    // 4. Confirm it worked, set Local Storage, and update UI
    if (updateResponse.ok) {
      localStorage.setItem("hasVoted", "true");
      localStorage.setItem("myGroupNumber", selectedNumber);

      document.getElementById("buttonGrid").style.display = "none";
      document.getElementById("checkGroupBtn").style.display = "block";

      // --- NEW: THE NAME REVEAL LOGIC ---

      // Grab everyone from the database who has already picked this number
      let existingMembers = data.filter((row) => row.Vote == selectedNumber);

      // Pluck out just their names
      let memberNames = existingMembers.map((person) => person.Name);

      // Start building the success message
      let finalMessage = `Success! You are locked into Group ${selectedNumber}.`;

      // Check if there are already people in the group
      if (memberNames.length > 0) {
        // If yes, list their names!
        finalMessage += ` You are joining: ${memberNames.join(", ")}`;
      } else {
        // If no one is in it yet, tell them they are the first!
        finalMessage += ` You are the first person in this group!`;
      }

      // Print the final message to the screen
      document.getElementById("statusMessage").innerText = finalMessage;
      document.getElementById("statusMessage").style.color = "green";

      // ----------------------------------
    } else {
      // Replaced the alert with inline text!
      document.getElementById("inputFeedback").innerText =
        "Name not found! Check your spelling (case sensitive).";
      buttons.forEach((btn) => (btn.disabled = false));
      document.getElementById("statusMessage").innerText = "";
    }
  } catch (error) {
    console.error("The actual error was:", error);
    alert("Failed to connect to the database. Try again!");
    buttons.forEach((btn) => (btn.disabled = false));
    document.getElementById("statusMessage").innerText = "";
  }
}

// --- NEW STEP: The "Check My Group" Logic ---
async function checkMyGroup() {
  // 1. Check the sticky note to see which group they belong to
  let myNumber = localStorage.getItem("myGroupNumber");

  if (!myNumber) return; // If they haven't voted, do nothing

  // Change button text so they know it's thinking
  let btn = document.getElementById("checkGroupBtn");
  btn.innerText = "⏳ Checking database...";
  btn.disabled = true;

  try {
    // 2. Read the database
    let response = await fetch(API_URL);
    let data = await response.json();

    // 3. Find everyone with their matching number
    let myGroupMembers = data.filter((row) => row.Vote == myNumber);
    let memberNames = myGroupMembers.map((person) => person.Name);

    // 4. Update the screen with the fresh list!
    document.getElementById("statusMessage").innerText =
      `You are in Group ${myNumber} with: ${memberNames.join(", ")}`;
  } catch (error) {
    alert("Failed to check the database. Try again!");
  }

  // Reset the button so they can click it again later
  btn.innerText = "🔄 Check Who Joined My Group";
  btn.disabled = false;
}

// --- STEP 3: The Reset Function (For your testing) ---
function resetMemory() {
  localStorage.clear();
  alert("Memory cleared! Refresh the page to vote again.");
}
