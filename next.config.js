
require('dotenv').config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep heavy server-only SDKs out of the Next server bundle. They remain
  // available at runtime through node_modules and avoid slow/fragile builds.
  serverExternalPackages: ['twilio', 'genkit', '@genkit-ai/google-genai'],
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
  // SECURITY: Não usar o bloco `env` para variáveis servidor — ele injeta os
  // valores no bundle do cliente. Variáveis servidor (TWILIO_AUTH_TOKEN,
  // FIREBASE_PRIVATE_KEY, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY) são lidas
  // diretamente via process.env em routes/server actions, onde o Node.js as
  // resolve nativamente sem precisar deste bloco.
  // Apenas variáveis NEXT_PUBLIC_* devem aparecer aqui ou em .env.local.
  // MEDIUM-1 fix: security headers em todas as rotas
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Força HTTPS por 2 anos, inclui subdomínios, envia para preload list
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Impede clickjacking — página não pode ser carregada em iframe de outro site
          { key: 'X-Frame-Options', value: 'DENY' },
          // Impede MIME-sniffing — browser respeita Content-Type declarado
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Envia referrer completo só para mesma origem, apenas origem em cross-site
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Bloqueia acesso a câmera, microfone e geolocalização (não usados)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  images: {
    // SVG necessário para avatares DiceBear. CSP restringe execução de scripts
    // dentro de SVGs renderizados via next/image (sandbox via Content-Security-Policy).
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  }
}

module.exports = nextConfig
