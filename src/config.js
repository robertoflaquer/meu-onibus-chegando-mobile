// Configuracao do app.
//
// O app nao fala direto com a SPTrans: usa as mesmas funcoes serverless da versao web,
// publicadas no Vercel. Assim o token da API Olho Vivo nunca fica dentro do app nem no GitHub.
// Para apontar para outro servidor, crie um arquivo .env com EXPO_PUBLIC_API_URL=https://...

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://meu-onibus-chegando-web.vercel.app";

export const INTERVALO_ATUALIZACAO_MS = 20000;
export const TEMPO_LIMITE_REDE_MS = 15000;
