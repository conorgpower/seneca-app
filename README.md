# Seneca - Philosophy Chat App

A React Native mobile application that provides personalized philosophical guidance and wisdom from history's greatest thinkers.

## Overview

Seneca is modeled after the Bible Chat experience, but centered on great philosophers and their teachings (Seneca, Marcus Aurelius, Epictetus, Aristotle, Plato, Nietzsche). Users can chat with an AI that answers questions, gives guidance, and offers life advice grounded strictly in the writings, ideas, and frameworks of these philosophers.

## Features

### ✅ Implemented

#### Authentication & Onboarding
- **Login/Signup Screens** - Clean, modern authentication flow
- **Questionnaire Onboarding** - 3-step questionnaire to understand user goals
- **Paywall/Subscription** - RevenueCat-ready subscription flow with free trial

#### Main App Features
- **Chat Interface** - Real-time conversations using `react-native-gifted-chat`
  - Mock AI responses based on keyword matching
  - Quotes from philosophers integrated into responses
  
- **Today Dashboard** - Daily progress tracking
  - Streak counter with weekly visualization
  - Daily rituals (Journal, Reflection, Meditation, Review)
  - Quote of the Day
  - Progress percentage tracker

- **Explore Tab** - Browse philosophical content
  - Featured series
  - Philosopher profiles (6 philosophers)
  - Essential readings with viewer counts

- **Community Tab** - Social features
  - Live reflection sessions
  - Community discussions
  - Waiting room queue

## Project Structure

```
seneca-app/
├── src/
│   ├── screens/           # All screen components
│   │   ├── LoginScreen.tsx
│   │   ├── SignupScreen.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── PaywallScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── TodayScreen.tsx
│   │   ├── ExploreScreen.tsx
│   │   └── CommunityScreen.tsx
│   ├── navigation/        # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── AppNavigator.tsx
│   ├── theme/            # Theming system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   ├── services/         # Business logic (future)
│   ├── components/       # Reusable components (future)
│   └── data/            # Data storage
│       └── texts/       # Philosophical texts (JSON)
├── scripts/
│   └── fetchGutenbergTexts.ts  # Data ingestion script
├── App.tsx
└── package.json
```

## Tech Stack

- **React Native (Expo)** - Cross-platform mobile framework
- **TypeScript** - Type safety
- **React Navigation** - Navigation library
  - Bottom Tabs
  - Native Stack
- **react-native-gifted-chat** - Chat UI
- **react-native-purchases** - RevenueCat integration (ready)
- **axios** - HTTP client
- **dayjs** - Date utilities

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (installed globally or via npx)

### Installation

1. Clone the repository:
   ```bash
   cd /Users/conorpower/Desktop/Conor/Seneca/seneca-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on your device:
   - **iOS**: Press `i` in the terminal or scan QR code with Expo Go
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go
   - **Web**: Press `w` in the terminal (limited functionality)

## Data Collection

### Fetching Philosophical Texts

The app includes a script to fetch public domain texts from Project Gutenberg:

```bash
npx ts-node scripts/fetchGutenbergTexts.ts
```

This will download and process:
- Seneca - Moral Letters to Lucilius
- Marcus Aurelius - Meditations
- Epictetus - The Enchiridion & Discourses
- Plato - The Republic
- Aristotle - Nicomachean Ethics
- Nietzsche - Thus Spake Zarathustra & Beyond Good and Evil

Texts are chunked into paragraphs and saved as JSON in `src/data/texts/`.

## Theme

The app uses a dark theme inspired by Bible Chat:

- **Background**: `#1C1B1E`
- **Primary (Gold/Bronze)**: `#D4A574`
- **Cards**: `#3A3840`
- **Text**: `#FFFFFF`

All theme values are centralized in `src/theme/`.

## Navigation Flow

```
RootNavigator
├── AuthNavigator (Unauthenticated)
│   ├── LoginScreen
│   ├── SignupScreen
│   ├── OnboardingScreen
│   └── PaywallScreen
└── AppNavigator (Authenticated)
    ├── ChatScreen
    ├── CommunityScreen
    ├── TodayScreen
    └── ExploreScreen
```

## Next Steps (Future Implementation)

### Phase 1: AI Integration
- [ ] Integrate DeepSeek or OpenAI API
- [ ] Implement RAG (Retrieval-Augmented Generation)
- [ ] Load philosophical texts into vector database
- [ ] Context-aware responses

### Phase 2: Persistence
- [ ] Add AsyncStorage for user preferences
- [ ] Save chat history locally
- [ ] Persist streak/progress data
- [ ] Offline mode support

### Phase 3: RevenueCat Integration
- [ ] Configure RevenueCat project
- [ ] Add App Store/Play Store product IDs
- [ ] Implement subscription validation
- [ ] Add receipt validation

### Phase 4: Content Expansion
- [ ] Add more philosophers
- [ ] Curate quote database
- [ ] Create guided programs
- [ ] Add audio meditations

### Phase 5: Community Features
- [ ] Real-time reflection sessions
- [ ] User-generated content
- [ ] Discussion forums
- [ ] Sharing functionality

## Testing

### Current Test Mode Features

The app includes testing shortcuts:
- **Paywall**: "Skip for now" button bypasses subscription
- **Mock Login**: Any credentials work in LoginScreen
- **Mock AI**: Pre-programmed responses to keywords

### Running Tests

```bash
# Unit tests (when implemented)
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## Contributing

This is a personal project but feedback is welcome!

## License

Private - All rights reserved

## Acknowledgments

- Philosophical texts sourced from [Project Gutenberg](https://www.gutenberg.org/)
- UI inspiration from Bible Chat
- Stoic wisdom from Marcus Aurelius, Seneca, and Epictetus
