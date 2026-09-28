using System.Text.Json;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Exceptions;

namespace LessonPrep.Api.Application.Validators;

public static class LessonValidator
{
    public static GeneratedLesson ParseAndValidate(string json, string className, int duration, IReadOnlyList<PhaseSpec> phases)
    {
        GeneratedLesson? lesson;
        try { lesson = JsonSerializer.Deserialize<GeneratedLesson>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web)); }
        catch (JsonException) { throw new LessonValidationException("The AI returned malformed lesson data."); }
        if (lesson is null) throw new LessonValidationException("The response was empty.");
        if (string.IsNullOrWhiteSpace(lesson.Title)) throw new LessonValidationException("the lesson title is missing");
        if (string.IsNullOrWhiteSpace(lesson.Topic)) throw new LessonValidationException("the lesson topic is missing");
        if (string.IsNullOrWhiteSpace(lesson.ClassName)
            || !string.Equals(lesson.ClassName.Trim(), className.Trim(), StringComparison.OrdinalIgnoreCase))
            throw new LessonValidationException($"the class must be exactly '{className}'");
        if (lesson.TotalDurationMinutes != duration) throw new LessonValidationException($"the total duration must be {duration} minutes");
        if (lesson.LearningObjectives is not { Count: > 0 } || lesson.LearningObjectives.Any(string.IsNullOrWhiteSpace))
            throw new LessonValidationException("at least one nonempty learning objective is required");
        if (lesson.RequiredMaterials is null || lesson.RequiredMaterials.Any(string.IsNullOrWhiteSpace))
            throw new LessonValidationException("requiredMaterials must be present and contain no empty entries");
        if (lesson.ExpectedOutcomes is not { Count: > 0 } || lesson.ExpectedOutcomes.Any(string.IsNullOrWhiteSpace))
            throw new LessonValidationException("at least one nonempty expected outcome is required");
        if (string.IsNullOrWhiteSpace(lesson.AssessmentSummary))
            throw new LessonValidationException("the assessment summary is missing");
        if (lesson.Phases?.Count != phases.Count)
            throw new LessonValidationException($"exactly {phases.Count} lesson phases are required");
        var ordered = phases.OrderBy(x => x.Order).ToArray();
        for (var i = 0; i < ordered.Length; i++)
        {
            var part = lesson.Phases[i];
            if (part is null) throw new LessonValidationException($"phase {i + 1} is missing");
            if (part.Name != ordered[i].Name || part.DurationMinutes != ordered[i].DurationMinutes
                || string.IsNullOrWhiteSpace(part.Objective) || part.TeacherActions is not { Count: > 0 }
                || part.StudentActions is not { Count: > 0 }
                || part.TeacherActions.Any(string.IsNullOrWhiteSpace) || part.StudentActions.Any(string.IsNullOrWhiteSpace))
                throw new LessonValidationException($"phase {i + 1} must be named '{ordered[i].Name}', last {ordered[i].DurationMinutes} minutes, and include an objective plus nonempty teacher and student actions");
        }
        if (lesson.Phases.Sum(x => x.DurationMinutes) != duration)
            throw new LessonValidationException("The AI changed the lesson duration.");
        return lesson;
    }

    public static void ValidateFlow(string className, int duration, IReadOnlyList<PhaseSpec> phases, int variants)
    {
        if (string.IsNullOrWhiteSpace(className) || className.Length > 100 || duration is < 10 or > 240 || variants is < 1 or > 3
            || phases is null || phases.Count is < 1 or > 12 || phases.Any(x => x is null || string.IsNullOrWhiteSpace(x.Name) || x.Name.Length > 80 || x.DurationMinutes <= 0)
            || phases.Sum(x => x.DurationMinutes) != duration || !phases.Select(x => x.Order).Order().SequenceEqual(Enumerable.Range(1, phases.Count)))
            throw new LessonValidationException("Check class, lesson time, variant count, and phase order and durations.");
    }
}
