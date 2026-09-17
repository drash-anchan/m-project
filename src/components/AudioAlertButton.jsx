import { useEffect, useState, useRef } from "react";
import { useLanguage } from "../lib/i18n/LanguageContext";

const BCP47_MAP = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  ml: "ml-IN",
};

const VERNACULAR_SCRIPTS = {
  en: "Attention: Severe flash flood and landslide risk detected. Evacuation advisories active for low-lying river basins and hill slopes. Please proceed to designated emergency shelters.",
  hi: "सावधान: क्षेत्र में तीव्र बाढ़ और भूस्खलन की चेतावनी जारी की गई है। कृपया तुरंत ऊंचे स्थानों और सुरक्षित आश्रय स्थलों की ओर प्रस्थान करें।",
  kn: "ಎಚ್ಚರಿಕೆ: ಈ ವಲಯದಲ್ಲಿ ಭಾರಿ ಪ್ರವಾಹ ಮತ್ತು ಭೂಕುಸಿತದ ತೀವ್ರ ಅಪಾಯ ಪತ್ತೆಯಾಗಿದೆ. ನದಿ ಪಾತ್ರದ ನಿವಾಸಿಗಳು ತಕ್ಷಣವೇ ಅಧಿಕೃತ ಆಶ್ರಯ ಕೇಂದ್ರಗಳಿಗೆ ಸ್ಥಳಾಂತರಗೊಳ್ಳಿ.",
  ta: "எச்சரிக்கை: இந்த பகுதியில் கடுமையான வெள்ளம் மற்றும் நிலச்சரிவு ஆபத்து கண்டறியப்பட்டுள்ளது. உடனடியாக பாதுகாப்பான தங்குமிடங்களுக்கு செல்லவும்.",
  te: "హెచ్చరిక: తీవ్ర వరద మరియు కొండచరియల ప్రమాదం పొంచి ఉంది. దయచేసి వెంటనే సురక్షిత ఆశ్రయ కేంద్రాలకు వెళ్లండి.",
  bn: "সতর্কতা: এলাকায় মারাত্মক বন্যা এবং ভূমিধসের ঝুঁকি রয়েছে। অবিলম্বে নিকটস্থ নিরাপদ আশ্রয়কেন্দ্রে আশ্রয় নিন।",
  mr: "सावधान: या भागात तीव्र पूर आणि दरड कोसळण्याचा धोका निर्माण झाला आहे. कृपया त्वरित सुरक्षित निवाऱ्यात जा.",
  ml: "മുന്നറിയിപ്പ്: ഈ പ്രദേശത്ത് കനത്ത പ്രളയവും ഉരുൾപൊട്ടൽ സാധ്യതയും കണ്ടെത്തിയിരിക്കുന്നു. നദീതീരങ്ങളിൽ ഉള്ളവരും മലഞ്ചെരിവുകളിൽ ഉള്ളവരും ഉടൻ തന്നെ സുരക്ഷിത ദുരിതാശ്വാസ ക്യാമ്പുകളിലേക്ക് മാറുക.",
};

const LANG_OPTIONS = [
  { code: "ml", label: "മലയാളം" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "bn", label: "বাংলা" },
  { code: "mr", label: "मराठी" },
  { code: "en", label: "English" },
];

function playEmergencyChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    // Two-tone attention chime (880Hz -> 587Hz)
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(587, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.38);
  } catch {
    /* AudioContext fallback */
  }
}

export default function AudioAlertButton({
  text,
  label = "Audio Alert",
  className = "",
  showLangPicker = true,
}) {
  const { language: currentLang } = useLanguage();
  const [activeLang, setActiveLang] = useState(currentLang || "ml");
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const activeAudioRef = useRef(null);

  // Sync active speech language with site language when site language changes
  useEffect(() => {
    if (currentLang && BCP47_MAP[currentLang]) {
      stopAllAudio();
      setActiveLang(currentLang);
    }
  }, [currentLang]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    function updateVoices() {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setVoices(v);
      }
    }

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      stopAllAudio();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  function stopAllAudio() {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current.src = "";
      } catch {
        /* ignore */
      }
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    setSpeaking(false);
  }

  function playSpeechSynthesisFallback() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const targetLang = BCP47_MAP[activeLang] || "en-IN";
    const speechContent =
      activeLang !== "en" && VERNACULAR_SCRIPTS[activeLang]
        ? VERNACULAR_SCRIPTS[activeLang]
        : text || VERNACULAR_SCRIPTS.en;

    const utterance = new SpeechSynthesisUtterance(speechContent);
    utterance.lang = targetLang;
    utterance.volume = 1.0;
    utterance.rate = 0.90;
    utterance.pitch = 1.0;

    const matchedVoice = availableVoices.find(
      (v) =>
        v.lang === targetLang ||
        v.lang.toLowerCase().startsWith(activeLang.toLowerCase()) ||
        v.lang.replace("_", "-").toLowerCase().startsWith(activeLang.toLowerCase()) ||
        (v.name && v.name.toLowerCase().includes(activeLang.toLowerCase()))
    );

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        setSpeaking(false);
      }
    }, 50);
  }

  function playCustomTextAudio(customText) {
    const availableVoices = voices.length > 0 ? voices : (window.speechSynthesis?.getVoices() || []);
    const targetLang = BCP47_MAP[activeLang] || "en-IN";

    const matchedVoice = availableVoices.find(
      (v) =>
        v.lang === targetLang ||
        v.lang.toLowerCase().startsWith(activeLang.toLowerCase()) ||
        v.lang.replace("_", "-").toLowerCase().startsWith(activeLang.toLowerCase())
    );

    if (matchedVoice && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(customText);
      utterance.voice = matchedVoice;
      utterance.lang = targetLang;
      utterance.rate = 0.92;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          setSpeaking(false);
        }
      }, 50);
    } else {
      const streamUrl = `/api/tts?lang=${encodeURIComponent(activeLang)}&text=${encodeURIComponent(customText.slice(0, 200))}`;
      const audio = new Audio(streamUrl);
      activeAudioRef.current = audio;

      audio.onplay = () => setSpeaking(true);
      audio.onended = () => {
        setSpeaking(false);
        activeAudioRef.current = null;
      };
      audio.onerror = () => {
        const fallbackAudio = new Audio(`/audio/alerts/alert_${activeLang}.mp3`);
        activeAudioRef.current = fallbackAudio;
        fallbackAudio.onended = () => {
          setSpeaking(false);
          activeAudioRef.current = null;
        };
        fallbackAudio.play().catch(() => setSpeaking(false));
      };

      audio.play().catch(() => {
        const fallbackAudio = new Audio(`/audio/alerts/alert_${activeLang}.mp3`);
        activeAudioRef.current = fallbackAudio;
        fallbackAudio.onended = () => {
          setSpeaking(false);
          activeAudioRef.current = null;
        };
        fallbackAudio.play().catch(() => setSpeaking(false));
      });
    }
  }

  function toggleSpeech(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (speaking) {
      stopAllAudio();
      return;
    }

    // 1. Play immediate audio attention chime (audible instantly on any PC or phone)
    playEmergencyChime();

    // 2. Stop any lingering audio or speech
    stopAllAudio();

    // 3. Mark speaking active for immediate visual feedback
    setSpeaking(true);

    const isStandardAlert =
      !text ||
      Object.values(VERNACULAR_SCRIPTS).includes(text) ||
      text.toLowerCase().includes("attention: severe flash flood") ||
      text.toLowerCase().includes("evacuation advisories");

    if (isStandardAlert) {
      // Direct high-fidelity regional MP3 audio file
      const alertAudioUrl = `/audio/alerts/alert_${activeLang}.mp3`;
      const audio = new Audio(alertAudioUrl);
      audio.preload = "auto";
      activeAudioRef.current = audio;

      audio.onplay = () => setSpeaking(true);
      audio.onended = () => {
        setSpeaking(false);
        activeAudioRef.current = null;
      };
      audio.onerror = (err) => {
        console.warn("Audio file error, falling back to speech synthesis:", err);
        activeAudioRef.current = null;
        playSpeechSynthesisFallback();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Audio play promise rejected, trying synthesis:", err);
          playSpeechSynthesisFallback();
        });
      }
      return;
    }

    // Custom dynamic text provided
    playCustomTextAudio(text);
  }

  return (
    <div className={`inline-flex items-center rounded-full bg-white/10 border border-white/20 p-1 shadow-md ${className}`}>
      <button
        type="button"
        onClick={toggleSpeech}
        aria-label={speaking ? "Stop voice broadcast" : label}
        title={speaking ? "Click to stop audio" : "Audio voice alert in regional language"}
        className={`inline-flex items-center gap-2 rounded-full transition-all duration-200 text-xs font-semibold px-3 py-1.5 cursor-pointer select-none ${
          speaking
            ? "bg-amber-400 text-black border border-amber-300 shadow-lg shadow-amber-400/25 animate-pulse"
            : "bg-white text-black hover:bg-white/90"
        }`}
      >
        <i
          className={`fa-solid ${
            speaking ? "fa-volume-high animate-bounce" : "fa-volume-high"
          }`}
        />
        <span>{speaking ? "Playing…" : label}</span>
        {speaking && (
          <span className="flex items-center gap-0.5 ml-1">
            <span className="h-2 w-0.5 bg-black animate-[pulse_0.6s_ease-in-out_infinite]" />
            <span className="h-3 w-0.5 bg-black animate-[pulse_0.4s_ease-in-out_infinite]" />
            <span className="h-2 w-0.5 bg-black animate-[pulse_0.8s_ease-in-out_infinite]" />
          </span>
        )}
      </button>

      {showLangPicker && (
        <div className="flex items-center gap-1 pl-2 pr-1 text-[11px] font-mono">
          <i className="fa-solid fa-language text-white/50 text-xs mr-0.5" />
          <select
            value={activeLang}
            onChange={(e) => {
              const newLang = e.target.value;
              stopAllAudio();
              setActiveLang(newLang);
            }}
            className="bg-black/60 text-white rounded-md px-1.5 py-0.5 border border-white/10 outline-none text-xs cursor-pointer"
            title="Select audio broadcast language"
          >
            {LANG_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code} className="bg-neutral-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
