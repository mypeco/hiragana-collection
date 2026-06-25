import { useState } from 'react';
import { db } from './lib/db';
import { ProfileSelect } from './screens/ProfileSelect';
import { WarmupScreen } from './screens/WarmupScreen';
import { MainApp } from './screens/MainApp';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showWarmup, setShowWarmup] = useState(false);
  const [warmupHand, setWarmupHand] = useState('right');

  const handleSelectUser = async (user) => {
    const saved = await db.settings.get(user.id);
    const warmupEnabled = saved?.warmupEnabled !== false;
    setWarmupHand(saved?.hand || 'right');
    setCurrentUser(user);
    if (warmupEnabled) setShowWarmup(true);
  };

  if (!currentUser) return <ProfileSelect onSelect={handleSelectUser} />;
  if (showWarmup) return <WarmupScreen hand={warmupHand} bgColor="#fdfbf7" onComplete={() => setShowWarmup(false)} />;
  return <MainApp currentUser={currentUser} onLogout={() => setCurrentUser(null)} />;
}
