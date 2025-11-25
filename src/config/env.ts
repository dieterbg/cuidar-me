// src/config/env.ts
function processPrivateKey(privateKey: string): string {
  // A chave privada vem como uma linha única do process.env, então precisamos reintroduzir as quebras de linha.
  return privateKey.replace(/\\n/g, '\n');
}

// Este objeto `env` é a ÚNICA fonte de verdade para variáveis de ambiente do servidor.
// Ele é preenchido no momento em que a aplicação é iniciada.
export const env = {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? processPrivateKey(process.env.FIREBASE_PRIVATE_KEY) : undefined,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
};
