import { api, API_BASE } from '@/lib/api';

// Mock do getTenantId
jest.mock('@/lib/api', () => {
  const originalModule = jest.requireActual('@/lib/api');
  return {
    ...originalModule,
    getTenantId: () => '1', // Mock tenant ID
  };
});

describe('API Configuration', () => {
  describe('API_BASE', () => {
    it('should be defined', () => {
      expect(API_BASE).toBeDefined();
    });

    it('should be a string', () => {
      expect(typeof API_BASE).toBe('string');
    });

    it('should contain api path', () => {
      expect(API_BASE).toContain('/api');
    });
  });

  describe('api object', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockClear();
      localStorage.clear();
      // Mock tenant ID in localStorage
      localStorage.setItem('currentTenantId', '1');
    });

    it('should have get method', () => {
      expect(api.get).toBeDefined();
      expect(typeof api.get).toBe('function');
    });

    it('should have post method', () => {
      expect(api.post).toBeDefined();
      expect(typeof api.post).toBe('function');
    });

    it('should have put method', () => {
      expect(api.put).toBeDefined();
      expect(typeof api.put).toBe('function');
    });

    it('should have patch method', () => {
      expect(api.patch).toBeDefined();
      expect(typeof api.patch).toBe('function');
    });

    it('should have delete method', () => {
      expect(api.delete).toBeDefined();
      expect(typeof api.delete).toBe('function');
    });

    describe('api.get', () => {
      it('should call fetch with correct URL', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await api.get('/users');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE}/users?tenant_id=1`,
          expect.objectContaining({
            method: 'GET',
          })
        );
      });

      it('should include default headers', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await api.get('/users');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });

      it('should include auth token when available', async () => {
        localStorage.setItem('access_token', 'test-token');

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await api.get('/users');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-token',
            }),
          })
        );
      });
    });

    describe('api.post', () => {
      it('should call fetch with POST method', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const testData = { name: 'Test User' };
        await api.post('/users', testData);

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE}/users?tenant_id=1`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(testData),
          })
        );
      });

      it('should stringify body data', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const testData = { email: 'test@example.com', password: '123456' };
        await api.post('/auth/auth/login', testData);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify(testData),
          })
        );
      });
    });

    describe('api.put', () => {
      it('should call fetch with PUT method', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const testData = { name: 'Updated User' };
        await api.put('/users/1', testData);

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE}/users/1?tenant_id=1`,
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(testData),
          })
        );
      });
    });

    describe('api.patch', () => {
      it('should call fetch with PATCH method', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const testData = { status: 'active' };
        await api.patch('/users/1', testData);

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE}/users/1?tenant_id=1`,
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify(testData),
          })
        );
      });
    });

    describe('api.delete', () => {
      it('should call fetch with DELETE method', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await api.delete('/users/1');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE}/users/1?tenant_id=1`,
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });
});
