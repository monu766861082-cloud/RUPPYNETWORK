// RUPPY GLOBAL SYNC - Firebase वाला System
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQC0WsVPr63y2xvFMSifnkjAB3TTVcIxU",
  authDomain: "ruppynetwork-50362.firebaseapp.com",
  databaseURL: "https://ruppynetwork-50362-default-rtdb.firebaseio.com",
  projectId: "ruppynetwork-50362",
  storageBucket: "ruppynetwork-50362.appspot.com",
  messagingSenderId: "132064610854",
  appId: "1:132064610854:web:3c217eaf3618007f5934e7"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Global userData - अब Firebase से आएगा
window.userData = {
  name: 'Guest',
  dp: null,
  balance: 0,
  taskBalance: 0,
  uid: null,
  posts: [],
  lastMine: 0,
  lastGift: 0,
  boostCount: 0,
  boostResetTime: Date.now(),
  firstRewardTime: 0,
  ultraRewardTime: 0
};

// Gmail Login होते ही Balance Firebase से Load करो
onAuthStateChanged(auth, async (user) => {
  if (user) {
    window.userData.uid = user.uid;
    window.userData.name = user.displayName || user.email.split('@')[0];
    window.userData.dp = user.photoURL || null;

    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      window.userData.balance = data.balance || 0;
      window.userData.taskBalance = data.taskBalance || 0;
      window.userData.posts = data.posts || [];
      window.userData.lastMine = data.lastMine || 0;
      window.userData.lastGift = data.lastGift || 0;
      window.userData.boostCount = data.boostCount || 0;
      window.userData.boostResetTime = data.boostResetTime || Date.now();
      window.userData.firstRewardTime = data.firstRewardTime || 0;
      window.userData.ultraRewardTime = data.ultraRewardTime || 0;
    } else {
      // नया User - Firebase में Entry बना दो
      await set(userRef, window.userData);
    }

    if(typeof updateBalanceBox!== 'undefined') updateBalanceBox();
    if(typeof loadProfileEverywhere!== 'undefined') loadProfileEverywhere();
  } else {
    window.userData = { name: 'Guest', dp: null, balance: 0, taskBalance: 0, uid: null };
  }
});

// Balance Firebase में Save करने का Function
window.saveRuppyData = async function(data){
  if(!data.uid) return; // UID नहीं तो Save मत कर
  const userRef = ref(db, `users/${data.uid}`);
  await update(userRef, {
    balance: Number(data.balance) || 0,
    taskBalance: Number(data.taskBalance) || 0,
    name: data.name,
    dp: data.dp,
    posts: data.posts || [],
    lastMine: data.lastMine || 0,
    lastGift: data.lastGift || 0,
    boostCount: data.boostCount || 0,
    boostResetTime: data.boostResetTime || Date.now(),
    firstRewardTime: data.firstRewardTime || 0,
    ultraRewardTime: data.ultraRewardTime || 0
  });
  window.userData = data;
}

window.loadProfileEverywhere = function(){
  const avatar = document.getElementById('userAvatar');
  if(avatar && window.userData.dp){
    avatar.innerHTML = `<img src="${window.userData.dp}">`;
  } else if(avatar){
    avatar.textContent = window.userData.name[0].toUpperCase();
  }
}
