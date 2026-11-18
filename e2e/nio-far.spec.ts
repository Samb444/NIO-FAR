import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Parcours de bout en bout NIO FAR (Étape 4) :
 * « signaler par la voix → code de suivi → voir sur la carte → admin transmet →
 *   résolution avec preuve → l'habitant confirme → indicateurs mis à jour »
 * + Audit d'accessibilité axe-core (WCAG AA).
 */
test.describe('NIO FAR — Parcours citoyen complet de bout en bout & Accessibilité', () => {
  test('signaler par la voix → code de suivi → voir sur la carte → admin transmet → résolution avec preuve → l’habitant confirme → indicateurs mis à jour', async ({
    page,
    request,
  }) => {
    // 0. Audit d'accessibilité axe sur la page d'accueil
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Les problèmes/i })).toBeVisible();
    const axeHome = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(axeHome.violations).toEqual([]);

    // Lire les indicateurs initiaux avant notre signalement
    const statsAvantRes = await request.get('/api/public/stats');
    expect(statsAvantRes.ok()).toBeTruthy();
    const statsAvant = await statsAvantRes.json();

    // 1. SIGNALER PAR LA VOIX (/signaler)
    await page.goto('/signaler');
    await expect(page.getByRole('heading', { name: 'Signaler un problème' })).toBeVisible();

    // Étape 1 : Choix de la catégorie « Eau stagnante »
    await page.getByRole('button', { name: /Eau stagnante/i }).click();

    // Étape 2 : Enregistrement d'une note vocale (via le flux micro simulé de Chrome)
    const btnMicro = page.getByRole('button', { name: /Enregistrer une note vocale/i });
    await expect(btnMicro).toBeVisible();
    await btnMicro.click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /Arrêter l’enregistrement/i }).click();
    await expect(page.getByText(/Note vocale prête/i)).toBeVisible();

    // Ajout d'une précision texte en complément de la voix
    await page
      .getByLabel(/Description/i)
      .fill('Test E2E vocal : caniveau débordant devant le dispensaire de Malika');
    await page.getByRole('button', { name: /Continuer/i }).click();

    // Étape 3 : Choix du secteur (« Malika », sans doublon existant)
    await page.getByLabel(/Secteur/i).selectOption('Malika');
    await page.getByRole('button', { name: /Dangereux/i }).click();
    await page.getByRole('button', { name: /Continuer/i }).click();

    // Étape 4 : Récapitulatif et Envoi
    await expect(page.getByText(/Note vocale jointe/i)).toBeVisible();
    await page.getByRole('button', { name: /^Envoyer$/i }).click();

    // Si la modale de doublon apparaît, cliquer sur « créer un signalement »
    const btnCreerMemeSiDoublon = page.getByRole('button', {
      name: /Non, c’est un autre problème : créer un signalement/i,
    });
    const titreRecu = page.getByRole('heading', { name: /Merci, signalement reçu/i });
    const resultat = await Promise.race([
      btnCreerMemeSiDoublon.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'doublon' as const),
      titreRecu.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'recu' as const),
    ]);
    if (resultat === 'doublon') {
      await btnCreerMemeSiDoublon.click();
    }

    // 2. OBTENIR LE CODE DE SUIVI (NF-XXXXX)
    await expect(titreRecu).toBeVisible();
    const codeElement = page.locator('p.font-mono', { hasText: /^NF-[A-Z0-9]{5}$/ });
    await expect(codeElement).toBeVisible();
    const codeSuivi = (await codeElement.textContent())?.trim() || '';
    expect(codeSuivi).toMatch(/^NF-[A-Z0-9]{5}$/);

    // 3. VOIR SUR LA CARTE & LISTE (/signalements)
    await page.goto('/signalements');
    await expect(page.getByRole('heading', { name: /Les signalements/i })).toBeVisible();
    await page.getByRole('tab', { name: /Liste/i }).click();
    await expect(page.getByText(codeSuivi).first()).toBeVisible();

    // Récupérer l'identifiant du signalement via l'API de suivi par code
    const trackRes = await request.get(`/api/reports/track/${codeSuivi}`);
    expect(trackRes.ok()).toBeTruthy();
    const reportCree = await trackRes.json();
    const reportId = reportCree.id as string;

    // 4. ADMIN TRANSMET (/admin)
    await page.goto('/admin');
    const btnLogin = page.getByRole('button', { name: /Se connecter/i });
    await expect(btnLogin).toBeVisible();
    await btnLogin.click();
    await expect(page.getByRole('heading', { name: /Administration NIO FAR/i })).toBeVisible();

    // Sélectionner le signalement créé dans la file de priorisation
    await page.getByText(codeSuivi).first().click();

    // Passer le statut à « Transmis » avec l'acteur compétent suggéré (ONAS)
    await page.getByLabel(/Statut du signalement/i).selectOption('transmis');
    await expect(page.getByLabel(/Acteur compétent/i)).toHaveValue(/ONAS/i);
    await page
      .getByLabel(/Ajouter une note au journal de suivi/i)
      .fill('Transmis à l’ONAS après écoute de la note vocale.');
    await page.getByRole('button', { name: /Enregistrer les modifications/i }).click();
    await expect(page.getByText(/Modifications enregistrées avec succès/i)).toBeVisible();

    // 5. RÉSOLUTION AVEC PREUVE (Photo « après »)
    const svgPreuveApres =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#0B6B4F"/></svg>',
      );
    // Passage à « Résolu » avec photo « après » via la session admin active
    await page.evaluate(
      async ({ id, photoApres }) => {
        const m = document.cookie.match(/(?:^|;\s*)niofar_csrf=([^;]+)/);
        const csrf = m ? decodeURIComponent(m[1]) : '';
        const res = await fetch(`/api/admin/reports/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrf,
          },
          body: JSON.stringify({
            statut: 'resolu',
            photoApres,
            note: 'Curage terminé avec photo après intervention.',
          }),
        });
        if (!res.ok) throw new Error('Échec passage résolu');
      },
      { id: reportId, photoApres: svgPreuveApres },
    );

    // 6. L'HABITANT CONFIRME LA RÉSOLUTION (/signalements/:id)
    await page.goto(`/signalements/${reportId}`);
    await expect(page.getByRole('heading', { name: /Le problème est-il vraiment réglé/i })).toBeVisible();
    await expect(page.getByAltText(/Photo après intervention/i)).toBeVisible();
    await page.getByRole('button', { name: /Oui, réglé/i }).click();
    await expect(
      page.getByText(/Merci, votre réponse a bien été enregistrée/i),
    ).toBeVisible();

    // 7. INDICATEURS DE TRANSPARENCE & CARTE « POINTS NOIRS » MIS À JOUR (/transparence)
    await page.goto('/transparence');
    await expect(page.getByRole('heading', { name: /Transparence & Open Data/i })).toBeVisible();
    await expect(
      page.getByText(/Indicatif, basé sur les données de NIO FAR/i),
    ).toBeVisible();

    const statsApresRes = await request.get('/api/public/stats');
    const statsApres = await statsApresRes.json();
    expect(statsApres.total).toBeGreaterThanOrEqual(statsAvant.total + 1);
    expect(statsApres.resolusVerifies).toBeGreaterThanOrEqual(statsAvant.resolusVerifies + 1);
    expect(statsApres.resolusConfirmes).toBeGreaterThanOrEqual(statsAvant.resolusConfirmes + 1);
  });
});
