import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { theme } from '../theme';
import { BOOKS } from '../data/works-metadata';
import {
  getTableOfContents,
  getSectionText,
  TableOfContentsSection,
} from '../services/philosophical-texts.service';

const { width } = Dimensions.get('window');

type BookReaderParams = {
  workId: string;
};

export default function BookReaderScreen() {
  const route = useRoute<RouteProp<{ params: BookReaderParams }, 'params'>>();
  const navigation = useNavigation();
  const { workId } = route.params;

  // Parse workId: "Author:Title"
  const [author, title] = workId.split(':');
  const book = BOOKS.find((b) => b.author === author && b.title === title);

  const [tableOfContents, setTableOfContents] = useState<TableOfContentsSection[]>([]);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [sectionText, setSectionText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingSection, setLoadingSection] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [fontSize, setFontSize] = useState(16);

  // Load table of contents
  useEffect(() => {
    loadWorkData();
  }, [workId]);

  // Load section content when section changes
  useEffect(() => {
    if (currentSection && book) {
      loadSectionContent();
    }
  }, [currentSection]);

  const loadWorkData = async () => {
    if (!book) {
      console.error('Book not found in metadata');
      return;
    }
    
    console.log('Loading work data for:', book.title, 'by', book.author);
    
    try {
      setLoading(true);
      const toc = await getTableOfContents(book.title, book.author);
      console.log('TOC loaded, sections:', toc.length);
      setTableOfContents(toc);
      // Load the first section by default
      if (toc.length > 0) {
        console.log('Setting current section to:', toc[0].section);
        setCurrentSection(toc[0].section);
      } else {
        console.warn('No sections found in table of contents');
      }
    } catch (error) {
      console.error('Error loading work:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSectionContent = async () => {
    if (!book || !currentSection) return;

    console.log('Loading section content for:', currentSection);

    try {
      setLoadingSection(true);
      const text = await getSectionText(book.title, book.author, currentSection);
      console.log('Section text loaded, length:', text.length);
      setSectionText(text);
    } catch (error) {
      console.error('Error loading section:', error);
    } finally {
      setLoadingSection(false);
    }
  };

  const goToNextSection = () => {
    const currentIndex = tableOfContents.findIndex(
      (item) => item.section === currentSection
    );
    if (currentIndex < tableOfContents.length - 1) {
      setCurrentSection(tableOfContents[currentIndex + 1].section);
    }
  };

  const goToPreviousSection = () => {
    const currentIndex = tableOfContents.findIndex(
      (item) => item.section === currentSection
    );
    if (currentIndex > 0) {
      setCurrentSection(tableOfContents[currentIndex - 1].section);
    }
  };

  const currentSectionIndex = tableOfContents.findIndex(
    (item) => item.section === currentSection
  );
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === tableOfContents.length - 1;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading book...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Book not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={styles.headerAuthor}>{book.author}</Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowTOC(true)}
        >
          <Text style={styles.headerButtonText}>📑</Text>
        </TouchableOpacity>
      </View>

      {/* Reading Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
      >
        {loadingSection ? (
          <View style={styles.sectionLoadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {/* Section Title */}
            <Text style={styles.sectionTitle}>{currentSection}</Text>

            {/* Section Text */}
            <Text style={[styles.sectionText, { fontSize }]}>
              {sectionText}
            </Text>

            {/* Navigation Buttons */}
            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.navButtonPrev,
                  isFirstSection && styles.navButtonDisabled,
                ]}
                onPress={goToPreviousSection}
                disabled={isFirstSection}
              >
                <Text
                  style={[
                    styles.navButtonText,
                    isFirstSection && styles.navButtonTextDisabled,
                  ]}
                >
                  ← Previous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.navButtonNext,
                  isLastSection && styles.navButtonDisabled,
                ]}
                onPress={goToNextSection}
                disabled={isLastSection}
              >
                <Text
                  style={[
                    styles.navButtonText,
                    isLastSection && styles.navButtonTextDisabled,
                  ]}
                >
                  Next →
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Font Size Controls */}
      <View style={styles.fontControls}>
        <TouchableOpacity
          style={styles.fontButton}
          onPress={() => setFontSize(Math.max(12, fontSize - 2))}
        >
          <Text style={styles.fontButtonText}>A-</Text>
        </TouchableOpacity>
        <Text style={styles.fontSizeLabel}>{fontSize}pt</Text>
        <TouchableOpacity
          style={styles.fontButton}
          onPress={() => setFontSize(Math.min(24, fontSize + 2))}
        >
          <Text style={styles.fontButtonText}>A+</Text>
        </TouchableOpacity>
      </View>

      {/* Table of Contents Modal */}
      <Modal
        visible={showTOC}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTOC(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Table of Contents</Text>
              <TouchableOpacity onPress={() => setShowTOC(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tocList} contentContainerStyle={styles.tocListContent}>
              {tableOfContents.length === 0 ? (
                <View style={styles.emptyTOC}>
                  <Text style={styles.emptyTOCText}>
                    No chapters found for this book.
                  </Text>
                  <Text style={styles.emptyTOCSubtext}>
                    Book: {book?.title}
                  </Text>
                  <Text style={styles.emptyTOCSubtext}>
                    Author: {book?.author}
                  </Text>
                </View>
              ) : (
                tableOfContents.map((item, index) => {
                  if (index === 0) console.log('Rendering first TOC item:', item.section);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.tocItem,
                        item.section === currentSection && styles.tocItemActive,
                      ]}
                      onPress={() => {
                        console.log('TOC item clicked:', item.section);
                        setCurrentSection(item.section);
                        setShowTOC(false);
                      }}
                    >
                      <View style={styles.tocItemContent}>
                        <Text
                          style={[
                            styles.tocItemNumber,
                            item.section === currentSection && styles.tocItemTextActive,
                          ]}
                        >
                          {index + 1}
                        </Text>
                        <Text
                          style={[
                            styles.tocItemTitle,
                            item.section === currentSection && styles.tocItemTextActive,
                          ]}
                          numberOfLines={2}
                        >
                          {item.section}
                        </Text>
                      </View>
                      {item.section === currentSection && (
                        <Text style={styles.tocItemCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    marginTop: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.lg,
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    padding: theme.spacing.sm,
    minWidth: 60,
  },
  headerButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    fontWeight: '700',
  },
  headerAuthor: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  sectionLoadingContainer: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  sectionText: {
    color: theme.colors.text,
    lineHeight: 28,
    marginBottom: theme.spacing.xl,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  navButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  navButtonPrev: {
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  navButtonNext: {
    backgroundColor: theme.colors.primary,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  navButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  fontButton: {
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
  },
  fontButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
  },
  fontSizeLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    height: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalClose: {
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.textSecondary,
    padding: theme.spacing.sm,
  },
  tocList: {
    flex: 1,
  },
  tocListContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyTOC: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTOCText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTOCSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#1a1a1a',
    minHeight: 60,
  },
  tocItemActive: {
    backgroundColor: theme.colors.primary + '20',
  },
  tocItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tocItemNumber: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: theme.spacing.md,
    minWidth: 30,
  },
  tocItemTitle: {
    fontSize: theme.typography.sizes.md,
    color: '#FFFFFF',
    flex: 1,
  },
  tocItemTextActive: {
    color: theme.colors.primary,
  },
  tocItemCheck: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
});
