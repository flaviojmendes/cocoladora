import React, { useState } from "react";
import {
  FaToiletPaper,
  FaPumpSoap,
  FaCrown,
  FaRedo,
  FaChevronDown,
  FaDice,
  FaCheck,
  FaQuestionCircle,
} from "react-icons/fa";
import { translate } from "../../languages/translator";
import { AudioService } from "../../utils/audio";
import { AchievementService } from "../../utils/achievements";

type TabMode = "paper" | "shampoo" | "quiz";

export function ThroneEntertainment() {
  const [activeTab, setActiveTab] = useState<TabMode>("paper");

  // Paper Roll State
  const [paperSheetsPulled, setPaperSheetsPulled] = useState(0);
  const [metersUnrolled, setMetersUnrolled] = useState(0);

  // Shampoo Bottle State
  const [currentBottleIdx, setCurrentBottleIdx] = useState(0);

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const pullPaper = () => {
    AudioService.playPaperTear();
    const nextCount = paperSheetsPulled + 1;
    setPaperSheetsPulled(nextCount);
    setMetersUnrolled(Number((nextCount * 0.12).toFixed(2))); // ~12cm per sheet

    if (nextCount === 25) {
      AchievementService.unlock("roll_master");
    }
  };

  const resetPaper = () => {
    AudioService.playFlush();
    setPaperSheetsPulled(0);
    setMetersUnrolled(0);
  };

  // Shampoo bottles database with quirky ingredients
  const shampooBottles = [
    {
      name: "Bio-Elixir Ultra Complex 9000",
      type: "Shampoo Revitalizante com Extrato de Lágrimas de Chefe",
      instructions: "Modo de usar: Aplique nos cabelos molhados, massageie pensando na sua demissão e enxágue com água morna. Repita se o dia foi difícil.",
      ingredients: [
        "Aqua (Água)",
        "Sodium Laureth Sulfate",
        "Cocamidopropyl Betaine",
        "Glycerin",
        "Extrato de Café Forte",
        "Disodium EDTA",
        "Metilcloroisotiazolinona",
        "Pura Ansiedade Corporativa (0.05%)",
        "Parfum (Fragrância de Sexta-feira)",
        "Ácido Cítrico",
      ],
      warning: "Atenção: Não ingerir no expediente. Se os olhos arderem, continue lendo este rótulo.",
    },
    {
      name: "Dermo-Therapy Zero Stress & Glow",
      type: "Condicionador Reconstrutor de Fibras e Prazos Perdidos",
      instructions: "Modo de usar: Deixe agir por 3 minutos enquanto rola o feed do Instagram sem culpa.",
      ingredients: [
        "Aqua",
        "Cetearyl Alcohol",
        "Dimethicone",
        "Behentrimonium Chloride",
        "Extrato de Silêncio Absoluto",
        "Óleo de Argan e Boletos Pagos",
        "Polyquaternium-10",
        "Panthenol",
        "Phenoxyethanol",
      ],
      warning: "Em caso de contato com reuniões de alinhamento, lave imediatamente.",
    },
    {
      name: "Sabonete Líquido Lavanda & Paz Mental",
      type: "Gel de Banho Hidratante com Microesferas de Sabedoria",
      instructions: "Aplique uma pequena quantidade nas mãos e crie uma espuma densa antes de voltar para o computador.",
      ingredients: [
        "Aqua",
        "Sodium Lauroyl Sarcosinate",
        "Aloe Barbadensis Leaf Juice",
        "Extrato de Lavanda Silvestre",
        "Tocopheryl Acetate (Vitamina E)",
        "Zinco Piritiona",
        "Esperança de Bônus Anual (Traços)",
        "Linalool",
      ],
      warning: "Uso externo. Evite falar mal da empresa perto de microfones abertos.",
    },
  ];

  const nextBottle = () => {
    AudioService.playPop();
    const next = (currentBottleIdx + 1) % shampooBottles.length;
    setCurrentBottleIdx(next);
    AchievementService.unlock("shampoo_reader");
  };

  // Persona Quiz
  const quizQuestions = [
    {
      question: "Qual o seu objetivo principal ao entrar no banheiro?",
      options: [
        { text: "Bater meta de faturamento no trono", points: "corporativo" },
        { text: "Paz, sossego e silêncio absoluto", points: "monge" },
        { text: "Rolar TikTok e esquecer que tenho um emprego", points: "tiktoker" },
        { text: "Evitar aquela reunião que podia ser um e-mail", points: "ninja" },
      ],
    },
    {
      question: "Quanto tempo dura sua sessão média?",
      options: [
        { text: "5 a 10 min (rápido e cirúrgico)", points: "ninja" },
        { text: "15 a 20 min (o tempo de terminar um vídeo longo)", points: "tiktoker" },
        { text: "25 a 40 min (as pernas já perderam a sensibilidade)", points: "monge" },
        { text: "O tempo suficiente para lucrar pelo menos R$ 15,00", points: "corporativo" },
      ],
    },
    {
      question: "Qual sua postura quando alguém bate na porta?",
      options: [
        { text: "Tosso imediatamente pra provar que estou vivo", points: "ninja" },
        { text: "Ignoro e continuo vendo reels no mudo", points: "tiktoker" },
        { text: "'Ocupado!', com voz confiante de CEO", points: "corporativo" },
        { text: "Respiro fundo e agradeço pelo momento de paciência", points: "monge" },
      ],
    },
  ];

  const handleSelectQuizOption = (qIdx: number, optIdx: number) => {
    AudioService.playPop();
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculatePersonaResult = () => {
    AudioService.playTada();
    setQuizSubmitted(true);
    AchievementService.unlock("throne_persona");
  };

  const resetQuiz = () => {
    AudioService.playPop();
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const getPersonaResult = () => {
    const scores: Record<string, number> = { corporativo: 0, monge: 0, tiktoker: 0, ninja: 0 };
    Object.entries(quizAnswers).forEach(([qIdx, optIdx]) => {
      const q = quizQuestions[Number(qIdx)];
      const opt = q.options[optIdx];
      if (opt) {
        scores[opt.points] = (scores[opt.points] || 0) + 1;
      }
    });

    let topType = "corporativo";
    let max = -1;
    Object.entries(scores).forEach(([type, val]) => {
      if (val > max) {
        max = val;
        topType = type;
      }
    });

    const personas = {
      corporativo: {
        title: "O Investidor do Trono 📈",
        desc: "Você não vai ao banheiro, você realiza uma alocação estratégica de capital corporativo em tempo ocioso. Cada minuto é faturado com juros e correção monetária.",
      },
      monge: {
        title: "O Monge da Cabine 🧘‍♂️",
        desc: "Para você, o banheiro é um templo sagrado de descompressão. O mundo exterior pode desabar, mas dentro deste cubículo reine a paz suprema.",
      },
      tiktoker: {
        title: "O Curador de Algoritmos 📱",
        desc: "Você entrou pra uma pausa de 2 minutos e agora já assistiu a 4 tutorias de marcenaria e uma receita de bolo na frigideira. Suas pernas estão dormentes, mas a dopamina está alta.",
      },
      ninja: {
        title: "O Fantasma da Firma 🥷",
        desc: "Ninguém nunca te vê entrando ou saindo. Você entra nas sombras para escapar de reuniões inúteis e reaparece como se nada tivesse acontecido.",
      },
    };

    return personas[topType as keyof typeof personas] || personas.corporativo;
  };

  const isQuizComplete = Object.keys(quizAnswers).length === quizQuestions.length;

  return (
    <section className="w-full max-w-5xl mx-auto px-4 my-10">
      <div className="bg-background text-secondary rounded-2xl border-4 border-primary p-6 sm:p-8 shadow-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-primary/20 mb-6 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧻</span>
            <div>
              <h2 className="font-primary text-3xl sm:text-4xl text-primary font-bold">
                {translate("throneEntertainmentTitle")} 🎮
              </h2>
              <p className="font-secondary text-sm sm:text-base text-secondary-light">
                {translate("throneEntertainmentSubtitle")}
              </p>
            </div>
          </div>

          {/* Tab Controls */}
          <div className="flex bg-background-dark p-1.5 rounded-xl border border-primary/30 gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                AudioService.playPop();
                setActiveTab("paper");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-secondary font-bold transition-colors ${
                activeTab === "paper"
                  ? "bg-primary text-background shadow"
                  : "text-secondary hover:text-primary"
              }`}
            >
              <FaToiletPaper />
              <span>{translate("infinitePaperTab")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                AudioService.playPop();
                setActiveTab("shampoo");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-secondary font-bold transition-colors ${
                activeTab === "shampoo"
                  ? "bg-primary text-background shadow"
                  : "text-secondary hover:text-primary"
              }`}
            >
              <FaPumpSoap />
              <span>{translate("shampooLabelTab")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                AudioService.playPop();
                setActiveTab("quiz");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-secondary font-bold transition-colors ${
                activeTab === "quiz"
                  ? "bg-primary text-background shadow"
                  : "text-secondary hover:text-primary"
              }`}
            >
              <FaCrown />
              <span>{translate("throneQuizTab")}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Infinite Paper Roll Fidget */}
        {activeTab === "paper" && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative mb-6 select-none group">
              {/* Paper Roll Graphic */}
              <button
                type="button"
                onClick={pullPaper}
                aria-label="Puxar folha de papel higiênico"
                className="relative cursor-pointer transition-transform active:scale-95 hover:scale-105 focus:outline-none"
              >
                <div className="w-44 h-44 rounded-full bg-amber-50 border-8 border-primary/80 shadow-2xl flex flex-col items-center justify-center p-4 relative overflow-hidden">
                  <div className="w-14 h-14 rounded-full bg-background-dark border-4 border-primary/60 shadow-inner flex items-center justify-center">
                    <span className="text-xl">🧻</span>
                  </div>
                  {/* Paper hanging strip */}
                  <div
                    className="absolute -bottom-2 w-28 bg-white border-2 border-primary/40 rounded-b shadow-md transition-all flex flex-col items-center justify-center font-typewriter text-[10px] text-primary/70"
                    style={{ height: `${Math.min(90, 40 + (paperSheetsPulled % 10) * 4)}px` }}
                  >
                    <span>CLIQUE PRA PUXAR</span>
                    <span className="text-xs">▼</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Pull Counter & Meters */}
            <div className="bg-background-dark/80 px-6 py-3 rounded-2xl border-2 border-primary/20 shadow-inner flex items-center gap-6 my-4">
              <div>
                <span className="block font-secondary text-xs text-secondary-light">
                  {translate("sheetsPulled")}
                </span>
                <span className="font-typewriter text-3xl font-bold text-primary">
                  {paperSheetsPulled}
                </span>
              </div>
              <div className="w-[1px] h-8 bg-primary/20" />
              <div>
                <span className="block font-secondary text-xs text-secondary-light">
                  {translate("metersUnrolled")}
                </span>
                <span className="font-typewriter text-3xl font-bold text-primary">
                  {metersUnrolled} m
                </span>
              </div>
            </div>

            <p className="font-secondary text-sm sm:text-base text-secondary-light max-w-md mt-2">
              {translate("paperFidgetDesc")}
            </p>

            {paperSheetsPulled > 0 && (
              <button
                type="button"
                onClick={resetPaper}
                className="mt-4 flex items-center gap-1.5 text-xs font-secondary text-secondary-light hover:text-red-700 transition-colors"
              >
                <FaRedo />
                <span>{translate("rewindRoll")}</span>
              </button>
            )}
          </div>
        )}

        {/* TAB 2: Retro Shampoo Bottle Reader */}
        {activeTab === "shampoo" && (
          <div className="flex flex-col items-center py-4">
            <div className="w-full max-w-md bg-white border-4 border-primary rounded-2xl p-6 shadow-xl relative text-left select-none">
              <div className="w-12 h-4 bg-primary/30 rounded-t-lg mx-auto -mt-10 mb-4 border border-primary/40" />

              <div className="border-b-2 border-primary/20 pb-3 mb-3 text-center">
                <span className="text-xs uppercase font-typewriter tracking-widest text-primary-dark block font-bold">
                  Laboratoires de Trône
                </span>
                <h3 className="font-primary text-2xl sm:text-3xl text-primary font-bold mt-1">
                  {shampooBottles[currentBottleIdx].name}
                </h3>
                <span className="text-xs font-secondary text-secondary-light block italic">
                  {shampooBottles[currentBottleIdx].type}
                </span>
              </div>

              {/* Instructions */}
              <div className="mb-4">
                <span className="font-secondary font-bold text-sm text-primary-dark block mb-1">
                  Instruções:
                </span>
                <p className="font-secondary text-sm text-secondary bg-background-dark/50 p-2.5 rounded-lg border border-primary/20">
                  {shampooBottles[currentBottleIdx].instructions}
                </p>
              </div>

              {/* Ingredients List */}
              <div className="mb-4">
                <span className="font-secondary font-bold text-sm text-primary-dark block mb-1">
                  Composição Química / Ingredients:
                </span>
                <div className="bg-background-dark/30 p-2.5 rounded-lg border border-primary/20 font-typewriter text-[11px] leading-relaxed text-secondary/80 max-h-36 overflow-y-auto">
                  {shampooBottles[currentBottleIdx].ingredients.join(" • ")}
                </div>
              </div>

              {/* Warning */}
              <div className="text-[11px] font-secondary text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 italic">
                {shampooBottles[currentBottleIdx].warning}
              </div>
            </div>

            <button
              type="button"
              onClick={nextBottle}
              className="mt-6 py-2.5 px-6 rounded-xl font-secondary text-lg font-bold bg-primary hover:bg-primary-dark text-background shadow transition-transform active:scale-95 flex items-center gap-2"
            >
              <FaDice />
              <span>{translate("nextBottle")}</span>
            </button>
          </div>
        )}

        {/* TAB 3: Throne Persona Quiz */}
        {activeTab === "quiz" && (
          <div className="py-4">
            {!quizSubmitted ? (
              <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                {quizQuestions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="bg-white p-5 rounded-xl border-2 border-primary/20 shadow-sm"
                  >
                    <span className="font-secondary text-sm text-primary font-bold block mb-1">
                      Pergunta {qIdx + 1} de {quizQuestions.length}
                    </span>
                    <h4 className="font-primary text-xl sm:text-2xl text-primary-dark font-bold mb-3">
                      {q.question}
                    </h4>

                    <div className="flex flex-col gap-2">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectQuizOption(qIdx, optIdx)}
                          className={`text-left p-3 rounded-lg border-2 font-secondary text-base transition-all flex items-center justify-between ${
                            quizAnswers[qIdx] === optIdx
                              ? "bg-amber-50 border-primary text-primary-dark font-bold shadow-sm"
                              : "bg-white border-primary/20 text-secondary hover:bg-background-dark"
                          }`}
                        >
                          <span>{opt.text}</span>
                          {quizAnswers[qIdx] === optIdx && (
                            <FaCheck className="text-primary shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  disabled={!isQuizComplete}
                  onClick={calculatePersonaResult}
                  className={`w-full py-3.5 px-6 rounded-xl font-secondary text-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isQuizComplete
                      ? "bg-primary hover:bg-primary-dark text-background active:scale-95 cursor-pointer"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <FaCrown />
                  <span>{translate("revealPersona")}</span>
                </button>
              </div>
            ) : (
              <div className="max-w-md mx-auto bg-white border-4 border-primary rounded-2xl p-6 sm:p-8 shadow-xl text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl mb-3 border-2 border-primary/30">
                  👑
                </div>
                <span className="font-secondary text-xs uppercase tracking-widest text-primary font-bold">
                  Seu Perfil do Trono
                </span>
                <h3 className="font-primary text-3xl sm:text-4xl text-primary font-bold my-2">
                  {getPersonaResult().title}
                </h3>
                <p className="font-secondary text-base sm:text-lg text-secondary my-3 bg-background-dark/60 p-4 rounded-xl border border-primary/20">
                  {getPersonaResult().desc}
                </p>

                <button
                  type="button"
                  onClick={resetQuiz}
                  className="mt-4 py-2 px-5 rounded-xl font-secondary text-base font-bold bg-primary hover:bg-primary-dark text-background shadow transition-colors flex items-center gap-2"
                >
                  <FaRedo size={12} />
                  <span>{translate("retakeQuiz")}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
