// src/components/Fretboard.tsx (Full Update)
import { useMantineTheme } from '@mantine/core';
import type { NoteTarget } from '../utils/noteLogic';

export interface FretboardNote {
  stringNum: number;
  fret: number;
  label?: string;
  color?: string;
}

interface FretboardProps {
  activeStrings?: number[];
  targetNote?: NoteTarget | null; // Keep for backward compatibility
  highlightedNotes?: FretboardNote[];
  showHighlight?: boolean;
  totalFrets?: number; // <--- NEW PROP
}

const WIDTH = 1200; // Made wider
const HEIGHT = 220;
const PADDING_X = 60;
const PADDING_Y = 30;
const NUT_WIDTH = 8;

export function Fretboard({
    activeStrings = [1,2,3,4,5,6],
    targetNote,
    highlightedNotes = [],
    showHighlight = true,
    totalFrets = 12 // Default to 12, but can grow
}: FretboardProps) {
  const theme = useMantineTheme();

  // Combine the old "targetNote" and new "highlightedNotes" logic
  // so this component works for BOTH tabs.
  const notesToRender = [...highlightedNotes];
  if (targetNote && showHighlight) {
      // Convert single game target to the array format
      notesToRender.push({
          stringNum: targetNote.stringNum,
          fret: targetNote.fret,
          label: targetNote.noteName,
          color: theme.colors.green[6]
      });
  }

  // --- DYNAMIC MATH ---
  // We use totalFrets in the formula now
  const calculateFretX = (fretIndex: number) => {
    if (fretIndex === 0) return PADDING_X;

    const usableWidth = WIDTH - PADDING_X - 40;
    // The "17.817 rule" constant for fret spacing
    const k = Math.pow(2, 1/12);

    // Calculate position relative to the TOTAL frets we are showing
    const position = usableWidth * (1 - Math.pow(1/k, fretIndex)) / (1 - Math.pow(1/k, totalFrets));

    return PADDING_X + position;
  };

  const calculateStringY = (stringNum: number) => {
    const visualIndex = stringNum - 1;
    const usableHeight = HEIGHT - (PADDING_Y * 2);
    const spacing = usableHeight / 5;
    return PADDING_Y + (visualIndex * spacing);
  };

  const singleDots = [3, 5, 7, 9, 15, 17, 19, 21].filter(f => f <= totalFrets);
  const doubleDots = [12, 24].filter(f => f <= totalFrets);

  return (
    <div style={{ width: '100%', overflow: 'hidden', borderRadius: '8px', border: `2px solid ${theme.colors.dark[4]}` }}>
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ background: theme.colors.dark[8], display: 'block' }}
    >
      {/* DOTS */}
      {singleDots.map(fret => {
        const x = (calculateFretX(fret) + calculateFretX(fret-1)) / 2;
        return <circle key={`dot-${fret}`} cx={x} cy={HEIGHT/2} r={12} fill={theme.colors.dark[3]} />;
      })}
      {doubleDots.map(fret => {
         const x = (calculateFretX(fret) + calculateFretX(fret-1)) / 2;
         return (
           <g key={`doubledot-${fret}`}>
             <circle cx={x} cy={HEIGHT/3} r={12} fill={theme.colors.dark[3]} />
             <circle cx={x} cy={2*HEIGHT/3} r={12} fill={theme.colors.dark[3]} />
           </g>
         )
      })}

      {/* NUT */}
      <rect x={PADDING_X - NUT_WIDTH} y={PADDING_Y} width={NUT_WIDTH} height={HEIGHT - PADDING_Y*2} fill={theme.colors.orange[8]} />

      {/* FRETS */}
      {Array.from({ length: totalFrets }).map((_, i) => {
        const fretNum = i + 1;
        const x = calculateFretX(fretNum);
        return (
          <g key={`fret-${fretNum}`}>
            <line x1={x} y1={PADDING_Y} x2={x} y2={HEIGHT - PADDING_Y} stroke={theme.colors.gray[4]} strokeWidth={4} strokeLinecap="square"/>
            <text x={(x + calculateFretX(fretNum-1))/2} y={HEIGHT - 5} fill={theme.colors.gray[6]} fontSize={16} fontWeight={700} textAnchor="middle">
              {fretNum}
            </text>
          </g>
        );
      })}

      {/* STRINGS */}
      {[6, 5, 4, 3, 2, 1].map((stringNum) => {
        const y = calculateStringY(stringNum);
        const isActive = activeStrings.includes(stringNum);
        return (
          <g key={`string-${stringNum}`}>
             <line
                x1={PADDING_X - NUT_WIDTH}
                y1={y}
                x2={WIDTH}
                y2={y}
                stroke={theme.colors.gray[5]}
                strokeWidth={2 + (stringNum * 0.8)}
                opacity={isActive ? 1 : 0.2}
            />
            <text x={15} y={y + 5} fill={theme.colors.gray[5]} fontSize={18} fontWeight="bold">
                {["E", "B", "G", "D", "A", "E"][stringNum-1]}
            </text>
          </g>
        );
      })}

      {/* HIGHLIGHTED NOTES */}
      {notesToRender.map((note, i) => {
         let cx = 0;
         if (note.fret === 0) {
            cx = PADDING_X - 15;
         } else {
            const x1 = calculateFretX(note.fret);
            const x2 = calculateFretX(note.fret - 1);
            cx = (x1 + x2) / 2;
         }

         const cy = calculateStringY(note.stringNum);
         const fillColor = note.color || theme.colors.blue[6];

         return (
          <g key={`note-${i}`} style={{ filter: `drop-shadow(0 0 5px ${fillColor})` }}>
            <circle cx={cx} cy={cy} r={16} fill={fillColor} stroke={theme.white} strokeWidth={2}/>
             {note.label && (
               <text x={cx} y={cy + 5} fill={theme.white} fontSize={14} fontWeight={800} textAnchor="middle">
                 {note.label}
               </text>
             )}
          </g>
         );
      })}
    </svg>
    </div>
  );
}