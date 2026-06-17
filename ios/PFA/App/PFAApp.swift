import SwiftUI
import UIKit

@main
struct PFAApp: App {
    private let client: APIClient
    @StateObject private var appState: AppState

    init() {
        let client = APIClient()
        self.client = client
        _appState = StateObject(wrappedValue: AppState(client: client))
        Appearance.apply()
    }

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .tint(Theme.accent)
                .preferredColorScheme(.dark)
                .environment(\.apiClient, client)
                .environmentObject(appState)
                .task { await appState.loadSettings() }
        }
    }
}

/// Styles UIKit-backed chrome (nav bar, tab bar) to match the web theme:
/// near-black surfaces and Barlow Condensed titles.
enum Appearance {
    static func apply() {
        let bg = UIColor(Theme.bg)
        let textH = UIColor(Theme.textH)

        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = bg
        nav.shadowColor = UIColor(Theme.borderSubtle)
        if let large = UIFont(name: "BarlowCondensed-ExtraBold", size: 34) {
            nav.largeTitleTextAttributes = [.foregroundColor: textH, .font: large]
        }
        if let inline = UIFont(name: "BarlowCondensed-Bold", size: 20) {
            nav.titleTextAttributes = [.foregroundColor: textH, .font: inline]
        }
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav

        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = UIColor(Theme.bgSidebar)
        tab.shadowColor = UIColor(Theme.border)
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab
    }
}
