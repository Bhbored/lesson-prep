using System.Text.Json;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Helpers;

namespace LessonPrep.Api.Application.Validators;

public static class LessonValidator
{
    public static GeneratedLesson ParseAndValidate(string json, string className, int duration,
        IReadOnlyList<PhaseSpec> phases)
    {
        GeneratedLesson lesson;
        try
        {
            lesson = JsonSerializer.Deserialize<GeneratedLesson>(json, JsonDefaults.Web)
                     ?? throw new LessonValidationException("The response was empty.");
        }
        catch (JsonException)
        {
            throw new LessonValidationException("The AI returned malformed lesson data.");
        }

        var ordered = phases.OrderBy(x => x.Order).ToArray();
        var error = lesson switch
        {
            { Title: var title } when string.IsNullOrWhiteSpace(title)
                => "the lesson title is missing",
            { Topic: var topic } when string.IsNullOrWhiteSpace(topic)
                => "the lesson topic is missing",
            { ClassName: var name } when string.IsNullOrWhiteSpace(name)
                                         || !string.Equals(name.Trim(), className.Trim(),
                                             StringComparison.OrdinalIgnoreCase)
                => $"the class must be exactly '{className}'",
            { TotalDurationMinutes: var total } when total != duration
                => $"the total duration must be {duration} minutes",
            { LearningObjectives: null or { Count: 0 } }
                => "at least one nonempty learning objective is required",
            { LearningObjectives: var objectives } when objectives.Any(string.IsNullOrWhiteSpace)
                => "at least one nonempty learning objective is required",
            { RequiredMaterials: null }
                => "requiredMaterials must be present and contain no empty entries",
            { RequiredMaterials: var materials } when materials.Any(string.IsNullOrWhiteSpace)
                => "requiredMaterials must be present and contain no empty entries",
            { ExpectedOutcomes: null or { Count: 0 } }
                => "at least one nonempty expected outcome is required",
            { ExpectedOutcomes: var outcomes } when outcomes.Any(string.IsNullOrWhiteSpace)
                => "at least one nonempty expected outcome is required",
            { AssessmentSummary: var summary } when string.IsNullOrWhiteSpace(summary)
                => "the assessment summary is missing",
            { Phases: null }
                => $"exactly {phases.Count} lesson phases are required",
            { Phases: var actual } when actual.Count != phases.Count
                => $"exactly {phases.Count} lesson phases are required",
            { Phases: var actual } => PhaseError(actual, ordered)
                                      ?? (actual.Sum(x => x.DurationMinutes) != duration
                                          ? "The AI changed the lesson duration."
                                          : null),
            _ => null
        };

        return error switch
        {
            null => lesson,
            _ => throw new LessonValidationException(error)
        };
    }

    public static void ValidateFlow(string className, int duration, IReadOnlyList<PhaseSpec> phases, int variants)
    {
        var invalid = (className, duration, variants, phases) switch
        {
            var (name, _, _, _) when string.IsNullOrWhiteSpace(name) || name.Length > 100 => true,
            (_, < 10 or > 240, _, _) => true,
            (_, _, < 1 or > 3, _) => true,
            (_, _, _, null) => true,
            (_, _, _, { Count: < 1 or > 12 }) => true,
            var (_, _, _, flow) when flow.Any(x => string.IsNullOrWhiteSpace(x.Name)
                                                   || x.Name.Length > 80
                                                   || x.DurationMinutes <= 0) => true,
            var (_, total, _, flow) when flow.Sum(x => x.DurationMinutes) != total => true,
            var (_, _, _, flow) when !flow.Select(x => x.Order).Order()
                .SequenceEqual(Enumerable.Range(1, flow.Count)) => true,
            _ => false
        };

        if (invalid)
            throw new LessonValidationException(
                "Check class, lesson time, variant count, and phase order and durations.");
    }

    private static string? PhaseError(IReadOnlyList<LessonPhaseResult> actual, IReadOnlyList<PhaseSpec> expected)
    {
        for (var i = 0; i < expected.Count; i++)
        {
            var error = (actual[i], expected[i], i + 1) switch
            {
                (null, _, var n) => $"phase {n} is missing",
                var (part, spec, n) when part.Name != spec.Name
                                         || part.DurationMinutes != spec.DurationMinutes
                                         || string.IsNullOrWhiteSpace(part.Objective)
                                         || part.TeacherActions is not { Count: > 0 }
                                         || part.StudentActions is not { Count: > 0 }
                                         || part.TeacherActions.Any(string.IsNullOrWhiteSpace)
                                         || part.StudentActions.Any(string.IsNullOrWhiteSpace)
                    => $"phase {n} must be named '{spec.Name}', last {spec.DurationMinutes} minutes, and include an objective plus nonempty teacher and student actions",
                _ => null
            };
            if (error is not null) return error;
        }

        return null;
    }
}
