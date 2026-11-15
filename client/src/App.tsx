import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './lib/theme';
import { HorsLigneProvider } from './lib/offline';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { ScrollManager } from './components/ScrollManager';
import Home from './pages/Home';
import Signaler from './pages/Signaler';
import Suivre from './pages/Suivre';
import Signalements from './pages/Signalements';
import FicheSignalement from './pages/FicheSignalement';
import { ComingSoon } from './pages/ComingSoon';

export default function App() {
  return (
    <ThemeProvider>
      <HorsLigneProvider>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <ScrollManager />
            <OfflineBanner />
            <Header />
            <main id="contenu" tabIndex={-1} className="outline-none">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/signaler" element={<Signaler />} />
                <Route path="/suivre" element={<Suivre />} />
                <Route path="/signalements" element={<Signalements />} />
                <Route path="/signalements/:id" element={<FicheSignalement />} />
                <Route
                  path="*"
                  element={<ComingSoon title="Page introuvable" description="Cette adresse ne correspond à aucune page de NIO FAR." />}
                />
              </Routes>
            </main>
            <Footer />
            <BottomNav />
          </BrowserRouter>
        </MotionConfig>
      </HorsLigneProvider>
    </ThemeProvider>
  );
}
