// Painel de uma linha: onibus em tempo real, distancia ate o usuario, previsao no ponto e avisos.
//
// GPS: se o usuario usou a localizacao, o app acompanha a posicao enquanto ele se desloca.
// Avisos: por distancia (onibus se aproximando) e, quando a SPTrans informa os pontos,
// por minutos ate a chegada. Vibram e geram notificacao local (ou alerta, sem permissao).

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as api from "../servicos/api";
import { dispararAviso, garantirPermissaoNotificacao } from "../servicos/avisos";
import {
  acompanharPosicao,
  garantirPermissaoLocalizacao,
  obterPosicaoAtual,
  ROTULO_USUARIO,
} from "../servicos/localizacao";
import { avisosPendentes, lerChegadas, medirVeiculos, onibusEmDestaque, ordenarPontos } from "../logica/acompanhamento";
import { formatarDistancia, textoMinutos } from "../logica/util";
import { INTERVALO_ATUALIZACAO_MS } from "../config";
import { AvisoPermissao } from "../componentes/AvisoPermissao";
import { MapaLinha } from "../componentes/MapaLinha";
import { Trilha } from "../componentes/Trilha";
import { Botao, Cartao, Chip, Mensagem, Placa, SeloAcessivel, SeletorOpcoes, TituloCartao } from "../componentes/ui";
import { cores, fontes } from "../tema";

const RAIO_PONTO_AUTOMATICO_M = 800; // escolhe sozinho o ponto mais proximo se estiver ate aqui
const PONTOS_VISIVEIS = 4;
const MAX_ONIBUS_NA_LISTA = 5;

const OPCOES_DISTANCIA = [
  { valor: 0, rotulo: "Não" },
  { valor: 300, rotulo: "300 m" },
  { valor: 500, rotulo: "500 m" },
  { valor: 1000, rotulo: "1 km" },
];
const OPCOES_MINUTOS = [
  { valor: 0, rotulo: "Não" },
  { valor: 2, rotulo: "2 min" },
  { valor: 5, rotulo: "5 min" },
  { valor: 10, rotulo: "10 min" },
];

const descreverLocal = (local) => (local.rotulo === ROTULO_USUARIO ? "você" : local.rotulo);

export function TelaPainel({ linha, referenciaInicial, aoVoltar }) {
  const [referencia, setReferencia] = useState(referenciaInicial);
  const [veiculos, setVeiculos] = useState([]);
  const [pontos, setPontos] = useState(null); // null = carregando
  const [ponto, setPonto] = useState(null);
  const [chegadas, setChegadas] = useState([]);
  const [hora, setHora] = useState(null);
  const [situacao, setSituacao] = useState("carregando"); // carregando | ok | erro
  const [limiteM, setLimiteM] = useState(500);
  const [limiteMin, setLimiteMin] = useState(5);
  const [faixaAviso, setFaixaAviso] = useState(null);
  const [notificacoes, setNotificacoes] = useState(null); // { concedida, podePedirDeNovo }
  const [permissaoGps, setPermissaoGps] = useState(null);
  const [verTodosPontos, setVerTodosPontos] = useState(false);

  const movimento = useRef(new Map());
  const jaAvisados = useRef(new Set());
  const pontoAutomaticoFeito = useRef(false);

  // A atualizacao periodica le sempre os valores mais recentes por esta referencia.
  const atual = useRef({});
  atual.current = { referencia, ponto, limiteM, limiteMin, notificacoes };

  const atualizar = useCallback(async () => {
    const { referencia: local, ponto: meuPonto, limiteM: metros, limiteMin: minutos, notificacoes: notif } = atual.current;
    try {
      const [posicao, previsao] = await Promise.all([
        api.posicaoDaLinha(linha.cl),
        meuPonto ? api.previsao(meuPonto.cp, linha.cl) : null,
      ]);
      const medidos = medirVeiculos(posicao.vs ?? [], local, movimento.current);
      const novasChegadas = lerChegadas(previsao);
      setVeiculos(medidos);
      setChegadas(novasChegadas);
      setHora(posicao.hr);
      setSituacao("ok");

      const pendentes = avisosPendentes({
        veiculos: medidos,
        chegadas: novasChegadas,
        limiteM: local ? metros : 0,
        limiteMin: meuPonto ? minutos : 0,
        jaAvisados: jaAvisados.current,
      });
      for (const aviso of pendentes) {
        jaAvisados.current.add(aviso.chave);
        const texto =
          aviso.tipo === "distancia"
            ? `O ${linha.letreiro} está a ${formatarDistancia(aviso.onibus.distancia)} de ${descreverLocal(local)} e se aproximando.`
            : `O ${linha.letreiro} chega ao ponto ${meuPonto.np} em ${textoMinutos(aviso.onibus.minutos)}.`;
        setFaixaAviso(texto);
        dispararAviso("Seu ônibus está chegando", texto, Boolean(notif?.concedida));
      }
    } catch {
      setSituacao("erro");
    }
  }, [linha]);

  // Atualiza a cada 20 s; pausa com o app em segundo plano para poupar bateria e dados.
  useEffect(() => {
    let intervalo = null;
    const iniciar = () => {
      atualizar();
      intervalo = setInterval(atualizar, INTERVALO_ATUALIZACAO_MS);
    };
    const parar = () => {
      clearInterval(intervalo);
      intervalo = null;
    };
    iniciar();
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active" && !intervalo) iniciar();
      if (estado !== "active") parar();
    });
    return () => {
      parar();
      assinatura.remove();
    };
  }, [atualizar]);

  // Trocar de ponto atualiza na hora.
  useEffect(() => {
    if (ponto) atualizar();
  }, [ponto, atualizar]);

  // Pontos da linha (muitas linhas nao tem pontos cadastrados na API).
  useEffect(() => {
    let ativo = true;
    api
      .paradasDaLinha(linha.cl)
      .then((lista) => ativo && setPontos(lista))
      .catch(() => ativo && setPontos([]));
    return () => {
      ativo = false;
    };
  }, [linha.cl]);

  // Escolhe sozinho o ponto mais proximo, uma vez, se o usuario estiver perto dele.
  useEffect(() => {
    if (pontoAutomaticoFeito.current || !pontos?.length || !referencia) return;
    pontoAutomaticoFeito.current = true;
    const [maisPerto] = ordenarPontos(pontos, referencia);
    if (maisPerto.distancia <= RAIO_PONTO_AUTOMATICO_M) setPonto(maisPerto);
  }, [pontos, referencia]);

  // GPS continuo enquanto o painel esta aberto (so quando a referencia e o proprio usuario).
  const seguindoGps = referencia?.rotulo === ROTULO_USUARIO;
  useEffect(() => {
    if (!seguindoGps) return undefined;
    let ativo = true;
    let assinatura = null;
    acompanharPosicao((nova) => setReferencia(nova))
      .then((s) => (ativo ? (assinatura = s) : s.remove()))
      .catch(() => {});
    return () => {
      ativo = false;
      assinatura?.remove();
    };
  }, [seguindoGps]);

  // Pede permissao de notificacao ao abrir o painel: o aviso ja vem ligado (500 m).
  const verificarNotificacoes = useCallback(async () => {
    try {
      setNotificacoes(await garantirPermissaoNotificacao());
    } catch {
      setNotificacoes({ concedida: false, podePedirDeNovo: false });
    }
  }, []);
  useEffect(() => {
    verificarNotificacoes();
  }, [verificarNotificacoes]);

  async function usarMinhaLocalizacao() {
    try {
      const permissao = await garantirPermissaoLocalizacao();
      if (!permissao.concedida) {
        setPermissaoGps({ podePedirDeNovo: permissao.podePedirDeNovo });
        return;
      }
      setPermissaoGps(null);
      movimento.current.clear();
      setReferencia(await obterPosicaoAtual());
      atualizar();
    } catch {
      setPermissaoGps({ podePedirDeNovo: true });
    }
  }

  function mudarAviso(setter, valor) {
    setter(valor);
    jaAvisados.current.clear();
  }

  const destaque = onibusEmDestaque(veiculos);
  const pontosOrdenados = pontos ? ordenarPontos(pontos, referencia) : [];
  const pontoComDistancia = ponto ? pontosOrdenados.find((p) => p.cp === ponto.cp) ?? ponto : null;

  return (
    <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo}>
      <Pressable onPress={aoVoltar} accessibilityRole="button" style={estilos.voltar} hitSlop={8}>
        <Text style={estilos.voltarTexto}>‹  Trocar de linha</Text>
      </Pressable>

      {/* Letreiro */}
      <View style={estilos.letreiro} accessibilityRole="header" accessibilityLabel={`Linha ${linha.letreiro}, sentido ${linha.destino}`}>
        <View style={estilos.letreiroNumero}>
          <Placa texto={linha.letreiro} grande />
        </View>
        <View style={estilos.letreiroTexto}>
          <Text style={estilos.letreiroDestino}>{linha.destino}</Text>
          <Text style={estilos.letreiroOrigem}>saindo de {linha.origem}</Text>
        </View>
      </View>

      {/* Aviso disparado */}
      {faixaAviso ? (
        <Pressable onPress={() => setFaixaAviso(null)} style={estilos.faixaAviso} accessibilityRole="alert" accessibilityHint="Toque para fechar">
          <Text style={estilos.faixaAvisoTexto}>🔔  {faixaAviso}</Text>
        </Pressable>
      ) : null}

      {/* Destaque: distancia */}
      <Cartao>
        <Destaque
          situacao={situacao}
          veiculos={veiculos}
          destaque={destaque}
          referencia={referencia}
          permissaoGps={permissaoGps}
          aoUsarLocalizacao={usarMinhaLocalizacao}
        />
      </Cartao>

      {/* Alarme */}
      <Cartao style={estilos.alarme}>
        <Text style={estilos.alarmeTitulo}>🔔  Me avise quando o ônibus estiver a</Text>
        <SeletorOpcoes opcoes={OPCOES_DISTANCIA} valor={limiteM} aoMudar={(v) => mudarAviso(setLimiteM, v)} rotulo="Distância para avisar" />
        {ponto ? (
          <>
            <Text style={[estilos.alarmeTitulo, { marginTop: 14 }]}>ou quando faltar para chegar ao ponto</Text>
            <SeletorOpcoes opcoes={OPCOES_MINUTOS} valor={limiteMin} aoMudar={(v) => mudarAviso(setLimiteMin, v)} rotulo="Minutos para avisar" />
          </>
        ) : null}
        {!referencia ? <Mensagem>O aviso por distância precisa da sua localização.</Mensagem> : null}
        {notificacoes && !notificacoes.concedida ? (
          <AvisoPermissao
            titulo="Notificações desligadas"
            texto="Você ainda recebe o aviso com vibração e alerta na tela. Para receber a notificação do iPhone, permita as notificações."
            podePedirDeNovo={notificacoes.podePedirDeNovo}
            aoTentarDeNovo={verificarNotificacoes}
          />
        ) : null}
      </Cartao>

      {/* Mapa */}
      <Cartao style={estilos.cartaoMapa}>
        <MapaLinha referencia={referencia} veiculos={veiculos} pontos={pontos ?? []} pontoEscolhido={ponto} />
      </Cartao>

      {/* Previsao no ponto */}
      <Cartao>
        <TituloCartao>Previsão no seu ponto</TituloCartao>
        {pontos === null ? <Mensagem>Carregando os pontos desta linha...</Mensagem> : null}
        {pontos?.length === 0 ? (
          <Mensagem>A SPTrans não informa os pontos desta linha. Acompanhe pela distância do ônibus até você, no topo.</Mensagem>
        ) : null}

        {pontoComDistancia ? (
          <>
            <View style={estilos.pontoEscolhido}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.pontoNome}>{pontoComDistancia.np}</Text>
                {pontoComDistancia.distancia != null ? (
                  <Text style={estilos.textoSuave}>a {formatarDistancia(pontoComDistancia.distancia)} de {descreverLocal(referencia)}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => setPonto(null)} accessibilityRole="button" hitSlop={8}>
                <Text style={estilos.link}>Trocar</Text>
              </Pressable>
            </View>
            {chegadas.length ? (
              chegadas.map((c) => (
                <View key={`${c.p}-${c.t}`} style={estilos.chegada}>
                  <View style={estilos.chegadaMinutos}>
                    <Text style={estilos.chegadaMinutosTexto}>{textoMinutos(c.minutos)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={estilos.textoSuave}>Chegada às {c.t} · ônibus {c.p}</Text>
                    {c.a ? <SeloAcessivel /> : null}
                  </View>
                </View>
              ))
            ) : (
              <Mensagem>Sem previsão para esta linha neste ponto agora.</Mensagem>
            )}
          </>
        ) : null}

        {pontos?.length && !ponto ? (
          <>
            <Mensagem>Escolha o ponto onde você vai embarcar:</Mensagem>
            {(verTodosPontos ? pontosOrdenados : pontosOrdenados.slice(0, PONTOS_VISIVEIS)).map((p) => (
              <Pressable key={p.cp} onPress={() => setPonto(p)} accessibilityRole="button" style={({ pressed }) => [estilos.opcaoPonto, pressed && { borderColor: cores.tinta }]}>
                <Text style={estilos.pontoNome}>{p.np}</Text>
                <Text style={estilos.textoSuave}>
                  {p.ed}
                  {p.distancia != null ? ` · a ${formatarDistancia(p.distancia)}` : ""}
                </Text>
              </Pressable>
            ))}
            {!verTodosPontos && pontosOrdenados.length > PONTOS_VISIVEIS ? (
              <Pressable onPress={() => setVerTodosPontos(true)} accessibilityRole="button" hitSlop={8}>
                <Text style={[estilos.link, { marginTop: 6 }]}>Ver todos os {pontosOrdenados.length} pontos</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </Cartao>

      {/* Onibus mais proximos */}
      <Cartao>
        <TituloCartao>Ônibus mais próximos</TituloCartao>
        {veiculos.length ? (
          veiculos.slice(0, MAX_ONIBUS_NA_LISTA).map((v) => (
            <View key={v.p} style={estilos.onibus}>
              {v.distancia != null ? <Text style={estilos.onibusDistancia}>{formatarDistancia(v.distancia)}</Text> : null}
              <Text style={[estilos.textoSuave, { flex: 1 }]}>ônibus {v.p}</Text>
              <Chip status={v.status} />
              {v.a ? <SeloAcessivel /> : null}
            </View>
          ))
        ) : (
          <Mensagem>{situacao === "carregando" ? "Carregando..." : "Nenhum ônibus circulando agora."}</Mensagem>
        )}
      </Cartao>

      <AoVivo situacao={situacao} hora={hora} />
      <Text style={estilos.credito}>Dados: SPTrans (API Olho Vivo)</Text>
    </ScrollView>
  );
}

function Destaque({ situacao, veiculos, destaque, referencia, permissaoGps, aoUsarLocalizacao }) {
  if (situacao === "carregando") {
    return (
      <View style={estilos.carregando}>
        <ActivityIndicator color={cores.tinta} />
        <Text style={estilos.textoSuave}>Procurando os ônibus desta linha...</Text>
      </View>
    );
  }
  if (!veiculos.length) {
    return <Mensagem forte>{situacao === "erro" ? "Não foi possível atualizar agora. Tentando de novo..." : "Nenhum ônibus desta linha circulando agora."}</Mensagem>;
  }
  if (!referencia) {
    return (
      <>
        <Text style={estilos.destaqueValor}>{veiculos.length}</Text>
        <Text style={estilos.textoSuave}>ônibus desta linha circulando agora.</Text>
        <Botao titulo="◎  Ver a distância até mim" aoTocar={aoUsarLocalizacao} style={{ marginTop: 12 }} />
        {permissaoGps ? (
          <AvisoPermissao
            titulo="Sem acesso à sua localização"
            texto="Sem o GPS o app não consegue medir a distância do ônibus até você."
            podePedirDeNovo={permissaoGps.podePedirDeNovo}
            aoTentarDeNovo={aoUsarLocalizacao}
          />
        ) : null}
      </>
    );
  }
  return (
    <View accessible accessibilityLabel={`Ônibus mais próximo a ${formatarDistancia(destaque.distancia)} de ${descreverLocal(referencia)}`}>
      <View style={estilos.destaqueTopo}>
        <Text style={estilos.destaqueValor}>{formatarDistancia(destaque.distancia)}</Text>
        <Chip status={destaque.status} />
      </View>
      <Text style={estilos.textoSuave}>
        até {descreverLocal(referencia)} · ônibus {destaque.p}
        {destaque.a ? " (acessível)" : ""}
      </Text>
      <Trilha distancia={destaque.distancia} rotuloDestino={descreverLocal(referencia)} />
    </View>
  );
}

function AoVivo({ situacao, hora }) {
  const opacidade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulso = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, { toValue: 0.25, duration: 800, useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulso.start();
    return () => pulso.stop();
  }, [opacidade]);

  const texto =
    situacao === "erro"
      ? "Sem conexão. Tentando de novo em 20 s"
      : hora
        ? `Ao vivo · atualizado às ${hora}, de novo em 20 s`
        : "Conectando...";
  return (
    <View style={estilos.aoVivo}>
      <Animated.View style={[estilos.pontoVivo, { opacity: opacidade }]} />
      <Text style={estilos.textoSuave}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 16, paddingBottom: 40 },
  textoSuave: { fontFamily: fontes.texto, fontSize: 15, color: cores.tintaSuave },
  link: { fontFamily: fontes.textoNegrito, fontSize: 15, color: cores.ambarEscuro, textDecorationLine: "underline" },

  voltar: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginBottom: 6 },
  voltarTexto: { fontFamily: fontes.textoNegrito, fontSize: 17, color: cores.tinta },

  letreiro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: cores.tinta,
  },
  letreiroNumero: { paddingRight: 14, borderRightWidth: 2, borderRightColor: "rgba(255,180,0,0.35)" },
  letreiroTexto: { flex: 1 },
  letreiroDestino: { fontFamily: fontes.sinal, fontSize: 26, lineHeight: 28, color: cores.ambar },
  letreiroOrigem: { fontFamily: fontes.texto, fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  faixaAviso: { padding: 14, marginBottom: 14, borderRadius: 14, backgroundColor: cores.ambar },
  faixaAvisoTexto: { fontFamily: fontes.textoNegrito, fontSize: 16, color: cores.tinta, lineHeight: 22 },

  carregando: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60 },
  destaqueTopo: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  destaqueValor: { fontFamily: fontes.sinalForte, fontSize: 60, lineHeight: 62, color: cores.tinta },

  alarme: { borderLeftWidth: 5, borderLeftColor: cores.ambar },
  alarmeTitulo: { fontFamily: fontes.textoNegrito, fontSize: 16, color: cores.tinta },

  cartaoMapa: { padding: 6 },

  pontoEscolhido: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: cores.vermelho,
  },
  pontoNome: { fontFamily: fontes.textoNegrito, fontSize: 16, color: cores.tinta },
  opcaoPonto: {
    padding: 12,
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: cores.linha,
    backgroundColor: cores.cartao,
  },
  chegada: { flexDirection: "row", alignItems: "center", gap: 14, padding: 10, marginTop: 6, borderRadius: 10, backgroundColor: cores.fundo },
  chegadaMinutos: { minWidth: 86, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: cores.tinta, alignItems: "center" },
  chegadaMinutosTexto: { fontFamily: fontes.sinalForte, fontSize: 24, color: cores.ambar },

  onibus: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, padding: 10, marginTop: 6, borderRadius: 10, backgroundColor: cores.fundo },
  onibusDistancia: { fontFamily: fontes.sinal, fontSize: 21, color: cores.tinta, minWidth: 64 },

  aoVivo: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  pontoVivo: { width: 8, height: 8, borderRadius: 4, backgroundColor: cores.vermelho },
  credito: { fontFamily: fontes.texto, fontSize: 13, color: cores.tintaSuave, textAlign: "center", marginTop: 10 },
});
