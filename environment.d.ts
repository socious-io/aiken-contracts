declare global {
    namespace NodeJS {
      interface ProcessEnv {
          BLOCKFROST_API_KEY: string;
      }
    }
}

export {}