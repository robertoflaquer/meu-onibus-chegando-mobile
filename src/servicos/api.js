// Acesso aos dados pelas funcoes serverless publicadas no Vercel (ver src/config.js).
//   /api/olhovivo -> consultas de leitura da API Olho Vivo (SPTrans)
//   /api/perto    -> linhas com onibus perto de uma coordenada
//   /api/endereco -> endereco para coordenadas (Nominatim, OpenStreetMap)

import { API_URL, TEMPO_LIMITE_REDE_MS } from "../config";

function montarConsulta(parametros) {
  return Object.entries(parametros)
    .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(valor)}`)
    .join("&");
}

async function obterJson(caminho, parametros) {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_REDE_MS);
  try {
    const resposta = await fetch(`${API_URL}${caminho}?${montarConsulta(parametros)}`, { signal: controle.signal });
    if (!resposta.ok) throw new Error(`Falha na consulta (${resposta.status})`);
    return await resposta.json();
  } finally {
    clearTimeout(limite);
  }
}

const olhoVivo = (caminho, parametros) => obterJson("/api/olhovivo", { caminho, ...parametros });

export const buscarLinhas = (termo) => olhoVivo("/Linha/Buscar", { termosBusca: termo });

export const paradasDaLinha = (codigoLinha) => olhoVivo("/Parada/BuscarParadasPorLinha", { codigoLinha });

export const posicaoDaLinha = (codigoLinha) => olhoVivo("/Posicao/Linha", { codigoLinha });

export const previsao = (codigoParada, codigoLinha) => olhoVivo("/Previsao", { codigoParada, codigoLinha });

/** Linhas com onibus a ate `raio` metros do local. */
export const linhasPerto = ({ lat, lon }, raio) => obterJson("/api/perto", { lat, lon, raio });

/** Ate 5 lugares em Sao Paulo que correspondem ao texto digitado. */
export const buscarEndereco = (texto) => obterJson("/api/endereco", { q: texto });
