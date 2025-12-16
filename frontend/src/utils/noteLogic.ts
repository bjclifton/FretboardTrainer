// src/utils/noteLogic.ts

export interface NoteTarget {
  noteName: string;
  stringNum: number;
  fret: number;
  frequency: number;
}

const SEMITONE_RATIO = Math.pow(2, 1 / 12);

// Standard Tuning Frequencies (Hz)
const OPEN_STRINGS: Record<number, number> = {
  1: 329.63, // E4 (High)
  2: 246.94, // B3
  3: 196.00, // G3
  4: 146.83, // D3
  5: 110.00, // A2
  6: 82.41   // E2 (Low)
};

// Chromatic Scale starting from A
// We use arrays for enharmonics e.g. ["A#", "Bb"]
const CHROMATIC_SCALE = [
  ["A"], ["A#", "Bb"], ["B"], ["C"], ["C#", "Db"], ["D"],
  ["D#", "Eb"], ["E"], ["F"], ["F#", "Gb"], ["G"], ["G#", "Ab"]
];

/**
 * Calculates the frequency of a specific string/fret
 */
export const getFrequency = (stringNum: number, fret: number): number => {
  const baseFreq = OPEN_STRINGS[stringNum];
  return baseFreq * Math.pow(SEMITONE_RATIO, fret);
};

/**
 * Gets the note name for a specific string/fret
 */
export const getNoteName = (stringNum: number, fret: number): string => {
  // 1. Determine the "offset" from A based on open string
  // String 6 (E) is 7 semitones above A (wrapping around)
  // This lookup maps string number to its semitone index in CHROMATIC_SCALE
  const stringOffsets: Record<number, number> = {
    6: 7, // E is index 7
    5: 0, // A is index 0
    4: 5, // D is index 5
    3: 10, // G is index 10
    2: 2, // B is index 2
    1: 7  // E is index 7
  };

  const startBuffer = stringOffsets[stringNum];
  const index = (startBuffer + fret) % 12;

  const names = CHROMATIC_SCALE[index];
  // Randomly pick enharmonic spelling (e.g., C# or Db) to train brain
  return names[Math.floor(Math.random() * names.length)];
};

/**
 * Generates a random prompt based on active strings
 */
export const generatePrompt = (activeStrings: number[]): NoteTarget => {
  if (activeStrings.length === 0) return { noteName: "?", stringNum: 1, fret: 0, frequency: 0 };

  const stringNum = activeStrings[Math.floor(Math.random() * activeStrings.length)];
  const fret = Math.floor(Math.random() * 13); // Frets 0 to 12

  return {
    noteName: getNoteName(stringNum, fret),
    stringNum,
    fret,
    frequency: getFrequency(stringNum, fret)
  };
};

/**
 * Checks if played freq matches target freq within tolerance
 */
export const isCorrectPitch = (playedHz: number, targetHz: number, toleranceRatio = 0.02): boolean => {
  if (playedHz === 0) return false;
  const min = targetHz * (1 - toleranceRatio);
  const max = targetHz * (1 + toleranceRatio);
  return playedHz >= min && playedHz <= max;
};