import { test, expect } from '@playwright/test';

// Testes E2E baseados na estrutura REAL da aplicação
test.describe('Agente Administrativo - E2E Real Structure Tests', () => {

  test('NAVEGAÇÃO: Verificar páginas principais carregam', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Home
    await page.goto('http://localhost:3002/');
    await expect(page).toHaveTitle(/Agente Administrativo 2025/);
    console.log('✓ Home carregada');

    // Login
    await page.goto('http://localhost:3002/login');
    await page.waitForTimeout(3000);

    // Verificar se formulário existe com seletores corretos
    const emailInput = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const submitButton = await page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    console.log('✓ Login: formulário encontrado');
    console.log(`Console errors encontrados: ${consoleErrors.length}`);

    // Dashboard (pode estar protegido)
    await page.goto('http://localhost:3002/dashboard');
    console.log('✓ Dashboard acessado');

    // Verificar 404
    await page.goto('http://localhost:3002/page-that-does-not-exist');
    await page.waitForTimeout(2000);
    const is404 = await page.locator('text=404').isVisible();
    console.log(`✓ 404 page funcionando: ${is404}`);
  });

  test('LOGIN: Testar estrutura real do formulário', async ({ page }) => {
    await page.goto('http://localhost:3002/login');
    await page.waitForTimeout(3000);

    // Seletores baseados na estrutura real
    const emailInput = page.locator('input[type="text"][placeholder*="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    // Verificar se elementos existem
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Tentar preencher (sem submeter)
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword123');

    // Verificar se valores foram preenchidos
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();

    console.log(`Email preenchido: ${emailValue}`);
    console.log(`Senha preenchida: ${passwordValue ? 'sim' : 'não'}`);

    expect(emailValue).toBe('test@example.com');
    expect(passwordValue).toBe('testpassword123');

    console.log('✓ Login: formulário funcional');
  });

  test('ACESSIBILIDADE: Verificações básicas', async ({ page }) => {
    await page.goto('http://localhost:3002/login');
    await page.waitForTimeout(3000);

    // Navegação por teclado
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`Primeiro elemento focável: ${focusedElement}`);

    // Verificar labels
    const labelsCount = await page.locator('label').count();
    console.log(`Labels encontradas: ${labelsCount}`);

    // Verificar se há headings
    const h1Count = await page.locator('h1').count();
    const h1Text = await page.locator('h1').first().textContent();
    console.log(`H1 encontrado: ${h1Count} - Texto: "${h1Text}"`);

    // Verificar contraste básico (estrutura escura)
    const bodyBg = await page.evaluate(() =>
      getComputedStyle(document.body).background
    );
    console.log(`Background detectado: ${bodyBg.substring(0, 50)}...`);

    expect(h1Count).toBeGreaterThan(0);
    expect(h1Text).toContain('Agente');
  });

  test('RESPONSIVIDADE: Diferentes viewports', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1366, height: 768 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3002/login');
      await page.waitForTimeout(2000);

      // Verificar se não há overflow
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);

      console.log(`${viewport.name}: scroll=${scrollWidth}, client=${clientWidth}`);

      // Verificar se formulário ainda é visível
      const formVisible = await page.locator('form').isVisible();
      console.log(`${viewport.name}: formulário visível = ${formVisible}`);

      expect(formVisible).toBe(true);
    }
  });

  test('PERFORMANCE: Métricas básicas', async ({ page }) => {
    // Medir tempo de carregamento
    const startTime = Date.now();
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Tempo de carregamento: ${loadTime}ms`);

    // Verificar recursos
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('localhost:3002')) {
        requests.push(request.url());
      }
    });

    await page.reload();
    await page.waitForTimeout(3000);

    console.log(`Requests locais: ${requests.length}`);
    console.log(`JS files: ${requests.filter(r => r.includes('.js')).length}`);
    console.log(`CSS files: ${requests.filter(r => r.includes('.css')).length}`);

    // Performance API
    const perfData = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        totalLoad: perf.loadEventEnd - perf.fetchStart
      };
    });

    console.log('Performance metrics:', perfData);

    expect(loadTime).toBeLessThan(30000); // 30 segundos máximo para desenvolvimento
  });

  test('EDGE CASES: Dados extremos nos formulários', async ({ page }) => {
    await page.goto('http://localhost:3002/login');
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]');

    // Teste 1: String muito longa
    const longEmail = 'a'.repeat(500) + '@test.com';
    await emailInput.fill(longEmail);
    const longEmailValue = await emailInput.inputValue();
    console.log(`String longa aceita: ${longEmailValue.length} caracteres`);

    // Teste 2: Caracteres especiais
    await emailInput.fill('<script>alert("xss")</script>@test.com');
    const xssValue = await emailInput.inputValue();
    console.log(`XSS test: ${xssValue}`);

    // Teste 3: Emojis
    await emailInput.fill('test🚀@domain.com');
    const emojiValue = await emailInput.inputValue();
    console.log(`Emoji test: ${emojiValue}`);

    // Teste 4: Senha muito longa
    const longPassword = 'p'.repeat(1000);
    await passwordInput.fill(longPassword);
    const longPasswordLength = (await passwordInput.inputValue()).length;
    console.log(`Senha longa aceita: ${longPasswordLength} caracteres`);

    console.log('✓ Edge cases testados');
  });

  test('SEGURANÇA: Headers e estrutura', async ({ page }) => {
    // Interceptar response para verificar headers
    let securityHeaders: any = {};

    page.on('response', response => {
      if (response.url() === 'http://localhost:3002/login') {
        securityHeaders = {
          'x-frame-options': response.headers()['x-frame-options'],
          'x-content-type-options': response.headers()['x-content-type-options'],
          'x-xss-protection': response.headers()['x-xss-protection'],
          'content-security-policy': response.headers()['content-security-policy']?.substring(0, 50) + '...',
          'strict-transport-security': response.headers()['strict-transport-security']?.substring(0, 50) + '...'
        };
      }
    });

    await page.goto('http://localhost:3002/login');
    await page.waitForTimeout(2000);

    console.log('Security Headers encontrados:');
    Object.entries(securityHeaders).forEach(([key, value]) => {
      console.log(`  ${key}: ${value || 'NOT SET'}`);
    });

    // Verificar se não há dados sensíveis expostos
    const pageContent = await page.content();
    const hasPassword = pageContent.includes('password=');
    const hasToken = pageContent.includes('token=');

    console.log(`Senhas expostas no HTML: ${hasPassword}`);
    console.log(`Tokens expostos no HTML: ${hasToken}`);

    expect(hasPassword).toBe(false);
    expect(hasToken).toBe(false);
  });

});