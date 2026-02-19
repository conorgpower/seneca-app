const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withDangerousMod,
  withEntitlementsPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const APP_GROUP_ID = 'group.com.depaorgroup.seneca';
const WIDGET_TARGET_NAME = 'WisdomWidgetModuleExtension';
const WIDGET_DIR = 'WisdomWidgetModule';
const WIDGET_PRODUCT_BUNDLE_SUFFIX = 'WisdomWidgetModule';

const APP_BRIDGE_SWIFT = `import Foundation
import WidgetKit

@objc(WisdomWidgetModule)
class WisdomWidgetModule: NSObject {
  private let suiteName = "${APP_GROUP_ID}"

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc func setWidgetQuotes(
    _ smallQuoteText: String,
    smallAuthor: String,
    largeQuoteText: String,
    largeAuthor: String,
    lockQuoteText: String,
    lockAuthor: String
  ) {
    guard let defaults = UserDefaults(suiteName: suiteName) else {
      return
    }

    defaults.set(smallQuoteText, forKey: "quote_text_small")
    defaults.set(smallAuthor, forKey: "author_small")
    defaults.set(largeQuoteText, forKey: "quote_text_large")
    defaults.set(largeAuthor, forKey: "author_large")
    defaults.set(lockQuoteText, forKey: "quote_text_lock")
    defaults.set(lockAuthor, forKey: "author_lock")
    defaults.set(largeQuoteText, forKey: "quote_text")
    defaults.set(largeAuthor, forKey: "author")
    defaults.set(Date(), forKey: "updated_at")

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  @objc func setDailyQuote(_ quoteText: String, author: String) {
    // Backward compatibility: mirror the same quote across all widget families.
    setWidgetQuotes(
      quoteText,
      smallAuthor: author,
      largeQuoteText: quoteText,
      largeAuthor: author,
      lockQuoteText: quoteText,
      lockAuthor: author
    )
  }
}
`;

const APP_BRIDGE_M = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WisdomWidgetModule, NSObject)

RCT_EXTERN_METHOD(setWidgetQuotes:(NSString *)smallQuoteText
                  smallAuthor:(NSString *)smallAuthor
                  largeQuoteText:(NSString *)largeQuoteText
                  largeAuthor:(NSString *)largeAuthor
                  lockQuoteText:(NSString *)lockQuoteText
                  lockAuthor:(NSString *)lockAuthor)

RCT_EXTERN_METHOD(setDailyQuote:(NSString *)quoteText author:(NSString *)author)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
`;

const WIDGET_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>WisdomWidgetModule</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>XPC!</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`;

const WIDGET_ENTITLEMENTS_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP_ID}</string>
  </array>
</dict>
</plist>
`;

const WIDGET_BUNDLE_SWIFT = `import SwiftUI
import WidgetKit

@main
struct WisdomWidgetModuleBundle: WidgetBundle {
  var body: some Widget {
    WisdomWidgetModule()
  }
}
`;

const WIDGET_SWIFT = `import SwiftUI
import WidgetKit

private let appGroupSuite = "${APP_GROUP_ID}"

struct WisdomEntry: TimelineEntry {
  let date: Date
  let smallQuote: String
  let smallAuthor: String
  let largeQuote: String
  let largeAuthor: String
  let lockQuote: String
  let lockAuthor: String
}

struct WisdomProvider: TimelineProvider {
  func placeholder(in context: Context) -> WisdomEntry {
    WisdomEntry(
      date: Date(),
      smallQuote: "Waste no more time arguing about what a good man should be. Be one.",
      smallAuthor: "Marcus Aurelius",
      largeQuote: "Waste no more time arguing about what a good man should be. Be one.",
      largeAuthor: "Marcus Aurelius",
      lockQuote: "Waste no more time arguing about what a good man should be. Be one.",
      lockAuthor: "Marcus Aurelius"
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (WisdomEntry) -> Void) {
    completion(loadEntryFromSharedDefaults())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<WisdomEntry>) -> Void) {
    let entry = loadEntryFromSharedDefaults()
    let nextRefresh = Date().addingTimeInterval(60 * 30)
    completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
  }

  private func loadEntryFromSharedDefaults() -> WisdomEntry {
    let defaults = UserDefaults(suiteName: appGroupSuite)
    let fallbackQuote = "Waste no more time arguing about what a good man should be. Be one."
    let fallbackAuthor = "Marcus Aurelius"

    let smallQuote = defaults?.string(forKey: "quote_text_small") ?? defaults?.string(forKey: "quote_text") ?? fallbackQuote
    let smallAuthor = defaults?.string(forKey: "author_small") ?? defaults?.string(forKey: "author") ?? fallbackAuthor
    let largeQuote = defaults?.string(forKey: "quote_text_large") ?? defaults?.string(forKey: "quote_text") ?? fallbackQuote
    let largeAuthor = defaults?.string(forKey: "author_large") ?? defaults?.string(forKey: "author") ?? fallbackAuthor
    let lockQuote = defaults?.string(forKey: "quote_text_lock") ?? defaults?.string(forKey: "quote_text") ?? fallbackQuote
    let lockAuthor = defaults?.string(forKey: "author_lock") ?? defaults?.string(forKey: "author") ?? fallbackAuthor

    return WisdomEntry(
      date: Date(),
      smallQuote: smallQuote,
      smallAuthor: smallAuthor,
      largeQuote: largeQuote,
      largeAuthor: largeAuthor,
      lockQuote: lockQuote,
      lockAuthor: lockAuthor
    )
  }
}

struct WisdomWidgetModuleEntryView: View {
  @Environment(\\.widgetFamily) private var family
  var entry: WisdomProvider.Entry
  private let communityURL = URL(string: "senecaapp://community")!
  private let todayURL = URL(string: "senecaapp://today")!
  private let shareThoughtURL = URL(string: "senecaapp://community/share-thought")!

  private var displayQuote: String {
    let rawQuote: String
    if #available(iOSApplicationExtension 16.0, *) {
      switch family {
      case .accessoryInline, .accessoryRectangular:
        rawQuote = entry.lockQuote
      default:
        rawQuote = family == .systemSmall ? entry.smallQuote : entry.largeQuote
      }
    } else {
      rawQuote = family == .systemSmall ? entry.smallQuote : entry.largeQuote
    }

    let trimmed = rawQuote.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? "Waste no more time arguing about what a good man should be. Be one." : trimmed
  }

  private var displayAuthor: String {
    let rawAuthor: String
    if #available(iOSApplicationExtension 16.0, *) {
      switch family {
      case .accessoryInline, .accessoryRectangular:
        rawAuthor = entry.lockAuthor
      default:
        rawAuthor = family == .systemSmall ? entry.smallAuthor : entry.largeAuthor
      }
    } else {
      rawAuthor = family == .systemSmall ? entry.smallAuthor : entry.largeAuthor
    }

    let trimmed = rawAuthor.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? "Marcus Aurelius" : trimmed
  }

  private var homeWidgetBackground: some View {
    LinearGradient(
      colors: [Color(red: 0.20, green: 0.20, blue: 0.22), Color(red: 0.06, green: 0.06, blue: 0.08)],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }

  private var homeWidgetTextContent: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Wisdom of the Day")
        .font(.system(size: 14, weight: .semibold))
        .foregroundStyle(.white.opacity(0.90))
        .lineLimit(1)

      Text("\\"\\(displayQuote)\\"")
        .font(.system(size: 15, weight: .medium, design: .serif))
        .foregroundStyle(.white)
        .lineLimit(4)

      Spacer(minLength: 0)

      Text(displayAuthor)
        .font(.system(size: 13, weight: .regular))
        .foregroundStyle(.white.opacity(0.82))
        .lineLimit(1)
    }
    .padding(16)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private var homeWidgetContent: some View {
    Group {
      if #available(iOSApplicationExtension 17.0, *) {
        homeWidgetTextContent
          .containerBackground(for: .widget) {
            homeWidgetBackground
          }
      } else {
        ZStack {
          homeWidgetBackground
          homeWidgetTextContent
        }
      }
    }
  }

  private var inlineLockScreenView: some View {
    Text(displayQuote)
      .font(.system(size: 13, weight: .semibold, design: .serif))
      .minimumScaleFactor(0.58)
      .allowsTightening(true)
      .lineLimit(1)
  }

  private var circularReflectView: some View {
    ZStack {
      Circle()
        .fill(Color.clear)

      Circle()
        .strokeBorder(.white.opacity(0.95), lineWidth: 1.8)

      Text("REFLECT")
        .font(.system(size: 8, weight: .bold))
        .foregroundStyle(.white.opacity(0.98))
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    }
  }

  private var rectangularLockScreenView: some View {
    VStack(alignment: .leading, spacing: 3) {
      Text(displayAuthor)
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(.white.opacity(0.98))
        .lineLimit(1)
        .minimumScaleFactor(0.75)

      Text("\\"\\(displayQuote)\\"")
        .font(.system(size: 14, weight: .medium, design: .serif))
        .foregroundStyle(.white.opacity(0.98))
        .lineLimit(3)
        .minimumScaleFactor(0.72)
        .allowsTightening(true)
        .shadow(color: .black.opacity(0.35), radius: 1, x: 0, y: 1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .padding(.horizontal, 2)
    .padding(.vertical, 2)
  }

  var body: some View {
    Group {
      if #available(iOSApplicationExtension 16.0, *) {
        switch family {
        case .accessoryInline:
          if #available(iOSApplicationExtension 17.0, *) {
            inlineLockScreenView
              .containerBackground(for: .widget) { Color.clear }
              .widgetURL(communityURL)
          } else {
            inlineLockScreenView
              .widgetURL(communityURL)
          }
        case .accessoryCircular:
          if #available(iOSApplicationExtension 17.0, *) {
            circularReflectView
              .containerBackground(for: .widget) { Color.clear }
              .widgetURL(shareThoughtURL)
          } else {
            circularReflectView
              .widgetURL(shareThoughtURL)
          }
        case .accessoryRectangular:
          if #available(iOSApplicationExtension 17.0, *) {
            rectangularLockScreenView
              .containerBackground(for: .widget) { Color.clear }
              .widgetURL(todayURL)
          } else {
            rectangularLockScreenView
              .widgetURL(todayURL)
          }
        default:
          homeWidgetContent
            .widgetURL(todayURL)
        }
      } else {
        homeWidgetContent
          .widgetURL(todayURL)
      }
    }
  }
}

struct WisdomWidgetModule: Widget {
  let kind: String = "SenecaWisdomWidget"

  var body: some WidgetConfiguration {
    var families: [WidgetFamily] = [.systemSmall, .systemMedium]
    if #available(iOSApplicationExtension 16.0, *) {
      families.append(contentsOf: [.accessoryInline, .accessoryCircular, .accessoryRectangular])
    }

    let config = StaticConfiguration(kind: kind, provider: WisdomProvider()) { entry in
      WisdomWidgetModuleEntryView(entry: entry)
    }
    .configurationDisplayName("Seneca Wisdom")
    .description("Shows your daily Wisdom of the Day quote.")
    .supportedFamilies(families)

    if #available(iOSApplicationExtension 17.0, *) {
      return config.contentMarginsDisabled()
    }

    return config
  }
}
`;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileIfChanged(filePath, contents) {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    if (existing === contents) return;
  }
  fs.writeFileSync(filePath, contents);
}

function findTargetKeyByName(project, targetName) {
  const targets = project.pbxNativeTargetSection();
  for (const key of Object.keys(targets)) {
    if (!key.endsWith('_comment')) continue;
    const comment = String(targets[key] || '').replace(/^"(.*)"$/, '$1');
    if (comment === targetName) {
      return key.replace('_comment', '');
    }
  }
  return null;
}

function getTargetBuildConfigurationUuids(project, targetKey) {
  const target = project.pbxNativeTargetSection()[targetKey];
  if (!target || !target.buildConfigurationList) return [];

  const configList = project.pbxXCConfigurationList()[target.buildConfigurationList];
  if (!configList || !Array.isArray(configList.buildConfigurations)) return [];

  return configList.buildConfigurations.map((item) => item.value);
}

function updateTargetBuildSettings(project, targetKey, settings) {
  const configUuids = getTargetBuildConfigurationUuids(project, targetKey);
  if (!configUuids.length) return;

  const buildConfigs = project.pbxXCBuildConfigurationSection();
  for (const uuid of configUuids) {
    const config = buildConfigs[uuid];
    if (!config || !config.buildSettings) continue;
    for (const [k, v] of Object.entries(settings)) {
      config.buildSettings[k] = v;
    }
  }
}

function findBuildFileRefUuid(project, filePath) {
  const refs = project.pbxFileReferenceSection();
  for (const key of Object.keys(refs)) {
    if (key.endsWith('_comment')) continue;
    const ref = refs[key];
    if (ref.path === filePath || ref.path === `"${filePath}"`) {
      return key;
    }
  }
  return null;
}

function ensureSourceInTarget(project, filePath, targetKey, groupKey) {
  const sourcePhase = project.pbxSourcesBuildPhaseObj(targetKey);
  const basename = path.basename(filePath);
  const expectedComment = `${basename} in Sources`;
  const hasBuildRef = sourcePhase?.files?.some((item) => item.comment === expectedComment);
  if (hasBuildRef) return;

  const existingFile = project.hasFile(filePath);
  if (!existingFile) {
    project.addSourceFile(filePath, { target: targetKey }, groupKey);
    return;
  }

  const fileRefUuid = findBuildFileRefUuid(project, filePath);
  if (!fileRefUuid || !sourcePhase) return;

  const buildFileUuid = project.generateUuid();
  const buildFileSection = project.pbxBuildFileSection();
  buildFileSection[buildFileUuid] = {
    isa: 'PBXBuildFile',
    fileRef: fileRefUuid,
    fileRef_comment: basename,
  };
  buildFileSection[`${buildFileUuid}_comment`] = expectedComment;
  sourcePhase.files.push({ value: buildFileUuid, comment: expectedComment });
}

function ensureWidgetGroup(project) {
  let widgetGroupKey =
    project.findPBXGroupKey({ path: WIDGET_DIR }) || project.findPBXGroupKey({ name: WIDGET_DIR });

  if (!widgetGroupKey) {
    const created = project.addPbxGroup([], WIDGET_DIR, WIDGET_DIR);
    widgetGroupKey = created.uuid;
    const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(widgetGroupKey, mainGroupKey);
  }

  return widgetGroupKey;
}

function withWisdomWidget(config) {
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = config.modRequest.platformProjectRoot;
      const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);

      const appTargetDir = path.join(iosRoot, projectName);
      const widgetDir = path.join(iosRoot, WIDGET_DIR);
      ensureDir(appTargetDir);
      ensureDir(widgetDir);

      writeFileIfChanged(path.join(appTargetDir, 'WisdomWidgetModule.swift'), APP_BRIDGE_SWIFT);
      writeFileIfChanged(path.join(appTargetDir, 'WisdomWidgetModuleBridge.m'), APP_BRIDGE_M);
      writeFileIfChanged(path.join(widgetDir, 'Info.plist'), WIDGET_INFO_PLIST);
      writeFileIfChanged(
        path.join(widgetDir, 'WisdomWidgetModule.entitlements'),
        WIDGET_ENTITLEMENTS_PLIST
      );
      writeFileIfChanged(path.join(widgetDir, 'WisdomWidgetModuleBundle.swift'), WIDGET_BUNDLE_SWIFT);
      writeFileIfChanged(path.join(widgetDir, 'WisdomWidgetModule.swift'), WIDGET_SWIFT);

      for (const oldFile of [
        'AppIntent.swift',
        'WisdomWidgetModuleControl.swift',
        'WisdomWidgetModuleLiveActivity.swift',
      ]) {
        const stalePath = path.join(widgetDir, oldFile);
        if (fs.existsSync(stalePath)) {
          fs.unlinkSync(stalePath);
        }
      }

      return config;
    },
  ]);

  config = withEntitlementsPlist(config, (config) => {
    const current = config.modResults['com.apple.security.application-groups'] || [];
    const groups = Array.isArray(current) ? current : [];
    if (!groups.includes(APP_GROUP_ID)) {
      groups.push(APP_GROUP_ID);
    }
    config.modResults['com.apple.security.application-groups'] = groups;
    return config;
  });

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
    const bundleId = config.ios?.bundleIdentifier || 'com.depaorgroup.seneca';
    const widgetBundleId = `${bundleId}.${WIDGET_PRODUCT_BUNDLE_SUFFIX}`;

    const appTargetKey = findTargetKeyByName(project, projectName);
    let widgetTargetKey = findTargetKeyByName(project, WIDGET_TARGET_NAME);

    if (!widgetTargetKey) {
      const created = project.addTarget(WIDGET_TARGET_NAME, 'app_extension', WIDGET_DIR, widgetBundleId);
      widgetTargetKey = created.uuid;
    }

    if (!project.buildPhaseObject('Sources', widgetTargetKey)) {
      project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', widgetTargetKey);
    }
    if (!project.buildPhaseObject('Frameworks', widgetTargetKey)) {
      project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', widgetTargetKey);
    }
    if (!project.buildPhaseObject('Resources', widgetTargetKey)) {
      project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', widgetTargetKey);
    }

    updateTargetBuildSettings(project, widgetTargetKey, {
      INFOPLIST_FILE: `${WIDGET_DIR}/Info.plist`,
      PRODUCT_BUNDLE_IDENTIFIER: widgetBundleId,
      MARKETING_VERSION: '1.0',
      CURRENT_PROJECT_VERSION: '1',
      IPHONEOS_DEPLOYMENT_TARGET: '16.0',
      SWIFT_VERSION: '5.0',
      APPLICATION_EXTENSION_API_ONLY: 'YES',
      CODE_SIGN_ENTITLEMENTS: `${WIDGET_DIR}/WisdomWidgetModule.entitlements`,
    });

    const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
    ensureWidgetGroup(project);
    ensureSourceInTarget(
      project,
      `${WIDGET_DIR}/WisdomWidgetModuleBundle.swift`,
      widgetTargetKey,
      mainGroupKey
    );
    ensureSourceInTarget(
      project,
      `${WIDGET_DIR}/WisdomWidgetModule.swift`,
      widgetTargetKey,
      mainGroupKey
    );

    project.addFramework('WidgetKit.framework', { target: widgetTargetKey });
    project.addFramework('SwiftUI.framework', { target: widgetTargetKey });

    if (appTargetKey) {
      ensureSourceInTarget(
        project,
        `${projectName}/WisdomWidgetModule.swift`,
        appTargetKey,
        mainGroupKey
      );
      ensureSourceInTarget(
        project,
        `${projectName}/WisdomWidgetModuleBridge.m`,
        appTargetKey,
        mainGroupKey
      );
    }

    return config;
  });

  return config;
}

module.exports = withWisdomWidget;
