import SwiftUI

struct RootTabView: View {
    @State private var selection = 0
    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label("Home", systemImage: "chart.bar.fill") }
                .tag(0)

            LogView()
                .tabItem { Label("Log", systemImage: "plus.circle.fill") }
                .tag(1)

            HistoryView()
                .tabItem { Label("History", systemImage: "clock.fill") }
                .tag(2)
        }
    }
}
