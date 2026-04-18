// RUPPY GLOBAL SYNC - Firebase + LocalStorage वाला System
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

const RUPPY_STORAGE_KEY = 'ruppy_user_cache';

// 1. पहले LocalStorage से Load करो ताकि Button तुरंत चलें
function getLocalData() {
  let stored = localStorage.getItem(RUPPY_STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return {
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
}

window.userData = getLocalData();

// 2. Gmail Login होते ही Firebase से Fresh Data लाओ
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
      await set(userRef, window.userData);
    }

    localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();
    loadProfileEverywhere();
  } else {
    localStorage.removeItem(RUPPY_STORAGE_KEY);
    window.userData = { name: 'Guest', dp: null, balance: 0, taskBalance: 0, uid: null };
    updateBalanceBox();
    loadProfileEverywhere();
  }
});

// 3. Balance Firebase + Local दोनों में Save करो
window.saveRuppyData = async function(data){
  localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(data));
  if(!data.uid) return;
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
  updateBalanceBox();
}

window.loadProfileEverywhere = function(){
  const avatar = document.getElementById('userAvatar');
  if(avatar && window.userData.dp){
    avatar.innerHTML = `<img src="${window.userData.dp}">`;
  } else if(avatar){
    avatar.textContent = window.userData.name[0].toUpperCase();
  }
}

// 4. Balance को HTML में दिखाने वाला Function - FIXED
window.updateBalanceBox = function(){
  const totalEl = document.getElementById('totalBalance');
  const taskEl = document.getElementById('taskBalance');

  if(totalEl) {
    totalEl.innerText = window.userData.balance || 0;
  }
  if(taskEl) {
    taskEl.innerText = window.userData.taskBalance || 0;
  }
}

// 5. Post करने पे +10 RUPPY Add करने का Function
window.addPostReward = async function() {
  if(!window.userData.uid) return alert("पहले Login करो");

  const todayPosts = window.userData.posts.filter(p => {
    return new Date(p.time).toDateString() === new Date().toDateString();
  });

  if(todayPosts.length >= 3) {
    return alert("आज के 3 Post पूरे हो गए");
  }

  window.userData.balance = (window.userData.balance || 0) + 10;
  window.userData.posts.push({time: Date.now()});

  await window.saveRuppyData(window.userData);
  alert("+10 RUPPY Added");
}

// Page Load होते ही Balance दिखा दो
document.addEventListener('DOMContentLoaded', () => {
  updateBalanceBox();
  loadProfileEverywhere();
});
