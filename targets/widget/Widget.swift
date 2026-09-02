import WidgetKit
import SwiftUI
import Security
import AppIntents
import Foundation

// ─────────────────────────────────────────────
// MARK: - Supabase Widget Configuration
// ─────────────────────────────────────────────

enum SupabaseWidgetConfig {
    private static let projectURLInfoKey = "SUPABASE_WIDGET_PROJECT_URL"
    private static let anonKeyInfoKey = "SUPABASE_WIDGET_ANON_KEY"

    static var projectURL: String { infoString(forKey: projectURLInfoKey) }
    static var anonPublishableKey: String { infoString(forKey: anonKeyInfoKey) }

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
// MARK: - Local Cache (widget's own UserDefaults —
// no App Group needed, this only needs to survive
// between this extension's own timeline refreshes)
// ─────────────────────────────────────────────

enum TaskCache {
    private static let key = "cached_supabase_tasks"

    static func save(_ tasks: [SupabaseWidgetTask]) {
        guard let data = try? JSONEncoder().encode(tasks) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    static func load() -> [SupabaseWidgetTask]? {
        guard let data = UserDefaults.standard.data(forKey: key),
              let tasks = try? JSONDecoder().decode([SupabaseWidgetTask].self, from: data) else {
            return nil
        }
        return tasks
    }
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
        try await patchAnswer(id: id, value: "yes", date: todayString(), answeredAt: ISO8601DateFormatter().string(from: Date()))
    }

    func clearAnsweredYes(id: String) async throws {
        try await patchAnswer(id: id, value: nil, date: nil, answeredAt: nil)
    }

    private func patchAnswer(id: String, value: String?, date: String?, answeredAt: String?) async throws {
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

        let body: [String: Any?] = [
            "today_value": value,
            "answered_date": date,
            "answered_at": answeredAt
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

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
// MARK: - Interactive Intents (Optimistic 0ms UI)
// ─────────────────────────────────────────────

struct MarkTaskDoneIntent: AppIntent {
    static var title: LocalizedStringResource = "Mark Task Done"
    static var description = IntentDescription("Marks a Tally task as done for today.")

    @Parameter(title: "Task ID")
    var id: String

    init() {}
    init(id: String) { self.id = id }

    func perform() async throws -> some IntentResult {
        let nowStr = ISO8601DateFormatter().string(from: Date())
        let todayStr = todayString()

        // 1. Instant local optimistic update (0ms UI reaction)
        if var cached = TaskCache.load() {
            if let idx = cached.firstIndex(where: { $0.id == id }) {
                let t = cached[idx]
                cached[idx] = SupabaseWidgetTask(
                    id: t.id,
                    title: t.title,
                    displayOrder: t.displayOrder,
                    dotColor: t.dotColor,
                    todayValue: "yes",
                    answeredDate: todayStr,
                    answeredAt: nowStr
                )
                TaskCache.save(cached)
            }
        }

        // 2. Trigger timeline reload immediately
        WidgetCenter.shared.reloadAllTimelines()

        // 3. Background Supabase sync
        Task {
            try? await SupabaseWidgetClient().setAnsweredYes(id: id)
        }

        return .result()
    }
}

struct SetTaskUndoneIntent: AppIntent {
    static var title: LocalizedStringResource = "Undo Task"
    static var description = IntentDescription("Clears a Tally task's answer for today.")

    @Parameter(title: "Task ID")
    var id: String

    init() {}
    init(id: String) { self.id = id }

    func perform() async throws -> some IntentResult {
        // 1. Instant local optimistic update (0ms UI reaction)
        if var cached = TaskCache.load() {
            if let idx = cached.firstIndex(where: { $0.id == id }) {
                let t = cached[idx]
                cached[idx] = SupabaseWidgetTask(
                    id: t.id,
                    title: t.title,
                    displayOrder: t.displayOrder,
                    dotColor: t.dotColor,
                    todayValue: nil,
                    answeredDate: nil,
                    answeredAt: nil
                )
                TaskCache.save(cached)
            }
        }

        // 2. Trigger timeline reload immediately
        WidgetCenter.shared.reloadAllTimelines()

        // 3. Background Supabase sync
        Task {
            try? await SupabaseWidgetClient().clearAnsweredYes(id: id)
        }

        return .result()
    }
}

// ─────────────────────────────────────────────
// MARK: - Timeline Entry & Provider
// ─────────────────────────────────────────────

struct TallyEntry: TimelineEntry {
    let date: Date
    let tasks: [SupabaseWidgetTask]
    let statusMessage: String?
    let isPlaceholder: Bool
}

struct TallyProvider: TimelineProvider {
    typealias Entry = TallyEntry

    /// Cheap synthetic sample used ONLY for the widget gallery preview.
    /// Never hits the network — Apple explicitly requires this to be fast.
    func placeholder(in context: Context) -> TallyEntry {
        let now = ISO8601DateFormatter().string(from: Date())
        let sample = [
            SupabaseWidgetTask(id: "sample-1", title: "Did I go for a run?", displayOrder: 0, dotColor: "#FF3B30", todayValue: nil, answeredDate: nil, answeredAt: nil),
            SupabaseWidgetTask(id: "sample-2", title: "Did I lock the door?", displayOrder: 1, dotColor: "#FFD60A", todayValue: "yes", answeredDate: todayString(), answeredAt: now),
            SupabaseWidgetTask(id: "sample-3", title: "Did I water the plants?", displayOrder: 2, dotColor: "#30D158", todayValue: "yes", answeredDate: todayString(), answeredAt: now)
        ]
        return TallyEntry(date: Date(), tasks: sample, statusMessage: nil, isPlaceholder: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (TallyEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
        } else {
            Task { completion(await makeEntry()) }
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TallyEntry>) -> Void) {
        Task {
            let entry = await makeEntry()
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }

    private func makeEntry() async -> TallyEntry {
        guard SupabaseWidgetConfig.isConfigured else {
            return TallyEntry(date: Date(), tasks: [], statusMessage: "Supabase not configured", isPlaceholder: false)
        }

        do {
            let tasks = try await SupabaseWidgetClient().fetchWidgetTasks()
            TaskCache.save(tasks)  // update cache on every successful fetch
            return TallyEntry(
                date: Date(),
                tasks: tasks,
                statusMessage: tasks.isEmpty ? "Open Tally to add tasks." : nil,
                isPlaceholder: false
            )
        } catch {
            // Network/Supabase failed — fall back to last-known-good instead of blanking out.
            if let cached = TaskCache.load() {
                return TallyEntry(date: Date(), tasks: cached, statusMessage: nil, isPlaceholder: false)
            }
            return TallyEntry(date: Date(), tasks: [], statusMessage: "Supabase unavailable", isPlaceholder: false)
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
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}

private func isAnsweredYesToday(_ task: SupabaseWidgetTask) -> Bool {
    task.todayValue == "yes" && task.answeredDate == todayString()
}

// ─────────────────────────────────────────────
// MARK: - Empty State (redesigned — honest copy,
// no reference to a task picker this build doesn't have)
// ─────────────────────────────────────────────

struct EmptyStateView: View {
    let message: String
    init(message: String = "Open Tally to add tasks.") { self.message = message }

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "checklist")
                .font(.system(size: 26))
                .foregroundColor(Color(hex: "#8E8E93"))
            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(hex: "#8E8E93"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Task List View (medium/large, up to 3)
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
                    let isYes = isAnsweredYesToday(task)
                    HStack(alignment: .center, spacing: 8) {
                        Circle()
                            .fill(Color(hex: task.dotColor))
                            .frame(width: 10, height: 10)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(task.title)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)

                            if let answeredAt = task.answeredAt, isYes {
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

                        if isYes {
                            Button(intent: SetTaskUndoneIntent(id: task.id)) {
                                Text("YES")
                                    .font(.system(size: 20, weight: .heavy, design: .rounded))
                                    .foregroundColor(Color(hex: "#0A84FF"))
                            }
                            .buttonStyle(.plain)
                        } else {
                            Button(intent: MarkTaskDoneIntent(id: task.id)) {
                                Text("NO")
                                    .font(.system(size: 20, weight: .heavy, design: .rounded))
                                    .foregroundColor(Color(hex: "#FF3B30"))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Single Task View (small + medium)
// ─────────────────────────────────────────────

struct SingleTaskView: View {
    let task: SupabaseWidgetTask
    @Environment(\.widgetFamily) var family

    var body: some View {
        let isYes = isAnsweredYesToday(task)

        if family == .systemSmall {
            VStack(alignment: .leading, spacing: 6) {
                Text(task.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer()

                HStack {
                    Spacer()
                    if isYes {
                        Button(intent: SetTaskUndoneIntent(id: task.id)) {
                            Text("YES")
                                .font(.system(size: 36, weight: .heavy, design: .rounded))
                                .foregroundColor(Color(hex: "#0A84FF"))
                        }
                        .buttonStyle(.plain)
                    } else {
                        Button(intent: MarkTaskDoneIntent(id: task.id)) {
                            Text("NO")
                                .font(.system(size: 36, weight: .heavy, design: .rounded))
                                .foregroundColor(Color(hex: "#FF3B30"))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(4)
        } else {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(task.title)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(2)

                    if isYes, let answeredAt = task.answeredAt {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle")
                                .font(.system(size: 11))
                            Text(formatTimestamp(answeredAt))
                                .font(.system(size: 12))
                        }
                        .foregroundColor(Color(hex: "#8E8E93"))
                    }
                }

                Spacer()

                if isYes {
                    Button(intent: SetTaskUndoneIntent(id: task.id)) {
                        Text("YES")
                            .font(.system(size: 42, weight: .heavy, design: .rounded))
                            .foregroundColor(Color(hex: "#0A84FF"))
                    }
                    .buttonStyle(.plain)
                } else {
                    Button(intent: MarkTaskDoneIntent(id: task.id)) {
                        Text("NO")
                            .font(.system(size: 42, weight: .heavy, design: .rounded))
                            .foregroundColor(Color(hex: "#FF3B30"))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
        }
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget 1: Single Task (small + medium)
// ─────────────────────────────────────────────

struct SingleTaskWidgetView: View {
    let entry: TallyEntry

    var body: some View {
        if let task = entry.tasks.first {
            SingleTaskView(task: task)
        } else {
            EmptyStateView(message: entry.statusMessage ?? "Open Tally to add tasks.")
        }
    }
}

struct SingleTaskWidget: Widget {
    let kind: String = "SingleTaskWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TallyProvider()) { entry in
            SingleTaskWidgetView(entry: entry)
                .containerBackground(for: .widget) { Color(hex: "#1C1C1E") }
        }
        .configurationDisplayName("Task")
        .description("Tracks one task")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// ─────────────────────────────────────────────
// MARK: - Widget 2: Multi Task (medium + large)
// ─────────────────────────────────────────────

struct MultiTaskWidgetView: View {
    let entry: TallyEntry

    var body: some View {
        SupabaseTasksView(tasks: Array(entry.tasks.prefix(3)), status: entry.statusMessage)
    }
}

struct MultiTasksWidget: Widget {
    let kind: String = "MultiTasksWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TallyProvider()) { entry in
            MultiTaskWidgetView(entry: entry)
                .containerBackground(for: .widget) { Color(hex: "#1C1C1E") }
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