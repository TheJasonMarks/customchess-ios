import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const REAL_ANDROID_REWARDED_UNIT_ID = 'ca-app-pub-4706498205383777/5440571112';

const REWARDED_UNIT_ID = (() => {
  if (__DEV__) return TestIds.REWARDED;
  if (Platform.OS === 'android') return REAL_ANDROID_REWARDED_UNIT_ID;
  return TestIds.REWARDED;
})();

const FREE_RESTARTS_PER_DAY = 2;
const FREE_UNDOS_PER_DAY = 3;

const RESTART_DATE_KEY = 'ads_restart_date';
const RESTART_COUNT_KEY = 'ads_restart_count';
const UNDO_DATE_KEY = 'ads_undo_date';
const UNDO_COUNT_KEY = 'ads_undo_count';

let initialized = false;
let restartAd: RewardedAd | null = null;
let restartAdLoaded = false;
let undoAd: RewardedAd | null = null;
let undoAdLoaded = false;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function getUsedToday(dateKey: string, countKey: string): Promise<number> {
  try {
    const savedDate = await AsyncStorage.getItem(dateKey);
    if (savedDate !== todayKey()) return 0;
    const raw = await AsyncStorage.getItem(countKey);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

async function incrementUsedToday(dateKey: string, countKey: string): Promise<void> {
  try {
    const used = await getUsedToday(dateKey, countKey);
    await AsyncStorage.multiSet([
      [dateKey, todayKey()],
      [countKey, String(used + 1)],
    ]);
  } catch {
  }
}

function loadRestartAd(): void {
  if (restartAd && restartAdLoaded) return;
  const ad = RewardedAd.createForAdRequest(REWARDED_UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });
  restartAd = ad;
  restartAdLoaded = false;

  const onLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    restartAdLoaded = true;
  });
  const onError = ad.addAdEventListener(AdEventType.ERROR, () => {
    restartAd = null;
    restartAdLoaded = false;
    onLoaded();
    onError();
  });

  ad.load();
}

function loadUndoAd(): void {
  if (undoAd && undoAdLoaded) return;
  const ad = RewardedAd.createForAdRequest(REWARDED_UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });
  undoAd = ad;
  undoAdLoaded = false;

  const onLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    undoAdLoaded = true;
  });
  const onError = ad.addAdEventListener(AdEventType.ERROR, () => {
    undoAd = null;
    undoAdLoaded = false;
    onLoaded();
    onError();
  });

  ad.load();
}

export async function initAds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    await mobileAds().initialize();
    loadRestartAd();
    loadUndoAd();
  } catch (e) {
    initialized = false;
  }
}

function showAd(
  ad: RewardedAd | null,
  loaded: boolean,
  onReward: () => void,
  reload: () => void,
): void {
  if (!ad || !loaded) {
    Alert.alert('Ad not ready', 'Please try again in a few seconds.');
    reload();
    return;
  }

  let rewarded = false;
  const onEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    rewarded = true;
  });
  const onClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    onEarned();
    onClosed();
    if (rewarded) onReward();
    reload();
  });

  try {
    ad.show();
  } catch {
    onEarned();
    onClosed();
    reload();
  }
}

export async function handleRestartRequest(onRestart: () => void): Promise<void> {
  const used = await getUsedToday(RESTART_DATE_KEY, RESTART_COUNT_KEY);

  if (used < FREE_RESTARTS_PER_DAY) {
    await incrementUsedToday(RESTART_DATE_KEY, RESTART_COUNT_KEY);
    onRestart();
    return;
  }

  Alert.alert(
    'Out of free restarts',
    `You've used your ${FREE_RESTARTS_PER_DAY} free restarts today. Watch a short ad to restart this game?`,
    [
      { text: 'No Thanks', style: 'cancel' },
      {
        text: 'Watch Ad',
        onPress: () => {
          showAd(
            restartAd,
            restartAdLoaded,
            () => {
              onRestart();
            },
            () => {
              restartAd = null;
              restartAdLoaded = false;
              loadRestartAd();
            },
          );
        },
      },
    ],
  );
}

export async function handleUndoRequest(onUndo: () => void): Promise<void> {
  const used = await getUsedToday(UNDO_DATE_KEY, UNDO_COUNT_KEY);

  if (used < FREE_UNDOS_PER_DAY) {
    await incrementUsedToday(UNDO_DATE_KEY, UNDO_COUNT_KEY);
    onUndo();
    return;
  }

  Alert.alert(
    'Out of free undos',
    `You've used your ${FREE_UNDOS_PER_DAY} free undos today. Watch a short ad to undo your last move?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Watch Ad',
        onPress: () => {
          showAd(
            undoAd,
            undoAdLoaded,
            () => {
              onUndo();
            },
            () => {
              undoAd = null;
              undoAdLoaded = false;
              loadUndoAd();
            },
          );
        },
      },
    ],
  );
}
