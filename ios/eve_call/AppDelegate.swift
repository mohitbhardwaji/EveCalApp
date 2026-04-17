import UIKit
import FirebaseCore
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if let plistPath = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
       let plist = NSDictionary(contentsOfFile: plistPath),
       let apiKey = plist["API_KEY"] as? String,
       isValidFirebaseAPIKey(apiKey) {
      FirebaseApp.configure()
    } else {
      print("[Firebase] Skipping FirebaseApp.configure(): missing or invalid GoogleService-Info.plist")
    }

    application.registerForRemoteNotifications()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "eve_call",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  private func isValidFirebaseAPIKey(_ apiKey: String) -> Bool {
    // Firebase iOS API keys are expected to start with "A" and be 39 chars.
    if apiKey.count != 39 { return false }
    if !apiKey.hasPrefix("A") { return false }
    if apiKey.contains("REPLACE_WITH_") { return false }
    return true
  }

  // Forward custom-scheme deep links (e.g. evecal://auth-callback?code=...)
  // so React Native Linking can emit them to JS.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  // Forward universal links as well (useful if you later switch to https callbacks).
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
