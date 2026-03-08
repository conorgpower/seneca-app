import { NativeModules, Platform } from 'react-native';
import { Asset } from 'expo-asset';

interface WisdomWidgetNativeModule {
  setWidgetQuotes: (
    smallQuoteText: string,
    smallAuthor: string,
    largeQuoteText: string,
    largeAuthor: string,
    lockQuoteText: string,
    lockAuthor: string
  ) => void;
  setWidgetBackgroundImages?: (
    smallImageUrl: string,
    largeImageUrl: string
  ) => Promise<{ smallOk: boolean; largeOk: boolean; containerPath: string }>;
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

export async function updateWidgetBackgroundImages(): Promise<void> {
  if (Platform.OS !== 'ios' || !WisdomWidgetModule?.setWidgetBackgroundImages) {
    return;
  }

  const smallAsset = Asset.fromModule(require('../../assets/images/widget-small.png'));
  const largeAsset = Asset.fromModule(require('../../assets/images/widget-large.png'));

  if (!smallAsset.localUri) {
    await smallAsset.downloadAsync();
  }
  if (!largeAsset.localUri) {
    await largeAsset.downloadAsync();
  }

  const smallUrl = smallAsset.localUri || smallAsset.uri;
  const largeUrl = largeAsset.localUri || largeAsset.uri;

  if (!smallUrl || !largeUrl) {
    console.log('[WidgetBG] Exiting: missing URL(s)');
    return;
  }

  try {
    console.log('[WidgetBG] Sending background images to native');
    const result = await WisdomWidgetModule.setWidgetBackgroundImages(smallUrl, largeUrl);
    console.log('[WidgetBG] Native result:', JSON.stringify(result));
  } catch (err) {
    console.log('[WidgetBG] Native error:', err);
  }
}
