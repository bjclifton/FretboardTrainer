// src/App.tsx
import { Container, Title, Tabs } from '@mantine/core'; // Added useState here
import { PitchTrainer } from './components/PitchTrainer';
import { TriadExplorer } from './components/TriadExplorer';
import { IconMicrophone, IconMusic, IconSchool } from '@tabler/icons-react'; // Added IconMicrophone
import { useState } from 'react';
import { TriadTrainer } from './components/TriadTrainer'; // NEW IMPORT

function App() {
  const [activeTab, setActiveTab] = useState<string | null>('trainer');

  return (
    <Container size="xl" mt="xl" pb="xl">
        <Title order={1} ta="center" mb="xl">Guitar Utils</Title>

        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
            <Tabs.List grow mb="md">
                <Tabs.Tab value="trainer" leftSection={<IconMusic size={18}/>}>
                    Pitch Trainer
                </Tabs.Tab>
                <Tabs.Tab value="triads" leftSection={<IconSchool size={18}/>}>
                    Triad Explorer
                </Tabs.Tab>
                {/* NEW TAB */}
                <Tabs.Tab value="triad-game" leftSection={<IconMicrophone size={18}/>}>
                    Triad Game
                </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="trainer">
                <PitchTrainer />
            </Tabs.Panel>

            <Tabs.Panel value="triads">
                <TriadExplorer />
            </Tabs.Panel>

            {/* NEW PANEL */}
            <Tabs.Panel value="triad-game">
                <TriadTrainer />
            </Tabs.Panel>
        </Tabs>
    </Container>
  );
}

export default App;