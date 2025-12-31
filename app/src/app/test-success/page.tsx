"use client";
import React from 'react';

export default function TestSuccessPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1f2937',
      color: 'white'
    }}>
      <div style={{
        background: '#374151',
        padding: '2rem',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          🎉 LOGIN FUNCIONOU!
        </h1>
        <p style={{ fontSize: '1.2rem' }}>
          O redirecionamento está funcionando corretamente.
        </p>
        <p style={{ marginTop: '1rem', opacity: 0.7 }}>
          Agora podemos investigar o problema na página original.
        </p>
      </div>
    </div>
  );
}