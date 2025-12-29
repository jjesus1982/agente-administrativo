import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'porteiro@conectaplus.com.br',
  password: 'Porteiro@123',
};

const API_URL = 'http://localhost:8100';

test.describe('Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a página de login
    await page.goto('/login');
  });

  test('deve fazer login com credenciais válidas', async ({ page }) => {
    // Preencher formulário de login
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);

    // Interceptar requisição de login
    const loginPromise = page.waitForResponse(
      response => response.url().includes('/api/auth/login') && response.status() === 200
    );

    // Clicar no botão de login
    await page.click('button[type="submit"]');

    // Aguardar resposta da API
    const loginResponse = await loginPromise;
    const loginData = await loginResponse.json();

    // Verificar se o token foi retornado
    expect(loginData).toHaveProperty('token');
    expect(loginData).toHaveProperty('user');

    // Verificar se foi redirecionado para o dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Verificar se o nome do usuário aparece na página
    await expect(page.locator('text=/Porteiro|Bem-vindo/i')).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    // Preencher formulário com credenciais inválidas
    await page.fill('input[name="email"]', 'invalido@example.com');
    await page.fill('input[name="password"]', 'senhaerrada');

    // Clicar no botão de login
    await page.click('button[type="submit"]');

    // Aguardar mensagem de erro
    await expect(page.locator('text=/credenciais inválidas|erro|falha/i')).toBeVisible({
      timeout: 5000,
    });

    // Verificar se ainda está na página de login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('deve fazer logout corretamente', async ({ page }) => {
    // Primeiro, fazer login
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento para dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Procurar e clicar no botão de logout
    // (pode estar em um menu dropdown ou botão direto)
    const logoutButton = page.locator('button:has-text("Sair"), button:has-text("Logout")').first();

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Tentar abrir menu de usuário se existir
      await page.click('[data-testid="user-menu"], button:has-text("Perfil")');
      await page.click('text=/Sair|Logout/i');
    }

    // Verificar se foi redirecionado para login
    await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });

    // Verificar se o token foi removido (tentando acessar dashboard deve redirecionar)
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('deve validar campos obrigatórios', async ({ page }) => {
    // Tentar submeter formulário vazio
    await page.click('button[type="submit"]');

    // Verificar se há mensagens de validação
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    // Verificar se os campos são marcados como inválidos
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('deve persistir sessão após recarregar página', async ({ page }) => {
    // Fazer login
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Recarregar página
    await page.reload();

    // Verificar se ainda está autenticado
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('text=/Porteiro|Bem-vindo/i')).toBeVisible();
  });
});
