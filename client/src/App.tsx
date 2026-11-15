import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './lib/theme';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollManager } from './components/ScrollManager';
import Home from './pages/Home';
import { ComingSoon } from './pages/ComingSoon';

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <ScrollManager />
          <Header />
          <main id="contenu" tabIndex={-1} className="outline-none">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/signaler"
                element={
                  <ComingSoon
                    title="Signaler un problème"
                    description="Bientôt : prenez une photo, choisissez une catégorie et la position sera ajoutée à votre signalement."
                  />
                }
              />
              <Route
                path="/signalements"
                element={
                  <ComingSoon
                    title="Les signalements"
                    description="Bientôt : une carte et une liste des signalements du quartier, avec leur statut vérifié."
                  />
                }
              />
              <Route
                path="*"
                element={<ComingSoon title="Page introuvable" description="Cette adresse ne correspond à aucune page de NIO FAR." />}
              />
            </Routes>
          </main>
          <Footer />
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  );
}
