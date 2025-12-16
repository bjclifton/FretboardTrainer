import { Button, Container, Title, Text, Progress, Card, Group } from '@mantine/core';
import { useAudioCapture } from './audio/useAudioCapture';

function App() {
  // Logic to handle the raw data (Phase 2 will be WebSocket sending)
  const handleAudioData = (_data: Float32Array) => {
    // For now, just prove we are getting data
    // console.log("Received chunk of size:", data.length);
  };

  const { isListening, volume, error, startCapture, stopCapture } = useAudioCapture({
    onAudioData: handleAudioData
  });

  return (
    <Container size="sm" mt="xl">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} mb="md">Fretboard Audio Test</Title>

        {error && <Text c="red" mb="md">{error}</Text>}

        <Group justify="center" mb="xl">
          {!isListening ? (
            <Button size="lg" color="blue" onClick={startCapture}>
              Start Microphone
            </Button>
          ) : (
            <Button size="lg" color="red" onClick={stopCapture}>
              Stop
            </Button>
          )}
        </Group>

        <Text size="sm" mb={5}>Microphone Input Level</Text>
        <Progress
          value={volume * 100}
          color={volume > 0.8 ? 'red' : 'green'}
          size="xl"
          transitionDuration={50} // fast updates
        />

        {isListening && (
          <Text size="xs" c="dimmed" mt="md" ta="center">
            Microphone active. Check console for data logs.
          </Text>
        )}
      </Card>
    </Container>
  );
}

export default App;