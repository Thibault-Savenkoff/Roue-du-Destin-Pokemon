import UIKit
import WebKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ViewController()
        window?.makeKeyAndVisible()
    }
}

class ViewController: UIViewController, WKScriptMessageHandler {

    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "haptic")
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.scrollView.bounces = false
        view.addSubview(webView)

        // Injecte data.json comme variable globale (fetch bloqué en file://)
        if let dataUrl = Bundle.main.url(forResource: "data", withExtension: "json", subdirectory: "public"),
           let dataStr = try? String(contentsOf: dataUrl, encoding: .utf8) {
            let inject = WKUserScript(
                source: "window.__NATIVE_DATA__ = \(dataStr);",
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
            config.userContentController.addUserScript(inject)
        }

        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "public") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "haptic", let preset = message.body as? String else { return }
        switch preset {
        case "heavy":     UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case "light":     UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case "selection": UISelectionFeedbackGenerator().selectionChanged()
        case "success":   UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "warning":   UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case "error":     UINotificationFeedbackGenerator().notificationOccurred(.error)
        default:          UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        }
    }
}
