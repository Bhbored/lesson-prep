using LessonPrep.Api.Application.Enums;

namespace LessonPrep.Api.Application.Dtos;

public sealed record LessonPhaseResult(
    string Name, int DurationMinutes, string Objective,
    List<string> TeacherActions, List<string> StudentActions,
    List<string> Questions, string Notes);

public sealed record GeneratedLesson(
    string Title, string Topic, string ClassName, int TotalDurationMinutes,
    List<string> LearningObjectives, List<string> RequiredMaterials,
    List<LessonPhaseResult> Phases, string AssessmentSummary,
    List<string> ExpectedOutcomes, string TeacherNotes);

public sealed record SessionReadyDto(
    Guid VariantId,
    int VariantNumber,
    int GenerationRound,
    int SessionNumber,
    int SessionCount,
    AiProvider Provider,
    string Model,
    GeneratedLesson Lesson);
