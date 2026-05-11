// config.js - RUPPY GLOBAL SYNC - 500 RUP REFERRAL + AUTO TEAM LIST + WEEKLY POINTS + ANALYTICS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, update, query, orderByChild, equalTo, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQC0WsVPr63y2xvFMSifnkjAB3TTVcIxU",
  authDomain: "ruppynetwork-50362.firebaseapp.com",
  databaseURL: "https://ruppynetwork-50362-default-rtdb.firebaseio.com",
  projectId: "ruppynetwork-50362",
  storageBucket: "ruppynetwork-50362.appspot.com",
  messagingSenderId: "132064610854",
  appId: "1:132064610854:web:3c217eaf3618007f5934e7",
  measurementId: "G-BDNYBPDTQM"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

const RUPPY_STORAGE_KEY = 'ruppy_user_cache';

// 1. Default Data - RUP- Format के साथ
function getDefaultData() {
  return {
    name: 'Guest',
    dp: null,
    balance: 0,
    taskBalance: 0,
    uid: null,
    email: null,
    myReferralCode: null,
    referredBy: null,
    referralClaimed: false,
    team: {},
    teamCount: 0,
    teamRewardEarned: 0,
    referralCount: 0,
    weeklyPoints: 0,
    posts: [],
    lastMine: 0,
    lastGift: 0,
    boostCount: 0,
    boostResetTime: Date.now(),
    firstRewardTime: 0,
    ultraRewardTime: 0,
    lastSpinTime: 0,
    createdAt: Date.now()
  };
}

// 1.1 Referral Code Generator - RUP-8X4K9M Format
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'RUP-';
  for(let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1.2 पुराना Code Check
function isValidReferralCode(code) {
  if(!code || code.length!== 10 ||!code.startsWith('RUP-')) {
    return false;
  }
  return true;
}

// 2. LocalStorage से Load
function getLocalData() {
  try {
    let stored = localStorage.getItem(RUPPY_STORAGE_KEY);
    if (stored) {
      let data = JSON.parse(stored);
      data.balance = Number(data.balance) || 0;
      data.taskBalance = Number(data.taskBalance) || 0;
      data.referralCount = Number(data.referralCount) || 0;
      return data;
    }
  } catch (e) {
    console.error('LocalStorage Error:', e);
  }
  return getDefaultData();
}

// Global Variable
window.userData = getLocalData();

// 3. Balance Display
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

// 5. 🔥 FIXED: LOGOUT/LOGIN + REFERRAL LOCK + BALANCE PROTECT
onAuthStateChanged(auth, async (user) => {
  if (user) {
    logEvent(analytics, 'login', { method: 'firebase' });
    logEvent(analytics, 'app_open');

    const userRef = ref(db, `users/${user.uid}`);

    try {
      let snapshot = await get(userRef);
      let data = null;
      let actualUID = user.uid;

      if (snapshot.exists()) {
        data = snapshot.val();
      } else {
        // 🔥 Email से पुराना Account ढूंढ - Same Gmail = Same Data
        const emailQuery = query(ref(db, 'users'), orderByChild('email'), equalTo(user.email));
        const emailSnapshot = await get(emailQuery);
        if (emailSnapshot.exists()) {
          actualUID = Object.keys(emailSnapshot.val())[0];
          data = Object.values(emailSnapshot.val())[0];
        }
      }

      if (data) {
        window.userData.uid = actualUID;
        window.userData.email = user.email;
        window.userData.name = data.name || user.displayName || user.email.split('@')[0];
        window.userData.dp = data.dp || user.photoURL || null;

        // 🔥 BUG 3 FIX: Balance कभी कम नहीं होगा - MAX लो
        const fbBalance = Number(data.balance) || 0;
        const localBalance = Number(window.userData.balance) || 0;
        window.userData.balance = Math.max(fbBalance, localBalance);

        const fbTaskBalance = Number(data.taskBalance) || 0;
        const localTaskBalance = Number(window.userData.taskBalance) || 0;
        window.userData.taskBalance = Math.max(fbTaskBalance, localTaskBalance);

        // 🔥 BUG 1 FIX: Referral Code Lock - RUP- वाला Change नहीं होगा
        if(data.myReferralCode && data.myReferralCode.startsWith('RUP-') && data.myReferralCode.length === 10) {
          window.userData.myReferralCode = data.myReferralCode;
        } else {
          window.userData.myReferralCode = generateReferralCode();
          await update(ref(db, `users/${actualUID}`), { myReferralCode: window.userData.myReferralCode });
        }

        // बाकी Fields
        window.userData.posts = data.posts || [];
        window.userData.lastMine = Number(data.lastMine) || 0;
        window.userData.lastGift = Number(data.lastGift) || 0;
        window.userData.boostCount = Number(data.boostCount) || 0;
        window.userData.boostResetTime = Number(data.boostResetTime) || Date.now();
        window.userData.firstRewardTime = Number(data.firstRewardTime) || 0;
        window.userData.ultraRewardTime = Number(data.ultraRewardTime) || 0;
        window.userData.lastSpinTime = Number(data.lastSpinTime) || 0;
        window.userData.team = data.team || {};
        window.userData.teamCount = Number(data.teamCount) || 0;
        window.userData.teamRewardEarned = Number(data.teamRewardEarned) || 0;
        window.userData.referralCount = Number(data.referralCount) || 0;
        window.userData.weeklyPoints = Number(data.weeklyPoints) || 0;
        window.userData.referredBy = data.referredBy || null;
        window.userData.referralClaimed = data.referralClaimed || false;
        window.userData.createdAt = data.createdAt || Date.now();

        // Local ज्यादा है तो Firebase Update करो
        if(localBalance > fbBalance || localTaskBalance > fbTaskBalance) {
          await update(ref(db, `users/${actualUID}`), {
            balance: window.userData.balance,
            taskBalance: window.userData.taskBalance
          });
        }

      } else {
        logEvent(analytics, 'sign_up');
        window.userData = getDefaultData();
        window.userData.uid = user.uid;
        window.userData.email = user.email;
        window.userData.name = user.displayName || user.email.split('@')[0];
        window.userData.dp = user.photoURL || null;
        window.userData.myReferralCode = generateReferralCode();
        window.userData.createdAt = Date.now();
        await set(userRef, window.userData);
        await checkAndApplyReferral();
      }
    } catch (error) {
      console.error('Firebase Load Error:', error);
    }

    localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();
    loadProfileEverywhere();

  } else {
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

  localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(data));
  window.userData = data;
  updateBalanceBox();

  if(!data.uid) return;
  try {
    const userRef = ref(db, `users/${data.uid}`);
    await update(userRef, {
      balance: data.balance,
      taskBalance: data.taskBalance,
      name: data.name,
      dp: data.dp,
      email: data.email,
      myReferralCode: data.myReferralCode,
      referredBy: data.referredBy,
      referralClaimed: data.referralClaimed,
      team: data.team || {},
      teamCount: data.teamCount || 0,
      teamRewardEarned: data.teamRewardEarned || 0,
      referralCount: data.referralCount || 0,
      weeklyPoints: data.weeklyPoints || 0,
      posts: data.posts || [],
      lastMine: data.lastMine || 0,
      lastGift: data.lastGift || 0,
      boostCount: data.boostCount || 0,
      boostResetTime: data.boostResetTime || Date.now(),
      firstRewardTime: data.firstRewardTime || 0,
      ultraRewardTime: data.ultraRewardTime || 0,
      lastSpinTime: data.lastSpinTime || 0
    });
  } catch (error) {
    console.error('Firebase Save Error:', error);
  }
}

// 7. Post Reward +10 RUPPY + ANALYTICS
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

  logEvent(analytics, 'post_reward', {
    reward_amount: 10,
    total_posts_today: todayPosts.length + 1
  });

  await window.saveRuppyData(window.userData);
  alert("+10 RUPPY Added");
}

// 8. Page Load पे तुरंत Balance दिखाओ
document.addEventListener('DOMContentLoaded', () => {
  updateBalanceBox();
  loadProfileEverywhere();
});

// 9. AUTO SYNC
window.addEventListener('storage', (e) => {
  if(e.key === RUPPY_STORAGE_KEY && e.newValue){
    window.userData = JSON.parse(e.newValue);
    updateBalanceBox();
    loadProfileEverywhere();
  }
});

// 🔥 BUG 2 FIX: AUTO REFERRAL REWARD - New=100, Old=500
async function checkAndApplyReferral() {
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get('ref');

  if (refCode &&!window.userData.referralClaimed) {
    const usersRef = ref(db, 'users');
    const q = query(usersRef, orderByChild('myReferralCode'), equalTo(refCode));
    const snapshot = await get(q);

    if (snapshot.exists()) {
      const referrerUID = Object.keys(snapshot.val())[0];
      const referrerData = Object.values(snapshot.val())[0];

      if (referrerUID && referrerUID!== window.userData.uid) {
        // New User को 100 RUP
        window.userData.balance = (Number(window.userData.balance) || 0) + 100;
        window.userData.referredBy = referrerUID;
        window.userData.referralClaimed = true;

        // Old User को 500 RUP + Count + Points
        const updates = {};
        updates[`users/${referrerUID}/balance`] = (Number(referrerData.balance) || 0) + 500;
        updates[`users/${referrerUID}/referralCount`] = (Number(referrerData.referralCount) || 0) + 1;
        updates[`users/${referrerUID}/teamRewardEarned`] = (Number(referrerData.teamRewardEarned) || 0) + 500;
        updates[`users/${referrerUID}/weeklyPoints`] = (Number(referrerData.weeklyPoints) || 0) + 10;
        updates[`users/${referrerUID}/team/${window.userData.uid}`] = {
          name: window.userData.name || 'User',
          uid: window.userData.uid,
          created_at: Date.now(),
          lastMine: Date.now()
        };

        // New User Update
        updates[`users/${window.userData.uid}/balance`] = window.userData.balance;
        updates[`users/${window.userData.uid}/referredBy`] = referrerUID;
        updates[`users/${window.userData.uid}/referralClaimed`] = true;

        await update(ref(db), updates);

        logEvent(analytics, 'referral_applied', {
          bonus_earned: 100,
          referrer_bonus: 500,
          referrer_id: referrerUID
        });

        localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(window.userData));
        showCustomAlert(`🎉 Welcome Bonus 100 RUP मिला!`);
        updateBalanceBox();
      }
    }
  }
}

// ✅ MANUAL REFERRAL - 500 RUP + 10 POINTS + ANALYTICS
window.applyReferralCodeManual = async function(code){
  if(!window.userData.uid){
    return {success: false, msg: 'Please login first'};
  }

  if(!code ||!code.startsWith('RUP-')){
    return {success: false, msg: 'Invalid code format'};
  }

  if(code === window.userData.myReferralCode){
    return {success: false, msg: 'Cannot use your own code'};
  }

  if(window.userData.referredBy){
    return {success: false, msg: 'Already used referral code'};
  }

  try {
    const usersRef = ref(db, 'users');
    const q = query(usersRef, orderByChild('myReferralCode'), equalTo(code));
    const snapshot = await get(q);

    if(!snapshot.exists()){
      return {success: false, msg: 'Referral code not found'};
    }

    const referrerUID = Object.keys(snapshot.val())[0];
    const referrerData = Object.values(snapshot.val())[0];

    if(referrerUID === window.userData.uid){
      return {success: false, msg: 'Cannot use your own code'};
    }

    await push(ref(db, 'referrals'), {
      referrer_uid: referrerUID,
      referred_uid: window.userData.uid,
      bonus_given: 500,
      created_at: Date.now()
    });

    const updates = {};
    // ✅ REFERRER को Update - 500 RUP
    updates[`users/${referrerUID}/balance`] = (referrerData.balance || 0) + 500;
    updates[`users/${referrerUID}/teamCount`] = (referrerData.teamCount || 0) + 1;
    updates[`users/${referrerUID}/referralCount`] = (referrerData.referralCount || 0) + 1;
    updates[`users/${referrerUID}/teamRewardEarned`] = (referrerData.teamRewardEarned || 0) + 500;
    updates[`users/${referrerUID}/weeklyPoints`] = (referrerData.weeklyPoints || 0) + 10;
    updates[`users/${referrerUID}/team/${window.userData.uid}`] = {
      name: window.userData.name || 'User',
      uid: window.userData.uid,
      created_at: Date.now(),
      lastMine: Date.now()
    };

    // ✅ NEW USER को Update - 500 RUP
    updates[`users/${window.userData.uid}/balance`] = (window.userData.balance || 0) + 500;
    updates[`users/${window.userData.uid}/referredBy`] = referrerUID;
    updates[`users/${window.userData.uid}/referralClaimed`] = true;

    await update(ref(db), updates);

    logEvent(analytics, 'referral_applied', {
      bonus_earned: 500,
      referrer_id: referrerUID
    });

    window.userData.referredBy = referrerUID;
    window.userData.referralClaimed = true;
    window.userData.balance = (window.userData.balance || 0) + 500;
    localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();

    return {success: true, msg: '✅ +500 RUP Credited! Referrer got 500 RUP + 10 Points'};

  } catch(error){
    console.error('Apply Referral Error:', error);
    return {success: false, msg: 'Error: ' + error.message};
  }
}

// ✅ TRANSACTION HISTORY FUNCTIONS
window.addTransaction = async function(type, amount, note = ''){
  if(!window.userData.uid) return;
  try {
    const txnData = {
      type: type,
      amount: Number(amount),
      note: note,
      timestamp: Date.now(),
      balanceAfter: Number(window.userData.balance) || 0
    };
    await push(ref(db, `transactions/${window.userData.uid}`), txnData);
  } catch(error){
    console.error('Transaction Error:', error);
  }
}

window.getTransactionHistory = async function(){
  if(!window.userData.uid) return [];
  try {
    const txnRef = ref(db, `transactions/${window.userData.uid}`);
    const snapshot = await get(txnRef);
    if(snapshot.exists()){
      const data = Object.values(snapshot.val());
      return data.sort((a,b) => b.timestamp - a.timestamp);
    }
    return [];
  } catch(error){
    console.error('History Error:', error);
    return [];
  }
}

// 🔥 ANALYTICS ADDED - Line 7: Mining Function Example - अपने Mine Button में ये Call कर
window.logMineEvent = function(tokensEarned) {
  logEvent(analytics, 'mine_success', {
    tokens_earned: tokensEarned,
    user_balance: window.userData.balance,
    timestamp: Date.now()
  });
}
