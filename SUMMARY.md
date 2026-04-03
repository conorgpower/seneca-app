# Seneca App - Feature Summary

## Authentication & Onboarding

- Email/password sign-up and login via Supabase Auth
- Apple Sign-In and Google OAuth
- Password reset with email verification
- Multi-step onboarding flow: welcome, vision preference, trust & safety, notification permissions, 4-phase questionnaire, goal setting (momentum visualization), social proof, and plan selection
- Session management with refresh tokens and persistent login

## Subscriptions & Monetization

- RevenueCat integration for iOS and Android in-app purchases
- Weekly, monthly, and yearly subscription tiers
- 7-day free trial with trial-ending push notification reminders
- Subscription status caching and entitlement checking
- Paywall screen gating access to the main app

## AI Chat

- Real-time philosophical conversations powered by DeepSeek API
- Context-aware responses that pull from philosophical texts and quotes
- Personalization based on onboarding answers (goals, interests)
- Quick-tap suggested prompts: adversity, inner peace, purpose, fear, daily wisdom, character
- Conversation history persistence (local cache + Supabase)
- Chat history modal to load previous conversations
- Quote deduplication to avoid repeating the same wisdom
- Typing indicators and share functionality

## Daily Rituals & Progress (Today Tab)

- Three daily rituals: read a passage, log an insight, complete a breathwork/meditation
- Daily mood check-ins with visual mood wheel
- Streak tracking (current and longest) with weekly completion visualization
- Calendar view showing completed days and achievement unlock dates
- Quote of the Day widget on the home screen
- Scheduled daily reminder notifications
- Progress percentage bars for ritual completion

## Philosophical Content Library (Explore Tab)

### Philosopher Profiles
- Marcus Aurelius, Seneca, Epictetus, Aristotle, Plato, Nietzsche
- Each with biography and associated canonical works

### Book Reader
- Full-text display of philosophical works with table of contents navigation
- Section-based reading with adjustable font sizes
- Reading progress tracking

### Audio Lessons (6 lessons)
- Amor Fati, The Borrowed Cup, Memento Mori, The Obstacle Becomes The Way, The Arrow and the Target, The Two Handles
- Playback controls with elapsed time tracking

### Daily Passages
- Rotating passages from canonical texts, deterministically selected so all users see the same passage each day
- Cached to minimize database load

### Philosophical Comics
- Multi-page comic viewer with pagination and preloading
- Supabase-hosted comic assets

## Breathwork & Meditation (6 exercises)

- Box Breathing (4-4-4-4) - calm nerves
- 4-7-8 Breathing - anxiety and sleep
- Physiological Sigh - stress relief
- Resonance Breathing (5-5) - nervous system balance
- Power Breath - focus and energy
- Cadence Breathing - meditation support
- Real-time animated breathing circle (expand/contract) with phase countdown timers
- Optional ambient audio, completion tracking, achievement integration

## Community & Reflections

- Live community reflection sessions with real-time countdown timers
- Queued reflections with automatic rotation and status management (draft, queued, live, completed)
- Real-time updates via Supabase subscriptions
- AI-generated philosophical responses to reflections
- Optional anonymous sharing with generated display names
- Personal reflection history

## Achievements & Gamification

- Achievement categories: daily rituals, completions, audio lessons, breathwork, comics, books, community reflections, chat conversations, special
- Milestone-based unlocks (e.g., First Dawn, Week of Wisdom, Month of Virtue, Century of Practice)
- Toast notifications on achievement unlock
- Achievement list screen with category filtering and sorting
- Progress indicators toward upcoming achievements

## Home Screen Widgets (iOS)

- Small widget: quote + author
- Large widget: expanded quote view
- Lock screen widget: quick wisdom access
- Native Swift implementation with shared entitlements
- Real-time quote updates from the app via native module bridge

## Focus Lock (iOS 16.1+)

- Family Controls / Screen Time API integration
- Native app picker to select apps to block
- Lock and unlock apps on demand
- Daily auto-relock scheduling
- Unlock countdown display
- Authorization status tracking and permission flow

## Notifications & Reminders

- Daily ritual reminders (configurable day and time)
- Streak reminders
- Free trial ending warnings
- Trial nudge reminders
- Onboarding re-engagement prompts
- Community update notifications (optional)
- Platform-specific setup (Android notification channels)
- Push token registration with Supabase for server-triggered notifications

## Settings

- Account management: profile picture (camera/gallery), display name, logout, account deletion
- Notification preferences: daily reminder scheduling, streak reminders, community updates
- Appearance settings
- Password change
- Privacy settings
- Help & FAQ
- Safety & support resources
- Legal documents (terms, privacy policy)
- Widget setup guide
- Focus Lock configuration
- About screen with version info

## Analytics

- Mixpanel: screen views, feature usage, onboarding funnels, engagement events
- AppsFlyer: install attribution, trial starts, subscription events, feature adoption

## Asset Management

- Supabase-hosted CDN for all images (WEBP), audio (MP3), and comics
- Smart prefetching and caching with warmup on sign-in and onboarding completion
- Graceful fallbacks for failed asset loads
