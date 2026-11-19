import * as Location from "expo-location";
import { Linking } from "react-native";

export const ROTULO_USUARIO = "Você";

const paraReferencia = (posicao) => ({
  lat: posicao.coords.latitude,
  lon: posicao.coords.longitude,
  rotulo: ROTULO_USUARIO,
});

export async function garantirPermissaoLocalizacao() {
  const atual = await Location.getForegroundPermissionsAsync();
  if (atual.granted) return { concedida: true, podePedirDeNovo: true };
  if (!atual.canAskAgain) return { concedida: false, podePedirDeNovo: false };

  const resposta = await Location.requestForegroundPermissionsAsync();
  return { concedida: resposta.granted, podePedirDeNovo: resposta.canAskAgain };
}

export async function obterPosicaoAtual() {
  const posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return paraReferencia(posicao);
}

export function acompanharPosicao(aoMudar) {
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 10000 },
    (posicao) => aoMudar(paraReferencia(posicao))
  );
}

export function abrirAjustes() {
  Linking.openSettings();
}
