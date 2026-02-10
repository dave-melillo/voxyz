# VoxYZ - Audio Communication Layer for Agent Orchestration

VoxYZ is the audio communication layer for AI agent orchestration systems. It provides voice routing, intent classification, and TTS notifications for agent status updates.

## Core Features (MVP)

### 1. Voice Router
- Classifies user intent from voice/text input
- Routes commands to appropriate agents (Gambit, Beast, Wolverine)
- Uses Claude API for intelligent intent classification
- Fallback to keyword matching when API unavailable

### 2. TTS Notifications
- Agent status updates via voice ("Wolverine: Task complete")
- ElevenLabs integration with per-agent voice mapping
- WebSocket-based real-time audio delivery
- REST API for notification triggers

## Architecture

```
User Input → Voice Router → Intent Classification → Agent Routing
                                                          ↓
Agent Events → Notification Bus → TTS Service → Audio Output
```

## Quick Start

### Prerequisites
- Node.js 18+
- API Keys for:
  - Anthropic Claude
  - ElevenLabs
  - Deepgram (optional, for STT)

### Installation

```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys

# Build
npm run build

# Start server
npm start
```

### Development

```bash
# Run in development mode with auto-reload
npm run dev
```

## Usage

### Web Interface
Open `http://localhost:3000` in your browser to access the test interface.

### API Endpoints

#### Voice Routing
```bash
POST /api/route
Content-Type: application/json

{
  "transcript": "Beast, research VoxYZ competitors"
}
```

#### TTS Generation
```bash
POST /api/tts
Content-Type: application/json

{
  "text": "Task completed successfully",
  "agent": "gambit"
}
```

#### Agent Notifications
```bash
POST /api/notify
Content-Type: application/json

{
  "type": "complete",
  "agent": "wolverine",
  "message": "GitHub PR review complete",
  "timestamp": 1707516000000
}
```

### WebSocket API

Connect to `ws://localhost:3000` and send:

```json
{
  "type": "voice_command",
  "transcript": "Gambit, status update"
}
```

Receive:
```json
{
  "type": "route_result",
  "agent": "gambit",
  "message": "Routing to gambit: status update"
}
```

## Configuration

### Agent Voice Mapping
Edit `.env` to configure ElevenLabs voice IDs per agent:

```env
VOICE_GAMBIT=TxGEqnHWrfWFTfGW9XjX
VOICE_BEAST=pNInz6obpgDQGcFmaJgB
VOICE_WOLVERINE=EXAVITQu4vr4xnSDxMaL
```

## Project Structure

```
voxyz/
├── src/
│   ├── index.ts        # Entry point
│   ├── server.ts       # Express + WebSocket server
│   ├── router.ts       # Voice intent classification
│   ├── tts.ts          # TTS service (ElevenLabs)
│   ├── config.ts       # Configuration
│   └── types.ts        # TypeScript types
├── public/
│   └── index.html      # Web test interface
├── package.json
├── tsconfig.json
└── README.md
```

## Minimal Implementation Notes

This is a minimal MVP focusing on:
1. ✅ Voice routing with intent classification
2. ✅ Simple TTS notifications for agent status
3. ✅ REST + WebSocket APIs
4. ✅ Basic web interface for testing

**Not included in MVP:**
- Real-time STT (Deepgram integration)
- Redis pub/sub notification bus
- OpenClaw Gateway integration
- Danger Room UI integration
- Advanced audio queueing
- Voice cloning
- Wake word detection

## Next Steps

1. Test with real API keys
2. Integrate with OpenClaw Gateway events
3. Add Redis Streams for notification bus
4. Connect to Danger Room UI
5. Add Deepgram STT for real voice input

## License

MIT

---

Built with 🎙️ by Beast
