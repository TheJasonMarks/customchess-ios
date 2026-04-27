import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOARD_THEMES, BoardTheme, DEFAULT_THEME } from '../src/utils/themes';

type TournamentType = 'single_elimination' | 'round_robin' | 'swiss';
type TournamentStatus = 'setup' | 'in_progress' | 'completed';

interface Player {
  id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
}

interface Match {
  id: string;
  round: number;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  isDraw: boolean;
  completed: boolean;
}

interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  status: TournamentStatus;
  players: Player[];
  matches: Match[];
  currentRound: number;
  createdAt: string;
  completedAt?: string;
  winnerId?: string;
}

export default function TournamentScreen() {
  const router = useRouter();
  const [theme, setTheme] = useState<BoardTheme>(DEFAULT_THEME);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMatchResult, setShowMatchResult] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // Setup state
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentType, setTournamentType] = useState<TournamentType>('single_elimination');
  const [playerCount, setPlayerCount] = useState(4);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '']);

  useEffect(() => {
    loadTheme();
    loadTournaments();
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

  const loadTournaments = async () => {
    try {
      const saved = await AsyncStorage.getItem('tournaments');
      if (saved) {
        const data = JSON.parse(saved);
        setTournaments(data);
        // Find active tournament
        const active = data.find((t: Tournament) => t.status === 'in_progress');
        if (active) setCurrentTournament(active);
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  };

  const saveTournaments = async (data: Tournament[]) => {
    try {
      await AsyncStorage.setItem('tournaments', JSON.stringify(data));
      setTournaments(data);
    } catch (error) {
      console.error('Error saving tournaments:', error);
    }
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const names = Array(count).fill('').map((_, i) => playerNames[i] || '');
    setPlayerNames(names);
  };

  const generateMatches = (players: Player[], type: TournamentType): Match[] => {
    const matches: Match[] = [];
    
    if (type === 'single_elimination') {
      for (let i = 0; i < players.length; i += 2) {
        matches.push({
          id: `match-${Date.now()}-${i}`,
          round: 1,
          player1Id: players[i].id,
          player2Id: players[i + 1]?.id || '',
          winnerId: null,
          isDraw: false,
          completed: false,
        });
      }
    } else if (type === 'round_robin') {
      let matchId = 0;
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          matches.push({
            id: `match-${Date.now()}-${matchId++}`,
            round: 1,
            player1Id: players[i].id,
            player2Id: players[j].id,
            winnerId: null,
            isDraw: false,
            completed: false,
          });
        }
      }
    } else if (type === 'swiss') {
      for (let i = 0; i < players.length; i += 2) {
        matches.push({
          id: `match-${Date.now()}-${i}`,
          round: 1,
          player1Id: players[i].id,
          player2Id: players[i + 1]?.id || '',
          winnerId: null,
          isDraw: false,
          completed: false,
        });
      }
    }
    
    return matches;
  };

  const startTournament = () => {
    if (!tournamentName.trim()) {
      Alert.alert('Error', 'Please enter a tournament name');
      return;
    }

    const filledNames = playerNames.filter(n => n.trim());
    if (filledNames.length < 2) {
      Alert.alert('Error', 'Please enter at least 2 player names');
      return;
    }

    const players: Player[] = filledNames.map((name, i) => ({
      id: `player-${Date.now()}-${i}`,
      name: name.trim(),
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
    }));

    const matches = generateMatches(players, tournamentType);

    const tournament: Tournament = {
      id: `tournament-${Date.now()}`,
      name: tournamentName,
      type: tournamentType,
      status: 'in_progress',
      players,
      matches,
      currentRound: 1,
      createdAt: new Date().toISOString(),
    };

    const updated = [...tournaments, tournament];
    saveTournaments(updated);
    setCurrentTournament(tournament);
    setShowSetup(false);
    
    setTournamentName('');
    setPlayerNames(['', '', '', '']);
  };

  const recordMatchResult = (winnerId: string | null, isDraw: boolean) => {
    if (!currentTournament || !selectedMatch) return;

    const updatedMatches = currentTournament.matches.map(m => {
      if (m.id === selectedMatch.id) {
        return { ...m, winnerId, isDraw, completed: true };
      }
      return m;
    });

    const updatedPlayers = currentTournament.players.map(p => {
      if (selectedMatch.player1Id === p.id || selectedMatch.player2Id === p.id) {
        if (isDraw) {
          return { ...p, draws: p.draws + 1, points: p.points + 0.5 };
        } else if (winnerId === p.id) {
          return { ...p, wins: p.wins + 1, points: p.points + 1 };
        } else if (winnerId) {
          return { ...p, losses: p.losses + 1 };
        }
      }
      return p;
    });

    const roundMatches = updatedMatches.filter(m => m.round === currentTournament.currentRound);
    const roundComplete = roundMatches.every(m => m.completed);

    let newRound = currentTournament.currentRound;
    let newMatches = updatedMatches;
    let tournamentStatus: TournamentStatus = 'in_progress';
    let tournamentWinnerId: string | undefined;

    if (roundComplete) {
      if (currentTournament.type === 'single_elimination') {
        const winners = roundMatches.map(m => m.winnerId).filter(Boolean) as string[];
        if (winners.length === 1) {
          tournamentStatus = 'completed';
          tournamentWinnerId = winners[0];
        } else if (winners.length > 1) {
          newRound += 1;
          for (let i = 0; i < winners.length; i += 2) {
            newMatches.push({
              id: `match-${Date.now()}-${i}`,
              round: newRound,
              player1Id: winners[i],
              player2Id: winners[i + 1] || '',
              winnerId: null,
              isDraw: false,
              completed: false,
            });
          }
        }
      } else if (currentTournament.type === 'round_robin') {
        const allComplete = updatedMatches.every(m => m.completed);
        if (allComplete) {
          tournamentStatus = 'completed';
          const sorted = [...updatedPlayers].sort((a, b) => b.points - a.points);
          tournamentWinnerId = sorted[0].id;
        }
      } else if (currentTournament.type === 'swiss') {
        const totalRounds = Math.ceil(Math.log2(updatedPlayers.length));
        if (newRound >= totalRounds) {
          tournamentStatus = 'completed';
          const sorted = [...updatedPlayers].sort((a, b) => b.points - a.points);
          tournamentWinnerId = sorted[0].id;
        } else {
          newRound += 1;
          const sorted = [...updatedPlayers].sort((a, b) => b.points - a.points);
          for (let i = 0; i < sorted.length; i += 2) {
            newMatches.push({
              id: `match-${Date.now()}-${newRound}-${i}`,
              round: newRound,
              player1Id: sorted[i].id,
              player2Id: sorted[i + 1]?.id || '',
              winnerId: null,
              isDraw: false,
              completed: false,
            });
          }
        }
      }
    }

    const updatedTournament: Tournament = {
      ...currentTournament,
      players: updatedPlayers,
      matches: newMatches,
      currentRound: newRound,
      status: tournamentStatus,
      winnerId: tournamentWinnerId,
      completedAt: tournamentStatus === 'completed' ? new Date().toISOString() : undefined,
    };

    const updatedTournaments = tournaments.map(t => 
      t.id === currentTournament.id ? updatedTournament : t
    );

    saveTournaments(updatedTournaments);
    setCurrentTournament(updatedTournament);
    setShowMatchResult(false);
    setSelectedMatch(null);

    if (tournamentStatus === 'completed') {
      const winner = updatedPlayers.find(p => p.id === tournamentWinnerId);
      Alert.alert('Tournament Complete!', `${winner?.name} wins the tournament!`);
    }
  };

  const getPlayerName = (playerId: string) => {
    return currentTournament?.players.find(p => p.id === playerId)?.name || 'Unknown';
  };

  const getCurrentRoundMatches = () => {
    if (!currentTournament) return [];
    return currentTournament.matches.filter(m => m.round === currentTournament.currentRound);
  };

  const renderSetupModal = () => (
    <Modal visible={showSetup} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: '#1a1a2e' }]}>New Tournament</Text>
            <TouchableOpacity onPress={() => setShowSetup(false)}>
              <Text style={[styles.closeText, { color: '#1a1a2e' }]}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.label, { color: '#1a1a2e' }]}>Tournament Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.lightSquare, color: '#000' }]}
              value={tournamentName}
              onChangeText={setTournamentName}
              placeholder="Enter name..."
              placeholderTextColor="#333"
            />

            <Text style={[styles.label, { color: '#1a1a2e' }]}>Tournament Type</Text>
            <View style={styles.typeButtons}>
              {[
                { value: 'single_elimination', label: 'Single Elimination' },
                { value: 'round_robin', label: 'Round Robin' },
                { value: 'swiss', label: 'Swiss' },
              ].map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    { backgroundColor: theme.lightSquare },
                    tournamentType === type.value && { backgroundColor: theme.accent },
                  ]}
                  onPress={() => setTournamentType(type.value as TournamentType)}
                >
                  <Text style={[
                    styles.typeButtonText, 
                    { color: tournamentType === type.value ? '#dc2626' : '#1a1a2e' }
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: '#1a1a2e' }]}>Number of Players</Text>
            <View style={styles.countButtons}>
              {[4, 6, 8].map(count => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.countButton,
                    { backgroundColor: theme.lightSquare },
                    playerCount === count && { backgroundColor: theme.accent },
                  ]}
                  onPress={() => handlePlayerCountChange(count)}
                >
                  <Text style={[
                    styles.countButtonText, 
                    { color: playerCount === count ? '#dc2626' : '#1a1a2e' }
                  ]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: '#1a1a2e' }]}>Player Names</Text>
            {playerNames.map((name, i) => (
              <TextInput
                key={i}
                style={[styles.input, { backgroundColor: theme.lightSquare, color: '#000' }]}
                value={name}
                onChangeText={(text) => {
                  const updated = [...playerNames];
                  updated[i] = text;
                  setPlayerNames(updated);
                }}
                placeholder={`Player ${i + 1}`}
                placeholderTextColor="#333"
              />
            ))}

            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: theme.accent }]}
              onPress={startTournament}
            >
              <Text style={[styles.startButtonText, { color: '#1a1a2e' }]}>Start Tournament</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderMatchResultModal = () => (
    <Modal visible={showMatchResult} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Match Result</Text>
            <TouchableOpacity onPress={() => setShowMatchResult(false)}>
              <Text style={[styles.closeText, { color: theme.textPrimary }]}>X</Text>
            </TouchableOpacity>
          </View>

          {selectedMatch && (
            <View style={styles.matchResultBody}>
              <Text style={[styles.vsText, { color: theme.textPrimary }]}>
                {getPlayerName(selectedMatch.player1Id)} vs {getPlayerName(selectedMatch.player2Id)}
              </Text>

              <TouchableOpacity
                style={[styles.resultButton, { backgroundColor: theme.accent }]}
                onPress={() => recordMatchResult(selectedMatch.player1Id, false)}
              >
                <Text style={styles.resultButtonText}>{getPlayerName(selectedMatch.player1Id)} Wins</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resultButton, { backgroundColor: theme.accent }]}
                onPress={() => recordMatchResult(selectedMatch.player2Id, false)}
              >
                <Text style={styles.resultButtonText}>{getPlayerName(selectedMatch.player2Id)} Wins</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resultButton, { backgroundColor: theme.darkSquare }]}
                onPress={() => recordMatchResult(null, true)}
              >
                <Text style={[styles.resultButtonText, { color: theme.textPrimary }]}>Draw</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderHistoryModal = () => (
    <Modal visible={showHistory} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Tournament History</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)}>
              <Text style={[styles.closeText, { color: theme.textPrimary }]}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {tournaments.filter(t => t.status === 'completed').map(t => {
              const winner = t.players.find(p => p.id === t.winnerId);
              return (
                <View key={t.id} style={[styles.historyItem, { backgroundColor: theme.darkSquare }]}>
                  <Text style={[styles.historyName, { color: theme.textPrimary }]}>{t.name}</Text>
                  <Text style={[styles.historyType, { color: theme.textSecondary }]}>
                    {t.type.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={[styles.historyWinner, { color: theme.accent }]}>
                    Winner: {winner?.name}
                  </Text>
                  <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                    {new Date(t.completedAt || '').toLocaleDateString()}
                  </Text>
                </View>
              );
            })}
            {tournaments.filter(t => t.status === 'completed').length === 0 && (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No completed tournaments yet
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderLeaderboard = () => {
    if (!currentTournament) return null;
    const sorted = [...currentTournament.players].sort((a, b) => b.points - a.points);

    return (
      <View style={[styles.leaderboard, { backgroundColor: theme.darkSquare + '50' }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Leaderboard</Text>
        {sorted.map((player, i) => (
          <View key={player.id} style={styles.leaderboardRow}>
            <Text style={[styles.rank, { color: theme.accent }]}>#{i + 1}</Text>
            <Text style={[styles.playerName, { color: theme.textPrimary }]}>{player.name}</Text>
            <Text style={[styles.stats, { color: theme.textSecondary }]}>
              {player.wins}W {player.losses}L {player.draws}D
            </Text>
            <Text style={[styles.points, { color: theme.accent }]}>{player.points}pts</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.darkSquare + '30' }]}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Text style={[styles.headerButtonText, { color: theme.textPrimary }]}>Main Menu</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Tournament</Text>
        <TouchableOpacity onPress={() => setShowHistory(true)}>
          <Text style={[styles.headerButtonText, { color: theme.textPrimary }]}>Tournament History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {!currentTournament ? (
          <View style={styles.noTournament}>
            <Text style={[styles.noTournamentText, { color: theme.textPrimary }]}>
              No active tournament
            </Text>
            <TouchableOpacity
              style={[styles.newButton, { backgroundColor: theme.lightSquare }]}
              onPress={() => setShowSetup(true)}
            >
              <Text style={[styles.newButtonText, { color: '#000' }]}>Create Tournament</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.tournamentInfo, { backgroundColor: theme.darkSquare + '50' }]}>
              <Text style={[styles.tournamentName, { color: theme.textPrimary }]}>
                {currentTournament.name}
              </Text>
              <Text style={[styles.tournamentType, { color: theme.textSecondary }]}>
                {currentTournament.type.replace('_', ' ').toUpperCase()} - Round {currentTournament.currentRound}
              </Text>
            </View>

            {renderLeaderboard()}

            <View style={styles.matchesSection}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Current Matches</Text>
              {getCurrentRoundMatches().map(match => (
                <TouchableOpacity
                  key={match.id}
                  style={[
                    styles.matchCard,
                    { backgroundColor: theme.darkSquare },
                    match.completed && { opacity: 0.6 },
                  ]}
                  onPress={() => {
                    if (!match.completed) {
                      setSelectedMatch(match);
                      setShowMatchResult(true);
                    }
                  }}
                  disabled={match.completed}
                >
                  <Text style={[styles.matchPlayers, { color: theme.textPrimary }]}>
                    {getPlayerName(match.player1Id)} vs {getPlayerName(match.player2Id)}
                  </Text>
                  {match.completed && (
                    <Text style={[styles.matchResult, { color: theme.accent }]}>
                      {match.isDraw ? 'Draw' : `${getPlayerName(match.winnerId || '')} wins`}
                    </Text>
                  )}
                  {!match.completed && (
                    <Text style={[styles.tapToPlay, { color: theme.textSecondary }]}>
                      Tap to record result
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {currentTournament.status === 'completed' && (
              <TouchableOpacity
                style={[styles.newButton, { backgroundColor: theme.accent, marginTop: 20 }]}
                onPress={() => {
                  setCurrentTournament(null);
                  setShowSetup(true);
                }}
              >
                <Text style={styles.newButtonText}>New Tournament</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {renderSetupModal()}
      {renderMatchResultModal()}
      {renderHistoryModal()}
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
    minHeight: 56,
  },
  backButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  noTournament: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 200,
  },
  noTournamentText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  newButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  newButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tournamentInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  tournamentName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tournamentType: {
    fontSize: 14,
  },
  leaderboard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 40,
  },
  playerName: {
    flex: 1,
    fontSize: 16,
  },
  stats: {
    fontSize: 12,
    marginRight: 12,
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  matchesSection: {
    marginTop: 8,
  },
  matchCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  matchPlayers: {
    fontSize: 16,
    fontWeight: '600',
  },
  matchResult: {
    fontSize: 14,
    marginTop: 4,
  },
  tapToPlay: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 4,
  },
  modalBody: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  typeButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  countButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  countButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  countButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  startButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  matchResultBody: {
    padding: 24,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  resultButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  resultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  historyName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyType: {
    fontSize: 12,
    marginTop: 4,
  },
  historyWinner: {
    fontSize: 16,
    marginTop: 8,
  },
  historyDate: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
  },
});
