// RUPPY GLOBAL SYNC - Include this in every HTML file
const RUPPY_STORAGE_KEY = 'ruppy_user';

function getRuppyData() {
  let stored = localStorage.getItem(RUPPY_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  } else {
    return {
      name: 'User',
      dp: null,
      photo: null,
      balance: 0,
      posts: [],
      lastMine: 0,
      lastGift: 0,
      boostCount: 0,
      boostResetTime: Date.now(),
      firstRewardTime: 0,
      ultraRewardTime: 0
    };
  }
}

function saveRuppyData(data) {
  data.balance = Number(data.balance);
  if (isNaN(data.balance)) data.balance = 0;
  localStorage.setItem(RUPPY_STORAGE_KEY, JSON.stringify(data));
}

var userData = getRuppyData();
