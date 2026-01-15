import { useState } from 'react';
import { Card, Select, SegmentedControl, Text, Stack, Group, Badge } from '@mantine/core';
import { Fretboard } from './Fretboard';
import type { TriadType, StringSet, Inversion } from '../utils/triadLogic';
import { getTriadNotes } from '../utils/triadLogic';

export function TriadExplorer() {
  const [root, setRoot] = useState<string>('C');
  const [type, setType] = useState<TriadType>('Major');
  const [stringSet, setStringSet] = useState<StringSet>('5-4-3');
  const [inversion, setInversion] = useState<Inversion>('Root Position');

  // 1. Calculate notes
  const logicalRoot = root.split('/')[0];
  const currentNotes = getTriadNotes(logicalRoot, type, stringSet, inversion);

  // 2. Determine necessary length (min 12, max whatever the chord needs)
  const maxChordFret = Math.max(0, ...currentNotes.map(n => n.fret));

  // If chord goes to 13, show 13. If it stays at 3, show 12 (standard view).
  const dynamicFretCount = Math.max(12, maxChordFret);
  return (
    <Stack gap="lg">
      <Group grow align="flex-start">
        <Select
            label="Root Note"
            data={['A', 'A#/Bb', 'B', 'C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab']}
            value={root}
            onChange={(v) => setRoot(v || 'C')}
        />
        <Select
            label="String Set"
            data={['6-5-4', '5-4-3', '4-3-2', '3-2-1']}
            value={stringSet}
            onChange={(v) => setStringSet(v as StringSet || '5-4-3')}
        />
      </Group>

      <SegmentedControl
        fullWidth
        value={type}
        onChange={(v) => setType(v as TriadType)}
        data={[
            { label: 'Major', value: 'Major' },
            { label: 'Minor', value: 'Minor' },
        ]}
      />

       <SegmentedControl
        fullWidth
        value={inversion}
        onChange={(v) => setInversion(v as Inversion)}
        data={['Root Position', '1st Inversion', '2nd Inversion']}
        mt="md"
      />

     <Card withBorder padding="lg" radius="md" w="100%">
        <Stack align="center" mb="md">
            <Text fw={700} size="xl">{root} {type} Triad</Text>
            <Badge variant="light" color="gray">{stringSet} String Set</Badge>
        </Stack>

        <Fretboard
            highlightedNotes={currentNotes}
            activeStrings={[1,2,3,4,5,6]}
            totalFrets={dynamicFretCount} // <--- Pass it here
        />

        <Group justify="center" mt="md" gap="xl">
            <Group gap={5}><Badge circle color="#fa5252">R</Badge><Text size="sm">Root</Text></Group>
            <Group gap={5}><Badge circle color="#228be6">3</Badge><Text size="sm">3rd</Text></Group>
            <Group gap={5}><Badge circle color="#40c057">5</Badge><Text size="sm">5th</Text></Group>
        </Group>
      </Card>
    </Stack>
  );
}