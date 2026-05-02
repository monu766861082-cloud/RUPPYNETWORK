// ✅ INVITE CODE APPLY FUNCTION - 500 R + 10 R
window.applyInviteCodeManual = async function(code){
  if(!window.userData.uid){
    return {success: false, msg: 'Please login first'};
  }

  if(!code ||!code.startsWith('RUP-')){
    return {success: false, msg: 'Invalid code format'};
  }

  if(code === window.userData.myInviteCode){
    return {success: false, msg: 'Cannot use your own code'};
  }

  if(window.userData.invitedBy){
    return {success: false, msg: 'Invite code already used'};
  }

  try {
    const usersRef = ref(db, 'users');
    const q = query(usersRef, orderByChild('myInviteCode'), equalTo(code));
    const snapshot = await get(q);

    if(!snapshot.exists()){
      return {success: false, msg: 'Invite code not found'};
    }

    const inviterUID = Object.keys(snapshot.val())[0];
    const inviterData = Object.values(snapshot.val())[0];

    if(inviterUID === window.userData.uid){
      return {success: false, msg: 'Cannot use your own code'};
    }

    await push(ref(db, 'connections'), {
      inviter_uid: inviterUID,
      invited_uid: window.userData.uid,
      bonus_given: 500,
      created_at: Date.now()
    });

    const updates = {};
    // ✅ 500 R BONUS
    updates[`users/${inviterUID}/balance`] = (inviterData.balance || 0) + 500;
    updates[`users/${inviterUID}/friendsCount`] = (inviterData.friendsCount || 0) + 1;
    updates[`users/${inviterUID}/connectionCount`] = (inviterData.connectionCount || 0) + 1;
    updates[`users/${inviterUID}/achievementsEarned`] = (inviterData.achievementsEarned || 0) + 500;
    updates[`users/${inviterUID}/activityPoints`] = (inviterData.activityPoints || 0) + 10;
    updates[`users/${inviterUID}/friends/${window.userData.uid}`] = {
      name: window.userData.name || 'User',
      uid: window.userData.uid,
      created_at: Date.now(),
      lastSession: Date.now()
    };

    updates[`users/${window.userData.uid}/balance`] = (window.userData.balance || 0) + 500;
    updates[`users/${window.userData.uid}/invitedBy`] = inviterUID;
    updates[`users/${window.userData.uid}/inviteUsed`] = true;

    await update(ref(db), updates);

    logEvent(analytics, 'invite_applied', {
      bonus_earned: 500,
      inviter_id: inviterUID
    });

    window.userData.invitedBy = inviterUID;
    window.userData.inviteUsed = true;
    window.userData.balance = (window.userData.balance || 0) + 500;
    localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(window.userData));
    updateBalanceBox();

    // ✅ FINAL MSG - 500 R
    return {success: true, msg: '✅ +500 R Added! Your friend also received 500 R + 10 R'};

  } catch(error){
    console.error('Apply Invite Error:', error);
    return {success: false, msg: 'Error: ' + error.message};
  }
}

// ✅ Post Activity +10 R
window.addPostActivity = async function() {
  if(!window.userData.uid) return alert("Please login first");

  const todayPosts = window.userData.posts.filter(p => {
    return new Date(p.time).toDateString() === new Date().toDateString();
  });

  if(todayPosts.length >= 3) {
    return alert("Daily post limit reached");
  }

  window.userData.balance = Number(window.userData.balance || 0) + 10;
  window.userData.posts.push({time: Date.now()});

  logEvent(analytics, 'post_activity', {
    r_earned: 10,
    total_posts_today: todayPosts.length + 1
  });

  await window.saveRuppyData(window.userData);
  alert("+10 R Added"); // ✅ 10 R
}
