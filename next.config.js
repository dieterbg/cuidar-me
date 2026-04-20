
require('dotenv').config();

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  images: {
    dangerouslyAllowSVG: true,
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
