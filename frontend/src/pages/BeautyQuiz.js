import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const QUESTIONS = [
  {
    id: 1,
    question: "Which beauty vibe are you feeling today?",
    description: "Select all the rituals you are dreaming of.",
    type: "multi",
    options: [
      { id: "vibe_facial", text: "Glow-Up Facial", icon: "✨" },
      { id: "vibe_hair", text: "Hair Styling", icon: "💇" },
      { id: "vibe_bridal", text: "Bridal Package", icon: "👰" },
      { id: "vibe_spa", text: "Spa Retreat", icon: "🌿" },
      { id: "vibe_nails", text: "Nail Art", icon: "💅" }
    ]
  },
  {
    id: 2,
    question: "What's your salon style personality?",
    description: "How do you prefer your beauty appointments?",
    type: "single",
    options: [
      { id: "style_quick", text: "The Quick Queen", sub: "In, out, still glowing. Efficiency is my luxury." },
      { id: "style_pampered", text: "The Pampered Princess", sub: "I'm here for the full ritual. Massage, mask, and me-time." },
      { id: "style_insta", text: "The Insta Muse", sub: "If there's no mirror selfie, did it even happen? I love camera-ready looks." },
      { id: "style_natural", text: "The Natural Goddess", sub: "Enhance, don't mask. Effortless 'I woke up like this' radiance." }
    ]
  },
  {
    id: 3,
    question: "What's your go-to beauty treat when you need a pick-me-up?",
    description: "Your absolute favorite quick indulgence.",
    type: "single",
    options: [
      { id: "treat_hair", text: "A fresh haircut or blow-dry", sub: "New hair, new me." },
      { id: "treat_facial", text: "A deep facial or clean-up", sub: "I want my skin to breathe." },
      { id: "treat_spa", text: "A relaxing spa massage", sub: "Melt away the Dilli stress." },
      { id: "treat_nails", text: "Nail art & hand care", sub: "My hands tell my story." },
      { id: "treat_threading", text: "Threading / waxing", sub: "Quick and clean, instant confidence." }
    ]
  },
  {
    id: 4,
    question: "What's your usual budget per salon visit?",
    description: "We'll tailor suggestions to your sweet spot.",
    type: "single",
    options: [
      { id: "budget_under_500", text: "Under ₹500" },
      { id: "budget_500_1500", text: "₹500 – ₹1,500" },
      { id: "budget_1500_3000", text: "₹1,500 – ₹3,000" },
      { id: "budget_over_3000", text: "₹3,000+ (Price doesn't define my glow)" }
    ]
  },
  {
    id: 5,
    question: "What's your skin or hair type?",
    description: "This helps us suggest specific specialty treatments (Optional).",
    type: "type-multi",
    options: [
      { id: "type_oily", text: "Oily" },
      { id: "type_dry", text: "Dry" },
      { id: "type_combination", text: "Combination" },
      { id: "type_sensitive", text: "Sensitive" },
      { id: "type_treats", text: "✨ I'm just here for the treats", isClearAll: true }
    ]
  },
  {
    id: 6,
    question: "What kind of salon environment makes you feel most comfortable?",
    description: "The atmosphere is just as important as the service.",
    type: "single",
    options: [
      { id: "env_chic", text: "A chic, modern studio with curated music", sub: "I want to feel trendy." },
      { id: "env_homely", text: "A warm, homely parlour where the aunty knows my name", sub: "Community over everything." },
      { id: "env_spa", text: "A luxury spa with low lighting and a zen vibe", sub: "Silence and serenity are my soul food." },
      { id: "env_buzzing", text: "A high-energy, buzzing salon", sub: "Give me chit-chat and good energy." }
    ]
  },
  {
    id: 7,
    question: "What's the one thing you'd never skip before a big event?",
    description: "Your non-negotiable beauty ritual.",
    type: "single",
    options: [
      { id: "skip_eyebrows", text: "Perfectly shaped eyebrows", sub: "They frame my face." },
      { id: "skip_base", text: "A flawless base (foundation/glow facial)", sub: "Canvas first, art later." },
      { id: "skip_hair", text: "A statement hairstyle", sub: "My crown is my power." },
      { id: "skip_nails", text: "Long-lasting mani-pedi", sub: "I need those detail shots." }
    ]
  },
  {
    id: 8,
    question: "How far are you willing to glow?",
    description: "Let's find sanctuaries in your perimeter.",
    type: "single",
    options: [
      { id: "dist_2km", text: "Within 2 km", sub: "Neighbourhood only." },
      { id: "dist_5km", text: "Within 5 km", sub: "A short drive is fine." },
      { id: "dist_any", text: "I'll cross all of Dilli for the right artist", sub: "Distance is no obstacle to luxury." }
    ]
  }
];

const PERSONAS = {
  bridal_muse: {
    title: "The Royal Bridal Muse",
    emoji: "👑✨🌹",
    description: "You believe beauty is a sacred ritual. You love full, indulgent treatments, heritage aesthetics, and absolute flawlessness.",
    traits: [
      "Heritage Lover: Drawn to royal heritage gold and timeless bridal elegance.",
      "Flawless Base First: Focuses heavily on skincare preparation and HD details.",
      "Pampering Connoisseur: Prefers multi-hour luxurious treatments over quick fixes."
    ],
    mantra: "Canvas first, art later. True beauty is a ritual, never rushed."
  },
  quick_chic: {
    title: "The Urban Quick-Chic",
    emoji: "⚡💇‍♀️💄",
    description: "You are the ultimate modern multitasker. You value efficiency, neighborhood proximity, and sharp, clean results.",
    traits: [
      "Efficiency First: You want high-quality beauty services in record time.",
      "Community Oriented: Cozy local salons where you feel at home.",
      "Event Ready: Quick blow-dries, clean-ups, and brows are your non-negotiables."
    ],
    mantra: "In, out, and still glowing. My time is my ultimate luxury."
  },
  spa_soul: {
    title: "The Serene Spa Soul",
    emoji: "🌿🧘‍♀️🕯️",
    description: "To you, beauty is an inside-out journey. You view salon visits as therapy for your body and soul.",
    traits: [
      "Zen Seeker: You crave low lighting, relaxing music, and quiet comfort.",
      "Skin & Soul: Focused on body polishing, deep facials, and massage therapies.",
      "Relaxation Over Trend: You visit salons to escape the bustle of Delhi."
    ],
    mantra: "Silence, massage, and me-time. True radiance glows from a peaceful soul."
  },
  insta_diva: {
    title: "The Insta Muse",
    emoji: "📸💅🌟",
    description: "You are a trendsetter who loves statement styles, head-turning nail art, and photo-ready transformations.",
    traits: [
      "Camera Ready: You style your looks to stand out in photos and videos.",
      "Trend Lover: Curated chic spaces, modern nail extensions, and bold styling.",
      "Social Butterfly: You love chatty, high-energy salons with buzzing vibes."
    ],
    mantra: "If there's no mirror selfie, did it even happen?"
  }
};

export default function BeautyQuiz({ user, onProfileUpdate }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(searchParams.get('welcome') === 'true' ? 'welcome' : 'quiz');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loadingText, setLoadingText] = useState("");
  const [persona, setPersona] = useState(null);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef(null);

  // Auto-start if welcome parameter is false
  useEffect(() => {
    if (searchParams.get('welcome') !== 'true') {
      setStep('quiz');
    }
  }, [searchParams]);

  const handleStartQuiz = () => {
    setStep('quiz');
  };

  const handleSkipQuiz = () => {
    navigate('/');
  };

  const handleSelectOption = (qId, optionId, type) => {
    if (type === 'single') {
      setAnswers(prev => ({ ...prev, [qId]: optionId }));
      // Auto advance for single select after a tiny delay
      setTimeout(() => {
        if (currentIdx < QUESTIONS.length - 1) {
          setCurrentIdx(prev => prev + 1);
        } else {
          calculateResults({ ...answers, [qId]: optionId });
        }
      }, 350);
    } else {
      // Multi select / type-multi select
      setAnswers(prev => {
        const currentAnswers = prev[qId] || [];
        // If option has isClearAll
        const optionObj = QUESTIONS.find(q => q.id === qId).options.find(o => o.id === optionId);
        if (optionObj?.isClearAll) {
          return { ...prev, [qId]: [optionId] };
        }
        
        let newAnswers;
        if (currentAnswers.includes(optionId)) {
          newAnswers = currentAnswers.filter(id => id !== optionId);
        } else {
          // Filter out any isClearAll option if selecting something else
          const filtered = currentAnswers.filter(id => {
            const opt = QUESTIONS.find(q => q.id === qId).options.find(o => o.id === id);
            return !opt?.isClearAll;
          });
          newAnswers = [...filtered, optionId];
        }
        return { ...prev, [qId]: newAnswers };
      });
    }
  };

  const handleNext = () => {
    // Validate that at least one option is selected for multi questions
    const q = QUESTIONS[currentIdx];
    if (q.type !== 'single' && q.type !== 'type-multi' && (!answers[q.id] || answers[q.id].length === 0)) {
      alert("Please select at least one option to continue.");
      return;
    }
    
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      calculateResults(answers);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const calculateResults = async (finalAnswers) => {
    setStep('loading');
    setLoadingText("Blending jasmine oils and rose waters...");
    
    // Simulate loading/concierge crafting effect
    setTimeout(() => {
      setLoadingText("Analyzing your beauty vibrations...");
      setTimeout(async () => {
        // Calculate Persona
        // We look at Q1 (vibes), Q2 (style), Q3 (treats), Q6 (environment), Q7 (event non-negotiable)
        let scoreBridal = 0;
        let scoreQuick = 0;
        let scoreSpa = 0;
        let scoreInsta = 0;

        // Q1 Vibe matches
        const q1Val = finalAnswers[1] || [];
        if (q1Val.includes('vibe_bridal')) scoreBridal += 3;
        if (q1Val.includes('vibe_spa')) scoreSpa += 3;
        if (q1Val.includes('vibe_facial')) { scoreSpa += 1; scoreBridal += 1; }
        if (q1Val.includes('vibe_hair')) { scoreInsta += 2; scoreQuick += 1; }
        if (q1Val.includes('vibe_nails')) scoreInsta += 3;

        // Q2 Style personality
        const q2Val = finalAnswers[2];
        if (q2Val === 'style_quick') scoreQuick += 5;
        if (q2Val === 'style_pampered') scoreBridal += 3;
        if (q2Val === 'style_insta') scoreInsta += 5;
        if (q2Val === 'style_natural') scoreSpa += 4;

        // Q3 Beauty Treat
        const q3Val = finalAnswers[3];
        if (q3Val === 'treat_hair') { scoreQuick += 2; scoreInsta += 2; }
        if (q3Val === 'treat_facial') scoreSpa += 3;
        if (q3Val === 'treat_spa') scoreSpa += 5;
        if (q3Val === 'treat_nails') scoreInsta += 3;
        if (q3Val === 'treat_threading') scoreQuick += 4;

        // Q6 Environment
        const q6Val = finalAnswers[6];
        if (q6Val === 'env_chic') scoreInsta += 3;
        if (q6Val === 'env_homely') scoreQuick += 3;
        if (q6Val === 'env_spa') scoreSpa += 4;
        if (q6Val === 'env_buzzing') scoreInsta += 2;

        // Q7 Non-negotiable
        const q7Val = finalAnswers[7];
        if (q7Val === 'skip_eyebrows') scoreQuick += 2;
        if (q7Val === 'skip_base') scoreBridal += 4;
        if (q7Val === 'skip_hair') scoreInsta += 3;
        if (q7Val === 'skip_nails') scoreInsta += 2;

        // Pick persona with highest score
        let personaKey = 'insta_diva';
        const maxScore = Math.max(scoreBridal, scoreQuick, scoreSpa, scoreInsta);
        if (maxScore === scoreBridal) personaKey = 'bridal_muse';
        else if (maxScore === scoreQuick) personaKey = 'quick_chic';
        else if (maxScore === scoreSpa) personaKey = 'spa_soul';

        const selectedPersona = PERSONAS[personaKey];
        setPersona(selectedPersona);
        
        // Prepare payload to save on backend
        const beautyProfile = {
          persona: selectedPersona.title,
          emoji: selectedPersona.emoji,
          vibes: (finalAnswers[1] || []).map(id => QUESTIONS[0].options.find(o => o.id === id)?.text),
          style: QUESTIONS[1].options.find(o => o.id === finalAnswers[2])?.text || '',
          treat: QUESTIONS[2].options.find(o => o.id === finalAnswers[3])?.text || '',
          budget: QUESTIONS[3].options.find(o => o.id === finalAnswers[4])?.text || '',
          types: (finalAnswers[5] || []).map(id => QUESTIONS[4].options.find(o => o.id === id)?.text),
          environment: QUESTIONS[5].options.find(o => o.id === finalAnswers[6])?.text || '',
          nonNegotiable: QUESTIONS[6].options.find(o => o.id === finalAnswers[7])?.text || '',
          distance: QUESTIONS[7].options.find(o => o.id === finalAnswers[8])?.text || '',
          completed_at: new Date().toISOString()
        };

        try {
          setSaving(true);
          const res = await fetch('/api/customer/beauty-profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({ beautyProfile })
          });
          const result = await res.json();
          if (result.success) {
            // Update React context
            const updatedUser = { ...user, beautyProfile };
            onProfileUpdate(updatedUser);
          }
        } catch (e) {
          console.error("Failed to save beauty profile to backend:", e.message);
        } finally {
          setSaving(false);
          setStep('result');
        }
      }, 1000);
    }, 1000);
  };

  const handleDownloadCard = () => {
    if (!persona) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, 800, 800);
    
    // 1. Draw Ivory Background
    ctx.fillStyle = "#FCF9F2";
    ctx.fillRect(0, 0, 800, 800);
    
    // 2. Draw Decorative Gold Borders
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#C99A4B";
    ctx.strokeRect(30, 30, 740, 740);
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(201, 154, 75, 0.4)";
    ctx.strokeRect(40, 40, 720, 720);
    
    // Decorative corners
    const drawCornerFiligree = (x, y, rotation) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = "#C99A4B";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(20, 0);
      ctx.lineTo(20, 4);
      ctx.lineTo(4, 4);
      ctx.lineTo(4, 20);
      ctx.lineTo(0, 20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawCornerFiligree(35, 35, 0);
    drawCornerFiligree(765, 35, Math.PI / 2);
    drawCornerFiligree(765, 765, Math.PI);
    drawCornerFiligree(35, 765, -Math.PI / 2);

    // 3. Draw Delhi Glow Header
    ctx.fillStyle = "#4A2040";
    ctx.font = "italic bold 28px 'Playfair Display', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Delhi Glow", 400, 100);
    
    ctx.fillStyle = "rgba(74, 32, 64, 0.6)";
    ctx.font = "letter-spacing 3px 12px 'Outfit', Helvetica, sans-serif";
    ctx.fillText("YOUR BEAUTY SANCTUARY PERSONA", 400, 130);

    // Separator line
    ctx.beginPath();
    ctx.moveTo(250, 160);
    ctx.lineTo(550, 160);
    ctx.strokeStyle = "rgba(201, 154, 75, 0.4)";
    ctx.stroke();

    // 4. Draw User Name
    ctx.fillStyle = "rgba(74, 32, 64, 0.8)";
    ctx.font = "500 24px 'Outfit', Helvetica, sans-serif";
    ctx.fillText(`For ${user.name}`, 400, 210);

    // 5. Draw Persona Emoji and Title
    ctx.font = "48px 'Playfair Display', Georgia, serif";
    ctx.fillText(persona.emoji, 400, 280);
    
    ctx.fillStyle = "#4A2040";
    ctx.font = "bold 38px 'Playfair Display', Georgia, serif";
    ctx.fillText(persona.title, 400, 335);

    // Underline logo filigree
    ctx.fillStyle = "#C99A4B";
    ctx.fillText("✦  ✦  ✦", 400, 375);

    // 6. Draw Description Box
    ctx.fillStyle = "rgba(74, 32, 64, 0.04)";
    ctx.fillRect(80, 400, 640, 90);
    ctx.strokeStyle = "rgba(201, 154, 75, 0.25)";
    ctx.strokeRect(80, 400, 640, 90);

    ctx.fillStyle = "rgba(74, 32, 64, 0.85)";
    ctx.font = "300 16px 'Outfit', Helvetica, sans-serif";
    
    // Draw wrapped description text
    const words = persona.description.split(' ');
    let line = '';
    let y = 435;
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > 600 && n > 0) {
        ctx.fillText(line, 400, y);
        line = words[n] + ' ';
        y += 24;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 400, y);

    // 7. Draw Key Traits
    ctx.textAlign = "left";
    ctx.fillStyle = "#4A2040";
    ctx.font = "bold 20px 'Playfair Display', Georgia, serif";
    ctx.fillText("Your Glow Blueprint:", 100, 530);

    ctx.fillStyle = "rgba(74, 32, 64, 0.9)";
    ctx.font = "16px 'Outfit', Helvetica, sans-serif";
    let traitY = 565;
    persona.traits.forEach(trait => {
      // Draw diamond bullet points
      ctx.fillStyle = "#C99A4B";
      ctx.font = "14px Arial";
      ctx.fillText("✦", 100, traitY - 1);
      
      // Draw trait text
      ctx.fillStyle = "rgba(74, 32, 64, 0.9)";
      ctx.font = "300 15px 'Outfit', Helvetica, sans-serif";
      
      // Bold the header part of the trait
      const parts = trait.split(':');
      if (parts.length > 1) {
        ctx.font = "bold 15px 'Outfit', Helvetica, sans-serif";
        ctx.fillText(parts[0] + ":", 125, traitY);
        const prefixWidth = ctx.measureText(parts[0] + ": ").width;
        ctx.font = "300 15px 'Outfit', Helvetica, sans-serif";
        ctx.fillText(parts[1].trim(), 125 + prefixWidth, traitY);
      } else {
        ctx.fillText(trait, 125, traitY);
      }
      traitY += 30;
    });

    // 8. Draw Mantra
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(74, 32, 64, 0.8)";
    ctx.font = "italic 16px 'Playfair Display', Georgia, serif";
    ctx.fillText(`"${persona.mantra}"`, 400, 680);

    // 9. Draw Footer Info
    ctx.fillStyle = "rgba(74, 32, 64, 0.4)";
    ctx.font = "300 12px 'Outfit', Helvetica, sans-serif";
    ctx.fillText("Find your matches at delhiglow.in", 400, 730);

    // Create download link
    const imageURI = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `DelhiGlow_Persona_${user.name.replace(/\s+/g, '_')}.png`;
    link.href = imageURI;
    link.click();
  };

  const q = QUESTIONS[currentIdx];

  return (
    <section className="section section-ivory" style={{ minHeight: '88vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      <div className="jaali-pattern-bg" />
      
      {/* Hidden Canvas for Download */}
      <canvas ref={canvasRef} width={800} height={800} style={{ display: 'none' }} />

      <div className="container" style={{ position: 'relative', zIndex: 5, width: '100%' }}>
        {step === 'welcome' && (
          <div className="quiz-card-frame welcome-fade-in" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>👑✨⚜️</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 700, color: "var(--charcoal)", marginBottom: "16px" }}>
              Welcome to Delhi Glow, <span style={{ color: "var(--crimson)" }}>{user.name}</span>
            </h1>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--charcoal-light)", lineHeight: "1.6", marginBottom: "32px", fontStyle: "italic" }}>
              "Dilli's style is as rich as its history. Let's find your signature glow in the capital."
            </p>
            <p style={{ fontSize: "1rem", color: "var(--charcoal-light)", marginBottom: "40px", fontWeight: 300 }}>
              Take our 2-minute beauty profile quiz to discover your unique beauty persona and instantly calculate personalized match percentages for Delhi's finest wellness sanctuaries.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <button onClick={handleStartQuiz} className="btn-primary" style={{ width: '100%', maxWidth: '280px', padding: '14px 28px', fontSize: '16px' }}>
                Start My Beauty Quiz
              </button>
              <button onClick={handleSkipQuiz} className="btn-outline" style={{ width: '100%', maxWidth: '280px', border: '1px solid rgba(122, 12, 46, 0.3)' }}>
                Maybe later
              </button>
            </div>
          </div>
        )}

        {step === 'quiz' && (
          <div className="quiz-card-frame" style={{ maxWidth: '720px', margin: '0 auto' }}>
            {/* Progress Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold)' }}>
                QUESTION {currentIdx + 1} OF {QUESTIONS.length}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--charcoal-light)' }}>
                {Math.round(((currentIdx) / QUESTIONS.length) * 100)}% Complete
              </span>
            </div>
            
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '4px', background: 'var(--rosewater-light)', borderRadius: '10px', marginBottom: '40px', overflow: 'hidden' }}>
              <div style={{ width: `${((currentIdx + 1) / QUESTIONS.length) * 100}%`, height: '100%', background: 'var(--gold)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </div>

            {/* Question Text */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '8px', lineHeight: 1.25 }}>
                {q.question}
              </h2>
              {q.description && (
                <p style={{ fontSize: '14.5px', color: 'var(--charcoal-light)', fontWeight: 300 }}>
                  {q.description}
                </p>
              )}
            </div>

            {/* Option Rendering */}
            {q.type === 'multi' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {q.options.map(opt => {
                  const isSelected = (answers[q.id] || []).includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(q.id, opt.id, 'multi')}
                      className={`quiz-option-tile ${isSelected ? 'selected' : ''}`}
                      style={{ padding: '24px 16px', textAlign: 'center', cursor: 'pointer', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}
                    >
                      <span style={{ fontSize: '2.5rem' }}>{opt.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'single' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {q.options.map(opt => {
                  const isSelected = answers[q.id] === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(q.id, opt.id, 'single')}
                      className={`quiz-option-row ${isSelected ? 'selected' : ''}`}
                      style={{ padding: '16px 20px', cursor: 'pointer', borderRadius: '12px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="radio-circle" style={{ flexShrink: 0 }}>
                          {isSelected && <div className="radio-dot" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '15px' }}>{opt.text}</div>
                          {opt.sub && <div style={{ fontSize: '13px', color: 'var(--charcoal-light)', fontWeight: 300, marginTop: '2px' }}>{opt.sub}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'type-multi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  {q.options.slice(0, 4).map(opt => {
                    const isSelected = (answers[q.id] || []).includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(q.id, opt.id, 'multi')}
                        className={`quiz-option-tile ${isSelected ? 'selected' : ''}`}
                        style={{ padding: '20px 12px', textAlign: 'center', cursor: 'pointer', borderRadius: '10px' }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '14.5px' }}>{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Clear all fallback option */}
                {q.options.slice(4).map(opt => {
                  const isSelected = (answers[q.id] || []).includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(q.id, opt.id, 'multi')}
                      className={`quiz-option-row ${isSelected ? 'selected' : ''}`}
                      style={{ padding: '14px 20px', cursor: 'pointer', borderRadius: '10px', textAlign: 'center', borderStyle: 'dashed' }}
                    >
                      <span style={{ fontWeight: 500, fontSize: '14px', color: isSelected ? 'var(--crimson)' : 'var(--charcoal-light)' }}>{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(212, 175, 55, 0.15)', paddingTop: '24px', marginTop: '16px' }}>
              <button onClick={handlePrev} className="btn btn-outline" disabled={currentIdx === 0} style={{ opacity: currentIdx === 0 ? 0.3 : 1 }}>
                ← Back
              </button>
              
              {q.type !== 'single' && (
                <button onClick={handleNext} className="btn btn-primary">
                  {currentIdx === QUESTIONS.length - 1 ? 'Reveal My Glow ✨' : 'Continue ➔'}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="quiz-card-frame" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: '60px 40px' }}>
            <div className="concierge-loader">
              <div className="flower-ripple">
                <span>⚜️</span>
              </div>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--charcoal)', marginBottom: '12px' }}>
              Crafting Your Glow Profile
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--charcoal-light)', fontStyle: 'italic' }}>
              {loadingText}
            </p>
          </div>
        )}

        {step === 'result' && persona && (
          <div className="welcome-fade-in" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="quiz-card-frame" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden', border: '2px solid var(--gold)', boxShadow: '0 10px 40px rgba(74, 32, 64, 0.1)' }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'rgba(212, 175, 55, 0.05)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', bottom: -50, left: -50, width: 150, height: 150, background: 'rgba(74, 32, 64, 0.03)', borderRadius: '50%' }} />

              <div style={{ fontSize: '3rem', marginBottom: '8px', animation: 'scaleUp 0.6s ease' }}>{persona.emoji}</div>
              <span style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase' }}>
                YOUR DELHI GLOW PERSONA
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--charcoal)', marginTop: '8px', marginBottom: '24px' }}>
                {persona.title}
              </h2>
              
              <div className="persona-desc-box" style={{ background: 'var(--ivory-dark)', padding: '20px 24px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.15)', marginBottom: '32px' }}>
                <p style={{ color: 'var(--charcoal)', fontSize: '14.5px', lineHeight: '1.6', fontWeight: 300 }}>
                  {persona.description}
                </p>
              </div>

              <div style={{ textAlign: 'left', marginBottom: '32px' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--charcoal)', fontWeight: 600, marginBottom: '12px', borderBottom: '1px dashed rgba(212, 175, 55, 0.3)', paddingBottom: '6px' }}>
                  Your Beauty Blueprint:
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {persona.traits.map((trait, idx) => {
                    const parts = trait.split(':');
                    return (
                      <li key={idx} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: 'var(--charcoal-light)', lineHeight: '1.4', fontWeight: 300 }}>
                        <span style={{ color: 'var(--gold)' }}>✦</span>
                        <span>
                          <strong>{parts[0]}:</strong>{parts[1]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div style={{ fontStyle: 'italic', color: 'var(--crimson)', fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '40px', borderTop: '1px solid rgba(212, 175, 55, 0.15)', paddingTop: '20px' }}>
                "{persona.mantra}"
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <button onClick={handleDownloadCard} className="btn-outline-gold">
                  <span>📸</span> Share My Persona
                </button>
                <div className="quiz-results-actions">
                  <button onClick={() => navigate('/salons?sort=match')} className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                    Explore My Matches ➔
                  </button>
                  <button onClick={() => navigate('/profile')} className="btn-outline" style={{ flex: 1, padding: '12px' }}>
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
            
            <p style={{ textAlign: 'center', color: 'var(--charcoal-light)', fontSize: '13px', marginTop: '24px', fontWeight: 300 }}>
              Your profile has been saved. We've updated your catalog search matching rankings accordingly.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
