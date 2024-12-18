declare global {
    namespace NodeJS {
      interface ProcessEnv {
          BLOCKFROST_API_KEY?: string;
          PAYMENT_MNEMONIC?: string;
      }
    }
}

export {}