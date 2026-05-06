// Variables de entorno mínimas para que la app arranque en tests
// Se ejecuta antes de cada archivo de test
process.env.JWT_SECRET         = 'test-secret-key-para-jest'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-para-jest'
process.env.NODE_ENV           = 'test'
process.env.PORT               = '3001'