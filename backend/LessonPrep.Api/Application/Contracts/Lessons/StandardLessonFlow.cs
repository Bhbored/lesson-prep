using LessonPrep.Api.Application.Dtos;

namespace LessonPrep.Api.Application.Contracts.Lessons;

public static class StandardLessonFlow
{
    public static readonly Guid Id = Guid.Parse("f470781b-a39c-40ea-b69d-45c7cc007fb5");

    public static LessonFlowPresetDto Create() => new(
        Id,
        "Standard 45-Minute Lesson",
        "A balanced classroom lesson with introduction, teaching, guided/independent practice, assessment, and closure.",
        true,
        [
            new("Warm-up", 5, 1),
            new("Instruction", 15, 2),
            new("Practice", 15, 3),
            new("Assessment", 7, 4),
            new("Closure", 3, 5)
        ]);
}
