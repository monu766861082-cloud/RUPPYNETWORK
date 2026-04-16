// Check if user data already exists in localStorage
// If not exists, create default empty user object
if (!localStorage.getItem("ruppyUser")) {
  
  const defaultUser = {
    name: "",           // User will set from Settings
    id: "",             // Will generate when user saves
    balance: 0,         // Starting balance
    photo: "",          // Profile photo base64 or URL
    posts: []           // Community posts array
  };
  
  // Save default user to localStorage
  localStorage.setItem("ruppyUser", JSON.stringify(defaultUser));
}

// Function to get current user data from anywhere
function getUserData() {
  return JSON.parse(localStorage.getItem("ruppyUser"));
}

// Function to update user data
function updateUserData(newData) {
  localStorage.setItem("ruppyUser", JSON.stringify(newData));
}

// Function to generate random ID
function generateUserId() {
  return 'ab' + Math.floor(1000000 + Math.random() * 9000000);
}
