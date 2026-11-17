# Meu ônibus está chegando (mobile)

Aplicativo mobile em React Native (Expo) que usa o **GPS do celular** e a **API Olho Vivo da SPTrans** para mostrar quais ônibus estão passando perto de você em São Paulo, acompanhar a linha escolhida em tempo real e **avisar com notificação e vibração** quando o ônibus estiver chegando.

Projeto da Global Solution 2026.2, disciplina Cross-Platform Application Development (FIAP). Tema do desafio: Citizen Intelligence & Predictive Analytics, monitoramento da cidade para melhorar a qualidade de vida do cidadão.

**Vídeo de demonstração (celular real):** https://youtube.com/shorts/pFxn82x84cE

## O que o app faz

**1. Encontrar a linha**

| Forma | Como funciona |
|---|---|
| Usar minha localização | O GPS (`expo-location`) obtém sua posição e o app lista as linhas com ônibus passando a até 500 m (ou 1 km) agora |
| Endereço | Converte o endereço digitado em coordenadas e lista as linhas com ônibus passando perto dali |
| Número ou destino | Busca pelo número ou pelo terminal (ex.: `875A`, `Lapa`), com os dois sentidos agrupados |

**2. Acompanhar a linha**

- Distância do ônibus mais próximo até você, se ele está **se aproximando** ou **se afastando**, e uma trilha visual do ônibus vindo na sua direção.
- O GPS continua acompanhando sua posição enquanto o painel está aberto (`watchPositionAsync`), então a distância se ajusta se você estiver andando.
- Mapa com você, os ônibus da linha (verde = acessível) e os pontos.
- Previsão de chegada em minutos no seu ponto (o mais próximo é escolhido sozinho se estiver a até 800 m).
- Atualização a cada 20 segundos, pausada com o app em segundo plano.

**3. Receber o aviso**

- Por distância: quando um ônibus da linha estiver a 300 m, 500 m ou 1 km **e se aproximando**.
- Por tempo: quando faltarem 2, 5 ou 10 minutos para chegar ao ponto.
- O aviso **vibra** (`Vibration`), gera uma **notificação local** (`expo-notifications`) e mostra uma faixa na tela. Sem permissão de notificação, o app usa um `Alert` para o aviso não se perder.

**Permissões tratadas:** o GPS só é pedido quando você toca em "Usar minha localização". Se você negar, o app explica o que perde, oferece a busca por endereço e um botão para pedir de novo ou abrir os Ajustes do iPhone. O mesmo vale para as notificações.

**Acessibilidade:** fonte Atkinson Hyperlegible (feita para baixa visão), botões com área de toque grande, rótulos para leitor de tela e selo nos veículos acessíveis.

## Por que o app funciona assim

Testamos a API antes de definir o fluxo:

- **A lista de pontos por linha é incompleta**: em uma amostra de 25 linhas, 15 não tinham nenhum ponto cadastrado.
- **A posição dos ônibus é completa** (cerca de 10 mil veículos em tempo real). Por isso a busca "perto de mim" e o aviso por distância partem da posição dos ônibus, e a previsão por ponto é um complemento quando os pontos existem.
- **A API não calcula rotas** de um endereço a outro. O app deixa isso claro e oferece a busca por destino.

## Arquitetura

```
App (Expo)  ->  funções serverless no Vercel  ->  API Olho Vivo (SPTrans)
                (meu-onibus-chegando-web)      ->  Nominatim (OpenStreetMap)
```

O app usa as mesmas funções serverless da versão web do projeto. A API Olho Vivo exige um token, e os repositórios são públicos: assim o **token fica só no servidor**, nunca no código do app.

| Caminho | Função |
|---|---|
| `App.js` | Carrega as fontes, mostra o topo e alterna entre busca e painel |
| `src/telas/TelaBusca.js` | GPS, busca por endereço e por número ou destino |
| `src/telas/TelaPainel.js` | Painel da linha: atualização, distância, mapa, previsão e avisos |
| `src/logica/acompanhamento.js` | Regras puras: distância, aproximação, previsões e quando avisar |
| `src/logica/linhas.js`, `src/logica/util.js` | Normalização das linhas e cálculos (mesmo código da versão web) |
| `src/servicos/api.js` | Chamadas ao servidor |
| `src/servicos/localizacao.js` | GPS e permissão de localização |
| `src/servicos/avisos.js` | Notificação local, vibração e permissão de notificação |
| `src/componentes/` | Placa da linha, botões, trilha, mapa e aviso de permissão |
| `src/config.js`, `src/tema.js` | Endereço do servidor, intervalos, cores e fontes |

## Como executar

Pré-requisitos: Node.js 20 ou superior e o app **Expo Go** no celular (App Store ou Play Store).

```bash
npm install
npx expo start
```

Leia o QR Code com a câmera (iPhone) ou com o Expo Go (Android). O celular e o computador precisam estar na mesma rede Wi-Fi; se não for possível, use `npx expo start --tunnel`.

Não é preciso token: o app usa o servidor já publicado em https://meu-onibus-chegando-web.vercel.app. Para usar outro servidor, crie um arquivo `.env` com `EXPO_PUBLIC_API_URL=https://seu-servidor`.

## Créditos e dados

- Linhas, posições e previsões: **SPTrans, API Olho Vivo** (https://www.sptrans.com.br/desenvolvedores/). O crédito também aparece nas telas do app.
- Busca de endereços: © OpenStreetMap (Nominatim).

## Integrantes

Veja `PARTICIPANTES.txt`.
