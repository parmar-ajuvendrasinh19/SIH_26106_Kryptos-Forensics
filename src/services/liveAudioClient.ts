/**
 * Kryptos Forensics — Gemini 3.8 Live API Audio & WebSocket Client
 * Bridges browser microphone (16kHz PCM) and Gemini 3.8 Live neural audio output (24kHz PCM).
 */

export interface LiveTranscriptEntry {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export type LiveAssistantState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface LiveClientConfig {
  onStateChange: (state: LiveAssistantState) => void;
  onTranscript: (entry: LiveTranscriptEntry) => void;
  onAudioLevel: (level: number) => void;
  onError: (err: string) => void;
  onModeChange?: (mode: 'gemini-live' | 'fallback') => void;
}

export class LiveAudioClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isMuted = false;
  private isSpeakerMuted = false;
  private mode: 'gemini-live' | 'fallback' = 'gemini-live';
  private currentState: LiveAssistantState = 'idle';

  constructor(private config: LiveClientConfig) {}

  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.setState('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log('[LiveClient] Connected to server WebSocket');
        await this.initMicrophone();
        this.setState('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('[LiveClient] Error parsing message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[LiveClient] WebSocket error:', err);
        this.setState('error');
        this.config.onError('Connection error to voice assistant server.');
      };

      this.ws.onclose = () => {
        console.log('[LiveClient] WebSocket connection closed');
        this.stopAudioStreams();
        this.setState('idle');
      };
    } catch (err: any) {
      console.error('[LiveClient] Failed to initialize connection:', err);
      this.setState('error');
      this.config.onError(err.message || 'Microphone access denied or connection failed.');
    }
  }

  private async initMicrophone(): Promise<void> {
    try {
      this.inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      this.outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      // Resume contexts in case browser suspended them
      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }
      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.sourceNode = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      // Buffer size 4096 = ~256ms of 16kHz audio chunks
      this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (this.isMuted) {
          this.config.onAudioLevel(0);
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Compute RMS level for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const level = Math.min(1, rms * 5); // Normalized level 0-1
        this.config.onAudioLevel(level);

        // If currently connected to gemini-live, stream raw 16kHz PCM
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.mode === 'gemini-live') {
          const base64PCM = this.floatTo16BitBase64(inputData);
          this.ws.send(JSON.stringify({ type: 'audio', audio: base64PCM }));
        }
      };

      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioCtx.destination);
    } catch (err: any) {
      console.warn('[LiveClient] Microphone permission was not granted or not available:', err);
      // Even without mic, audio output and text prompts can still function
    }
  }

  private handleServerMessage(msg: any): void {
    if (msg.type === 'ready') {
      this.mode = 'gemini-live';
      this.config.onModeChange?.('gemini-live');
      this.setState('listening');
      this.addTranscript('assistant', `Hello! I am the Kryptos Forensics AI Assistant for our Smart India Hackathon team. How can I assist your investigation today?`);
    } else if (msg.type === 'fallback_mode') {
      this.mode = 'fallback';
      this.config.onModeChange?.('fallback');
      this.setState('listening');
      this.addTranscript(
        'assistant',
        `Kryptos Forensics SIH Voice Briefing active. You can ask about our team mission, 12-stage pipeline, or multi-vector evidence fusion.`
      );
    } else if (msg.type === 'audio' && msg.audio) {
      this.setState('speaking');
      if (!this.isSpeakerMuted && this.outputAudioCtx) {
        this.playAudioChunk(msg.audio);
      }
    } else if (msg.type === 'text' && msg.text) {
      this.addTranscript('assistant', msg.text);

      if (this.mode === 'fallback' && !this.isSpeakerMuted && 'speechSynthesis' in window) {
        this.speakFallback(msg.text);
      }
    } else if (msg.type === 'interrupted') {
      this.stopPlayback();
      this.setState('listening');
    } else if (msg.type === 'error') {
      this.config.onError(msg.error || 'Server reported error.');
    }
  }

  public sendTextPrompt(text: string): void {
    if (!text.trim()) return;

    this.addTranscript('user', text);
    this.setState('thinking');

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text', text }));
    }
  }

  private playAudioChunk(base64Pcm: string): void {
    if (!this.outputAudioCtx) return;

    try {
      const float32 = this.base64ToFloat32Array(base64Pcm);
      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioCtx.destination);

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0 && this.currentState === 'speaking') {
          this.setState('listening');
        }
      };
    } catch (err) {
      console.error('[LiveClient] Audio playback error:', err);
    }
  }

  private speakFallback(text: string): void {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onstart = () => this.setState('speaking');
      utterance.onend = () => this.setState('listening');
      utterance.onerror = () => this.setState('listening');
      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  public stopPlayback(): void {
    this.activeSources.forEach((src) => {
      try {
        src.stop();
      } catch {}
    });
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public toggleSpeaker(): boolean {
    this.isSpeakerMuted = !this.isSpeakerMuted;
    if (this.isSpeakerMuted) {
      this.stopPlayback();
    }
    return this.isSpeakerMuted;
  }

  public disconnect(): void {
    this.stopPlayback();
    this.stopAudioStreams();

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.setState('idle');
  }

  private stopAudioStreams(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch {}
      this.outputAudioCtx = null;
    }
  }

  private setState(state: LiveAssistantState): void {
    this.currentState = state;
    this.config.onStateChange(state);
  }

  private addTranscript(speaker: 'user' | 'assistant', text: string): void {
    const entry: LiveTranscriptEntry = {
      id: `tc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      speaker,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    this.config.onTranscript(entry);
  }

  // Float32 [-1.0, 1.0] to 16-bit linear PCM base64
  private floatTo16BitBase64(input: Float32Array): string {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(output.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // 16-bit PCM base64 to Float32 [-1.0, 1.0]
  private base64ToFloat32Array(base64: string): Float32Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  }
}
