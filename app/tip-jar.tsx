import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  usePurchases,
  TIP_SUBSCRIPTIONS,
} from '../src/contexts/PurchaseContext';

export default function TipJarScreen() {
  const router = useRouter();
  const {
    purchaseTipSubscription,
    revenueCatReady,
    activeTipSubscriptions,
  } = usePurchases();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleMonthly = async (productId: string) => {
    if (busyId) return;
    setBusyId(productId);
    try {
      await purchaseTipSubscription(productId);
    } finally {
      setBusyId(null);
    }
  };

  const openManageSubscriptions = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else if (Platform.OS === 'android') {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };

  const hasAnyMonthly = activeTipSubscriptions.length > 0;
  const disabledNative = Platform.OS !== 'web' && !revenueCatReady;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#E8D5B7" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tip Jar</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroEmoji}>❤️</Text>
        </View>
        <Text style={styles.title}>Support Custom Chess</Text>
        <Text style={styles.subtitle}>
          Custom Chess is built and maintained by one developer. Your monthly support
          helps fund ongoing development and explore possible future upgrades like DLCs,
          online multiplayer, more themes, and more piece packs.
        </Text>
        <Text style={styles.subtitleSmall}>
          Subscriptions are completely optional and don't unlock anything. Future features
          are aspirational and not guaranteed — just my sincere thanks for the support.
          Cancel anytime in your{' '}
          {Platform.OS === 'ios' ? 'Apple' : 'Google Play'} account.
        </Text>

        <View style={styles.tipList}>
          {TIP_SUBSCRIPTIONS.map((tip) => {
            const busy = busyId === tip.id;
            const isActive = activeTipSubscriptions.includes(tip.id);
            return (
              <TouchableOpacity
                key={tip.id}
                style={[
                  styles.tipRow,
                  isActive && styles.tipRowActive,
                  busy && styles.tipRowBusy,
                ]}
                onPress={() => handleMonthly(tip.id)}
                disabled={busyId !== null || disabledNative || isActive}
                activeOpacity={0.75}
              >
                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
                <View style={styles.tipTextWrap}>
                  <Text style={styles.tipLabel}>{tip.label}</Text>
                  <Text style={styles.tipPrice}>${tip.price.toFixed(2)} / month</Text>
                </View>
                {isActive ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                ) : busy ? (
                  <ActivityIndicator color="#E8D5B7" />
                ) : (
                  <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {hasAnyMonthly ? (
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={openManageSubscriptions}
            activeOpacity={0.7}
          >
            <Text style={styles.manageBtnText}>Manage Subscriptions</Text>
          </TouchableOpacity>
        ) : null}

        {disabledNative ? (
          <Text style={styles.notReadyText}>Store is loading…</Text>
        ) : null}

        <Text style={styles.footnote}>
          Payments are processed by{' '}
          {Platform.OS === 'ios' ? 'Apple' : 'Google Play'} and auto-renew monthly until
          cancelled. Charges appear on your normal billing statement.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backText: {
    color: '#E8D5B7',
    fontSize: 16,
    marginLeft: 2,
  },
  headerTitle: {
    color: '#E8D5B7',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    alignItems: 'center',
  },
  heroIcon: {
    marginTop: 16,
    marginBottom: 12,
  },
  heroEmoji: {
    fontSize: 64,
  },
  title: {
    color: '#E8D5B7',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: '#cfcfd6',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleSmall: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
  },
  tipList: {
    width: '100%',
    maxWidth: 420,
    gap: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26263d',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tipRowActive: {
    backgroundColor: '#1f3d2e',
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  tipRowBusy: {
    opacity: 0.7,
  },
  tipEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  tipTextWrap: {
    flex: 1,
  },
  tipLabel: {
    color: '#E8D5B7',
    fontSize: 17,
    fontWeight: '600',
  },
  tipPrice: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#0a1f14',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  manageBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  manageBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  notReadyText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 16,
  },
  footnote: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 18,
    maxWidth: 360,
  },
});
