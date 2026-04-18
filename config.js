// config.js - RUPPY GLOBAL SYNC - LOGOUT FIX + AUTO BALANCE
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

// 1. Default Data
function getDefaultData() {
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

// 2. LocalStorage से Load - Button तुरंत चलें
function getLocalData() {
  try {
    let stored = localStorage.getItem(RUPPY_STORAGE_KEY);
    if (stored) {
      let data = JSON.parse(stored);
      data.balance = Number(data.balance) || 0;
      data.taskBalance = Number(data.taskBalance) || 0;
      return data;
    }
  } catch (e) {
    console.error('LocalStorage Error:', e);
  }
  return getDefaultData();
}

// Global Variable
window.userData = getLocalData();

// 3. Balance Display - app.html + community.html दोनों पे चलेगा
window.updateBalanceBox = function(){
  const totalEl = document.getElementById('totalBalance');
  const taskEl = document.getElementById('taskBalance');

  if(totalEl) {
    totalEl.textContent = Number(window.userData.balance) || 0;
  }
  if(taskEl) {
    taskEl.textContent = Number(window.userData.taskBalance) || 0;
  }
}

// 4. Profile Display
window.loadProfileEverywhere = function(){
  const avatar = document.getElementById('userAvatar') || document.getElementById('userDp');
  if(avatar && window.userData.dp){
    avatar.innerHTML = `<img src="${window.userData.dp}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
  } else if(avatar){
    avatar.textContent = (window.userData.name || 'U')[0].toUpperCase();
  }

  const nameEl = document.getElementById('userName');
  if(nameEl) nameEl.textContent = 'Welcome back, ' + (window.userData.name || 'User');
}

// 5. ✅ LOGOUT/LOGIN FIX - Firebase = Truth
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User Logged In
    const userRef = ref(db, `users/${user.uid}`);

    try {
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        // ✅ पुराना User - Firebase से Balance लाओ
        const data = snapshot.val();
        window.userData.uid = user.uid;
        window.userData.name = user.displayName || user.email.split('@')[0];
        window.userData.dp = user.photoURL || data.dp || null;
        window.userData.balance = Number(data.balance) || 0;
        window.userData.taskBalance = Number(data.taskBalance) || 0;
        window.userData.posts = data.posts || [];
        window.userData.lastMine = Number(data.lastMine) || 0;
        window.userData.lastGift = Number(data.lastGift) || 0;
        window.userData.boostCount = Number(data.boostCount) || 0;
        window.userData.boostResetTime = Number(data.boostResetTime) || Date.now();
        window.userData.firstRewardTime = Number(data.firstRewardTime) || 0;
        window.userData.ultraRewardTime = Number(data.ultraRewardTime) || 0;
      } else {
        // ✅ नया User - Firebase में Create करो
        window.userData.uid = user.uid;
        window.userData.name = user.displayName || user.email.split('@')[0];
        window.userData.dp = user.photoURL || null;
        await set(userRef, window.userData);
      }
    } catch (error) {
      console.error('Firebase Load Error:', error);
    }

    // ✅ Firebase से आया Balance LocalStorage में Save - Logout के बाद भी वापस आएगा
    localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();
    loadProfileEverywhere();

  } else {
    // ✅ User Logged Out - Local Clear करो पर Firebase Safe है
    localStorage.removeItem(RUPPY_STORAGE_KEY);
    window.userData = getDefaultData();
    updateBalanceBox();
    loadProfileEverywhere();
  }
});

// 6. Save Function - Firebase + Local दोनों Update
window.saveRuppyData = async function(data){
  data.balance = Number(data.balance) || 0;
  data.taskBalance = Number(data.taskBalance) || 0;

  // Local तुरंत Update
  localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(data));
  window.userData = data;
  updateBalanceBox();

  // Firebase में Save - Logout के बाद भी Safe रहेगा
  if(!data.uid) return;
  try {
    const userRef = ref(db, `users/${data.uid}`);
    await update(userRef, {
      balance: data.balance,
      taskBalance: data.taskBalance,
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
  } catch (error) {
    console.error('Firebase Save Error:', error);
  }
}

// 7. Post Reward +10 RUPPY
window.addPostReward = async function() {
  if(!window.userData.uid) return alert("पहले Login करो");

  const todayPosts = window.userData.posts.filter(p => {
    return new Date(p.time).toDateString() === new Date().toDateString();
  });

  if(todayPosts.length >= 3) {
    return alert("आज के 3 Post पूरे हो गए");
  }

  window.userData.balance = Number(window.userData.balance || 0) + 10;
  window.userData.posts.push({time: Date.now()});

  await window.saveRuppyData(window.userData);
  alert("+10 RUPPY Added");
}

// 8. Page Load पे तुरंत Balance दिखाओ
document.addEventListener('DOMContentLoaded', () => {
  updateBalanceBox();
  loadProfileEverywhere();
});

// 9. ✅ AUTO SYNC - दूसरी Tab में Balance Change हो तो यहाँ भी Update
window.addEventListener('storage', (e) => {
  if(e.key === RUPPY_STORAGE_KEY && e.newValue){
    window.userData = JSON.parse(e.newValue);
    updateBalanceBox();
    loadProfileEverywhere();
  }
});
