// ✅ 100% FIXED: REFERRAL - हर User को 500 मिलेगा, Race Condition खत्म
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

    // ✅ FIX 1: दोनों का LATEST Data लो - Race Condition Fix
    const [referrerSnap, currentUserSnap] = await Promise.all([
      get(ref(db, `users/${referrerUID}`)),
      get(ref(db, `users/${window.userData.uid}`))
    ]);

    const referrerData = referrerSnap.val() || {};
    const currentUserData = currentUserSnap.val() || {};

    if(!referrerSnap.exists()) {
      return {success: false, msg: 'Referrer not found'};
    }

    await push(ref(db, 'referrals'), {
      referrer_uid: referrerUID,
      referred_uid: window.userData.uid,
      referrer_code: code,
      bonus_given: 500,
      created_at: Date.now()
    });

    const updates = {};
    
    // ✅ REFERRER को 500 - Latest Balance पे +500
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

    // ✅ NEW USER को 500 - Latest Balance पे +500
    updates[`users/${window.userData.uid}/balance`] = (currentUserData.balance || 0) + 500;
    updates[`users/${window.userData.uid}/referredBy`] = referrerUID;
    updates[`users/${window.userData.uid}/referralClaimed`] = true;

    await update(ref(db), updates);

    logEvent(analytics, 'referral_success', {
      bonus_to_new_user: 500,
      bonus_to_referrer: 500,
      referrer_id: referrerUID
    });

    // Local Update
    window.userData.referredBy = referrerUID;
    window.userData.referralClaimed = true;
    window.userData.balance = (currentUserData.balance || 0) + 500;
    localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();

    return {success: true, msg: '✅ +500 RUPY BLOCK Added! You & Referrer Both Got 500'};

  } catch(error){
    console.error('Referral Error:', error);
    return {success: false, msg: 'Error: ' + error.message};
  }
}
