export const module = {
  title: "Fundamentos",
  xp: 50,
  topics: [
    {
      id: "conjuntos",
      number: 1,
      title: "Conjuntos numéricos",
      icon: "∞",
      color: "violet",
      sections: [
        {
          heading: "O que são conjuntos numéricos?",
          body: "São agrupamentos de números que compartilham propriedades em comum. Eles formam uma hierarquia, onde cada conjunto está contido no seguinte.",
        },
        {
          heading: "Os principais conjuntos",
          chips: [
            "ℕ — Naturais: 0, 1, 2, 3...",
            "ℤ — Inteiros: ...-2, -1, 0, 1, 2...",
            "ℚ — Racionais: frações e decimais",
            "ℝ — Reais: todos + irracionais",
          ],
        },
        {
          heading: "Exemplos",
          body: "O número −3 pertence a ℤ, ℚ e ℝ, mas não pertence a ℕ. Já o número √2 é irracional, portanto pertence apenas a ℝ.",
        },
      ],
    },
    {
      id: "funcoes",
      number: 2,
      title: "Funções",
      icon: "f(x)",
      color: "indigo",
      sections: [
        {
          heading: "O que é uma função?",
          body: "Uma função relaciona cada elemento de um conjunto A com exatamente um elemento de um conjunto B. Escrevemos f: A → B.",
        },
        {
          heading: "Forma geral",
          formula: "f(x) = ax + b",
          body: "Onde a é o coeficiente angular (inclinação) e b é o coeficiente linear (ponto onde a reta cruza o eixo y).",
        },
        {
          heading: "Exemplo",
          formula: "f(4) = 2×4 + 3 = 11",
          body: "Funções podem ser lineares, quadráticas, exponenciais e muito mais.",
        },
      ],
    },
    {
      id: "progressoes",
      number: 3,
      title: "Progressões",
      icon: "PA",
      color: "blue",
      sections: [
        {
          heading: "Progressão Aritmética (PA)",
          body: "Sequência onde cada termo é obtido somando uma razão constante r ao anterior.",
          formula: "aₙ = a₁ + (n−1)·r",
          chips: ["Exemplo: 2, 5, 8, 11... → razão r = 3"],
        },
        {
          heading: "Progressão Geométrica (PG)",
          body: "Sequência onde cada termo é obtido multiplicando uma razão constante q ao anterior.",
          formula: "aₙ = a₁ · qⁿ⁻¹",
          chips: ["Exemplo: 3, 6, 12, 24... → razão q = 2"],
        },
      ],
    },
    {
      id: "logaritmos",
      number: 4,
      title: "Logaritmos",
      icon: "log",
      color: "sky",
      sections: [
        {
          heading: "O que é logaritmo?",
          body: 'O logaritmo responde: "a que potência devo elevar a base b para obter x?"',
          formula: "log_b(x) = y  ↔  bʸ = x",
        },
        {
          heading: "Propriedades",
          chips: [
            "Produto: log(a·b) = log a + log b",
            "Quociente: log(a/b) = log a − log b",
            "Potência: log(aⁿ) = n · log a",
          ],
        },
        {
          heading: "Exemplo",
          formula: "log₂(8) = 3  porque  2³ = 8",
        },
      ],
    },
  ],
};
