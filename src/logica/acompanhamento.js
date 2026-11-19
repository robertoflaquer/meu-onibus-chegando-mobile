import { distanciaM, minutosAte } from "./util";

const MARGEM_MOVIMENTO_M = 20; // diferencas menores podem ser so imprecisao do GPS

export function medirVeiculos(lista, referencia, movimento) {
  if (!referencia) return lista.map((v) => ({ ...v, distancia: null, status: null }));

  return lista
    .map((v) => {
      const distancia = distanciaM(referencia, { lat: v.py, lon: v.px });
      const registro = movimento.get(v.p);
      let status = registro?.status ?? null;

      if (!registro) {
        movimento.set(v.p, { distancia, status });
      } else if (Math.abs(registro.distancia - distancia) > MARGEM_MOVIMENTO_M) {
        status = distancia < registro.distancia ? "aproximando" : "afastando";
        movimento.set(v.p, { distancia, status });
      }
      return { ...v, distancia, status };
    })
    .sort((a, b) => a.distancia - b.distancia);
}

export function lerChegadas(previsao) {
  if (!previsao) return [];
  return (previsao.p?.l ?? [])
    .flatMap((l) => l.vs)
    .map((v) => ({ ...v, minutos: minutosAte(previsao.hr, v.t) }))
    .sort((a, b) => a.minutos - b.minutos);
}

export function onibusEmDestaque(veiculos) {
  return veiculos.find((v) => v.status === "aproximando") ?? veiculos[0] ?? null;
}

export function ordenarPontos(pontos, referencia) {
  const comDistancia = pontos.map((p) => ({
    ...p,
    distancia: referencia ? distanciaM(referencia, { lat: p.py, lon: p.px }) : null,
  }));
  if (referencia) comDistancia.sort((a, b) => a.distancia - b.distancia);
  return comDistancia;
}

export function avisosPendentes({ veiculos, chegadas, limiteM, limiteMin, jaAvisados }) {
  const pendentes = [];

  if (limiteM > 0) {
    const alvo = veiculos.find((v) => v.status === "aproximando" && v.distancia <= limiteM);
    if (alvo && !jaAvisados.has(`distancia-${alvo.p}`)) {
      pendentes.push({ chave: `distancia-${alvo.p}`, tipo: "distancia", onibus: alvo });
    }
  }

  if (limiteMin > 0) {
    const alvo = chegadas.find((c) => c.minutos <= limiteMin);
    if (alvo && !jaAvisados.has(`minutos-${alvo.p}`)) {
      pendentes.push({ chave: `minutos-${alvo.p}`, tipo: "minutos", onibus: alvo });
    }
  }

  return pendentes;
}
