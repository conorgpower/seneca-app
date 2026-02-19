import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { theme } from '../theme';
import { useSubscription } from '../hooks/useSubscription';
import { ENTITLEMENT_ID } from '../services/revenuecat.service';
import { trackOnboardingScreenView } from '../services/mixpanel.service';
import { TERMS, PRIVACY } from '../utils/legalContent';
import { getSupabaseImageSource } from '../data/asset-cdn';

const { width } = Dimensions.get('window');

interface PaywallScreenProps {
  onSubscribe: () => void;
  onSkip?: () => void;
  onBack?: () => void;
}

const FEATURES = [
  {
    title: 'Unlimited philosophical conversations',
    description: 'Chat with AI trained on ancient wisdom',
  },
  {
    title: 'Access great philosopher works',
    description: 'From Stoicism to Eastern philosophy',
  },
  {
    title: 'Daily wisdom & reflections',
    description: 'Personalized guidance for your journey',
  },
];

const TRIAL_TIMELINE = [
  {
    title: 'Today',
    description: 'Unlock all the app\'s features like AI conversations and more.',
    icon: '🔓',
    active: true,
  },
  {
    title: 'In 2 Days - Reminder',
    description: 'We\'ll send you a reminder that your trial is ending soon.',
    icon: '🔔',
    active: false,
  },
  {
    title: 'In 3 Days - Billing Starts',
    description: 'You\'ll be charged unless you cancel anytime before.',
    icon: '👑',
    active: false,
  },
];

type PackageType = 'monthly' | 'yearly' | 'weekly';

interface ResolvedPackage {
  id: PackageType;
  title: string;
  priceString: string;
  pricePerMonth: string;
  popular: boolean;
  trialBadge?: string;
  rcPackage: PurchasesPackage;
}

const formatPerMonthPrice = (pricePerMonth: number, currencyCode: string) => {
  try {
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(pricePerMonth);
    return `${formatted}/mo`;
  } catch {
    return `${currencyCode} ${pricePerMonth.toFixed(2)}/mo`;
  }
};

export default function PaywallScreen({ onSubscribe, onSkip, onBack }: PaywallScreenProps) {
  const { offerings, isLoading, purchasePackage, restorePurchases } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<PackageType>('yearly');
  const [step, setStep] = useState<1 | 2>(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [legalModal, setLegalModal] = useState<{ visible: boolean; title: string; content: string }>({
    visible: false,
    title: '',
    content: '',
  });
  const senecaImageSource = getSupabaseImageSource('images/comic/seneca.webp');

  const resolvedPackages: ResolvedPackage[] = React.useMemo(() => {
    const current = offerings?.current;
    if (!current) return [];

    const packages: ResolvedPackage[] = [];

    if (current.weekly) {
      packages.push({
        id: 'weekly',
        title: 'Weekly',
        priceString: current.weekly.product.priceString,
        pricePerMonth: `${current.weekly.product.priceString}/wk`,
        popular: false,
        rcPackage: current.weekly,
      });
    }

    if (current.monthly) {
      packages.push({
        id: 'monthly',
        title: 'Monthly',
        priceString: current.monthly.product.priceString,
        pricePerMonth: `${current.monthly.product.priceString}/mo`,
        popular: false,
        rcPackage: current.monthly,
      });
    }

    if (current.annual) {
      const yearlyPrice = current.annual.product.price;
      const monthlyEquivalent = yearlyPrice / 12;
      const currencyCode = current.annual.product.currencyCode || 'USD';
      packages.push({
        id: 'yearly',
        title: 'Yearly',
        priceString: current.annual.product.priceString,
        pricePerMonth: formatPerMonthPrice(monthlyEquivalent, currencyCode),
        popular: true,
        trialBadge: current.annual.product.introPrice ? 'FREE TRIAL' : undefined,
        rcPackage: current.annual,
      });
    }

    return packages;
  }, [offerings]);

  const selectedPackage = resolvedPackages.find((p) => p.id === selectedPlan);

  useEffect(() => {
    trackOnboardingScreenView({
      screenName: `paywall_step_${step}`,
      flowStep: 'paywall',
      overallStep: 24,
      totalSteps: 24,
    }).catch((error) => {
      console.error('Failed to track paywall step view:', error);
    });
  }, [step]);

  const handleProceedForFree = () => {
    setStep(2);
  };

  const handleSubscribe = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    try {
      const success = await purchasePackage(selectedPackage.rcPackage);
      if (success) {
        onSubscribe();
      }
    } catch (error: any) {
      Alert.alert(
        'Purchase Failed',
        error.message || 'An error occurred during purchase. Please try again.'
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert('Restored', 'Your purchases have been restored.', [
          { text: 'OK', onPress: onSubscribe },
        ]);
      } else {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
      }
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'Failed to restore purchases.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePresentRevenueCatPaywall = async () => {
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        onSubscribe();
      }
    } catch (error) {
      console.error('Error presenting RevenueCat paywall:', error);
    }
  };

  const handleBackPress = () => {
    if (step === 2) {
      setStep(1);
    } else if (onBack) {
      onBack();
    }
  };

  // Step 1: Free Access Framing
  const renderStep1 = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>We want you to{'\n'}try Seneca for free.</Text>
      </View>

      <View style={styles.imageContainer}>
        {senecaImageSource ? (
          <Image
            source={senecaImageSource}
            style={styles.senecaImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.senecaImageFallback}>
            <Text style={styles.senecaImageFallbackText}>🏛️</Text>
          </View>
        )}
      </View>

      <View style={styles.featuresContainer}>
        {FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.proceedButton}
        onPress={handleProceedForFree}
      >
        <Text style={styles.proceedButtonText}>Continue for FREE</Text>
      </TouchableOpacity>

    </>
  );

  // Step 2: Scrollable content
  const renderStep2ScrollableContent = () => (
    <>
      <View style={[
        styles.header,
        styles.step2Header,
      ]}>
        <Text style={[
          styles.title,
          styles.step2Title,
        ]}>
          {selectedPlan === 'yearly'
            ? 'Start your FREE trial to continue'
            : 'Unlock Seneca to continue'}
        </Text>
      </View>

      {selectedPlan === 'yearly' ? (
        <View style={styles.timelineContainer}>
          {TRIAL_TIMELINE.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineIconWrapper}>
                <View style={[
                  styles.timelineIcon,
                  item.active ? styles.timelineIconActive : styles.timelineIconInactive
                ]}>
                  <Text style={styles.timelineIconText}>{item.icon}</Text>
                </View>
                {index < TRIAL_TIMELINE.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{item.title}</Text>
                <Text style={styles.timelineDescription}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.featuresContainer}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  // Step 2: Fixed bottom content
  const renderStep2FixedBottom = () => (
    <View style={styles.fixedBottom}>
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.text} style={{ marginVertical: 20 }} />
      ) : (
        <>
          {selectedPlan === 'yearly' && (
            <Text style={styles.noCommitmentText}>✓ No commitment, cancel any time</Text>
          )}
          <View style={styles.plansContainer}>
            {resolvedPackages
              .filter((plan) => plan.id === 'yearly' || plan.id === 'monthly')
              .sort((a, b) => (a.id === 'yearly' ? -1 : 1))
              .map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.plan,
                  selectedPlan === plan.id && styles.planSelected,
                  plan.id === 'yearly' && styles.planWithBadge,
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                {plan.id === 'yearly' && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>Limited time 66% off</Text>
                  </View>
                )}
                <View style={styles.planRow}>
                  <View
                    style={[
                      styles.planRadio,
                      selectedPlan === plan.id && styles.planRadioSelected,
                    ]}
                  >
                    {selectedPlan === plan.id && (
                      <View style={styles.planRadioInner} />
                    )}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    {plan.id === 'yearly' && (
                      <Text style={styles.planBilledAs}>Billed as {plan.priceString}/year</Text>
                    )}
                  </View>
                  <Text style={styles.planPricePerMonth}>{plan.pricePerMonth}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>


          <TouchableOpacity
            style={[styles.subscribeButton, isPurchasing && styles.buttonDisabled]}
            onPress={handleSubscribe}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {selectedPlan === 'yearly' ? 'Start My Free Trial' : 'Start My Journey'}
              </Text>
            )}
          </TouchableOpacity>

          {selectedPackage && (
            <Text style={styles.disclaimer}>
              {selectedPlan === 'yearly'
                ? `Free trial, then ${selectedPackage.priceString} per year (${selectedPackage.pricePerMonth})`
                : `Just ${selectedPackage.priceString} per ${selectedPlan === 'weekly' ? 'week' : 'month'}`}
            </Text>
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          {step === 2 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
            <Text style={styles.restoreText}>
              {isRestoring ? 'Restoring...' : 'Restore'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? renderStep1() : renderStep2ScrollableContent()}

          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip for now (Test Mode)</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {step === 2 && renderStep2FixedBottom()}
      </View>

      {/* Legal Document Modal */}
      <Modal
        visible={legalModal.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLegalModal((prev) => ({ ...prev, visible: false }))}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setLegalModal((prev) => ({ ...prev, visible: false }))}
              style={styles.modalBackButton}
            >
              <Text style={styles.modalBackText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{legalModal.title}</Text>
            <View style={styles.modalBackButton} />
          </View>
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator
          >
            {renderMarkdown(legalModal.content)}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ fontWeight: '700', color: theme.colors.text }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { elements.push(<View key={key++} style={{ height: 8 }} />); continue; }
    if (line.startsWith('# ')) { elements.push(<Text key={key++} style={styles.mdH1}>{line.replace(/^# /, '')}</Text>); continue; }
    if (line.startsWith('## ')) { elements.push(<Text key={key++} style={styles.mdH2}>{line.replace(/^## /, '')}</Text>); continue; }
    if (line.startsWith('### ')) { elements.push(<Text key={key++} style={styles.mdH3}>{line.replace(/^### /, '')}</Text>); continue; }
    if (line.match(/^\s*[-*]\s/)) {
      const bulletText = line.replace(/^\s*[-*]\s/, '');
      elements.push(
        <View key={key++} style={styles.mdBulletRow}>
          <Text style={styles.mdBullet}>{'\u2022'}</Text>
          <Text style={styles.mdBulletText}>{renderInline(bulletText)}</Text>
        </View>,
      );
      continue;
    }
    if (line.match(/^---+$/)) { elements.push(<View key={key++} style={styles.mdHr} />); continue; }
    elements.push(<Text key={key++} style={styles.mdParagraph}>{renderInline(line)}</Text>);
  }
  return elements;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  restoreText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  fixedBottom: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  senecaImage: {
    width: width * 0.6,
    height: width * 0.6,
    maxWidth: 300,
    maxHeight: 300,
    borderRadius: width * 0.3,
  },
  senecaImageFallback: {
    width: width * 0.6,
    height: width * 0.6,
    maxWidth: 300,
    maxHeight: 300,
    borderRadius: width * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  senecaImageFallbackText: {
    fontSize: 56,
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  step2Header: {
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    lineHeight: 36,
  },
  step2Title: {
    marginBottom: 0,
  },
  subtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    marginBottom: theme.spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  checkmarkText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  timelineContainer: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  timelineIconWrapper: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  timelineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconActive: {
    backgroundColor: '#FF9500',
  },
  timelineIconInactive: {
    backgroundColor: theme.colors.backgroundCard,
  },
  timelineIconText: {
    fontSize: 20,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: 4,
    minHeight: 40,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  plansContainer: {
    flexDirection: 'column',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  plan: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  planSelected: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.text + '08',
  },
  planWithBadge: {
    marginTop: 14,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  discountBadge: {
    position: 'absolute',
    top: -13,
    alignSelf: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  planBilledAs: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  planPricePerMonth: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '700',
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: {
    borderColor: theme.colors.text,
  },
  planRadioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.text,
  },
  proceedButton: {
    backgroundColor: theme.colors.text,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  proceedButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.background,
  },
  subscribeButton: {
    backgroundColor: theme.colors.text,
    borderRadius: theme.borderRadius.lg,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.background,
  },
  noCommitmentText: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 0,
  },
  skipButton: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  // Legal Document Modal
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalBackButton: {
    width: 70,
  },
  modalBackText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mdH1: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  mdH2: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  mdH3: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  mdParagraph: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  mdBulletRow: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 4,
  },
  mdBullet: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginRight: 8,
    lineHeight: 24,
  },
  mdBulletText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    flex: 1,
  },
  mdHr: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
});
