-- =====================================================================
-- Seed das 2 provas de Homologação Alívio de Tensão — ATT 4
-- Baseado nas planilhas PROVA DE ATT 4 RUMO_004 - Rev3.xlsx e GABARITO DE ATT 4 - Rev3.xlsx
--
-- Como usar:
-- 1) Rode sql/schema.sql se o banco ainda não estiver configurado.
-- 2) Rode sql/alivio-tensao-area.sql se a área alivio_tensao ainda não existir.
-- 3) Rode este arquivo no SQL Editor do Supabase.
--
-- O script deixa inativas as provas antigas da área alivio_tensao
-- e cria/atualiza apenas as provas ATT4-1 e ATT4-2.
-- O histórico de tentativas permanece preservado.
-- =====================================================================

begin;

update public.provas
set ativo = false, atualizado_em = now()
where area = 'alivio_tensao';

insert into public.provas (area, codigo, titulo, descricao, nota_minima, ativo)
values ('alivio_tensao', 'ATT4-1', 'Prova ATT 4 — Parte 1', 'Questões 1 a 10 da planilha PROVA DE ATT 4 RUMO_004 - Rev3, adaptadas para o modelo objetivo do sistema.', 7, true)
on conflict (area, codigo) do update
set titulo = excluded.titulo,
    descricao = excluded.descricao,
    nota_minima = excluded.nota_minima,
    ativo = true,
    atualizado_em = now();

insert into public.provas (area, codigo, titulo, descricao, nota_minima, ativo)
values ('alivio_tensao', 'ATT4-2', 'Prova ATT 4 — Parte 2', 'Questões 11 a 20 da planilha PROVA DE ATT 4 RUMO_004 - Rev3, incluindo análise de gráficos, deslocamento e tensor hidráulico.', 7, true)
on conflict (area, codigo) do update
set titulo = excluded.titulo,
    descricao = excluded.descricao,
    nota_minima = excluded.nota_minima,
    ativo = true,
    atualizado_em = now();

delete from public.questoes q
using public.provas p
where q.prova_id = p.id
  and p.area = 'alivio_tensao'
  and p.codigo in ('ATT4-1','ATT4-2');

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 1, 'Qual é o procedimento que determina os serviços de ATT na RUMO? (Marcar com "X" a ÚNICA resposta CORRETA)', '[{"id": "a", "texto": "Nenhum;"}, {"id": "b", "texto": "ENG-FRM-Limites na Rumo;"}, {"id": "c", "texto": "ENG-ETS - E0011 - Limistes necessários para a linha ficar boa na RUMO;"}, {"id": "d", "texto": "MAN-VP-L-PRO-TR-0036-01 - Alívio De Tensões Térmicas Em Trilhos;"}, {"id": "e", "texto": "Nenhuma resposta anterior."}]'::jsonb, 'd', 'Gabarito da planilha: alternativa d.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-1';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 2, 'Qual é o procedimento que determina os limites de temperatura para serviços de trilho na RUMO?', '[{"id": "a", "texto": "Qualquer coisa, tanto faz, como tanto fez!!!"}, {"id": "b", "texto": "Escolher a temperatura conforme que sempre foi usada;"}, {"id": "c", "texto": "ENG-ETS-ON-T001 - Temperaturas de Serviço na Ferrovia;"}, {"id": "d", "texto": "ES-SPE-070-R4 - Temperaturas neutras de referência para serviços de trilhos;"}, {"id": "e", "texto": "Nenhum."}]'::jsonb, 'd', 'Gabarito da planilha: alternativa d.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-1';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 3, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) Calor no trilho faz com que ele dilate e diminua de tamanho;
B) Frio no trilho faz com que ele contraia e diminua de tamanho;
C) Frio no trilho faz com que ele dilate e diminua de tamanho;
D) Calor no trilho faz com que ele contraia e aumente de tamanho;
E) Calor no trilho faz com que ele dilate e aumente de tamanho;', '[{"id": "a", "texto": "Sequência: C - C - E - E - C"}, {"id": "b", "texto": "Sequência: E - C - E - E - C"}, {"id": "c", "texto": "Sequência: E - E - E - E - C"}, {"id": "d", "texto": "Sequência: E - C - C - E - C"}, {"id": "e", "texto": "Sequência: E - C - E - C - C"}]'::jsonb, 'b', 'Gabarito da planilha: sequência E-C-E-E-C.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-1';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 4, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) ATT significa Alívio de Tensões Térmicas;
B) FTN significa Faixa de Temperatura Negativa;
C) TN significa a Temperatura Neutra dos Trilhos;
D) VERSE é um carro;
E) Faixa de Temperatura Neutra é a Temperatura Neutra + ou - 5°C.', '[{"id": "a", "texto": "Sequência: E - E - C - E - C"}, {"id": "b", "texto": "Sequência: C - C - C - E - C"}, {"id": "c", "texto": "Sequência: C - E - C - E - C"}, {"id": "d", "texto": "Sequência: C - E - E - E - C"}, {"id": "e", "texto": "Sequência: C - E - C - C - C"}]'::jsonb, 'c', 'Gabarito da planilha: sequência C-E-C-E-C.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-1';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 5, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) O ATT deve ser feito em linhas novas, na instalação de TLS e quando o VERSE apontar;
B) É importante passarmos o VERSE nas cristas e vales do perfil longitudinal da linha;
C) É muito importante, colocar a mão embaixo do trilho;
D) É muito importante que a turma seja homologada para fazer serviços de ATT;
E) É proibido usar marreta que não seja de broze para aliviar o trilho.', '[{"id": "a", "texto": "Sequência: E - C - E - C - C"}, {"id": "b", "texto": "Sequência: C - E - E - C - C"}, {"id": "c", "texto": "Sequência: C - C - C - C - C"}, {"id": "d", "texto": "Sequência: C - C - E - C - C"}, {"id": "e", "texto": "Sequência: C - C - E - E - C"}]'::jsonb, 'd', 'Gabarito da planilha: sequência C-C-E-C-C.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-1';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 6, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) Flambagem em reta tem a forma de C;
B) Flambagem em curva tem forma de S;
C) Flambagem ocorre com pouquíssima frequência em pontos fixos;
D) Flambagem não deixa marcas nos trilhos de caminhamento e arraste de dormentes;
E) Se tivermos um desalinhamento provocado pela flambagem >128mm na corda de 20m devemos interditar a linha.', '[{"id": "a", "texto": "Sequência: C - E - E - E - C"}, {"id": "b", "texto": "Sequência: E - C - E - E - C"}, {"id": "c", "texto": "Sequência: E - E - C - E - C"}, {"id": "d", "texto": "Sequência: E - E - E - C - C"}, {"id": "e", "texto": "Sequência: E - E - E - E - C"}]'::jsonb, 'e', 'Gabarito da planilha: sequência E-E-E-E-C.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-1';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 7, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) Flambagem é muito fácil de prever;
B) Fratura só acontece devido a problemas nos vagões;
C) Fratura não é detectada por DTQ, nem circuito de via;
D) O Verse mede a STF, que é a temperatura onde o trilho não terá nenhum esforço;
E) Junta de dilatação não permite o caminhamento do trilho.', '[{"id": "a", "texto": "Sequência: E - E - E - C - E"}, {"id": "b", "texto": "Sequência: C - E - E - C - E"}, {"id": "c", "texto": "Sequência: E - C - E - C - E"}, {"id": "d", "texto": "Sequência: E - E - C - C - E"}, {"id": "e", "texto": "Sequência: E - E - E - E - E"}]'::jsonb, 'a', 'Gabarito da planilha: sequência E-E-E-C-E.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-1';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 8, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) Amplitude térmica não provoca tensões nos trilhos.
B) Quanto maior a amplitude térmica maior são as tensões geradas nos trilhos
C) Para uma temperatura mínima de 10°C e uma temperatura máxima de 60°C, a amplitude térmica é de 50°C.
D) Para uma temperatura mínima de -5°C e uma temperatura máxima de 50°C, a amplitude térmica é de 55°C.
E) Para uma temperatura mínima de -5°C e uma temperatura máxima de 5°C, a amplitude térmica é de 5°C.', '[{"id": "a", "texto": "Sequência: C - C - C - C - E"}, {"id": "b", "texto": "Sequência: E - C - C - C - E"}, {"id": "c", "texto": "Sequência: E - E - C - C - E"}, {"id": "d", "texto": "Sequência: E - C - E - C - E"}, {"id": "e", "texto": "Sequência: E - C - C - E - E"}]'::jsonb, 'b', 'Gabarito da planilha: sequência E-C-C-C-E.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-1';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 9, 'Informação para a questão: Temperatura Neutra = 33°C.
Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) A Faixa de Temperatura nesse local será de 23°C a 43°C;
B) A Faixa de Temperatura nesse local será de 30°C a 35°C;
C) Qualquer serviço feito acima de 39°C estará acima da Faixa de Temperatura;
D) Qualquer serviço feito abaixo de 27°C estará abaixo da Faixa de Temperatura;
E) Qualquer serviço feito dentro da faixa de 30°C a 35°C, estará dentro da Faixa.', '[{"id": "a", "texto": "Sequência: C - E - C - C - C"}, {"id": "b", "texto": "Sequência: E - C - C - C - C"}, {"id": "c", "texto": "Sequência: E - E - C - C - C"}, {"id": "d", "texto": "Sequência: E - E - E - C - C"}, {"id": "e", "texto": "Sequência: E - E - C - E - C"}]'::jsonb, 'c', 'Gabarito da planilha: sequência E-E-C-C-C.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-1';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 10, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) É melhor fraturar do que flambar;
B) Só é permitido trabalhar com temperatura caindo; quando não usar tensor;
C) É ótimo trabalhar acima da faixa de temperatura;
D) Tensor hidráulico é usado abaixo da faixa e com temperatura caindo;
E) O termômetro deve ficar exposto ao sol.', '[{"id": "a", "texto": "Sequência: E - E - E - C - E"}, {"id": "b", "texto": "Sequência: C - C - E - C - E"}, {"id": "c", "texto": "Sequência: C - E - C - C - E"}, {"id": "d", "texto": "Sequência: C - E - E - C - E"}, {"id": "e", "texto": "Sequência: C - E - E - E - E"}]'::jsonb, 'd', 'Gabarito da planilha: sequência C-E-E-C-E.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-1';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 1, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) Trilho curto é aquele que movimenta TODA a sua extenção;
B) Trilho curto é aquele que tem junta numa das extremidadas;
C) TLS é aquele que tem uma grande região com os esforços balanceados;
D) TCS é o trilho que sempre terá menos que 600 metros;
E) TLS é o trilho que tem no mínimo 2 vezes o comprimento de movimentação;', '[{"id": "a", "texto": "Sequência: E - E - C - E - C"}, {"id": "b", "texto": "Sequência: C - C - C - E - C"}, {"id": "c", "texto": "Sequência: C - E - E - E - C"}, {"id": "d", "texto": "Sequência: C - E - C - C - C"}, {"id": "e", "texto": "Sequência: C - E - C - E - C"}]'::jsonb, 'e', 'Gabarito da planilha: sequência C-E-C-E-C.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-2';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 2, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) Processo de meia barra é aquele que faz o alívio em apenas um sentido;
B) Processo de barra inteira é aquele que faz o alívio em apenas um sentido;
C) Existem 2 principais tipos de modo de fazer alívio, forçado e natural;
D) O método forçado é feito sem o uso de tensor hidráulico;
E) Todas estão erradas.', '[{"id": "a", "texto": "Sequência: E - C - C - E - E"}, {"id": "b", "texto": "Sequência: C - C - C - E - E"}, {"id": "c", "texto": "Sequência: E - E - C - E - E"}, {"id": "d", "texto": "Sequência: E - C - E - E - E"}, {"id": "e", "texto": "Sequência: E - C - C - C - E"}]'::jsonb, 'a', 'Gabarito da planilha: sequência E-C-C-E-E.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-2';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 3, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) Trilho topado deve ser cortado de policorte de qualquer forma;
B) O uso de policorte é bom sem o bracinho;
C) O corte com maçarico deve ser iniciado pelo boleto, depois pela alma e por último o patim;
D) Não é necessário se preocupar com o perfil longitudinal da linha para fazer ATT;
E) Os pontos de VERSE dentro da faixa da FTN são obrigatórios a execução de ATT;', '[{"id": "a", "texto": "Sequência: C - E - C - E - E"}, {"id": "b", "texto": "Sequência: E - E - C - E - E"}, {"id": "c", "texto": "Sequência: E - C - C - E - E"}, {"id": "d", "texto": "Sequência: E - E - E - E - E"}, {"id": "e", "texto": "Sequência: E - E - C - C - E"}]'::jsonb, 'b', 'Gabarito da planilha: sequência E-E-C-E-E.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-2';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 4, 'Gráficos do perfil longitudinal para análise:
Gráfico a: [imagem:assets/provas-att4/grafico-a.png]
Gráfico b: [imagem:assets/provas-att4/grafico-b.png]
Gráfico c: [imagem:assets/provas-att4/grafico-c.png]
Gráfico d - com tensor: [imagem:assets/provas-att4/grafico-d.png]
Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) O gráfico "a" é melhor fazer o processo da meia barra;
B) O gráfico "b" é melhor fazer o processo de meia barra;
C) O gráfico "c" pode ser feito pelos dois processos;
D) O gráfico "d" só pode ser feito pelo metodo da barra inteira;
E) Todos acima estão errados.', '[{"id": "a", "texto": "Sequência: C - C - C - E - E"}, {"id": "b", "texto": "Sequência: E - E - C - E - E"}, {"id": "c", "texto": "Sequência: E - C - C - E - E"}, {"id": "d", "texto": "Sequência: E - C - E - E - E"}, {"id": "e", "texto": "Sequência: E - C - C - C - E"}]'::jsonb, 'c', 'Gabarito da planilha: sequência E-C-C-E-E.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-2';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 5, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) Não precisa se preocupar com o rolete próximo de soldas;
B) A marreta não precisa ser de bronze ou cobre;
C) Deve fazer marcações nos trilhos para verificar o caminhamento da barra;
D) Deve-se colocar a mão embaixo do trilho;
E) É proibido colocar a mão embaixo do trilho;', '[{"id": "a", "texto": "Sequência: C - E - C - E - C"}, {"id": "b", "texto": "Sequência: E - C - C - E - C"}, {"id": "c", "texto": "Sequência: E - E - E - E - C"}, {"id": "d", "texto": "Sequência: E - E - C - E - C"}, {"id": "e", "texto": "Sequência: E - E - C - C - C"}]'::jsonb, 'd', 'Gabarito da planilha: sequência E-E-C-E-C.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-2';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 6, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) O caminhamento da barra deve ser proporcional;
B) O ideal é aplicar grampos velhos na região da junta após o alívio, pois assim fica muito bom o serviço;
C) O uso do tensor permite o alívo em qualquer situação entre 10°C a 55°C;
D) Os roletes devem ser colocados conforme espaçamento do procedimento;
E) Não deve ser usado rolete travado.', '[{"id": "a", "texto": "Sequência: E - E - E - C - C"}, {"id": "b", "texto": "Sequência: C - C - E - C - C"}, {"id": "c", "texto": "Sequência: C - E - C - C - C"}, {"id": "d", "texto": "Sequência: C - E - E - E - C"}, {"id": "e", "texto": "Sequência: C - E - E - C - C"}]'::jsonb, 'e', 'Gabarito da planilha: sequência C-E-E-C-C.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-2';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 7, 'Tabela de ATT para análise: posição 0 m = real 2 / projetado 0; 50 m = real 16 / projetado 15; 100 m = real 29 / projetado 30; 150 m = real 33 / projetado 45; 200 m = real 57 / projetado 60; 250 m = real 74 / projetado 75; 300 m = real 90 / projetado 90.
Ao comparar deslocamento real x projetado, onde possivelmente existe um travamento ou problema?', '[{"id": "a", "texto": "Na posição 0 m, porque o real está 2 mm acima do projetado."}, {"id": "b", "texto": "Na posição 100 m, porque o real está 1 mm abaixo do projetado."}, {"id": "c", "texto": "Na posição 150 m, onde o deslocamento real fica muito abaixo do projetado."}, {"id": "d", "texto": "Na posição 250 m, porque o real está 1 mm abaixo do projetado."}, {"id": "e", "texto": "Não há nenhum ponto com possível travamento ou problema."}]'::jsonb, 'c', 'Adaptação da questão aberta da planilha para múltipla escolha; maior desvio ocorre em 150 m.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-2';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 8, 'Conforme a fôrmula abaixo, qual é o valor do deslocamento esperado? (Marcar com "X" a ÚNICA resposta CORRETA)
L = 300m | α=0,0115°C-1 | TN = 35°C | Temp = 25°C', '[{"id": "a", "texto": "51,75mm"}, {"id": "b", "texto": "50mm"}, {"id": "c", "texto": "20mm"}, {"id": "d", "texto": "34,5cm"}, {"id": "e", "texto": "34,5mm"}]'::jsonb, 'e', 'Gabarito da planilha: alternativa e.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-2';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 9, 'Conforme a fôrmula abaixo, qual é o valor do corte e puxamento esperado com uso do Tensor Hidráulico?
L = 300m | α=0,0115°C-1 | TN = 35°C | Temp = 25°C
Folga após abertura da Junta = 10mm | Corte = ∆l + Gap da solda - 3mm | *Observação: considedar a folga da junta no corte', '[{"id": "a", "texto": "34,5mm de corte e 34,5mm de puxamento"}, {"id": "b", "texto": "46,5mm de corte e 21,5mm de puxamento"}, {"id": "c", "texto": "56,5mm de corte e 31,5mm de puxamento"}, {"id": "d", "texto": "25mm de corte e 10mm de puxamento"}, {"id": "e", "texto": "34,5mm de corte e 10mm de puxamento"}]'::jsonb, 'b', 'Gabarito da planilha: alternativa b.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-2';

insert into public.questoes (prova_id, ordem, enunciado, alternativas, correta, justificativa)
select p.id, 10, 'Qual é a sequência correta? Use C para afirmação correta e E para afirmação errada.
A) Quando tivermos um ponto fora do caminhamento devemos ver os roletes;
B) Quando tivermos um ponto fora do caminhamento devemos ver objetos perto do trilho;
C) Quando tivermos um ponto fora do caminhamento devemos verificar e rebater novamente;
D) Quando tivermos um ponto fora do caminhamento devemos entender o que acontece;
E) Todas acima estão certas.', '[{"id": "a", "texto": "Sequência: C - C - C - C - C"}, {"id": "b", "texto": "Sequência: E - C - C - C - C"}, {"id": "c", "texto": "Sequência: C - E - C - C - C"}, {"id": "d", "texto": "Sequência: C - C - E - C - C"}, {"id": "e", "texto": "Sequência: C - C - C - E - C"}]'::jsonb, 'a', 'Gabarito da planilha: sequência C-C-C-C-C.'
from public.provas p where p.area = 'alivio_tensao' and p.codigo = 'ATT4-2';

commit;

-- Conferência rápida:
select p.codigo, p.titulo, p.ativo, count(q.id) as questoes
from public.provas p
left join public.questoes q on q.prova_id = p.id
where p.area = 'alivio_tensao'
group by p.codigo, p.titulo, p.ativo
order by p.codigo;