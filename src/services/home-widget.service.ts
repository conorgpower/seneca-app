import { NativeModules, Platform } from 'react-native';

interface WisdomWidgetNativeModule {
  setWidgetQuotes: (
    smallQuoteText: string,
    smallAuthor: string,
    largeQuoteText: string,
    largeAuthor: string,
    lockQuoteText: string,
    lockAuthor: string
  ) => void;
  // Backward compatibility for older native builds.
  setDailyQuote?: (quoteText: string, author: string) => void;
}

const DEFAULT_QUOTE =
  'Waste no more time arguing about what a good man should be. Be one.';
const DEFAULT_AUTHOR = 'Marcus Aurelius';

const { WisdomWidgetModule } = NativeModules as {
  WisdomWidgetModule?: WisdomWidgetNativeModule;
};

interface WidgetQuotePayload {
  quoteText?: string | null;
  author?: string | null;
}

export function updateWisdomWidget(payload?: {
  small?: WidgetQuotePayload;
  large?: WidgetQuotePayload;
  lock?: WidgetQuotePayload;
}): void {
  if (
    (Platform.OS !== 'android' && Platform.OS !== 'ios') ||
    (!WisdomWidgetModule?.setWidgetQuotes && !WisdomWidgetModule?.setDailyQuote)
  ) {
    return;
  }

  const safeSmallQuote = (payload?.small?.quoteText || DEFAULT_QUOTE).trim();
  const safeSmallAuthor = (payload?.small?.author || DEFAULT_AUTHOR).trim();
  const safeLargeQuote = (payload?.large?.quoteText || safeSmallQuote).trim();
  const safeLargeAuthor = (payload?.large?.author || safeSmallAuthor).trim();
  const safeLockQuote = (payload?.lock?.quoteText || safeSmallQuote).trim();
  const safeLockAuthor = (payload?.lock?.author || safeSmallAuthor).trim();

  if (WisdomWidgetModule?.setWidgetQuotes) {
    WisdomWidgetModule.setWidgetQuotes(
      safeSmallQuote,
      safeSmallAuthor,
      safeLargeQuote,
      safeLargeAuthor,
      safeLockQuote,
      safeLockAuthor
    );
    return;
  }

  WisdomWidgetModule?.setDailyQuote?.(safeSmallQuote, safeSmallAuthor);
}
