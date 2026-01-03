"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🚀 INICIANDO LOGIN');
    console.log('📧 Email:', email);
    console.log('🌐 API_BASE:', API_BASE);
    console.log('🔗 URL completa:', API_BASE + '/auth/auth/login');

    try {
      console.log('📤 Enviando requisição...');
      const res = await fetch(API_BASE + '/auth/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('📥 Resposta recebida:', res.status, res.statusText);

      let data = {};
      try {
        data = await res.json();
        console.log('📊 Dados da resposta:', data);
      } catch (jsonError) {
        console.error('❌ Erro ao parsear JSON:', jsonError);
        data = { detail: 'Erro de comunicação com o servidor' };
      }

      if (res.ok) {
        console.log('✅ Login bem-sucedido!');

        // Salvar tokens
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        console.log('💾 Tokens salvos no localStorage');

        // Extrair tenant_id do token JWT
        try {
          const tokenPayload = JSON.parse(atob(data.access_token.split('.')[1]));
          console.log('🔓 Payload do token:', tokenPayload);
          if (tokenPayload.tenant_id) {
            localStorage.setItem('currentTenantId', tokenPayload.tenant_id.toString());
            console.log('🏢 Tenant ID salvo:', tokenPayload.tenant_id);
          }
        } catch (error) {
          console.error('❌ Erro ao extrair tenant_id do token:', error);
        }

        // Redirecionar para dashboard
        console.log('🔄 Redirecionando para dashboard...');
        router.push('/dashboard');
        console.log('✨ Push executado!');
      } else {
        console.error('❌ Erro no login:', data);

        // Tratamento mais detalhado de erros
        let errorMessage = 'Email ou senha incorretos';

        if (data.detail) {
          errorMessage = data.detail;
        } else if (res.status === 422) {
          errorMessage = 'Dados inválidos. Verifique email e senha (min. 6 caracteres)';
        } else if (res.status === 401) {
          errorMessage = 'Email ou senha incorretos';
        } else if (res.status >= 500) {
          errorMessage = 'Erro interno do servidor. Tente novamente.';
        }

        setError(errorMessage);
      }
    } catch (err) {
      console.error('💥 Erro de conexão:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      console.log('🔚 Finalizando (setLoading false)');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--bg-secondary)',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Building2 size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            agente administrativo
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Sistema de Gestão de Condomínios
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 150ms'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.75rem',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 150ms'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: loading ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'opacity 150ms'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          © 2024 Agente Administrativo
        </p>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
