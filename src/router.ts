/**
 * VoxYZ Voice Router
 * Classifies intent and routes to appropriate agent
 */
import axios from 'axios';
import { config } from './config';
import { VoiceIntent } from './types';

export class VoiceRouter {
  private anthropicApiKey: string;

  constructor() {
    this.anthropicApiKey = config.anthropic.apiKey;
  }

  /**
   * Classify user intent from transcribed text
   */
  async classifyIntent(transcript: string): Promise<VoiceIntent> {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: `Analyze this voice command and extract:
1. Target agent (gambit, beast, wolverine, or "none" if not specified)
2. Action type (talk, status, command)
3. The actual message/command

Voice command: "${transcript}"

Respond ONLY with JSON format:
{"agent": "agent_name", "action": "action_type", "message": "extracted_message", "confidence": 0.0-1.0}`,
            },
          ],
        },
        {
          headers: {
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
        }
      );

      const content = response.data.content[0].text;
      const parsed = JSON.parse(content);

      return {
        agent: parsed.agent.toLowerCase(),
        action: parsed.action,
        message: parsed.message,
        confidence: parsed.confidence,
      };
    } catch (error) {
      console.error('Intent classification error:', error);
      // Fallback: simple keyword matching
      return this.fallbackClassification(transcript);
    }
  }

  /**
   * Fallback classification using simple keyword matching
   */
  private fallbackClassification(transcript: string): VoiceIntent {
    const lower = transcript.toLowerCase();
    const agents = ['gambit', 'beast', 'wolverine'];

    for (const agent of agents) {
      if (lower.includes(agent)) {
        return {
          agent,
          action: 'talk',
          message: transcript,
          confidence: 0.7,
        };
      }
    }

    return {
      agent: 'none',
      action: 'status',
      message: transcript,
      confidence: 0.5,
    };
  }

  /**
   * Route voice command to appropriate agent
   */
  async route(transcript: string): Promise<{ agent: string; message: string }> {
    const intent = await this.classifyIntent(transcript);

    console.log('[VoiceRouter] Intent classified:', intent);

    if (intent.agent === 'none') {
      return {
        agent: 'system',
        message: 'Command received, but no specific agent detected. Please specify an agent.',
      };
    }

    return {
      agent: intent.agent,
      message: `Routing to ${intent.agent}: ${intent.message}`,
    };
  }
}
