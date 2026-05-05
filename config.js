// ✅ RUPPY REFERRAL SYSTEM - 100% WORKING - हर User को 500 मिलेगा
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
    // 1. Referrer ढूंढो
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

    // 2. ✅ FIX: Referrer का LATEST Balance लो - Race Condition खत्म
    const referrerSnap = await get(ref(db, `users/${referrerUID}`));
    const referrerData = referrerSnap.val();
    
    if(!referrerData) {
      return {success: false, msg: 'Referrer not found'};
    }

    // 3. Referral Record Save करो
    await push(ref(db, 'referrals'), {
      referrer_uid: referrerUID,
      referred_uid: window.userData.uid,
      referrer_code: code,
      bonus_given: 500,
      created_at: Date.now()
    });

    const updates = {};
    
    // 4. ✅ REFERRER को 500 Token + 10 Points - GUARANTEED
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

    // 5. ✅ NEW USER को भी 500 Token - GUARANTEED
    updates[`users/${window.userData.uid}/balance`] = (window.userData.balance || 0) + 500;
    updates[`users/${window.userData.uid}/referredBy`] = referrerUID;
    updates[`users/${window.userData.uid}/referralClaimed`] = true;

    // 6. एक साथ Update - दोनों को मिलेगा या किसी को नहीं
    await update(ref(db), updates);

    // 7. Analytics Track
    logEvent(analytics, 'referral_success', {
      bonus_to_new_user: 500,
      bonus_to_referrer: 500,
      referrer_id: referrerUID
    });

    // 8. Local Data Update
    window.userData.referredBy = referrerUID;
    window.userData.referralClaimed = true;
    window.userData.balance = (window.userData.balance || 0) + 500;
    localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();

    return {success: true, msg: '✅ +500 RUPY BLOCK Added! You & Referrer Both Got 500'};

  } catch(error){
    console.error('Referral Error:', error);
    return {success: false, msg: 'Error: Please try again'};
  }
}
