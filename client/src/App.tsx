import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { ThemeProvider } from './lib/theme';
import { HorsLigneProvider } from './lib/offline';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { ScrollManager } from './components/ScrollManager';
import { DemoTour } from './components/DemoTour';
import { EcranChargementLogo } from './components/ui';
import Home from './pages/Home';

const Signaler = lazy(() => import('./pages/Signaler'));
const Suivre = lazy(() => import('./pages/Suivre'));
const Signalements = lazy(() => import('./pages/Signalements'));
const FicheSignalement = lazy(() => import('./pages/FicheSignalement'));
const PointsCitoyens = lazy(() => import('./pages/PointsCitoyens'));
const Transparence = lazy(() => import('./pages/Transparence'));
const Admin = lazy(() => import('./pages/Admin'));
const ComingSoon = lazy(() =>
  import('./pages/ComingSoon').then((m) => ({ default: m.ComingSoon })),
);

function RoutesAnimees() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <Suspense fallback={<EcranChargementLogo />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/signaler" element={<Signaler />} />
            <Route path="/suivre" element={<Suivre />} />
            <Route path="/signalements" element={<Signalements />} />
            <Route path="/signalements/:id" element={<FicheSignalement />} />
            <Route path="/points" element={<PointsCitoyens />} />
            <Route path="/transparence" element={<Transparence />} />
            <Route path="/admin" element={<Admin />} />
            <Route
              path="*"
              element={
                <ComingSoon
                  title="Page introuvable"
                  description="Cette adresse ne correspond à aucune page de NIO FAR."
                />
              }
            />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

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
              <RoutesAnimees />
            </main>
            <DemoTour />
            <Footer />
            <BottomNav />
          </BrowserRouter>
        </MotionConfig>
      </HorsLigneProvider>
    </ThemeProvider>
  );
}
