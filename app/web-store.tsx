import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// PayPal Configuration - LIVE MODE
const PAYPAL_CLIENT_ID = 'AZD3zfYgQLiaFHtBY7n-XHzmQG1RBNT_426sHSwoQJigNQQZT3WulyyPDRQH7_WjwxbhbQv38ucjDYs-';

// Product definitions
const PRODUCTS = {
  PREMIUM_PLUS: {
    id: 'premium_plus',
    name: 'Premium Plus',
    description: 'Everything in Premium + Online Multiplayer (Play with friends & matchmaking)',
    price: 9.99,
  },
  ONLINE_PLAY: {
    id: 'online_play',
    name: 'Online Play Only',
    description: 'Play online with friends or random matchmaking (no other premium features)',
    price: 6.00,
  },
  PREMIUM_UNLOCK: {
    id: 'premium_unlock',
    name: 'Premium Bundle',
    description: '🚀 Alien Speed bonus game, all themes, harder AI, custom pieces, letter overlays, no ads',
    price: 4.99,
  },
  CUSTOMIZATION_ONLY: {
    id: 'customization_only',
    name: 'Customization Only',
    description: 'Upload your own photos as chess pieces (no other premium features)',
    price: 1.99,
  },
  LETTER_OVERLAYS: {
    id: 'letter_overlays',
    name: 'Letter Overlays Pack',
    description: 'P, N, B, R, Q, K overlays for your custom pieces (30% opacity)',
    price: 1.00,
  },
  AUTO_OVERLAYS: {
    id: 'auto_overlays',
    name: 'Auto-Generate Overlays',
    description: 'App automatically adds letter labels to your custom pieces',
    price: 1.99,
  },
  CORNER_LETTERS: {
    id: 'corner_letters',
    name: 'Corner Letters',
    description: 'Small letters in the corners of your custom pieces',
    price: 0.99,
  },
};

export default function WebPaymentScreen() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPayPal, setShowPayPal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  useEffect(() => {
    // Android and iOS users should use the in-app store
    if (Platform.OS !== 'web') {
      router.replace('/store');
      return;
    }
    loadPurchases();
    loadPayPalScript();
  }, []);

  const loadPurchases = async () => {
    try {
      const saved = await AsyncStorage.getItem('web_purchases');
      if (saved) {
        setPurchases(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const savePurchase = async (productId: string) => {
    try {
      const updated = [...purchases, productId];
      await AsyncStorage.setItem('web_purchases', JSON.stringify(updated));
      setPurchases(updated);
      
      // Also update the main purchase context flags
      if (productId === 'premium_unlock') {
        await AsyncStorage.setItem('is_premium', 'true');
        await AsyncStorage.setItem('has_removed_ads', 'true');
      }
      if (productId === 'remove_ads') {
        await AsyncStorage.setItem('has_removed_ads', 'true');
      }
    } catch (error) {
      console.error('Error saving purchase:', error);
    }
  };

  const loadPayPalScript = () => {
    if (typeof window !== 'undefined' && !(window as any).paypal) {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
      script.async = true;
      script.onload = () => {
        setPaypalLoaded(true);
      };
      document.body.appendChild(script);
    } else if ((window as any).paypal) {
      setPaypalLoaded(true);
    }
  };

  const handlePurchase = (product: any) => {
    if (Platform.OS === 'web') {
      setSelectedProduct(product);
      setShowPayPal(true);
      setTimeout(() => renderPayPalButton(product), 500);
    } else {
      Alert.alert('Info', 'Please use the in-app store for mobile purchases.');
    }
  };

  const renderPayPalButton = (product: any) => {
    if (typeof window === 'undefined' || !(window as any).paypal) return;

    const container = document.getElementById('paypal-button-container');
    if (container) {
      container.innerHTML = '';
      
      (window as any).paypal.Buttons({
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{
              description: product.name,
              amount: {
                value: product.price.toFixed(2),
                currency_code: 'USD',
              },
            }],
          });
        },
        onApprove: async (data: any, actions: any) => {
          const order = await actions.order.capture();
          console.log('Payment successful:', order);
          
          // Save the purchase
          await savePurchase(product.id);
          
          setShowPayPal(false);
          setSelectedProduct(null);
          
          Alert.alert(
            'Payment Successful! 🎉',
            `Thank you for purchasing ${product.name}! Your features are now unlocked.`
          );
        },
        onCancel: () => {
          console.log('Payment cancelled');
          setShowPayPal(false);
          setSelectedProduct(null);
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          Alert.alert('Payment Error', 'Something went wrong. Please try again.');
          setShowPayPal(false);
          setSelectedProduct(null);
        },
      }).render('#paypal-button-container');
    }
  };

  const isPurchased = (productId: string) => {
    return purchases.includes(productId) || purchases.includes('premium_unlock');
  };

  const renderProduct = (product: any) => {
    const owned = isPurchased(product.id);
    
    return (
      <TouchableOpacity
        key={product.id}
        style={[
          styles.productCard, 
          owned && styles.productCardOwned,
        ]}
        onPress={() => !owned && handlePurchase(product)}
        disabled={owned}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription}>{product.description}</Text>
        </View>
        <View style={styles.productPriceContainer}>
          {owned ? (
            <View style={styles.ownedBadge}>
              <Text style={styles.ownedText}>Owned</Text>
            </View>
          ) : (
            <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Purchase Options */}
        <Text style={styles.sectionTitle}>Unlock Features</Text>
        
        {/* Premium Plus - COMING SOON (Online Play not ready yet) */}
        {/* Will be enabled when online multiplayer is built */}
        
        {/* Premium Bundle */}
        <TouchableOpacity 
          style={[
            styles.productCard,
            styles.premiumPlusCard,
            (isPurchased('premium_unlock') || isPurchased('premium_plus')) && styles.productCardOwned
          ]}
          onPress={() => !isPurchased('premium_unlock') && !isPurchased('premium_plus') && handlePurchase(PRODUCTS.PREMIUM_UNLOCK)}
          disabled={isPurchased('premium_unlock') || isPurchased('premium_plus')}
        >
          <View style={styles.productInfo}>
            <Text style={[styles.productName, styles.premiumPlusName]}>Premium Bundle (Best Value)</Text>
            <Text style={styles.productDescription}>All themes, harder AI, custom pieces, letter overlays, no ads</Text>
          </View>
          <View style={styles.productPriceContainer}>
            {(isPurchased('premium_unlock') || isPurchased('premium_plus')) ? (
              <Text style={styles.ownedText}>Owned</Text>
            ) : (
              <Text style={[styles.productPrice, styles.premiumPlusPrice]}>$4.99</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Customization Only */}
        <TouchableOpacity 
          style={[
            styles.productCard,
            (isPurchased('premium_unlock') || isPurchased('premium_plus')) && styles.productCardOwned
          ]}
          onPress={() => !isPurchased('premium_unlock') && !isPurchased('premium_plus') && handlePurchase(PRODUCTS.PREMIUM_UNLOCK)}
          disabled={isPurchased('premium_unlock') || isPurchased('premium_plus')}
        >
          <View style={styles.productInfo}>
            <Text style={styles.productName}>Premium Bundle</Text>
            <Text style={styles.productDescription}>All themes, harder AI, custom pieces, letter overlays, no ads</Text>
          </View>
          <View style={styles.productPriceContainer}>
            {(isPurchased('premium_unlock') || isPurchased('premium_plus')) ? (
              <Text style={styles.ownedText}>Owned</Text>
            ) : (
              <Text style={styles.productPrice}>$4.99</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Customization Only */}
        <TouchableOpacity 
          style={[
            styles.productCard,
            (isPurchased('customization_only') || isPurchased('premium_unlock') || isPurchased('premium_plus')) && styles.productCardOwned
          ]}
          onPress={() => !isPurchased('customization_only') && !isPurchased('premium_unlock') && !isPurchased('premium_plus') && handlePurchase(PRODUCTS.CUSTOMIZATION_ONLY)}
          disabled={isPurchased('customization_only') || isPurchased('premium_unlock') || isPurchased('premium_plus')}
        >
          <View style={styles.productInfo}>
            <Text style={styles.productName}>Customization Only</Text>
            <Text style={styles.productDescription}>Upload your own photos as chess pieces (no other premium features)</Text>
          </View>
          <View style={styles.productPriceContainer}>
            {(isPurchased('customization_only') || isPurchased('premium_unlock') || isPurchased('premium_plus')) ? (
              <Text style={styles.ownedText}>Owned</Text>
            ) : (
              <Text style={styles.productPrice}>$1.99</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Add-On Purchases */}
        <Text style={styles.sectionTitle}>Add-Ons</Text>
        {renderProduct(PRODUCTS.LETTER_OVERLAYS)}
        {renderProduct(PRODUCTS.AUTO_OVERLAYS)}
        {renderProduct(PRODUCTS.CORNER_LETTERS)}

        {/* PayPal Info */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentInfoText}>
            Secure payments powered by PayPal
          </Text>
        </View>
      </ScrollView>

      {/* PayPal Modal (Web only) */}
      {Platform.OS === 'web' && (
        <Modal visible={showPayPal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedProduct?.name} - ${selectedProduct?.price.toFixed(2)}
                </Text>
                <TouchableOpacity onPress={() => setShowPayPal(false)}>
                  <Text style={styles.closeButton}>X</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.paypalContainer}>
                <div id="paypal-button-container" style={{ minHeight: 150 }} />
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    borderBottomColor: 'rgba(232, 213, 183, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#E8D5B7',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8D5B7',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  premiumBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  premiumTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginTop: 8,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: '#E8D5B7',
    marginTop: 8,
  },
  featureList: {
    marginTop: 16,
    alignSelf: 'flex-start',
    width: '100%',
  },
  featureItem: {
    fontSize: 16,
    color: '#E8D5B7',
    marginVertical: 4,
  },
  premiumButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  premiumButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8D5B7',
    marginBottom: 16,
    marginTop: 8,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 213, 183, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  premiumPlusCard: {
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    borderWidth: 2,
    borderColor: '#9333EA',
  },
  premiumPlusName: {
    color: '#A855F7',
  },
  premiumPlusPrice: {
    color: '#A855F7',
  },
  onlinePlayCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  onlinePlayName: {
    color: '#3B82F6',
  },
  onlinePlayPrice: {
    color: '#3B82F6',
  },
  onlineFeature: {
    fontSize: 12,
    color: '#A855F7',
    fontStyle: 'italic',
    marginTop: 4,
  },
  productCardOwned: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8D5B7',
  },
  productDescription: {
    fontSize: 14,
    color: 'rgba(232, 213, 183, 0.7)',
    marginTop: 4,
  },
  productPriceContainer: {
    marginLeft: 12,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
    padding: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 8,
  },
  paypalContainer: {
    padding: 24,
    minHeight: 200,
    justifyContent: 'center',
  },
});
