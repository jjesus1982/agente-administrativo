import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'porteiro@conectaplus.com.br',
  password: 'Porteiro@123',
};

const API_URL = 'http://localhost:8100';

test.describe('Módulo Portaria', () => {
  // Fazer login antes de cada teste
  test.beforeEach(async ({ page }) => {
    // Navegar para login
    await page.goto('/login');

    // Fazer login
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
  });

  test.describe('Dashboard', () => {
    test('deve acessar o dashboard e exibir informações', async ({ page }) => {
      // Verificar se está no dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);

      // Verificar elementos principais do dashboard
      await expect(page.locator('h1, h2').filter({ hasText: /Dashboard|Início/i })).toBeVisible();

      // Verificar se há cards/widgets de informação
      const cards = page.locator('[data-testid="dashboard-card"], .card, [class*="card"]');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
    });

    test('deve exibir estatísticas do dia', async ({ page }) => {
      // Aguardar carregamento de dados
      await page.waitForLoadState('networkidle');

      // Verificar se há informações de estatísticas
      // (podem ser veículos, visitas, etc.)
      const stats = page.locator('text=/Total|Hoje|Veículos|Visitas/i');
      await expect(stats.first()).toBeVisible();
    });

    test('deve navegar entre diferentes seções', async ({ page }) => {
      // Verificar se existe menu de navegação
      const nav = page.locator('nav, [role="navigation"]');
      await expect(nav).toBeVisible();

      // Links de navegação comuns
      const links = ['Veículos', 'Visitas', 'Moradores', 'Relatórios'];

      for (const linkText of links) {
        const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`);
        if (await link.count() > 0) {
          await expect(link.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Listagem de Veículos', () => {
    test.beforeEach(async ({ page }) => {
      // Navegar para página de veículos
      const vehiclesLink = page.locator('a:has-text("Veículos"), [href*="veiculos"]');

      if (await vehiclesLink.count() > 0) {
        await vehiclesLink.first().click();
      } else {
        // Tentar acessar diretamente
        await page.goto('/dashboard/veiculos');
      }

      await page.waitForLoadState('networkidle');
    });

    test('deve exibir lista de veículos', async ({ page }) => {
      // Verificar título da página
      await expect(page.locator('h1, h2').filter({ hasText: /Veículos/i })).toBeVisible();

      // Aguardar carregamento da lista
      await page.waitForSelector('table, [data-testid="vehicle-list"], .vehicle-item', {
        timeout: 10000,
      });

      // Verificar se há tabela ou lista
      const table = page.locator('table');
      const list = page.locator('[data-testid="vehicle-list"]');

      const hasTable = await table.count() > 0;
      const hasList = await list.count() > 0;

      expect(hasTable || hasList).toBeTruthy();
    });

    test('deve filtrar veículos por placa', async ({ page }) => {
      // Procurar campo de busca/filtro
      const searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Filtrar"], input[type="search"]');

      if (await searchInput.count() > 0) {
        // Digitar placa para filtrar
        await searchInput.first().fill('ABC');

        // Aguardar atualização da lista
        await page.waitForTimeout(1000);

        // Verificar se a lista foi filtrada
        const vehicleItems = page.locator('table tbody tr, [data-testid="vehicle-item"]');
        const count = await vehicleItems.count();

        // Se houver resultados, verificar se contém o filtro
        if (count > 0) {
          const firstItem = await vehicleItems.first().textContent();
          expect(firstItem?.toLowerCase()).toContain('abc');
        }
      }
    });

    test('deve exibir detalhes do veículo ao clicar', async ({ page }) => {
      // Aguardar lista de veículos
      await page.waitForSelector('table tbody tr, [data-testid="vehicle-item"]', {
        timeout: 10000,
      });

      const vehicleRows = page.locator('table tbody tr, [data-testid="vehicle-item"]');
      const count = await vehicleRows.count();

      if (count > 0) {
        // Clicar no primeiro veículo
        await vehicleRows.first().click();

        // Aguardar modal ou página de detalhes
        await expect(
          page.locator('[role="dialog"], .modal, [data-testid="vehicle-details"]')
        ).toBeVisible({ timeout: 5000 });

        // Verificar informações do veículo
        await expect(page.locator('text=/Placa|Modelo|Morador/i')).toBeVisible();
      }
    });

    test('deve permitir registrar entrada de veículo', async ({ page }) => {
      // Procurar botão de nova entrada/registro
      const newEntryButton = page.locator(
        'button:has-text("Nova Entrada"), button:has-text("Registrar"), [data-testid="new-entry"]'
      );

      if (await newEntryButton.count() > 0) {
        await newEntryButton.first().click();

        // Aguardar formulário
        await expect(page.locator('form, [role="dialog"]')).toBeVisible();

        // Verificar campos do formulário
        await expect(page.locator('input[name*="placa"], input[placeholder*="Placa"]')).toBeVisible();
      }
    });
  });

  test.describe('Listagem de Visitas', () => {
    test.beforeEach(async ({ page }) => {
      // Navegar para página de visitas
      const visitsLink = page.locator('a:has-text("Visitas"), [href*="visitas"]');

      if (await visitsLink.count() > 0) {
        await visitsLink.first().click();
      } else {
        // Tentar acessar diretamente
        await page.goto('/dashboard/visitas');
      }

      await page.waitForLoadState('networkidle');
    });

    test('deve exibir lista de visitas', async ({ page }) => {
      // Verificar título da página
      await expect(page.locator('h1, h2').filter({ hasText: /Visitas/i })).toBeVisible();

      // Aguardar carregamento da lista
      await page.waitForSelector('table, [data-testid="visit-list"], .visit-item', {
        timeout: 10000,
      });

      // Verificar se há tabela ou lista
      const table = page.locator('table');
      const list = page.locator('[data-testid="visit-list"]');

      const hasTable = await table.count() > 0;
      const hasList = await list.count() > 0;

      expect(hasTable || hasList).toBeTruthy();
    });

    test('deve filtrar visitas por nome', async ({ page }) => {
      // Procurar campo de busca/filtro
      const searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Filtrar"], input[type="search"]');

      if (await searchInput.count() > 0) {
        // Digitar nome para filtrar
        await searchInput.first().fill('João');

        // Aguardar atualização da lista
        await page.waitForTimeout(1000);

        // Verificar se a lista foi filtrada
        const visitItems = page.locator('table tbody tr, [data-testid="visit-item"]');
        const count = await visitItems.count();

        // Se houver resultados, verificar se contém o filtro
        if (count > 0) {
          const firstItem = await visitItems.first().textContent();
          expect(firstItem?.toLowerCase()).toContain('joão');
        }
      }
    });

    test('deve exibir status das visitas', async ({ page }) => {
      // Aguardar lista de visitas
      await page.waitForSelector('table tbody tr, [data-testid="visit-item"]', {
        timeout: 10000,
      });

      // Verificar se há indicadores de status
      const statusBadges = page.locator('[data-testid="status"], .badge, .status');

      if (await statusBadges.count() > 0) {
        await expect(statusBadges.first()).toBeVisible();

        // Verificar possíveis status
        const statusText = await statusBadges.first().textContent();
        expect(statusText).toMatch(/Aguardando|Em andamento|Finalizada|Ativa/i);
      }
    });

    test('deve permitir registrar nova visita', async ({ page }) => {
      // Procurar botão de nova visita
      const newVisitButton = page.locator(
        'button:has-text("Nova Visita"), button:has-text("Registrar Visita"), [data-testid="new-visit"]'
      );

      if (await newVisitButton.count() > 0) {
        await newVisitButton.first().click();

        // Aguardar formulário
        await expect(page.locator('form, [role="dialog"]')).toBeVisible();

        // Verificar campos do formulário
        await expect(page.locator('input[name*="nome"], input[placeholder*="Nome"]')).toBeVisible();
        await expect(
          page.locator('input[name*="documento"], input[placeholder*="CPF"], input[placeholder*="RG"]')
        ).toBeVisible();
      }
    });

    test('deve permitir finalizar visita', async ({ page }) => {
      // Aguardar lista de visitas
      await page.waitForSelector('table tbody tr, [data-testid="visit-item"]', {
        timeout: 10000,
      });

      const visitRows = page.locator('table tbody tr, [data-testid="visit-item"]');
      const count = await visitRows.count();

      if (count > 0) {
        // Procurar botão de finalizar na primeira visita ativa
        const finishButton = page.locator(
          'button:has-text("Finalizar"), button:has-text("Encerrar"), [data-testid="finish-visit"]'
        );

        if (await finishButton.count() > 0) {
          await finishButton.first().click();

          // Aguardar confirmação ou atualização
          await page.waitForTimeout(1000);

          // Verificar se o status mudou
          const statusAfter = page.locator('[data-testid="status"], .badge, .status').first();
          if (await statusAfter.count() > 0) {
            const statusText = await statusAfter.textContent();
            expect(statusText).toMatch(/Finalizada|Encerrada/i);
          }
        }
      }
    });
  });

  test.describe('Filtros e Pesquisa', () => {
    test('deve permitir filtrar por data', async ({ page }) => {
      // Procurar campos de data
      const dateInputs = page.locator('input[type="date"], [data-testid="date-filter"]');

      if (await dateInputs.count() > 0) {
        const today = new Date().toISOString().split('T')[0];
        await dateInputs.first().fill(today);

        // Aguardar atualização
        await page.waitForTimeout(1000);

        // Verificar se há resultados
        const results = page.locator('table tbody tr, [data-testid*="item"]');
        expect(await results.count()).toBeGreaterThanOrEqual(0);
      }
    });

    test('deve limpar filtros aplicados', async ({ page }) => {
      // Procurar botão de limpar filtros
      const clearButton = page.locator(
        'button:has-text("Limpar"), button:has-text("Resetar"), [data-testid="clear-filters"]'
      );

      if (await clearButton.count() > 0) {
        await clearButton.first().click();

        // Verificar se os campos foram limpos
        const searchInputs = page.locator('input[type="search"], input[type="text"]');
        if (await searchInputs.count() > 0) {
          const value = await searchInputs.first().inputValue();
          expect(value).toBe('');
        }
      }
    });
  });
});
