const config = {
  port: process.env.PORT || 3001,
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    secret:           process.env.JWT_SECRET,
    expiresIn:        process.env.JWT_EXPIRES_IN         || '15m',
    refreshSecret:    process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  }
}

export default config