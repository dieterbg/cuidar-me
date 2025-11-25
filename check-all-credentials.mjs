import admin from 'firebase-admin';

console.log('🔍 VERIFICAÇÃO COMPLETA DE CREDENCIAIS\n');

// 1. Verificar se as credenciais estão presentes
const serviceAccount = {
  "projectId": "cuidarme-lite",
  "privateKey": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCwqaqiXgtz2P7j\ngsXLRizk0VXMoF1ajSFLF5qzcUlI+RNiJ8xaajtgFzZTwxZr7BlFwPVOj42I7oYP\nQllB8WmSKUuzJpmq6frT5ScnaeQXZtNT+qCqnjisvGVPupZOCODhLw9kAAE2E7Sl\nmMfHzCRbhoTRrTabx+7IQr9m/PRa1F/Bsi6XTysbHNtw3QO5nTF2a7/btratEtPf\nJwODX9vMike7e2S+dUR/TlhNTs0EviAY6AFPiKSU4idwX6JvUeMf854QP+FBJLOM\nd1tLnEC56bx+SJTygMK6FA334Z+oOZnLGJ5Pt77JGSDqVLYMvQB5PBFshQvSaoXc\nz+xXUZeVAgMBAAECggEACzgbMAiM7aSAO26YpRoly7pHmqEsjI2d6ajsGC0/nDTF\nOFySq8NHVgjjWFpxWBU8XaOtcHnJYULUnK93/6oXLEMXHZ977tDBLyfEXspow9ux\nAl0nqFBtCaawH93ACmsLmDQt2cQrKB/vmx/c37RaEaYtMAtUaNW1Lz4bs/trL7o\ntgH3ElEWh0OVYc6+3ey8JnrMY8zbEJzeoECA0pXMFDEGFFtYFEivLf4Q+5V0UnAz\nsjeGHyrY6v58WwEaib0yRKUVbEScsrEpODKMwLbbwBk9pGJ76JXYoO2lFlcrwQcbB\nrsqsAx0QCAFQUyF6dkb87Y3g3jx9rbfvnGAPfCD6gQKBgQD05vwKdUam/8p57mOo\n04nB26EzhCnxphhlHBYwB6h4fpZpVoq87K4vc9kZzVijj3HPU7E/ZCZA8kOuwPJT\n1Cjre4lWR1uztZUZpWDVDZf0vgO0p+JZqJ052sjaSgPKRdNcs6RGPzf4EKvFk/v7\nviEmDm4/PlbZI+Ccrk/UN8zBUQKBgQC4qw/gs60vU2k484UAEgSL0vO0p65M3x/g\nfAPX2E+FIpUg3Kv8HAiPh2IdzHOlV/zWdwXGjTdT5hHHcrCAvtn9T5KgRj6JW/Y0\nFVtbG7bACTget4RyX6Tv/Nk54zlbD4vK1fy4pYfTM9qzBYk4yMyd+2xdbfFus5ss\nswK/amiBBQKBgQCpr9YY5PNkSL2hSGTzGEdN9AC4si1hywUCIbjZ5KR9gLB1IkqU\n5qU2Kd3WO+rbwUtJLSMV2i2LOJFe5z/Ah7Mmnn0lM+I9HWbG00jJtlaAdJwas2xp\nVSRDbu1WGoyPvVva0nnTVoBQODTcfFHPNwi+1qba2TXR1EMQLNMRJuyPUQKBgQCs\n6CaGu1WV8WCdXY4TgctV7GAZr8NI4MXlF9k1WakjPD0rttMlzE3LrfSVeCB0GU14\ntZrnzMOYP9w3xlAzS/+p6b6daQgW7s849yJBzVIwvrEYOba+rIUv26y9Qd8rPwQi\nGHh3ny3s+Cl24+EXFRRZe9d8J3werfbGRJp3BbfxzQKBgBK+vwkOBWLyWTnF+eY0\nbul+38v7QFfiJgDTrdNIPw8fNQj+qluuNZabNMe1+r0Lp3hEZkg6RGNclxgEDmkV\nxOKhSu0pCR30WiY5NEoH3KYv56cO9MrjouE4e5MkwUdYC58S3kOZ05+/o5xRTvXN\nLpU2Z3+4rkEkrGgoCAE0PsPJ\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
  "clientEmail": "firebase-adminsdk-fbsvc@cuidarme-lite.iam.gserviceaccount.com",
};

console.log('1. ✅ Credenciais presentes no código:');
console.log('   - Project ID:', serviceAccount.projectId ? '✅' : '❌');
console.log('   - Client Email:', serviceAccount.clientEmail ? '✅' : '❌');
console.log('   - Private Key:', serviceAccount.privateKey ? '✅' : '❌');
console.log('   - Private Key length:', serviceAccount.privateKey?.length, 'caracteres');

// 2. Tentar inicializar o Firebase Admin
console.log('\n2. 🔧 Inicializando Firebase Admin...');
try {
  // Limpar qualquer instância existente para teste
  if (admin.apps.length > 0) {
    await Promise.all(admin.apps.map(app => app.delete()));
  }

  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('   ✅ Firebase Admin inicializado com sucesso!');

  // 3. Testar Firestore
  console.log('\n3. 🗄️  Testando Firestore...');
  const db = app.firestore();
  console.log('   ✅ Firestore instanciado');

  // 4. Testar Auth
  console.log('\n4. 🔐 Testando Auth...');
  const auth = app.auth();
  console.log('   ✅ Auth instanciado');

  // 5. Testar uma operação simples no Firestore
  console.log('\n5. 📡 Testando operação no Firestore...');
  const collections = await db.listCollections();
  console.log('   ✅ Operação bem-sucedida!');
  console.log('   📁 Collections encontradas:', collections.length);

  console.log('\n🎉 TODAS AS VERIFICAÇÕES PASSARAM!');
  console.log('As credenciais estão sendo lidas corretamente.');

} catch (error) {
  console.log('❌ ERRO DETECTADO:');
  console.log('   Mensagem:', error.message);
  console.log('   Código:', error.code);
  
  if (error.message.includes('private key')) {
    console.log('   💡 Problema: Chave privada inválida');
  } else if (error.message.includes('project')) {
    console.log('   💡 Problema: Project ID inválido');
  } else if (error.message.includes('certificate')) {
    console.log('   💡 Problema: Certificado inválido');
  } else if (error.message.includes('permission')) {
    console.log('   💡 Problema: Sem permissões');
  }
}
