// swift-tools-version: 5.9
import PackageDescription

// Capacitor dependencies removed — using plain WKWebView instead
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "CapApp-SPM", targets: ["CapApp-SPM"])
    ],
    targets: [
        .target(name: "CapApp-SPM")
    ]
)
