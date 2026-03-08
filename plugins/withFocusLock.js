const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withDangerousMod,
  withEntitlementsPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const APP_GROUP_ID = 'group.com.depaorgroup.seneca';
const SHIELD_CONFIG_TARGET_NAME = 'SenecaShieldConfig';
const SHIELD_CONFIG_DIR = 'SenecaShieldConfig';
const SHIELD_ACTION_TARGET_NAME = 'SenecaShieldAction';
const SHIELD_ACTION_DIR = 'SenecaShieldAction';

// ============================================================================
// NATIVE MODULE — FocusLockModule.swift  (main app target)
// ============================================================================

const FOCUS_LOCK_MODULE_SWIFT = `import Foundation
import React
import FamilyControls
import ManagedSettings
import SwiftUI

@available(iOS 16.0, *)
@objc(FocusLockModule)
class FocusLockModule: NSObject {
  private let suiteName = "${APP_GROUP_ID}"
  private let store = ManagedSettingsStore()

  @objc static func requiresMainQueueSetup() -> Bool { true }

  // MARK: - Authorization

  @objc func requestAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        resolve(true)
      } catch {
        reject("AUTH_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc func getAuthorizationStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let status = AuthorizationCenter.shared.authorizationStatus
    switch status {
    case .approved:      resolve("approved")
    case .denied:        resolve("denied")
    case .notDetermined: resolve("notDetermined")
    @unknown default:    resolve("unknown")
    }
  }

  // MARK: - App Picker

  @objc func presentAppPicker(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let rootVC = scene.windows.first(where: \\.isKeyWindow)?.rootViewController
      else {
        let err = NSError(domain: "FocusLock", code: 1, userInfo: [NSLocalizedDescriptionKey: "No root view controller found"])
        reject("NO_VC", "No root view controller found", err)
        return
      }

      // Find the topmost presented controller
      var topVC = rootVC
      while let presented = topVC.presentedViewController {
        topVC = presented
      }

      let defaults = UserDefaults(suiteName: self.suiteName)
      var initialSelection = FamilyActivitySelection()
      if let data = defaults?.data(forKey: "focus_lock_selection"),
         let decoded = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data) {
        initialSelection = decoded
      }

      let pickerView = FocusLockPickerView(
        initialSelection: initialSelection,
        onSave: { [weak self] selection in
          guard let self = self else { return }
          let defaults = UserDefaults(suiteName: self.suiteName)
          if let encoded = try? PropertyListEncoder().encode(selection) {
            defaults?.set(encoded, forKey: "focus_lock_selection")
          }

          // Count both individual apps and categories
          let appTokenCount = selection.applicationTokens.count
          let catTokenCount = selection.categoryTokens.count
          let count = appTokenCount + catTokenCount
          defaults?.set(count, forKey: "focus_lock_app_count")
          print("[FocusLock] onSave — \\(appTokenCount) appTokens, \\(catTokenCount) catTokens, total: \\(count)")

          // Auto-lock: clear old shields first, then apply new selection
          self.store.clearAllSettings()
          if count > 0 {
            if !selection.applicationTokens.isEmpty {
              self.store.shield.applications = selection.applicationTokens
              print("[FocusLock] onSave — shielded \\(appTokenCount) app tokens")
            }
            if !selection.categoryTokens.isEmpty {
              self.store.shield.applicationCategories = .specific(selection.categoryTokens)
              print("[FocusLock] onSave — shielded \\(catTokenCount) category tokens")
            }
            defaults?.set(true, forKey: "focus_lock_enabled")
            print("[FocusLock] onSave — focus_lock_enabled = true")
          } else {
            defaults?.set(false, forKey: "focus_lock_enabled")
            print("[FocusLock] onSave — no selection, cleared shields")
          }

          topVC.dismiss(animated: true) {
            resolve(["appCount": count])
          }
        },
        onCancel: {
          topVC.dismiss(animated: true) {
            resolve(NSNull())
          }
        }
      )

      let hostingController = UIHostingController(rootView: pickerView)
      hostingController.modalPresentationStyle = .pageSheet
      topVC.present(hostingController, animated: true)
    }
  }

  // MARK: - Lock / Unlock

  @objc func lockApps(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = UserDefaults(suiteName: suiteName)
    guard let data = defaults?.data(forKey: "focus_lock_selection"),
          let selection = try? PropertyListDecoder().decode(
            FamilyActivitySelection.self, from: data
          )
    else {
      let err = NSError(domain: "FocusLock", code: 2, userInfo: [NSLocalizedDescriptionKey: "No apps selected"])
      reject("NO_SELECTION", "No apps selected", err)
      return
    }

    if !selection.applicationTokens.isEmpty {
      store.shield.applications = selection.applicationTokens
    }
    if !selection.categoryTokens.isEmpty {
      store.shield.applicationCategories = .specific(selection.categoryTokens)
    }

    defaults?.set(true, forKey: "focus_lock_enabled")
    resolve(true)
  }

  @objc func unlockApps(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    store.clearAllSettings()

    let defaults = UserDefaults(suiteName: suiteName)
    defaults?.set(false, forKey: "focus_lock_enabled")

    let formatter = ISO8601DateFormatter()
    defaults?.set(formatter.string(from: Date()), forKey: "focus_lock_unlocked_date")

    resolve(true)
  }

  // MARK: - Auto Re-lock

  @objc func relockIfNewDay(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = UserDefaults(suiteName: suiteName)

    // Only re-lock if there's a saved selection and it was previously unlocked
    guard let unlockedDateStr = defaults?.string(forKey: "focus_lock_unlocked_date"),
          let data = defaults?.data(forKey: "focus_lock_selection"),
          let selection = try? PropertyListDecoder().decode(
            FamilyActivitySelection.self, from: data
          )
    else {
      resolve(false)
      return
    }

    // Check if the unlock was from a previous day
    let today = Calendar.current.startOfDay(for: Date())
    let formatter = ISO8601DateFormatter()
    guard let unlockedDate = formatter.date(from: unlockedDateStr) else {
      resolve(false)
      return
    }

    let unlockDay = Calendar.current.startOfDay(for: unlockedDate)
    guard unlockDay < today else {
      resolve(false)
      return
    }

    // Already locked — skip
    let isAlreadyEnabled = defaults?.bool(forKey: "focus_lock_enabled") ?? false
    if isAlreadyEnabled {
      resolve(false)
      return
    }

    // New day — re-apply shields
    print("[FocusLock] relockIfNewDay — new day, re-applying shields")
    if !selection.applicationTokens.isEmpty {
      store.shield.applications = selection.applicationTokens
    }
    if !selection.categoryTokens.isEmpty {
      store.shield.applicationCategories = .specific(selection.categoryTokens)
    }

    defaults?.set(true, forKey: "focus_lock_enabled")
    defaults?.removeObject(forKey: "focus_lock_unlocked_date")
    resolve(true)
  }

  // MARK: - Status

  @objc func getLockStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = UserDefaults(suiteName: suiteName)
    let isEnabled = defaults?.bool(forKey: "focus_lock_enabled") ?? false
    let appCount = defaults?.integer(forKey: "focus_lock_app_count") ?? 0
    let unlockedDate = defaults?.string(forKey: "focus_lock_unlocked_date") as Any

    resolve([
      "isEnabled": isEnabled,
      "appCount": appCount,
      "unlockedDate": unlockedDate,
    ])
  }

  // MARK: - Selected App Names

  @objc func getSelectedAppNames(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = UserDefaults(suiteName: suiteName)
    guard let data = defaults?.data(forKey: "focus_lock_selection"),
          let selection = try? PropertyListDecoder().decode(
            FamilyActivitySelection.self, from: data
          )
    else {
      resolve([])
      return
    }

    var names: [String] = []
    if #available(iOS 16.4, *) {
      for app in selection.applications {
        if let name = app.localizedDisplayName {
          names.append(name)
        }
      }
      for cat in selection.categories {
        if let name = cat.localizedDisplayName {
          names.append(name)
        }
      }
    }
    names.sort()
    resolve(names)
  }
}

// MARK: - SwiftUI Picker Wrapper

@available(iOS 16.0, *)
struct FocusLockPickerView: View {
  @State var selection: FamilyActivitySelection
  var onSave: (FamilyActivitySelection) -> Void
  var onCancel: () -> Void

  init(
    initialSelection: FamilyActivitySelection,
    onSave: @escaping (FamilyActivitySelection) -> Void,
    onCancel: @escaping () -> Void
  ) {
    _selection = State(initialValue: initialSelection)
    self.onSave = onSave
    self.onCancel = onCancel
  }

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Select Apps to Lock")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") { onCancel() }
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") { onSave(selection) }
              .bold()
          }
        }
    }
  }
}
`;

// ============================================================================
// NATIVE VIEW — FocusLockAppGrid.swift  (renders real app icons via SwiftUI)
// ============================================================================

const FOCUS_LOCK_APP_GRID_SWIFT = `import UIKit
import SwiftUI
import FamilyControls
import ManagedSettings
import React

@available(iOS 16.0, *)
struct AppIconGridContent: View {
  let isLocked: Bool
  let refreshTrigger: Int
  let categoryTokens: [ActivityCategoryToken]
  let applicationTokens: [ApplicationToken]

  private let goldColor = Color(red: 222.0/255.0, green: 173.0/255.0, blue: 92.0/255.0)
  private let tileBg = Color(red: 28.0/255.0, green: 27.0/255.0, blue: 30.0/255.0)

  private var totalCount: Int { categoryTokens.count + applicationTokens.count }

  @ViewBuilder
  private func iconTile<V: View>(_ icon: V) -> some View {
    ZStack(alignment: .topTrailing) {
      icon
        .frame(width: 44, height: 44)
        .frame(width: 60, height: 60)
        .background(tileBg)
        .clipShape(RoundedRectangle(cornerRadius: 14))

      if isLocked {
        Circle()
          .fill(goldColor)
          .frame(width: 20, height: 20)
          .overlay(
            Image(systemName: "lock.fill")
              .font(.system(size: 10, weight: .bold))
              .foregroundColor(tileBg)
          )
          .offset(x: 4, y: -4)
      }
    }
  }

  var body: some View {
    if totalCount > 0 {
      let columns = Array(repeating: GridItem(.fixed(60), spacing: 12), count: 4)
      // Show up to 11 icons total: individual apps first, then categories
      let appSlice = Array(applicationTokens.prefix(11))
      let catSlots = max(0, 11 - appSlice.count)
      let catSlice = Array(categoryTokens.prefix(catSlots))

      LazyVGrid(columns: columns, alignment: .leading, spacing: 12) {
        ForEach(appSlice, id: \\.self) { token in
          iconTile(Label(token).labelStyle(.iconOnly))
        }
        ForEach(catSlice, id: \\.self) { token in
          iconTile(Label(token).labelStyle(.iconOnly))
        }

        if totalCount > 11 {
          Text("+\\(totalCount - 11)")
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(Color(white: 0.69))
            .frame(width: 60, height: 60)
            .background(tileBg)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
      }
    }
  }
}

@available(iOS 16.0, *)
@objc(FocusLockAppGridManager)
class FocusLockAppGridManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }

  override func view() -> UIView! {
    return FocusLockAppGridHostView()
  }
}

@available(iOS 16.0, *)
class FocusLockAppGridHostView: UIView {
  private var hostingController: UIHostingController<AppIconGridContent>?
  private var _isLocked = false
  private var _refreshTrigger = 0
  private let appGroupId = "${APP_GROUP_ID}"

  @objc var isLocked: NSNumber? {
    didSet {
      _isLocked = isLocked?.boolValue ?? false
      refresh()
    }
  }

  @objc var refreshTrigger: NSNumber? {
    didSet {
      _refreshTrigger = refreshTrigger?.intValue ?? 0
      refresh()
    }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    setup()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setup()
  }

  /// Sort tokens deterministically by their encoded bytes so the grid order is stable.
  private func stableSorted<T: Encodable & Hashable>(_ tokens: Set<T>) -> [T] {
    let encoder = PropertyListEncoder()
    encoder.outputFormat = .binary
    let paired: [(T, Data)] = tokens.map { t in
      let data = (try? encoder.encode(t)) ?? Data()
      return (t, data)
    }
    return paired
      .sorted { $0.1.lexicographicallyPrecedes($1.1) }
      .map { $0.0 }
  }

  private func decodeTokens() -> (cats: [ActivityCategoryToken], apps: [ApplicationToken]) {
    guard let defaults = UserDefaults(suiteName: appGroupId),
          let data = defaults.data(forKey: "focus_lock_selection"),
          let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
    else { return ([], []) }
    return (stableSorted(selection.categoryTokens), stableSorted(selection.applicationTokens))
  }

  private func makeContent() -> AppIconGridContent {
    let tokens = decodeTokens()
    return AppIconGridContent(
      isLocked: _isLocked,
      refreshTrigger: _refreshTrigger,
      categoryTokens: tokens.cats,
      applicationTokens: tokens.apps
    )
  }

  private func setup() {
    backgroundColor = .clear
    let content = makeContent()
    let hc = UIHostingController(rootView: content)
    hc.view.backgroundColor = .clear
    hc.view.translatesAutoresizingMaskIntoConstraints = false
    addSubview(hc.view)
    NSLayoutConstraint.activate([
      hc.view.topAnchor.constraint(equalTo: topAnchor),
      hc.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      hc.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      hc.view.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
    hostingController = hc
  }

  private func refresh() {
    hostingController?.rootView = makeContent()
  }
}
`;

const FOCUS_LOCK_APP_GRID_BRIDGE_M = [
  '#import <React/RCTViewManager.h>',
  '',
  '@interface RCT_EXTERN_MODULE(FocusLockAppGridManager, RCTViewManager)',
  '',
  'RCT_EXPORT_VIEW_PROPERTY(isLocked, NSNumber)',
  'RCT_EXPORT_VIEW_PROPERTY(refreshTrigger, NSNumber)',
  '',
  '@end',
  '',
].join('\n');

// ============================================================================
// NATIVE MODULE — FocusLockModuleBridge.m  (main app target)
// ============================================================================

const FOCUS_LOCK_BRIDGE_M = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FocusLockModule, NSObject)

RCT_EXTERN_METHOD(requestAuthorization:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAuthorizationStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(presentAppPicker:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(lockApps:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(unlockApps:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(relockIfNewDay:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getLockStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSelectedAppNames:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
`;

// ============================================================================
// SHIELD CONFIGURATION EXTENSION
// ============================================================================

const SHIELD_CONFIG_SWIFT = `import ManagedSettings
import ManagedSettingsUI
import UIKit

class ShieldConfigurationExtension: ShieldConfigurationDataSource {

  private let goldColor = UIColor(red: 0.871, green: 0.678, blue: 0.361, alpha: 1.0)
  private let darkBg = UIColor(red: 0.11, green: 0.106, blue: 0.118, alpha: 1.0)

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    makeConfig()
  }

  override func configuration(
    shielding application: Application,
    in category: ActivityCategory
  ) -> ShieldConfiguration {
    makeConfig()
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    makeConfig()
  }

  override func configuration(
    shielding webDomain: WebDomain,
    in category: ActivityCategory
  ) -> ShieldConfiguration {
    makeConfig()
  }

  private func makeConfig() -> ShieldConfiguration {
    ShieldConfiguration(
      backgroundBlurStyle: .dark,
      backgroundColor: darkBg,
      icon: nil,
      title: ShieldConfiguration.Label(
        text: "Time for Wisdom",
        color: .white
      ),
      subtitle: ShieldConfiguration.Label(
        text: "Open Seneca Chat to read today\\'s wisdom and unlock this app",
        color: UIColor.white.withAlphaComponent(0.7)
      ),
      primaryButtonLabel: ShieldConfiguration.Label(
        text: "Dismiss",
        color: .white
      ),
      primaryButtonBackgroundColor: goldColor
    )
  }
}
`;

const SHIELD_CONFIG_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>SenecaShieldConfig</string>
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
    <string>com.apple.ManagedSettingsUI.shield-configuration-service</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).ShieldConfigurationExtension</string>
  </dict>
</dict>
</plist>
`;

// ============================================================================
// SHIELD ACTION EXTENSION
// ============================================================================

const SHIELD_ACTION_SWIFT = `import ManagedSettings

class ShieldActionExtension: ShieldActionDelegate {

  override func handle(
    action: ShieldAction,
    for application: ApplicationToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    switch action {
    case .primaryButtonPressed:
      completionHandler(.close)
    case .secondaryButtonPressed:
      completionHandler(.close)
    @unknown default:
      completionHandler(.close)
    }
  }

  override func handle(
    action: ShieldAction,
    for webDomain: WebDomainToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    switch action {
    case .primaryButtonPressed:
      completionHandler(.close)
    case .secondaryButtonPressed:
      completionHandler(.close)
    @unknown default:
      completionHandler(.close)
    }
  }

  override func handle(
    action: ShieldAction,
    for category: ActivityCategoryToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    switch action {
    case .primaryButtonPressed:
      completionHandler(.close)
    case .secondaryButtonPressed:
      completionHandler(.close)
    @unknown default:
      completionHandler(.close)
    }
  }
}
`;

const SHIELD_ACTION_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>SenecaShieldAction</string>
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
    <string>com.apple.ManagedSettings.shield-action-service</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).ShieldActionExtension</string>
  </dict>
</dict>
</plist>
`;

// ============================================================================
// SHARED ENTITLEMENTS for extensions
// ============================================================================

const EXTENSION_ENTITLEMENTS_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP_ID}</string>
  </array>
  <key>com.apple.developer.family-controls</key>
  <true/>
</dict>
</plist>
`;

// ============================================================================
// HELPERS (same as withWisdomWidget.js)
// ============================================================================

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

function getTargetBuildSetting(project, targetKey, settingName, preferredConfigName) {
  const configUuids = getTargetBuildConfigurationUuids(project, targetKey);
  if (!configUuids.length) return null;

  const buildConfigs = project.pbxXCBuildConfigurationSection();
  let fallbackValue = null;

  for (const uuid of configUuids) {
    const config = buildConfigs[uuid];
    if (!config || !config.buildSettings) continue;

    const value = config.buildSettings[settingName];
    if (!value) continue;

    if (!fallbackValue) {
      fallbackValue = value;
    }

    if (preferredConfigName && config.name === preferredConfigName) {
      return value;
    }
  }

  return fallbackValue;
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

function ensureExtensionGroup(project, dirName) {
  let groupKey =
    project.findPBXGroupKey({ path: dirName }) || project.findPBXGroupKey({ name: dirName });

  if (!groupKey) {
    const created = project.addPbxGroup([], dirName, dirName);
    groupKey = created.uuid;
    const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(groupKey, mainGroupKey);
  }

  return groupKey;
}

// ============================================================================
// Set up one app extension target (reused for both shield config & action)
// ============================================================================

function setupExtensionTarget(
  project,
  targetName,
  dirName,
  bundleId,
  appVersion,
  developmentTeam,
  entitlementsFileName,
  frameworks
) {
  let targetKey = findTargetKeyByName(project, targetName);

  if (!targetKey) {
    const created = project.addTarget(targetName, 'app_extension', dirName, bundleId);
    targetKey = created.uuid;
  }

  // Ensure build phases exist
  if (!project.buildPhaseObject('Sources', targetKey)) {
    project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', targetKey);
  }
  if (!project.buildPhaseObject('Frameworks', targetKey)) {
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetKey);
  }
  if (!project.buildPhaseObject('Resources', targetKey)) {
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetKey);
  }

  updateTargetBuildSettings(project, targetKey, {
    INFOPLIST_FILE: `${dirName}/Info.plist`,
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,
    MARKETING_VERSION: appVersion,
    CURRENT_PROJECT_VERSION: '1',
    IPHONEOS_DEPLOYMENT_TARGET: '16.0',
    SWIFT_VERSION: '5.0',
    APPLICATION_EXTENSION_API_ONLY: 'YES',
    CODE_SIGN_ENTITLEMENTS: `${dirName}/${entitlementsFileName}`,
    CODE_SIGN_STYLE: 'Automatic',
    ...(developmentTeam ? { DEVELOPMENT_TEAM: developmentTeam } : {}),
  });

  // TargetAttributes for provisioning
  const firstProject = project.getFirstProject();
  const targetAttributes = firstProject?.firstProject?.attributes?.TargetAttributes;
  if (targetAttributes && targetKey) {
    targetAttributes[targetKey] = {
      ...(targetAttributes[targetKey] || {}),
      ProvisioningStyle: 'Automatic',
      ...(developmentTeam ? { DevelopmentTeam: developmentTeam } : {}),
    };
  }

  // Add frameworks
  for (const fw of frameworks) {
    project.addFramework(fw, { target: targetKey });
  }

  return targetKey;
}

// ============================================================================
// Add a target dependency so Xcode builds the extension before the app
// ============================================================================

function addExtensionDependency(project, appTargetKey, extensionTargetKey, extensionTargetName) {
  const appTarget = project.pbxNativeTargetSection()[appTargetKey];
  if (!appTarget) return;

  if (!appTarget.dependencies) {
    appTarget.dependencies = [];
  }
  const hasDependency = appTarget.dependencies.some((dep) => {
    const depObj = project.hash.project.objects.PBXTargetDependency?.[dep.value];
    return depObj && depObj.target === extensionTargetKey;
  });
  if (!hasDependency) {
    const depUuid = project.generateUuid();
    const proxyUuid = project.generateUuid();
    const rootProjectUuid = project.getFirstProject().uuid;

    // PBXContainerItemProxy
    if (!project.hash.project.objects.PBXContainerItemProxy) {
      project.hash.project.objects.PBXContainerItemProxy = {};
    }
    project.hash.project.objects.PBXContainerItemProxy[proxyUuid] = {
      isa: 'PBXContainerItemProxy',
      containerPortal: rootProjectUuid,
      proxyType: 1,
      remoteGlobalIDString: extensionTargetKey,
      remoteInfo: `"${extensionTargetName}"`,
    };
    project.hash.project.objects.PBXContainerItemProxy[`${proxyUuid}_comment`] = 'PBXContainerItemProxy';

    // PBXTargetDependency
    if (!project.hash.project.objects.PBXTargetDependency) {
      project.hash.project.objects.PBXTargetDependency = {};
    }
    project.hash.project.objects.PBXTargetDependency[depUuid] = {
      isa: 'PBXTargetDependency',
      target: extensionTargetKey,
      targetProxy: proxyUuid,
    };
    project.hash.project.objects.PBXTargetDependency[`${depUuid}_comment`] = 'PBXTargetDependency';

    appTarget.dependencies.push({ value: depUuid, comment: 'PBXTargetDependency' });
  }
}

// ============================================================================
// Conditionally embed extensions only for device builds (not simulator).
// Screen Time / ManagedSettings extensions use extension points that the
// iOS Simulator does not recognise, so including the .appex in a simulator
// build causes installation to fail.
// ============================================================================

function addConditionalEmbedScript(project, appTargetKey, extensionNames) {
  const appTarget = project.pbxNativeTargetSection()[appTargetKey];
  if (!appTarget || !appTarget.buildPhases) return;

  const phaseName = 'Embed Shield Extensions (Device Only)';

  if (!project.hash.project.objects.PBXShellScriptBuildPhase) {
    project.hash.project.objects.PBXShellScriptBuildPhase = {};
  }
  const scriptPhases = project.hash.project.objects.PBXShellScriptBuildPhase;

  // Don't add twice
  const alreadyExists = appTarget.buildPhases.some((p) => {
    const obj = scriptPhases[p.value];
    return obj && (obj.name === phaseName || obj.name === `"${phaseName}"`);
  });
  if (alreadyExists) return;

  // Build the shell script
  const copies = extensionNames
    .map(
      (name) =>
        `  APPEX="$BUILT_PRODUCTS_DIR/${name}.appex"\n` +
        '  if [ -d "$APPEX" ]; then\n' +
        '    cp -R "$APPEX" "$DEST/"\n' +
        '    if [ "$CODE_SIGNING_ALLOWED" != "NO" ] && [ -n "$EXPANDED_CODE_SIGN_IDENTITY" ]; then\n' +
        `      /usr/bin/codesign --force --sign "$EXPANDED_CODE_SIGN_IDENTITY" --timestamp=none "$DEST/${name}.appex"\n` +
        '    fi\n' +
        '  fi'
    )
    .join('\n');

  const script =
    'if [ "$PLATFORM_NAME" == "iphoneos" ]; then\n' +
    '  DEST="$BUILT_PRODUCTS_DIR/$WRAPPER_NAME/PlugIns"\n' +
    '  mkdir -p "$DEST"\n' +
    copies +
    '\nfi\n';

  const uuid = project.generateUuid();
  scriptPhases[uuid] = {
    isa: 'PBXShellScriptBuildPhase',
    buildActionMask: 2147483647,
    files: [],
    inputPaths: [],
    name: `"${phaseName}"`,
    outputPaths: [],
    runOnlyForDeploymentPostprocessing: 0,
    shellPath: '/bin/sh',
    shellScript: JSON.stringify(script),
  };
  scriptPhases[`${uuid}_comment`] = phaseName;

  appTarget.buildPhases.push({
    value: uuid,
    comment: phaseName,
  });
}

// ============================================================================
// MAIN PLUGIN
// ============================================================================

function withFocusLock(config) {
  // --- Phase 1: Write native files ---
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = config.modRequest.platformProjectRoot;
      const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);

      const appTargetDir = path.join(iosRoot, projectName);
      const shieldConfigDir = path.join(iosRoot, SHIELD_CONFIG_DIR);
      const shieldActionDir = path.join(iosRoot, SHIELD_ACTION_DIR);

      ensureDir(appTargetDir);
      ensureDir(shieldConfigDir);
      ensureDir(shieldActionDir);

      // Main app native module
      writeFileIfChanged(path.join(appTargetDir, 'FocusLockModule.swift'), FOCUS_LOCK_MODULE_SWIFT);
      writeFileIfChanged(path.join(appTargetDir, 'FocusLockModuleBridge.m'), FOCUS_LOCK_BRIDGE_M);
      writeFileIfChanged(path.join(appTargetDir, 'FocusLockAppGrid.swift'), FOCUS_LOCK_APP_GRID_SWIFT);
      writeFileIfChanged(path.join(appTargetDir, 'FocusLockAppGridBridge.m'), FOCUS_LOCK_APP_GRID_BRIDGE_M);

      // Shield Configuration extension
      writeFileIfChanged(path.join(shieldConfigDir, 'ShieldConfigurationExtension.swift'), SHIELD_CONFIG_SWIFT);
      writeFileIfChanged(path.join(shieldConfigDir, 'Info.plist'), SHIELD_CONFIG_INFO_PLIST);
      writeFileIfChanged(path.join(shieldConfigDir, 'SenecaShieldConfig.entitlements'), EXTENSION_ENTITLEMENTS_PLIST);

      // Shield Action extension
      writeFileIfChanged(path.join(shieldActionDir, 'ShieldActionExtension.swift'), SHIELD_ACTION_SWIFT);
      writeFileIfChanged(path.join(shieldActionDir, 'Info.plist'), SHIELD_ACTION_INFO_PLIST);
      writeFileIfChanged(path.join(shieldActionDir, 'SenecaShieldAction.entitlements'), EXTENSION_ENTITLEMENTS_PLIST);

      return config;
    },
  ]);

  // --- Phase 2: Entitlements ---
  config = withEntitlementsPlist(config, (config) => {
    // App Groups (may already exist from widget plugin)
    const currentGroups = config.modResults['com.apple.security.application-groups'] || [];
    const groups = Array.isArray(currentGroups) ? currentGroups : [];
    if (!groups.includes(APP_GROUP_ID)) {
      groups.push(APP_GROUP_ID);
    }
    config.modResults['com.apple.security.application-groups'] = groups;

    // Family Controls entitlement
    config.modResults['com.apple.developer.family-controls'] = true;

    return config;
  });

  // --- Phase 3: Xcode project ---
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
    const bundleId = config.ios?.bundleIdentifier || 'com.depaorgroup.seneca';
    const appVersion = config.version || '1.0.0';

    const appTargetKey = findTargetKeyByName(project, projectName);
    const developmentTeam =
      (appTargetKey && getTargetBuildSetting(project, appTargetKey, 'DEVELOPMENT_TEAM', 'Release')) ||
      config.ios?.developmentTeam;

    const mainGroupKey = project.getFirstProject().firstProject.mainGroup;

    // --- Shield Configuration Extension ---
    const shieldConfigTargetKey = setupExtensionTarget(
      project,
      SHIELD_CONFIG_TARGET_NAME,
      SHIELD_CONFIG_DIR,
      `${bundleId}.${SHIELD_CONFIG_DIR}`,
      appVersion,
      developmentTeam,
      'SenecaShieldConfig.entitlements',
      ['ManagedSettings.framework', 'ManagedSettingsUI.framework']
    );

    ensureExtensionGroup(project, SHIELD_CONFIG_DIR);
    ensureSourceInTarget(
      project,
      `${SHIELD_CONFIG_DIR}/ShieldConfigurationExtension.swift`,
      shieldConfigTargetKey,
      mainGroupKey
    );

    // --- Shield Action Extension ---
    const shieldActionTargetKey = setupExtensionTarget(
      project,
      SHIELD_ACTION_TARGET_NAME,
      SHIELD_ACTION_DIR,
      `${bundleId}.${SHIELD_ACTION_DIR}`,
      appVersion,
      developmentTeam,
      'SenecaShieldAction.entitlements',
      ['ManagedSettings.framework']
    );

    ensureExtensionGroup(project, SHIELD_ACTION_DIR);
    ensureSourceInTarget(
      project,
      `${SHIELD_ACTION_DIR}/ShieldActionExtension.swift`,
      shieldActionTargetKey,
      mainGroupKey
    );

    // --- Main app target: add native module sources + frameworks ---
    if (appTargetKey) {
      ensureSourceInTarget(
        project,
        `${projectName}/FocusLockModule.swift`,
        appTargetKey,
        mainGroupKey
      );
      ensureSourceInTarget(
        project,
        `${projectName}/FocusLockModuleBridge.m`,
        appTargetKey,
        mainGroupKey
      );
      ensureSourceInTarget(
        project,
        `${projectName}/FocusLockAppGrid.swift`,
        appTargetKey,
        mainGroupKey
      );
      ensureSourceInTarget(
        project,
        `${projectName}/FocusLockAppGridBridge.m`,
        appTargetKey,
        mainGroupKey
      );

      project.addFramework('FamilyControls.framework', { target: appTargetKey });
      project.addFramework('ManagedSettings.framework', { target: appTargetKey });

      // --- Add dependencies + conditionally embed for device builds only ---
      addExtensionDependency(project, appTargetKey, shieldConfigTargetKey, SHIELD_CONFIG_TARGET_NAME);
      addExtensionDependency(project, appTargetKey, shieldActionTargetKey, SHIELD_ACTION_TARGET_NAME);
      addConditionalEmbedScript(project, appTargetKey, [
        SHIELD_CONFIG_TARGET_NAME,
        SHIELD_ACTION_TARGET_NAME,
      ]);
    }

    return config;
  });

  return config;
}

module.exports = withFocusLock;
