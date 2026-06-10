export type AppEnv = {
  Bindings: {
    DB: D1Database
    ENVIRONMENT: string
  }
  Variables: {
    userId: string
  }
}
