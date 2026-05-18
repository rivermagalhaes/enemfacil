# Módulo Fundamentos — React + Vite + Tailwind

## Estrutura dos arquivos

```
src/
├── App.jsx                  ← Controla qual tela mostrar
├── data/
│   └── topics.js            ← Todo o conteúdo dos tópicos fica aqui
└── components/
    ├── ModuleCard.jsx        ← Tela inicial com a lista de tópicos
    └── TopicPage.jsx         ← Tela de conteúdo ao clicar em um tópico
```

## Como adicionar conteúdo

Edite o arquivo `src/data/topics.js`. Cada tópico tem um array de `sections`:

```js
sections: [
  {
    heading: "Título da seção",      // obrigatório
    body: "Texto explicativo...",    // opcional
    formula: "f(x) = ax + b",       // opcional — aparece em destaque monoespaçado
    chips: ["item 1", "item 2"],     // opcional — aparecem como tags coloridas
  },
]
```

## Como adicionar um novo tópico

No array `topics` em `topics.js`, adicione um novo objeto:

```js
{
  id: "trigonometria",         // identificador único
  number: 5,                   // número exibido no círculo
  title: "Trigonometria",      // nome exibido na lista
  icon: "sin",                 // texto curto exibido no ícone da página
  color: "violet",             // violet | indigo | blue | sky
  sections: [ ... ]
},
```

## Como conectar o botão "Tirar dúvida"

Em `TopicPage.jsx`, substitua o `alert` pelo que precisar:

```jsx
// Com react-router:
const navigate = useNavigate();
onClick={() => navigate(`/chat?topico=${topic.id}`)}

// Com seu sistema de chat:
onClick={() => abrirChat({ contexto: topic.title })}
```

## Instalação

```bash
npm install lucide-react
```

Tailwind já deve estar configurado no seu projeto Vite.
