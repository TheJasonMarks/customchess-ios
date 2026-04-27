import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOARD_THEMES, BoardTheme, DEFAULT_THEME } from '../src/utils/themes';

const TUTORIAL_SECTIONS = [
  {
    id: 'basics',
    title: 'Chess Basics',
    content: [
      {
        heading: 'The Goal',
        text: 'The objective of chess is to checkmate your opponent\'s King. This means putting their King in a position where it cannot escape capture.',
      },
      {
        heading: 'The Board',
        text: 'Chess is played on an 8x8 board with 64 squares alternating between light and dark colors. Each player starts with 16 pieces.',
      },
      {
        heading: 'Starting Position',
        text: 'White always moves first. The board should be set up so each player has a white square in the bottom-right corner.',
      },
    ],
  },
  {
    id: 'pieces',
    title: 'How Pieces Move',
    content: [
      {
        heading: 'King (K)',
        text: 'Moves one square in any direction. The most important piece - if checkmated, you lose!',
      },
      {
        heading: 'Queen (Q)',
        text: 'The most powerful piece. Moves any number of squares horizontally, vertically, or diagonally.',
      },
      {
        heading: 'Rook (R)',
        text: 'Moves any number of squares horizontally or vertically. Very powerful in the endgame.',
      },
      {
        heading: 'Bishop (B)',
        text: 'Moves any number of squares diagonally. Each player has one light-squared and one dark-squared bishop.',
      },
      {
        heading: 'Knight (N)',
        text: 'Moves in an "L" shape: 2 squares in one direction and 1 square perpendicular. The only piece that can jump over others.',
      },
      {
        heading: 'Pawn (P)',
        text: 'Moves forward one square (or two squares from starting position). Captures diagonally. Can be promoted to any piece (except King) when reaching the opposite end.',
      },
    ],
  },
  {
    id: 'special',
    title: 'Special Moves',
    content: [
      {
        heading: 'Castling',
        text: 'A special move involving the King and a Rook. The King moves two squares toward a Rook, and the Rook moves to the other side of the King. Conditions: Neither piece has moved, no pieces between them, King is not in check and doesn\'t pass through check.',
      },
      {
        heading: 'En Passant',
        text: 'A special pawn capture. If an opponent\'s pawn moves two squares forward from its starting position and lands beside your pawn, you can capture it "in passing" as if it had only moved one square.',
      },
      {
        heading: 'Pawn Promotion',
        text: 'When a pawn reaches the opposite end of the board, it must be promoted to a Queen, Rook, Bishop, or Knight. Most players choose Queen.',
      },
    ],
  },
  {
    id: 'rules',
    title: 'Important Rules',
    content: [
      {
        heading: 'Check',
        text: 'When your King is under attack, you are "in check". You must get out of check on your next move by: moving the King, blocking the attack, or capturing the attacking piece.',
      },
      {
        heading: 'Checkmate',
        text: 'When your King is in check and there is no legal move to escape. The game is over - you lose!',
      },
      {
        heading: 'Stalemate',
        text: 'When you have no legal moves but your King is NOT in check. The game is a draw.',
      },
      {
        heading: 'Draw',
        text: 'A game can end in a draw by: stalemate, agreement, threefold repetition (same position 3 times), 50-move rule (50 moves without a capture or pawn move), or insufficient material.',
      },
    ],
  },
  {
    id: 'tips',
    title: 'Beginner Tips',
    content: [
      {
        heading: 'Control the Center',
        text: 'The four central squares (e4, d4, e5, d5) are the most important. Try to control them with your pawns and pieces.',
      },
      {
        heading: 'Develop Your Pieces',
        text: 'Get your Knights and Bishops out early. Don\'t move the same piece twice in the opening unless necessary.',
      },
      {
        heading: 'Castle Early',
        text: 'Castling protects your King and connects your Rooks. Try to castle within the first 10 moves.',
      },
      {
        heading: 'Don\'t Bring Out Your Queen Too Early',
        text: 'Your Queen can be chased around by less valuable pieces, wasting your time.',
      },
      {
        heading: 'Think About Your Opponent\'s Moves',
        text: 'Before making a move, ask yourself: "What is my opponent threatening?" and "What will my opponent do after my move?"',
      },
      {
        heading: 'Protect Your Pieces',
        text: 'Make sure your pieces are defended. Don\'t leave them "hanging" (unprotected and able to be captured for free).',
      },
    ],
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<BoardTheme>(DEFAULT_THEME);
  const [expandedSection, setExpandedSection] = useState<string | null>('basics');

  useEffect(() => {
    loadTheme();
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

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.darkSquare + '30' }]}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.textPrimary }]}>Main Menu</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>How to Play</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.introText, { color: theme.textSecondary }]}>
          New to chess? No problem! Learn the basics below.
        </Text>

        {TUTORIAL_SECTIONS.map((section) => (
          <View key={section.id} style={styles.section}>
            <TouchableOpacity
              style={[styles.sectionHeader, { backgroundColor: theme.darkSquare + '30' }]}
              onPress={() => toggleSection(section.id)}
            >
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {section.title}
              </Text>
              <Text style={[styles.expandIcon, { color: theme.accent }]}>
                {expandedSection === section.id ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {expandedSection === section.id && (
              <View style={[styles.sectionContent, { backgroundColor: theme.darkSquare + '15' }]}>
                {section.content.map((item, index) => (
                  <View key={index} style={styles.contentItem}>
                    <Text style={[styles.contentHeading, { color: theme.accent }]}>
                      {item.heading}
                    </Text>
                    <Text style={[styles.contentText, { color: theme.textPrimary }]}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/')}
        >
          <Text style={[styles.startButtonText, { color: theme.background }]}>
            Start Playing!
          </Text>
        </TouchableOpacity>

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
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 80,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  introText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionContent: {
    padding: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -8,
    paddingTop: 20,
  },
  contentItem: {
    marginBottom: 16,
  },
  contentHeading: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  startButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 40,
  },
});
