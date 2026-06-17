import SwiftUI

// Shared UI primitives mirroring frontend/src/components/ui.tsx.

/// Card surface: bg-card fill, 1px border, large radius. Matches `<Card>`.
struct CardModifier: ViewModifier {
    var padding: CGFloat = 20
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Theme.bgCard)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radiusLg)
                    .strokeBorder(Theme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusLg))
    }
}

extension View {
    func card(padding: CGFloat = 20) -> some View {
        modifier(CardModifier(padding: padding))
    }
}

/// Uppercase, letter-spaced, muted micro-label. Matches `<CardHeader>` label.
struct SectionLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.ui(11, .bold))
            .tracking(1.0)
            .foregroundStyle(Theme.textMuted)
            .lineLimit(1)
    }
}

enum PillVariant {
    case neutral, increase, hold, deload, pr, warmup, e1rm

    var fg: Color {
        switch self {
        case .neutral: return Theme.text
        case .increase: return Theme.green
        case .hold, .warmup: return Theme.amber
        case .deload: return Theme.red
        case .pr: return Theme.accent
        case .e1rm: return Theme.cyan
        }
    }
    var border: Color {
        switch self {
        case .neutral: return Theme.border
        case .pr: return Theme.accentBorder
        default: return fg.opacity(0.35)
        }
    }
    var bg: Color {
        switch self {
        case .neutral: return .clear
        case .pr: return Theme.accentDim
        default: return fg.opacity(0.08)
        }
    }
}

/// Rounded status chip. Matches `<Pill>`.
struct Pill: View {
    let text: String
    var variant: PillVariant = .neutral
    var body: some View {
        Text(text)
            .font(.ui(11, .semibold))
            .tracking(0.3)
            .foregroundStyle(variant.fg)
            .lineLimit(1)
            .fixedSize()
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(variant.bg, in: Capsule())
            .overlay(Capsule().strokeBorder(variant.border, lineWidth: 1))
    }
}

/// "✦ AI" cyan badge. Matches `<AIBadge>`.
struct AIBadge: View {
    var body: some View {
        Text("✦ AI")
            .font(.ui(11, .semibold))
            .tracking(0.3)
            .foregroundStyle(Theme.cyan)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(Theme.cyan.opacity(0.08), in: Capsule())
            .overlay(Capsule().strokeBorder(Theme.cyan.opacity(0.2), lineWidth: 1))
    }
}

/// Inline error text in the app's red.
struct ErrorBanner: View {
    let message: String
    var body: some View {
        Text(message)
            .font(.ui(14))
            .foregroundStyle(Theme.red)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Solid accent button (orange fill), fading when disabled.
struct AccentButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(Color.black)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Theme.accent, in: RoundedRectangle(cornerRadius: Theme.radius))
            .opacity(isEnabled ? (configuration.isPressed ? 0.8 : 1) : 0.4)
    }
}

/// Minimal line sparkline normalized to its own min/max. Matches the web Sparkline.
struct Sparkline: View {
    let values: [Double]
    var color: Color = Theme.cyan

    var body: some View {
        GeometryReader { geo in
            let pts = points(in: geo.size)
            if pts.count > 1 {
                Path { p in
                    p.move(to: pts[0])
                    for pt in pts.dropFirst() { p.addLine(to: pt) }
                }
                .stroke(color, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
            }
        }
    }

    private func points(in size: CGSize) -> [CGPoint] {
        guard values.count > 1 else { return [] }
        let lo = values.min() ?? 0
        let hi = values.max() ?? 1
        let span = hi - lo
        let dx = size.width / CGFloat(values.count - 1)
        return values.enumerated().map { i, v in
            let norm = span > 0 ? (v - lo) / span : 0.5
            // Inset vertically so the line never clips at the edges.
            let y = size.height - (CGFloat(norm) * (size.height - 4) + 2)
            return CGPoint(x: CGFloat(i) * dx, y: y)
        }
    }
}

/// Labeled text field styled like the web's dark inputs.
struct FieldRow: View {
    let label: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default

    var body: some View {
        HStack {
            Text(label)
                .font(.ui(14))
                .foregroundStyle(Theme.text)
            Spacer()
            TextField("", text: $text)
                .keyboardType(keyboard)
                .multilineTextAlignment(.trailing)
                .font(.head(20, .bold))
                .foregroundStyle(Theme.textH)
                .frame(width: 110)
        }
        .padding(12)
        .background(Theme.bgInput, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.border, lineWidth: 1))
    }
}
