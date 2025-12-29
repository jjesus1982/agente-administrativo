import {
  handleApiError,
  formatApiError,
  getValidationErrors,
  isAuthError,
  isValidationError,
  isNetworkError,
  FormattedError,
} from '@/lib/errorHandler';

describe('Error Handler', () => {
  describe('handleApiError', () => {
    it('should handle network errors', () => {
      const networkError = new TypeError('Failed to fetch');
      const result = handleApiError(networkError);

      expect(result.message).toContain('conexao');
      expect(result.originalError).toBe(networkError);
    });

    it('should handle AbortError (timeout)', () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      const result = handleApiError(abortError);

      expect(result.message).toContain('demorou');
      expect(result.originalError).toBe(abortError);
    });

    it('should handle Error objects', () => {
      const error = new Error('Custom error message');
      const result = handleApiError(error);

      expect(result.message).toBe('Custom error message');
      expect(result.originalError).toBe(error);
    });

    it('should handle string errors', () => {
      const error = 'Something went wrong';
      const result = handleApiError(error);

      expect(result.message).toBe('Something went wrong');
      expect(result.originalError).toBe(error);
    });

    it('should handle object errors with detail property', () => {
      const error = { detail: 'Detailed error message' };
      const result = handleApiError(error);

      expect(result.message).toBe('Detailed error message');
    });

    it('should handle object errors with message property', () => {
      const error = { message: 'Error message' };
      const result = handleApiError(error);

      expect(result.message).toBe('Error message');
    });

    it('should handle unknown errors', () => {
      const result = handleApiError(null);

      expect(result.message).toContain('inesperado');
    });
  });

  describe('formatApiError', () => {
    it('should format 400 Bad Request', async () => {
      const response = new Response(JSON.stringify({ detail: 'Invalid data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await formatApiError(response);

      expect(result.status).toBe(400);
      expect(result.message).toBe('Invalid data');
    });

    it('should format 401 Unauthorized', async () => {
      const response = new Response(null, { status: 401 });

      const result = await formatApiError(response);

      expect(result.status).toBe(401);
      expect(result.message).toContain('Sessao');
    });

    it('should format 403 Forbidden', async () => {
      const response = new Response(null, { status: 403 });

      const result = await formatApiError(response);

      expect(result.status).toBe(403);
      expect(result.message).toContain('permissao');
    });

    it('should format 404 Not Found', async () => {
      const response = new Response(null, { status: 404 });

      const result = await formatApiError(response);

      expect(result.status).toBe(404);
      expect(result.message).toContain('encontrado');
    });

    it('should format 422 Validation Error', async () => {
      const response = new Response(
        JSON.stringify({
          detail: 'Validation failed',
          errors: { email: ['Invalid email format'] },
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const result = await formatApiError(response);

      expect(result.status).toBe(422);
      expect(result.message).toBe('Validation failed');
    });

    it('should format 500 Server Error', async () => {
      const response = new Response(null, { status: 500 });

      const result = await formatApiError(response);

      expect(result.status).toBe(500);
      expect(result.message).toContain('servidor');
    });
  });

  describe('getValidationErrors', () => {
    it('should return empty object when no errors', () => {
      const result = getValidationErrors(null);
      expect(result).toEqual({});
    });

    it('should return empty object when no details', () => {
      const error: FormattedError = {
        message: 'Error',
        originalError: null,
      };
      const result = getValidationErrors(error);
      expect(result).toEqual({});
    });

    it('should extract validation errors from details', () => {
      const error: FormattedError = {
        message: 'Validation Error',
        originalError: null,
        details: {
          email: ['Invalid email format'],
          password: ['Password too short', 'Must contain number'],
        },
      };

      const result = getValidationErrors(error);

      expect(result.email).toBe('Invalid email format');
      expect(result.password).toBe('Password too short');
    });
  });

  describe('Error type checks', () => {
    it('isAuthError should return true for 401 status', () => {
      const error: FormattedError = {
        message: 'Unauthorized',
        originalError: null,
        status: 401,
      };
      expect(isAuthError(error)).toBe(true);
    });

    it('isAuthError should return false for other status', () => {
      const error: FormattedError = {
        message: 'Error',
        originalError: null,
        status: 500,
      };
      expect(isAuthError(error)).toBe(false);
    });

    it('isValidationError should return true for 422 status', () => {
      const error: FormattedError = {
        message: 'Validation Error',
        originalError: null,
        status: 422,
      };
      expect(isValidationError(error)).toBe(true);
    });

    it('isValidationError should return true when details present', () => {
      const error: FormattedError = {
        message: 'Error',
        originalError: null,
        details: { field: ['error'] },
      };
      expect(isValidationError(error)).toBe(true);
    });

    it('isNetworkError should identify network errors', () => {
      const networkError: FormattedError = {
        message: 'Erro de conexao. Verifique sua internet.',
        originalError: null,
      };
      expect(isNetworkError(networkError)).toBe(true);
    });
  });
});
