import AsyncStorage from '@react-native-async-storage/async-storage';

export const PREMIUM_FEATURES = {
  CUSTOM_PIECES: 'custom_pieces',
  ALL_THEMES: 'all_themes',
  AI_OPPONENT: 'ai_opponent',
  NO_ADS: 'no_ads',
};

// Products that unlock features
export const FEATURE_PRODUCTS = {
  premium_plus: [
    PREMIUM_FEATURES.CUSTOM_PIECES,
    PREMIUM_FEATURES.ALL_THEMES,
    PREMIUM_FEATURES.AI_OPPONENT,
    PREMIUM_FEATURES.NO_ADS,
    'online_play', // New feature for Premium Plus
  ],
  premium_unlock: [
    PREMIUM_FEATURES.CUSTOM_PIECES,
    PREMIUM_FEATURES.ALL_THEMES,
    PREMIUM_FEATURES.AI_OPPONENT,
    PREMIUM_FEATURES.NO_ADS,
  ],
  customization_only: [PREMIUM_FEATURES.CUSTOM_PIECES],
  theme_pack: [PREMIUM_FEATURES.ALL_THEMES],
  remove_ads: [PREMIUM_FEATURES.NO_ADS],
};

// Check if user has purchased a specific product
export const hasPurchased = async (productId: string): Promise<boolean> => {
  try {
    const saved = await AsyncStorage.getItem('web_purchases');
    if (saved) {
      const purchases = JSON.parse(saved);
      return purchases.includes(productId) || purchases.includes('premium_unlock');
    }
    return false;
  } catch (error) {
    console.error('Error checking purchase:', error);
    return false;
  }
};

// Check if a specific feature is unlocked
export const isFeatureUnlocked = async (feature: string): Promise<boolean> => {
  try {
    const saved = await AsyncStorage.getItem('web_purchases');
    if (saved) {
      const purchases = JSON.parse(saved);
      
      // Check each purchase and see if it unlocks this feature
      for (const productId of purchases) {
        const unlockedFeatures = FEATURE_PRODUCTS[productId as keyof typeof FEATURE_PRODUCTS];
        if (unlockedFeatures && unlockedFeatures.includes(feature)) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking feature:', error);
    return false;
  }
};

// Check premium status (has full premium unlock OR customization_only OR premium_plus)
export const isPremiumUser = async (): Promise<boolean> => {
  const hasPremiumPlus = await hasPurchased('premium_plus');
  const hasPremium = await hasPurchased('premium_unlock');
  const hasCustomization = await hasPurchased('customization_only');
  return hasPremiumPlus || hasPremium || hasCustomization;
};

// Check if user has online play access (Premium Plus OR Online Play Only)
export const hasOnlinePlay = async (): Promise<boolean> => {
  const hasPremiumPlus = await hasPurchased('premium_plus');
  const hasOnlineOnly = await hasPurchased('online_play');
  return hasPremiumPlus || hasOnlineOnly;
};

// Get all purchases
export const getPurchases = async (): Promise<string[]> => {
  try {
    const saved = await AsyncStorage.getItem('web_purchases');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error getting purchases:', error);
    return [];
  }
};

// FREE themes (available to everyone)
export const FREE_THEME_IDS = ['classic', 'wooden'];

// Check if a theme is free
export const isThemeFree = (themeId: string): boolean => {
  return FREE_THEME_IDS.includes(themeId);
};
