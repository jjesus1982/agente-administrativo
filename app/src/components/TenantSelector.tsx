"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, MapPin, Users, Home } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { API_BASE } from '@/lib/api';

export default function TenantSelector() {
  const { currentTenant, tenants, isMultiTenant, isLoading, switchTenant } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Estado de carregamento
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '0.75rem', 
        padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', 
        borderRadius: '10px', minWidth: '200px'
      }}>
        <div style={{ 
          width: '36px', height: '36px', borderRadius: '8px', 
          background: 'var(--bg-secondary)', 
          animation: 'pulse 1.5s infinite' 
        }}/>
        <div style={{ flex: 1 }}>
          <div style={{ width: '100px', height: '14px', borderRadius: '4px', background: 'var(--bg-secondary)', animation: 'pulse 1.5s infinite', marginBottom: '4px' }}/>
          <div style={{ width: '70px', height: '10px', borderRadius: '4px', background: 'var(--bg-secondary)', animation: 'pulse 1.5s infinite' }}/>
        </div>
      </div>
    );
  }

  // Sem tenant (não deveria acontecer, mas fallback)
  if (!currentTenant) {
    return (
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '0.75rem', 
        padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', 
        borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.875rem'
      }}>
        <Building2 size={20}/>
        <span>Nenhum condomínio</span>
      </div>
    );
  }

  // Se só tem 1 condomínio, mostra apenas o nome (sem dropdown)
  if (!isMultiTenant) {
    return (
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '0.75rem', 
        padding: '0.5rem 1rem', background: 'var(--bg-tertiary)', 
        borderRadius: '10px', border: '1px solid var(--border-color)'
      }}>
        <div style={{ 
          width: '36px', height: '36px', borderRadius: '8px',
          background: currentTenant.logo_url 
            ? `url(${API_BASE.replace('/api/v1', '')}${currentTenant.logo_url}) center/cover` 
            : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {!currentTenant.logo_url && <Building2 size={18} style={{ color: 'white' }}/>}
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.2, color: 'var(--text-primary)', margin: 0 }}>
            {currentTenant.tenant_name}
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            {currentTenant.city}, {currentTenant.state}
          </p>
        </div>
      </div>
    );
  }

  // Multi-tenant: mostra dropdown
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.5rem 1rem', background: 'var(--bg-tertiary)',
          borderRadius: '10px', border: '1px solid var(--border-color)',
          cursor: 'pointer', transition: 'all 150ms',
          outline: isOpen ? '2px solid var(--accent)' : 'none'
        }}
      >
        <div style={{ 
          width: '36px', height: '36px', borderRadius: '8px',
          background: currentTenant.logo_url 
            ? `url(${API_BASE.replace('/api/v1', '')}${currentTenant.logo_url}) center/cover` 
            : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {!currentTenant.logo_url && <Building2 size={18} style={{ color: 'white' }}/>}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.2, color: 'var(--text-primary)', margin: 0 }}>
            {currentTenant.tenant_name}
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            {currentTenant.city}, {currentTenant.state}
          </p>
        </div>
        <ChevronDown size={18} style={{ 
          color: 'var(--text-muted)', marginLeft: '0.5rem', 
          transition: 'transform 150ms', 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' 
        }}/>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          minWidth: '320px', background: 'var(--bg-primary)',
          borderRadius: '12px', border: '1px solid var(--border-color)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)', zIndex: 1000,
          overflow: 'hidden', animation: 'fadeIn 150ms ease-out'
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>
              Seus Condomínios ({tenants.length})
            </p>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {tenants.map(tenant => (
              <button
                key={tenant.tenant_id}
                onClick={() => { switchTenant(tenant.tenant_id); setIsOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', border: 'none', background: 'transparent',
                  cursor: 'pointer', transition: 'background 150ms',
                  borderLeft: tenant.tenant_id === currentTenant.tenant_id ? '3px solid var(--accent)' : '3px solid transparent'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ 
                  width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
                  background: tenant.logo_url 
                    ? `url(${API_BASE.replace('/api/v1', '')}${tenant.logo_url}) center/cover` 
                    : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {!tenant.logo_url && <Building2 size={20} style={{ color: 'white' }}/>}
                </div>
                
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    {tenant.tenant_name}
                    {tenant.is_primary && (
                      <span style={{ fontSize: '0.6rem', padding: '0.125rem 0.375rem', background: 'var(--accent)', color: 'white', borderRadius: '4px' }}>PRINCIPAL</span>
                    )}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={10}/> {tenant.city}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Home size={10}/> {tenant.total_units || 0}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users size={10}/> {tenant.total_users || 0}
                    </span>
                  </div>
                </div>
                
                {tenant.tenant_id === currentTenant.tenant_id && (
                  <Check size={18} style={{ color: 'var(--accent)' }}/>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
