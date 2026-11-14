// GPS do celular com expo-location.
// A permissao e pedida so quando o usuario toca em "Usar minha localizacao" (no contexto certo).

import * as Location from "expo-location";
import { Linking } from "react-native";

export const ROTULO_USUARIO = "Você";

const paraReferencia = (posicao) => ({
  lat: posicao.coords.latitude,
  lon: posicao.coords.longitude,
  rotulo: ROTULO_USUARIO,
});

/**
 * Garante a permissao de localizacao.
 * Resolve com { concedida, podePedirDeNovo }. Se o usuario negou de vez,
 * o iOS nao mostra o pedido de novo: o unico caminho e abrir os Ajustes.
 */
export async function garantirPermissaoLocalizacao() {
  const atual = await Location.getForegroundPermissionsAsync();
  if (atual.granted) return { concedida: true, podePedirDeNovo: true };
  if (!atual.canAskAgain) return { concedida: false, podePedirDeNovo: false };

  const resposta = await Location.requestForegroundPermissionsAsync();
  return { concedida: resposta.granted, podePedirDeNovo: resposta.canAskAgain };
}

/** Posicao atual do usuario como { lat, lon, rotulo }. */
export async function obterPosicaoAtual() {
  const posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return paraReferencia(posicao);
}

/**
 * Acompanha a posicao enquanto o usuario se desloca (a cada 20 m ou 10 s).
 * Devolve uma Promise com a assinatura; chame .remove() para parar.
 */
export function acompanharPosicao(aoMudar) {
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 10000 },
    (posicao) => aoMudar(paraReferencia(posicao))
  );
}

export function abrirAjustes() {
  Linking.openSettings();
}
