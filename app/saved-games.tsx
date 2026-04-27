import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOARD_THEMES, BoardTheme, DEFAULT_THEME } from '../src/utils/themes';

interface Game {
  id: string;
  fen: string;
  pgn: string;
  status: string;
  turn: string;
  piece_set_id: string | null;
  created_at: string;
  updated_at: string;
  updatedAt?: string;
}

export default function SavedGamesScreen() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<BoardTheme>(DEFAULT_THEME);

  useEffect(() => {
    loadTheme();
    fetchGames();
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

  const fetchGames = async () => {
    try {
      const savedGames = await AsyncStorage.getItem('saved_games');
      if (savedGames) {
        const data = JSON.parse(savedGames);
        setGames(data);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteGame = (gameId: string) => {
    // Use confirm for web compatibility
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete this game?')) {
        performDelete(gameId);
      }
    } else {
      Alert.alert(
        'Delete Game',
        'Are you sure you want to delete this game?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => performDelete(gameId),
          },
        ]
      );
    }
  };

  const performDelete = async (gameId: string) => {
    try {
      const savedGames = await AsyncStorage.getItem('saved_games');
      if (savedGames) {
        const allGames = JSON.parse(savedGames);
        const filtered = allGames.filter((g: Game) => g.id !== gameId);
        await AsyncStorage.setItem('saved_games', JSON.stringify(filtered));
        setGames(filtered);
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete game');
      } else {
        Alert.alert('Error', 'Failed to delete game');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checkmate':
        return '#F59E0B';
      case 'stalemate':
      case 'draw':
        return '#6B7280';
      case 'timeout':
        return '#EF4444';
      default:
        return '#10B981';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMoveCount = (pgn: string) => {
    if (!pgn) return 0;
    const moves = pgn.split(' ').filter(m => m && !m.includes('.'));
    return Math.ceil(moves.length / 2);
  };

  const renderGame = ({ item }: { item: Game }) => (
    <View style={[styles.gameCard, { backgroundColor: theme.darkSquare + '30' }]}>
      <View style={styles.gameInfo}>
        <View style={styles.gameHeader}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status === 'in_progress'
                ? `${item.turn === 'w' ? 'White' : 'Black'}'s turn`
                : item.status === 'timeout'
                ? 'Time Out'
                : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          <Text style={[styles.moveCount, { color: theme.textSecondary }]}>{getMoveCount(item.pgn)} moves</Text>
        </View>
        <Text style={[styles.gameDate, { color: theme.textSecondary }]}>
          {formatDate(item.updated_at || item.updatedAt || '')}
        </Text>
      </View>
      <View style={styles.gameActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.accent }]}
          onPress={() =>
            router.push({
              pathname: '/game',
              params: { gameId: item.id, pieceSetId: item.piece_set_id || '', vsAI: 'false' },
            })
          }
        >
          <Text style={[styles.actionButtonText, { color: theme.background }]}>Load</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteActionButton]}
          onPress={() => deleteGame(item.id)}
        >
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.darkSquare + '30' }]}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.textPrimary }]}>Main Menu</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Saved Games</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : games.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Saved Games</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Start a new game to see it here!</Text>
          <TouchableOpacity
            style={[styles.newGameButton, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/')}
          >
            <Text style={[styles.newGameButtonText, { color: theme.background }]}>New Game</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={games}
          renderItem={renderGame}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
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
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  newGameButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  newGameButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  gameCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  gameInfo: {
    marginBottom: 12,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moveCount: {
    fontSize: 12,
  },
  gameDate: {
    fontSize: 12,
    marginTop: 8,
  },
  gameActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteActionText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
