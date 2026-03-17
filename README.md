# Protons AI

Plataforma avançada de IA para geração de imagens, vídeos e chat inteligente.

## Como hospedar no Vercel

1.  Crie um repositório no GitHub e faça o push deste código.
2.  Conecte seu repositório ao Vercel.
3.  Nas configurações do projeto no Vercel, adicione a seguinte variável de ambiente:
    *   `GEMINI_API_KEY`: Sua chave de API do Google AI Studio.
4.  O Vercel detectará automaticamente as configurações do Vite e fará o deploy.

## Configuração Local

1.  Clone o repositório.
2.  Instale as dependências: `npm install`.
3.  Crie um arquivo `.env` baseado no `.env.example` e adicione sua chave.
4.  Inicie o servidor de desenvolvimento: `npm run dev`.

## Tecnologias Utilizadas

*   React 19
*   Vite
*   Tailwind CSS 4
*   Motion (Framer Motion)
*   Google Gemini API (@google/genai)
