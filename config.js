// ✅ MINIMAL FIX: सिर्फ Race Condition ठीक की है, बाकी सब Same
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

    if(referrerUID === window.userData.uid){
      return {success: false, msg: 'Cannot use your own code'};
    }

    // ✅ FIX: बस ये 2 Line Add की - Latest Data लेने के लिए
    const referrerSnap = await get(ref(db, `users/${referrerUID}`));
    const referrerData = referrerSnap.val() || {};
    
    const currentUserSnap = await get(ref(db, `users/${window.userData.uid}`));
    const currentUserData = currentUserSnap.val() || {};

    await push(ref(db, 'referrals'), {
      referrer_uid: referrerUID,
      referred_uid: window.userData.uid,
      bonus_given: 500,
      created_at: Date.now()
    });

    const updates = {};
    // ✅ REFERRER को Update - Latest Balance पे
    updates[`users/${referrerUID}/balance`] = (referrerData.balance || 0) + 500;
    updates[`users/${referrerUID}/teamCount`] = (referrerData.teamCount || 0) + 1;
    updates[`users/${referrerUID}/referralCount`] = (referrerData.referralCount || 0) + 1;
    updates[`users/${referrerUID}/teamRewardEarned`] = (referrerData.teamRewardEarned || 0) + 500;
    updates[`users/${referrerUID}/weeklyPoints`] = (referrerData.weeklyPoints || 0) + 10;
    updates[`users/${referrerUID}/team/${window.userData.uid}`] = {
      name: currentUserData.name || window.userData.name || 'User',
      uid: window.userData.uid,
      created_at: Date.now(),
      lastMine: Date.now()
    };

    // ✅ NEW USER को Update - Latest Balance पे
    updates[`users/${window.userData.uid}/balance`] = (currentUserData.balance || 0) + 500;
    updates[`users/${window.userData.uid}/referredBy`] = referrerUID;
    updates[`users/${window.userData.uid}/referralClaimed`] = true;

    await update(ref(db), updates);

    logEvent(analytics, 'referral_applied', {
      bonus_earned: 500,
      referrer_id: referrerUID
    });

    window.userData.referredBy = referrerUID;
    window.userData.referralClaimed = true;
    window.userData.balance = (currentUserData.balance || 0) + 500;
    localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();

    return {success: true, msg: '✅ +500 RUP Credited! Referrer got 500 RUP + 10 Points'};

  } catch(error){
    console.error('Apply Referral Error:', error);
    return {success: false, msg: 'Error: ' + error.message};
  }
}
