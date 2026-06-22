import UIKit
import WebKit

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

        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "public") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "haptic", let preset = message.body as? String else { return }
        switch preset {
        case "heavy":   UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case "light":   UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case "selection": UISelectionFeedbackGenerator().selectionChanged()
        case "success": UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "warning": UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case "error":   UINotificationFeedbackGenerator().notificationOccurred(.error)
        default:        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        }
    }
}
