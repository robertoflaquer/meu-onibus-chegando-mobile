// Avisos ao usuario: notificacao local (expo-notifications), vibracao e alerta na tela.
// Notificacoes locais sao geradas pelo proprio app e funcionam no Expo Go.

import * as Notifications from "expo-notifications";
import { Alert, Vibration } from "react-native";

const PADRAO_VIBRACAO = [0, 400, 200, 400];

/** Chamar uma vez ao abrir o app: mostra a notificacao mesmo com o app aberto. */
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

/** Resolve com { concedida, podePedirDeNovo }. */
export async function garantirPermissaoNotificacao() {
  const atual = await Notifications.getPermissionsAsync();
  if (permissaoConcedida(atual)) return { concedida: true, podePedirDeNovo: true };
  if (!atual.canAskAgain) return { concedida: false, podePedirDeNovo: false };

  const resposta = await Notifications.requestPermissionsAsync();
  return { concedida: permissaoConcedida(resposta), podePedirDeNovo: resposta.canAskAgain };
}

/**
 * Dispara o aviso: sempre vibra; se as notificacoes estiverem permitidas, gera uma
 * notificacao local; senao, mostra um alerta na tela para o aviso nao se perder.
 */
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
