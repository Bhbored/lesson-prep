namespace LessonPrep.Api.Application.Dtos;

public sealed record PhaseSpec(string Name, int DurationMinutes, int Order);

public sealed record LessonPhaseResult(
    string Name, int DurationMinutes, string Objective,
    List<string> TeacherActions, List<string> StudentActions,
    List<string> Questions, string Notes);

public sealed record GeneratedLesson(
    string Title, string Topic, string ClassName, int TotalDurationMinutes,
    List<string> LearningObjectives, List<string> RequiredMaterials,
    List<LessonPhaseResult> Phases, string AssessmentSummary,
    List<string> ExpectedOutcomes, string TeacherNotes);

public sealed record VariantDto(
    Guid Id, int VariantNumber, int GenerationRound, string Provider, string Model, GeneratedLesson Lesson);

public sealed record PreparationSnapshot(
    Guid PreparationId, string ClassName, int TotalDurationMinutes,
    string SourceLanguage, List<PhaseSpec> Phases, string SourceText, string PreparedSourceText);

public sealed record LessonFlowPresetDto(
    Guid Id, string Name, string Description, bool IsDefault, List<PhaseSpec> Phases);

public sealed record LessonAiRequest(
    string ClassName,
    int DurationMinutes,
    string SourceLanguage,
    IReadOnlyList<PhaseSpec> Phases,
    string SourceText,
    string PreviousApproaches,
    string ValidationFeedback = "");

public sealed record RegenerateRequest(
    PreparationSnapshot Snapshot,
    int VariantCount,
    int GenerationRound,
    string Provider,
    string Model,
    EncryptedCredential EncryptedCredential);
