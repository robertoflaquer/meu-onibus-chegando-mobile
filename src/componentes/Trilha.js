// Trilha visual da distancia: o onibus anda da esquerda (2 km ou mais) ate "voce" (direita).

import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { IconeOnibus } from "./ui";
import { cores, fontes } from "../tema";

const ESCALA_M = 2000;
const TAMANHO_ONIBUS = 34;
const TAMANHO_VOCE = 28;

export function Trilha({ distancia, rotuloDestino }) {
  const [largura, setLargura] = useState(0);
  const posicao = useRef(new Animated.Value(0)).current;

  const fracao = 1 - Math.min(distancia, ESCALA_M) / ESCALA_M; // 0 = longe, 1 = chegando
  const percurso = Math.max(largura - TAMANHO_VOCE - TAMANHO_ONIBUS / 2, 0);

  useEffect(() => {
    Animated.timing(posicao, { toValue: fracao * percurso, duration: 1000, useNativeDriver: true }).start();
  }, [fracao, percurso, posicao]);

  return (
    <View style={estilos.trilha} onLayout={(e) => setLargura(e.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={estilos.linha}>
        {Array.from({ length: 14 }).map((_, i) => (
          <View key={i} style={estilos.traco} />
        ))}
      </View>
      <View style={estilos.voce}>
        <View style={estilos.voceMiolo} />
      </View>
      <Animated.View style={[estilos.onibus, { transform: [{ translateX: posicao }] }]}>
        <IconeOnibus tamanho={TAMANHO_ONIBUS} />
      </Animated.View>
      <View style={estilos.escala}>
        <Text style={estilos.escalaTexto}>2 km</Text>
        <Text style={estilos.escalaTexto}>1 km</Text>
        <Text style={estilos.escalaTexto}>{rotuloDestino}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  trilha: { height: 66, marginTop: 14 },
  linha: {
    position: "absolute",
    left: 0,
    right: TAMANHO_VOCE / 2,
    top: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  traco: { width: 14, height: 6, borderRadius: 3, backgroundColor: cores.linha },
  voce: {
    position: "absolute",
    right: 0,
    top: 7,
    width: TAMANHO_VOCE,
    height: TAMANHO_VOCE,
    borderRadius: TAMANHO_VOCE / 2,
    backgroundColor: "rgba(106,27,154,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  voceMiolo: { width: 14, height: 14, borderRadius: 7, backgroundColor: cores.roxo, borderWidth: 2, borderColor: cores.branco },
  onibus: { position: "absolute", left: 0, top: 2 },
  escala: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-between" },
  escalaTexto: { fontFamily: fontes.texto, fontSize: 12, color: cores.tintaSuave },
});
