import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Bot,
  User,
  Radio,
  Send,
  RefreshCw,
  HelpCircle,
  Shield,
  Activity,
  Award
} from 'lucide-react';
import {
  LiveAudioClient,
  LiveAssistantState,
  LiveTranscriptEntry,
} from '../../services/liveAudioClient';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId?: string;
}

const PRESET_SIH_PROMPTS = [
  'Tell me about our SIH team and project mission',
  'How does the 12-stage forensic pipeline work?',
  'How does Multi-Vector Evidence Fusion prevent false positives?',
  'What makes our investigation docket court-admissible?',
  'How do you detect spoofed headers and DKIM replay?',
];

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  caseId,
}) => {
  const [clientState, setClientState] = useState<LiveAssistantState>('idle');
  const [transcripts, setTranscripts] = useState<LiveTranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>('');
  const [mode, setMode] = useState<'gemini-live' | 'fallback'>('gemini-live');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientRef = useRef<LiveAudioClient | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setClientState('idle');
      return;
    }

    const client = new LiveAudioClient({
      onStateChange: (newState) => setClientState(newState),
      onTranscript: (entry) => {
        setTranscripts((prev) => [...prev, entry]);
      },
      onAudioLevel: (lvl) => setAudioLevel(lvl),
      onError: (err) => setErrorMessage(err),
      onModeChange: (m) => setMode(m),
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  if (!isOpen) return null;

  const handleToggleMute = () => {
    if (clientRef.current) {
      const muted = clientRef.current.toggleMute();
      setIsMuted(muted);
    }
  };

  const handleToggleSpeaker = () => {
    if (clientRef.current) {
      const muted = clientRef.current.toggleSpeaker();
      setIsSpeakerMuted(muted);
    }
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || !clientRef.current) return;
    clientRef.current.sendTextPrompt(textInput.trim());
    setTextInput('');
  };

  const handleSelectPrompt = (prompt: string) => {
    if (!clientRef.current) return;
    clientRef.current.sendTextPrompt(prompt);
  };

  const handleReconnect = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current.connect();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border border-[#D9E1E6] rounded-2xl w-full max-w-3xl h-[90vh] max-h-[800px] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="p-4 bg-[#142238] text-white flex items-center justify-between border-b border-[#24354d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2DBDCA]/20 to-[#142238] border border-[#2DBDCA]/40 flex items-center justify-center text-[#2DBDCA]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span>SIH AI Voice Assistant</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2DBDCA]/20 text-[#2DBDCA] border border-[#2DBDCA]/40">
                    GEMINI 3.8 LIVE
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-[#A0B0C0] flex items-center gap-2">
                <span>Smart India Hackathon Team</span>
                <span>•</span>
                <span>Voice: Zephyr (Neural 24kHz)</span>
                {caseId && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[#2DBDCA]">Case: {caseId}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReconnect}
              title="Reconnect Session"
              className="p-2 text-[#A0B0C0] hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Voice Assistant"
              className="p-2 text-[#A0B0C0] hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* State Banner & SIH Badge */}
        <div className="px-4 py-2 bg-[#F5F6F4] border-b border-[#D9E1E6] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                clientState === 'speaking'
                  ? 'bg-[#1FA463] animate-ping'
                  : clientState === 'listening'
                  ? 'bg-[#2DBDCA] animate-pulse'
                  : clientState === 'thinking'
                  ? 'bg-[#D89428] animate-spin'
                  : clientState === 'error'
                  ? 'bg-[#D94A4A]'
                  : 'bg-[#8CA0B3]'
              }`}
            />
            <span className="font-medium text-[#142238] uppercase text-[10px] tracking-wider">
              {clientState === 'speaking'
                ? 'Speaking (Gemini Live Audio)'
                : clientState === 'listening'
                ? 'Listening to your microphone...'
                : clientState === 'thinking'
                ? 'Reasoning...'
                : clientState === 'connecting'
                ? 'Establishing live WebSocket...'
                : 'Ready'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#53657A]">
            <span className="flex items-center gap-1 font-semibold text-[#142238]">
              <Award className="w-3.5 h-3.5 text-[#2DBDCA]" />
              SIH Threat Intelligence Project
            </span>
            <span>|</span>
            <span className="font-mono text-[10px]">
              {mode === 'gemini-live' ? 'Native Full-Duplex' : 'Voice Synthesis Mode'}
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-amber-800 font-bold ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Central Audio Visualizer Section */}
        <div className="py-6 px-4 bg-gradient-to-b from-[#142238]/5 to-transparent flex flex-col items-center justify-center border-b border-[#D9E1E6]/60">
          <div className="relative flex items-center justify-center">
            {/* Outer Pulsing Wave Rings */}
            <div
              className="absolute w-28 h-28 rounded-full border border-[#2DBDCA]/30 transition-transform duration-75"
              style={{
                transform: `scale(${1 + audioLevel * 0.8})`,
                opacity: clientState === 'listening' ? 0.8 : 0.2,
              }}
            />
            <div
              className="absolute w-36 h-36 rounded-full border border-[#2DBDCA]/20 transition-transform duration-100"
              style={{
                transform: `scale(${1 + audioLevel * 1.3})`,
                opacity: clientState === 'listening' ? 0.6 : 0.1,
              }}
            />

            {/* Central Main Mic Bubble */}
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
                clientState === 'speaking'
                  ? 'bg-gradient-to-tr from-[#1FA463] to-[#2DBDCA] text-white scale-105 shadow-[#2DBDCA]/30'
                  : clientState === 'listening'
                  ? 'bg-gradient-to-tr from-[#142238] to-[#1f3556] text-[#2DBDCA] border-2 border-[#2DBDCA]'
                  : clientState === 'thinking'
                  ? 'bg-gradient-to-tr from-[#D89428] to-[#142238] text-white animate-pulse'
                  : 'bg-[#142238] text-[#8CA0B3]'
              }`}
            >
              {clientState === 'speaking' ? (
                <Activity className="w-8 h-8 animate-pulse" />
              ) : isMuted ? (
                <MicOff className="w-8 h-8 text-red-400" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </div>
          </div>

          {/* Soundwave Bars Simulation */}
          <div className="flex items-center gap-1 mt-4 h-6">
            {[0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.9, 0.6, 0.3].map((multiplier, i) => {
              const activeHeight =
                clientState === 'speaking'
                  ? Math.sin(Date.now() / 200 + i) * 10 + 12
                  : clientState === 'listening'
                  ? Math.max(4, audioLevel * 24 * multiplier)
                  : 4;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    clientState === 'speaking'
                      ? 'bg-[#1FA463]'
                      : clientState === 'listening'
                      ? 'bg-[#2DBDCA]'
                      : 'bg-[#D9E1E6]'
                  }`}
                  style={{ height: `${activeHeight}px` }}
                />
              );
            })}
          </div>

          <p className="text-xs text-[#53657A] mt-2 font-medium">
            {clientState === 'speaking'
              ? 'Speaking response via Gemini Live...'
              : isMuted
              ? 'Microphone is muted'
              : 'Speak or choose a topic below to hear AI voice briefing'}
          </p>
        </div>

        {/* Conversation Transcript Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFBFB]">
          {transcripts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#53657A]">
              <div className="w-12 h-12 rounded-full bg-white border border-[#D9E1E6] flex items-center justify-center text-[#2DBDCA] mb-3 shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#142238] mb-1">Interactive SIH Voice Briefing</h4>
              <p className="text-xs max-w-md text-[#53657A] leading-relaxed">
                Speak directly into your microphone or tap one of the preset prompts below. Our AI assistant will explain the Smart India Hackathon project, forensic pipeline stages, and multi-vector fusion.
              </p>
            </div>
          ) : (
            transcripts.map((t) => (
              <div
                key={t.id}
                className={`flex gap-3 text-xs ${
                  t.speaker === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {t.speaker === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#142238] text-[#2DBDCA] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-xl p-3 shadow-xs ${
                    t.speaker === 'user'
                      ? 'bg-[#142238] text-white rounded-br-xs'
                      : 'bg-white border border-[#D9E1E6] text-[#142238] rounded-bl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        t.speaker === 'user' ? 'text-[#2DBDCA]' : 'text-[#0e808c]'
                      }`}
                    >
                      {t.speaker === 'user' ? 'Investigator' : 'SIH AI Voice Assistant'}
                    </span>
                    <span className="text-[9px] opacity-60 font-mono">{t.timestamp}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{t.text}</p>
                </div>

                {t.speaker === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[#2DBDCA] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Preset Prompt Suggestions */}
        <div className="px-4 py-2.5 bg-white border-t border-[#D9E1E6] overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[#53657A] uppercase shrink-0 mr-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-[#2DBDCA]" />
              Quick Topics:
            </span>
            {PRESET_SIH_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPrompt(prompt)}
                className="px-2.5 py-1 rounded-full bg-[#F5F6F4] hover:bg-[#EAECE9] border border-[#D9E1E6] text-[#142238] text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
              >
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Control & Input Bar */}
        <div className="p-3 bg-white border-t border-[#D9E1E6] flex items-center gap-2">
          {/* Mute Mic Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center ${
              isMuted
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-[#F5F6F4] border-[#D9E1E6] text-[#142238] hover:bg-[#EAECE9]'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Mute Speaker Button */}
          <button
            type="button"
            onClick={handleToggleSpeaker}
            className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center ${
              isSpeakerMuted
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-[#F5F6F4] border-[#D9E1E6] text-[#142238] hover:bg-[#EAECE9]'
            }`}
            title={isSpeakerMuted ? 'Unmute Audio Playback' : 'Mute Audio Playback'}
          >
            {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Text Question Form */}
          <form onSubmit={handleSendText} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask anything about our SIH team, platform stages, or evidence fusion..."
              className="flex-1 bg-[#F5F6F4] border border-[#D9E1E6] rounded-lg px-3 py-2 text-xs text-[#142238] focus:outline-none focus:border-[#2DBDCA] focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-3.5 py-2 bg-[#142238] text-white rounded-lg text-xs font-bold hover:bg-[#1f3556] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5 text-[#2DBDCA]" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
