import WidgetKit
import SwiftUI
import Security
import AppIntents
import Foundation

// ─────────────────────────────────────────────
// MARK: - Supabase Widget Configuration
// ─────────────────────────────────────────────

/// Values are read from the widget extension Info.plist so real values can be
/// supplied at build time without committing them to Swift source. The
/// anon/publishable key is not a true secret once shipped in a client binary;
/// production safety must come from proper Supabase RLS. Never put the
/// service-role key in the app or widget.
enum SupabaseWidgetConfig {
    private static let projectURLInfoKey = "SUPABASE_WIDGET_PROJECT_URL"
    private static let anonKeyInfoKey = "SUPABASE_WIDGET_ANON_KEY"

    static var projectURL: String {
        infoString(forKey: projectURLInfoKey)
    }

    static var anonPublishableKey: String {
        infoString(forKey: anonKeyInfoKey)
    }

    static var isConfigured: Bool {
        isUsable(projectURL) && isUsable(anonPublishableKey)
    }

    private static func infoString(forKey key: String) -> String {
        Bundle.main.object(forInfoDictionaryKey: key) as? String ?? ""
    }

    private static func isUsable(_ value: String) -> Bool {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && !trimmed.hasPrefix("$(")
    }
}

// ─────────────────────────────────────────────
// MARK: - Supabase Task Model
// ─────────────────────────────────────────────

struct SupabaseWidgetTask: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let displayOrder: Int
    let dotColor: String
    let todayValue: String?
    let answeredDate: String?
    let answeredAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case displayOrder = "display_order"
        case dotColor = "dot_color"
        case todayValue = "today_value"
        case answeredDate = "answered_date"
        case answeredAt = "answered_at"
    }
}

enum SupabaseWidgetError: Error {
    case missingConfiguration
    case invalidURL
    case invalidResponse
    case httpStatus(Int)
}

// ─────────────────────────────────────────────
// MARK: - Supabase Client
// ─────────────────────────────────────────────

struct SupabaseWidgetClient {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func fetchWidgetTasks() async throws -> [SupabaseWidgetTask] {
        guard SupabaseWidgetConfig.isConfigured else {
            throw SupabaseWidgetError.missingConfiguration
        }

        var components = URLComponents(
            string: SupabaseWidgetConfig.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/rest/v1/widget_tasks"
        )
        components?.queryItems = [
            URLQueryItem(name: "select", value: "id,title,display_order,dot_color,today_value,answered_date,answered_at"),
            URLQueryItem(name: "active", value: "eq.true"),
            URLQueryItem(name: "order", value: "display_order.asc"),
            URLQueryItem(name: "limit", value: "3")
        ]

        guard let url = components?.url else {
            throw SupabaseWidgetError.invalidURL
        }

        var request = URLRequest(url: url)
        addHeaders(to: &request)

        let (data, response) = try await session.data(for: request)
        try validate(response: response)

        return try JSONDecoder().decode([SupabaseWidgetTask].self, from: data)
    }

    func setAnsweredYes(id: String) async throws {
        guard SupabaseWidgetConfig.isConfigured else {
            throw SupabaseWidgetError.missingConfiguration
        }

        var components = URLComponents(
            string: SupabaseWidgetConfig.projectURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/rest/v1/widget_tasks"
        )
        components?.queryItems = [URLQueryItem(name: "id", value: "eq.\(id)")]

        guard let url = components?.url else {
            throw SupabaseWidgetError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        addHeaders(to: &request)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try JSONEncoder().encode([
            "today_value": "yes",
            "answered_date": todayString(),
            "answered_at": ISO8601DateFormatter().string(from: Date())
        ])

        let (_, response) = try await session.data(for: request)
        try validate(response: response)
    }

    private func addHeaders(to request: inout URLRequest) {
        request.setValue(SupabaseWidgetConfig.anonPublishableKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(SupabaseWidgetConfig.anonPublishableKey)", forHTTPHeaderField: "Authorization")
    }

    private func validate(response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else {
            throw SupabaseWidgetError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw SupabaseWidgetError.httpStatus(http.statusCode)
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Interactive Intent
// ─────────────────────────────────────────────

struct MarkTaskDoneIntent: AppIntent {
    static var title: LocalizedStringResource = "Mark Task Done"
    static var description = IntentDescription("Marks a Supabase-backed Tally task as done for today.")

    @Parameter(title: "Task ID")
    var id: String

    init() {}

    init(id: String) {
        self.id = id
    }

    func perform() async throws -> some IntentResult {
        try await SupabaseWidgetClient().setAnsweredYes(id: id)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// ─────────────────────────────────────────────
// MARK: - Local Fallback Data Structures
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

    static var debugLog: [String] = []

    static func load() -> Data? {
        debugLog = []

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
    let supabaseTasks: [SupabaseWidgetTask]
    let statusMessage: String?
}

enum DotState {
    case yes, no, unanswered
}

// ─────────────────────────────────────────────
// MARK: - Local Data Loader (Multi-Channel Fallback)
// ─────────────────────────────────────────────

func loadPayloadFromSuite(_ suite: UserDefaults) -> WidgetPayload? {
    if let dict = suite.dictionary(forKey: WIDGET_DATA_KEY),
       let data = try? JSONSerialization.data(withJSONObject: dict),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    for key in [WIDGET_DATA_KEY, "tally_widget_data_str"] {
        if let jsonStr = suite.string(forKey: key),
           let data = jsonStr.data(using: .utf8),
           let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
            return payload
        }
    }

    if let data = suite.data(forKey: WIDGET_DATA_KEY),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    return nil
}

func loadPayload() -> WidgetPayload? {
    if let pb = UIPasteboard(name: UIPasteboard.Name(SHARED_PASTEBOARD_NAME), create: false),
       let jsonStr = pb.string,
       let data = jsonStr.data(using: .utf8),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    if let data = KeychainHelper.load(),
       let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
        return payload
    }

    if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: APP_GROUP) {
        let fileURL = containerURL.appendingPathComponent("tally_widget_data.json")
        if let data = try? Data(contentsOf: fileURL),
           let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
            return payload
        }
    }

    if let suite = UserDefaults(suiteName: APP_GROUP),
       let payload = loadPayloadFromSuite(suite) {
        return payload
    }

    return loadPayloadFromSuite(UserDefaults.standard)
}

func makeLocalEntry() -> TallyEntry {
    if let payload = loadPayload(), let questions = payload.questions, !questions.isEmpty {
        return TallyEntry(
            date: Date(),
            questions: questions,
            todayAnswers: payload.todayAnswers ?? [],
            weekHistory: payload.weekHistory ?? [:],
            supabaseTasks: [],
            statusMessage: nil
        )
    }
    return TallyEntry(
        date: Date(),
        questions: [],
        todayAnswers: [],
        weekHistory: [:],
        supabaseTasks: [],
        statusMessage: nil
    )
}

func makeSupabaseEntry(tasks: [SupabaseWidgetTask], status: String?) -> TallyEntry {
    TallyEntry(
        date: Date(),
        questions: [],
        todayAnswers: [],
        weekHistory: [:],
        supabaseTasks: tasks,
        statusMessage: status
    )
}

// ─────────────────────────────────────────────
// MARK: - Timeline Provider
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
            weekHistory: [:],
            supabaseTasks: [],
            statusMessage: nil
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (TallyEntry) -> Void) {
        if context.isPreview && loadPayload() == nil {
            completion(placeholder(in: context))
        } else {
            Task {
                completion(await makeNetworkBackedEntry())
            }
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TallyEntry>) -> Void) {
        Task {
            let entry = await makeNetworkBackedEntry()
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }

    private func makeNetworkBackedEntry() async -> TallyEntry {
        guard SupabaseWidgetConfig.isConfigured else {
            return makeLocalEntry()
        }

        do {
            let tasks = try await SupabaseWidgetClient().fetchWidgetTasks()
            return makeSupabaseEntry(tasks: tasks, status: tasks.isEmpty ? "Open Tally to add tasks." : nil)
        } catch {
            return makeSupabaseEntry(tasks: [], status: "Supabase unavailable")
        }
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
// MARK: - Empty State View
// ─────────────────────────────────────────────

struct EmptyStateView: View {
    let message: String

    init(message: String = "Open Tally to add tasks.") {
        self.message = message
    }

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "hand.tap.fill")
                .font(.system(size: 28))
                .foregroundColor(Color(hex: "#8E8E93"))

            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(hex: "#8E8E93"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)

            // TEMP DEBUG — remove once local fallback is no longer needed
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
// MARK: - Supabase Tasks View
// ─────────────────────────────────────────────

struct SupabaseTasksView: View {
    let tasks: [SupabaseWidgetTask]
    let status: String?

    var body: some View {
        if tasks.isEmpty {
            EmptyStateView(message: status ?? "Open Tally to add tasks.")
        } else {
            VStack(alignment: .leading, spacing: 10) {
                ForEach(tasks) { task in
                    HStack(alignment: .center, spacing: 8) {
                        Circle()
                            .fill(Color(hex: task.dotColor))
                            .frame(width: 10, height: 10)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(task.title)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)

                            if let answeredAt = task.answeredAt, task.todayValue == "yes", task.answeredDate == todayString() {
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

                        if task.todayValue == "yes", task.answeredDate == todayString() {
                            Text("YES")
                                .font(.system(size: 20, weight: .heavy, design: .rounded))
                                .foregroundColor(Color(hex: "#0A84FF"))
                        } else {
                            Button(intent: MarkTaskDoneIntent(id: task.id)) {
                                Text("YES")
                                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Color(hex: "#0A84FF"))
                        }
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Single Task Widget View (local fallback)
// ─────────────────────────────────────────────

struct SingleTaskWidgetView: View {
    let entry: TallyEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if !entry.supabaseTasks.isEmpty || SupabaseWidgetConfig.isConfigured {
            SupabaseTasksView(tasks: entry.supabaseTasks, status: entry.statusMessage)
        } else if entry.questions.isEmpty {
            EmptyStateView()
        } else {
            let question = entry.questions.first!
            let todayStr = todayString()
            let ans = entry.todayAnswers.first { $0.questionId == question.id && $0.date == todayStr }
            let isYes = ans?.value == "yes"
            let isNo = ans?.value == "no"

            if family == .systemSmall {
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
// MARK: - Multi-Task Widget View (local fallback)
// ─────────────────────────────────────────────

struct MultiTaskWidgetView: View {
    let entry: TallyEntry

    var body: some View {
        if !entry.supabaseTasks.isEmpty || SupabaseWidgetConfig.isConfigured {
            SupabaseTasksView(tasks: entry.supabaseTasks, status: entry.statusMessage)
        } else if entry.questions.isEmpty {
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

                            Circle()
                                .fill(Color(hex: question.safeColor))
                                .frame(width: 10, height: 10)

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
// MARK: - Widget Definitions
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