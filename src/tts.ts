/**
 * VoxYZ TTS Service
 * Handles text-to-speech using ElevenLabs
 */
import axios from 'axios';
import { config } from './config';
import { TTSRequest, TTSResponse } from './types';

export class TTSService {
  private elevenlabsApiKey: string;

  constructor() {
    this.elevenlabsApiKey = config.elevenlabs.apiKey;
  }

  /**
   * Get voice ID for an agent
   */
  getVoiceForAgent(agentName: string): string {
    const agent = config.agents.find(
      (a) => a.name.toLowerCase() === agentName.toLowerCase()
    );
    return agent?.voiceId || config.defaultVoiceId;
  }

  /**
   * Generate speech from text
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    try {
      const voiceId = request.agent
        ? this.getVoiceForAgent(request.agent)
        : request.voiceId;

      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: request.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': this.elevenlabsApiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      return {
        audioData: Buffer.from(response.data),
        duration: 0, // Duration would need to be calculated
      };
    } catch (error) {
      console.error('TTS synthesis error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }

  /**
   * Generate notification audio for agent status
   */
  async notifyStatus(agent: string, message: string): Promise<TTSResponse> {
    const statusMessage = `${agent}: ${message}`;
    return this.synthesize({
      text: statusMessage,
      voiceId: this.getVoiceForAgent(agent),
      agent,
    });
  }
}
