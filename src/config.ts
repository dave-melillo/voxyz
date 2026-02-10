/**
 * VoxYZ Configuration
 */
import dotenv from 'dotenv';
import { AgentConfig } from './types';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || '',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
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
  ] as AgentConfig[],
  defaultVoiceId: process.env.VOICE_DEFAULT || 'pNInz6obpgDQGcFmaJgB',
};
