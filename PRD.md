# VoxYZ Architecture - Product Requirements Document

**Version:** 1.0  
**Author:** Beast  
**Date:** February 9, 2026  
**Status:** Draft  
**Priority:** 2/5  
**Complexity:** M  
**Related Cards:** XM-VOXYZLOOP (VoxYZ Closed Loop), XM-VOXYZDR (VoxYZ Flow - Danger Room)

---

## Summary

VoxYZ is the **audio communication layer** for the X-Men agent orchestration system. It provides real-time voice feedback, notifications, and two-way voice control for ClawCrew agents and the Danger Room UI.

**The Core Insight:** Modern agent systems are silent. You deploy an agent and have no idea what it's doing unless you check logs or chat. VoxYZ makes agents **audible** — status updates, notifications, warnings, and conversational control, all via voice.

**Think of it as:** The comms system for your AI team. Like a starship bridge where the computer speaks status updates, or an RTS where units confirm orders — but for your personal agent crew.

---

## Research Synopsis

### Existing Systems Reviewed

**1. Voice-Chat (Current System)**
- Real-time voice conversation with Gambit via Pipecat
- WebRTC transport, Deepgram STT, ElevenLabs TTS
- One-on-one conversational model
- **Gap:** No broadcast notifications, no multi-agent coordination

**2. ClawCrew (Agent Platform)**
- Web-based agent deployment and configuration
- Agent library with personality customization
- **Gap:** No voice interaction during setup or operation

**3. Danger Room (Visual UI)**
- RTS-style visual command center for agent orchestration
- Real-time agent status visualization
- **Gap:** Silent interface, no audio feedback

### Key Insight from Ralv.ai & AgentCraft

Both successful agent orchestration platforms emphasize **multimodal feedback**. Users need:
- Visual state (Danger Room provides this)
- Audio state (VoxYZ fills this gap)
- Text state (Existing chat/terminal)

**Quote from Ralv.ai philosophy:**
> "The question isn't 'does it look serious enough?' It's 'does it work better?'"

Audio feedback works better for:
- Background awareness (agents can speak while you work)
- Urgent notifications (voice cuts through visual noise)
- Accessibility (screen-free operation)
- Presence (makes agents feel more real)

---

## Definition of Done

VoxYZ is complete when:

1. **Agents can speak status updates** (e.g., "Wolverine: GitHub PR review complete")
2. **User can issue voice commands** to any agent (e.g., "Beast, research VoxYZ competitors")
3. **Danger Room broadcasts audio** for state changes (e.g., "Agent Gambit assigned to Project Alpha")
4. **ClawCrew onboarding supports voice** interaction for guided setup
5. **Configuration is simple** — enable/disable per agent, choose TTS voice
6. **Audio is non-blocking** — doesn't interrupt workflow, can be muted/dismissed

---

## Current System Context

### What Exists Today

**Voice-Chat System:**
```
Browser (WebRTC) → Deepgram STT → Clawdbot Gateway → ElevenLabs TTS → Browser Audio
```
- ✅ Real-time bidirectional voice with Gambit
- ✅ Low-latency streaming audio
- ✅ VAD (Voice Activity Detection) for turn-taking
- ❌ Single user, single agent only
- ❌ No broadcast/notification mode
- ❌ Not integrated with agent lifecycle events

**Agent Lifecycle (OpenClaw):**
```
User Request → Gambit → Spawns subagent (Beast/Wolverine/etc.) → Completes task → Reports back
```
- ✅ Structured agent delegation
- ✅ Session management (spawn, monitor, terminate)
- ✅ Event hooks (on_spawn, on_complete, on_error)
- ❌ No audio notifications for lifecycle events
- ❌ No voice command routing to specific agents

**Danger Room (UI):**
```
React UI → WebSocket → OpenClaw Gateway → Agent State
```
- ✅ Visual agent status
- ✅ Real-time updates
- ✅ Project/task tracking
- ❌ Silent — no audio layer

---

## Tooling Choices

### Core Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **STT** | Deepgram | Already integrated, low-latency, accurate |
| **TTS** | ElevenLabs | High-quality voices, emotional range, cloning support |
| **Transport** | WebRTC (Pipecat) | Real-time, bidirectional, browser-native |
| **Event Bus** | OpenClaw Gateway Events | Already exists, hook into agent lifecycle |
| **Audio Queue** | Redis Streams | Scalable, persistent, support multiple listeners |
| **Voice Routing** | Intent classification (Claude/Opus) | "Talk to Beast about X" → route to Beast session |

### Why Not Build From Scratch?

- **Deepgram + ElevenLabs** are industry-leading APIs with < 300ms latency
- **Pipecat** handles complex audio pipeline orchestration
- **OpenClaw Gateway** already emits lifecycle events we can consume
- **Redis Streams** provides reliable pub/sub for audio notifications

**Build vs Buy Decision:** Build the orchestration layer (VoxYZ), integrate best-in-class APIs.

---

## Architecture

### VoxYZ Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         VoxYZ Architecture                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  User (Browser)  │
│   or Telegram    │
└────────┬─────────┘
         │ Voice Input
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      VoxYZ Router                                 │
│  ┌────────────────────────────────────────────────────────┐      │
│  │ 1. Intent Classification (STT → LLM)                   │      │
│  │    "Talk to Beast" → route to Beast session           │      │
│  │    "Status update" → broadcast query                   │      │
│  │    "Hey Gambit" → route to Gambit                      │      │
│  └────────────────────────────────────────────────────────┘      │
└─────────────────────┬─────────────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ Gambit  │  │  Beast  │  │Wolverine│
    │ Session │  │ Session │  │ Session │
    └─────────┘  └─────────┘  └─────────┘
         │            │            │
         └────────────┼────────────┘
                      ▼
         ┌────────────────────────────┐
         │   Audio Notification Bus    │
         │      (Redis Streams)        │
         │                             │
         │  Events:                    │
         │  - agent.status             │
         │  - agent.complete           │
         │  - agent.error              │
         │  - danger_room.project      │
         │  - clawcrew.onboarding      │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌──────────────────────────────┐
         │     TTS Service               │
         │  (ElevenLabs + Voice Mapping) │
         │                               │
         │  Gambit   → Voice ID: TxGE... │
         │  Beast    → Voice ID: ABC1... │
         │  Wolverine→ Voice ID: DEF2... │
         └───────────────┬───────────────┘
                         │
                         ▼
              ┌───────────────────────┐
              │  Audio Output         │
              │  - Browser (WebRTC)   │
              │  - Telegram Voice     │
              │  - System Speaker     │
              └───────────────────────┘
```

### Data Flow Examples

**Example 1: User Voice Command**
```
1. User says: "Beast, research VoxYZ competitors"
2. VoxYZ Router → Deepgram STT → "Beast, research VoxYZ competitors"
3. Intent Classifier (LLM) → { agent: "beast", intent: "research", params: "VoxYZ competitors" }
4. Route to Beast session with context
5. Beast responds (text) → TTS (Beast voice) → Audio output
```

**Example 2: Agent Status Notification**
```
1. Wolverine completes GitHub PR review
2. OpenClaw Gateway emits event: { type: "agent.complete", agent: "wolverine", task: "PR-123" }
3. VoxYZ Notification Bus receives event
4. Generate message: "Wolverine: GitHub PR review complete"
5. TTS with Wolverine voice → Audio output
6. Optional: Send to Danger Room UI for visual toast + audio
```

**Example 3: Danger Room Project Assignment**
```
1. User drags Gambit sprite to "Project Alpha" in Danger Room UI
2. Danger Room emits event: { type: "danger_room.project", agent: "gambit", project: "Alpha" }
3. VoxYZ Notification Bus receives event
4. TTS: "Gambit assigned to Project Alpha" → Audio output
```

---

## Phases

### Phase 1: Foundation (1-2 weeks)
**Goal:** Get basic voice routing working

- [ ] VoxYZ Router service (Node.js + Pipecat)
- [ ] Intent classification (route "talk to X" to correct agent)
- [ ] TTS voice mapping (Gambit = Voice A, Beast = Voice B, etc.)
- [ ] Test with 2 agents (Gambit + Beast)
- [ ] Browser WebRTC client

**Deliverable:** Say "Talk to Beast" and have Beast's voice respond.

### Phase 2: Notification Bus (1-2 weeks)
**Goal:** Agents can broadcast status

- [ ] Redis Streams setup for audio events
- [ ] Hook into OpenClaw Gateway lifecycle events
- [ ] Agent status messages ("Wolverine: Task complete")
- [ ] Configurable notification levels (all / important / critical)
- [ ] Mute/unmute controls

**Deliverable:** Agents speak when they complete tasks or hit errors.

### Phase 3: Danger Room Integration (1 week)
**Goal:** Visual UI triggers audio

- [ ] Danger Room → VoxYZ event bridge
- [ ] Audio for project assignments
- [ ] Audio for agent state changes (idle → working → complete)
- [ ] Synchronized visual + audio feedback

**Deliverable:** Danger Room feels "alive" with audio feedback.

### Phase 4: ClawCrew Onboarding (1 week)
**Goal:** Voice-guided setup

- [ ] Voice prompts during ClawCrew wizard ("Choose your agent type")
- [ ] Voice confirmations ("Gambit deployed successfully")
- [ ] TTS for errors/troubleshooting

**Deliverable:** ClawCrew setup can be completed via voice interaction.

### Phase 5: Polish & Advanced (Future)
- Multi-user voice rooms (family agents, team agents)
- Voice cloning for personalized agent voices
- Wake word detection ("Hey Gambit")
- Ambient mode (agents whisper status updates)
- Voice command macros ("Status report" → query all agents)

---

## Priority Score: 2/5

**Why Not Higher?**
- ClawCrew and Danger Room core functionality doesn't require audio
- Voice-chat already exists for 1:1 conversations
- This is a **delight feature** that enhances UX, not a blocker

**Why Not Lower?**
- Audio feedback significantly improves agent orchestration UX
- Accessibility benefits (screen-free operation)
- Differentiator for ClawCrew (no other agent platforms have this)
- Natural extension of existing voice-chat work

**When to prioritize:**
- After Danger Room MVP ships (Phase 1 complete)
- After ClawCrew wizard is functional
- When user feedback indicates need for better agent awareness

---

## Complexity: M (Medium)

**Complexity Breakdown:**

**Low Complexity (Already Solved):**
- ✅ STT/TTS integration (exists in voice-chat)
- ✅ WebRTC transport (exists in voice-chat)
- ✅ Agent session management (OpenClaw handles this)

**Medium Complexity (New Work):**
- 🟡 Voice routing / intent classification
- 🟡 Redis Streams for notification bus
- 🟡 Event hooks into OpenClaw Gateway
- 🟡 TTS voice mapping per agent

**High Complexity (Future):**
- 🔴 Multi-user voice rooms
- 🔴 Wake word detection
- 🔴 Voice cloning / personalization

**Estimated Effort:** 4-6 weeks for Phases 1-4 (assuming 1 engineer)

---

## Edge Cases & Considerations

### 1. Audio Overload
**Problem:** 10 agents broadcasting status = cacophony  
**Solution:** 
- Notification levels (critical/important/all)
- Audio queue (serialize messages, don't overlap)
- Smart throttling (group similar events: "3 tasks completed" vs "Task 1 complete, Task 2 complete...")

### 2. Voice Ambiguity
**Problem:** "Talk to the beast" (animal vs agent)  
**Solution:**
- Agent names are case-insensitive keywords
- Context-aware routing (if in Danger Room, assume agent reference)
- Fallback: "Did you mean Beast (agent) or something else?"

### 3. Privacy in Shared Spaces
**Problem:** User doesn't want agents speaking sensitive info aloud  
**Solution:**
- "Silent mode" toggle (text-only responses)
- Headphone detection (auto-mute if speaker, audio if headphones)
- Whisper mode (TTS at low volume)

### 4. Latency Tolerance
**Problem:** 2-3 second delay between user speech and agent response feels slow  
**Solution:**
- Target < 1s total latency (STT 200ms + LLM 500ms + TTS 200ms)
- Immediate audio acknowledgment ("Got it, one moment...")
- Streaming TTS (start playing audio before full response generated)

### 5. Multi-Language Support
**Problem:** TTS voices may not support all languages  
**Solution:**
- Phase 1: English only
- Phase 2: Detect user language, map to appropriate TTS model
- Future: Voice cloning preserves accent/language

---

## Open Questions

1. **Voice Selection:** Should users choose agent voices during ClawCrew setup, or use defaults?
   - **Recommendation:** Defaults (curated per agent archetype), with optional customization

2. **Notification Defaults:** What events trigger audio by default?
   - **Recommendation:** Critical errors + task completions only. User can enable more.

3. **Platform Support:** Does VoxYZ work on mobile (iOS/Android)?
   - **Recommendation:** Phase 1 = desktop browser only. Phase 2 = Telegram voice messages (mobile-compatible).

4. **Offline Mode:** What happens if TTS API is down?
   - **Recommendation:** Graceful degradation → text-only responses, toast notification about audio unavailable.

5. **Cost Model:** How much does TTS cost at scale?
   - **Analysis Needed:** ElevenLabs pricing = $0.30 per 1K characters. At 100 notifications/day = ~$10/month/user. May need cheaper TTS for non-critical notifications.

---

## Success Metrics

**North Star:** VoxYZ is successful when users **keep audio enabled** during daily agent interactions.

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Audio Enabled %** | >70% of sessions | Users find it valuable, not annoying |
| **Voice Command Usage** | >30% of interactions | Voice is preferred over text/UI |
| **Notification Opt-In** | >50% enable background status | Users want ambient awareness |
| **Latency (STT→TTS)** | <1.5 seconds (p95) | Feels conversational, not laggy |
| **Error Rate** | <5% misrouted commands | Intent classification is accurate |

**Qualitative Indicators:**
- Users report "agents feel more alive"
- Screenshots/videos shared showing VoxYZ in action
- Feature requests for more audio interactions (good sign of engagement)

---

## Out of Scope (v1.0)

The following are **not** part of initial VoxYZ release:

1. **Voice cloning** — Users cannot clone their own voice for agents
2. **Wake word detection** — No "Hey Gambit" activation (use push-to-talk)
3. **Multi-user voice rooms** — Single user per audio session
4. **Phone integration** — No native phone call interface (future: Twilio integration)
5. **Music/ambient soundscapes** — No "focus mode with lofi beats" (stay focused on comms)
6. **Voice analytics** — No sentiment analysis, emotion detection, etc.
7. **Custom TTS models** — ElevenLabs only (no local TTS, no alternative providers)

---

## Recommended Next Steps

1. **Validate Assumptions** (Beast + Gambit)
   - Review this PRD with Dave
   - Confirm voice routing is the right core feature
   - Agree on Phase 1 scope

2. **Spike: Intent Classification** (Beast, 2 days)
   - Prototype LLM-based routing ("talk to Beast" → route to Beast session)
   - Measure accuracy on 50 sample commands
   - Document edge cases

3. **Spike: Redis Streams** (Wolverine, 1 day)
   - Set up Redis, publish test events
   - Subscribe to events, trigger TTS
   - Measure latency

4. **PRD Validation** (Magneto)
   - Review against ClawCrew/Danger Room integration points
   - Confirm OpenClaw Gateway event hooks exist
   - Greenlight for Phase 1 implementation

---

## Conclusion

VoxYZ transforms silent agent orchestration into an **audible, interactive experience**. By adding voice feedback and control to ClawCrew and Danger Room, it makes AI agents feel less like background processes and more like a real team you're commanding.

**The core bet:** Audio communication is not just a novelty — it's a **better interface** for managing multiple agents, especially when combined with visual (Danger Room) and text (chat) modalities.

**Minimal Viable Feature:** Voice routing ("talk to Beast") + agent status notifications ("Wolverine: task complete"). Everything else is polish.

**Timeline:** 4-6 weeks for Phases 1-3, then iterate based on user feedback.

---

*Document maintained by Beast. Ready for Magneto validation.*
