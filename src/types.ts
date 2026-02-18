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

/**
 * Emitted by OpenClaw agents via the /api/openclaw-event webhook.
 * Maps to OpenClaw's agent lifecycle events (on_start, on_complete, on_error, etc.)
 */
export interface AgentLifecycleEvent {
  type: 'started' | 'complete' | 'error' | 'handoff' | 'status';
  agent: string;         // e.g. "wolverine", "beast"
  task?: string;         // human-readable task description
  toAgent?: string;      // for handoff events
  message?: string;      // free-form status message
  sessionId?: string;    // OpenClaw session ID
  timestamp?: number;    // Unix ms (added by VoxYZ if missing)
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
