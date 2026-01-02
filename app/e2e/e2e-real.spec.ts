import { test, expect } from '@playwright/test';

// Testes E2E baseados na estrutura REAL da aplicação
test.describe('Agente Administrativo - E2E Comprehensive Tests', () => {

  test('NAVEGAÇÃO: Verificar páginas principais', async ({ page }) => {
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

    const emailInput = await page.locator('input[type="text"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const submitButton = await page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    console.log('✓ Login: formulário encontrado');

    console.log(`Console errors: ${consoleErrors.length}`);
  });

  test('FORMULÁRIO LOGIN: Testes funcionais', async ({ page }) => {
    await page.goto('http://localhost:3002/login');
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]');

    // Testar preenchimento
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpass123');

    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();

    expect(emailValue).toBe('test@example.com');
    expect(passwordValue).toBe('testpass123');
    console.log('✓ Formulário aceita input');
  });

  test('RESPONSIVIDADE: Mobile, tablet, desktop', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1366, height: 768 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3002/login');
      await page.waitForTimeout(2000);

      const formVisible = await page.locator('form').isVisible();
      console.log(`${viewport.name}: formulário visível = ${formVisible}`);
      expect(formVisible).toBe(true);
    }
  });

  test('PERFORMANCE: Tempos de carregamento', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Tempo de carregamento: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(30000);
  });

});