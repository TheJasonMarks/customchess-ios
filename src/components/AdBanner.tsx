import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const REAL_ANDROID_BANNER_UNIT_ID = 'ca-app-pub-4706498205383777/REPLACE_WITH_BANNER_UNIT_ID';

const BANNER_UNIT_ID = (() => {
  if (__DEV__) return TestIds.BANNER;
  if (Platform.OS === 'android') return REAL_ANDROID_BANNER_UNIT_ID;
  return TestIds.BANNER;
})();

interface AdBannerProps {
  showAds: boolean;
  onUpgradePress?: () => void;
}

export default function AdBanner({ showAds, onUpgradePress }: AdBannerProps) {
  if (!showAds) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webPlaceholder}>
          <Text style={styles.placeholderText}>Ad shown on mobile</Text>
          <TouchableOpacity style={styles.removeButton} onPress={onUpgradePress}>
            <Text style={styles.removeText}>Remove Ads $2</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
      {onUpgradePress ? (
        <TouchableOpacity style={styles.removeButtonFloat} onPress={onUpgradePress}>
          <Text style={styles.removeText}>Remove Ads $2</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  webPlaceholder: {
    width: '100%',
    maxWidth: 400,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholderText: {
    color: '#666',
    fontSize: 12,
  },
  removeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeButtonFloat: {
    marginTop: 4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
