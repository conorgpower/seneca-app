# Quick Start Guide - Seneca App

## 🚀 Running the App (5 minutes)

### 1. Navigate to the project
```bash
cd /Users/conorpower/Desktop/Conor/Seneca/seneca-app
```

### 2. Start the development server
```bash
npx expo start
```

### 3. Open on your device

**Option A: Physical Device**
- Install "Expo Go" from App Store (iOS) or Play Store (Android)
- Scan the QR code in the terminal

**Option B: iOS Simulator** (Mac only)
- Press `i` in the terminal
- Requires Xcode to be installed

**Option C: Android Emulator**
- Press `a` in the terminal
- Requires Android Studio to be installed

## 📱 App Flow

### First Time Experience

1. **Login Screen**
   - Enter any email/password (mock authentication)
   - Or tap "Create Account"

2. **Onboarding Questionnaire**
   - 3 questions about your philosophical interests
   - Select one option per question
   - Tap "Continue" to proceed

3. **Paywall**
   - Choose between Monthly ($8.99) or Yearly ($49.99)
   - For testing: Tap "Skip for now (Test Mode)"

4. **Main App** - 4 tabs:
   - **Chat**: Talk with the philosopher AI
   - **Community**: Join live reflection sessions
   - **Today**: Track your daily progress
   - **Explore**: Browse philosophers and texts

## 🧪 Testing Features

### Chat Tab
Try these messages to trigger mock responses:
- "I feel anxious" → Seneca quote on anxiety
- "What is my purpose?" → Nietzsche quote on meaning
- "This is difficult" → Marcus Aurelius on obstacles
- Any other message → Socrates default response

### Today Tab
- Tap ritual cards to mark as complete
- Watch the progress bar update
- Streak counter shows 2-day streak (mock data)

### Explore Tab
- Browse 6 philosophers
- View featured series
- Check essential readings

## 🛠️ Development Commands

```bash
# Start development server
npx expo start

# Start with cleared cache
npx expo start -c

# Type checking
npx tsc --noEmit

# Install new package
npm install <package-name>
```

## 📊 Next: Fetch Philosophical Texts

To populate the app with real philosophical content:

```bash
# Install ts-node globally (one-time)
npm install -g ts-node

# Run the data fetching script
npx ts-node scripts/fetchGutenbergTexts.ts
```

This will:
- Download 8 philosophical works from Project Gutenberg
- Chunk them into searchable paragraphs
- Save as JSON in `src/data/texts/`
- Take ~2 minutes (rate-limited to be respectful to Gutenberg servers)

## 🐛 Troubleshooting

### "Package version mismatch" warning
```bash
npx expo install --fix
```

### "Metro bundler error"
```bash
npx expo start -c
```

### "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Chat bubbles not showing
- Make sure you're on the "Chat" tab (leftmost tab)
- Try typing a message and pressing send

## 📝 Quick Tips

1. **Dark Mode**: The app is designed for dark mode only
2. **Test Mode**: Use "Skip" button on paywall to bypass subscription
3. **Mock Data**: All data is currently mocked (no real backend)
4. **Hot Reload**: Changes to code will auto-reload in Expo Go

## 🎨 Customization

### Change Theme Colors
Edit: `src/theme/colors.ts`

### Change Tab Icons
Edit: `src/navigation/AppNavigator.tsx` (lines with `TabIcon`)

### Modify Onboarding Questions
Edit: `src/screens/OnboardingScreen.tsx` (ONBOARDING_QUESTIONS array)

## 📱 Current Screen Status

| Screen | Status | Features |
|--------|--------|----------|
| Login | ✅ Complete | Mock auth, validation |
| Signup | ✅ Complete | Form with terms |
| Onboarding | ✅ Complete | 3-step questionnaire |
| Paywall | ✅ Complete | Two pricing tiers, skip option |
| Chat | ✅ Complete | Gifted Chat, mock AI |
| Today | ✅ Complete | Streaks, rituals, progress |
| Explore | ✅ Complete | Philosophers, readings |
| Community | ✅ Complete | Live sessions UI |

## 🚧 Known Limitations (Mock Data)

- AI responses are keyword-based (not real AI)
- No data persistence (resets on app reload)
- Authentication doesn't validate credentials
- Subscription doesn't charge (no RevenueCat keys)
- Community features are UI-only (no real-time)

## ✅ Ready for Next Phase

The app is ready to integrate:
1. **DeepSeek AI** for real philosophical conversations
2. **AsyncStorage** for data persistence
3. **RevenueCat** for real subscriptions
4. **Firebase** for community features

---

**Need Help?** Check the main [README.md](./README.md) for detailed documentation.
