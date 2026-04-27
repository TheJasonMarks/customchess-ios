import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePurchases, PRODUCTS, PRICES } from '../src/contexts/PurchaseContext';

export default function StoreScreen() {
  const router = useRouter();
  const {
    isPremium,
    purchaseProduct,
    restorePurchases,
  } = usePurchases();

  // iOS is a paid app — all features are fully unlocked for everyone
  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#E8D5B7" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Features</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.iosUnlockedBanner}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.iosUnlockedTitle}>All Features Unlocked</Text>
            <Text style={styles.iosUnlockedSubtitle}>
              Thank you for purchasing Custom Chess! You have full access to every feature.
            </Text>
          </View>
          {[
            'All board themes',
            'Custom photo pieces – use your own photos as chess pieces',
            'Letter overlays – chess symbols shown over your custom photos',
            'Corner letters – piece identity shown in corner of custom photos',
            'Hard AI difficulty',
            'Unlimited saved games',
            'No ads',
          ].map(feature => (
            <View key={feature} style={styles.iosFeatureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.iosFeatureText}>{feature}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const renderProduct = (
    id: string,
    title: string,
    description: string,
    isPurchased: boolean,
    isBestValue?: boolean
  ) => (
    <TouchableOpacity
      key={id}
      style={[
        styles.productCard,
        isPurchased && styles.productCardPurchased,
        isBestValue && styles.productCardBestValue,
      ]}
      onPress={() => !isPurchased && purchaseProduct(id)}
      disabled={isPurchased}
    >
      <View style={styles.productInfo}>
        <Text style={[styles.productTitle, isBestValue && styles.productTitleBestValue]}>
          {title}{isBestValue ? ' (Best Value)' : ''}
        </Text>
        <Text style={styles.productDescription}>{description}</Text>
      </View>
      <View style={styles.productPrice}>
        {isPurchased ? (
          <View style={styles.purchasedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.purchasedText}>Owned</Text>
          </View>
        ) : (
          <Text style={[styles.priceText, isBestValue && styles.priceTextBestValue]}>
            {formatPrice(PRICES[id] ?? 0)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#E8D5B7" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store</Text>
        <TouchableOpacity onPress={restorePurchases} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionTitle}>Unlock Features</Text>

        {renderProduct(
          PRODUCTS.PREMIUM_BUNDLE,
          'Premium Bundle',
          'All themes, harder AI, custom pieces, letter overlays, no ads',
          isPremium,
          true
        )}

        {renderProduct(
          PRODUCTS.CUSTOMIZATION_ONLY,
          'Customization Only',
          'Upload your own photos as chess pieces (no other premium features)',
          false,
          false
        )}

        <Text style={styles.sectionTitle}>Add-Ons</Text>

        {renderProduct(
          PRODUCTS.LETTER_OVERLAYS,
          'Letter Overlays Pack',
          'P, N, B, R, Q, K overlays for your custom pieces (30% opacity)',
          false
        )}

        {renderProduct(
          PRODUCTS.AUTO_OVERLAYS,
          'Auto-Generate Overlays',
          'App automatically adds letter labels to your custom pieces',
          false
        )}

        {renderProduct(
          PRODUCTS.CORNER_LETTERS,
          'Corner Letters',
          'Small letters in the corners of your custom pieces',
          false
        )}

        <View style={styles.footer} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8D5B7',
  },
  restoreButton: {
    padding: 8,
  },
  restoreText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E8D5B7',
    marginTop: 16,
    marginBottom: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productCardBestValue: {
    borderColor: '#7C3AED',
  },
  productCardPurchased: {
    opacity: 0.7,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productTitle: {
    color: '#E8D5B7',
    fontSize: 16,
    fontWeight: '600',
  },
  productTitleBestValue: {
    color: '#A78BFA',
  },
  productDescription: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  priceTextBestValue: {
    color: '#A78BFA',
  },
  purchasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  purchasedText: {
    color: '#4CAF50',
    fontSize: 12,
  },
  footer: {
    marginTop: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  iosUnlockedBanner: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  iosUnlockedTitle: {
    color: '#4CAF50',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  iosUnlockedSubtitle: {
    color: '#E8D5B7',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  iosFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  iosFeatureText: {
    color: '#E8D5B7',
    fontSize: 15,
  },
});
