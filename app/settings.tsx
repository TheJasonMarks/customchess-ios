import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOARD_THEMES, BoardTheme, DEFAULT_THEME } from '../src/utils/themes';
import { soundManager } from '../src/utils/soundManager';
import { usePurchases } from '../src/contexts/PurchaseContext';

const TIME_CONTROLS = [
  { id: 'unlimited', name: 'Unlimited', minutes: 0 },
  { id: '1min', name: '1 Minute', minutes: 1 },
  { id: '3min', name: '3 Minutes', minutes: 3 },
  { id: '5min', name: '5 Minutes', minutes: 5 },
  { id: '10min', name: '10 Minutes', minutes: 10 },
  { id: '15min', name: '15 Minutes', minutes: 15 },
  { id: '30min', name: '30 Minutes', minutes: 30 },
];

const AI_DIFFICULTIES = [
  { id: 'easy', name: 'Easy', description: 'Perfect for beginners' },
  { id: 'medium', name: 'Medium', description: 'A fair challenge' },
  { id: 'hard', name: 'Hard', description: 'For experienced players' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { hasLetterOverlays, hasAutoOverlays, hasCornerLetters } = usePurchases();

  const [selectedTheme, setSelectedTheme] = useState<string>('classic');
  const [selectedTimeControl, setSelectedTimeControl] = useState<string>('unlimited');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [pieceOverlaysEnabled, setPieceOverlaysEnabled] = useState<boolean>(true);
  const [cornerLettersEnabled, setCornerLettersEnabled] = useState<boolean>(true);

  const hasPieceOverlays = hasLetterOverlays || hasAutoOverlays;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const theme = await AsyncStorage.getItem('chess_theme');
      const timeControl = await AsyncStorage.getItem('chess_time_control');
      const difficulty = await AsyncStorage.getItem('chess_ai_difficulty');
      const sound = await AsyncStorage.getItem('chess_sound');
      const pieceOverlays = await AsyncStorage.getItem('chess_piece_overlays_enabled');
      const cornerLetters = await AsyncStorage.getItem('chess_corner_letters_enabled');

      if (theme) setSelectedTheme(theme);
      if (timeControl) setSelectedTimeControl(timeControl);
      if (difficulty) setSelectedDifficulty(difficulty);
      if (sound !== null) {
        const soundOn = sound === 'true';
        setSoundEnabled(soundOn);
        soundManager.setMuted(!soundOn);
      }
      if (pieceOverlays !== null) setPieceOverlaysEnabled(pieceOverlays === 'true');
      if (cornerLetters !== null) setCornerLettersEnabled(cornerLetters === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveTheme = async (themeId: string) => {
    setSelectedTheme(themeId);
    await AsyncStorage.setItem('chess_theme', themeId);
  };

  const saveTimeControl = async (timeControlId: string) => {
    setSelectedTimeControl(timeControlId);
    await AsyncStorage.setItem('chess_time_control', timeControlId);
  };

  const saveDifficulty = async (difficultyId: string) => {
    setSelectedDifficulty(difficultyId);
    await AsyncStorage.setItem('chess_ai_difficulty', difficultyId);
  };

  const toggleSound = async (value: boolean) => {
    setSoundEnabled(value);
    soundManager.setMuted(!value);
    await AsyncStorage.setItem('chess_sound', value.toString());
  };

  const togglePieceOverlays = async (value: boolean) => {
    setPieceOverlaysEnabled(value);
    await AsyncStorage.setItem('chess_piece_overlays_enabled', value.toString());
  };

  const toggleCornerLetters = async (value: boolean) => {
    setCornerLettersEnabled(value);
    await AsyncStorage.setItem('chess_corner_letters_enabled', value.toString());
  };

  const currentTheme = BOARD_THEMES.find(t => t.id === selectedTheme) || DEFAULT_THEME;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.mainMenuText, { color: currentTheme.textPrimary }]}>Resume Game</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.textPrimary }]}>Settings</Text>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Text style={[styles.mainMenuText, { color: currentTheme.textPrimary }]}>Main Menu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sound Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>Sound</Text>
          <View style={[styles.soundRow, { backgroundColor: currentTheme.darkSquare + '30' }]}>
            <View style={styles.soundInfo}>
              <Text style={[styles.soundLabel, { color: currentTheme.textPrimary }]}>
                Sound Effects
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: '#767577', true: currentTheme.accent + '80' }}
              thumbColor={soundEnabled ? currentTheme.accent : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Piece Overlays */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>Piece Overlays</Text>

          <View style={[styles.overlayRow, { backgroundColor: currentTheme.darkSquare + '30' }]}>
            <View style={styles.overlayInfo}>
              <Text style={[styles.soundLabel, { color: currentTheme.textPrimary }]}>Piece Overlays</Text>
              <Text style={[styles.overlayDesc, { color: currentTheme.textSecondary }]}>Show letter overlay on custom pieces</Text>
            </View>
            {hasPieceOverlays ? (
              <Switch
                value={pieceOverlaysEnabled}
                onValueChange={togglePieceOverlays}
                trackColor={{ false: '#767577', true: currentTheme.accent + '80' }}
                thumbColor={pieceOverlaysEnabled ? currentTheme.accent : '#f4f3f4'}
              />
            ) : (
              <Ionicons name="lock-closed" size={22} color="#F59E0B" />
            )}
          </View>

          <View style={[styles.overlayRow, { backgroundColor: currentTheme.darkSquare + '30', marginTop: 8 }]}>
            <View style={styles.overlayInfo}>
              <Text style={[styles.soundLabel, { color: currentTheme.textPrimary }]}>Corner Letters</Text>
              <Text style={[styles.overlayDesc, { color: currentTheme.textSecondary }]}>Show piece letter in corner</Text>
            </View>
            {hasCornerLetters ? (
              <Switch
                value={cornerLettersEnabled}
                onValueChange={toggleCornerLetters}
                trackColor={{ false: '#767577', true: currentTheme.accent + '80' }}
                thumbColor={cornerLettersEnabled ? currentTheme.accent : '#f4f3f4'}
              />
            ) : (
              <Ionicons name="lock-closed" size={22} color="#F59E0B" />
            )}
          </View>
        </View>

        {/* Board Theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>Board Theme</Text>
          <View style={styles.themeGrid}>
            {BOARD_THEMES.map(theme => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeCard,
                  selectedTheme === theme.id && { borderColor: currentTheme.accent, borderWidth: 3 },
                ]}
                onPress={() => saveTheme(theme.id)}
              >
                <View style={styles.themePreview}>
                  <View style={[styles.previewSquare, { backgroundColor: theme.lightSquare }]} />
                  <View style={[styles.previewSquare, { backgroundColor: theme.darkSquare }]} />
                  <View style={[styles.previewSquare, { backgroundColor: theme.darkSquare }]} />
                  <View style={[styles.previewSquare, { backgroundColor: theme.lightSquare }]} />
                </View>
                <Text style={[styles.themeName, { color: currentTheme.textPrimary }]}>
                  {theme.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Control */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>Time Control</Text>
          <View style={styles.optionList}>
            {TIME_CONTROLS.map(tc => (
              <TouchableOpacity
                key={tc.id}
                style={[
                  styles.optionCard,
                  { backgroundColor: currentTheme.darkSquare + '30' },
                  selectedTimeControl === tc.id && { 
                    backgroundColor: currentTheme.accent + '30',
                    borderColor: currentTheme.accent,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => saveTimeControl(tc.id)}
              >
                <Text style={[
                  styles.optionText,
                  { color: selectedTimeControl === tc.id ? currentTheme.accent : currentTheme.textPrimary },
                ]}>
                  {tc.name}
                </Text>
                {selectedTimeControl === tc.id && (
                  <Text style={[styles.selectedText, { color: currentTheme.accent }]}>Selected</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* AI Difficulty */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.textPrimary }]}>AI Difficulty</Text>
          <View style={styles.optionList}>
            {AI_DIFFICULTIES.map(diff => (
              <TouchableOpacity
                key={diff.id}
                style={[
                  styles.difficultyCard,
                  { backgroundColor: currentTheme.darkSquare + '30' },
                  selectedDifficulty === diff.id && { 
                    backgroundColor: currentTheme.accent + '30',
                    borderColor: currentTheme.accent,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => saveDifficulty(diff.id)}
              >
                <View style={styles.difficultyInfo}>
                  <Text style={[
                    styles.difficultyName,
                    { color: selectedDifficulty === diff.id ? currentTheme.accent : currentTheme.textPrimary },
                  ]}>
                    {diff.name}
                  </Text>
                  <Text style={[styles.difficultyDesc, { color: currentTheme.textSecondary }]}>
                    {diff.description}
                  </Text>
                </View>
                {selectedDifficulty === diff.id && (
                  <Text style={[styles.selectedText, { color: currentTheme.accent }]}>Selected</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

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
  },
  backButton: {
    padding: 8,
  },
  mainMenuText: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 80,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  soundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  soundLabel: {
    fontSize: 16,
  },
  overlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  overlayInfo: {
    flex: 1,
    marginRight: 12,
  },
  overlayDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    width: '30%',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themePreview: {
    width: 60,
    height: 60,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewSquare: {
    width: 30,
    height: 30,
  },
  themeName: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  optionList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionText: {
    fontSize: 16,
  },
  selectedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyInfo: {
    flex: 1,
  },
  difficultyName: {
    fontSize: 16,
    fontWeight: '600',
  },
  difficultyDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  bottomPadding: {
    height: 40,
  },
});
