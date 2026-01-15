import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Text, Title, Button, Group, Badge, Stack, Progress, Select, Checkbox, MultiSelect, Collapse, ActionIcon } from '@mantine/core';
import { IconMicrophone, IconMicrophoneOff, IconCheck, IconSettings } from '@tabler/icons-react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAudioCapture } from '../audio/useAudioCapture';
import { Fretboard } from './Fretboard';
import type { FretboardNote } from '../components/Fretboard';
import type { TriadType, StringSet, Inversion } from '../utils/triadLogic';
import { getTriadNotes } from '../utils/triadLogic';
import { isCorrectPitch, getFrequency } from '../utils/noteLogic';

// --- CONSTANTS ---
const STREAK_THRESHOLD = 3;

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

const SAMPLE_RATE_URL = (rate: number) => {
  if (import.meta.env.DEV) return `ws://127.0.0.1:8000/ws/audio?rate=${rate}`;
  return `${protocol}//${window.location.host}/guitar-trainer/ws/audio?rate=${rate}`;
}

// Helper: Pick random item from array, but fallback to first item if empty
const randomPick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- DATA LISTS FOR FILTERS ---
const ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#'];
const TYPES: TriadType[] = ['Major', 'Minor'];
const SETS: StringSet[] = ['6-5-4', '5-4-3', '4-3-2', '3-2-1'];
const INVERSIONS: Inversion[] = ['Root Position', '1st Inversion', '2nd Inversion'];

export function TriadTrainer() {
  // --- 1. Game State ---
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'success'>('idle');
  const [targetTriad, setTargetTriad] = useState<{
    root: string;
    type: TriadType;
    set: StringSet;
    inversion: Inversion;
    notes: FretboardNote[];
  } | null>(null);

  const [completedIndices, setCompletedIndices] = useState<number[]>([]);

  // --- 2. Configuration & Filters ---
  const [showSettings, setShowSettings] = useState(false);
  const [showTargetAlways, setShowTargetAlways] = useState(true); // Default to showing answer

  // Filters (Empty array = "All allowed")
  const [selectedRoots, setSelectedRoots] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSets, setSelectedSets] = useState<string[]>([]);
  const [selectedInversions, setSelectedInversions] = useState<string[]>([]);

  // --- 3. Audio & Feedback State ---
  const [audioDevices, setAudioDevices] = useState<{ value: string; label: string; }[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [detectedFreq, setDetectedFreq] = useState(0);

  const currentStreak = useRef(0);
  const lastMatchedIndex = useRef<number | null>(null);

  // --- 4. Initialization (Audio Devices) ---
  useEffect(() => {
    async function getAudioDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs.map(d => ({ value: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0,4)}` })));
        if (audioInputs.length > 0) setSelectedDeviceId(audioInputs[0].deviceId);
      } catch (err) {
        console.warn("Audio permissions denied or error fetching devices", err);
      }
    }
    getAudioDevices();
  }, []);

  const sampleRate = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const rate = ctx.sampleRate;
    ctx.close();
    return rate;
  }, []);

  const { sendMessage, lastJsonMessage, readyState } = useWebSocket(SAMPLE_RATE_URL(sampleRate), {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
  });

  const { isListening, error, startCapture, stopCapture } = useAudioCapture({
    deviceId: selectedDeviceId || undefined,
    onAudioData: (data) => {
      if (readyState === ReadyState.OPEN) {
        sendMessage(data.buffer);
      }
    }
  });

  // --- 5. Game Logic: Next Turn ---
  const nextTurn = useCallback(() => {
    // 1. Filter the pools based on settings
    const poolRoots = selectedRoots.length > 0 ? selectedRoots : ROOTS;
    const poolTypes = selectedTypes.length > 0 ? (selectedTypes as TriadType[]) : TYPES;
    const poolSets = selectedSets.length > 0 ? (selectedSets as StringSet[]) : SETS;
    const poolInvs = selectedInversions.length > 0 ? (selectedInversions as Inversion[]) : INVERSIONS;

    // 2. Pick Random
    const newRoot = randomPick(poolRoots);
    const newType = randomPick(poolTypes);
    const newSet = randomPick(poolSets);
    const newInv = randomPick(poolInvs);

    const visualNotes = getTriadNotes(newRoot, newType, newSet, newInv);

    setTargetTriad({
        root: newRoot,
        type: newType,
        set: newSet,
        inversion: newInv,
        notes: visualNotes
    });
    setCompletedIndices([]);
    setGameState('playing');
    currentStreak.current = 0;
    lastMatchedIndex.current = null;
    setDetectedFreq(0);
  }, [selectedRoots, selectedTypes, selectedSets, selectedInversions]);

  const handleSuccess = useCallback(() => {
    setGameState('success');
    setTimeout(() => nextTurn(), 1500);
  }, [nextTurn]);

  // --- 6. Game Logic: Pitch Detection ---
  useEffect(() => {
    if (lastJsonMessage && gameState === 'playing' && targetTriad) {
      const data = lastJsonMessage as { frequency: number };
      const freq = data.frequency;
      setDetectedFreq(freq);

      if (freq <= 0) {
        currentStreak.current = 0;
        return;
      }

      let matchFound = false;

      targetTriad.notes.forEach((note, index) => {
        if (completedIndices.includes(index)) return;

        const targetHz = getFrequency(note.stringNum, note.fret);

        // 4% tolerance allows for some intonation drift on chords
        if (isCorrectPitch(freq, targetHz, 0.04)) {
           matchFound = true;

           if (lastMatchedIndex.current === index) {
               currentStreak.current += 1;
           } else {
               currentStreak.current = 1;
               lastMatchedIndex.current = index;
           }

           if (currentStreak.current >= STREAK_THRESHOLD) {
               setCompletedIndices(prev => {
                   const newVal = [...prev, index];
                   if (newVal.length === targetTriad.notes.length) handleSuccess();
                   return newVal;
               });
               currentStreak.current = 0;
               lastMatchedIndex.current = null;
           }
        }
      });

      if (!matchFound) {
          currentStreak.current = 0;
          lastMatchedIndex.current = null;
      }
    }
  }, [lastJsonMessage, gameState, targetTriad, completedIndices, handleSuccess]);


  const toggleGame = () => {
    if (isListening) {
      stopCapture();
      setGameState('idle');
    } else {
      startCapture();
      nextTurn();
    }
  };

  // --- 7. Helper: Tuning Meter Offset ---
  // Finds the closest incomplete note to display tuning for
  const getTuningOffset = () => {
    if (!targetTriad || detectedFreq === 0) return 50;

    // Find the target freq of the note we are *likely* trying to play
    // (The one closest to what we are hearing)
    let closestDiff = Infinity;
    let closestTarget = 0;

    targetTriad.notes.forEach((note, idx) => {
        if (completedIndices.includes(idx)) return;
        const hz = getFrequency(note.stringNum, note.fret);
        const diff = Math.abs(detectedFreq - hz);
        if (diff < closestDiff) {
            closestDiff = diff;
            closestTarget = hz;
        }
    });

    if (closestTarget === 0) return 50;

    const diff = detectedFreq - closestTarget;
    const percent = 50 + (diff * 2);
    return Math.min(Math.max(percent, 0), 100);
  };

  // --- 8. Render Preparation ---
  const filteredRenderedNotes = targetTriad?.notes.filter((_, index) => {
      const isDone = completedIndices.includes(index);
      // Only include the note if showTargetAlways is true, or if the note is already done
      return showTargetAlways || isDone;
  }).map((note, index) => {
      const isDone = completedIndices.includes(index);
      return {
          ...note,
          color: isDone ? '#40c057' : note.color, // Green if done
          label: isDone ? '✓' : note.label,       // Change label to checkmark
      };
  }) || [];

  const maxFret = targetTriad ? Math.max(...targetTriad.notes.map(n => n.fret)) : 12;
  const dynamicFrets = Math.max(12, maxFret);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      {/* HEADER & STATUS */}
      <Stack align="center" gap="md" mb="md">
          {error && <Text c="red">{error}</Text>}

          <Group justify="space-between" w="100%">
             <Badge color={readyState === ReadyState.OPEN ? 'green' : 'red'} variant="dot">
                {readyState === ReadyState.OPEN ? 'Connected' : 'Connecting...'}
             </Badge>
             <ActionIcon variant="light" color="gray" onClick={() => setShowSettings(s => !s)}>
                <IconSettings size={20} />
             </ActionIcon>
          </Group>

          {/* SETTINGS COLLAPSE */}
          <Collapse in={showSettings}>
             <Card withBorder bg="gray.0" mb="lg">
                <Text fw={700} size="sm" mb="xs">Game Filters</Text>
                <Stack gap="xs">
                    <MultiSelect label="Roots" placeholder="All Roots" data={ROOTS} value={selectedRoots} onChange={setSelectedRoots} searchable clearable />
                    <MultiSelect label="Types" placeholder="All Types" data={TYPES} value={selectedTypes} onChange={setSelectedTypes} clearable />
                    <MultiSelect label="Strings" placeholder="All Sets" data={SETS} value={selectedSets} onChange={setSelectedSets} clearable />
                    <MultiSelect label="Inversions" placeholder="All Inversions" data={INVERSIONS} value={selectedInversions} onChange={setSelectedInversions} clearable />

                    <Checkbox
                        label="Show Target Notes"
                        description="If unchecked, notes are hidden until you find them."
                        checked={showTargetAlways}
                        onChange={(e) => setShowTargetAlways(e.currentTarget.checked)}
                        mt="xs"
                    />

                    <Select
                        label="Input Device"
                        data={audioDevices}
                        value={selectedDeviceId}
                        onChange={setSelectedDeviceId}
                        disabled={isListening}
                    />
                </Stack>
             </Card>
          </Collapse>

          {/* GAME DISPLAY */}
          {gameState === 'idle' ? (
             <Text c="dimmed" fs="italic">Configure settings and press Start</Text>
          ) : targetTriad && (
              <Stack align="center" gap="xs">
                <Title order={2} size="h1">{targetTriad.root} {targetTriad.type}</Title>
                <Group>
                    <Badge size="lg" variant="light">{targetTriad.set}</Badge>
                    <Badge size="lg" variant="light">{targetTriad.inversion}</Badge>
                </Group>
                <Progress
                     value={(completedIndices.length / 3) * 100}
                     w={150} size="md" radius="xl" color="green"
                     animated={completedIndices.length < 3} mt="sm"
                />
              </Stack>
          )}

          {gameState === 'success' && (
              <Group c="green" fw={700}><IconCheck /><Text>Perfect!</Text></Group>
          )}
      </Stack>

      {/* FRETBOARD */}
      {(targetTriad || gameState === 'idle') && (
         <Fretboard
            highlightedNotes={gameState === 'idle' ? [] : filteredRenderedNotes}
            activeStrings={[1,2,3,4,5,6]}
            totalFrets={dynamicFrets}
         />
      )}

      {/* TUNING METER (Only when playing) */}
      {isListening && gameState === 'playing' && (
        <Card bg="gray.1" radius="md" p="xs" mt="lg">
            <Group justify="space-between" mb={5}>
            <Text size="xs" fw={700}>♭</Text>
            <Text size="xs" fw={700} c={Math.abs(getTuningOffset() - 50) < 5 ? 'green' : 'dimmed'}>
                {detectedFreq > 0 ? `${detectedFreq.toFixed(1)} Hz` : '...'}
            </Text>
            <Text size="xs" fw={700}>♯</Text>
            </Group>
            <Progress
            value={getTuningOffset()}
            color={Math.abs(getTuningOffset() - 50) < 5 ? 'green' : 'blue'}
            size="md" radius="xl"
            />
        </Card>
      )}

      {/* MAIN ACTION BUTTON */}
      <Button
        fullWidth
        size="xl"
        mt="xl"
        color={isListening ? 'red' : 'blue'}
        onClick={toggleGame}
        leftSection={isListening ? <IconMicrophoneOff /> : <IconMicrophone />}
        disabled={readyState !== ReadyState.OPEN}
      >
        {isListening ? 'Stop Session' : 'Start Training'}
      </Button>
    </Card>
  );
}