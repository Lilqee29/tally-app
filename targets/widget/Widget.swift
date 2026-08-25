import WidgetKit
import SwiftUI
import Security

// ─────────────────────────────────────────────
// MARK: - Shared data structures
// ─────────────────────────────────────────────

let APP_GROUP = "group.com.qomex.tally"
let WIDGET_DATA_KEY = "tally_widget_data"

struct TallyQuestion: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let dotColor: String
}

struct TallyAnswer: Codable {
    let questionId: String
    let date: String
    let value: String   // "yes" | "no"
    let answeredAt: String
}

struct WidgetPayload: Codable {
    let questions: [TallyQuestion]
    let todayAnswers: [TallyAnswer]
    let weekHistory: [String: [String: String]]  // questionId → date → "yes"|"no"
    let appearance: String?                      // "auto" | "light" | "dark"
    let coloredText: Bool?
    let updatedAt: String
}

// ─────────────────────────────────────────────
// MARK: - Keychain Helper
// ─────────────────────────────────────────────

struct KeychainHelper {
    static let key = "tally_widget_data"
    static let service = "app"

    static func load() -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: service,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecSuccess, let data = item as? Data {
            return data
        }
        return nil
    }
}

// ─────────────────────────────────────────────
// MARK: - Timeline Entry
// ─────────────────────────────────────────────

struct TallyEntry: TimelineEntry {
    let date: Date
    let questions: [TallyQuestion]
    let todayAnswers: [TallyAnswer]
    let weekHistory: [String: [String: String]]
    let appearance: String
    let coloredText: Bool
}

enum DotState {
    case yes, no, unanswered
}

// ─────────────────────────────────────────────
// MARK: - Timeline Provider (StaticConfiguration)
// ─────────────────────────────────────────────

struct TallyProvider: TimelineProvider {
    typealias Entry = TallyEntry

    func placeholder(in context: Context) -> TallyEntry {
        TallyEntry(
            date: Date(),
            questions: [
                TallyQuestion(id: "1", title: "Exercise daily", dotColor: "#0A84FF"),
                TallyQuestion(id: "2", title: "Read 20 mins", dotColor: "#30D158")
            ],
            todayAnswers: [],
            weekHistory: [:],
            appearance: "auto",
            coloredText: true
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (TallyEntry) -> Void) {
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TallyEntry>) -> Void) {
        let entry = makeEntry()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func makeEntry() -> TallyEntry {
        guard let payload = loadPayload() else {
            return TallyEntry(
                date: Date(),
                questions: [],
                todayAnswers: [],
                weekHistory: [:],
                appearance: "auto",
                coloredText: true
            )
        }
        return TallyEntry(
            date: Date(),
            questions: payload.questions,
            todayAnswers: payload.todayAnswers,
            weekHistory: payload.weekHistory,
            appearance: payload.appearance ?? "auto",
            coloredText: payload.coloredText ?? true
        )
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget Views
// ─────────────────────────────────────────────

struct TallyWidgetView: View {
    var entry: TallyEntry
    @Environment(\.colorScheme) var systemColorScheme

    var isDark: Bool {
        switch entry.appearance {
        case "light": return false
        case "dark": return true
        default: return systemColorScheme == .dark
        }
    }

    var bgColor: Color {
        isDark ? Color(hex: "#1C1C1E") : Color(hex: "#FFFFFF")
    }

    var textColor: Color {
        isDark ? Color(hex: "#FFFFFF") : Color(hex: "#000000")
    }

    var subtextColor: Color {
        isDark ? Color(hex: "#8E8E93") : Color(hex: "#636366")
    }

    var body: some View {
        if !entry.questions.isEmpty {
            ZStack {
                bgColor
                VStack(alignment: .leading, spacing: 8) {
                    // Show up to 3 tasks
                    ForEach(Array(entry.questions.prefix(3))) { q in
                        taskRow(question: q)
                    }
                }
                .padding(14)
            }
        } else {
            ZStack {
                bgColor
                VStack(spacing: 6) {
                    Text("Tally")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(textColor)
                    Text("Open app to view your tasks")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(subtextColor)
                        .multilineTextAlignment(.center)
                }
                .padding(16)
            }
        }
    }

    @ViewBuilder
    private func taskRow(question: TallyQuestion) -> some View {
        let today = isoToday()
        let ans = entry.todayAnswers.first { $0.questionId == question.id && $0.date == today }
        let isDone = ans?.value == "yes"
        let isMissed = ans?.value == "no"
        let dots = buildWeekDots(questionId: question.id, weekHistory: entry.weekHistory)

        HStack(alignment: .center, spacing: 8) {
            // Check indicator
            Circle()
                .fill(isDone ? Color(hex: "#30D158") : (isMissed ? Color(hex: "#FF3B30") : Color.gray.opacity(0.3)))
                .frame(width: 14, height: 14)
                .overlay(
                    Group {
                        if isDone {
                            Image(systemName: "checkmark")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(.white)
                        } else if isMissed {
                            Image(systemName: "xmark")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                )

            // Task title
            Text(question.title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(textColor)
                .lineLimit(1)

            Spacer()

            // Weekly mini heatmap dots
            DotRowView(dots: dots, dotColor: Color(hex: question.dotColor), isDark: isDark)
        }
    }
}

struct DotRowView: View {
    let dots: [DotState]
    let dotColor: Color
    let isDark: Bool

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<dots.count, id: \.self) { i in
                Circle()
                    .fill(dotFill(dots[i]))
                    .frame(width: 5, height: 5)
            }
        }
    }

    private func dotFill(_ state: DotState) -> Color {
        switch state {
        case .yes: return dotColor
        case .no: return isDark ? Color(hex: "#2C2C2E") : Color(hex: "#E5E5EA")
        case .unanswered: return isDark ? Color(hex: "#2C2C2E").opacity(0.5) : Color(hex: "#E5E5EA").opacity(0.6)
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget Declaration (StaticConfiguration)
// ─────────────────────────────────────────────

@main
struct TallyWidget: Widget {
    let kind: String = "TallyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TallyProvider()) { entry in
            TallyWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    if entry.appearance == "light" {
                        Color(hex: "#FFFFFF")
                    } else if entry.appearance == "dark" {
                        Color(hex: "#1C1C1E")
                    } else {
                        Color(hex: "#1C1C1E")
                    }
                }
        }
        .configurationDisplayName("Tally Tasks")
        .description("View your daily habits and streak heatmaps.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// ─────────────────────────────────────────────
// MARK: - Data Loaders
// ─────────────────────────────────────────────

func loadPayload() -> WidgetPayload? {
    // 1. Try Shared Keychain first (Free Apple ID compatible)
    if let data = KeychainHelper.load(),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    // 2. Try App Group (if provisioned)
    if let suite = UserDefaults(suiteName: APP_GROUP),
       let jsonStr = suite.string(forKey: WIDGET_DATA_KEY),
       let data = jsonStr.data(using: .utf8),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    // 3. Try Standard UserDefaults fallback
    if let jsonStr = UserDefaults.standard.string(forKey: WIDGET_DATA_KEY),
       let data = jsonStr.data(using: .utf8),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    return nil
}

func isoToday() -> String {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: Date())
}

func buildWeekDots(questionId: String, weekHistory: [String: [String: String]]) -> [DotState] {
    let history = weekHistory[questionId] ?? [:]
    return (0..<7).map { offset in
        let d = Calendar.current.date(byAdding: .day, value: -(6 - offset), to: Date())!
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        let key = f.string(from: d)
        switch history[key] {
        case "yes": return .yes
        case "no": return .no
        default: return .unanswered
        }
    }
}

// MARK: - Color extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
