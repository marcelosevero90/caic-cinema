# 🎬 CineAI - App de Streaming com Curadoria por IA

Aplicativo de streaming multiplataforma (**Web, Celular e Android TV / TV Box**) focado em filmes e séries gratuitos (domínio público e canais licenciados no YouTube), integrado a um **Agente de IA Conversacional** que atua como curador pessoal (recomenda filmes por humor, contexto, duração e estilo, permitindo dar o Play imediatamente na mesma tela).

---

## 🚀 1. Stack Tecnológica & Arquitetura

* **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4.
* **Player de Vídeo:** Player oficial IFrame do YouTube (`https://www.youtube.com/embed/{id}`), 100% aderente aos termos de serviço da plataforma, sem custos de hospedagem de vídeo.
* **Navegação TV Box (D-Pad):** Hook customizado `useTvNavigation` que mapeia controles direcionais (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Escape/Back`), provendo foco luminoso (`tv-focusable`) visível a distância na Smart TV.
* **Agente de IA:** Google GenAI SDK (`@google/genai`) usando **Gemini 3.8 Flash** com **Tool / Function Calling** (`search_catalog`).
* **Banco de Dados:** Schema PostgreSQL / Supabase pronto em [`supabase_schema.sql`](./supabase_schema.sql) com suporte a `pgvector`, histórico de reprodução e favoritos.

---

## 📦 2. Como Rodar o Projeto Localmente

1. **Instalar dependências (já realizado):**
   ```bash
   npm install
   ```

2. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:5173`.

3. **Testar com a Chave do Gemini (Opcional):**
   * O aplicativo possui um mecanismo de **curadoria inteligente heurística de resguardo**, funcionando imediatamente sem chave.
   * Para ativar o raciocínio conversacional completo do **Gemini 3.8 Flash**, clique no ícone da chave 🔑 no cabeçalho ou configure `VITE_GEMINI_API_KEY` no arquivo `.env`.

---

## 📺 3. Gerando o APK para Android TV Box e Celular (Capacitor)

Para empacotar este mesmo código React em um APK nativo para **Android TV (com suporte a Leanback)** e **Celular**:

```bash
# 1. Instalar o Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Inicializar o projeto Capacitor
npx cap init CineAI com.cineai.app --web-dir dist

# 3. Gerar o build de produção
npm run build

# 4. Adicionar a plataforma Android
npx cap add android

# 5. Abrir no Android Studio para gerar o APK
npx cap open android
```

> **Dica para Android TV:** No `AndroidManifest.xml`, declare a intent leanback para aparecer na tela inicial da TV Box:
> ```xml
> <uses-feature android:name="android.software.leanback" android:required="false" />
> <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
> ```

---

## 🧠 4. Funcionamento do Agente de IA (Tool Calling)

1. O usuário envia uma mensagem natural no chat (ex: *"Quero um suspense dos anos 60 sem diálogos pesados"*).
2. O modelo **Gemini 3.8 Flash** aciona a função `search_catalog` passando parâmetros estruturados:
   - `genre`: `"Suspense"`
   - `maxYear`: `1969`
   - `mood`: `"tenso"`
   - `query`: `"anos 60"`
3. O `CatalogService` filtra o catálogo local / banco de dados.
4. O resultado é devolvido ao Gemini, que responde com justificativas amigáveis.
5. A interface renderiza os **Cards dos Filmes sugeridos com botão Play direto no chat**.
