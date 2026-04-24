// config.js - RUPPY GLOBAL SYNC - REFERRAL FIX + RUP- FORMAT + SEARCH SUPPORT
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, update, query, orderByChild, equalTo, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
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

// 1. Default Data - RUP- Format के साथ
function getDefaultData() {
  return {
    name: 'Guest',
    dp: null,
    balance: 0,
    taskBalance: 0,
    uid: null,
    myReferralCode: null, // ✅ FIX: RUP- वाला Code
    referredBy: null,
    referralClaimed: false,
    team: [],
    teamCount: 0,
    posts: [],
    lastMine: 0,
    lastGift: 0,
    boostCount: 0,
    boostResetTime: Date.now(),
    firstRewardTime: 0,
    ultraRewardTime: 0,
    createdAt: Date.now()
  };
}

// 1.1 ✅ FIX: Referral Code Generator - RUP-8X4K9M Format
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // O,0,I,1 हटाए
  let code = 'RUP-';
  for(let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1.2 ✅ FIX: पुराना Code Check - UID वाला है तो False
function isValidReferralCode(code) {
  if(!code || code.length!== 10 ||!code.startsWith('RUP-')) {
    return false;
  }
  return true;
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

// 4.1 ✅ FIX: Referrer को Bonus + Team Update
async function updateReferrerRank(referralCode, newUserId) {
  try {
    const usersRef = ref(db, 'users');
    const q = query(usersRef, orderByChild('myReferralCode'), equalTo(referralCode));
    const snapshot = await get(q);

    if(snapshot.exists()) {
      const referrerId = Object.keys(snapshot.val())[0];
      const referrerData = Object.values(snapshot.val())[0];
      const updates = {
        balance: (referrerData.balance || 0) + 20,
        teamCount: (referrerData.teamCount || 0) + 1,
        [`team/${newUserId}`]: true
      };
      await update(ref(db, `users/${referrerId}`), updates);
      console.log('Referrer bonus added:', referralCode);
    }
  } catch(err) {
    console.error('Referral update error:', err);
  }
}

// 5. ✅ LOGOUT/LOGIN FIX + REFERRAL AUTO UPGRADE + SEARCH SUPPORT
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User Logged In
    const userRef = ref(db, `users/${user.uid}`);

    try {
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        // ✅ पुराना User - Firebase से सब लाओ
        const data = snapshot.val();
        window.userData.uid = user.uid;
        window.userData.name = data.name || user.displayName || user.email.split('@')[0];
        window.userData.dp = data.dp || user.photoURL || null;
        window.userData.balance = Number(data.balance) || 0;
        window.userData.taskBalance = Number(data.taskBalance) || 0;
        window.userData.posts = data.posts || [];
        window.userData.lastMine = Number(data.lastMine) || 0;
        window.userData.lastGift = Number(data.lastGift) || 0;
        window.userData.boostCount = Number(data.boostCount) || 0;
        window.userData.boostResetTime = Number(data.boostResetTime) || Date.now();
        window.userData.firstRewardTime = Number(data.firstRewardTime) || 0;
        window.userData.ultraRewardTime = Number(data.ultraRewardTime) || 0;
        window.userData.team = data.team || [];
        window.userData.teamCount = Number(data.teamCount) || 0;
        window.userData.referredBy = data.referredBy || null;
        window.userData.referralClaimed = data.referralClaimed || false;
        window.userData.createdAt = data.createdAt || Date.now();

        // ✅ FIX: पुराना UID वाला Code है तो नया RUP- वाला बना दो
        if(!isValidReferralCode(data.myReferralCode)) {
          window.userData.myReferralCode = generateReferralCode();
          await update(userRef, { myReferralCode: window.userData.myReferralCode });
          console.log('Upgraded old code to:', window.userData.myReferralCode);
        } else {
          window.userData.myReferralCode = data.myReferralCode;
        }

      } else {
        // ✅ नया User - Firebase में Create करो
        window.userData.uid = user.uid;
        window.userData.name = user.displayName || user.email.split('@')[0];
        window.userData.dp = user.photoURL || null;
        window.userData.myReferralCode = generateReferralCode();

        // URL या LocalStorage से Referral Code Check कर
        const pendingRef = localStorage.getItem('ruppy_referredBy');
        if(pendingRef && pendingRef.startsWith('RUP-')) {
          window.userData.referredBy = pendingRef;
          window.userData.referralClaimed = true;
          window.userData.balance = 20; // New user bonus
          await updateReferrerRank(pendingRef, user.uid);
          localStorage.removeItem('ruppy_referredBy');
        }

        await set(userRef, window.userData);
      }
    } catch (error) {
      console.error('Firebase Load Error:', error);
    }

    // Firebase से आया Data LocalStorage में Save
    localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();
    loadProfileEverywhere();

  } else {
    // ✅ User Logged Out - Local Clear करो
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

  // Firebase में Save
  if(!data.uid) return;
  try {
    const userRef = ref(db, `users/${data.uid}`);
    await update(userRef, {
      balance: data.balance,
      taskBalance: data.taskBalance,
      name: data.name,
      dp: data.dp,
      myReferralCode: data.myReferralCode, // ✅ FIX
      referredBy: data.referredBy,
      referralClaimed: data.referralClaimed,
      team: data.team || [],
      teamCount: data.teamCount || 0,
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

// ✅ NEW: REFERRAL CODE APPLY FUNCTION - Line 278 से Add हुआ
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
    // 1. Code वाला User ढूंढो
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

    // 2. Referral Entry बनाओ
    await push(ref(db, 'referrals'), {
      referrer_uid: referrerUID,
      referred_uid: window.userData.uid,
      bonus_given: 50,
      created_at: Date.now()
    });

    // 3. Referrer को 50 RUP दो + Team Update
    await update(ref(db, `users/${referrerUID}`), {
      balance: (referrerData.balance || 0) + 50,
      teamCount: (referrerData.teamCount || 0) + 1,
      [`team/${window.userData.uid}`]: true,
      teamRewardEarned: (referrerData.teamRewardEarned || 0) + 50
    });

    // 4. अपने Account में Save करो
    window.userData.referredBy = referrerUID;
    window.userData.referralClaimed = true;
    await window.saveRuppyData(window.userData);

    return {success: true, msg: '✅ 50 RUP Added to Referrer'};

  } catch(error){
    console.error('Apply Referral Error:', error);
    return {success: false, msg: 'Error: ' + error.message};
  }
}
