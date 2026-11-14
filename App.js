// Meu ônibus está chegando (mobile)
// Ponto de entrada: carrega as fontes, mostra o topo e alterna entre a busca e o painel da linha.

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
// Importa so os pesos usados (importar do pacote inteiro levaria todas as variacoes para o app).
import { AtkinsonHyperlegible_400Regular } from "@expo-google-fonts/atkinson-hyperlegible/400Regular";
import { AtkinsonHyperlegible_700Bold } from "@expo-google-fonts/atkinson-hyperlegible/700Bold";
import { BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed/700Bold";
import { BarlowCondensed_800ExtraBold } from "@expo-google-fonts/barlow-condensed/800ExtraBold";
import { configurarNotificacoes } from "./src/servicos/avisos";
import { TelaBusca } from "./src/telas/TelaBusca";
import { TelaPainel } from "./src/telas/TelaPainel";
import { IconeOnibus } from "./src/componentes/ui";
import { cores, fontes } from "./src/tema";

configurarNotificacoes();

export default function App() {
  const [fontesProntas] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
  });
  const [selecao, setSelecao] = useState(null); // { linha, referencia } quando ha uma linha aberta

  if (!fontesProntas) return <View style={estilos.carregando} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={estilos.raiz} edges={["top"]}>
        <View style={estilos.topo}>
          <IconeOnibus tamanho={34} corpo={cores.branco} />
          <View>
            <Text style={estilos.topoNome}>Meu ônibus está chegando</Text>
            <Text style={estilos.topoSub}>São Paulo · em tempo real</Text>
          </View>
        </View>

        <View style={estilos.corpo}>
          {/* A busca continua montada (escondida) para manter os resultados ao voltar do painel. */}
          <View style={[estilos.corpo, selecao && estilos.oculto]}>
            <TelaBusca aoEscolherLinha={(linha, referencia) => setSelecao({ linha, referencia })} />
          </View>
          {selecao ? (
            <TelaPainel
              key={selecao.linha.cl}
              linha={selecao.linha}
              referenciaInicial={selecao.referencia}
              aoVoltar={() => setSelecao(null)}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  carregando: { flex: 1, backgroundColor: cores.tinta },
  raiz: { flex: 1, backgroundColor: cores.tinta },
  topo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: cores.tinta,
    borderBottomWidth: 3,
    borderBottomColor: cores.ambar,
  },
  topoNome: { fontFamily: fontes.sinal, fontSize: 21, color: cores.branco },
  topoSub: { fontFamily: fontes.texto, fontSize: 13, color: cores.ambar },
  corpo: { flex: 1, backgroundColor: cores.fundo },
  oculto: { display: "none" },
});
