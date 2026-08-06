import { test, expect } from '@playwright/test';

test.describe('QuickSketch E2E Test Suite', () => {

  // Test 1: Caricamento Home Page e struttura base
  test('1. Home Page si carica correttamente con titolo ed elementi principali', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/QuickSketch/);
    await expect(page.locator('.hero h1')).toContainText('Disegna, Indovina');
    await expect(page.locator('.navbar-brand')).toBeVisible();
    await expect(page.locator('.navbar-links')).toContainText('Home');
    await expect(page.locator('.navbar-links')).toContainText('Classifiche');
    await expect(page.locator('.navbar-user')).toContainText('Accedi');
  });

  // Test 2: Validazione form di registrazione (password non coincidenti)
  test('2. Validazione errore password non coincidenti in registrazione', async ({ page }) => {
    await page.goto('#/auth');
    await page.click('#tab-register');
    
    await page.fill('#reg-username', 'e2e_invalid');
    await page.fill('#reg-email', 'invalid@test.com');
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'differente123');
    
    await page.click('#register-submit');
    await expect(page.locator('#register-error')).toContainText('Le password non coincidono');
  });

  // Test 3: Registrazione primo utente (e2e_artist)
  test('3. Flusso completo di registrazione nuovo utente', async ({ page }) => {
    const timestamp = Date.now();
    const username = `artist_${timestamp}`;
    const email = `artist_${timestamp}@test.com`;

    await page.goto('#/auth');
    await page.click('#tab-register');

    await page.fill('#reg-username', username);
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'password123');

    await page.click('#register-submit');

    await expect(page.locator('.navbar-username')).toContainText(username);
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  // Test 4: Flusso di Logout
  test('4. Flusso di disconnessione utente (Logout)', async ({ page }) => {
    const username = `logout_${Date.now()}`;
    await page.goto('#/auth');
    await page.click('#tab-register');
    await page.fill('#reg-username', username);
    await page.fill('#reg-email', `${username}@test.com`);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'password123');
    await page.click('#register-submit');

    await expect(page.locator('.navbar-username')).toBeVisible();

    // Logout
    await page.click('#btn-logout');
    await expect(page.locator('.navbar-user')).toContainText('Accedi');
  });

  // Test 5: Login con credenziali valide
  test('5. Login con utente esistente', async ({ page }) => {
    const username = `login_user_${Date.now()}`;
    const email = `${username}@test.com`;

    // Registra prima
    await page.goto('#/auth');
    await page.click('#tab-register');
    await page.fill('#reg-username', username);
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'password123');
    await page.click('#register-submit');
    await expect(page.locator('.navbar-username')).toBeVisible();
    
    await page.click('#btn-logout');
    await expect(page.locator('.navbar-user')).toContainText('Accedi');

    // Ora esegui login
    await page.goto('#/auth');
    await page.fill('#login-username', username);
    await page.fill('#login-password', 'password123');
    await page.click('#login-submit');

    await expect(page.locator('.navbar-username')).toContainText(username);
  });

  // Test 6: Pagina Creazione Sketch - Caricamento parole da Wikipedia API / Fallback
  test('6. Pagina Crea Sketch carica le parole casuali da Wikipedia API', async ({ page }) => {
    const username = `creator_${Date.now()}`;
    await page.goto('#/auth');
    await page.click('#tab-register');
    await page.fill('#reg-username', username);
    await page.fill('#reg-email', `${username}@test.com`);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'password123');
    await page.click('#register-submit');

    await expect(page.locator('.nav-btn-create')).toBeVisible();
    await page.click('.nav-btn-create');

    await expect(page.locator('.page-header h1')).toContainText('Crea uno Sketch');
    
    // Attendi caricamento parole
    await page.waitForSelector('.word-option', { timeout: 10000 });
    const wordOptions = page.locator('.word-option');
    await expect(wordOptions).toHaveCount(5);

    // Seleziona la prima parola
    await wordOptions.first().click();
    await expect(wordOptions.first()).toHaveClass(/selected/);
    await expect(page.locator('#btn-start-drawing')).toBeEnabled();
  });

  // Test 7: Creazione e pubblicazione completa di uno sketch su Canvas
  test('7. Disegno su canvas e pubblicazione sketch', async ({ page }) => {
    const username = `artist_main_${Date.now()}`;
    await page.goto('#/auth');
    await page.click('#tab-register');
    await page.fill('#reg-username', username);
    await page.fill('#reg-email', `${username}@test.com`);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'password123');
    await page.click('#register-submit');

    await expect(page.locator('.nav-btn-create')).toBeVisible();
    await page.click('.nav-btn-create');

    await page.waitForSelector('.word-option', { timeout: 10000 });
    await page.locator('.word-option').first().click();
    await page.click('#btn-start-drawing');

    // Verifica la presenza della canvas e del timer
    await expect(page.locator('#draw-canvas')).toBeVisible();
    await expect(page.locator('.timer-display')).toBeVisible();

    // Simula disegno sulla canvas
    const canvas = page.locator('#draw-canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 150);
      await page.mouse.move(box.x + 200, box.y + 80);
      await page.mouse.up();
    }

    // Pubblica sketch
    await page.click('#btn-submit-sketch');

    // Verifica redirect a home e presenza della card sketch
    await page.waitForURL('**/#/home');
    await expect(page.locator('.card-sketch').first()).toBeVisible();
    await expect(page.locator('.card-sketch').first()).toContainText(username);
  });

  // Test 8: Visualizzazione pubblica della galleria senza autenticazione
  test('8. Galleria sketch visibile pubblicamente', async ({ page }) => {
    await page.goto('#/home');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator('#sketches-grid')).toBeVisible();
    await expect(page.locator('.card-sketch').first()).toBeVisible();
  });

  // Test 9: Giocatore invia un tentativo errato su uno sketch
  test('9. Tentativo errato su sketch altrui incrementa il contatore tentativi', async ({ page }) => {
    // 1. Registra primo utente (artista) e crea sketch
    const artistName = `artist_${Date.now()}`;
    await page.goto('#/auth');
    await page.click('#tab-register');
    await page.fill('#reg-username', artistName);
    await page.fill('#reg-email', `${artistName}@test.com`);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'password123');
    await page.click('#register-submit');

    await expect(page.locator('.nav-btn-create')).toBeVisible();
    await page.click('.nav-btn-create');

    await page.waitForSelector('.word-option', { timeout: 10000 });
    await page.locator('.word-option').first().click();
    await page.click('#btn-start-drawing');
    await page.click('#btn-submit-sketch');

    await page.waitForURL('**/#/home');
    await expect(page.locator('.card-sketch').first()).toBeVisible();

    // 2. Disconnetti ed effettua registrazione secondo utente (giocatore)
    await page.click('#btn-logout');
    const guesserName = `guesser_${Date.now()}`;
    await page.goto('#/auth');
    await page.click('#tab-register');
    await page.fill('#reg-username', guesserName);
    await page.fill('#reg-email', `${guesserName}@test.com`);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'password123');
    await page.click('#register-submit');
    await expect(page.locator('.navbar-username')).toContainText(guesserName);

    // 3. Clicca sul primo sketch nella galleria
    await page.locator('.card-sketch').first().click();
    await page.waitForSelector('#guess-input', { timeout: 10000 });

    await page.fill('#guess-input', 'parola_errata_123');
    await page.click('#guess-submit');

    // Verifica messaggio di tentativo errato e conteggio
    await expect(page.locator('#guess-message')).toContainText('9 tentativi rimasti');
    await expect(page.locator('.guess-list')).toContainText('parola_errata_123');
  });

  // Test 10: Giocatore indovina la parola corretta su uno sketch
  test('10. Tentativo corretto rivela la soluzione e mostra messaggio di successo', async ({ page }) => {
    // 1. Registra artista e crea sketch
    const artistName = `artist_correct_${Date.now()}`;
    await page.goto('#/auth');
    await page.click('#tab-register');
    await page.fill('#reg-username', artistName);
    await page.fill('#reg-email', `${artistName}@test.com`);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'password123');
    await page.click('#register-submit');

    await expect(page.locator('.nav-btn-create')).toBeVisible();
    await page.click('.nav-btn-create');

    await page.waitForSelector('.word-option', { timeout: 10000 });
    const selectedWord = await page.locator('.word-option').first().textContent();
    await page.locator('.word-option').first().click();
    await page.click('#btn-start-drawing');
    await page.click('#btn-submit-sketch');

    await page.waitForURL('**/#/home');

    // 2. Logout e Registra giocatore
    await page.click('#btn-logout');
    const guesserName = `guesser_correct_${Date.now()}`;
    await page.goto('#/auth');
    await page.click('#tab-register');
    await page.fill('#reg-username', guesserName);
    await page.fill('#reg-email', `${guesserName}@test.com`);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'password123');
    await page.click('#register-submit');
    await expect(page.locator('.navbar-username')).toContainText(guesserName);

    // 3. Gioca il primo sketch
    await page.locator('.card-sketch').first().click();
    await page.waitForSelector('#guess-input', { timeout: 10000 });
    await page.fill('#guess-input', selectedWord.trim());
    await page.click('#guess-submit');

    // Verifica stato indovinato
    await expect(page.locator('#guess-panel')).toContainText('Hai indovinato!');
    await expect(page.locator('#guess-panel')).toContainText(selectedWord.trim().toLowerCase());
  });

  // Test 11: Pagina Classifiche (Artisti e Giocatori)
  test('11. Navigazione e visualizzazione classifiche Artisti e Giocatori', async ({ page }) => {
    await page.goto('#/leaderboard');
    await expect(page.locator('.page-header h1')).toContainText('Classifiche');
    await expect(page.locator('#tab-artists')).toHaveClass(/active/);
    await expect(page.locator('.leaderboard-table')).toBeVisible();

    // Passa alla tab Giocatori
    await page.click('#tab-guessers');
    await expect(page.locator('#tab-guessers')).toHaveClass(/active/);
    await expect(page.locator('.leaderboard-table')).toBeVisible();
  });

  // Test 12: Pagina Profilo e Statistiche utente
  test('12. Visualizzazione profilo utente con statistiche', async ({ page }) => {
    const username = `profile_user_${Date.now()}`;
    await page.goto('#/auth');
    await page.click('#tab-register');
    await page.fill('#reg-username', username);
    await page.fill('#reg-email', `${username}@test.com`);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-password-confirm', 'password123');
    await page.click('#register-submit');
    await expect(page.locator('.navbar-username')).toContainText(username);

    await page.click('.navbar-username');
    await expect(page.locator('.page-header h1')).toContainText('Il Mio Profilo');
    await expect(page.locator('#stats-content')).toContainText('Come Artista');
    await expect(page.locator('#stats-content')).toContainText('Come Giocatore');
    await expect(page.locator('#stats-content')).toContainText('Sketch Creati');
    await expect(page.locator('#stats-content')).toContainText('Parole Indovinate');
  });

});
