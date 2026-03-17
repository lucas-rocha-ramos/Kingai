
import { AIMode } from './types';

export const AGENT_CONVERSATION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export const SUGGESTION_CHIPS_BY_MODE: { [key in AIMode]?: string[] } = {
  [AIMode.Fast]: [
    "Resuma este texto",
    "Traduza para o inglês",
    "Me dê ideias para um post",
    "Escreva um e-mail formal"
  ],
  [AIMode.Ultra]: [
    "Crie uma imagem de um astronauta em um cavalo",
    "Qual a capital da Mongólia?",
    "Escreva um poema sobre a chuva",
    "Planeje uma viagem de 3 dias para o Rio de Janeiro"
  ],
  [AIMode.DesignStudio]: [
    "Um logo para uma cafeteria chamada 'Aroma'",
    "Um carro esportivo futurista, arte digital",
    "Um pôster de filme de terror vintage",
    "Um adesivo de um gato fofo"
  ],
  [AIMode.VideoProtons]: [
    "Um drone sobrevoando uma praia ao pôr do sol",
    "Um time-lapse de uma cidade à noite",
    "Um cachorro correndo em um campo de flores",
    "Uma animação de um foguete decolando"
  ],
  [AIMode.KingStudio]: [
    "Comece com uma imagem para editar",
    "Substituir o fundo da imagem",
    "Mudar a cor de uma roupa",
    "Remover um objeto da cena",
  ],
  [AIMode.EditorKing]: [
    "Mude o fundo para uma praia",
    "Adicione um gato na imagem",
    "Mude a proporção para 16:9",
    "Faça parecer uma pintura a óleo",
  ],
  [AIMode.KingLab]: [
    "Mescle duas imagens",
    "Use a primeira imagem como estilo",
    "Crie uma variação com estas referências",
    "Coloque este objeto na segunda imagem",
  ],
  [AIMode.Visagista]: [
    "Quais cortes de cabelo combinam comigo?",
    "Qual formato de óculos é ideal para meu rosto?",
    "Sugira uma maquiagem para uma festa formal",
    "Qual cor de cabelo realçaria meu tom de pele?",
  ],
  [AIMode.HumanKing]: [
    "Crie um novo humano hiper-realista",
    "Descreva a aparência",
    "Defina a personalidade",
    "Coloque meu humano em uma cena",
  ],
};
