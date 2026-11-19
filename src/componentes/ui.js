import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { cores, fontes, sombra } from "../tema";

export function Placa({ texto, grande = false }) {
  return (
    <View style={[estilos.placa, grande && estilos.placaGrande]}>
      <Text style={[estilos.placaTexto, grande && estilos.placaTextoGrande]}>{texto}</Text>
    </View>
  );
}

export function Cartao({ children, escuro = false, style }) {
  return <View style={[estilos.cartao, escuro && estilos.cartaoEscuro, style]}>{children}</View>;
}

export function TituloCartao({ children }) {
  return <Text style={estilos.tituloCartao}>{children}</Text>;
}

export function Rotulo({ children, claro = false }) {
  return <Text style={[estilos.rotulo, claro && { color: cores.ambar }]}>{children}</Text>;
}

export function Mensagem({ children, forte = false }) {
  if (!children) return null;
  return <Text style={[estilos.mensagem, forte && estilos.mensagemForte]}>{children}</Text>;
}

const VARIANTES = {
  principal: { fundo: cores.ambar, texto: cores.tinta, borda: cores.ambar },
  escuro: { fundo: cores.tinta, texto: cores.branco, borda: cores.tinta },
  contorno: { fundo: "transparent", texto: cores.tinta, borda: cores.tinta },
};

export function Botao({ titulo, aoTocar, variante = "principal", carregando = false, desativado = false, style }) {
  const cor = VARIANTES[variante];
  const inativo = desativado || carregando;
  return (
    <Pressable
      onPress={aoTocar}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: cor.fundo, borderColor: cor.borda },
        variante === "principal" && estilos.botaoPrincipal,
        pressed && estilos.botaoPressionado,
        inativo && { opacity: 0.6 },
        style,
      ]}
    >
      {carregando ? <ActivityIndicator color={cor.texto} /> : null}
      <Text style={[estilos.botaoTexto, { color: cor.texto }]}>{titulo}</Text>
    </Pressable>
  );
}

const TEXTO_STATUS = { aproximando: "se aproximando", afastando: "se afastando" };

export function Chip({ status }) {
  if (!TEXTO_STATUS[status]) return null;
  const aproximando = status === "aproximando";
  return (
    <View style={[estilos.chip, aproximando && { backgroundColor: cores.verdeSuave }]}>
      <View style={[estilos.chipPonto, { backgroundColor: aproximando ? cores.verde : cores.tintaSuave }]} />
      <Text style={[estilos.chipTexto, { color: aproximando ? cores.verde : cores.tintaSuave }]}>
        {TEXTO_STATUS[status]}
      </Text>
    </View>
  );
}

export function SeloAcessivel() {
  return (
    <View style={estilos.selo} accessibilityLabel="Veículo acessível">
      <Text style={estilos.seloTexto}>♿︎ Acessível</Text>
    </View>
  );
}

export function IconeOnibus({ tamanho = 32, corpo = cores.tinta, vidro = cores.ambar }) {
  const u = tamanho / 32;
  return (
    <View style={{ width: tamanho, height: tamanho }} accessibilityElementsHidden importantForAccessibility="no">
      <View style={{ position: "absolute", left: 4 * u, top: 3 * u, width: 24 * u, height: 22 * u, borderRadius: 5 * u, backgroundColor: corpo }} />
      <View style={{ position: "absolute", left: 8 * u, top: 7 * u, width: 16 * u, height: 7 * u, borderRadius: 1.5 * u, backgroundColor: vidro }} />
      <View style={{ position: "absolute", left: 7 * u, top: 24 * u, width: 6 * u, height: 6 * u, borderRadius: 3 * u, backgroundColor: corpo }} />
      <View style={{ position: "absolute", left: 19 * u, top: 24 * u, width: 6 * u, height: 6 * u, borderRadius: 3 * u, backgroundColor: corpo }} />
    </View>
  );
}

export function SeletorOpcoes({ opcoes, valor, aoMudar, rotulo }) {
  return (
    <View style={estilos.opcoes} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      {opcoes.map((opcao) => {
        const ativa = opcao.valor === valor;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => aoMudar(opcao.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativa }}
            style={[estilos.opcao, ativa && estilos.opcaoAtiva]}
          >
            <Text style={[estilos.opcaoTexto, ativa && estilos.opcaoTextoAtiva]}>{opcao.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  placa: {
    minWidth: 84,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: cores.tinta,
    alignItems: "center",
  },
  placaGrande: { minWidth: 0, paddingHorizontal: 0, paddingVertical: 0, backgroundColor: "transparent" },
  placaTexto: { color: cores.ambar, fontFamily: fontes.sinal, fontSize: 20, letterSpacing: 0.6 },
  placaTextoGrande: { fontFamily: fontes.sinalForte, fontSize: 34, textShadowColor: "rgba(255,180,0,0.5)", textShadowRadius: 10 },

  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.linha,
    padding: 16,
    marginBottom: 14,
    ...sombra,
  },
  cartaoEscuro: { backgroundColor: cores.tinta, borderColor: cores.tinta },
  tituloCartao: { fontFamily: fontes.sinal, fontSize: 24, color: cores.tinta, marginBottom: 6 },
  rotulo: {
    fontFamily: fontes.textoNegrito,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: cores.ambarEscuro,
  },
  mensagem: { fontFamily: fontes.texto, fontSize: 16, color: cores.tintaSuave, marginVertical: 8, lineHeight: 22 },
  mensagemForte: { fontFamily: fontes.textoNegrito, color: cores.tinta },

  botao: {
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  botaoPrincipal: { borderBottomWidth: 5, borderBottomColor: cores.ambarSombra },
  botaoPressionado: { transform: [{ translateY: 2 }] },
  botaoTexto: { fontFamily: fontes.textoNegrito, fontSize: 17 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: cores.fundo,
  },
  chipPonto: { width: 8, height: 8, borderRadius: 4 },
  chipTexto: { fontFamily: fontes.textoNegrito, fontSize: 14 },

  selo: {
    borderWidth: 2,
    borderColor: cores.verde,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  seloTexto: { fontFamily: fontes.textoNegrito, fontSize: 13, color: cores.verde },

  opcoes: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  opcao: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: cores.linha,
    backgroundColor: cores.cartao,
    alignItems: "center",
    justifyContent: "center",
  },
  opcaoAtiva: { backgroundColor: cores.tinta, borderColor: cores.tinta },
  opcaoTexto: { fontFamily: fontes.textoNegrito, fontSize: 15, color: cores.tinta },
  opcaoTextoAtiva: { color: cores.ambar },
});
