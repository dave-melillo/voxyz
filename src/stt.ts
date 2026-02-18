/**
 * VoxYZ STT Service
 * Handles speech-to-text using Deepgram
 */
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { WebSocket } from 'ws';
import { config } from './config';

export class STTService {
  private deepgramClient: ReturnType<typeof createClient>;

  constructor() {
    this.deepgramClient = createClient(config.deepgram.apiKey);
  }

  /**
   * Create a Deepgram live transcription session and pipe audio through it.
   * Returns an EventEmitter-style object with `on('transcript', cb)` for live results.
   */
  createLiveSession(onTranscript: (text: string, isFinal: boolean) => void) {
    const connection = this.deepgramClient.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true,
      endpointing: 300,
      utterance_end_ms: 1000,
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('[STT] Deepgram session open');
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript ?? '';
      const isFinal = data.is_final ?? false;

      if (transcript.trim()) {
        onTranscript(transcript, isFinal);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error('[STT] Deepgram error:', err);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('[STT] Deepgram session closed');
    });

    return connection;
  }

  /**
   * Transcribe a single audio buffer (non-streaming).
   */
  async transcribeBuffer(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<string> {
    if (!config.deepgram.apiKey) {
      throw new Error('DEEPGRAM_API_KEY not configured');
    }

    const { result, error } = await this.deepgramClient.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        mimetype: mimeType,
      }
    );

    if (error) {
      throw new Error(`Deepgram transcription error: ${error.message}`);
    }

    return result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  }
}
