export type TriadType = 'Major' | 'Minor';
export type StringSet = '6-5-4' | '5-4-3' | '4-3-2' | '3-2-1';
export type Inversion = 'Root Position' | '1st Inversion' | '2nd Inversion';
import type { FretboardNote } from '../components/Fretboard';
// Standard interval steps relative to Root
const MAJOR_INTERVALS = [0, 4, 7]; // Root, Major 3rd, Perfect 5th
const MINOR_INTERVALS = [0, 3, 7]; // Root, Minor 3rd, Perfect 5th

const NOTE_TO_INDEX: Record<string, number> = {
    'A': 0, 'A#': 1, 'Bb': 1, 'B': 2, 'C': 3, 'C#': 4, 'Db': 4, 'D': 5,
    'D#': 6, 'Eb': 6, 'E': 7, 'F': 8, 'F#': 9, 'Gb': 9, 'G': 10, 'G#': 11, 'Ab': 11
};

const OPEN_STRING_OFFSETS: Record<number, number> = {
    6: 7, // E is index 7
    5: 0, // A is index 0
    4: 5, // D is index 5
    3: 10, // G is index 10
    2: 2, // B is index 2
    1: 7  // E is index 7
};

const INTERVAL_COLORS: Record<string, string> = { 'R': '#fa5252', '3': '#228be6', '5': '#40c057' };

/**
 * Helper to get the note name index (0-11) from a root and semitone offset
 */
function getNoteIndex(root: string, semitones: number): number {
    const rootIdx = NOTE_TO_INDEX[root];
    return (rootIdx + semitones) % 12;
}

/**
 * Finds the fret number (0-24) for a specific note index on a specific string.
 * It tries to find the instance closest to a reference fret (anchor).
 */
function findFretForNote(stringNum: number, targetNoteIdx: number, anchorFret: number | null): number {
    const stringOffset = OPEN_STRING_OFFSETS[stringNum];

    // Calculate the fret where this note first appears (e.g., Fret 2)
    // Formula: (Target - StringOpen) mod 12
    let baseFret = (targetNoteIdx - stringOffset);
    while (baseFret < 0) baseFret += 12;

    // If no anchor (this is the bass note), prefer positions 0-12
    if (anchorFret === null) {
        // Prefer lower frets, but if base is 0-2 and we could be up at 12, context matters.
        // For simple triads, lowest valid fret is usually safest.
        return baseFret;
    }

    // If we have an anchor, we want the note closest to the anchor
    // Options: baseFret, baseFret + 12, baseFret - 12 (unlikely)
    const candidates = [baseFret, baseFret + 12];

    // Find candidate with smallest distance to anchor
    const bestFret = candidates.reduce((prev, curr) =>
        Math.abs(curr - anchorFret) < Math.abs(prev - anchorFret) ? curr : prev
    );

    return bestFret;
}

export const getTriadNotes = (root: string, type: TriadType, set: StringSet, inversion: Inversion): FretboardNote[] => {
    // 1. Setup intervals
    const intervals = type === 'Major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
    const noteIndices = intervals.map(i => getNoteIndex(root, i));
    const labels = ['R', '3', '5'];

    // 2. Reorder for Inversion
    let voicing = [
        { idx: noteIndices[0], label: labels[0] },
        { idx: noteIndices[1], label: labels[1] },
        { idx: noteIndices[2], label: labels[2] }
    ];

    if (inversion === '1st Inversion') voicing = [voicing[1], voicing[2], voicing[0]];
    else if (inversion === '2nd Inversion') voicing = [voicing[2], voicing[0], voicing[1]];

    // 3. Strings & Search
    const strings = set.split('-').map(Number);
    const results: FretboardNote[] = [];
    let anchorFret: number | null = null;

    for (let i = 0; i < 3; i++) {
        const targetNoteIdx = voicing[i].idx;
        const stringNum = strings[i];

        // Find best fret (closest to anchor)
        const fret = findFretForNote(stringNum, targetNoteIdx, anchorFret);

        // If this is the bass note (i=0), set the anchor
        if (i === 0) anchorFret = fret;

        results.push({
            stringNum,
            fret,
            label: voicing[i].label,
            color: INTERVAL_COLORS[voicing[i].label]
        });
    }

    // --- 4. CLUSTER FIX (The Magic Sauce) ---
    // Check if the hand span is impossible (e.g. Fret 0 and Fret 11)
    const frets = results.map(r => r.fret);
    const minFret = Math.min(...frets);
    const maxFret = Math.max(...frets);

    if ((maxFret - minFret) > 4) {
        // The spread is too wide. This usually happens when we picked an Open String (0-2)
        // for the bass, but the melody note ended up high (10-14).
        // STRATEGY: Shift any note below fret 5 UP by 12 semitones.
        results.forEach(note => {
            if (note.fret < 5) {
                note.fret += 12;
            }
        });
    }

    return results;
};