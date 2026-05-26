import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOARD_THEMES, BoardTheme, DEFAULT_THEME } from '../src/utils/themes';
import { usePurchases } from '../src/contexts/PurchaseContext';

const { width } = Dimensions.get('window');

// All chess pieces
const PIECE_TYPES = [
  { key: 'wK', name: 'White King' },
  { key: 'wQ', name: 'White Queen' },
  { key: 'wR', name: 'White Rook' },
  { key: 'wB', name: 'White Bishop' },
  { key: 'wN', name: 'White Knight' },
  { key: 'wP', name: 'White Pawn' },
  { key: 'bK', name: 'Black King' },
  { key: 'bQ', name: 'Black Queen' },
  { key: 'bR', name: 'Black Rook' },
  { key: 'bB', name: 'Black Bishop' },
  { key: 'bN', name: 'Black Knight' },
  { key: 'bP', name: 'Black Pawn' },
];

interface PieceSet {
  id: string;
  name: string;
  pieces: Record<string, string>;
}

export default function CustomizeScreen() {
  const router = useRouter();
  const { isPremium } = usePurchases();
  const [pieceSets, setPieceSets] = useState<PieceSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [currentPieces, setCurrentPieces] = useState<Record<string, string>>({});
  const [setName, setSetName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [theme, setTheme] = useState<BoardTheme>(DEFAULT_THEME);

  useEffect(() => {
    loadTheme();
    fetchPieceSets();
    requestPermissions();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('chess_theme');
      if (savedTheme) {
        const foundTheme = BOARD_THEMES.find(t => t.id === savedTheme);
        if (foundTheme) setTheme(foundTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to upload custom piece images.'
      );
    }
  };

  const fetchPieceSets = async () => {
    try {
      const savedPieceSets = await AsyncStorage.getItem('custom_piece_sets');
      if (savedPieceSets) {
        const data = JSON.parse(savedPieceSets);
        setPieceSets(data);
        if (data.length > 0 && !selectedSetId) {
          selectSet(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching piece sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectSet = (set: PieceSet) => {
    setSelectedSetId(set.id);
    setSetName(set.name);
    setCurrentPieces(set.pieces || {});
    setIsCreatingNew(false);
  };

  const startNewSet = () => {
    setSelectedSetId(null);
    setSetName('');
    setCurrentPieces({});
    setIsCreatingNew(true);
  };

  const pickImage = async (pieceKey: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: false,
      });

      if (!result.canceled && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        const dir = FileSystem.documentDirectory + 'chess_pieces/';
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
        const fileName = `${pieceKey}_${Date.now()}.jpg`;
        const destPath = dir + fileName;
        await FileSystem.copyAsync({ from: uri, to: destPath });
        setCurrentPieces(prev => ({
          ...prev,
          [pieceKey]: destPath,
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removePieceImage = (pieceKey: string) => {
    setCurrentPieces(prev => {
      const updated = { ...prev };
      delete updated[pieceKey];
      return updated;
    });
  };

  const saveSet = async () => {
    if (!setName.trim()) {
      Alert.alert('Error', 'Please enter a name for the piece set');
      return;
    }

    setSaving(true);
    try {
      const savedPieceSets = await AsyncStorage.getItem('custom_piece_sets');
      let pieceSetsData = savedPieceSets ? JSON.parse(savedPieceSets) : [];
      
      if (isCreatingNew || !selectedSetId) {
        const newSet = {
          id: 'set-' + Date.now(),
          name: setName,
          pieces: currentPieces,
          createdAt: new Date().toISOString(),
        };
        pieceSetsData.push(newSet);
        await AsyncStorage.setItem('custom_piece_sets', JSON.stringify(pieceSetsData));
        setPieceSets(pieceSetsData);
        setSelectedSetId(newSet.id);
        setIsCreatingNew(false);
        Alert.alert('Success', 'Piece set created!');
      } else {
        const index = pieceSetsData.findIndex((s: any) => s.id === selectedSetId);
        if (index >= 0) {
          pieceSetsData[index] = {
            ...pieceSetsData[index],
            name: setName,
            pieces: currentPieces,
            updatedAt: new Date().toISOString(),
          };
          await AsyncStorage.setItem('custom_piece_sets', JSON.stringify(pieceSetsData));
          setPieceSets(pieceSetsData);
          Alert.alert('Success', 'Piece set updated!');
        }
      }
    } catch (error) {
      console.error('Error saving piece set:', error);
      Alert.alert('Error', 'Failed to save piece set');
    } finally {
      setSaving(false);
    }
  };

  const deleteSet = async () => {
    if (!selectedSetId) return;

    Alert.alert(
      'Delete Set',
      'Are you sure you want to delete this piece set?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const savedPieceSets = await AsyncStorage.getItem('custom_piece_sets');
              if (savedPieceSets) {
                let pieceSetsData = JSON.parse(savedPieceSets);
                pieceSetsData = pieceSetsData.filter((s: any) => s.id !== selectedSetId);
                await AsyncStorage.setItem('custom_piece_sets', JSON.stringify(pieceSetsData));
                setPieceSets(pieceSetsData);
              }
              
              if (pieceSets.length > 1) {
                const remaining = pieceSets.filter(s => s.id !== selectedSetId);
                if (remaining.length > 0) {
                  selectSet(remaining[0]);
                } else {
                  startNewSet();
                }
              } else {
                startNewSet();
              }
            } catch (error) {
              console.error('Error deleting piece set:', error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.darkSquare + '30' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Customize Pieces</Text>
        <TouchableOpacity 
          onPress={isPremium ? saveSet : () => router.push(Platform.OS === 'web' ? '/web-store' : '/store')} 
          style={[styles.saveButton, { backgroundColor: theme.accent }]} 
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.background} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.background }]}>
              {isPremium ? 'Save' : 'Unlock'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Piece Set Selector */}
      <View style={[styles.setSelector, { borderBottomColor: theme.darkSquare + '30' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {pieceSets.map(set => (
            <TouchableOpacity
              key={set.id}
              style={[
                styles.setChip,
                { backgroundColor: theme.darkSquare + '30' },
                selectedSetId === set.id && { backgroundColor: theme.accent },
              ]}
              onPress={() => isPremium && selectSet(set)}
              disabled={!isPremium}
            >
              <Text
                style={[
                  styles.setChipText,
                  { color: theme.textSecondary },
                  selectedSetId === set.id && { color: theme.background, fontWeight: '600' },
                ]}
              >
                {set.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.setChip, styles.newSetChip, { borderColor: theme.accent }]}
            onPress={() => isPremium && startNewSet()}
            disabled={!isPremium}
          >
            <Text style={[styles.setChipText, { color: theme.accent }]}>New Set</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Set Name Input */}
      <View style={styles.nameContainer}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Set Name</Text>
        <TextInput
          style={[styles.nameInput, { backgroundColor: theme.darkSquare + '30', color: theme.textPrimary }]}
          value={setName}
          onChangeText={setSetName}
          placeholder="Enter set name..."
          placeholderTextColor={theme.textSecondary + '80'}
        />
      </View>

      {/* Piece Grid */}
      <ScrollView style={styles.pieceList} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>White Pieces</Text>
        <View style={styles.pieceGrid}>
          {PIECE_TYPES.filter(p => p.key.startsWith('w')).map(piece => (
            <View key={piece.key} style={styles.pieceCard}>
              <TouchableOpacity
                style={[styles.pieceImageContainer, { backgroundColor: theme.lightSquare }]}
                onPress={() => pickImage(piece.key)}
              >
                {currentPieces[piece.key] ? (
                  <Image
                    source={{ uri: currentPieces[piece.key] }}
                    style={styles.pieceImage}
                  />
                ) : (
                  <View style={styles.defaultPiece}>
                    <Text style={[styles.tapText, { color: theme.textSecondary }]}>Tap to</Text>
                    <Text style={[styles.tapText, { color: theme.textSecondary }]}>Upload</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[styles.pieceName, { color: theme.textSecondary }]}>{piece.name.replace('White ', '')}</Text>
              {currentPieces[piece.key] && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePieceImage(piece.key)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Black Pieces</Text>
        <View style={styles.pieceGrid}>
          {PIECE_TYPES.filter(p => p.key.startsWith('b')).map(piece => (
            <View key={piece.key} style={styles.pieceCard}>
              <TouchableOpacity
                style={[styles.pieceImageContainer, { backgroundColor: theme.darkSquare }]}
                onPress={() => pickImage(piece.key)}
              >
                {currentPieces[piece.key] ? (
                  <Image
                    source={{ uri: currentPieces[piece.key] }}
                    style={styles.pieceImage}
                  />
                ) : (
                  <View style={styles.defaultPiece}>
                    <Text style={[styles.tapText, { color: theme.textPrimary }]}>Tap to</Text>
                    <Text style={[styles.tapText, { color: theme.textPrimary }]}>Upload</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[styles.pieceName, { color: theme.textSecondary }]}>{piece.name.replace('Black ', '')}</Text>
              {currentPieces[piece.key] && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePieceImage(piece.key)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {selectedSetId && !isCreatingNew && (
          <TouchableOpacity style={styles.deleteButton} onPress={isPremium ? deleteSet : () => router.push(Platform.OS === 'web' ? '/web-store' : '/store')}>
            <Text style={styles.deleteButtonText}>Delete This Set</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Premium Paywall Overlay */}
      {!isPremium && (
        <View style={styles.paywallOverlay} pointerEvents="box-none">
          <View style={styles.paywallBackdrop} />
          <View style={[styles.paywallContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.paywallTitle, { color: theme.textPrimary }]}>Premium Feature</Text>
            <Text style={[styles.paywallDescription, { color: theme.textSecondary }]}>
              Use any Photos as Pieces! Family, Art, nature and more.....!
            </Text>
            <View style={styles.paywallFeatures}>
              <Text style={[styles.paywallFeature, { color: theme.textPrimary }]}>- Upload your own photos as pieces</Text>
              <Text style={[styles.paywallFeature, { color: theme.textPrimary }]}>- Create unlimited piece sets</Text>
              <Text style={[styles.paywallFeature, { color: theme.textPrimary }]}>- All premium themes included</Text>
              <Text style={[styles.paywallFeature, { color: theme.textPrimary }]}>- No advertisements</Text>
            </View>
            <TouchableOpacity
              style={[styles.paywallButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => router.push(Platform.OS === 'web' ? '/web-store' : '/store')}
            >
              <Text style={styles.paywallButtonText}>Unlock Premium - $4.99</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.paywallCloseButton}
              onPress={() => router.back()}
            >
              <Text style={[styles.paywallCloseText, { color: theme.textSecondary }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: '600',
  },
  setSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  setChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  newSetChip: {
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  setChipText: {
    fontSize: 14,
  },
  nameContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
  },
  nameInput: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  pieceList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  pieceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pieceCard: {
    width: (width - 56) / 3,
    alignItems: 'center',
  },
  pieceImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieceImage: {
    width: '100%',
    height: '100%',
  },
  defaultPiece: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapText: {
    fontSize: 12,
  },
  pieceName: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  removeButton: {
    marginTop: 4,
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 11,
  },
  deleteButton: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
  },
  bottomPadding: {
    height: 40,
  },
  paywallOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  paywallBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  paywallContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  paywallTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paywallDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  paywallFeatures: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  paywallFeature: {
    fontSize: 14,
    marginVertical: 4,
  },
  paywallButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  paywallButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paywallCloseButton: {
    paddingVertical: 12,
  },
  paywallCloseText: {
    fontSize: 16,
  },
});
