// config.js - RUPX GLOBAL SYNC - FINAL FIX FOR TOKEN LOSS
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

const RUPX_STORAGE_KEY = 'rupx_user_cache';

function getDefaultData() {
  return {
    name: 'Guest', dp: null, balance: 0, taskBalance: 0, uid: null, email: null,
    myReferralCode: null, referredBy: null, referralClaimed: false, team: {},
    teamCount: 0, teamRewardEarned: 0, referralCount: 0, weeklyPoints: 0,
    posts: [], lastMine: 0, lastGift: 0, boostCount: 0, boostResetTime: Date.now(),
    firstRewardTime: 0, ultraRewardTime: 0, lastSpinTime: 0, createdAt: Date.now()
  };
}

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'RUPX-';
  for(let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function isValidReferralCode(code) {
  return code && code.length === 11 && code.startsWith('RUPX-');
}

function getLocalData() {
  try {
    let stored = localStorage.getItem(RUPX_STORAGE_KEY);
    if (stored) {
      let data = JSON.parse(stored);
      data.balance = Number(data.balance) || 0;
      data.taskBalance = Number(data.taskBalance) || 0;
      data.referralCount = Number(data.referralCount) || 0;
      return data;
    }
  } catch (e) { console.error('LocalStorage Error:', e); }
  return getDefaultData();
}

window.userData = getLocalData();

window.updateBalanceBox = function(){
  const totalEl = document.getElementById('totalBalance');
  const taskEl = document.getElementById('taskBalance');
  const balEl = document.getElementById('bal');
  if(totalEl) totalEl.textContent = Number(window.userData.balance) || 0;
  if(taskEl) taskEl.textContent = Number(window.userData.taskBalance) || 0;
  if(balEl) balEl.textContent = Number(window.userData.balance) || 0;
}

window.loadProfileEverywhere = function(){
  const avatar = document.getElementById('userAvatar') || document.getElementById('userDp');
  if(avatar && window.userData.dp){
    avatar.innerHTML = `<img src="${window.userData.dp}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
  } else if(avatar){
    avatar.textContent = (window.userData.name || 'U')[0].toUpperCase();
  }
  const nameEl = document.getElementById('userName');
  if(nameEl) nameEl.textContent = 'Welcome back, ' + (window.userData.name || 'User');
  const myCodeEl = document.querySelector('[class*="invite"] span') || document.getElementById('myReferralCode');
  if(myCodeEl) myCodeEl.textContent = window.userData.myReferralCode || 'RUPX-XXXXXX';
}

window.applyReferralCodeManual = async function(code){
  if(!window.userData.uid) return {success: false, msg: 'Please login first'};
  if(!code ||!code.startsWith('RUPX-')) return {success: false, msg: 'Invalid code format'};
  if(code === window.userData.myReferralCode) return {success: false, msg: 'Cannot use your own code'};
  if(window.userData.referredBy) return {success: false, msg: 'Already used referral code'};
  try {
    const usersRef = ref(db, 'users');
    const q = query(usersRef, orderByChild('myReferralCode'), equalTo(code));
    const snapshot = await get(q);
    if(!snapshot.exists()) return {success: false, msg: 'Referral code not found'};
    const referrerUID = Object.keys(snapshot.val())[0];
    const referrerData = Object.values(snapshot.val())[0];
    if(referrerUID === window.userData.uid) return {success: false, msg: 'Cannot use your own code'};
    await push(ref(db, 'referrals'), { referrer_uid: referrerUID, referred_uid: window.userData.uid, bonus_given: 500, created_at: Date.now() });
    const updates = {};
    updates[`users/${referrerUID}/balance`] = (referrerData.balance || 0) + 500;
    updates[`users/${referrerUID}/teamCount`] = (referrerData.teamCount || 0) + 1;
    updates[`users/${referrerUID}/referralCount`] = (referrerData.referralCount || 0) + 1;
    updates[`users/${referrerUID}/teamRewardEarned`] = (referrerData.teamRewardEarned || 0) + 500;
    updates[`users/${referrerUID}/weeklyPoints`] = (referrerData.weeklyPoints || 0) + 10;
    updates[`users/${referrerUID}/team/${window.userData.uid}`] = { name: window.userData.name || 'User', uid: window.userData.uid, created_at: Date.now(), lastMine: Date.now() };
    updates[`users/${window.userData.uid}/balance`] = (window.userData.balance || 0) + 500;
    updates[`users/${window.userData.uid}/referredBy`] = referrerUID;
    updates[`users/${window.userData.uid}/referralClaimed`] = true;
    await update(ref(db), updates);
    logEvent(analytics, 'referral_applied', { bonus_earned: 500, referrer_id: referrerUID });
    window.userData.referredBy = referrerUID;
    window.userData.referralClaimed = true;
    window.userData.balance = (window.userData.balance || 0) + 500;
    localStorage.setItem(RUPX_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();
    return {success: true, msg: 'Success! +500 RUPX Credited. Referrer got 500 RUPX + 10 Points'};
  } catch(error){
    console.error('Apply Referral Error:', error);
    return {success: false, msg: 'Error: ' + error.message};
  }
}

async function checkAndApplyReferral() {
  if(!window.userData.uid || window.userData.referredBy) return;
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  if (refCode && isValidReferralCode(refCode)) {
    const result = await window.applyReferralCodeManual(refCode);
    if(result.success) alert(result.msg);
  }
}

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
        const emailQuery = query(ref(db, 'users'), orderByChild('email'), equalTo(user.email));
        const emailSnapshot = await get(emailQuery);
        if (emailSnapshot.exists()) {
          actualUID = Object.keys(emailSnapshot.val())[0];
          data = Object.values(emailSnapshot.val())[0];
          console.log('Old Account Found by Email:', actualUID);
        }
      }
      if (data) {
        window.userData.uid = actualUID;
        window.userData.email = user.email;
        window.userData.name = data.name || user.displayName || user.email.split('@')[0];
        window.userData.dp = data.dp || user.photoURL || null;
        window.userData.balance = data.balance!== null && data.balance!== undefined? Number(data.balance) : (window.userData.balance || 0);
        window.userData.taskBalance = data.taskBalance!== null && data.taskBalance!== undefined? Number(data.taskBalance) : (window.userData.taskBalance || 0);
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
        if(!isValidReferralCode(data.myReferralCode)) {
          window.userData.myReferralCode = generateReferralCode();
          await update(ref(db, `users/${actualUID}`), { myReferralCode: window.userData.myReferralCode });
        } else {
          window.userData.myReferralCode = data.myReferralCode;
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
    localStorage.setItem(RUPX_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();
    loadProfileEverywhere();
  } else {
    localStorage.removeItem(RUPX_STORAGE_KEY);
    window.userData = getDefaultData();
    updateBalanceBox();
    loadProfileEverywhere();
  }
});

// 6. Save Function - 🔥 FINAL FIX: NEVER LOSE BALANCE
window.saveRuppyData = async function(partialData){
  if(!window.userData.uid) return;

  // 🔥 Step 1: Firebase से Latest Data ला
  const userRef = ref(db, `users/${window.userData.uid}`);
  const snapshot = await get(userRef);
  const dbData = snapshot.exists()? snapshot.val() : {};

  // 🔥 Step 2: Safe Merge - Balance कभी Overwrite नहीं होगा
  const newData = {
   ...getDefaultData(),
   ...dbData,
   ...window.userData,
   ...partialData
  };

  newData.balance = Number(newData.balance) || 0;
  newData.taskBalance = Number(newData.taskBalance) || 0;

  localStorage.setItem(RUPX_STORAGE_KEY, JSON.stringify(newData));
  window.userData = newData;
  updateBalanceBox();

  try {
    await update(userRef, newData);
  } catch (error) {
    console.error('Firebase Save Error:', error);
  }
}

window.addPostReward = async function() {
  if(!window.userData.uid) return alert("Please login first");
  const todayPosts = window.userData.posts.filter(p => new Date(p.time).toDateString() === new Date().toDateString());
  if(todayPosts.length >= 3) return alert("Daily limit reached");
  window.userData.balance = Number(window.userData.balance || 0) + 10;
  window.userData.posts.push({time: Date.now()});
  logEvent(analytics, 'post_reward', { reward_amount: 10, total_posts_today: todayPosts.length + 1 });
  await window.saveRuppyData(window.userData);
  alert("+10 RUPX Added");
}

document.addEventListener('DOMContentLoaded', () => {
  updateBalanceBox();
  loadProfileEverywhere();
});

window.addEventListener('storage', (e) => {
  if(e.key === RUPX_STORAGE_KEY && e.newValue){
    window.userData = JSON.parse(e.newValue);
    updateBalanceBox();
    loadProfileEverywhere();
  }
});

window.addTransaction = async function(type, amount, note = ''){
  if(!window.userData.uid) return;
  try {
    const txnData = { type: type, amount: Number(amount), note: note, timestamp: Date.now(), balanceAfter: Number(window.userData.balance) || 0 };
    await push(ref(db, `transactions/${window.userData.uid}`), txnData);
  } catch(error){ console.error('Transaction Error:', error); }
}

window.getTransactionHistory = async function(){
  if(!window.userData.uid) return [];
  try {
    const txnRef = ref(db, `transactions/${window.userData.uid}`);
    const snapshot = await get(txnRef);
    if(snapshot.exists()) return Object.values(snapshot.val()).sort((a,b) => b.timestamp - a.timestamp);
    return [];
  } catch(error){ console.error('History Error:', error); return []; }
}

window.logMineEvent = function(tokensEarned) {
  logEvent(analytics, 'mine_success', { tokens_earned: tokensEarned, user_balance: window.userData.balance, timestamp: Date.now() });
}

window.addEventListener('load', () => {
  setTimeout(() => {
    const buttons = document.querySelectorAll('button, div[role="button"]');
    let applyBtn = null;
    buttons.forEach(btn => {
      if(btn.innerText.includes('APPLY CODE') || btn.innerText.includes('500 RUPX')) applyBtn = btn;
    });
    if(applyBtn) {
      applyBtn.onclick = async function(e) {
        e.preventDefault();
        const codeInput = document.querySelector('input[placeholder*="RUPX"]') || applyBtn.previousElementSibling.querySelector('input');
        const code = codeInput? codeInput.value.trim().toUpperCase() : '';
        if(!code || code === 'RUPX-XXXXXX') return alert('Enter valid code');
        applyBtn.innerText = 'PROCESSING...';
        applyBtn.style.pointerEvents = 'none';
        const result = await window.applyReferralCodeManual(code);
        alert(result.msg);
        if(result.success) {
          codeInput.value = '';
          setTimeout(() => location.reload(), 1000);
        } else {
          applyBtn.innerText = 'APPLY CODE & GET 500 RUPX';
          applyBtn.style.pointerEvents = 'auto';
        }
      };
    }
  }, 3000);
});
