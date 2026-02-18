/**
 * VoxYZ Configuration
 */
import dotenv from 'dotenv';
import { AgentConfig } from './types';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3737', 10),
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || '',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  notifications: {
    // Set to false to disable TTS for lifecycle events (text-only mode)
    ttsEnabled: process.env.TTS_ENABLED !== 'false',
  },
  agents: [
    {
      name: 'gambit',
      voiceId: process.env.VOICE_GAMBIT || 'TxGEqnHWrfWFTfGW9XjX',
    },
    {
      name: 'beast',
      voiceId: process.env.VOICE_BEAST || 'pNInz6obpgDQGcFmaJgB',
    },
    {
      name: 'wolverine',
      voiceId: process.env.VOICE_WOLVERINE || 'EXAVITQu4vr4xnSDxMaL',
    },
    {
      name: 'magneto',
      voiceId: process.env.VOICE_MAGNETO || 'VR6AewLTigWG4xSOukaG',
    },
    {
      name: 'dazzler',
      voiceId: process.env.VOICE_DAZZLER || 'jsCqWAovK2LkecY7zXl4',
    },
    {
      name: 'nightcrawler',
      voiceId: process.env.VOICE_NIGHTCRAWLER || 'onwK4e9ZLuTAKqWW03F9',
    },
  ] as AgentConfig[],
  defaultVoiceId: process.env.VOICE_DEFAULT || 'pNInz6obpgDQGcFmaJgB',
};
