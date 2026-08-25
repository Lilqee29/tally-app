import WidgetKit
import SwiftUI
import Security

// ─────────────────────────────────────────────
// MARK: - Shared Data Structures
// ─────────────────────────────────────────────

let APP_GROUP = "group.com.qomex.tally"
let WIDGET_DATA_KEY = "tally_widget_data"
let SHARED_PASTEBOARD_NAME = "com.qomex.tally.shared.pasteboard"

struct TallyQuestion: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let dotColor: String?

    var safeColor: String {
        dotColor ?? "#0A84FF"
    }
}

struct TallyAnswer: Codable {
    let questionId: String
    let date: String?
    let value: String?   // "yes" | "no"
    let answeredAt: String?
}

struct WidgetPayload: Codable {
    let questions: [TallyQuestion]?
    let todayAnswers: [TallyAnswer]?
    let weekHistory: [String: [String: String]]?
    let appearance: String?
    let coloredText: Bool?
    let updatedAt: String?
}

// ─────────────────────────────────────────────
// MARK: - Keychain Helper (Shared Keychain)
// ─────────────────────────────────────────────

struct KeychainHelper {
    static let key = "tally_widget_data"
    static let possibleGroups = [
        "7622586DZY.com.qomex.tally.shared",
        "com.qomex.tally.shared"
    ]

    // DEBUG: last status codes seen, so we can render them in the widget UI
    static var debugLog: [String] = []

    static func load() -> Data? {
        debugLog = []

        // 1. Try known Access Groups with service="app"
        for group in possibleGroups {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: key,
                kSecAttrService as String: "app",
                kSecAttrAccessGroup as String: group,
                kSecReturnData as String: true,
                kSecMatchLimit as String: kSecMatchLimitOne
            ]
            var item: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &item)
            debugLog.append("group=\(group) status=\(status)")
            if status == errSecSuccess, let data = item as? Data {
                return data
            }
        }

        // 2. Try default generic query
        let defaultQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item2: CFTypeRef?
        let status2 = SecItemCopyMatching(defaultQuery as CFDictionary, &item2)
        debugLog.append("default status=\(status2)")
        if status2 == errSecSuccess, let data = item2 as? Data {
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
}

enum DotState {
    case yes, no, unanswered
}

// ─────────────────────────────────────────────
// MARK: - Data Loader (Multi-Channel)
// ─────────────────────────────────────────────

func loadPayloadFromSuite(_ suite: UserDefaults) -> WidgetPayload? {
    // 1. Read as Dictionary (native NSDictionary written by react-native-shared-group-preferences)
    if let dict = suite.dictionary(forKey: WIDGET_DATA_KEY),
       let data = try? JSONSerialization.data(withJSONObject: dict),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    // 2. Read as JSON String (from tally_widget_data or tally_widget_data_str)
    for key in [WIDGET_DATA_KEY, "tally_widget_data_str"] {
        if let jsonStr = suite.string(forKey: key),
           let data = jsonStr.data(using: .utf8),
           let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
            return payload
        }
    }

    // 3. Read as raw Data
    if let data = suite.data(forKey: WIDGET_DATA_KEY),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    return nil
}

func loadPayload() -> WidgetPayload? {
    // 0. Read from named Pasteboard — shared purely by Team ID, no
    // entitlement required.
    if let pb = UIPasteboard(name: UIPasteboard.Name(SHARED_PASTEBOARD_NAME), create: false),
       let jsonStr = pb.string,
       let data = jsonStr.data(using: .utf8),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    // 1. Read from shared Keychain
    if let data = KeychainHelper.load(),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    // 2. Read from shared App Group File container
    if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: APP_GROUP) {
        let fileURL = containerURL.appendingPathComponent("tally_widget_data.json")
        if let data = try? Data(contentsOf: fileURL),
           let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
            return payload
        }
    }

    // 3. Read from shared App Group UserDefaults
    if let suite = UserDefaults(suiteName: APP_GROUP),
       let payload = loadPayloadFromSuite(suite) {
        return payload
    }

    // 4. Fallback: Standard UserDefaults
    return loadPayloadFromSuite(UserDefaults.standard)
}

func makeEntry() -> TallyEntry {
    if let payload = loadPayload(), let questions = payload.questions, !questions.isEmpty {
        return TallyEntry(
            date: Date(),
            questions: questions,
            todayAnswers: payload.todayAnswers ?? [],
            weekHistory: payload.weekHistory ?? [:]
        )
    }
    return TallyEntry(
        date: Date(),
        questions: [],
        todayAnswers: [],
        weekHistory: [:]
    )
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
                TallyQuestion(id: "1", title: "Did I go for a run?", dotColor: "#0A84FF"),
                TallyQuestion(id: "2", title: "Did I lock the door?", dotColor: "#FFD60A"),
                TallyQuestion(id: "3", title: "Did I water the plants?", dotColor: "#30D158")
            ],
            todayAnswers: [
                TallyAnswer(questionId: "1", date: todayString(), value: "no", answeredAt: "2026-08-25T18:07:00Z"),
                TallyAnswer(questionId: "2", date: todayString(), value: "yes", answeredAt: "2026-08-25T18:07:00Z"),
                TallyAnswer(questionId: "3", date: todayString(), value: "yes", answeredAt: "2026-08-25T18:07:00Z")
            ],
            weekHistory: [:]
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (TallyEntry) -> Void) {
        if context.isPreview && loadPayload() == nil {
            completion(placeholder(in: context))
        } else {
            completion(makeEntry())
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TallyEntry>) -> Void) {
        let entry = makeEntry()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// ─────────────────────────────────────────────
// MARK: - Formatters & Utilities
// ─────────────────────────────────────────────

func todayString() -> String {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: Date())
}

func formatTimestamp(_ isoString: String) -> String {
    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    var d = iso.date(from: isoString)
    if d == nil {
        iso.formatOptions = [.withInternetDateTime]
        d = iso.date(from: isoString)
    }
    guard let date = d else { return "" }
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

extension Color {
    init(hex: String) {
        let clean = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: clean).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch clean.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 128, 128, 128)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// ─────────────────────────────────────────────
// MARK: - Empty State View (img4)
// ─────────────────────────────────────────────

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "hand.tap.fill")
                .font(.system(size: 28))
                .foregroundColor(Color(hex: "#8E8E93"))
            
            Text("Open Tally to add tasks.")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(hex: "#8E8E93"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)

            // TEMP DEBUG — remove once this is working
            let pbValue = UIPasteboard(name: UIPasteboard.Name(SHARED_PASTEBOARD_NAME), create: false)?.string ?? "nil"
            let debugLines = ["pasteboard=" + pbValue] + KeychainHelper.debugLog
            Text(debugLines.joined(separator: "\n"))
                .font(.system(size: 8))
                .foregroundColor(.red)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 4)
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Single Task Widget View (img1 & img5)
// ─────────────────────────────────────────────

struct SingleTaskWidgetView: View {
    let entry: TallyEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if entry.questions.isEmpty {
            EmptyStateView()
        } else {
            let question = entry.questions.first!
            let todayStr = todayString()
            let ans = entry.todayAnswers.first { $0.questionId == question.id && $0.date == todayStr }
            let isYes = ans?.value == "yes"
            let isNo = ans?.value == "no"

            if family == .systemSmall {
                // Small square single task widget (img5)
                VStack(alignment: .leading, spacing: 6) {
                    Text(question.title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)
                    
                    Spacer()
                    
                    if isYes {
                        Text("YES")
                            .font(.system(size: 36, weight: .heavy, design: .rounded))
                            .foregroundColor(Color(hex: "#0A84FF"))
                    } else if isNo {
                        Text("NO")
                            .font(.system(size: 36, weight: .heavy, design: .rounded))
                            .foregroundColor(Color(hex: "#FF3B30"))
                    } else {
                        Text("NO")
                            .font(.system(size: 36, weight: .heavy, design: .rounded))
                            .foregroundColor(Color(hex: "#FF3B30").opacity(0.85))
                    }
                }
                .padding(4)
                .widgetURL(URL(string: "tally://toggle/\(question.id)"))
            } else {
                // Medium single task widget (image1.jpg)
                HStack(alignment: .center) {
                    Text(question.title)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(2)
                    
                    Spacer()
                    
                    if isYes {
                        Text("YES")
                            .font(.system(size: 42, weight: .heavy, design: .rounded))
                            .foregroundColor(Color(hex: "#0A84FF"))
                    } else if isNo {
                        Text("NO")
                            .font(.system(size: 42, weight: .heavy, design: .rounded))
                            .foregroundColor(Color(hex: "#FF3B30"))
                    } else {
                        Text("NO")
                            .font(.system(size: 42, weight: .heavy, design: .rounded))
                            .foregroundColor(Color(hex: "#FF3B30").opacity(0.85))
                    }
                }
                .padding(.horizontal, 12)
                .widgetURL(URL(string: "tally://toggle/\(question.id)"))
            }
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Multi-Task Widget View (img6)
// ─────────────────────────────────────────────

struct MultiTaskWidgetView: View {
    let entry: TallyEntry

    var body: some View {
        if entry.questions.isEmpty {
            EmptyStateView()
        } else {
            let displayedQuestions = Array(entry.questions.prefix(3))
            let todayStr = todayString()

            VStack(alignment: .leading, spacing: 10) {
                ForEach(displayedQuestions) { question in
                    let ans = entry.todayAnswers.first { $0.questionId == question.id && $0.date == todayStr }
                    let isYes = ans?.value == "yes"
                    let isNo = ans?.value == "no"

                    Link(destination: URL(string: "tally://toggle/\(question.id)")!) {
                        HStack(alignment: .center, spacing: 8) {
                            // Title + timestamp subtitle
                            VStack(alignment: .leading, spacing: 2) {
                                Text(question.title)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                                
                                if let answeredAt = ans?.answeredAt, isYes {
                                    HStack(spacing: 3) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .font(.system(size: 9))
                                        Text(formatTimestamp(answeredAt))
                                            .font(.system(size: 11))
                                    }
                                    .foregroundColor(Color(hex: "#8E8E93"))
                                }
                            }

                            Spacer()

                            // Color Dot indicator
                            Circle()
                                .fill(Color(hex: question.safeColor))
                                .frame(width: 10, height: 10)

                            // YES / NO state badge
                            if isYes {
                                Text("YES")
                                    .font(.system(size: 20, weight: .heavy, design: .rounded))
                                    .foregroundColor(Color(hex: "#0A84FF"))
                                    .frame(width: 48, alignment: .trailing)
                            } else if isNo {
                                Text("NO")
                                    .font(.system(size: 20, weight: .heavy, design: .rounded))
                                    .foregroundColor(Color(hex: "#FF3B30"))
                                    .frame(width: 48, alignment: .trailing)
                            } else {
                                Text("NO")
                                    .font(.system(size: 20, weight: .heavy, design: .rounded))
                                    .foregroundColor(Color(hex: "#FF3B30").opacity(0.85))
                                    .frame(width: 48, alignment: .trailing)
                            }
                        }
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget Definitions (StaticConfiguration)
// ─────────────────────────────────────────────

struct SingleTaskWidget: Widget {
    let kind: String = "SingleTaskWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: TallyProvider()
        ) { entry in
            SingleTaskWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color(hex: "#1C1C1E")
                }
        }
        .configurationDisplayName("Task")
        .description("Tracks one task")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct MultiTasksWidget: Widget {
    let kind: String = "MultiTasksWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: TallyProvider()
        ) { entry in
            MultiTaskWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color(hex: "#1C1C1E")
                }
        }
        .configurationDisplayName("Tasks")
        .description("Tracks up to 3 tasks")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget Bundle
// ─────────────────────────────────────────────

@main
struct TallyWidgetBundle: WidgetBundle {
    var body: some Widget {
        SingleTaskWidget()
        MultiTasksWidget()
    }
}