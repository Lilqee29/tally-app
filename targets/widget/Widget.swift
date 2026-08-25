import WidgetKit
import SwiftUI
import AppIntents

// ─────────────────────────────────────────────
// MARK: - Shared data structures
// ─────────────────────────────────────────────

let APP_GROUP = "group.com.qomex.tally"
let WIDGET_DATA_KEY = "tally_widget_data"

struct TallyQuestion: Codable, Identifiable, Hashable, AppEntity {
    let id: String
    let title: String
    let dotColor: String

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Task")
    static var defaultQuery = TallyQuestionQuery()
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }
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
    let updatedAt: String
}

// ─────────────────────────────────────────────
// MARK: - App Entity Query (for widget config)
// ─────────────────────────────────────────────

struct TallyQuestionQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [TallyQuestion] {
        loadPayload()?.questions.filter { identifiers.contains($0.id) } ?? []
    }
    func suggestedEntities() async throws -> [TallyQuestion] {
        loadPayload()?.questions ?? []
    }
    func defaultResult() async -> TallyQuestion? {
        loadPayload()?.questions.first
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget Configuration Intent
// ─────────────────────────────────────────────

struct TallyWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Tasks"
    static var description = IntentDescription("Tracks up to 3 tasks.")

    @Parameter(title: "First Task")
    var firstTask: TallyQuestion?

    @Parameter(title: "Second Task")
    var secondTask: TallyQuestion?

    @Parameter(title: "Third Task")
    var thirdTask: TallyQuestion?

    @Parameter(title: "Show Week History", default: true)
    var showWeekHistory: Bool

    init() {}
}

// ─────────────────────────────────────────────
// MARK: - App Intent (tap YES / NO on widget)
// ─────────────────────────────────────────────

struct MarkAnswerIntent: AppIntent {
    static var title: LocalizedStringResource = "Mark Answer"
    static var isDiscoverable: Bool = false

    @Parameter(title: "Question ID")
    var questionId: String

    @Parameter(title: "Value")
    var value: String  // "yes" | "no"

    init() {}

    init(questionId: String, value: String) {
        self.questionId = questionId
        self.value = value
    }

    func perform() async throws -> some IntentResult {
        guard var payload = loadPayload() else { return .result() }

        let today = isoToday()
        var newAnswers = payload.todayAnswers.filter { $0.questionId != questionId }
        newAnswers.append(TallyAnswer(
            questionId: questionId,
            date: today,
            value: value,
            answeredAt: ISO8601DateFormatter().string(from: Date())
        ))

        let updated = WidgetPayload(
            questions: payload.questions,
            todayAnswers: newAnswers,
            weekHistory: payload.weekHistory,
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )
        savePayload(updated)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// ─────────────────────────────────────────────
// MARK: - Timeline Entry
// ─────────────────────────────────────────────

struct TallyEntry: TimelineEntry {
    let date: Date
    let question: TallyQuestion?
    let todayAnswer: TallyAnswer?
    let weekDots: [DotState]
    let showWeekHistory: Bool
}

enum DotState {
    case yes, no, unanswered
}

// ─────────────────────────────────────────────
// MARK: - Provider
// ─────────────────────────────────────────────

struct TallyProvider: AppIntentTimelineProvider {
    typealias Entry = TallyEntry
    typealias Intent = TallyWidgetIntent

    func placeholder(in context: Context) -> TallyEntry {
        TallyEntry(date: Date(), question: nil, todayAnswer: nil, weekDots: Array(repeating: .unanswered, count: 7), showWeekHistory: true)
    }

    func snapshot(for configuration: TallyWidgetIntent, in context: Context) async -> TallyEntry {
        makeEntry(for: configuration.firstTask, configuration: configuration)
    }

    func timeline(for configuration: TallyWidgetIntent, in context: Context) async -> Timeline<TallyEntry> {
        let entry = makeEntry(for: configuration.firstTask, configuration: configuration)
        let nextDay = Calendar.current.startOfDay(for: Date().addingTimeInterval(86400))
        return Timeline(entries: [entry], policy: .after(nextDay))
    }

    private func makeEntry(for question: TallyQuestion?, configuration: TallyWidgetIntent) -> TallyEntry {
        guard let q = question, let payload = loadPayload() else {
            return TallyEntry(date: Date(), question: nil, todayAnswer: nil, weekDots: Array(repeating: .unanswered, count: 7), showWeekHistory: configuration.showWeekHistory)
        }
        let today = isoToday()
        let todayAnswer = payload.todayAnswers.first { $0.questionId == q.id && $0.date == today }
        let weekDots = buildWeekDots(questionId: q.id, weekHistory: payload.weekHistory)
        return TallyEntry(date: Date(), question: q, todayAnswer: todayAnswer, weekDots: weekDots, showWeekHistory: configuration.showWeekHistory)
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget Views
// ─────────────────────────────────────────────

struct TallyWidgetView: View {
    var entry: TallyEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if let q = entry.question {
            ZStack {
                Color(hex: "#1C1C1E")
                HStack(alignment: .center, spacing: 0) {
                    // Left: title + timestamp
                    VStack(alignment: .leading, spacing: 4) {
                        Text(q.title)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(3)
                        if let ans = entry.todayAnswer {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark.circle")
                                    .font(.system(size: 11))
                                    .foregroundColor(Color(hex: "#8E8E93"))
                                Text(formatTimestamp(ans.answeredAt))
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(hex: "#8E8E93"))
                            }
                        }
                        if entry.showWeekHistory {
                            Spacer(minLength: 6)
                            DotRowView(dots: entry.weekDots, dotColor: Color(hex: q.dotColor))
                        }
                    }
                    Spacer()
                    // Right: YES / NO / ?
                    answerView(for: entry.todayAnswer, questionId: q.id)
                }
                .padding(16)
            }
        } else {
            ZStack {
                Color(hex: "#1C1C1E")
                Text("Tap to configure")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(hex: "#8E8E93"))
            }
        }
    }

    @ViewBuilder
    private func answerView(for answer: TallyAnswer?, questionId: String) -> some View {
        VStack(spacing: 8) {
            if let ans = answer {
                let isYes = ans.value == "yes"
                Button(intent: MarkAnswerIntent(questionId: questionId, value: isYes ? "no" : "yes")) {
                    Text(isYes ? "YES" : "NO")
                        .font(.system(size: 38, weight: .black))
                        .foregroundColor(isYes ? Color(hex: "#0A84FF") : Color(hex: "#FF3B30"))
                }
                .buttonStyle(.plain)
            } else {
                Button(intent: MarkAnswerIntent(questionId: questionId, value: "yes")) {
                    Text("?")
                        .font(.system(size: 38, weight: .black))
                        .foregroundColor(Color(hex: "#48484A"))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct DotRowView: View {
    let dots: [DotState]
    let dotColor: Color

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<dots.count, id: \.self) { i in
                Circle()
                    .fill(dotFill(dots[i]))
                    .frame(width: 7, height: 7)
            }
        }
    }

    private func dotFill(_ state: DotState) -> Color {
        switch state {
        case .yes: return dotColor
        case .no: return Color(hex: "#2C2C2E")
        case .unanswered: return Color(hex: "#2C2C2E").opacity(0.5)
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget Declaration
// ─────────────────────────────────────────────

@main
struct TallyWidget: Widget {
    let kind: String = "TallyWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: TallyWidgetIntent.self, provider: TallyProvider()) { entry in
            TallyWidgetView(entry: entry)
                .containerBackground(Color(hex: "#1C1C1E"), for: .widget)
        }
        .configurationDisplayName("Tasks")
        .description("Track your daily tasks at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// ─────────────────────────────────────────────
// MARK: - Helpers
// ─────────────────────────────────────────────

func loadPayload() -> WidgetPayload? {
    guard
        let suite = UserDefaults(suiteName: APP_GROUP),
        let jsonStr = suite.string(forKey: WIDGET_DATA_KEY),
        let data = jsonStr.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(WidgetPayload.self, from: data)
}

func savePayload(_ payload: WidgetPayload) {
    guard
        let suite = UserDefaults(suiteName: APP_GROUP),
        let data = try? JSONEncoder().encode(payload),
        let jsonStr = String(data: data, encoding: .utf8)
    else { return }
    suite.set(jsonStr, forKey: WIDGET_DATA_KEY)
}

func isoToday() -> String {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: Date())
}

func formatTimestamp(_ iso: String) -> String {
    let f = ISO8601DateFormatter()
    guard let date = f.date(from: iso) else { return "" }
    let out = DateFormatter()
    out.dateFormat = "EEE d, HH:mm"
    return out.string(from: date)
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
