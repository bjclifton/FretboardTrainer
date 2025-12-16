// src/components/StringSelector.tsx
import { Chip, Group, Text, Stack } from '@mantine/core';

interface StringSelectorProps {
  selected: number[];
  onChange: (val: number[]) => void;
  disabled: boolean;
}

export function StringSelector({ selected, onChange, disabled }: StringSelectorProps) {
  return (
    <Stack gap="xs" align="center">
      <Text size="sm" c="dimmed">Active Strings</Text>
      <Chip.Group multiple value={selected.map(String)} onChange={(val) => onChange(val.map(Number))}>
        <Group justify="center" gap="xs">
          {/* Render in guitar order: High E (1) to Low E (6) or vice versa.
              Let's do Low (6) to High (1) for logical reading */}
          {[6, 5, 4, 3, 2, 1].map((num) => (
            <Chip key={num} value={String(num)} disabled={disabled} color="blue" variant="light">
              {num}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
    </Stack>
  );
}