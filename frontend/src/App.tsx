// src/App.tsx
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button, Container, Title, Text, Card, Group, Badge, Stack, Progress, ThemeIcon } from '@mantine/core';
import { IconCheck, IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAudioCapture } from './audio/useAudioCapture';
import { generatePrompt, isCorrectPitch } from './utils/noteLogic';
import type { NoteTarget } from './utils/noteLogic';
import { StringSelector } from './components/StringSelector.tsx';

function App() {
  // --- 1. Game State ---
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'success'>('idle');
  const [target, setTarget] = useState<NoteTarget | null>(null);
  const [activeStrings, setActiveStrings] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  // Real-time Feedback
  const successStreak = useRef(0); // How many consecutive frames correct?
  const REQUIRED_STREAK = 8; // approx 150-200ms depending on websocket rate

  // --- 2. Audio & Network Setup ---
  // Detect sample rate once on mount
  const sampleRate = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const rate = ctx.sampleRate;
    ctx.close();
    return rate;
  }, []);

  const socketUrl = `ws://127.0.0.1:8000/ws/audio?rate=${sampleRate}`;
  const { sendMessage, lastJsonMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
  });

  const { isListening, error, startCapture, stopCapture } = useAudioCapture({
    onAudioData: (data) => {
      if (readyState === ReadyState.OPEN && gameState !== 'idle') {
        sendMessage(data);
      }
    }
  });

  const detectedFreq = (lastJsonMessage as { frequency: number } | null)?.frequency ?? 0;

  const nextTurn = useCallback(() => {
    const newTarget = generatePrompt(activeStrings);
    setTarget(newTarget);
    setGameState('playing');
  }, [activeStrings]);

  const handleSuccess = useCallback(() => {
    setGameState('success');
    successStreak.current = 0;

    // Cooldown then new note
    setTimeout(() => {
      nextTurn();
    }, 1500);
  }, [nextTurn]);

  // --- 3. The Core Game Loop (Triggered by WebSocket messages) ---
  useEffect(() => {
    if (gameState === 'playing' && target && detectedFreq > 0) {
      if (isCorrectPitch(detectedFreq, target.frequency, 0.03)) { // 3% tolerance
        successStreak.current += 1;
      } else {
        successStreak.current = 0;
      }

      // Check for Win
      if (successStreak.current >= REQUIRED_STREAK) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        handleSuccess();
      }
    }
  }, [gameState, target, detectedFreq, handleSuccess]);

  const toggleGame = () => {
    if (isListening) {
      stopCapture();
      setGameState('idle');
      setTarget(null);
    } else {
      startCapture();
      nextTurn();
    }
  };

  // --- 4. Tuning Helper Logic ---
  const getTuningOffset = () => {
    if (!target || detectedFreq === 0) return 50; // Center
    const diff = detectedFreq - target.frequency;
    // visual scale: +/- 10Hz range
    const percent = 50 + (diff * 2);
    return Math.min(Math.max(percent, 0), 100);
  };

  return (
    <Container size="xs" mt="xl" pb="xl">
      <Card shadow="lg" padding="xl" radius="lg" withBorder>
        {/* Header */}
        <Group justify="space-between" mb="lg">
          <Badge
            color={readyState === ReadyState.OPEN ? 'green' : 'red'}
            variant="dot"
          >
            {readyState === ReadyState.OPEN ? 'Backend Ready' : 'Connecting...'}
          </Badge>
          <Text size="xs" c="dimmed">Sample Rate: {sampleRate}Hz</Text>
        </Group>

        {error && <Text c="red" ta="center" mb="md">{error}</Text>}

        {/* --- MAIN GAME DISPLAY --- */}
        <Stack align="center" gap="xl" my="xl" h={200} justify="center">
          {gameState === 'idle' && (
            <Text size="lg" c="dimmed">Select strings below and press Start</Text>
          )}

          {gameState === 'playing' && target && (
            <>
              <Text size="xl" fw={500} c="dimmed">Play on String {target.stringNum}</Text>
              <Title order={1} size="4.5rem" style={{ lineHeight: 1 }}>
                {target.noteName}
              </Title>
              {target.fret === 0 && <Badge size="lg" color="gray">Open String</Badge>}
            </>
          )}

          {gameState === 'success' && target && (
            <>
              <ThemeIcon radius="xl" size={80} color="green">
                <IconCheck size={50} />
              </ThemeIcon>
              <Title order={2} c="green">Correct!</Title>
              <Text c="dimmed">That was {target.noteName}</Text>
            </>
          )}
        </Stack>

        {/* --- TUNING METER --- */}
        {gameState === 'playing' && (
           <Card bg="gray.1" radius="md" p="xs" mb="xl">
             <Group justify="space-between" mb={5}>
                <Text size="xs" fw={700}>♭ Flat</Text>
                <Text size="xs" fw={700} c={Math.abs(getTuningOffset() - 50) < 5 ? 'green' : 'dimmed'}>
                    {detectedFreq > 0 ? `${detectedFreq.toFixed(1)} Hz` : '...'}
                </Text>
                <Text size="xs" fw={700}>Sharp ♯</Text>
             </Group>
             <Progress
                value={getTuningOffset()}
                color={Math.abs(getTuningOffset() - 50) < 5 ? 'green' : 'blue'}
                size="md"
                radius="xl"
             />
           </Card>
        )}

        {/* --- CONTROLS --- */}
        <StringSelector
          selected={activeStrings}
          onChange={setActiveStrings}
          disabled={gameState !== 'idle'}
        />

        <Button
          fullWidth
          size="xl"
          mt="xl"
          color={isListening ? 'red' : 'blue'}
          onClick={toggleGame}
          leftSection={isListening ? <IconMicrophoneOff /> : <IconMicrophone />}
          disabled={readyState !== ReadyState.OPEN}
        >
          {isListening ? 'End Session' : 'Start Practice'}
        </Button>
      </Card>
    </Container>
  );
}

export default App;