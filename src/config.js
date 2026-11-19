// o app usa as funcoes do Vercel da versao web, assim o token nao fica no app
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://meu-onibus-chegando-web.vercel.app";

export const INTERVALO_ATUALIZACAO_MS = 20000;
export const TEMPO_LIMITE_REDE_MS = 15000;
