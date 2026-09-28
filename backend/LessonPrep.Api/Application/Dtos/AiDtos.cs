namespace LessonPrep.Api.Application.Dtos;

public sealed record AiModel(string Id, string Name);

public sealed record AiToolParameter(string Type, string Description, bool Required);
public sealed record AiToolDefinition(string Name, string Description, IReadOnlyDictionary<string, AiToolParameter> Parameters);
public sealed record AiToolCall(string Id, string Name, string ArgumentsJson);
public sealed record AiToolResult(string CallId, string ResultJson);
