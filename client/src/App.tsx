import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './lib/theme';
import { HorsLigneProvider } from './lib/offline';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { ScrollManager } from './components/ScrollManager';
import { Squelette } from './components/ui';
import Home from './pages/Home';
import Signaler from './pages/Signaler';
import Suivre from './pages/Suivre';
import Signalements from './pages/Signalements';
import FicheSignalement from './pages/FicheSignalement';
import { ComingSoon } from './pages/ComingSoon';

const Transparence = lazy(() => import('./pages/Transparence'));
const Admin = lazy(() => import('./pages/Admin'));

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
              <Suspense
                fallback={
                  <div className="mx-auto max-w-6xl px-4 pt-28">
                    <Squelette className="h-72 w-full" />
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/signaler" element={<Signaler />} />
                  <Route path="/suivre" element={<Suivre />} />
                  <Route path="/signalements" element={<Signalements />} />
                  <Route path="/signalements/:id" element={<FicheSignalement />} />
                  <Route path="/transparence" element={<Transparence />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route
                    path="*"
                    element={<ComingSoon title="Page introuvable" description="Cette adresse ne correspond à aucune page de NIO FAR." />}
                  />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <BottomNav />
          </BrowserRouter>
        </MotionConfig>
      </HorsLigneProvider>
    </ThemeProvider>
  );
}
