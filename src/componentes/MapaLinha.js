// Mapa da linha com react-native-maps (Apple Maps no iPhone, incluido no Expo Go).
// Mostra o usuario, os onibus da linha (verde = acessivel) e os pontos, quando existem.

import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { cores, fontes } from "../tema";

const REGIAO_SP = { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.12, longitudeDelta: 0.12 };

function Bolinha({ cor, tamanho }) {
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: cor,
        borderWidth: 2,
        borderColor: cores.branco,
      }}
    />
  );
}

export function MapaLinha({ referencia, veiculos, pontos, pontoEscolhido }) {
  const mapa = useRef(null);
  const enquadrado = useRef(false);

  // Enquadra uma vez, quando chegam os primeiros onibus: usuario + 3 onibus mais proximos (+ ponto).
  useEffect(() => {
    if (enquadrado.current || !mapa.current || !veiculos.length) return;
    const coordenadas = veiculos.slice(0, 3).map((v) => ({ latitude: v.py, longitude: v.px }));
    if (referencia) coordenadas.push({ latitude: referencia.lat, longitude: referencia.lon });
    if (pontoEscolhido) coordenadas.push({ latitude: pontoEscolhido.py, longitude: pontoEscolhido.px });
    mapa.current.fitToCoordinates(coordenadas, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
    enquadrado.current = true;
  }, [veiculos, referencia, pontoEscolhido]);

  return (
    <View>
      <MapView ref={mapa} style={estilos.mapa} initialRegion={REGIAO_SP} accessibilityLabel="Mapa com a sua posição, os ônibus da linha e os pontos">
        {pontos.map((p) => (
          <Marker key={`ponto-${p.cp}`} coordinate={{ latitude: p.py, longitude: p.px }} title={p.np} tracksViewChanges={false}>
            <Bolinha cor={cores.vermelho} tamanho={pontoEscolhido?.cp === p.cp ? 18 : 11} />
          </Marker>
        ))}
        {veiculos.map((v) => (
          <Marker
            key={`onibus-${v.p}`}
            coordinate={{ latitude: v.py, longitude: v.px }}
            title={`Ônibus ${v.p}`}
            description={v.a ? "Acessível" : undefined}
            tracksViewChanges={false}
          >
            <Bolinha cor={v.a ? cores.acessivel : cores.azul} tamanho={15} />
          </Marker>
        ))}
        {referencia ? (
          <Marker coordinate={{ latitude: referencia.lat, longitude: referencia.lon }} title={referencia.rotulo} tracksViewChanges={false}>
            <Bolinha cor={cores.roxo} tamanho={18} />
          </Marker>
        ) : null}
      </MapView>
      <View style={estilos.legenda}>
        <ItemLegenda cor={cores.roxo} texto="você" />
        <ItemLegenda cor={cores.azul} texto="ônibus" />
        <ItemLegenda cor={cores.acessivel} texto="acessível" />
        {pontos.length ? <ItemLegenda cor={cores.vermelho} texto="ponto" /> : null}
      </View>
    </View>
  );
}

function ItemLegenda({ cor, texto }) {
  return (
    <View style={estilos.itemLegenda}>
      <View style={[estilos.bolinhaLegenda, { backgroundColor: cor }]} />
      <Text style={estilos.textoLegenda}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  mapa: { height: 260, borderRadius: 10 },
  legenda: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8, marginHorizontal: 4 },
  itemLegenda: { flexDirection: "row", alignItems: "center", gap: 5 },
  bolinhaLegenda: { width: 11, height: 11, borderRadius: 6 },
  textoLegenda: { fontFamily: fontes.texto, fontSize: 14, color: cores.tintaSuave },
});
