import Foundation

/// Display helpers. The backend stores all weights in lbs and sends dates as
/// `YYYY-MM-DD` strings; formatting (including lbs↔kg conversion) lives here.
enum Format {
    private static let lbsPerKg = 2.2046226218

    /// Convert a backend lbs value to the user's chosen display unit.
    static func weightValue(_ lbs: Double, unit: String) -> Double {
        unit == "kg" ? lbs / lbsPerKg : lbs
    }

    /// Convert a user-entered display value back to lbs for the API.
    static func weightToLbs(_ value: Double, unit: String) -> Double {
        unit == "kg" ? value * lbsPerKg : value
    }

    /// "225 lbs", "102.1 kg" — trims trailing ".0".
    static func weight(_ lbs: Double, unit: String) -> String {
        let v = weightValue(lbs, unit: unit)
        return "\(trim(v)) \(unit)"
    }

    /// Compact volume, e.g. 12,400 -> "12.4K".
    static func tonnage(_ lbs: Double, unit: String) -> String {
        let v = weightValue(lbs, unit: unit)
        if v >= 1000 { return String(format: "%.1fK", v / 1000) }
        return "\(trim(v))"
    }

    static func trim(_ value: Double) -> String {
        if value == value.rounded() { return String(Int(value)) }
        return String(format: "%.1f", value)
    }

    // MARK: - Dates

    private static let isoDay: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .iso8601)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let prettyDay: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US")
        // Match the UTC parsing of isoDay so the calendar day never shifts.
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "EEE, MMM d"
        return f
    }()

    static func date(from apiString: String) -> Date? {
        isoDay.date(from: apiString)
    }

    static func apiString(from date: Date) -> String {
        isoDay.string(from: date)
    }

    /// "2026-06-14" -> "Sun, Jun 14".
    static func prettyDate(_ apiString: String) -> String {
        guard let d = date(from: apiString) else { return apiString }
        return prettyDay.string(from: d)
    }

    static func percent(_ value: Double) -> String {
        let sign = value > 0 ? "+" : ""
        return "\(sign)\(String(format: "%.0f", value))%"
    }
}
