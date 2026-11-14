// Cartao mostrado quando o usuario nao permitiu o GPS ou as notificacoes.
// Explica o que o app perde e oferece o caminho certo: pedir de novo ou abrir os Ajustes.

import { StyleSheet, Text, View } from "react-native";
import { Botao } from "./ui";
import { abrirAjustes } from "../servicos/localizacao";
import { cores, fontes } from "../tema";

export function AvisoPermissao({ titulo, texto, podePedirDeNovo, aoTentarDeNovo }) {
  return (
    <View style={estilos.caixa} accessibilityRole="alert">
      <Text style={estilos.titulo}>{titulo}</Text>
      <Text style={estilos.texto}>{texto}</Text>
      {podePedirDeNovo ? (
        <Botao titulo="Permitir agora" variante="escuro" aoTocar={aoTentarDeNovo} style={estilos.botao} />
      ) : (
        <Botao titulo="Abrir Ajustes do iPhone" variante="escuro" aoTocar={abrirAjustes} style={estilos.botao} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: cores.ambarSuave,
    borderLeftWidth: 5,
    borderLeftColor: cores.ambar,
  },
  titulo: { fontFamily: fontes.textoNegrito, fontSize: 16, color: cores.tinta },
  texto: { fontFamily: fontes.texto, fontSize: 15, color: cores.tinta, marginTop: 4, lineHeight: 21 },
  botao: { marginTop: 10, minHeight: 46 },
});
