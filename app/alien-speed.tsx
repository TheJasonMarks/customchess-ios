import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { usePurchases } from '../src/contexts/PurchaseContext';

const ALIEN_SPEED_URL = 'https://alien-speed-racer.replit.app';

export default function AlienSpeedScreen() {
  const router = useRouter();
  const { isPremium, purchaseProduct } = usePurchases();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Unlock orientation for Alien Speed (game plays best in landscape).
  // Restore portrait lock when leaving the screen.
  useEffect(() => {
    if (!isPremium) return;
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [isPremium]);

  // Paywall gate — block all non-premium users from playing.
  // This protects against deep links bypassing the home screen check.
  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockEmoji}>🔒</Text>
          <Text style={styles.lockedTitle}>Alien Speed</Text>
          <Text style={styles.lockedSubtitle}>Premium Feature</Text>
          <Text style={styles.lockedDescription}>
            Unlock Alien Speed plus all customization features and remove ads with a one-time Premium purchase.
          </Text>
          <TouchableOpacity
            style={styles.unlockButton}
            onPress={() => {
              Alert.alert(
                'Unlock Premium',
                'Premium ($4.99) unlocks Alien Speed, custom pieces, all themes, and removes ads.\n\nThis is a one-time purchase — no subscription.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Buy $4.99',
                    onPress: async () => {
                      const success = await purchaseProduct('chess_premium_bundle');
                      if (!success) {
                        // Purchase failed or cancelled — stay on locked screen
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.unlockButtonText}>Unlock for $4.99</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={() => router.push(Platform.OS === 'web' ? '/web-store' : '/store')}
          >
            <Text style={styles.restoreButtonText}>View store / restore purchase</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Game</Text>
          <Text style={styles.errorText}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setError(false)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back to Chess</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading Alien Speed...</Text>
        </View>
      )}

      <WebView
        source={{ uri: ALIEN_SPEED_URL }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        allowsFullscreenVideo={true}
        mixedContentMode="always"
        androidLayerType="hardware"
        allowFileAccess={true}
        thirdPartyCookiesEnabled={true}
        setSupportMultipleWindows={false}
        accessible={true}
        accessibilityLabel="Alien Speed game"
        injectedJavaScript={`
          // Enable speech synthesis on Android WebView (requires user gesture
          // to start, but pre-warming the engine here helps).
          try {
            if (window.speechSynthesis) {
              window.speechSynthesis.getVoices();
              window.speechSynthesis.onvoiceschanged = function() {
                window.speechSynthesis.getVoices();
              };
            }
            // Force responsive viewport so the game scales to landscape correctly.
            var meta = document.querySelector('meta[name=viewport]');
            if (!meta) {
              meta = document.createElement('meta');
              meta.name = 'viewport';
              document.head.appendChild(meta);
            }
            meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
          } catch (e) {}
          true;
        `}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020510',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
    backgroundColor: '#020510',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
    backgroundColor: '#020510',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#020510',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#8B5CF6',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  lockedTitle: {
    color: '#8B5CF6',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lockedSubtitle: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 24,
  },
  lockedDescription: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  unlockButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButton: {
    paddingVertical: 8,
  },
  restoreButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
