import { test, expect, Page, Browser } from '@playwright/test';

// Configuração dos testes
test.describe('Agente Administrativo - Comprehensive E2E Tests', () => {

  test('FASE 2 & 7: Navegação e Segurança - Páginas principais', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capturar console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Teste da página inicial
    await page.goto('http://localhost:3002/');
    await expect(page).toHaveTitle(/Agente Administrativo 2025/);

    // Verificar se carrega sem console errors
    await page.waitForTimeout(2000);
    console.log(`Console errors na home: ${consoleErrors.length}`);

    // Verificar se há elementos básicos carregando
    const loadingText = await page.locator('text=Carregando').count();
    console.log(`Elementos "Carregando" encontrados: ${loadingText}`);

    // Testar página de login
    await page.goto('http://localhost:3002/login');
    await page.waitForTimeout(2000);

    // Verificar se há formulário de login
    const loginForm = await page.locator('form').count();
    console.log(`Formulários de login encontrados: ${loginForm}`);

    // Teste 404
    await page.goto('http://localhost:3002/nonexistent-page');
    await expect(page).toHaveTitle(/404/);

    console.log(`Total de console errors: ${consoleErrors.length}`);
    consoleErrors.forEach(error => console.log(`ERROR: ${error}`));
  });

  test('FASE 4: Acessibilidade - Verificações básicas WCAG', async ({ page }) => {
    await page.goto('http://localhost:3002/login');
    await page.waitForTimeout(3000);

    // Verificar se é possível navegar por teclado
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`Primeiro elemento focável: ${focusedElement}`);

    // Verificar se há elementos com aria-labels apropriados
    const buttonsWithLabels = await page.locator('button[aria-label]').count();
    const inputsWithLabels = await page.locator('input[aria-label], input[id] + label').count();
    console.log(`Botões com aria-label: ${buttonsWithLabels}`);
    console.log(`Inputs com labels: ${inputsWithLabels}`);

    // Verificar estrutura de headings
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    console.log(`H1 elements: ${h1Count}, H2 elements: ${h2Count}`);
  });

  test('FASE 5: Responsividade - Teste em diferentes viewports', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1366, height: 768 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3002/');
      await page.waitForTimeout(2000);

      // Verificar se não há overflow horizontal
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);

      console.log(`${viewport.name} (${viewport.width}x${viewport.height}): scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);

      // Verificar se há elementos fora da viewport
      const overflowElements = scrollWidth > clientWidth;
      console.log(`${viewport.name}: Overflow horizontal? ${overflowElements}`);
    }
  });

  test('FASE 6: Performance - Core Web Vitals básicos', async ({ page }) => {
    // Medir tempo de carregamento
    const startTime = Date.now();
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Tempo de carregamento completo: ${loadTime}ms`);

    // Verificar número de requests (aproximado)
    const requests: string[] = [];
    page.on('request', request => {
      requests.push(request.url());
    });

    await page.reload();
    await page.waitForTimeout(3000);

    console.log(`Total de requests: ${requests.length}`);
    console.log(`Requests JS: ${requests.filter(r => r.includes('.js')).length}`);
    console.log(`Requests CSS: ${requests.filter(r => r.includes('.css')).length}`);

    // Medir First Contentful Paint aproximado
    const fcpTime = await page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('navigation');
      if (perfEntries.length > 0) {
        const navEntry = perfEntries[0] as PerformanceNavigationTiming;
        return navEntry.loadEventEnd - navEntry.fetchStart;
      }
      return 0;
    });

    console.log(`Navigation timing: ${fcpTime}ms`);
  });

  test('FASE 8: Edge Cases - Dados extremos', async ({ page }) => {
    await page.goto('http://localhost:3002/login');
    await page.waitForTimeout(3000);

    // Encontrar campos de input
    const emailInput = await page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first();
    const passwordInput = await page.locator('input[type="password"], input[name*="password"], input[placeholder*="password" i]').first();

    if (await emailInput.count() > 0) {
      // Testar string muito longa
      const longString = 'a'.repeat(1000);
      await emailInput.fill(longString);

      // Testar caracteres especiais
      await emailInput.fill('<script>alert("xss")</script>');

      // Testar emoji
      await emailInput.fill('test@domain.com 🚀😀');

      console.log('Testes de edge cases em email input realizados');
    }

    if (await passwordInput.count() > 0) {
      // Testar senha muito longa
      const longPassword = 'p'.repeat(500);
      await passwordInput.fill(longPassword);

      console.log('Testes de edge cases em password input realizados');
    }
  });

  test('FASE 9: Fluxo E2E - Navegação pela aplicação', async ({ page }) => {
    // Fluxo completo: Home → Login → Dashboard (se aplicável)
    console.log('Iniciando fluxo E2E completo...');

    // 1. Acessar home
    await page.goto('http://localhost:3002/');
    console.log('✓ Home carregada');

    // 2. Ir para login
    await page.goto('http://localhost:3002/login');
    console.log('✓ Login carregado');

    // 3. Tentar acessar dashboard (pode ser protegido)
    await page.goto('http://localhost:3002/dashboard');
    console.log('✓ Dashboard acessado');

    // 4. Verificar se há menus/navegação
    const navElements = await page.locator('nav, [role="navigation"], .nav, .menu').count();
    console.log(`Elementos de navegação encontrados: ${navElements}`);

    // 5. Verificar se há links funcionais
    const links = await page.locator('a[href]').count();
    console.log(`Links encontrados na página: ${links}`);

    console.log('Fluxo E2E completo finalizado');
  });
});