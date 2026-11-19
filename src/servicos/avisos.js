import * as Notifications from "expo-notifications";
import { Alert, Vibration } from "react-native";

const PADRAO_VIBRACAO = [0, 400, 200, 400];

export function configurarNotificacoes() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function permissaoConcedida(resposta) {
  const provisoria = resposta.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  return resposta.granted || provisoria;
}

export async function garantirPermissaoNotificacao() {
  const atual = await Notifications.getPermissionsAsync();
  if (permissaoConcedida(atual)) return { concedida: true, podePedirDeNovo: true };
  if (!atual.canAskAgain) return { concedida: false, podePedirDeNovo: false };

  const resposta = await Notifications.requestPermissionsAsync();
  return { concedida: permissaoConcedida(resposta), podePedirDeNovo: resposta.canAskAgain };
}

export async function dispararAviso(titulo, texto, notificacoesPermitidas) {
  Vibration.vibrate(PADRAO_VIBRACAO);
  if (notificacoesPermitidas) {
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: texto, sound: true },
      trigger: null, // imediata
    });
  } else {
    Alert.alert(titulo, texto);
  }
}
