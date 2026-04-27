import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import { SvgXml } from 'react-native-svg';
import { BOARD_THEMES, BoardTheme, DEFAULT_THEME } from '../src/utils/themes';
import { getBestMove, Difficulty } from '../src/utils/chessAI';
import { soundManager } from '../src/utils/soundManager';
import { usePurchases } from '../src/contexts/PurchaseContext';
import InterstitialAd from '../src/components/InterstitialAd';
import RewardedAd from '../src/components/RewardedAd';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width, height } = Dimensions.get('window');
const BOARD_SIZE = Math.min(width - 16, height - 200, 960);
const SQUARE_SIZE = BOARD_SIZE / 8;

// Raw SVG strings for chess pieces (works on all platforms)
const PIECE_SVGS: Record<string, string> = {
  wK: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#fff" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#fff" d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>',
  wQ: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25l-7-11 2 12z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-.5 1-.5 2.5-.5 2.5-1.5 1.5-2.5 2.5-3 4.5-.5 1.5-1.5 2.5-1.5 2.5h27s-1-1-1.5-2.5c-.5-2-1.5-3-3-4.5 0 0-.5 1.5-.5 2.5s-.5 2-.5 3.5c-.5 1.5.5 2.5 1.5 4 1 2 2.5 2 2.5 4v.5"/><path fill="none" d="M9 26c8.5-1.5 21-1.5 27 0m-25 2.5c7-1 17-1 23 0m-23.5 5c6.5-1 17-1 23 0m-23.5 5c6.5-1 17-1 23 0"/></g></svg>',
  wR: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V10h4v2h5v-2h5v2h5v-2h4v4H11z"/><path d="M11 14l4 3h15l4-3"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M12 36v4h21v-4H12zm3-20v17h15V16H15z"/><path fill="none" stroke-linejoin="miter" d="M14 29.5h17m-17-6h17"/></g></svg>',
  wB: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>',
  wN: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#fff" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><path fill="#000" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"/></g></svg>',
  wP: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><path fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></svg>',
  bK: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M20 8h5"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#000" d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/><path stroke="#fff" d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>',
  bQ: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path fill="#000" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.5-14.5-5.5 13.5-3-15-3 15-5.5-13.5L13 25 4.5 13.5 9 26z" stroke-linecap="butt"/><path fill="#000" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-.5 1-.5 2.5-.5 2.5-1.5 1.5-2.5 2.5-3 4.5-.5 1.5-1.5 2.5-1.5 2.5h27s-1-1-1.5-2.5c-.5-2-1.5-3-3-4.5 0 0-.5 1.5-.5 2.5s-.5 2-.5 3.5c-.5 1.5.5 2.5 1.5 4 1 2 2.5 2 2.5 4v.5H9v-.5z"/><path fill="none" stroke="#fff" d="M11.5 30c3.5-1 18.5-1 22 0m-21 3c3.5-1 17-1 20 0m-20 3c3.5-1 17-1 20 0"/></g></svg>',
  bR: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" stroke-linecap="butt" d="M9 39h27v-3H9v3zm3.5-7l1.5-2.5h17l1.5 2.5h-20zm-.5 4v-4h21v4H12z"/><path fill="#000" stroke-linecap="butt" d="M14 29.5v-13h17v13H14z"/><path fill="#000" stroke-linecap="butt" d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/><path fill="none" stroke="#fff" stroke-linecap="butt" stroke-width="1" d="M12 35.5h21m-20-18h17m-17 3h17m-17 3h17"/></g></svg>',
  bB: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke="#fff" stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>',
  bN: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#000" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><path fill="#fff" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"/></g></svg>',
  bP: '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45"><path fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></svg>',
};

// Default piece SVG images (base64 encoded for universal compatibility)
const PIECE_IMAGES: Record<string, string> = {
  wK: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0yMi41IDExLjYzVjZNMjAgOGg1Ii8+PHBhdGggZmlsbD0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0yMi41IDI1czQuNS03LjUgMy0xMC41YzAgMC0xLTIuNS0zLTIuNXMtMyAyLjUtMyAyLjVjLTEuNSAzIDMgMTAuNSAzIDEwLjUiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTEuNSAzN2M1LjUgMy41IDE1LjUgMy41IDIxIDB2LTdzOS00LjUgNi0xMC41Yy00LTYuNS0xMy41LTMuNS0xNiA0VjI3di0zLjVjLTMuNS03LjUtMTMtMTAuNS0xNi00LTMgNiA1IDEwIDUgMTBWMzd6Ii8+PHBhdGggZD0iTTExLjUgMzBjNS41LTMgMTUuNS0zIDIxIDBtLTIxIDMuNWM1LjUtMyAxNS41LTMgMjEgMG0tMjEgMy41YzUuNS0zIDE1LjUtMyAyMSAwIi8+PC9nPjwvc3ZnPg==',
  wQ: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxjaXJjbGUgY3g9IjYiIGN5PSIxMiIgcj0iMi43NSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iOSIgcj0iMi43NSIvPjxjaXJjbGUgY3g9IjIyLjUiIGN5PSI4IiByPSIyLjc1Ii8+PGNpcmNsZSBjeD0iMzEiIGN5PSI5IiByPSIyLjc1Ii8+PGNpcmNsZSBjeD0iMzkiIGN5PSIxMiIgcj0iMi43NSIvPjxwYXRoIGQ9Ik05IDI2YzguNS0xLjUgMjEtMS41IDI3IDBsMi0xMi03IDExVjExbC01LjUgMTMuNS0zLTE1LTMgMTUtNS41LTEzLjVWMjVsLTctMTEgMiAxMnoiIHN0cm9rZS1saW5lY2FwPSJidXR0Ii8+PHBhdGggZD0iTTkgMjZjMCAyIDEuNSAyIDIuNSA0IDEgMS41IDEgMSAuNSAzLjUtLjUgMS0uNSAyLjUtLjUgMi41LTEuNSAxLjUtMi41IDIuNS0zIDQuNS0uNSAxLjUtMS41IDIuNS0xLjUgMi41aDI3cy0xLTEtMS41LTIuNWMtLjUtMi0xLjUtMy0zLTQuNSAwIDAtLjUgMS41LS41IDIuNXMtLjUgMi0uNSAzLjVjLS41IDEuNS41IDIuNSAxLjUgNCAxIDIgMi41IDIgMi41IDR2LjUiLz48cGF0aCBmaWxsPSJub25lIiBkPSJNOSAyNmM4LjUtMS41IDIxLTEuNSAyNyAwbS0yNSAyLjVjNy0xIDE3LTEgMjMgMG0tMjMuNSA1YzYuNS0xIDE3LTEgMjMgMG0tMjMuNSA1YzYuNS0xIDE3LTEgMjMgMCIvPjwvZz48L3N2Zz4=',
  wR: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJidXR0IiBkPSJNOSAzOWgyN3YtM0g5djN6bTMtM3YtNGgyMXY0SDEyem0tMS0yMlYxMGg0djJoNXYtMmg1djJoNXYtMmg0djRIMTF6Ii8+PHBhdGggZD0iTTExIDE0bDQgM2gxNWw0LTMiLz48cGF0aCBzdHJva2UtbGluZWNhcD0iYnV0dCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgZD0iTTEyIDM2djRoMjF2LTRIMTJ6bTMtMjB2MTdoMTVWMTZIMTV6Ii8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgZD0iTTE0IDI5LjVoMTdtLTE3LTZoMTciLz48L2c+PC9zdmc+',
  wB: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxnIGZpbGw9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJidXR0Ij48cGF0aCBkPSJNOSAzNmMzLjM5LS45NyAxMC4xMS40MyAxMy41LTIgMy4zOSAyLjQzIDEwLjExIDEuMDMgMTMuNSAyIDAgMCAxLjY1LjU0IDMgMi0uNjguOTctMS42NS45OS0zIC41LTMuMzktLjk3LTEwLjExLjQ2LTEzLjUtMS0zLjM5IDEuNDYtMTAuMTEuMDMtMTMuNSAxLTEuMzUuNDktMi4zMi40Ny0zLS41IDEuMzUtMS45NCAzLTIgMy0yeiIvPjxwYXRoIGQ9Ik0xNSAzMmMyLjUgMi41IDEyLjUgMi41IDE1IDAgLjUtMS41IDAtMiAwLTIgMC0yLjUtMi41LTQtMi41LTQgNS41LTEuNSA2LTExLjUtNS0xNS41LTExIDQtMTAuNSAxNC01IDE1LjUgMCAwLTIuNSAxLjUtMi41IDQgMCAwLS41LjUgMCAyeiIvPjxwYXRoIGQ9Ik0yNSA4YTIuNSAyLjUgMCAxIDEtNSAwIDIuNSAyLjUgMCAxIDEgNSAweiIvPjwvZz48cGF0aCBzdHJva2UtbGluZWpvaW49Im1pdGVyIiBkPSJNMTcuNSAyNmgxME0xNSAzMGgxNW0tNy41LTE0LjV2NU0yMCAxOGg1Ii8+PC9nPjwvc3ZnPg==',
  wN: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0yMiAxMGMxMC41IDEgMTYuNSA4IDE2IDI5SDE1YzAtOSAxMC02LjUgOC0yMSIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0yNCAxOGMuMzggMi45MS01LjU1IDcuMzctOCA5LTMgMi0yLjgyIDQuMzQtNSA0LTEuMDQyLS45NCAxLjQxLTMuMDQgMC0zLTEgMCAuMTkgMS4yMy0xIDItMSAwLTQuMDAzIDEtNC00IDAtMiA2LTEyIDYtMTJzMS44OS0xLjkgMi0zLjVjLS43My0uOTk0LS41LTItLjUtMyAxLTEgMyAyLjUgMyAyLjVoMnMuNzgtMS45OTIgMi41LTNjMSAwIDEgMyAxIDMiLz48cGF0aCBmaWxsPSIjMDAwIiBkPSJNOS41IDI1LjVhLjUuNSAwIDEgMS0xIDAgLjUuNSAwIDEgMSAxIDB6bTUuNDMzLTkuNzVhLjUgMS41IDMwIDEgMS0uODY2LS41LjUgMS41IDMwIDEgMSAuODY2LjV6Ii8+PC9nPjwvc3ZnPg==',
  wP: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PHBhdGggZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBkPSJNMjIuNSA5Yy0yLjIxIDAtNCAxLjc5LTQgNCAwIC44OS4yOSAxLjcxLjc4IDIuMzhDMTcuMzMgMTYuNSAxNiAxOC41OSAxNiAyMWMwIDIuMDMuOTQgMy44NCAyLjQxIDUuMDMtMyAxLjA2LTcuNDEgNS41NS03LjQxIDEzLjQ3aDIzYzAtNy45Mi00LjQxLTEyLjQxLTcuNDEtMTMuNDcgMS40Ny0xLjE5IDIuNDEtMyAyLjQxLTUuMDMgMC0yLjQxLTEuMzMtNC41LTMuMjgtNS42Mi40OS0uNjcuNzgtMS40OS43OC0yLjM4IDAtMi4yMS0xLjc5LTQtNC00eiIvPjwvc3ZnPg==',
  bK: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0yMi41IDExLjYzVjYiLz48cGF0aCBmaWxsPSIjMDAwIiBzdHJva2UtbGluZWNhcD0iYnV0dCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgZD0iTTIwIDhoNSIvPjxwYXRoIGZpbGw9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJidXR0IiBzdHJva2UtbGluZWpvaW49Im1pdGVyIiBkPSJNMjIuNSAyNXM0LjUtNy41IDMtMTAuNWMwIDAtMS0yLjUtMy0yLjVzLTMgMi41LTMgMi41Yy0xLjUgMyAzIDEwLjUgMyAxMC41Ii8+PHBhdGggZmlsbD0iIzAwMCIgZD0iTTExLjUgMzdjNS41IDMuNSAxNS41IDMuNSAyMSAwdi03czktNC41IDYtMTAuNWMtNC02LjUtMTMuNS0zLjUtMTYgNFYyN3YtMy41Yy0zLjUtNy41LTEzLTEwLjUtMTYtNC0zIDYgNSAxMCA1IDEwVjM3eiIvPjxwYXRoIHN0cm9rZT0iI2ZmZiIgZD0iTTExLjUgMzBjNS41LTMgMTUuNS0zIDIxIDBtLTIxIDMuNWM1LjUtMyAxNS41LTMgMjEgMG0tMjEgMy41YzUuNS0zIDE1LjUtMyAyMSAwIi8+PC9nPjwvc3ZnPg==',
  bQ: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxnIGZpbGw9IiMwMDAiIHN0cm9rZT0ibm9uZSI+PGNpcmNsZSBjeD0iNiIgY3k9IjEyIiByPSIyLjc1Ii8+PGNpcmNsZSBjeD0iMTQiIGN5PSI5IiByPSIyLjc1Ii8+PGNpcmNsZSBjeD0iMjIuNSIgY3k9IjgiIHI9IjIuNzUiLz48Y2lyY2xlIGN4PSIzMSIgY3k9IjkiIHI9IjIuNzUiLz48Y2lyY2xlIGN4PSIzOSIgY3k9IjEyIiByPSIyLjc1Ii8+PC9nPjxwYXRoIGZpbGw9IiMwMDAiIGQ9Ik05IDI2YzguNS0xLjUgMjEtMS41IDI3IDBsMi41LTEyLjVMMzEgMjVsLS41LTE0LjUtNS41IDEzLjUtMy0xNS0zIDE1LTUuNS0xMy41TDEzIDI1IDQuNSAxMy41IDkgMjZ6IiBzdHJva2UtbGluZWNhcD0iYnV0dCIvPjxwYXRoIGZpbGw9IiMwMDAiIGQ9Ik05IDI2YzAgMiAxLjUgMiAyLjUgNCAxIDEuNSAxIDEgLjUgMy41LS41IDEtLjUgMi41LS41IDIuNS0xLjUgMS41LTIuNSAyLjUtMyA0LjUtLjUgMS41LTEuNSAyLjUtMS41IDIuNWgyN3MtMS0xLTEuNS0yLjVjLS41LTItMS41LTMtMy00LjUgMCAwLS41IDEuNS0uNSAyLjVzLS41IDItLjUgMy41Yy0uNSAxLjUuNSAyLjUgMS41IDQgMSAyIDIuNSAyIDIuNSA0di41SDl2LS41eiIvPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgZD0iTTExLjUgMzBjMy41LTEgMTguNS0xIDIyIDBtLTIxIDNjMy41LTEgMTctMSAyMCAwbS0yMCAzYzMuNS0xIDE3LTEgMjAgMCIvPjwvZz48L3N2Zz4=',
  bR: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGZpbGw9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJidXR0IiBkPSJNOSAzOWgyN3YtM0g5djN6bTMuNS03bDEuNS0yLjVoMTdsMS41IDIuNWgtMjB6bS0uNSA0di00aDIxdjRIMTJ6Ii8+PHBhdGggZmlsbD0iIzAwMCIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIGQ9Ik0xNCAyOS41di0xM2gxN3YxM0gxNHoiLz48cGF0aCBmaWxsPSIjMDAwIiBzdHJva2UtbGluZWNhcD0iYnV0dCIgZD0iTTE0IDE2LjVMMTEgMTRoMjNsLTMgMi41SDE0ek0xMSAxNFY5aDR2Mmg1VjloNXYyaDVWOWg0djVIMTF6Ii8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0iYnV0dCIgc3Ryb2tlLXdpZHRoPSIxIiBkPSJNMTIgMzUuNWgyMW0tMjAtMThoMTdtLTE3IDNoMTdtLTE3IDNoMTciLz48L2c+PC9zdmc+',
  bB: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxnIGZpbGw9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJidXR0Ij48cGF0aCBkPSJNOSAzNmMzLjM5LS45NyAxMC4xMS40MyAxMy41LTIgMy4zOSAyLjQzIDEwLjExIDEuMDMgMTMuNSAyIDAgMCAxLjY1LjU0IDMgMi0uNjguOTctMS42NS45OS0zIC41LTMuMzktLjk3LTEwLjExLjQ2LTEzLjUtMS0zLjM5IDEuNDYtMTAuMTEuMDMtMTMuNSAxLTEuMzUuNDktMi4zMi40Ny0zLS41IDEuMzUtMS45NCAzLTIgMy0yeiIvPjxwYXRoIGQ9Ik0xNSAzMmMyLjUgMi41IDEyLjUgMi41IDE1IDAgLjUtMS41IDAtMiAwLTIgMC0yLjUtMi41LTQtMi41LTQgNS41LTEuNSA2LTExLjUtNS0xNS41LTExIDQtMTAuNSAxNC01IDE1LjUgMCAwLTIuNSAxLjUtMi41IDQgMCAwLS41LjUgMCAyeiIvPjxwYXRoIGQ9Ik0yNSA4YTIuNSAyLjUgMCAxIDEtNSAwIDIuNSAyLjUgMCAxIDEgNSAweiIvPjwvZz48cGF0aCBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIGQ9Ik0xNy41IDI2aDEwTTE1IDMwaDE1bS03LjUtMTQuNXY1TTIwIDE4aDUiLz48L2c+PC9zdmc+',
  bN: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGZpbGw9IiMwMDAiIGQ9Ik0yMiAxMGMxMC41IDEgMTYuNSA4IDE2IDI5SDE1YzAtOSAxMC02LjUgOC0yMSIvPjxwYXRoIGZpbGw9IiMwMDAiIGQ9Ik0yNCAxOGMuMzggMi45MS01LjU1IDcuMzctOCA5LTMgMi0yLjgyIDQuMzQtNSA0LTEuMDQyLS45NCAxLjQxLTMuMDQgMC0zLTEgMCAuMTkgMS4yMy0xIDItMSAwLTQuMDAzIDEtNC00IDAtMiA2LTEyIDYtMTJzMS44OS0xLjkgMi0zLjVjLS43My0uOTk0LS41LTItLjUtMyAxLTEgMyAyLjUgMyAyLjVoMnMuNzgtMS45OTIgMi41LTNjMSAwIDEgMyAxIDMiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNOS41IDI1LjVhLjUuNSAwIDEgMS0xIDAgLjUuNSAwIDEgMSAxIDB6bTUuNDMzLTkuNzVhLjUgMS41IDMwIDEgMS0uODY2LS41LjUgMS41IDMwIDEgMSAuODY2LjV6Ii8+PC9nPjwvc3ZnPg==',
  bP: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NSIgaGVpZ2h0PSI0NSI+PHBhdGggZmlsbD0iIzAwMCIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBkPSJNMjIuNSA5Yy0yLjIxIDAtNCAxLjc5LTQgNCAwIC44OS4yOSAxLjcxLjc4IDIuMzhDMTcuMzMgMTYuNSAxNiAxOC41OSAxNiAyMWMwIDIuMDMuOTQgMy44NCAyLjQxIDUuMDMtMyAxLjA2LTcuNDEgNS41NS03LjQxIDEzLjQ3aDIzYzAtNy45Mi00LjQxLTEyLjQxLTcuNDEtMTMuNDcgMS40Ny0xLjE5IDIuNDEtMyAyLjQxLTUuMDMgMC0yLjQxLTEuMzMtNC41LTMuMjgtNS42Mi40OS0uNjcuNzgtMS40OS43OC0yLjM4IDAtMi4yMS0xLjc5LTQtNC00eiIvPjwvc3ZnPg==',
};

// For compatibility, keep the old symbol-based DEFAULT_PIECES
const DEFAULT_PIECES: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

interface PieceSet {
  id: string;
  name: string;
  pieces: Record<string, string>;
}

const TIME_CONTROLS: Record<string, number> = {
  'unlimited': 0,
  '1min': 60,
  '3min': 180,
  '5min': 300,
  '10min': 600,
  '15min': 900,
  '30min': 1800,
};

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId: string; pieceSetId: string; vsAI: string }>();
  const gameId = params.gameId;
  const pieceSetId = params.pieceSetId;
  const vsAI = params.vsAI === 'true';

  const [chess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const { hasAutoOverlays, hasLetterOverlays, hasCornerLetters } = usePurchases();
  const [pieceOverlaySettingEnabled, setPieceOverlaySettingEnabled] = useState<boolean>(true);
  const [cornerLetterSettingEnabled, setCornerLetterSettingEnabled] = useState<boolean>(true);
  const [customPieces, setCustomPieces] = useState<Record<string, string>>({});
  const [gameStatus, setGameStatus] = useState<string>('in_progress');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[] }>({
    white: [],
    black: [],
  });
  const [theme, setTheme] = useState<BoardTheme>(DEFAULT_THEME);
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('medium');
  const [isAIThinking, setIsAIThinking] = useState(false);
  
  // Timer state
  const [whiteTime, setWhiteTime] = useState<number>(0);
  const [blackTime, setBlackTime] = useState<number>(0);
  const [timeControl, setTimeControl] = useState<string>('unlimited');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSettings();
    loadGame();
    if (pieceSetId) {
      loadPieceSet();
    }
    soundManager.loadSounds();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (timeControl === 'unlimited' || gameStatus !== 'in_progress') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      if (chess.turn() === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            handleTimeout('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            handleTimeout('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [chess.turn(), timeControl, gameStatus]);

  const handleTimeout = (color: 'w' | 'b') => {
    setGameStatus('timeout');
    soundManager.playGameEnd();
    Alert.alert(
      'Time Out!',
      `${color === 'w' ? 'Black' : 'White'} wins on time!`,
      [{ text: 'OK' }]
    );
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const loadSettings = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('chess_theme');
      const savedTimeControl = await AsyncStorage.getItem('chess_time_control');
      const savedDifficulty = await AsyncStorage.getItem('chess_ai_difficulty');
      const savedSound = await AsyncStorage.getItem('chess_sound');
      const savedPieceOverlays = await AsyncStorage.getItem('chess_piece_overlays_enabled');
      const savedCornerLetters = await AsyncStorage.getItem('chess_corner_letters_enabled');

      if (savedTheme) {
        const foundTheme = BOARD_THEMES.find(t => t.id === savedTheme);
        if (foundTheme) setTheme(foundTheme);
      }
      
      if (savedTimeControl) {
        setTimeControl(savedTimeControl);
        const initialTime = TIME_CONTROLS[savedTimeControl] || 0;
        setWhiteTime(initialTime);
        setBlackTime(initialTime);
      }
      
      if (savedDifficulty) {
        setAiDifficulty(savedDifficulty as Difficulty);
      }

      if (savedSound !== null) {
        soundManager.setMuted(savedSound !== 'true');
      }

      if (savedPieceOverlays !== null) setPieceOverlaySettingEnabled(savedPieceOverlays === 'true');
      if (savedCornerLetters !== null) setCornerLetterSettingEnabled(savedCornerLetters === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadGame = async () => {
    if (!gameId) return;
    try {
      // Load game from local storage (standalone mode)
      const savedGames = await AsyncStorage.getItem('saved_games');
      if (savedGames) {
        const games = JSON.parse(savedGames);
        const game = games.find((g: any) => g.id === gameId);
        if (game && game.fen && game.fen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
          chess.load(game.fen);
          setBoard(chess.board());
          setGameStatus(game.status || 'in_progress');
          if (game.pgn) {
            const moves = game.pgn.split(' ').filter((m: string) => m && !m.includes('.'));
            setMoveHistory(moves);
          }
        }
      }
    } catch (error) {
      console.log('Error loading game:', error);
    }
  };

  const loadPieceSet = async () => {
    if (!pieceSetId) return;
    try {
      // Load piece set from local storage (standalone mode)
      const savedPieceSets = await AsyncStorage.getItem('custom_piece_sets');
      if (savedPieceSets) {
        const pieceSets = JSON.parse(savedPieceSets);
        const pieceSet = pieceSets.find((p: any) => p.id === pieceSetId);
        if (pieceSet) {
          setCustomPieces(pieceSet.pieces || {});
        }
      }
    } catch (error) {
      console.log('Error loading piece set:', error);
    }
  };

  const saveGame = async () => {
    if (!gameId) return;
    try {
      // Save game to local storage (standalone mode)
      const savedGamesStr = await AsyncStorage.getItem('saved_games');
      let games = savedGamesStr ? JSON.parse(savedGamesStr) : [];
      
      const gameData = {
        id: gameId,
        fen: chess.fen(),
        pgn: chess.pgn(),
        status: gameStatus,
        turn: chess.turn(),
        updatedAt: new Date().toISOString(),
      };
      
      const existingIndex = games.findIndex((g: any) => g.id === gameId);
      if (existingIndex >= 0) {
        games[existingIndex] = gameData;
      } else {
        games.unshift(gameData);
      }
      
      // Keep only last 50 games
      games = games.slice(0, 50);
      
      await AsyncStorage.setItem('saved_games', JSON.stringify(games));
    } catch (error) {
      console.log('Error saving game:', error);
    }
  };

  const makeAIMove = useCallback(() => {
    if (!vsAI || chess.turn() !== 'b' || gameStatus !== 'in_progress') return;
    
    setIsAIThinking(true);
    
    // Add timeout to prevent freeze
    const timeoutId = setTimeout(() => {
      try {
        const moves = chess.moves({ verbose: true });
        
        // If no legal moves, the game is over
        if (moves.length === 0) {
          setIsAIThinking(false);
          checkGameStatus();
          return;
        }
        
        const bestMove = getBestMove(chess, aiDifficulty);
        
        if (bestMove) {
          const move = chess.move(bestMove);
          
          if (move) {
            // Play sound
            if (move.captured) {
              soundManager.playCapture();
            } else if (move.flags.includes('k') || move.flags.includes('q')) {
              soundManager.playCastle();
            } else {
              soundManager.playMove();
            }

            // Track captured pieces
            if (move.captured) {
              const capturedKey = `w${move.captured.toUpperCase()}`;
              setCapturedPieces(prev => ({
                ...prev,
                black: [...prev.black, capturedKey],
              }));
            }

            setMoveHistory(prev => [...prev, move.san]);
            setBoard(chess.board());

            // Check game status
            checkGameStatus();
            saveGame();
          }
        } else {
          // If getBestMove returns null but there are legal moves, pick a random one
          if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            const move = chess.move(randomMove);
            if (move) {
              if (move.captured) {
                soundManager.playCapture();
              } else {
                soundManager.playMove();
              }
              if (move.captured) {
                const capturedKey = `w${move.captured.toUpperCase()}`;
                setCapturedPieces(prev => ({
                  ...prev,
                  black: [...prev.black, capturedKey],
                }));
              }
              setMoveHistory(prev => [...prev, move.san]);
              setBoard(chess.board());
              checkGameStatus();
              saveGame();
            }
          }
        }
      } catch (error) {
        console.error('AI move error:', error);
      }
      
      setIsAIThinking(false);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [vsAI, chess, gameStatus, aiDifficulty]);

  // Trigger AI move when it's black's turn
  useEffect(() => {
    if (vsAI && chess.turn() === 'b' && gameStatus === 'in_progress' && !isAIThinking) {
      makeAIMove();
    }
  }, [board, vsAI, gameStatus, isAIThinking]);

  const checkGameStatus = () => {
    if (chess.isCheckmate()) {
      setGameStatus('checkmate');
      soundManager.playGameEnd();
      Alert.alert(
        'Checkmate!',
        `${chess.turn() === 'w' ? 'Black' : 'White'} wins!`,
        [{ text: 'OK' }]
      );
    } else if (chess.isStalemate()) {
      setGameStatus('stalemate');
      soundManager.playGameEnd();
      Alert.alert('Stalemate!', 'The game is a draw.', [{ text: 'OK' }]);
    } else if (chess.isDraw()) {
      setGameStatus('draw');
      soundManager.playGameEnd();
      Alert.alert('Draw!', 'The game is a draw.', [{ text: 'OK' }]);
    } else if (chess.isCheck()) {
      soundManager.playCheck();
    }
  };

  const getPieceKey = (piece: { type: PieceSymbol; color: Color }): string => {
    return `${piece.color}${piece.type.toUpperCase()}`;
  };

  const PIECE_SYMBOLS: Record<string, string> = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
  };

  const PIECE_LETTERS: Record<string, string> = {
    wK: 'K', wQ: 'Q', wR: 'R', wB: 'B', wN: 'N', wP: 'P',
    bK: 'K', bQ: 'Q', bR: 'R', bB: 'B', bN: 'N', bP: 'P',
  };

  const renderPiece = (piece: { type: PieceSymbol; color: Color } | null) => {
    if (!piece) return null;
    
    const pieceKey = getPieceKey(piece);
    const customImage = customPieces[pieceKey];
    const isWhite = piece.color === 'w';
    
    if (customImage) {
      const showAutoOverlay = hasAutoOverlays && pieceOverlaySettingEnabled;
      const showCornerLetter = (hasCornerLetters && cornerLetterSettingEnabled) ||
        (hasLetterOverlays && pieceOverlaySettingEnabled && !showAutoOverlay);
      return (
        <View style={{ width: SQUARE_SIZE * 0.9, height: SQUARE_SIZE * 0.9 }}>
          <Image
            source={{ uri: customImage }}
            style={{ width: '100%', height: '100%', borderRadius: 4 }}
            resizeMode="cover"
          />
          {showAutoOverlay && (
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{
                fontSize: SQUARE_SIZE * 0.35,
                textShadowColor: isWhite ? '#000' : '#fff',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
                opacity: 0.85,
              }}>
                {PIECE_SYMBOLS[pieceKey]}
              </Text>
            </View>
          )}
          {showCornerLetter && (
            <View style={{
              position: 'absolute', bottom: 1, right: 2,
              backgroundColor: isWhite ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
              borderRadius: 3, paddingHorizontal: 2,
            }}>
              <Text style={{
                fontSize: SQUARE_SIZE * 0.22,
                fontWeight: 'bold',
                color: isWhite ? '#fff' : '#000',
              }}>
                {PIECE_LETTERS[pieceKey]}
              </Text>
            </View>
          )}
        </View>
      );
    }
    
    // Use SvgXml for native platforms, Image for web
    const svgContent = PIECE_SVGS[pieceKey];
    if (svgContent && Platform.OS !== 'web') {
      return (
        <SvgXml
          xml={svgContent}
          width={SQUARE_SIZE * 0.85}
          height={SQUARE_SIZE * 0.85}
        />
      );
    }
    
    // Fallback to Image for web
    return (
      <Image
        source={{ uri: PIECE_IMAGES[pieceKey] }}
        style={styles.pieceImage}
        resizeMode="contain"
      />
    );
  };

  const getSquareColor = (row: number, col: number): string => {
    const isLight = (row + col) % 2 === 0;
    return isLight ? theme.lightSquare : theme.darkSquare;
  };

  const getSquareName = (row: number, col: number): Square => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return `${files[col]}${ranks[row]}` as Square;
  };

  const handleSquarePress = (row: number, col: number) => {
    if (gameStatus !== 'in_progress') return;
    if (vsAI && chess.turn() === 'b') return; // Don't allow moves during AI turn
    if (isAIThinking) return;
    
    const square = getSquareName(row, col);
    const piece = chess.get(square);
    
    if (selectedSquare) {
      // Try to make a move
      if (validMoves.includes(square)) {
        try {
          const move = chess.move({
            from: selectedSquare,
            to: square,
            promotion: 'q', // Always promote to queen for simplicity
          });
          
          if (move) {
            // Play sound
            if (move.captured) {
              soundManager.playCapture();
            } else if (move.flags.includes('k') || move.flags.includes('q')) {
              soundManager.playCastle();
            } else {
              soundManager.playMove();
            }

            // Track captured pieces
            if (move.captured) {
              const capturedKey = `${move.color === 'w' ? 'b' : 'w'}${move.captured.toUpperCase()}`;
              setCapturedPieces(prev => ({
                ...prev,
                [move.color === 'w' ? 'white' : 'black']: [
                  ...prev[move.color === 'w' ? 'white' : 'black'],
                  capturedKey,
                ],
              }));
            }
            
            setMoveHistory(prev => [...prev, move.san]);
            setBoard(chess.board());
            
            checkGameStatus();
            saveGame();
          }
        } catch (e) {
          console.log('Invalid move');
        }
      }
      setSelectedSquare(null);
      setValidMoves([]);
    } else if (piece && piece.color === chess.turn()) {
      // Select a piece
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setValidMoves(moves.map(m => m.to as Square));
    }
  };

  const resetGame = () => {
    // Use confirm for web compatibility
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to start a new game?')) {
        chess.reset();
        setBoard(chess.board());
        setSelectedSquare(null);
        setValidMoves([]);
        setGameStatus('in_progress');
        setMoveHistory([]);
        setCapturedPieces({ white: [], black: [] });
        const initialTime = TIME_CONTROLS[timeControl] || 0;
        setWhiteTime(initialTime);
        setBlackTime(initialTime);
        soundManager.playGameStart();
        saveGame();
      }
    } else {
      Alert.alert(
        'Reset Game',
        'Are you sure you want to start a new game?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => {
              chess.reset();
              setBoard(chess.board());
              setSelectedSquare(null);
              setValidMoves([]);
              setGameStatus('in_progress');
              setMoveHistory([]);
              setCapturedPieces({ white: [], black: [] });
              const initialTime = TIME_CONTROLS[timeControl] || 0;
              setWhiteTime(initialTime);
              setBlackTime(initialTime);
              soundManager.playGameStart();
              saveGame();
            },
          },
        ]
      );
    }
  };

  const undoMove = () => {
    if (vsAI && chess.turn() === 'b') return;
    
    // Undo twice if playing vs AI (undo AI move and player move)
    const undoCount = vsAI ? 2 : 1;
    
    for (let i = 0; i < undoCount; i++) {
      const move = chess.undo();
      if (move) {
        setMoveHistory(prev => prev.slice(0, -1));
        if (move.captured) {
          const capturedKey = `${move.color === 'w' ? 'b' : 'w'}${move.captured.toUpperCase()}`;
          setCapturedPieces(prev => ({
            ...prev,
            [move.color === 'w' ? 'white' : 'black']: prev[move.color === 'w' ? 'white' : 'black'].slice(0, -1),
          }));
        }
      }
    }
    
    setBoard(chess.board());
    setSelectedSquare(null);
    setValidMoves([]);
    setGameStatus('in_progress');
    saveGame();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shareGame = async () => {
    const pgn = chess.pgn();
    const result = gameStatus === 'checkmate' 
      ? (chess.turn() === 'w' ? '0-1' : '1-0')
      : gameStatus === 'draw' || gameStatus === 'stalemate'
      ? '1/2-1/2'
      : '*';
    
    const shareText = `Chess Game\n\nResult: ${result}\nMoves: ${moveHistory.length}\n\nPGN:\n${pgn || 'No moves yet'}\n\nFEN: ${chess.fen()}`;
    
    try {
      if (Platform.OS === 'web') {
        await Share.share({ message: shareText });
      } else {
        await Share.share({
          message: shareText,
          title: 'Chess Game',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const isGameOver = gameStatus !== 'in_progress';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Text style={[styles.mainMenuText, { color: theme.textPrimary }]}>Main Menu</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {vsAI ? 'vs Computer' : 'Two Players'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* Timer - Black */}
      {timeControl !== 'unlimited' && (
        <View style={[
          styles.timerContainer,
          chess.turn() === 'b' && gameStatus === 'in_progress' && styles.timerActive,
          { borderColor: theme.accent }
        ]}>
          <View style={[styles.timerIndicator, { backgroundColor: '#1a1a2e' }]} />
          <Text style={[styles.timerText, { color: theme.textPrimary }]}>
            {formatTime(blackTime)}
          </Text>
          {isAIThinking && vsAI && (
            <Text style={[styles.thinkingText, { color: theme.accent }]}>Thinking...</Text>
          )}
        </View>
      )}

      {/* Turn Indicator */}
      <View style={styles.turnContainer}>
        <View style={[
          styles.turnIndicator,
          { backgroundColor: chess.turn() === 'w' ? '#FFFFFF' : '#1a1a2e', borderColor: theme.accent }
        ]} />
        <Text style={[styles.turnText, { color: theme.textPrimary }]}>
          {isGameOver
            ? gameStatus === 'checkmate'
              ? `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins!`
              : gameStatus === 'timeout'
              ? 'Time out!'
              : gameStatus === 'stalemate'
              ? 'Stalemate!'
              : 'Draw!'
            : chess.isCheck()
            ? `${chess.turn() === 'w' ? 'White' : 'Black'} is in Check!`
            : `${chess.turn() === 'w' ? 'White' : 'Black'}'s Turn`}
        </Text>
      </View>

      {/* Captured Pieces - Black's captures */}
      <View style={styles.capturedContainer}>
        {capturedPieces.black.map((piece, index) => (
          <Image 
            key={`black-${index}`} 
            source={{ uri: PIECE_IMAGES[piece] }} 
            style={styles.capturedPieceImage}
          />
        ))}
      </View>

      {/* Chess Board */}
      <View style={styles.boardContainer}>
        <View style={[styles.board, { borderColor: theme.accent }]}>
          {board.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((square, colIndex) => {
                const squareName = getSquareName(rowIndex, colIndex);
                const isSelected = selectedSquare === squareName;
                const isValidMove = validMoves.includes(squareName);
                
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[
                      styles.square,
                      { backgroundColor: isSelected ? theme.selectedSquare : getSquareColor(rowIndex, colIndex) },
                    ]}
                    onPress={() => handleSquarePress(rowIndex, colIndex)}
                    activeOpacity={0.8}
                    disabled={isAIThinking}
                  >
                    {isValidMove && !square && (
                      <View style={[styles.validMoveDot, { backgroundColor: theme.validMoveDot }]} />
                    )}
                    {isValidMove && square && (
                      <View style={[styles.captureHighlight, { borderColor: theme.validMoveDot }]} />
                    )}
                    {square && renderPiece(square)}
                    {hasCornerLetters && cornerLetterSettingEnabled && (
                      <Text style={{
                        position: 'absolute', bottom: 1, left: 2,
                        fontSize: SQUARE_SIZE * 0.16, opacity: 0.6,
                        color: (rowIndex + colIndex) % 2 === 0 ? theme.darkSquare : theme.lightSquare,
                        fontWeight: '600',
                      }}>
                        {getSquareName(rowIndex, colIndex)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
        
        {/* Board Labels */}
        <View style={styles.fileLabels}>
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(file => (
            <Text key={file} style={[styles.label, { color: theme.textSecondary }]}>{file}</Text>
          ))}
        </View>
      </View>

      {/* Captured Pieces - White's captures */}
      <View style={styles.capturedContainer}>
        {capturedPieces.white.map((piece, index) => (
          <Image 
            key={`white-${index}`} 
            source={{ uri: PIECE_IMAGES[piece] }} 
            style={styles.capturedPieceImage}
          />
        ))}
      </View>

      {/* Timer - White */}
      {timeControl !== 'unlimited' && (
        <View style={[
          styles.timerContainer,
          chess.turn() === 'w' && gameStatus === 'in_progress' && styles.timerActive,
          { borderColor: theme.accent }
        ]}>
          <View style={[styles.timerIndicator, { backgroundColor: '#FFFFFF' }]} />
          <Text style={[styles.timerText, { color: theme.textPrimary }]}>
            {formatTime(whiteTime)}
          </Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={undoMove}
          disabled={isAIThinking || moveHistory.length === 0}
        >
          <Text style={[styles.controlText, { color: moveHistory.length === 0 ? theme.textSecondary + '50' : theme.textPrimary }]}>Undo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={resetGame}>
          <Text style={[styles.controlText, { color: theme.textPrimary }]}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={() => router.push('/settings')}>
          <Text style={[styles.controlText, { color: theme.textPrimary }]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Move History */}
      {moveHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={[styles.historyTitle, { color: theme.textSecondary }]}>Moves:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.historyMoves}>
              {moveHistory.map((move, index) => (
                <Text key={index} style={[styles.historyMove, { color: theme.textPrimary }]}>
                  {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}{move}
                </Text>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,

    minHeight: 56,
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
  shareButton: {
    padding: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  timerActive: {
    borderWidth: 2,
  },
  timerIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#888',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  thinkingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  turnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  turnIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  turnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  capturedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 28,
    flexWrap: 'wrap',
  },
  capturedPiece: {
    fontSize: 18,
    marginHorizontal: 2,
  },
  capturedPieceImage: {
    width: 24,
    height: 24,
    marginHorizontal: 2,
  },
  boardContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validMoveDot: {
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15,
  },
  captureHighlight: {
    position: 'absolute',
    width: SQUARE_SIZE - 4,
    height: SQUARE_SIZE - 4,
    borderRadius: SQUARE_SIZE / 2,
    borderWidth: 3,
  },
  pieceText: {
    fontSize: SQUARE_SIZE * 0.75,
  },
  pieceImage: {
    width: SQUARE_SIZE * 0.85,
    height: SQUARE_SIZE * 0.85,
  },
  simplePiece: {
    width: SQUARE_SIZE * 0.7,
    height: SQUARE_SIZE * 0.7,
    borderRadius: SQUARE_SIZE * 0.35,
    borderWidth: 2,
  },
  capturedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    marginHorizontal: 2,
  },
  fileLabels: {
    flexDirection: 'row',
    width: BOARD_SIZE,
    justifyContent: 'space-around',
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    width: SQUARE_SIZE,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
  },
  controlButton: {
    alignItems: 'center',
    gap: 4,
  },
  controlText: {
    fontSize: 12,
  },
  historyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  historyTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  historyMoves: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyMove: {
    fontSize: 14,
  },
});
