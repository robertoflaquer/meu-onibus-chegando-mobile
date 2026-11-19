import { useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as api from "../servicos/api";
import { garantirPermissaoLocalizacao, obterPosicaoAtual, ROTULO_USUARIO } from "../servicos/localizacao";
import { agruparPorLetreiro, linhaDaBusca, linhaDaPosicao, ordenarPorRelevancia } from "../logica/linhas";
import { formatarDistancia } from "../logica/util";
import { AvisoPermissao } from "../componentes/AvisoPermissao";
import { Botao, Cartao, Mensagem, Placa, Rotulo } from "../componentes/ui";
import { cores, fontes, sombra } from "../tema";

const POR_PAGINA = 8;
const RAIOS_BUSCA_M = [500, 1000]; // tenta perto primeiro e amplia se nao achar nada
const ERRO_REDE = "Não foi possível consultar os dados agora. Verifique a internet e tente de novo.";

const MODOS = [
  { valor: "endereco", rotulo: "Endereço" },
  { valor: "linha", rotulo: "Número ou destino" },
];

export function TelaBusca({ aoEscolherLinha }) {
  const [modo, setModo] = useState("endereco");
  const [texto, setTexto] = useState({ endereco: "", linha: "" });
  const [carregando, setCarregando] = useState(null); // "gps" | "busca" | null
  const [mensagem, setMensagem] = useState("");
  const [resultado, setResultado] = useState({ tipo: null, itens: [] });
  const [mostrados, setMostrados] = useState(POR_PAGINA);
  const [referencia, setReferencia] = useState(null);
  const [permissaoGps, setPermissaoGps] = useState(null); // null | { podePedirDeNovo }

  function mostrarResultado(tipo, itens, textoMensagem) {
    setResultado({ tipo, itens });
    setMostrados(POR_PAGINA);
    setMensagem(textoMensagem);
  }

  function limpar(textoMensagem = "") {
    mostrarResultado(null, [], textoMensagem);
  }

  async function usarMinhaLocalizacao() {
    Keyboard.dismiss();
    setCarregando("gps");
    limpar("Obtendo sua localização...");
    try {
      const permissao = await garantirPermissaoLocalizacao();
      if (!permissao.concedida) {
        setPermissaoGps({ podePedirDeNovo: permissao.podePedirDeNovo });
        limpar();
        return;
      }
      setPermissaoGps(null);
      const local = await obterPosicaoAtual();
      setReferencia(local);
      await listarLinhasPerto(local);
    } catch {
      limpar("Não foi possível obter sua localização. Confira se a localização do iPhone está ligada.");
    } finally {
      setCarregando(null);
    }
  }

  async function listarLinhasPerto(local) {
    setMensagem("Procurando ônibus por perto...");
    try {
      for (const raio of RAIOS_BUSCA_M) {
        const { linhas } = await api.linhasPerto(local, raio);
        if (linhas.length) {
          const onde = local.rotulo === ROTULO_USUARIO ? "você" : local.rotulo;
          mostrarResultado("perto", linhas, `${linhas.length} linha(s) com ônibus a até ${formatarDistancia(raio)} de ${onde}. Toque na sua:`);
          return;
        }
      }
      limpar("Nenhum ônibus a até 1 km neste momento. Tente outro endereço ou busque pela linha.");
    } catch {
      limpar(ERRO_REDE);
    }
  }

  async function buscar() {
    const termo = texto[modo].trim();
    Keyboard.dismiss();
    if (modo === "endereco" && termo.length < 3) {
      limpar("Digite pelo menos 3 letras do endereço.");
      return;
    }
    if (!termo) return;

    setCarregando("busca");
    limpar(modo === "endereco" ? "Procurando o endereço..." : "Buscando linhas...");
    try {
      if (modo === "endereco") await buscarEndereco(termo);
      else await buscarLinha(termo);
    } catch {
      limpar(ERRO_REDE);
    } finally {
      setCarregando(null);
    }
  }

  async function buscarEndereco(termo) {
    const lugares = await api.buscarEndereco(termo);
    if (!lugares.length) {
      limpar("Endereço não encontrado em São Paulo. Inclua o bairro ou um ponto de referência.");
    } else if (lugares.length === 1) {
      await escolherLugar(lugares[0]);
    } else {
      mostrarResultado("lugares", lugares, "Qual destes lugares?");
    }
  }

  async function escolherLugar(lugar) {
    const local = { lat: lugar.lat, lon: lugar.lon, rotulo: lugar.nome.split(", ")[0] };
    setReferencia(local);
    await listarLinhasPerto(local);
  }

  async function buscarLinha(termo) {
    const linhas = (await api.buscarLinhas(termo)).map(linhaDaBusca);
    if (!linhas.length) {
      limpar("Nenhuma linha encontrada. Tente o número (ex.: 875A) ou um terminal (ex.: Lapa).");
      return;
    }
    const grupos = ordenarPorRelevancia(agruparPorLetreiro(linhas), termo);
    mostrarResultado("linhas", grupos, `${grupos.length} linha(s). Toque no destino para onde você vai:`);
  }

  function trocarModo(novo) {
    setModo(novo);
    limpar();
  }

  const escolher = (linha) => aoEscolherLinha(linha, referencia);
  const visiveis = resultado.itens.slice(0, mostrados);

  return (
    <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
      <Text style={estilos.titulo} accessibilityRole="header">
        QUAL ÔNIBUS{"\n"}VOCÊ VAI PEGAR?
      </Text>

      <Cartao escuro>
        <Rotulo claro>Mais rápido</Rotulo>
        <Text style={estilos.gpsTitulo}>Ônibus passando perto de você agora</Text>
        <Botao titulo="◎  Usar minha localização" aoTocar={usarMinhaLocalizacao} carregando={carregando === "gps"} style={{ marginTop: 14 }} />
        {permissaoGps ? (
          <AvisoPermissao
            titulo="Sem acesso à sua localização"
            texto={
              permissaoGps.podePedirDeNovo
                ? "O app usa o GPS só para mostrar os ônibus perto de você. Você também pode buscar por endereço, abaixo."
                : "Você negou o acesso antes. Para ver os ônibus perto de você, permita a localização nos Ajustes do iPhone, ou busque por endereço, abaixo."
            }
            podePedirDeNovo={permissaoGps.podePedirDeNovo}
            aoTentarDeNovo={usarMinhaLocalizacao}
          />
        ) : null}
      </Cartao>

      <View style={estilos.divisor}>
        <View style={estilos.divisorLinha} />
        <Text style={estilos.divisorTexto}>OU PROCURE POR</Text>
        <View style={estilos.divisorLinha} />
      </View>

      <Cartao>
        <View style={estilos.abas} accessibilityRole="tablist">
          {MODOS.map((m) => (
            <Pressable
              key={m.valor}
              onPress={() => trocarModo(m.valor)}
              accessibilityRole="tab"
              accessibilityState={{ selected: modo === m.valor }}
              style={[estilos.aba, modo === m.valor && estilos.abaAtiva]}
            >
              <Text style={[estilos.abaTexto, modo === m.valor && estilos.abaTextoAtiva]}>{m.rotulo}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={estilos.label}>{modo === "endereco" ? "Onde você está?" : "Número da linha ou terminal de destino"}</Text>
        <View style={estilos.campoLinha}>
          <TextInput
            style={estilos.campo}
            value={texto[modo]}
            onChangeText={(valor) => setTexto((atual) => ({ ...atual, [modo]: valor }))}
            placeholder={modo === "endereco" ? "Ex.: Av. Paulista, 1578" : "Ex.: 875A, Lapa, Aeroporto"}
            placeholderTextColor={cores.tintaSuave}
            returnKeyType="search"
            onSubmitEditing={buscar}
            autoCorrect={false}
            autoCapitalize={modo === "linha" ? "characters" : "sentences"}
            accessibilityLabel={modo === "endereco" ? "Endereço" : "Número ou destino da linha"}
          />
          <Botao titulo="Buscar" variante="escuro" aoTocar={buscar} carregando={carregando === "busca"} style={estilos.botaoBuscar} />
        </View>
        <Text style={estilos.dica}>
          {modo === "endereco"
            ? "Mostramos as linhas com ônibus passando perto desse lugar."
            : "A SPTrans não calcula rotas de um endereço a outro. Para saber qual linha passa perto de você, use a localização ou o endereço."}
        </Text>
      </Cartao>

      <Mensagem forte>{mensagem}</Mensagem>

      {visiveis.map((item) => {
        if (resultado.tipo === "perto") return <ItemPerto key={`${item.cl}`} dados={item} aoTocar={escolher} />;
        if (resultado.tipo === "lugares") return <ItemLugar key={`${item.lat},${item.lon}`} lugar={item} aoTocar={escolherLugar} />;
        return <ItemGrupo key={item.letreiro} grupo={item} aoTocar={escolher} />;
      })}

      {mostrados < resultado.itens.length ? (
        <Botao titulo="Mostrar mais linhas" variante="contorno" aoTocar={() => setMostrados((n) => n + POR_PAGINA)} />
      ) : null}

      <Text style={estilos.credito}>Dados: SPTrans (API Olho Vivo) · Mapas e endereços: © OpenStreetMap</Text>
    </ScrollView>
  );
}

function ItemPerto({ dados, aoTocar }) {
  const linha = linhaDaPosicao(dados);
  const [maisPerto] = dados.veiculos;
  const quantos = dados.veiculos.length;
  const distancia = formatarDistancia(maisPerto.distancia);
  return (
    <Pressable
      onPress={() => aoTocar(linha)}
      accessibilityRole="button"
      accessibilityLabel={`Linha ${linha.letreiro}, sentido ${linha.destino}, ônibus a ${distancia}`}
      style={({ pressed }) => [estilos.item, pressed && estilos.itemPressionado]}
    >
      <Placa texto={linha.letreiro} />
      <View style={estilos.itemCorpo}>
        <Text style={estilos.itemDestino}>{linha.destino}</Text>
        <Text style={estilos.itemExtra}>{quantos > 1 ? `${quantos} ônibus por perto` : `saindo de ${linha.origem}`}</Text>
      </View>
      <View style={estilos.itemMetrica}>
        <Text style={estilos.itemMetricaValor}>{distancia}</Text>
        <Text style={estilos.itemExtra}>daqui</Text>
      </View>
    </Pressable>
  );
}

function ItemLugar({ lugar, aoTocar }) {
  return (
    <Pressable onPress={() => aoTocar(lugar)} accessibilityRole="button" style={({ pressed }) => [estilos.item, estilos.itemColuna, pressed && estilos.itemPressionado]}>
      <Text style={estilos.lugarNome}>{lugar.nome.split(", ")[0]}</Text>
      <Text style={estilos.itemExtra}>{lugar.nome}</Text>
    </Pressable>
  );
}

function ItemGrupo({ grupo, aoTocar }) {
  const [primeiro] = grupo.sentidos;
  return (
    <View style={estilos.grupo}>
      <View style={estilos.grupoCabecalho}>
        <Placa texto={grupo.letreiro} />
        <Text style={estilos.grupoTerminais}>
          {primeiro.origem} ⇄ {primeiro.destino}
        </Text>
      </View>
      {grupo.sentidos.map((linha) => (
        <Pressable
          key={linha.cl}
          onPress={() => aoTocar(linha)}
          accessibilityRole="button"
          accessibilityLabel={`Linha ${linha.letreiro}, sentido ${linha.destino}`}
          style={({ pressed }) => [estilos.sentido, pressed && { borderColor: cores.ambarEscuro }]}
        >
          <Text style={estilos.sentidoSeta}>→</Text>
          <Text style={estilos.sentidoTexto}>{linha.destino}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 16, paddingBottom: 40 },
  titulo: { fontFamily: fontes.sinalForte, fontSize: 44, lineHeight: 44, color: cores.tinta, marginTop: 4, marginBottom: 16 },
  gpsTitulo: { fontFamily: fontes.sinal, fontSize: 27, lineHeight: 29, color: cores.branco, marginTop: 4 },

  divisor: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2, marginBottom: 14 },
  divisorLinha: { flex: 1, height: 1, backgroundColor: cores.linha },
  divisorTexto: { fontFamily: fontes.texto, fontSize: 13, letterSpacing: 1.2, color: cores.tintaSuave },

  abas: { flexDirection: "row", padding: 4, borderRadius: 12, backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.linha },
  aba: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  abaAtiva: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.linha },
  abaTexto: { fontFamily: fontes.textoNegrito, fontSize: 15, color: cores.tintaSuave },
  abaTextoAtiva: { color: cores.tinta },

  label: { fontFamily: fontes.textoNegrito, fontSize: 16, color: cores.tinta, marginTop: 14, marginBottom: 6 },
  campoLinha: { flexDirection: "row", gap: 8 },
  campo: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: cores.linha,
    borderRadius: 10,
    fontFamily: fontes.texto,
    fontSize: 17,
    color: cores.tinta,
    backgroundColor: cores.cartao,
  },
  botaoBuscar: { paddingHorizontal: 14 },
  dica: { fontFamily: fontes.texto, fontSize: 14, color: cores.tintaSuave, marginTop: 8, lineHeight: 20 },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 68,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.linha,
    backgroundColor: cores.cartao,
    ...sombra,
  },
  itemColuna: { flexDirection: "column", alignItems: "flex-start", gap: 2 },
  itemPressionado: { borderColor: cores.tinta, transform: [{ scale: 0.99 }] },
  itemCorpo: { flex: 1 },
  itemDestino: { fontFamily: fontes.sinal, fontSize: 21, lineHeight: 23, color: cores.tinta },
  itemExtra: { fontFamily: fontes.texto, fontSize: 14, color: cores.tintaSuave },
  itemMetrica: { alignItems: "flex-end" },
  itemMetricaValor: { fontFamily: fontes.sinal, fontSize: 25, color: cores.tinta },
  lugarNome: { fontFamily: fontes.textoNegrito, fontSize: 17, color: cores.tinta },

  grupo: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.linha,
    backgroundColor: cores.cartao,
    ...sombra,
  },
  grupoCabecalho: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 },
  grupoTerminais: { flex: 1, fontFamily: fontes.texto, fontSize: 14, color: cores.tintaSuave },
  sentido: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: cores.ambarSuave,
  },
  sentidoSeta: { fontFamily: fontes.sinalForte, fontSize: 20, color: cores.ambarEscuro },
  sentidoTexto: { flex: 1, fontFamily: fontes.sinal, fontSize: 19, color: cores.tinta },

  credito: { fontFamily: fontes.texto, fontSize: 13, color: cores.tintaSuave, textAlign: "center", marginTop: 20 },
});
