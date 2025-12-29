import { Page, expect } from '@playwright/test';

/**
 * Credenciais de teste padrão
 */
export const TEST_CREDENTIALS = {
  email: 'porteiro@conectaplus.com.br',
  password: 'Porteiro@123',
};

/**
 * URLs da aplicação
 */
export const URLS = {
  api: 'http://localhost:8100',
  frontend: 'http://localhost:3000',
  login: '/login',
  dashboard: '/dashboard',
  veiculos: '/dashboard/veiculos',
  visitas: '/dashboard/visitas',
};

/**
 * Realiza login na aplicação
 * @param page - Instância da página do Playwright
 * @param credentials - Credenciais de login (opcional)
 */
export async function login(
  page: Page,
  credentials = TEST_CREDENTIALS
): Promise<void> {
  await page.goto(URLS.login);
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
}

/**
 * Realiza logout da aplicação
 * @param page - Instância da página do Playwright
 */
export async function logout(page: Page): Promise<void> {
  const logoutButton = page.locator('button:has-text("Sair"), button:has-text("Logout")').first();

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else {
    // Tentar abrir menu de usuário
    await page.click('[data-testid="user-menu"], button:has-text("Perfil")');
    await page.click('text=/Sair|Logout/i');
  }

  await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
}

/**
 * Aguarda uma requisição específica da API
 * @param page - Instância da página do Playwright
 * @param endpoint - Endpoint da API para aguardar
 * @param method - Método HTTP (default: GET)
 */
export async function waitForApiCall(
  page: Page,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
) {
  return page.waitForResponse(
    response =>
      response.url().includes(endpoint) &&
      response.request().method() === method &&
      response.status() === 200
  );
}

/**
 * Preenche um formulário com dados
 * @param page - Instância da página do Playwright
 * @param data - Objeto com os dados do formulário (chave = name do input)
 */
export async function fillForm(
  page: Page,
  data: Record<string, string>
): Promise<void> {
  for (const [name, value] of Object.entries(data)) {
    const input = page.locator(`input[name="${name}"], textarea[name="${name}"]`);
    if (await input.count() > 0) {
      await input.fill(value);
    }
  }
}

/**
 * Aguarda que um elemento esteja visível e clica nele
 * @param page - Instância da página do Playwright
 * @param selector - Seletor do elemento
 */
export async function waitAndClick(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible' });
  await page.click(selector);
}

/**
 * Verifica se existe uma mensagem de sucesso
 * @param page - Instância da página do Playwright
 */
export async function expectSuccessMessage(page: Page): Promise<void> {
  await expect(
    page.locator('text=/sucesso|salvo|criado|atualizado|success/i')
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Verifica se existe uma mensagem de erro
 * @param page - Instância da página do Playwright
 */
export async function expectErrorMessage(page: Page): Promise<void> {
  await expect(
    page.locator('text=/erro|falha|error|inválido/i')
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Aguarda que a tabela esteja carregada
 * @param page - Instância da página do Playwright
 */
export async function waitForTableLoad(page: Page): Promise<void> {
  await page.waitForSelector('table tbody tr, [data-testid*="item"]', {
    timeout: 10000,
  });
}

/**
 * Obtém o número de linhas de uma tabela
 * @param page - Instância da página do Playwright
 */
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.locator('table tbody tr, [data-testid*="item"]');
  return rows.count();
}

/**
 * Busca por texto em uma tabela
 * @param page - Instância da página do Playwright
 * @param searchText - Texto a ser buscado
 */
export async function searchInTable(page: Page, searchText: string): Promise<void> {
  const searchInput = page.locator(
    'input[placeholder*="Buscar"], input[placeholder*="Filtrar"], input[type="search"]'
  );
  await searchInput.fill(searchText);
  await page.waitForTimeout(1000); // Aguardar debounce
}

/**
 * Limpa filtros da página
 * @param page - Instância da página do Playwright
 */
export async function clearFilters(page: Page): Promise<void> {
  const clearButton = page.locator(
    'button:has-text("Limpar"), button:has-text("Resetar"), [data-testid="clear-filters"]'
  );

  if (await clearButton.count() > 0) {
    await clearButton.click();
  }
}

/**
 * Abre um modal/dialog
 * @param page - Instância da página do Playwright
 * @param buttonText - Texto do botão que abre o modal
 */
export async function openModal(page: Page, buttonText: string): Promise<void> {
  await page.click(`button:has-text("${buttonText}")`);
  await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
}

/**
 * Fecha um modal/dialog
 * @param page - Instância da página do Playwright
 */
export async function closeModal(page: Page): Promise<void> {
  const closeButton = page.locator(
    'button:has-text("Fechar"), button:has-text("Cancelar"), [aria-label="Close"]'
  );
  await closeButton.first().click();
  await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible();
}

/**
 * Faz upload de um arquivo
 * @param page - Instância da página do Playwright
 * @param selector - Seletor do input file
 * @param filePath - Caminho do arquivo
 */
export async function uploadFile(
  page: Page,
  selector: string,
  filePath: string
): Promise<void> {
  const fileInput = page.locator(selector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Formata uma data para o formato brasileiro
 * @param date - Data a ser formatada
 */
export function formatDateBR(date: Date = new Date()): string {
  return date.toLocaleDateString('pt-BR');
}

/**
 * Formata uma data para input do tipo date (YYYY-MM-DD)
 * @param date - Data a ser formatada
 */
export function formatDateInput(date: Date = new Date()): string {
  return date.toISOString().split('T')[0] ?? '';
}

/**
 * Aguarda tempo específico com mensagem de debug
 * @param ms - Milissegundos para aguardar
 * @param reason - Razão da espera (para debug)
 */
export async function wait(ms: number, reason?: string): Promise<void> {
  if (reason) {
    console.log(`Aguardando ${ms}ms: ${reason}`);
  }
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Tira screenshot com nome personalizado
 * @param page - Instância da página do Playwright
 * @param name - Nome do arquivo
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
}

/**
 * Navega para uma rota e aguarda carregamento
 * @param page - Instância da página do Playwright
 * @param path - Caminho da rota
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}
