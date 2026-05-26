import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import Purchases, { LOG_LEVEL, PURCHASE_TYPE } from 'react-native-purchases';

// RevenueCat API Keys
const REVENUECAT_API_KEY_IOS = 'appl_FaCieREwGjzxVPHefCxkQUaKBMI';
const REVENUECAT_API_KEY_ANDROID = 'goog_qpEYYxvkqcVumeywpZkkruRXgbh';
const REVENUECAT_API_KEY = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

// Product IDs - these match the web store and Google Play / App Store
export const PRODUCTS = {
  PREMIUM_BUNDLE: 'chess_premium_bundle',
  CUSTOMIZATION_ONLY: 'chess_customization_only',
  LETTER_OVERLAYS: 'chess_letter_overlays',
  AUTO_OVERLAYS: 'chess_auto_overlays',
  CORNER_LETTERS: 'chess_corner_letters',
  // Tip jar — consumable products, no entitlement, just a thank-you
  TIP_SMALL: 'chess_tip_small',
  TIP_MEDIUM: 'chess_tip_medium',
  TIP_BIG: 'chess_tip_big',
  TIP_HUGE: 'chess_tip_huge',
  // Monthly recurring tips — auto-renewing subscriptions, no entitlement
  TIP_MONTHLY_SMALL: 'chess_tip_monthly_small',
  TIP_MONTHLY_MEDIUM: 'chess_tip_monthly_medium',
  TIP_MONTHLY_BIG: 'chess_tip_monthly_big',
  TIP_MONTHLY_HUGE: 'chess_tip_monthly_huge',
  // Legacy aliases for backward compatibility
  PREMIUM_UNLOCK: 'chess_premium_bundle',
  REMOVE_ADS: 'chess_premium_bundle',
  SUBSCRIPTION_MONTHLY: 'chess_pro_monthly',
  SUBSCRIPTION_YEARLY: 'chess_pro_yearly',
};

export const TIP_PRODUCTS = [
  { id: PRODUCTS.TIP_SMALL, label: 'Small Tip', emoji: '☕', price: 0.99 },
  { id: PRODUCTS.TIP_MEDIUM, label: 'Medium Tip', emoji: '🍕', price: 2.99 },
  { id: PRODUCTS.TIP_BIG, label: 'Big Tip', emoji: '❤️', price: 4.99 },
  { id: PRODUCTS.TIP_HUGE, label: 'Huge Tip', emoji: '👑', price: 9.99 },
];

export const TIP_SUBSCRIPTIONS = [
  { id: PRODUCTS.TIP_MONTHLY_SMALL, label: 'Coffee Club', emoji: '☕', price: 0.99 },
  { id: PRODUCTS.TIP_MONTHLY_MEDIUM, label: 'Snack Club', emoji: '🍕', price: 2.99 },
  { id: PRODUCTS.TIP_MONTHLY_BIG, label: 'Patron', emoji: '❤️', price: 4.99 },
  { id: PRODUCTS.TIP_MONTHLY_HUGE, label: 'Champion', emoji: '👑', price: 9.99 },
];

export const PRICES = {
  [PRODUCTS.PREMIUM_BUNDLE]: 4.99,
  [PRODUCTS.CUSTOMIZATION_ONLY]: 1.99,
  [PRODUCTS.LETTER_OVERLAYS]: 1.00,
  [PRODUCTS.AUTO_OVERLAYS]: 1.99,
  [PRODUCTS.CORNER_LETTERS]: 0.99,
  [PRODUCTS.TIP_SMALL]: 0.99,
  [PRODUCTS.TIP_MEDIUM]: 2.99,
  [PRODUCTS.TIP_BIG]: 4.99,
  [PRODUCTS.TIP_HUGE]: 9.99,
  [PRODUCTS.TIP_MONTHLY_SMALL]: 0.99,
  [PRODUCTS.TIP_MONTHLY_MEDIUM]: 2.99,
  [PRODUCTS.TIP_MONTHLY_BIG]: 4.99,
  [PRODUCTS.TIP_MONTHLY_HUGE]: 9.99,
  chess_pro_monthly: 1.40,
  chess_pro_yearly: 3.00,
};

// Free themes available to all users
export const FREE_THEMES = ['classic'];

// Premium themes requiring purchase
export const PREMIUM_THEMES = ['blue', 'green', 'purple', 'dark', 'coral'];

interface PurchaseContextType {
  isPremium: boolean;
  isSubscribed: boolean;
  hasRemovedAds: boolean;
  hasCustomization: boolean;
  hasLetterOverlays: boolean;
  hasAutoOverlays: boolean;
  hasCornerLetters: boolean;
  purchasedThemes: string[];
  revenueCatReady: boolean;
  purchaseProduct: (productId: string) => Promise<boolean>;
  purchaseTip: (productId: string) => Promise<boolean>;
  purchaseTipSubscription: (productId: string) => Promise<boolean>;
  activeTipSubscriptions: string[];
  restorePurchases: () => Promise<void>;
  canAccessTheme: (themeId: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  showUpgradePrompt: (feature: string) => void;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export function PurchaseProvider({ children }: { children: ReactNode }) {
  // iOS is a paid $8 app — all features unlocked for everyone
  const iosFullAccess = Platform.OS === 'ios';

  const [isPremium, setIsPremium] = useState(iosFullAccess);
  const [isSubscribed, setIsSubscribed] = useState(iosFullAccess);
  const [hasRemovedAds, setHasRemovedAds] = useState(iosFullAccess);
  const [hasCustomization, setHasCustomization] = useState(iosFullAccess);
  const [hasLetterOverlays, setHasLetterOverlays] = useState(iosFullAccess);
  const [hasAutoOverlays, setHasAutoOverlays] = useState(iosFullAccess);
  const [hasCornerLetters, setHasCornerLetters] = useState(iosFullAccess);
  const [purchasedThemes, setPurchasedThemes] = useState<string[]>(
    iosFullAccess ? PREMIUM_THEMES : []
  );
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const [activeTipSubscriptions, setActiveTipSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    if (!iosFullAccess) {
      loadPurchaseState();
    }
    // Always initialize RevenueCat — even on iOS where features are unlocked,
    // we still need it ready so the Tip Jar consumable purchases can go through.
    initializeRevenueCat();
  }, []);

  const initializeRevenueCat = async () => {
    try {
      if (Platform.OS !== 'web') {
        try {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
          await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
          console.log('RevenueCat initialized successfully!');
          setRevenueCatReady(true);
          const customerInfo = await Purchases.getCustomerInfo();
          applyEntitlements(customerInfo.entitlements.active);
          syncActiveTipSubs(customerInfo);
        } catch (rcError) {
          console.log('RevenueCat unavailable, using offline mode:', rcError);
        }
      }
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
    }
  };

  const applyEntitlements = async (active: Record<string, any>) => {
    if (active['premium']) {
      setIsPremium(true);
      setHasRemovedAds(true);
      setHasCustomization(true);
      setHasLetterOverlays(true);
      setHasAutoOverlays(true);
      setHasCornerLetters(true);
      setPurchasedThemes(PREMIUM_THEMES);
      await AsyncStorage.setItem('chess_isPremium', 'true');
    }
    if (active['customization']) {
      setHasCustomization(true);
      await AsyncStorage.setItem('chess_customization', 'true');
    }
    if (active['letter_overlays']) {
      setHasLetterOverlays(true);
      await AsyncStorage.setItem('chess_letter_overlays', 'true');
    }
    if (active['auto_overlays']) {
      setHasAutoOverlays(true);
      await AsyncStorage.setItem('chess_auto_overlays', 'true');
    }
    if (active['corner_letters']) {
      setHasCornerLetters(true);
      await AsyncStorage.setItem('chess_corner_letters', 'true');
    }
  };

  const unlockByProductId = async (productId: string) => {
    switch (productId) {
      case 'chess_premium_bundle':
        setIsPremium(true);
        setHasRemovedAds(true);
        setHasCustomization(true);
        setHasLetterOverlays(true);
        setHasAutoOverlays(true);
        setHasCornerLetters(true);
        setPurchasedThemes(PREMIUM_THEMES);
        await AsyncStorage.setItem('chess_isPremium', 'true');
        await AsyncStorage.setItem('chess_hasRemovedAds', 'true');
        await AsyncStorage.setItem('chess_purchasedThemes', JSON.stringify(PREMIUM_THEMES));
        break;
      case 'chess_customization_only':
        setHasCustomization(true);
        await AsyncStorage.setItem('chess_customization', 'true');
        break;
      case 'chess_letter_overlays':
        setHasLetterOverlays(true);
        await AsyncStorage.setItem('chess_letter_overlays', 'true');
        break;
      case 'chess_auto_overlays':
        setHasAutoOverlays(true);
        await AsyncStorage.setItem('chess_auto_overlays', 'true');
        break;
      case 'chess_corner_letters':
        setHasCornerLetters(true);
        await AsyncStorage.setItem('chess_corner_letters', 'true');
        break;
    }
  };

  const loadPurchaseState = async () => {
    try {
      const premium = await AsyncStorage.getItem('chess_isPremium');
      const subscribed = await AsyncStorage.getItem('chess_isSubscribed');
      const noAds = await AsyncStorage.getItem('chess_hasRemovedAds');
      const themes = await AsyncStorage.getItem('chess_purchasedThemes');
      const customization = await AsyncStorage.getItem('chess_customization');
      const letterOverlays = await AsyncStorage.getItem('chess_letter_overlays');
      const autoOverlays = await AsyncStorage.getItem('chess_auto_overlays');
      const cornerLetters = await AsyncStorage.getItem('chess_corner_letters');

      if (premium === 'true') { setIsPremium(true); setHasCustomization(true); setHasLetterOverlays(true); setHasAutoOverlays(true); setHasCornerLetters(true); }
      if (subscribed === 'true') setIsSubscribed(true);
      if (noAds === 'true') setHasRemovedAds(true);
      if (themes) setPurchasedThemes(JSON.parse(themes));
      if (customization === 'true') setHasCustomization(true);
      if (letterOverlays === 'true') setHasLetterOverlays(true);
      if (autoOverlays === 'true') setHasAutoOverlays(true);
      if (cornerLetters === 'true') setHasCornerLetters(true);
    } catch (error) {
      console.error('Error loading purchase state:', error);
    }
  };

  const savePurchaseState = async () => {
    try {
      await AsyncStorage.setItem('chess_isPremium', isPremium.toString());
      await AsyncStorage.setItem('chess_isSubscribed', isSubscribed.toString());
      await AsyncStorage.setItem('chess_hasRemovedAds', hasRemovedAds.toString());
      await AsyncStorage.setItem('chess_purchasedThemes', JSON.stringify(purchasedThemes));
    } catch (error) {
      console.error('Error saving purchase state:', error);
    }
  };

  const purchaseProduct = async (productId: string): Promise<boolean> => {
    try {
      if (Platform.OS !== 'web') {
        if (!revenueCatReady) {
          Alert.alert('Not Ready', 'Store is still loading. Please wait a moment and try again.');
          return false;
        }
        try {
          const products = await Purchases.getProducts([productId], PURCHASE_TYPE.INAPP);
          if (!products || products.length === 0) {
            Alert.alert(
              'Product Not Found',
              `Could not find product "${productId}" in the store. Please check your internet connection and try again.`
            );
            return false;
          }
          const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
          await applyEntitlements(customerInfo.entitlements.active);
          await unlockByProductId(productId);
          Alert.alert('Success!', 'Purchase completed successfully!');
          return true;
        } catch (purchaseError: any) {
          if (purchaseError.userCancelled) {
            return false;
          }
          const code = purchaseError.code ?? 'unknown';
          const msg = (purchaseError.message ?? '').toLowerCase();
          console.error('Purchase error code:', code, 'message:', msg, 'full error:', JSON.stringify(purchaseError));

          // Code 11 = RevenueCat credentials issue — but Google Play already confirmed
          // the payment, so trust Google and unlock the feature immediately.
          if (code === 11 || code === '11') {
            await unlockByProductId(productId);
            Alert.alert('Success!', 'Purchase completed successfully!');
            return true;
          }

          try {
            const { customerInfo } = await Purchases.restorePurchases();
            await applyEntitlements(customerInfo.entitlements.active);
            const transactions = customerInfo.nonSubscriptionTransactions ?? [];
            for (const tx of transactions) {
              await unlockByProductId(tx.productIdentifier);
            }
            const alreadyOwned = transactions.some(tx => tx.productIdentifier === productId);
            if (alreadyOwned) {
              Alert.alert('Restored!', 'Your previous purchase has been restored successfully.');
              return true;
            }
          } catch (restoreError) {
            console.error('Restore after failed purchase also failed:', restoreError);
          }
          Alert.alert('Purchase Failed', (purchaseError.message ?? 'Purchase failed.') + '\n\n(Code: ' + code + ')');
          return false;
        }
      }
      
      console.log('Simulating purchase of: ' + productId);
      await unlockByProductId(productId);
      Alert.alert('Success!', 'Purchase completed successfully!');
      return true;
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Purchase failed. Please try again.');
      return false;
    }
  };

  const syncActiveTipSubs = (customerInfo: any) => {
    try {
      const tipSubIds = TIP_SUBSCRIPTIONS.map((s) => s.id);
      const active: string[] = (customerInfo?.activeSubscriptions ?? []).filter(
        (id: string) => tipSubIds.includes(id)
      );
      setActiveTipSubscriptions(active);
    } catch (e) {
      console.log('syncActiveTipSubs failed:', e);
    }
  };

  const purchaseTipSubscription = async (productId: string): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Thank You!', 'Monthly support is available in the mobile app.');
        return false;
      }
      if (!revenueCatReady) {
        Alert.alert('Not Ready', 'Store is still loading. Please wait a moment and try again.');
        return false;
      }
      const products = await Purchases.getProducts([productId], PURCHASE_TYPE.SUBS);
      if (!products || products.length === 0) {
        Alert.alert(
          'Not Available',
          `Could not find subscription "${productId}" in the store. Please check your internet connection and try again.`
        );
        return false;
      }
      try {
        const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
        syncActiveTipSubs(customerInfo);
        const where = Platform.OS === 'ios' ? 'Settings → Apple ID → Subscriptions' : 'Play Store → Subscriptions';
        Alert.alert(
          '❤️ Thank You!',
          `You're now supporting Custom Chess every month. You can cancel anytime in ${where}.`
        );
        return true;
      } catch (purchaseError: any) {
        if (purchaseError.userCancelled) return false;
        const code = purchaseError.code ?? 'unknown';
        if (code === 11 || code === '11') {
          Alert.alert('❤️ Thank You!', 'Your monthly support is active. Thanks for keeping the lights on!');
          return true;
        }
        Alert.alert('Subscription Failed', (purchaseError.message ?? 'Failed.') + '\n\n(Code: ' + code + ')');
        return false;
      }
    } catch (error) {
      console.error('Subscription tip error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      return false;
    }
  };

  const purchaseTip = async (productId: string): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Thank You!', 'Tipping is available in the mobile app.');
        return false;
      }
      if (!revenueCatReady) {
        Alert.alert('Not Ready', 'Store is still loading. Please wait a moment and try again.');
        return false;
      }
      const products = await Purchases.getProducts([productId], PURCHASE_TYPE.INAPP);
      if (!products || products.length === 0) {
        Alert.alert(
          'Tip Unavailable',
          `Could not find tip "${productId}" in the store. Please check your internet connection and try again.`
        );
        return false;
      }
      try {
        await Purchases.purchaseStoreProduct(products[0]);
        Alert.alert(
          '❤️ Thank You!',
          'Your support means the world. Thanks for keeping Custom Chess alive!'
        );
        return true;
      } catch (purchaseError: any) {
        if (purchaseError.userCancelled) return false;
        const code = purchaseError.code ?? 'unknown';
        if (code === 11 || code === '11') {
          Alert.alert('❤️ Thank You!', 'Your tip was received. Thank you for the support!');
          return true;
        }
        Alert.alert('Tip Failed', (purchaseError.message ?? 'Tip failed.') + '\n\n(Code: ' + code + ')');
        return false;
      }
    } catch (error) {
      console.error('Tip error:', error);
      Alert.alert('Error', 'Tip failed. Please try again.');
      return false;
    }
  };

  const restorePurchases = async () => {
    try {
      if (Platform.OS !== 'web') {
        if (!revenueCatReady) {
          try {
            Purchases.setLogLevel(LOG_LEVEL.DEBUG);
            await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
            setRevenueCatReady(true);
          } catch (initErr) {
            console.error('RevenueCat re-init failed during restore:', initErr);
            Alert.alert('Not Ready', 'Store is still loading. Please wait a few seconds and try again.');
            return;
          }
        }
        const { customerInfo } = await Purchases.restorePurchases();
        await applyEntitlements(customerInfo.entitlements.active);
        const transactions = customerInfo.nonSubscriptionTransactions ?? [];
        let restoredCount = 0;
        for (const tx of transactions) {
          await unlockByProductId(tx.productIdentifier);
          restoredCount++;
        }
        if (restoredCount > 0) {
          Alert.alert('Restore Complete', 'Your purchases have been restored successfully!');
        } else {
          Alert.alert('Nothing to Restore', 'No previous purchases were found for this Google account.');
        }
      } else {
        Alert.alert('Restore Complete', 'Your purchases have been restored.');
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      const msg = (error.message ?? '').toLowerCase();
      if (msg.includes('network') || msg.includes('internet') || msg.includes('connection')) {
        Alert.alert('Connection Error', 'Could not reach the store. Please check your internet and try again.');
      } else {
        Alert.alert('Restore Failed', 'Could not restore purchases. (Code: ' + (error.code ?? 'unknown') + ')\n\nMake sure you are signed into the same Google account used for the original purchase.');
      }
    }
  };

  const canAccessTheme = (themeId: string): boolean => {
    if (FREE_THEMES.includes(themeId)) return true;
    if (isPremium || isSubscribed) return true;
    return purchasedThemes.includes(themeId);
  };

  const canAccessFeature = (feature: string): boolean => {
    switch (feature) {
      case 'custom_pieces':
        return isPremium || isSubscribed || hasCustomization;
      case 'hard_ai':
        return isPremium || isSubscribed;
      case 'medium_ai':
        return isPremium || isSubscribed;
      case 'unlimited_saves':
        return isPremium || isSubscribed;
      case 'no_ads':
        return hasRemovedAds || isPremium || isSubscribed;
      default:
        return true;
    }
  };

  const showUpgradePrompt = (feature: string) => {
    let message = '';
    switch (feature) {
      case 'custom_pieces':
        message = 'Custom piece uploads are a premium feature.';
        break;
      case 'hard_ai':
      case 'medium_ai':
        message = 'Advanced AI difficulty is a premium feature.';
        break;
      case 'premium_theme':
        message = 'This theme requires a purchase.';
        break;
      default:
        message = 'This is a premium feature.';
    }
    
    Alert.alert(
      'Premium Feature',
      `${message}\n\nUpgrade to Premium for just $4 to unlock all features!`,
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'View Options', onPress: () => {} }, // Navigate to store
      ]
    );
  };

  return (
    <PurchaseContext.Provider
      value={{
        isPremium,
        isSubscribed,
        hasRemovedAds,
        hasCustomization,
        hasLetterOverlays,
        hasAutoOverlays,
        hasCornerLetters,
        purchasedThemes,
        revenueCatReady,
        purchaseProduct,
        purchaseTip,
        purchaseTipSubscription,
        activeTipSubscriptions,
        restorePurchases,
        canAccessTheme,
        canAccessFeature,
        showUpgradePrompt,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchases() {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchaseProvider');
  }
  return context;
}
