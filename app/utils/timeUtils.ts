import { Song } from '../types';

/**
 * Format seconds to MM:SS format
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format seconds to a readable duration string (e.g., "5:23" or "45:12")
 */
export const formatDuration = (seconds: number): string => {
  return formatTime(seconds);
};

/**
 * Calculate total duration of songs in seconds
 */
export const calculateTotalDuration = (songs: Song[]): number => {
  return songs.reduce((total, song) => total + song.duration, 0);
};

/**
 * Calculate remaining time for a side in seconds
 */
export const calculateRemainingTime = (
  songs: Song[],
  maxDuration: number
): number => {
  const used = calculateTotalDuration(songs);
  return maxDuration - used;
};

/**
 * Check if adding a song would exceed the side limit
 */
export const wouldExceedLimit = (
  currentSongs: Song[],
  newSong: Song,
  maxDuration: number
): boolean => {
  const totalWithNew = calculateTotalDuration(currentSongs) + newSong.duration;
  return totalWithNew > maxDuration;
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
