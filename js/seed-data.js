// =====================================================================
// seed-data.js — provas padrão de Alívio de Tensão
// Usadas pelo botão "Carregar provas padrão" do administrador.
// =====================================================================

window.PROVAS_SEED = [
  {
    "codigo": "ATT4-1",
    "subarea": "alivio_termico",
    "titulo": "Prova ATT 4 — Parte 1",
    "descricao": "Questões 1 a 10 da planilha PROVA DE ATT 4 RUMO_004 - Rev3, adaptadas para o modelo objetivo do sistema.",
    "nota_minima": 7,
    "questoes": [
      {
        "ordem": 1,
        "enunciado": "Qual é o procedimento que determina os serviços de ATT na RUMO? (Marcar com \"X\" a ÚNICA resposta CORRETA)",
        "alternativas": [
          {
            "id": "a",
            "texto": "Nenhum;"
          },
          {
            "id": "b",
            "texto": "ENG-FRM-Limites na Rumo;"
          },
          {
            "id": "c",
            "texto": "ENG-ETS - E0011 - Limistes necessários para a linha ficar boa na RUMO;"
          },
          {
            "id": "d",
            "texto": "MAN-VP-L-PRO-TR-0036-01 - Alívio De Tensões Térmicas Em Trilhos;"
          },
          {
            "id": "e",
            "texto": "Nenhuma resposta anterior."
          }
        ],
        "correta": "d",
        "justificativa": "Gabarito da planilha: alternativa d."
      },
      {
        "ordem": 2,
        "enunciado": "Qual é o procedimento que determina os limites de temperatura para serviços de trilho na RUMO?",
        "alternativas": [
          {
            "id": "a",
            "texto": "Qualquer coisa, tanto faz, como tanto fez!!!"
          },
          {
            "id": "b",
            "texto": "Escolher a temperatura conforme que sempre foi usada;"
          },
          {
            "id": "c",
            "texto": "ENG-ETS-ON-T001 - Temperaturas de Serviço na Ferrovia;"
          },
          {
            "id": "d",
            "texto": "ES-SPE-070-R4 - Temperaturas neutras de referência para serviços de trilhos;"
          },
          {
            "id": "e",
            "texto": "Nenhum."
          }
        ],
        "correta": "d",
        "justificativa": "Gabarito da planilha: alternativa d."
      },
      {
        "ordem": 3,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) Calor no trilho faz com que ele dilate e diminua de tamanho;\nB) Frio no trilho faz com que ele contraia e diminua de tamanho;\nC) Frio no trilho faz com que ele dilate e diminua de tamanho;\nD) Calor no trilho faz com que ele contraia e aumente de tamanho;\nE) Calor no trilho faz com que ele dilate e aumente de tamanho;",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: C - C - E - E - C"
          },
          {
            "id": "b",
            "texto": "Sequência: E - C - E - E - C"
          },
          {
            "id": "c",
            "texto": "Sequência: E - E - E - E - C"
          },
          {
            "id": "d",
            "texto": "Sequência: E - C - C - E - C"
          },
          {
            "id": "e",
            "texto": "Sequência: E - C - E - C - C"
          }
        ],
        "correta": "b",
        "justificativa": "Gabarito da planilha: sequência E-C-E-E-C."
      },
      {
        "ordem": 4,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) ATT significa Alívio de Tensões Térmicas;\nB) FTN significa Faixa de Temperatura Negativa;\nC) TN significa a Temperatura Neutra dos Trilhos;\nD) VERSE é um carro;\nE) Faixa de Temperatura Neutra é a Temperatura Neutra + ou - 5°C.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: E - E - C - E - C"
          },
          {
            "id": "b",
            "texto": "Sequência: C - C - C - E - C"
          },
          {
            "id": "c",
            "texto": "Sequência: C - E - C - E - C"
          },
          {
            "id": "d",
            "texto": "Sequência: C - E - E - E - C"
          },
          {
            "id": "e",
            "texto": "Sequência: C - E - C - C - C"
          }
        ],
        "correta": "c",
        "justificativa": "Gabarito da planilha: sequência C-E-C-E-C."
      },
      {
        "ordem": 5,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) O ATT deve ser feito em linhas novas, na instalação de TLS e quando o VERSE apontar;\nB) É importante passarmos o VERSE nas cristas e vales do perfil longitudinal da linha;\nC) É muito importante, colocar a mão embaixo do trilho;\nD) É muito importante que a turma seja homologada para fazer serviços de ATT;\nE) É proibido usar marreta que não seja de broze para aliviar o trilho.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: E - C - E - C - C"
          },
          {
            "id": "b",
            "texto": "Sequência: C - E - E - C - C"
          },
          {
            "id": "c",
            "texto": "Sequência: C - C - C - C - C"
          },
          {
            "id": "d",
            "texto": "Sequência: C - C - E - C - C"
          },
          {
            "id": "e",
            "texto": "Sequência: C - C - E - E - C"
          }
        ],
        "correta": "d",
        "justificativa": "Gabarito da planilha: sequência C-C-E-C-C."
      },
      {
        "ordem": 6,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) Flambagem em reta tem a forma de C;\nB) Flambagem em curva tem forma de S;\nC) Flambagem ocorre com pouquíssima frequência em pontos fixos;\nD) Flambagem não deixa marcas nos trilhos de caminhamento e arraste de dormentes;\nE) Se tivermos um desalinhamento provocado pela flambagem >128mm na corda de 20m devemos interditar a linha.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: C - E - E - E - C"
          },
          {
            "id": "b",
            "texto": "Sequência: E - C - E - E - C"
          },
          {
            "id": "c",
            "texto": "Sequência: E - E - C - E - C"
          },
          {
            "id": "d",
            "texto": "Sequência: E - E - E - C - C"
          },
          {
            "id": "e",
            "texto": "Sequência: E - E - E - E - C"
          }
        ],
        "correta": "e",
        "justificativa": "Gabarito da planilha: sequência E-E-E-E-C."
      },
      {
        "ordem": 7,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) Flambagem é muito fácil de prever;\nB) Fratura só acontece devido a problemas nos vagões;\nC) Fratura não é detectada por DTQ, nem circuito de via;\nD) O Verse mede a STF, que é a temperatura onde o trilho não terá nenhum esforço;\nE) Junta de dilatação não permite o caminhamento do trilho.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: E - E - E - C - E"
          },
          {
            "id": "b",
            "texto": "Sequência: C - E - E - C - E"
          },
          {
            "id": "c",
            "texto": "Sequência: E - C - E - C - E"
          },
          {
            "id": "d",
            "texto": "Sequência: E - E - C - C - E"
          },
          {
            "id": "e",
            "texto": "Sequência: E - E - E - E - E"
          }
        ],
        "correta": "a",
        "justificativa": "Gabarito da planilha: sequência E-E-E-C-E."
      },
      {
        "ordem": 8,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) Amplitude térmica não provoca tensões nos trilhos.\nB) Quanto maior a amplitude térmica maior são as tensões geradas nos trilhos\nC) Para uma temperatura mínima de 10°C e uma temperatura máxima de 60°C, a amplitude térmica é de 50°C.\nD) Para uma temperatura mínima de -5°C e uma temperatura máxima de 50°C, a amplitude térmica é de 55°C.\nE) Para uma temperatura mínima de -5°C e uma temperatura máxima de 5°C, a amplitude térmica é de 5°C.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: C - C - C - C - E"
          },
          {
            "id": "b",
            "texto": "Sequência: E - C - C - C - E"
          },
          {
            "id": "c",
            "texto": "Sequência: E - E - C - C - E"
          },
          {
            "id": "d",
            "texto": "Sequência: E - C - E - C - E"
          },
          {
            "id": "e",
            "texto": "Sequência: E - C - C - E - E"
          }
        ],
        "correta": "b",
        "justificativa": "Gabarito da planilha: sequência E-C-C-C-E."
      },
      {
        "ordem": 9,
        "enunciado": "Informação para a questão: Temperatura Neutra = 33°C.\nQual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) A Faixa de Temperatura nesse local será de 23°C a 43°C;\nB) A Faixa de Temperatura nesse local será de 30°C a 35°C;\nC) Qualquer serviço feito acima de 39°C estará acima da Faixa de Temperatura;\nD) Qualquer serviço feito abaixo de 27°C estará abaixo da Faixa de Temperatura;\nE) Qualquer serviço feito dentro da faixa de 30°C a 35°C, estará dentro da Faixa.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: C - E - C - C - C"
          },
          {
            "id": "b",
            "texto": "Sequência: E - C - C - C - C"
          },
          {
            "id": "c",
            "texto": "Sequência: E - E - C - C - C"
          },
          {
            "id": "d",
            "texto": "Sequência: E - E - E - C - C"
          },
          {
            "id": "e",
            "texto": "Sequência: E - E - C - E - C"
          }
        ],
        "correta": "c",
        "justificativa": "Gabarito da planilha: sequência E-E-C-C-C."
      },
      {
        "ordem": 10,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) É melhor fraturar do que flambar;\nB) Só é permitido trabalhar com temperatura caindo; quando não usar tensor;\nC) É ótimo trabalhar acima da faixa de temperatura;\nD) Tensor hidráulico é usado abaixo da faixa e com temperatura caindo;\nE) O termômetro deve ficar exposto ao sol.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: E - E - E - C - E"
          },
          {
            "id": "b",
            "texto": "Sequência: C - C - E - C - E"
          },
          {
            "id": "c",
            "texto": "Sequência: C - E - C - C - E"
          },
          {
            "id": "d",
            "texto": "Sequência: C - E - E - C - E"
          },
          {
            "id": "e",
            "texto": "Sequência: C - E - E - E - E"
          }
        ],
        "correta": "d",
        "justificativa": "Gabarito da planilha: sequência C-E-E-C-E."
      }
    ]
  },
  {
    "codigo": "ATT4-2",
    "subarea": "alivio_termico",
    "titulo": "Prova ATT 4 — Parte 2",
    "descricao": "Questões 11 a 20 da planilha PROVA DE ATT 4 RUMO_004 - Rev3, incluindo análise de gráficos, deslocamento e tensor hidráulico.",
    "nota_minima": 7,
    "questoes": [
      {
        "ordem": 1,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) Trilho curto é aquele que movimenta TODA a sua extenção;\nB) Trilho curto é aquele que tem junta numa das extremidadas;\nC) TLS é aquele que tem uma grande região com os esforços balanceados;\nD) TCS é o trilho que sempre terá menos que 600 metros;\nE) TLS é o trilho que tem no mínimo 2 vezes o comprimento de movimentação;",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: E - E - C - E - C"
          },
          {
            "id": "b",
            "texto": "Sequência: C - C - C - E - C"
          },
          {
            "id": "c",
            "texto": "Sequência: C - E - E - E - C"
          },
          {
            "id": "d",
            "texto": "Sequência: C - E - C - C - C"
          },
          {
            "id": "e",
            "texto": "Sequência: C - E - C - E - C"
          }
        ],
        "correta": "e",
        "justificativa": "Gabarito da planilha: sequência C-E-C-E-C."
      },
      {
        "ordem": 2,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) Processo de meia barra é aquele que faz o alívio em apenas um sentido;\nB) Processo de barra inteira é aquele que faz o alívio em apenas um sentido;\nC) Existem 2 principais tipos de modo de fazer alívio, forçado e natural;\nD) O método forçado é feito sem o uso de tensor hidráulico;\nE) Todas estão erradas.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: E - C - C - E - E"
          },
          {
            "id": "b",
            "texto": "Sequência: C - C - C - E - E"
          },
          {
            "id": "c",
            "texto": "Sequência: E - E - C - E - E"
          },
          {
            "id": "d",
            "texto": "Sequência: E - C - E - E - E"
          },
          {
            "id": "e",
            "texto": "Sequência: E - C - C - C - E"
          }
        ],
        "correta": "a",
        "justificativa": "Gabarito da planilha: sequência E-C-C-E-E."
      },
      {
        "ordem": 3,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) Trilho topado deve ser cortado de policorte de qualquer forma;\nB) O uso de policorte é bom sem o bracinho;\nC) O corte com maçarico deve ser iniciado pelo boleto, depois pela alma e por último o patim;\nD) Não é necessário se preocupar com o perfil longitudinal da linha para fazer ATT;\nE) Os pontos de VERSE dentro da faixa da FTN são obrigatórios a execução de ATT;",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: C - E - C - E - E"
          },
          {
            "id": "b",
            "texto": "Sequência: E - E - C - E - E"
          },
          {
            "id": "c",
            "texto": "Sequência: E - C - C - E - E"
          },
          {
            "id": "d",
            "texto": "Sequência: E - E - E - E - E"
          },
          {
            "id": "e",
            "texto": "Sequência: E - E - C - C - E"
          }
        ],
        "correta": "b",
        "justificativa": "Gabarito da planilha: sequência E-E-C-E-E."
      },
      {
        "ordem": 4,
        "enunciado": "Gráficos do perfil longitudinal para análise:\nGráfico a: [imagem:assets/provas-att4/grafico-a.png]\nGráfico b: [imagem:assets/provas-att4/grafico-b.png]\nGráfico c: [imagem:assets/provas-att4/grafico-c.png]\nGráfico d - com tensor: [imagem:assets/provas-att4/grafico-d.png]\nQual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) O gráfico \"a\" é melhor fazer o processo da meia barra;\nB) O gráfico \"b\" é melhor fazer o processo de meia barra;\nC) O gráfico \"c\" pode ser feito pelos dois processos;\nD) O gráfico \"d\" só pode ser feito pelo metodo da barra inteira;\nE) Todos acima estão errados.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: C - C - C - E - E"
          },
          {
            "id": "b",
            "texto": "Sequência: E - E - C - E - E"
          },
          {
            "id": "c",
            "texto": "Sequência: E - C - C - E - E"
          },
          {
            "id": "d",
            "texto": "Sequência: E - C - E - E - E"
          },
          {
            "id": "e",
            "texto": "Sequência: E - C - C - C - E"
          }
        ],
        "correta": "c",
        "justificativa": "Gabarito da planilha: sequência E-C-C-E-E."
      },
      {
        "ordem": 5,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) Não precisa se preocupar com o rolete próximo de soldas;\nB) A marreta não precisa ser de bronze ou cobre;\nC) Deve fazer marcações nos trilhos para verificar o caminhamento da barra;\nD) Deve-se colocar a mão embaixo do trilho;\nE) É proibido colocar a mão embaixo do trilho;",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: C - E - C - E - C"
          },
          {
            "id": "b",
            "texto": "Sequência: E - C - C - E - C"
          },
          {
            "id": "c",
            "texto": "Sequência: E - E - E - E - C"
          },
          {
            "id": "d",
            "texto": "Sequência: E - E - C - E - C"
          },
          {
            "id": "e",
            "texto": "Sequência: E - E - C - C - C"
          }
        ],
        "correta": "d",
        "justificativa": "Gabarito da planilha: sequência E-E-C-E-C."
      },
      {
        "ordem": 6,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) O caminhamento da barra deve ser proporcional;\nB) O ideal é aplicar grampos velhos na região da junta após o alívio, pois assim fica muito bom o serviço;\nC) O uso do tensor permite o alívo em qualquer situação entre 10°C a 55°C;\nD) Os roletes devem ser colocados conforme espaçamento do procedimento;\nE) Não deve ser usado rolete travado.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: E - E - E - C - C"
          },
          {
            "id": "b",
            "texto": "Sequência: C - C - E - C - C"
          },
          {
            "id": "c",
            "texto": "Sequência: C - E - C - C - C"
          },
          {
            "id": "d",
            "texto": "Sequência: C - E - E - E - C"
          },
          {
            "id": "e",
            "texto": "Sequência: C - E - E - C - C"
          }
        ],
        "correta": "e",
        "justificativa": "Gabarito da planilha: sequência C-E-E-C-C."
      },
      {
        "ordem": 7,
        "enunciado": "Tabela de ATT para análise: posição 0 m = real 2 / projetado 0; 50 m = real 16 / projetado 15; 100 m = real 29 / projetado 30; 150 m = real 33 / projetado 45; 200 m = real 57 / projetado 60; 250 m = real 74 / projetado 75; 300 m = real 90 / projetado 90.\nAo comparar deslocamento real x projetado, onde possivelmente existe um travamento ou problema?",
        "alternativas": [
          {
            "id": "a",
            "texto": "Na posição 0 m, porque o real está 2 mm acima do projetado."
          },
          {
            "id": "b",
            "texto": "Na posição 100 m, porque o real está 1 mm abaixo do projetado."
          },
          {
            "id": "c",
            "texto": "Na posição 150 m, onde o deslocamento real fica muito abaixo do projetado."
          },
          {
            "id": "d",
            "texto": "Na posição 250 m, porque o real está 1 mm abaixo do projetado."
          },
          {
            "id": "e",
            "texto": "Não há nenhum ponto com possível travamento ou problema."
          }
        ],
        "correta": "c",
        "justificativa": "Adaptação da questão aberta da planilha para múltipla escolha; maior desvio ocorre em 150 m."
      },
      {
        "ordem": 8,
        "enunciado": "Conforme a fôrmula abaixo, qual é o valor do deslocamento esperado? (Marcar com \"X\" a ÚNICA resposta CORRETA)\nL = 300m | α=0,0115°C-1 | TN = 35°C | Temp = 25°C",
        "alternativas": [
          {
            "id": "a",
            "texto": "51,75mm"
          },
          {
            "id": "b",
            "texto": "50mm"
          },
          {
            "id": "c",
            "texto": "20mm"
          },
          {
            "id": "d",
            "texto": "34,5cm"
          },
          {
            "id": "e",
            "texto": "34,5mm"
          }
        ],
        "correta": "e",
        "justificativa": "Gabarito da planilha: alternativa e."
      },
      {
        "ordem": 9,
        "enunciado": "Conforme a fôrmula abaixo, qual é o valor do corte e puxamento esperado com uso do Tensor Hidráulico?\nL = 300m | α=0,0115°C-1 | TN = 35°C | Temp = 25°C\nFolga após abertura da Junta = 10mm | Corte = ∆l + Gap da solda - 3mm | *Observação: considedar a folga da junta no corte",
        "alternativas": [
          {
            "id": "a",
            "texto": "34,5mm de corte e 34,5mm de puxamento"
          },
          {
            "id": "b",
            "texto": "46,5mm de corte e 21,5mm de puxamento"
          },
          {
            "id": "c",
            "texto": "56,5mm de corte e 31,5mm de puxamento"
          },
          {
            "id": "d",
            "texto": "25mm de corte e 10mm de puxamento"
          },
          {
            "id": "e",
            "texto": "34,5mm de corte e 10mm de puxamento"
          }
        ],
        "correta": "b",
        "justificativa": "Gabarito da planilha: alternativa b."
      },
      {
        "ordem": 10,
        "enunciado": "Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.\nA) Quando tivermos um ponto fora do caminhamento devemos ver os roletes;\nB) Quando tivermos um ponto fora do caminhamento devemos ver objetos perto do trilho;\nC) Quando tivermos um ponto fora do caminhamento devemos verificar e rebater novamente;\nD) Quando tivermos um ponto fora do caminhamento devemos entender o que acontece;\nE) Todas acima estão certas.",
        "alternativas": [
          {
            "id": "a",
            "texto": "Sequência: C - C - C - C - C"
          },
          {
            "id": "b",
            "texto": "Sequência: E - C - C - C - C"
          },
          {
            "id": "c",
            "texto": "Sequência: C - E - C - C - C"
          },
          {
            "id": "d",
            "texto": "Sequência: C - C - E - C - C"
          },
          {
            "id": "e",
            "texto": "Sequência: C - C - C - E - C"
          }
        ],
        "correta": "a",
        "justificativa": "Gabarito da planilha: sequência C-C-C-C-C."
      }
    ]
  }
];

window.getProvasSeed = function () {
  return window.PROVAS_SEED;
};
