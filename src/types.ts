/**
 * VoxYZ Type Definitions
 */

export interface VoiceIntent {
  agent: string;
  action: string;
  message: string;
  confidence: number;
}

export interface AgentConfig {
  name: string;
  voiceId: string;
}

export interface NotificationEvent {
  type: 'status' | 'complete' | 'error';
  agent: string;
  message: string;
  timestamp: number;
}

export interface TTSRequest {
  text: string;
  voiceId: string;
  agent?: string;
}

export interface TTSResponse {
  audioData: Buffer;
  duration: number;
}
