import SwiftUI

// Mirrors the web app's CSS custom properties (frontend/src/index.css):
// a dark-first athletic theme. Numbers/headings use Barlow Condensed; body
// copy uses Inter. --accent is orange.
extension Color {
    init(hex: UInt) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: 1
        )
    }
}

enum Theme {
    static let bg = Color(hex: 0x0c0c0f)
    static let bgSidebar = Color(hex: 0x0f0f13)
    static let bgCard = Color(hex: 0x161620)
    static let bgCardRaised = Color(hex: 0x1c1c28)
    static let bgInput = Color(hex: 0x1e1e2c)
    static let border = Color(hex: 0x2a2a3a)
    static let borderSubtle = Color(hex: 0x1e1e2c)
    static let textMuted = Color(hex: 0x52526a)
    static let text = Color(hex: 0x8888a8)
    static let textH = Color(hex: 0xf0f0f8)
    static let accent = Color(hex: 0x84cc16)
    static let accentDim = Color(hex: 0x84cc16).opacity(0.12)
    static let accentBorder = Color(hex: 0x84cc16).opacity(0.30)
    static let green = Color(hex: 0x4ade80)
    static let red = Color(hex: 0xf87171)
    static let amber = Color(hex: 0xfbbf24)
    static let cyan = Color(hex: 0x22d3ee)

    static let radius: CGFloat = 10
    static let radiusLg: CGFloat = 14
}

extension Font {
    /// Barlow Condensed — used for big numbers and headings (--font-head).
    static func head(_ size: CGFloat, _ weight: Font.Weight = .heavy) -> Font {
        let name: String
        switch weight {
        case .black, .heavy: name = "BarlowCondensed-ExtraBold"
        case .bold, .semibold: name = "BarlowCondensed-Bold"
        default: name = "BarlowCondensed-SemiBold"
        }
        return .custom(name, size: size)
    }

    /// Inter — body copy (--font-body).
    static func ui(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .custom("Inter", size: size).weight(weight)
    }
}
