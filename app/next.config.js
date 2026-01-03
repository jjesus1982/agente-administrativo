/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração de workspace para corrigir múltiplos lockfiles
  outputFileTracingRoot: __dirname,

  // Otimizações modernas do Next.js 15
  experimental: {
    // optimizeCss: true, // Temporariamente desabilitado devido ao erro do critters
  },

  // Configuração do Webpack para SVG
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },

  // Headers de segurança modernos
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // CORS restritivo - específico para o domínio
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development'
              ? 'http://localhost:3002'
              : 'https://agente-admin.com', // ✅ Específico
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          // Headers de segurança obrigatórios
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Necessário para Next.js
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' http://91.108.124.140:8100", // API permitida
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // HSTS para HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  // Compressão e otimizações
  compress: true,
  poweredByHeader: false,

  // Configuração de imagens
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;